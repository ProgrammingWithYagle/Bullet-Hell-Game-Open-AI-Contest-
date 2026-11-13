import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { idleInput } from "../../src/shared/protocol.ts";
import { runtimeArena } from "../../src/shared/arena-layouts.ts";
import { distance, segmentRect } from "../../src/shared/geometry.ts";
import { grenadierIds as ids } from "../../src/shared/soldier-grenadier.ts";
export function grenadeApproach(
  p: { x: number; y: number },
  arena: ReturnType<typeof runtimeArena>,
) {
  const points: any[] = [];
  for (const w of arena.obstacles)
    for (const q of [
      {
        x: w.x - 24,
        y: Math.max(w.y + 1, Math.min(w.y + w.height - 1, p.y)),
        aim: 0,
      },
      {
        x: w.x + w.width + 24,
        y: Math.max(w.y + 1, Math.min(w.y + w.height - 1, p.y)),
        aim: Math.PI,
      },
      {
        y: w.y - 24,
        x: Math.max(w.x + 1, Math.min(w.x + w.width - 1, p.x)),
        aim: Math.PI / 2,
      },
      {
        y: w.y + w.height + 24,
        x: Math.max(w.x + 1, Math.min(w.x + w.width - 1, p.x)),
        aim: -Math.PI / 2,
      },
    ])
      if (
        q.x > arena.bounds.x + 9 &&
        q.y > arena.bounds.y + 9 &&
        q.x < arena.bounds.x + arena.bounds.width - 9 &&
        q.y < arena.bounds.y + arena.bounds.height - 9 &&
        !arena.obstacles.some((o) => segmentRect(p, q, o, 9) !== null) &&
        !arena.lavaPits.some((l) => distance(q, l) < l.radius + 12)
      )
        points.push(q);
  points.sort((a, b) => distance(p, a) - distance(p, b));
  assert(points.length, "a real reachable cover approach");
  return points[0] as { x: number; y: number; aim: number };
}
export async function grenadeWorkerFlow(
  code: string,
  options: {
    mode?: "short" | "raid";
    variant?: "skim" | "contact";
    checkpoint?: any;
    late?: boolean;
  } = {},
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
    cues: any[] = [],
    sounds: any[] = [],
    purchases: any[] = [];
  worker.on("message", (m) => {
    if (m.type === "ready") ready = true;
    if (m.type === "view") {
      view = m.view;
      cues.push(...(view.classCues ?? []));
    }
    if (m.type === "error") error = m;
    if (m.type === "pauseState" && m.value) pauseAt = m.combatTick;
    if (m.type === "purchaseResult") purchases.push(m);
    if (m.type === "events")
      for (const e of m.events) {
        if (e.type === "shots")
          shots.push(
            ...e.shots.filter(
              (s: any) => s.owner === "solo" && s.visual === "canister",
            ),
          );
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
    input = (action: object = {}) =>
      worker.postMessage({
        type: "input",
        input: { ...idleInput(), sequence: ++sequence, aim: 0, ...action },
      }),
    pause = async () => {
      worker.postMessage({ type: "pause", value: true });
      await wait(
        () => pauseAt === view.combatTick,
        "real pause acknowledgment",
      );
    },
    resume = () => {
      worker.postMessage({ type: "pause", value: false });
      input();
    },
    walk = async (point: { x: number; y: number }, reach: number) => {
      const end = Date.now() + 5500;
      while (distance(p(), point) > reach) {
        assert(
          Date.now() < end,
          "ordinary movement reaches actual handling/cover point",
        );
        const d = distance(p(), point);
        input({ moveX: (point.x - p().x) / d, moveY: (point.y - p().y) / d });
        await new Promise((r) => setTimeout(r, 25));
      }
      input();
      await wait(() => p().ack >= sequence, "movement stop acknowledged");
    };
  try {
    await wait(() => ready, "ready");
    if (options.checkpoint)
      worker.postMessage({ type: "resume", value: options.checkpoint });
    else
      worker.postMessage({
        type: "init",
        settings: {
          mode: options.mode ?? "short",
          seed: 41,
          difficulty: "normal",
          maxPlayers: 1,
          arenaSelection: "fixed",
          openingArenaId: "gatehouse",
        },
        name: "Mara",
        classId: "soldier",
      });
    await wait(() => !!view, "ordinary lobby/local boundary");
    sequence = p().ack ?? 0;
    if (!options.checkpoint) {
      assert.equal(p().sp, options.mode === "raid" ? 12 : 3);
      for (const item of [
        "soldier-ballistics-1",
        ids.entry,
        ...(options.variant ? [ids[options.variant], ids.pitch] : []),
      ]) {
        worker.postMessage({
          type: "purchase",
          request: { id: item, kind: "skill", item },
        });
        await wait(() => p().skills.includes(item), "actual purchase view");
      }
      assert(purchases.every((r) => r.ok));
    } else assert.equal(options.checkpoint.player.totalSp, 27);
    if (view.phase === "lobby") worker.postMessage({ type: "start" });
    await wait(() => view.phase === "combat", "ordinary start/loading clock");
    const ammo = p().ammo,
      eAt = p().eAt;
    if (!options.late) {
      const approach = grenadeApproach(
        p(),
        runtimeArena(view.arenaId, "normal"),
      );
      await walk(approach, 9);
      input({ technique1: true, aim: approach.aim });
      await wait(() => p().kit.grenadierHolding, "finite hand");
      await pause();
      const until = p().kit.grenadierFuseUntil,
        at = p().kit.grenadierRecoveryAt,
        tick = view.combatTick;
      input({ technique1: true, technique2: true, fire: true, reload: true });
      await new Promise((r) => setTimeout(r, 70));
      assert.equal(view.combatTick, tick);
      assert.equal(p().ammo, ammo);
      assert.equal(p().kit.grenadierFuseUntil, until);
      resume();
      input({
        [options.variant ? "technique2" : "technique1"]: true,
        aim: approach.aim,
      });
      await wait(() => shots.length > 0, "separate actual canister event");
      const shot = shots[0];
      assert.equal(shot.expires, until);
      assert.equal(p().ammo, ammo);
      await wait(
        () => cues.some((c) => c.kind === "soldier-grenade-contact"),
        "physical cover contact",
      );
      await wait(
        () =>
          removals.includes(shot.id) &&
          sounds.some((s) => s.id === "grenadier-blast"),
        "actual explosion and separate removal event",
      );
      assert.equal(p().kit.grenadierRecoveryAt, at);
      assert.equal(p().eAt, eAt);
      assert.equal(new Set(shots.map((s) => s.id)).size, 1);
      if (options.variant === "skim") {
        const path = shots.filter((s) => s.id === shot.id),
          dot = (s: any) =>
            s.vx * Math.cos(approach.aim) + s.vy * Math.sin(approach.aim);
        assert(
          path.some((s) => dot(s) > 0) && path.some((s) => dot(s) < 0),
          "actual reflected velocity in owner stream",
        );
      }
      for (const cue of cues.filter(
        (c) =>
          c.kind === "soldier-grenade-contact" ||
          c.kind === "soldier-grenade-blast",
      ))
        for (const key of ["kicked", "pinUsed", "caught", "proof", "required"])
          assert(!(key in cue));
      return {
        freshStartingSP: options.mode === "raid" ? 12 : 3,
        actualPurchases: purchases.length,
        remainingSP: p().sp,
        actualCoverContact: true,
        actualExplosionAndRemoval: true,
        ammoUnchanged: true,
        burstUnchanged: true,
        pausedHandRequestsDiscarded: true,
        variant: options.variant ?? "plain",
        workerPatched: false,
      };
    }
    input({ technique1: true });
    await wait(() => p().kit.grenadierHolding, "late live hand");
    const pin = p().skills.includes(ids.pin),
      at = p().kit.grenadierRecoveryAt;
    let until: number;
    if (pin) {
      input({ reload: true });
      await wait(
        () => p().kit.grenadierPinnedUntil > view.combatTick,
        "exact remaining fuse stored",
      );
      await pause();
      const remaining = p().kit.grenadierRemainingFuse,
        pinned = p().kit.grenadierPinnedUntil,
        tick = view.combatTick;
      input({ technique1: true, fire: true });
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(view.combatTick, tick);
      assert.equal(p().kit.grenadierPinnedUntil, pinned);
      resume();
      input({ technique1: true });
      await wait(() => p().kit.grenadierHolding, "resume same canister");
      assert(p().kit.grenadierFuseUntil - view.combatTick <= remaining);
    } else {
      input({ e: true });
      await wait(() => p().eAt > view.combatTick, "actual issued burst");
      assert(p().kit.grenadierHolding);
    }
    until = p().kit.grenadierFuseUntil;
    input({ technique2: true });
    await wait(() => shots.length > 0, "actual short cast event");
    const first = shots[0];
    await wait(
      () => shots.some((s) => s.id === first.id && s.vx === 0 && s.vy === 0),
      "actual grounded canister",
    );
    const kickStart = shots.length;
    input({ technique2: true, aim: Math.PI });
    await wait(
      () => shots.slice(kickStart).some((s) => s.id === first.id && s.vx < 0),
      "actual same-object kick",
    );
    await wait(
      () =>
        shots
          .slice(kickStart)
          .some((s) => s.id === first.id && s.vx === 0 && s.vy === 0),
      "actual grounded update after kick",
    );
    // A short cast moves44px, a reverse kick about95px; close the actual small gap if needed.
    const last = () => shots.filter((s) => s.id === first.id).at(-1)!;
    if (distance(p(), last()) > 43) await walk(last(), 43);
    input({ technique1: true });
    await wait(
      () => p().kit.grenadierHolding && removals.includes(first.id),
      "actual catch removal and separate hand view",
    );
    assert.equal(p().kit.grenadierFuseUntil, until);
    assert.equal(p().kit.grenadierRecoveryAt, at);
    input({ technique1: true, aim: -Math.PI / 2 });
    await wait(
      () => new Set(shots.map((s) => s.id)).size === 2,
      "reemitted same finite charge",
    );
    const second = shots.find((s) => s.id !== first.id)!;
    assert.equal(second.expires, until);
    await wait(
      () => removals.includes(second.id),
      "same fuse explosion/removal",
    );
    assert.equal(p().kit.grenadierRecoveryAt, at);
    assert.equal(p().ammo, ammo);
    return {
      localLateBoundary: true,
      earnedSP: 27,
      rePin: pin,
      clippedIssuedBurst: !pin,
      oneActualCanister: true,
      kickOriginalFlight: true,
      catchActualRemoval: true,
      rethrowRetainsFuse: true,
      recoveryRetained: true,
      ammoUnchanged: true,
      workerPatched: false,
    };
  } finally {
    await worker.terminate();
  }
}
