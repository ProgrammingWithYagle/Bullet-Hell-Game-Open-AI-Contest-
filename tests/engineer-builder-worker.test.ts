import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { build } from "esbuild";
import { Game } from "../src/shared/game.ts";
import { builderIds as ids } from "../src/shared/engineer-builder.ts";
import { idleInput } from "../src/shared/protocol.ts";
const skills = [
  "engineer-constructs-1",
  ids.entry,
  ids.longspan,
  ids.hinge,
  ids.repair,
  ids.linked,
  ids.survey,
  ids.redoubt,
  "general-sprint",
  "general-brake-step",
];
function checkpoint() {
  const g = new Game({
    mode: "endless",
    difficulty: "baby",
    seed: 41,
    maxPlayers: 1,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Tamsin", "engineer");
  for (const item of skills)
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
  const value = g.offlineCheckpoint()!;
  assert(Game.restoreOffline(structuredClone(value)));
  return value;
}
for (const testing of [false, true])
  test(
    "Actual " +
      (testing ? "testing" : "public") +
      " optimized Solo worker assembles, relocates and fortifies Builder cover while discarding paused actions",
    { timeout: 20000 },
    async () => {
      const bundle = await build({
        entryPoints: ["src/client/offline.worker.ts"],
        bundle: true,
        minify: true,
        write: false,
        platform: "browser",
        format: "esm",
        define: {
          __GA_TESTING_BUILD__: String(testing),
          "import.meta.env.DEV": "false",
        },
        logLevel: "silent",
      });
      const wrapper =
        "import {parentPort} from 'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
        bundle.outputFiles[0].text +
        "\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});";
      const worker = new Worker(
        new URL(
          "data:text/javascript;base64," +
            Buffer.from(wrapper).toString("base64"),
        ),
        { execArgv: [] },
      );
      let ready = false,
        view: any,
        error: any;
      worker.on("message", (m) => {
        if (m.type === "ready") ready = true;
        if (m.type === "view") view = m.view;
        if (m.type === "error") error = m;
      });
      worker.on("error", (e) => (error = e));
      const wait = async (check: () => boolean, label: string) => {
        const deadline = Date.now() + 8000;
        while (!check()) {
          assert(!error, JSON.stringify(error));
          assert(Date.now() < deadline, label);
          await new Promise((r) => setTimeout(r, 8));
        }
      };
      const input = (sequence: number, action: Record<string, unknown>) =>
        worker.postMessage({
          type: "input",
          input: { ...idleInput(), sequence, ...action },
        });
      try {
        await wait(() => ready, "worker readiness");
        worker.postMessage({ type: "resume", value: checkpoint() });
        await wait(() => !!view, "owned boundary");
        assert(skills.every((id) => view.players[0].skills.includes(id)));
        assert.equal(view.players[0].sp, 0);
        worker.postMessage({ type: "start" });
        await wait(() => view.phase === "combat", "combat");
        input(1, { aim: -Math.PI / 2, q: true });
        await wait(
          () => view.classCues.some((c: any) => c.kind === "wall" && c.builder),
          "visible assembly",
        );
        const original = view.classCues.find(
          (c: any) => c.kind === "wall" && c.builder,
        );
        await wait(
          () => view.combatTick >= original.buildingUntil,
          "braced cover",
        );
        input(2, { aim: -Math.PI / 4, technique1: true });
        await wait(
          () =>
            view.classCues.some((c: any) => c.kind === "engineer-builder-plan"),
          "owned relocation",
        );
        worker.postMessage({ type: "pause", value: true });
        await new Promise((r) => setTimeout(r, 30));
        const tick = view.combatTick;
        input(3, { aim: 0, technique2: true, ultimate: true });
        await new Promise((r) => setTimeout(r, 70));
        assert.equal(view.combatTick, tick);
        worker.postMessage({ type: "pause", value: false });
        await wait(
          () =>
            view.combatTick > tick + 3 &&
            !view.classCues.some(
              (c: any) => c.kind === "engineer-builder-plan",
            ),
          "rebraced destination",
        );
        const moved = view.classCues.find((c: any) => c.id === original.id);
        assert(moved);
        assert.equal(moved.until, original.until);
        assert(moved.health <= original.health);
        assert(moved.x !== original.x || moved.y !== original.y);
        assert.equal(view.players[0].ack, 2);
        assert.equal(view.players[0].kit.technique2At, 0);
        assert(!view.classCues.some((c: any) => c.kind === "siege"));
        input(4, { aim: -Math.PI / 2, ultimate: true });
        await wait(
          () =>
            view.classCues.filter(
              (c: any) => c.kind === "wall" && c.linkedSiege !== undefined,
            ).length === 3,
          "actual redoubt",
        );
        const fort = view.classCues.filter(
          (c: any) => c.kind === "wall" && c.linkedSiege !== undefined,
        );
        assert(
          view.classCues.some(
            (c: any) => c.kind === "siege" && c.id === fort[0].linkedSiege,
          ),
        );
        assert.equal(view.players[0].kit.builderGroups, 1);
        assert.equal(view.players[0].kit.builderGroupCapacity, 2);
        await wait(
          () => view.combatTick >= fort[0].buildingUntil,
          "redoubt assembly",
        );
        assert.equal(view.players[0].ack, 4);
        assert(view.players[0].ultimateAt > view.combatTick);
      } finally {
        await worker.terminate();
      }
    },
  );
