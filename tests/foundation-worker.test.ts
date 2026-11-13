import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { build } from "esbuild";
import { Game } from "../src/shared/game.ts";
import { idleInput } from "../src/shared/protocol.ts";
function checkpoint() {
  // A legal late entrant supplies this integration fixture's budget; it is local Practice only.
  const g = new Game({
    mode: "endless",
    seed: 41,
    maxPlayers: 1,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Runner", "soldier");
  for (const item of [
    "general-sprint",
    "general-course-correction",
    "general-brake-step",
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
      " optimized Solo worker turns and brakes an owned dodge without replaying paused input",
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
        error: unknown;
      worker.on("message", (m) => {
        if (m.type === "ready") ready = true;
        if (m.type === "view") view = m.view;
        if (m.type === "error") error = m;
      });
      worker.on("error", (e) => (error = e));
      const wait = async (check: () => boolean, label: string) => {
        const end = Date.now() + 8000;
        while (!check()) {
          assert(!error, String(error));
          assert(Date.now() < end, label);
          await new Promise((r) => setTimeout(r, 2));
        }
      };
      try {
        await wait(() => ready, "worker ready");
        worker.postMessage({ type: "resume", value: checkpoint() });
        await wait(() => !!view, "local boundary");
        worker.postMessage({ type: "start" });
        await wait(() => view.phase === "combat", "combat");
        worker.postMessage({
          type: "input",
          input: { ...idleInput(), sequence: 1, dodge: true, moveX: 1 },
        });
        await wait(
          () => view.players[0].dodgeInputDown === true,
          "ordinary dodge",
        );
        worker.postMessage({
          type: "input",
          input: { ...idleInput(), sequence: 2, sprint: true, moveY: 1 },
        });
        await wait(
          () => view.players[0].dodgeSteered === true,
          "course correction",
        );
        worker.postMessage({
          type: "input",
          input: { ...idleInput(), sequence: 3, dodge: true },
        });
        await wait(
          () => view.players[0].dashUntil < view.players[0].dodgeControlUntil,
          "brake",
        );
        const at = view.players[0].dodgeAt;
        assert.equal(view.players[0].dodgeCharges, 0);
        worker.postMessage({ type: "pause", value: true });
        await new Promise((r) => setTimeout(r, 40));
        const tick = view.combatTick,
          x = view.players[0].x;
        worker.postMessage({
          type: "input",
          input: { ...idleInput(), sequence: 4, moveX: 1 },
        });
        await new Promise((r) => setTimeout(r, 60));
        assert.equal(view.combatTick, tick);
        worker.postMessage({ type: "pause", value: false });
        await wait(() => view.combatTick > tick + 2, "resume");
        assert.equal(view.players[0].x, x);
        assert.equal(view.players[0].dodgeAt, at);
        assert.equal(view.players[0].dodgeCharges, 0);
        assert.equal(
          view.players[0].ack,
          3,
          "The paused input was never acknowledged; consumed one-shot Dodge may return to false normally",
        );
      } finally {
        await worker.terminate();
      }
    },
  );
