import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { build } from "esbuild";
import { Game } from "../src/shared/game.ts";
import { skirmisherIds as ids } from "../src/shared/soldier-skirmisher.ts";
import { idleInput } from "../src/shared/protocol.ts";

for (const testing of [false, true])
  test(
    "actual optimized " +
      (testing ? "testing" : "public") +
      " Solo worker loads finite rounds, coordinates each step and discards paused requests",
    { timeout: 30000 },
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
        }),
        wrapper =
          "import{parentPort}from'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
          bundle.outputFiles[0].text +
          "\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});";
      for (const route of ["drill", "passing", "advance", "rear"]) {
        const g = new Game({
          mode: route === "drill" ? "raid" : "endless",
          seed: 41,
          maxPlayers: 1,
          arenaSelection: "fixed",
          openingArenaId: "gatehouse",
          openingBossId: "constable",
        });
        if (route !== "drill") g.encounter = 9;
        const p = g.addPlayer("solo", "Mara", "soldier");
        for (const item of [
          "soldier-ballistics-1",
          ids.entry,
          ids.drill,
          ...(route !== "drill" ? [ids.roving] : []),
          ...(route === "advance"
            ? [ids.advance]
            : route === "rear"
              ? [ids.rear]
              : []),
        ])
          assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
        const checkpoint = g.offlineCheckpoint();
        assert(checkpoint);
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
            const end = Date.now() + 6000;
            while (!check()) {
              assert(!error, JSON.stringify(error));
              assert(Date.now() < end, label + " " + route);
              await new Promise((r) => setTimeout(r, 5));
            }
          },
          input = (sequence: number, action: object) =>
            worker.postMessage({
              type: "input",
              input: { ...idleInput(), sequence, ...action },
            });
        try {
          await wait(() => ready, "ready");
          worker.postMessage({ type: "resume", value: checkpoint });
          await wait(() => !!view, "owned boundary");
          worker.postMessage({ type: "start" });
          await wait(() => view.phase === "combat", "combat");
          const magazine = view.players[0].ammo;
          let sequence = 0;
          const firingEnd = Date.now() + 3500;
          while (view.players[0].ammo > magazine - 3) {
            assert(Date.now() < firingEnd, "expenditure " + route);
            input(++sequence, { fire: true, aim: 0 });
            await new Promise((r) => setTimeout(r, 60));
          }
          input(++sequence, { technique2: true });
          await wait(
            () => view.classCues.some((c: any) => c.kind === "soldier-load"),
            "load begins",
          );
          const load = view.classCues.find(
            (c: any) => c.kind === "soldier-load",
          );
          assert.equal(load.owner, "solo");
          assert(!("weapon" in load) && !("interval" in load));
          worker.postMessage({ type: "pause", value: true });
          await new Promise((r) => setTimeout(r, 30));
          const tick = view.combatTick,
            ammo = view.players[0].ammo;
          input(++sequence, {
            technique2: true,
            e: true,
            ultimate: true,
            dodge: true,
          });
          await new Promise((r) => setTimeout(r, 65));
          assert.equal(view.combatTick, tick);
          assert.equal(view.players[0].ammo, ammo);
          worker.postMessage({ type: "pause", value: false });
          input(
            ++sequence,
            route === "drill"
              ? {}
              : { e: true, technique1: true, moveX: 1, aim: 0 },
          );
          const resumedSequence = sequence;
          if (route !== "drill") {
            await wait(
              () => view.classCues.some((c: any) => c.kind === "soldier-step"),
              "physical roving commitment",
            );
            assert.equal(
              view.classCues.find((c: any) => c.kind === "soldier-load")?.id,
              load.id,
            );
          }
          await wait(() => view.players[0].ammo > ammo, "one actual round");
          assert.equal(view.players[0].ack, resumedSequence);
          assert.equal(view.players[0].ultimateAt, 0);
          assert.equal(view.players[0].qAt, 0);
          const before = view.players[0].ammo,
            recovery = view.players[0].kit.technique2At;
          input(++sequence, { technique2: true, fire: true });
          await wait(
            () =>
              view.players[0].ack === sequence &&
              !view.classCues.some((c: any) => c.kind === "soldier-load"),
            "stop during recovery",
          );
          await wait(
            () => view.players[0].ammo < before,
            "resumed held primary",
          );
          assert.equal(view.players[0].kit.technique2At, recovery);
          assert(view.combatTick < recovery);
        } finally {
          await worker.terminate();
        }
      }
    },
  );
