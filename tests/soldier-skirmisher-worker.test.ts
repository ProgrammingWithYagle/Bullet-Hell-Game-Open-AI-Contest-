import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { build } from "esbuild";
import { Game } from "../src/shared/game.ts";
import { skirmisherIds as ids } from "../src/shared/soldier-skirmisher.ts";
import { idleInput } from "../src/shared/protocol.ts";
function checkpoint(fork?: string) {
  const g = new Game({
    mode: "endless",
    seed: 41,
    maxPlayers: 1,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier");
  for (const item of [
    "soldier-ballistics-1",
    ids.entry,
    ...(fork ? [fork] : []),
  ])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
  const value = g.offlineCheckpoint();
  assert(value);
  assert(Game.restoreOffline(structuredClone(value)));
  return value;
}
for (const testing of [false, true])
  test(
    "actual " +
      (testing ? "testing" : "public") +
      " optimized Solo worker executes all three Soldier commitments and discards paused actions",
    { timeout: 25000 },
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
        "import{parentPort}from'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
        bundle.outputFiles[0].text +
        "\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});";
      for (const fork of [undefined, ids.advance, ids.rear]) {
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
        const shots: any[] = [];
        worker.on("message", (m) => {
          if (m.type === "ready") ready = true;
          if (m.type === "view") view = m.view;
          if (m.type === "error") error = m;
          if (m.type === "events")
            for (const e of m.events)
              if (e.type === "shots")
                shots.push(...e.shots.filter((s: any) => s.owner === "solo"));
        });
        worker.on("error", (e) => (error = e));
        const wait = async (check: () => boolean, label: string) => {
            const end = Date.now() + 6500;
            while (!check()) {
              assert(!error, JSON.stringify(error));
              assert(Date.now() < end, label + " " + (fork ?? "passing"));
              await new Promise((r) => setTimeout(r, 6));
            }
          },
          input = (sequence: number, action: object) =>
            worker.postMessage({
              type: "input",
              input: { ...idleInput(), sequence, ...action },
            });
        try {
          await wait(() => ready, "worker ready");
          worker.postMessage({ type: "resume", value: checkpoint(fork) });
          await wait(() => !!view, "owned safe boundary");
          assert(view.players[0].skills.includes(ids.entry));
          assert(!view.players[0].kit.soldierFollowupUntil);
          worker.postMessage({ type: "start" });
          await wait(() => view.phase === "combat", "combat");
          const ammo = view.players[0].ammo;
          input(1, { e: true, aim: 0 });
          await wait(
            () => view.players[0].kit.soldierFollowupUntil > view.combatTick,
            "earned opening",
          );
          input(2, { technique1: true, moveX: fork ? 0 : 1, aim: 0 });
          await wait(
            () => view.classCues.some((c: any) => c.kind === "soldier-step"),
            "public commitment",
          );
          const cue = view.classCues.find(
            (c: any) => c.kind === "soldier-step",
          );
          assert.equal(
            cue.mode,
            fork === ids.advance
              ? "advance"
              : fork === ids.rear
                ? "rear"
                : "passing",
          );
          assert(!("damage" in cue));
          assert(!("middleFired" in cue));
          worker.postMessage({ type: "pause", value: true });
          await new Promise((r) => setTimeout(r, 30));
          const tick = view.combatTick;
          input(3, { q: true, ultimate: true, technique1: true, dodge: true });
          await new Promise((r) => setTimeout(r, 75));
          assert.equal(view.combatTick, tick);
          worker.postMessage({ type: "pause", value: false });
          await wait(
            () =>
              view.combatTick > cue.until + 2 &&
              !view.classCues.some((c: any) => c.kind === "soldier-step"),
            "finished follow-through",
          );
          const p = view.players[0];
          assert.equal(p.ack, 2);
          assert.equal(p.ammo, ammo);
          assert.equal(p.qAt, 0);
          assert.equal(p.ultimateAt, 0);
          assert.equal(p.kit.soldierFollowupUntil, 0);
          assert.equal(shots.length, fork === ids.advance ? 5 : 4);
        } finally {
          await worker.terminate();
        }
      }
    },
  );
