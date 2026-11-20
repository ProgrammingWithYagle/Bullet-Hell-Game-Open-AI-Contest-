import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { build } from "esbuild";
import { Game } from "../src/shared/game.ts";
import { idleInput, type InputFrame } from "../src/shared/protocol.ts";
import type { View } from "../src/shared/view.ts";
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
        view: View | undefined,
        pauseState: { value: boolean; combatTick: number } | undefined,
        react: ((frame: View) => void) | undefined,
        error: unknown;
      worker.on("message", (m) => {
        if (m.type === "ready") ready = true;
        if (m.type === "view") {
          const frame: View = m.view;
          view = frame;
          react?.(frame);
        }
        if (m.type === "pauseState") pauseState = m;
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
        await wait(() => view?.phase === "combat", "combat");
        const send = (sequence: number, controls: Partial<InputFrame>) => worker.postMessage({
          type: "input", input: { ...idleInput(), ...controls, sequence, clientTick: view!.combatTick },
        });
        let paid: { recovery: number; window: number } | undefined;
        let turned = false;
        let brake: View["players"][number] | undefined;
        react = (frame) => {
          const player = frame.players[0];
          // A worker can emit after several simulation steps. Recovery and the acknowledged command survive that batch.
          if (!paid && player.ack === 1 && player.dodgeCharges === 0 && player.dodgeAt > frame.combatTick) {
            paid = { recovery: player.dodgeAt, window: player.dodgeControlUntil ?? 0 };
            send(2, { sprint: true, moveY: 1 });
          } else if (paid && !turned && player.ack === 2 && player.dodgeSteered && player.dashY > .9) {
            turned = true;
            send(3, { dodge: true });
          } else if (turned && player.ack === 3 && player.dashUntil < (player.dodgeControlUntil ?? 0)) {
            brake = player;
            react = undefined;
          }
        };
        send(1, { dodge: true, moveX: 1 });
        await wait(() => !!paid, "ordinary dodge pays one charge");
        await wait(() => turned, "course correction turns toward the second command");
        await wait(() => !!brake, "brake cuts the same dash short");
        const stopping = brake!;
        assert.equal(stopping.dodgeControlUntil, paid!.window);
        assert.equal(stopping.dodgeAt, paid!.recovery);
        assert.equal(stopping.dodgeCharges, 0);
        worker.postMessage({ type: "pause", value: true });
        await wait(() => pauseState?.value === true && view?.combatTick === pauseState.combatTick, "pause acknowledged");
        const tick = view!.combatTick, x = view!.players[0].x;
        send(4, { moveX: 1 });
        await new Promise((r) => setTimeout(r, 60));
        assert.equal(view!.combatTick, tick);
        worker.postMessage({ type: "pause", value: false });
        await wait(() => pauseState?.value === false && view!.combatTick > tick + 2, "resume");
        assert.equal(view!.players[0].x, x);
        assert.equal(view!.players[0].dodgeAt, paid!.recovery);
        assert.equal(view!.players[0].dodgeCharges, 0);
        assert.equal(view!.players[0].ack, 3, "The paused fourth input was never acknowledged");
      } finally {
        await worker.terminate();
      }
    },
  );
