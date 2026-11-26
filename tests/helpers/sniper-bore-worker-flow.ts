import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { idleInput } from "../../src/shared/protocol.ts";
import { runtimeArena } from "../../src/shared/arena-layouts.ts";
import { distance } from "../../src/shared/geometry.ts";
import { data } from "../../src/shared/game.ts";
import { sniperBoreRules as br } from "../../src/shared/soldier-sniper.ts";
import { boreApproach, actualBoreAim } from "./sniper-bore-approach.ts";
export async function sniperBoreWorkerFlow(
  code: string,
  variant: "through" | "blocked",
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
    purchases: any[] = [],
    cues: any[] = [],
    sounds: any[] = [];
  worker.on("message", (m) => {
    if (m.type === "ready") ready = true;
    if (m.type === "view") {
      view = m.view;
      cues.push(
        ...(view.classCues ?? []).filter(
          (c: any) => c.kind === "soldier-puncture",
        ),
      );
    }
    if (m.type === "error") error = m;
    if (m.type === "pauseState" && m.value) pauseAt = m.combatTick;
    if (m.type === "purchaseResult") purchases.push(m);
    if (m.type === "events")
      for (const e of m.events) {
        if (e.type === "shots")
          shots.push(...e.shots.filter((s: any) => s.owner === "solo"));
        if (e.type === "remove") removals.push(...e.ids);
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
    },
    p = () => view.players.find((p: any) => p.id === "solo"),
    input = (a: object = {}) =>
      worker.postMessage({
        type: "input",
        input: { ...idleInput(), sequence: ++sequence, aim: 0, ...a },
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
    await wait(() => !!view, "ordinary Raid lobby");
    assert.equal(p().sp, 12);
    for (const item of [
      "soldier-ballistics-1",
      "soldier-sniper-1",
      "soldier-sniper-bore-1",
    ]) {
      const n = purchases.length;
      worker.postMessage({
        type: "purchase",
        request: { id: item, kind: "skill", item },
      });
      await wait(
        () => purchases.length > n && p().skills.includes(item),
        "actual purchase result and separate view",
      );
      assert(purchases.at(-1).ok);
    }
    assert.equal(p().sp, 6);
    worker.postMessage({ type: "start" });
    await wait(() => view.phase === "combat", "ordinary combat");
    const arena = runtimeArena(view.arenaId, "normal"),
      boss = {
        ...view.boss,
        radius: data.bosses.find((b) => b.id === view.boss.id)!.radius,
      },
      approach = boreApproach(p(), arena, variant, boss),
      walkUntil = Date.now() + 5500;
    while (distance(p(), approach) > 2) {
      assert(Date.now() < walkUntil, "actual walk to usable interior cover");
      const d = distance(p(), approach),
        scale = Math.min(1, d / 12);
      input({
        moveX: ((approach.x - p().x) / d) * scale,
        moveY: ((approach.y - p().y) / d) * scale,
        aim: approach.aim,
      });
      await new Promise((r) => setTimeout(r, 25));
    }
    input({ aim: approach.aim });
    await wait(() => p().ack >= sequence, "actual stop acknowledgment");
    const actual = actualBoreAim(p(), arena, approach, variant),
      aim = actual.aim,
      ammo = p().ammo,
      eAt = p().eAt;
    input({ technique1: true, aim });
    await wait(() => p().kit.sniperPrepared, "actual paid C preparation");
    const until = p().kit.sniperUntil,
      at = p().kit.sniperRecoveryAt;
    assert.equal(p().ammo, ammo - 1);
    input({ technique2: true, aim });
    await wait(() => p().ack >= sequence, "early B request consumed");
    assert(p().kit.sniperPrepared);
    assert.equal(shots.length, 0);
    worker.postMessage({ type: "pause", value: true });
    await wait(() => pauseAt === view.combatTick, "actual pause");
    const tick = view.combatTick;
    input({
      technique1: true,
      technique2: true,
      fire: true,
      moveX: 1,
      reload: true,
    });
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(view.combatTick, tick);
    assert.equal(p().ammo, ammo - 1);
    assert.equal(p().kit.sniperUntil, until);
    worker.postMessage({ type: "pause", value: false });
    input({ aim });
    await wait(
      () => p().kit.sniperPrepared && p().kit.sniperReadyAt <= view.combatTick,
      "real settling",
    );
    assert.equal(shots.length, 0);
    input({ technique2: true, aim });
    await wait(
      () =>
        shots.length === 1 &&
        !p().kit.sniperPrepared &&
        sounds.some((s) => s.id === "sniper-bore"),
      "actual B round and separate fire view/sound",
    );
    const shot = shots[0];
    await wait(
      () =>
        removals.includes(shot.id) &&
        (variant === "blocked" || cues.some((c) => c.id === shot.id)),
      "actual shot removal and material feedback",
    );
    assert.equal(p().ammo, ammo - 1);
    assert.equal(p().eAt, eAt);
    assert.equal(p().kit.sniperRecoveryAt, at);
    assert(p().kit.sniperShotAt > 0 && p().kit.sniperShotAt <= until);
    const contacts = cues.filter((c) => c.id === shot.id);
    if (variant === "through") {
      assert(contacts.length);
      const c = contacts[0];
      assert(Math.hypot(c.exitX - c.x, c.exitY - c.y) <= br.coverDepth + 1e-6);
      assert(actual.exit);
      assert(Math.hypot(c.x - actual.entry.x, c.y - actual.entry.y) < 1e-5);
      assert(
        Math.hypot(c.exitX - actual.exit.x, c.exitY - actual.exit.y) < 1e-5,
      );
      for (const key of [
        "reserved",
        "weapon",
        "damage",
        "fireLatch",
        "bore",
        "passed",
        "tunnel",
      ])
        assert(!(key in c));
    } else assert.equal(contacts.length, 0);
    for (const key of [
      "reserved",
      "fireLatch",
      "required",
      "origin",
      "bore",
      "tunnel",
      "passed",
    ])
      assert(!(key in shot));
    return {
      ordinaryStartingSP: 12,
      actualPurchases: 3,
      remainingSP: 6,
      variant,
      actualMovementToUsableInteriorCover: true,
      manualBReleaseAfterRealSettling: true,
      oneActualRoundReservedOnlyOnce: true,
      actualShotAndRemoval: true,
      actualNarrowCoverCrossing: variant === "through",
      deepCoverRejectsWithoutCrossing: variant === "blocked",
      sharedFeedbackOmitsPrivatePayment: true,
      spentRecoveryRetained: true,
      actualFireTiming: true,
      burstUnchanged: true,
      pauseDiscardsRequests: true,
      workerPatched: false,
    };
  } finally {
    await worker.terminate();
  }
}
