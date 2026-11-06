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
      " Solo worker executes earned paid and relay steps with real round expenditure and pause",
    { timeout: 40000 },
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
      for (const route of ["ready", "passing", "advance", "rear"]) {
        const cap = route !== "ready",
          g = new Game({
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
          ids.drill,
          ids.roving,
          ids.ready,
          ...(cap ? [ids.volley] : []),
          ...(route === "advance"
            ? [ids.advance]
            : route === "rear"
              ? [ids.rear]
              : []),
        ])
          assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
        const checkpoint = g.offlineCheckpoint();
        assert(checkpoint);
        assert(Game.restoreOffline(structuredClone(checkpoint)));
        const worker = new Worker(
          new URL(
            "data:text/javascript;base64," +
              Buffer.from(wrapper).toString("base64"),
          ),
          { execArgv: [] },
        );
        let ready = false,
          view: any,
          error: any,
          sequence = 0;
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
            const end = Date.now() + 7000;
            while (!check()) {
              assert(!error, JSON.stringify(error));
              assert(Date.now() < end, label + " " + route);
              await new Promise((r) => setTimeout(r, 5));
            }
          },
          input = (action: object) =>
            worker.postMessage({
              type: "input",
              input: { ...idleInput(), sequence: ++sequence, ...action },
            });
        try {
          await wait(() => ready, "ready");
          worker.postMessage({ type: "resume", value: checkpoint });
          await wait(() => !!view, "controlled legal late boundary");
          worker.postMessage({ type: "start" });
          await wait(() => view.phase === "combat", "combat");
          const magazine = view.players[0].ammo;
          const firingEnd = Date.now() + 4000;
          while (view.players[0].ammo > magazine - 4) {
            assert(Date.now() < firingEnd, "actual primary expenditure");
            input({ fire: true, aim: 0 });
            await new Promise((r) => setTimeout(r, 60));
          }
          const before = view.players[0].ammo;
          input({ technique2: true });
          await wait(
            () => view.classCues.some((c: any) => c.kind === "soldier-load"),
            "real drill",
          );
          const load = view.classCues.find(
            (c: any) => c.kind === "soldier-load",
          );
          assert(!view.classCues.some((c: any) => c.kind === "soldier-ready"));
          if (cap) {
            input({ e: true, technique1: true, moveX: 1, aim: 0 });
            await wait(
              () =>
                view.classCues.some(
                  (c: any) => c.kind === "soldier-step" && !c.loaded,
                ),
              "independent original free step",
            );
          }
          await wait(
            () =>
              view.classCues.some(
                (c: any) => c.kind === "soldier-ready" && !c.relay,
              ),
            "first inserted opening",
          );
          const opening = view.classCues.find(
            (c: any) => c.kind === "soldier-ready",
          );
          for (const key of ["source", "weapon", "proof"])
            assert(!(key in opening));
          const ammo = view.players[0].ammo,
            recovery = view.players[0].kit.technique1At;
          input({
            technique1: true,
            moveY: 1,
            aim: route === "rear" ? Math.PI : Math.PI / 2,
          });
          await wait(
            () =>
              view.classCues.some(
                (c: any) => c.kind === "soldier-step" && c.loaded && !c.relay,
              ),
            "first paid body",
          );
          const first = view.classCues.find(
            (c: any) => c.kind === "soldier-step" && c.loaded,
          );
          assert.equal(first.mode, route === "ready" ? "passing" : route);
          assert(!("paidDrill" in first) && !("paidLeg" in first));
          assert(view.players[0].ammo <= ammo - 1);
          if (cap) assert(view.players[0].kit.technique1At > recovery);
          worker.postMessage({ type: "pause", value: true });
          await new Promise((r) => setTimeout(r, 25));
          const tick = view.combatTick,
            pausedAmmo = view.players[0].ammo,
            eAt = view.players[0].eAt;
          input({
            technique1: true,
            technique2: true,
            ultimate: true,
            e: true,
            dodge: true,
          });
          await new Promise((r) => setTimeout(r, 75));
          assert.equal(view.combatTick, tick);
          assert.equal(view.players[0].ammo, pausedAmmo);
          worker.postMessage({ type: "pause", value: false });
          input({});
          const resumed = sequence;
          let until = first.until;
          if (cap) {
            await wait(
              () =>
                view.classCues.some(
                  (c: any) => c.kind === "soldier-ready" && c.relay,
                ),
              "actual completed-step and third-round relay",
            );
            input({
              technique1: true,
              moveX: -1,
              aim: route === "advance" ? Math.PI : 0,
            });
            await wait(
              () =>
                view.classCues.some(
                  (c: any) => c.kind === "soldier-step" && c.loaded && c.relay,
                ),
              "second paid body",
            );
            const second = view.classCues.find(
              (c: any) => c.kind === "soldier-step" && c.relay,
            );
            until = second.until;
            assert.equal(second.mode, route);
          }
          await wait(
            () =>
              view.combatTick > Math.max(until, load.until) + 1 &&
              !view.classCues.some((c: any) =>
                ["soldier-step", "soldier-load"].includes(c.kind),
              ),
            "finish finite work",
          );
          assert(!view.classCues.some((c: any) => c.kind === "soldier-ready"));
          assert.equal(
            view.players[0].ammo,
            before + load.total - (cap ? 2 : 1),
          );
          assert.equal(view.players[0].ultimateAt, 0);
          assert.equal(view.players[0].eAt, eAt);
          assert(view.players[0].ack >= resumed);
          assert(view.players[0].kit.technique1At > view.combatTick);
          assert.equal(
            shots.length,
            magazine -
              before +
              (cap ? 3 + 3 * (route === "advance" ? 2 : 1) : 1),
          );
        } finally {
          await worker.terminate();
        }
      }
    },
  );
