import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { build } from "esbuild";
import { idleInput, HZ } from "../src/shared/protocol.ts";
import { marksmanId, marksmanIds, marksmanRules } from "../src/shared/soldier-marksman.ts";
import { runtimeArena } from "../src/shared/arena-layouts.ts";
import { segmentRect } from "../src/shared/geometry.ts";

for(const variant of [marksmanIds.carom,marksmanIds.line])
for (const testing of [false, true])
  test(
    variant+" ordinary Raid purchases in the optimized " +
      (testing ? "testing" : "public") +
      " Solo worker uses a contact-earned second shot with real rounds and pause",
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
        "import{parentPort}from'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
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
        error: any,
        sequence = 0;
      const purchases: any[] = [],
        shots: any[] = [],
        sounds: any[] = [];
      worker.on("message", (m) => {
        if (m.type === "ready") ready = true;
        if (m.type === "view") view = m.view;
        if (m.type === "error") error = m;
        if (m.type === "purchaseResult") purchases.push(m);
        if (m.type === "events")
          for (const e of m.events) {
            if (e.type === "shots")
              shots.push(...e.shots.filter((s: any) => s.owner === "solo"));
            if (e.type === "sound") sounds.push(e);
          }
      });
      worker.on("error", (e) => (error = e));
      const wait = async (check: () => boolean, label: string) => {
        const end = Date.now() + 6000;
        while (!check()) {
          assert(!error, JSON.stringify(error));
          assert(Date.now() < end, label);
          await new Promise((r) => setTimeout(r, 5));
        }
      };
      const input = (action: object) =>
        worker.postMessage({
          type: "input",
          input: {
            ...idleInput(),
            sequence: ++sequence,
            aim: Math.PI,
            ...action,
          },
        });
      try {
        await wait(() => ready, "ready");
        worker.postMessage({
          type: "init",
          settings: {
            mode: "raid",
            seed: 41,
            difficulty: "normal",
            maxPlayers: 1,
            arenaSelection: "fixed",
            openingArenaId: "gatehouse",
          },
          name: "Mara",
          classId: "soldier",
        });
        await wait(() => !!view, "ordinary lobby");
        assert.equal(view.players[0].sp, 12);
        for (const item of ["soldier-ballistics-1", marksmanId,variant,marksmanIds.pair]) {
          worker.postMessage({
            type: "purchase",
            request: { id: item, kind: "skill", item },
          });
          await wait(
            () => view.players[0].skills.includes(item),
            "ordinary purchase " + item,
          );
        }
        assert.equal(purchases.length, 4);
        assert(purchases.every((row) => row.ok));
        assert.equal(view.players[0].sp, 4);
        worker.postMessage({ type: "start" });
        await wait(() => view.phase === "combat", "combat");
        const ammo = view.players[0].ammo,
          eAt = view.players[0].eAt,
          launch = { x: view.players[0].x, y: view.players[0].y };
        const destination = {
          x: launch.x - marksmanRules.speed * marksmanRules.lifeSeconds,
          y: launch.y,
        };
        const firstWall = runtimeArena(view.arenaId, "normal")
          .obstacles.map((w) =>
            segmentRect(launch, destination, w, marksmanRules.radius),
          )
          .filter((hit): hit is NonNullable<typeof hit> => hit !== null)
          .sort((a, b) => a.t - b.t)[0];
        assert(firstWall);
        const expected = {
          x: launch.x + (destination.x - launch.x) * firstWall.t,
          y: launch.y,
        };
        input({ technique2: true });
        await wait(
          () => view.players[0].ammo === ammo - 1,
          "real cartridge expenditure",
        );
        worker.postMessage({ type: "pause", value: true });
        await new Promise((r) => setTimeout(r, 30));
        const tick = view.combatTick,
          at = view.players[0].kit.technique2At;
        assert(at > tick);
        input({ technique2: true, e: true, reload: true, fire: true });
        await new Promise((r) => setTimeout(r, 80));
        assert.equal(view.combatTick, tick);
        assert.equal(view.players[0].ammo, ammo - 1);
        assert.equal(view.players[0].kit.technique2At, at);
        worker.postMessage({ type: "pause", value: false });
        input({});
        await wait(
          () => view.classCues.some((c: any) => c.kind === "soldier-bank"),
          "actual left cover contact",
        );
        const bank = view.classCues.find((c: any) => c.kind === "soldier-bank");
        assert.equal(bank.owner, "solo");
        assert.equal(bank.radius, marksmanRules.radius);
        assert.equal(
          bank.until - bank.at,
          Math.ceil(marksmanRules.contactSeconds * HZ),
        );
        assert(
          Math.abs(bank.x - expected.x) < 0.01,
          JSON.stringify({ bank, expected, launch }),
        );
        assert(Math.abs(bank.y - expected.y) < 0.01);
        assert(Math.cos(bank.incomingAim) < -0.99);
        assert(Math.cos(bank.outgoingAim) > 0.99);
        for (const key of ["origin", "banks", "proof", "recovery"])
          assert(!(key in bank), key);
        // State and events are separate messages; observing the cue does not acknowledge its event batch.
        await wait(
          () =>
            shots.some((s) => s.id === bank.id && s.vx > 0) &&
            sounds.some((s) => s.id === "soldier-bank"),
          "bank trajectory/contact event batch",
        );
        const trajectories = shots.filter((s) => s.id === bank.id);
        assert(trajectories.some((s) => s.vx < 0));
        assert(trajectories.some((s) => s.vx > 0));
        assert(sounds.some((s) => s.id === "soldier-bank-shot"));
        assert(sounds.some((s) => s.id === "soldier-bank"));
        assert.equal(view.players[0].eAt, eAt);
        assert.equal(view.players[0].ammo, ammo - 1);
        assert.equal(view.players[0].kit.technique2At, at);
        assert(view.players[0].kit.soldierPairUntil>view.combatTick);
        if(variant===marksmanIds.line)assert(trajectories.some(s=>s.vx>0&&s.pierce===1));
        const first=bank.id;
        input({technique2:true,aim:Math.PI/2});
        await wait(()=>view.players[0].ammo===ammo-2,"manual second shot cartridge");input({});
        await wait(()=>shots.some(s=>s.id!==first&&s.vy>800),"separate second shot event acknowledgment");
        assert.equal(view.players[0].kit.soldierPairUntil,0);assert.equal(view.players[0].kit.technique2At,at);
        input({technique2:true});await new Promise(r=>setTimeout(r,80));input({});
        assert.equal(view.players[0].ammo,ammo-2);assert.equal(view.players[0].kit.soldierPairUntil,0);
        assert.equal(view.players[0].kit.technique1At,0);
      } finally {
        await worker.terminate();
      }
    },
  );
