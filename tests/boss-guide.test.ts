import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Worker } from "node:worker_threads";
import {
  BossGuideState, bossGuideAvailable,
  bossGuideMarkup,
  bossGuideText,
} from "../src/client/boss-guide.ts";
import { data } from "../src/shared/game.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { Session } from "../src/client/session.ts";
function receive(worker: Worker, check: (m: any) => boolean) {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(
      () => finish(Error("Guide worker evidence timed out")),
      5000,
    );
    const message = (m: any) => {
      if (check(m)) finish(undefined, m);
    };
    const error = (e: Error) => finish(e);
    function finish(e?: Error, m?: any) {
      clearTimeout(timer);
      worker.off("message", message);
      worker.off("error", error);
      e ? reject(e) : resolve(m);
    }
    worker.on("message", message);
    worker.on("error", error);
  });
}
test("boss guide starts closed, pauses Solo only, and closing it preserves an independent manual pause", () => {
  const state = new BossGuideState();
  assert.equal(state.open, false);
  assert.equal(state.pausesSimulation(false, false), false);
  state.set(true);
  assert(state.blocksInput(false));
  assert(state.pausesSimulation(false, false));
  assert(!state.pausesSimulation(false, true));
  state.set(false);
  assert(!state.blocksInput(false));
  assert(!state.pausesSimulation(false, false));
  state.set(true);
  assert(state.pausesSimulation(true, false));
  state.set(false);
  assert(state.pausesSimulation(true, false));
  assert(state.blocksInput(true));
  assert(!state.pausesSimulation(true, true));
});
test("all fifteen guide dialogs default hidden, expose open/close controls and distinguish frozen Solo from continuing online play", () => {
  for (const l of data.locales) {
    for (const online of [false, true]) {
      const html = bossGuideMarkup(l.id, online);
      assert(html.includes('aria-expanded="false"'));
      assert(html.includes('class="overlay boss-guide-overlay" hidden'));
      for (const id of [
        "boss-guide-button",
        "boss-guide-close",
        "boss-guide-resume",
        "boss-guide-copy",
      ])
        assert(html.includes('id="' + id + '"'));
      assert(html.includes('role="dialog"'));
      assert(html.includes('aria-modal="true"'));
      assert(html.includes('tabindex="0"'));
      assert(
        html.includes(
          bossGuideText(
            l.id,
            online ? "ui.bossGuideOnline" : "ui.bossGuidePaused",
          ),
        ),
      );
    }
    assert.notEqual(
      bossGuideText(l.id, "ui.bossGuideOnline"),
      bossGuideText(l.id, "ui.bossGuidePaused"),
    );
  }
});
test("Session never sends a global pause command for an online guide", () => {
  const sent: unknown[] = [],
    s = new Session("http://127.0.0.1:1");
  s.online = true;
  s.worker = {
    postMessage: (m: unknown) => sent.push(m),
  } as unknown as globalThis.Worker;
  s.pause(true);
  s.pause(false);
  assert.deepEqual(sent, []);
  s.online = false;
  s.pause(true);
  s.pause(false);
  assert.deepEqual(sent, [
    { type: "pause", value: true },
    { type: "pause", value: false },
  ]);
});
test(
  "the actual offline worker freezes combat clocks, deadlines, player state and warnings while reading, then resumes without catchup or held input",
  { timeout: 15000 },
  async () => {
    const bundle = await build({
      entryPoints: ["src/client/offline.worker.ts"],
      bundle: true,
      platform: "node",
      format: "esm",
      write: false,
      logLevel: "silent",
    });
    const shim =
      "import {parentPort} from 'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);";
    const tail =
      "parentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});";
    const worker = new Worker(
      new URL(
        "data:text/javascript;base64," +
          Buffer.from(shim + bundle.outputFiles[0].text + "\n" + tail).toString(
            "base64",
          ),
      ),
      { execArgv: [] },
    );
    try {
      await receive(worker, (m) => m.type === "ready");
      const initial = receive(worker, (m) => m.type === "view");
      worker.postMessage({
        type: "init",
        settings: {
          openingBossId: "quarantine-clerk",
          seed: 491,
          mode: "endless",
          difficulty: "normal",
        },
        name: "Mara",
        classId: "soldier",
        practiceVariant: "crazed",
      });
      await initial;
      const start = receive(
        worker,
        (m) => m.type === "view" && m.view.phase === "combat",
      );
      worker.postMessage({ type: "start" });
      await start;
      worker.postMessage({
        type: "input",
        input: { ...idleInput(), sequence: 1, moveX: 1, fire: true },
      });
      await receive(worker, (m) => m.type === "view" && m.view.combatTick >= 2);
      const ack = receive(
          worker,
          (m) => m.type === "pauseState" && m.value === true,
        ),
        view = receive(worker, (m) => m.type === "view");
      worker.postMessage({ type: "pause", value: true });
      const frozenAck = await ack,
        frozen = (await view).view;
      assert.equal(frozen.combatTick, frozenAck.combatTick);
      const observed: any[] = [];
      const observe = (m: any) => {
        if (m.type === "view") observed.push(m.view);
      };
      worker.on("message", observe);
      await new Promise((r) => setTimeout(r, 350));
      assert(
        observed.every(
          (v) => v.tick === frozen.tick && v.combatTick === frozen.combatTick,
        ),
      );
      for (const v of observed) {
        assert.equal(v.boss.deadline, frozen.boss.deadline);
        assert.deepEqual(v.players, frozen.players);
        assert.deepEqual(v.bossCues, frozen.bossCues);
      }
      const resumedAck = receive(
          worker,
          (m) => m.type === "pauseState" && m.value === false,
        ),
        resumed = receive(
          worker,
          (m) => m.type === "view" && m.view.combatTick > frozen.combatTick,
        );
      worker.postMessage({ type: "pause", value: false });
      await resumedAck;
      const after = (await resumed).view;
      assert(after.combatTick - frozen.combatTick < 8);
      assert.equal(after.players[0].x, frozen.players[0].x);
      assert.equal(after.players[0].ammo, frozen.players[0].ammo);
      assert.equal(after.boss.deadline, frozen.boss.deadline);
      worker.off("message", observe);
    } finally {
      await worker.terminate();
    }
  },
);

test('final availability is optional Baby-only while the explicit testing switch keeps current review guides available on all six difficulties',()=>{
  for(const d of data.difficulties){assert.equal(bossGuideAvailable(d.id,false),d.id==='baby');assert.equal(bossGuideAvailable(d.id,true),true);}
  assert.equal(new BossGuideState().open,false);
});
