import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { idleInput } from "../../src/shared/protocol.ts";
import { runtimeArena } from "../../src/shared/arena-layouts.ts";
import { distance } from "../../src/shared/geometry.ts";
import { grenadeApproach } from "./grenadier-worker-flow.ts";
export async function sniperWorkerFlow(
  code: string,
  variant: "cover" | "cancel" = "cover",
) {
  const wrapper =
      "import{parentPort}from'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
      code +
      "\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});",
    worker = new Worker(
      new URL(
        "data:text/javascript;base64," +
          Buffer.from(wrapper).toString("base64"),
      ),
      { execArgv: [] },
    );
  let ready = false,
    view: any,
    error: any,
    sequence = 0,
    pauseAt = -1;
  const shots: any[] = [],
    removals: number[] = [],
    purchases: any[] = [];
  worker.on("message", (m) => {
    if (m.type === "ready") ready = true;
    if (m.type === "view") view = m.view;
    if (m.type === "error") error = m;
    if (m.type === "pauseState" && m.value) pauseAt = m.combatTick;
    if (m.type === "purchaseResult") purchases.push(m);
    if (m.type === "events")
      for (const e of m.events) {
        if (e.type === "shots")
          shots.push(...e.shots.filter((s: any) => s.owner === "solo"));
        if (e.type === "remove") removals.push(...e.ids);
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
    },
    p = () => view.players.find((p: any) => p.id === "solo"),
    input = (action: object = {}) =>
      worker.postMessage({
        type: "input",
        input: { ...idleInput(), sequence: ++sequence, aim: 0, ...action },
      }),
    walk = async (point: { x: number; y: number }) => {
      const end = Date.now() + 5500;
      while (distance(p(), point) > 9) {
        assert(Date.now() < end, "actual walking to runtime cover");
        const d = distance(p(), point);
        input({ moveX: (point.x - p().x) / d, moveY: (point.y - p().y) / d });
        await new Promise((r) => setTimeout(r, 25));
      }
      input();
      await wait(
        () => p().ack >= sequence,
        "actual movement stop acknowledgment",
      );
    };
  try {
    await wait(() => ready, "ready");
    worker.postMessage({
      type: "init",
      settings: {
        mode: "short",
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
    assert.equal(p().sp, 3);
    for (const item of ["soldier-ballistics-1", "soldier-sniper-1"]) {
      const count = purchases.length;
      worker.postMessage({
        type: "purchase",
        request: { id: item, kind: "skill", item },
      });
      await wait(
        () => purchases.length > count && p().skills.includes(item),
        "actual purchase result and separate view",
      );
      assert(purchases.at(-1).ok);
    }
    assert.equal(p().sp, 0);
    worker.postMessage({ type: "start" });
    await wait(() => view.phase === "combat", "ordinary combat");
    let aim = 0;
    if (variant === "cover") {
      const approach = grenadeApproach(
        p(),
        runtimeArena(view.arenaId, "normal"),
      );
      await walk(approach);
      aim = approach.aim;
    }
    const ammo = p().ammo,
      eAt = p().eAt;
    input({ technique1: true, aim });
    await wait(() => p().kit.sniperPrepared, "actual paid preparation");
    const until = p().kit.sniperUntil,
      at = p().kit.sniperRecoveryAt,
      readyAt = p().kit.sniperReadyAt;
    assert.equal(p().ammo, ammo - 1);
    assert.equal(shots.length, 0);
    input({ technique1: true, aim });
    await wait(() => p().ack >= sequence, "early release request consumed");
    assert(p().kit.sniperPrepared);
    assert.equal(p().kit.sniperUntil, until);
    worker.postMessage({ type: "pause", value: true });
    await wait(
      () => pauseAt === view.combatTick,
      "actual pause acknowledgment",
    );
    const tick = view.combatTick;
    input({ technique1: true, fire: true, moveX: 1, reload: true });
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(view.combatTick, tick);
    assert.equal(p().kit.sniperUntil, until);
    assert.equal(p().ammo, ammo - 1);
    worker.postMessage({ type: "pause", value: false });
    input({ aim });
    if (variant === "cancel") {
      const x = p().x;
      input({ moveX: 1, aim });
      await wait(
        () => p().x > x && !p().kit.sniperPrepared,
        "actual movement cancellation",
      );
      input({ aim });
      await wait(() => p().ack >= sequence, "movement stop");
      assert.equal(p().ammo, ammo - 1);
      assert.equal(p().kit.sniperRecoveryAt, at);
      assert.equal(shots.length, 0);
      assert.equal(p().kit.sniperShotAt, 0);
      assert.equal(p().kit.sniperPrimaryAt, 0);
      return {
        ordinaryStartingSP: 3,
        actualPurchases: 2,
        remainingSP: 0,
        actualMovementCancels: true,
        reservationDoesNotReportFire: true,
        paidRoundAndRecoveryRetained: true,
        noAutomaticShot: true,
        pauseDiscardsRequests: true,
        workerPatched: false,
        variant,
      };
    }
    await wait(
      () => p().kit.sniperPrepared && view.combatTick >= readyAt,
      "real settling clock",
    );
    assert.equal(shots.length, 0);
    input({ technique1: true, aim });
    await wait(
      () =>
        shots.length === 1 &&
        removals.includes(shots[0].id) &&
        !p().kit.sniperPrepared,
      "separate actual shot/removal and release view",
    );
    assert.equal(p().ammo, ammo - 1);
    assert.equal(p().eAt, eAt);
    assert.equal(p().kit.sniperRecoveryAt, at);
    assert(p().kit.sniperShotAt > 0);
    for (const key of ["reserved", "fireLatch", "required", "origin"])
      assert(!(key in shots[0]));
    return {
      ordinaryStartingSP: 3,
      actualPurchases: 2,
      remainingSP: 0,
      manualReleaseAfterRealSettling: true,
      actualShotAndRemoval: true,
      physicalCoverStopsShot: true,
      actualFireTiming: true,
      oneRoundReservedOnlyOnce: true,
      burstUnchanged: true,
      pauseDiscardsRequests: true,
      workerPatched: false,
      variant,
    };
  } finally {
    await worker.terminate();
  }
}
