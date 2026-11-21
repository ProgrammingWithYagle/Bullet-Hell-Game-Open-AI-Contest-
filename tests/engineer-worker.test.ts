import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { build } from "esbuild";
import { Game } from "../src/shared/game.ts";
import { idleInput, HZ } from "../src/shared/protocol.ts";
function checkpoint() {
  // A legal late-entrant local boundary supplies the earned budget, never online proof.
  const g = new Game({
    mode: "endless",
    seed: 41,
    maxPlayers: 1,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Tamsin", "engineer");
  for (const item of [
    "engineer-constructs-1",
    "engineer-machinery-1",
    "engineer-machinery-coil-1",
    "engineer-machinery-salvage-1",
  ])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  const value = g.offlineCheckpoint()!;
  assert(Game.restoreOffline(structuredClone(value)));
  return value;
}
for (const testing of [false, true])
  test(
    "Actual " +
      (testing ? "testing" : "public") +
      " optimized Solo worker uses earned actions, discards paused input and preserves owned cooldowns",
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
      const worker = new Worker(
        new URL(
          "data:text/javascript;base64," +
            Buffer.from(
              "import {parentPort} from 'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
                bundle.outputFiles[0].text +
                "\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});",
            ).toString("base64"),
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
      try {
        await wait(() => ready, "worker readiness");
        worker.postMessage({ type: "resume", value: checkpoint() });
        await wait(() => !!view, "owned late boundary");
        assert(view.players[0].skills.includes("engineer-machinery-salvage-1"));
        worker.postMessage({ type: "start" });
        await wait(() => view.phase === "combat", "combat");
        worker.postMessage({
          type: "input",
          input: { ...idleInput(), sequence: 1, aim: -Math.PI / 2, q: true },
        });
        await wait(
          () =>
            view.classCues.some((c: any) => c.kind === "turret" && c.machinery),
          "carriage",
        );
        worker.postMessage({ type: "pause", value: true });
        await new Promise((r) => setTimeout(r, 30));
        const before = view.combatTick,
          x = view.players[0].x;
        worker.postMessage({
          type: "input",
          input: { ...idleInput(), sequence: 2, moveX: 1, technique2: true },
        });
        await new Promise((r) => setTimeout(r, 60));
        assert.equal(view.combatTick, before);
        worker.postMessage({ type: "pause", value: false });
        await wait(() => view.combatTick > before + 3, "resumed clock");
        assert.equal(view.players[0].x, x);
        assert.equal(view.players[0].kit.technique2At, 0);
        assert(
          view.classCues.some((c: any) => c.kind === "turret" && c.machinery),
          "Paused salvage was discarded",
        );
        worker.postMessage({
          type: "input",
          input: {
            ...idleInput(),
            sequence: 3,
            aim: -Math.PI / 2,
            technique1: true,
          },
        });
        await wait(
          () => view.classCues.some((c: any) => c.kind === "engineer-coil"),
          "earned coil action",
        );
        assert(view.players[0].kit.technique1At > view.combatTick);
        worker.postMessage({ type: "pause", value: true });
        await new Promise((r) => setTimeout(r, 30));
        const charged = view.combatTick,
          cooldown = view.players[0].kit.technique1At;
        await new Promise((r) => setTimeout(r, 70));
        assert.equal(view.combatTick, charged);
        assert.equal(view.players[0].kit.technique1At, cooldown);
        worker.postMessage({ type: "pause", value: false });
        await wait(
          () => view.classCues.some((c: any) => c.kind === "engineer-beam"),
          "actual rail release",
        );
        const qAt = view.players[0].qAt;
        worker.postMessage({
          type: "input",
          input: {
            ...idleInput(),
            sequence: 4,
            aim: -Math.PI / 2,
            technique2: true,
          },
        });
        await wait(
          () => view.players[0].kit.technique2At > view.combatTick,
          "earned salvage action",
        );
        assert.equal(view.players[0].qAt, qAt - 6 * HZ);
        assert(
          !view.classCues.some((c: any) => c.kind === "turret" && c.machinery),
        );
      } finally {
        await worker.terminate();
      }
    },
  );
