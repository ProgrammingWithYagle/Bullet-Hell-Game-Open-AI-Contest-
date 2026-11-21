import assert from "node:assert/strict";
import {
  idleInput,
  HZ,
  validInput,
  type InputFrame,
  type Event,
  type Shot,
  type Vec,
} from "../../src/shared/protocol.ts";
import type { View } from "../../src/shared/view.ts";
import { runtimeArena } from "../../src/shared/arena-layouts.ts";
import {
  distance,
  segmentRect,
  segmentCircle,
} from "../../src/shared/geometry.ts";
import { data } from "../../src/shared/game.ts";
import {
  flakIds as ids,
  heavyFlakRules as r,
  type FlakBurstCue,
} from "../../src/shared/heavy-flak.ts";
import { grenadeApproach } from "./grenadier-worker-flow.ts";
export type HeavyFlakVariant =
  "cover" | "exit" | "fuse" | "compact" | "frontal";
export type HeavyFlakAdapter = {
  owner: string;
  view(): View | undefined;
  events: Event[];
  bursts: Map<number, FlakBurstCue>;
  input(frame: InputFrame): void;
  purchase(item: string): Promise<void>;
  start(): Promise<void>;
  pause(value: boolean): Promise<void>;
  end?(): Promise<void>;
  lateAndNonHostChecks?(): Promise<void>;
  checkOwnerStreams?(id: number): void;
  checkSharedBurst?(cue: FlakBurstCue): Promise<void>;
};
export const heavyWait = async (check: () => boolean, label: string) => {
  const end = Date.now() + 6000;
  while (!check()) {
    assert(Date.now() < end, label);
    await new Promise((r) => setTimeout(r, 5));
  }
};
/** A test policy selects an actual open manual lane. It does not invent a collision or alter Game. */
export function heavyOpenLane(view: View, owner: string) {
  const p = view.players.find((p) => p.id === owner)!,
    arena = runtimeArena(view.arenaId, view.run.difficulty),
    boss = view.boss,
    bossRadius = data.bosses.find((b) => b.id === boss.id)!.radius + r.radius;
  const lanes = Array.from({ length: 64 }, (_, n) => {
    const aim = (n * Math.PI) / 32,
      to = { x: p.x + Math.cos(aim) * 2000, y: p.y + Math.sin(aim) * 2000 };
    let fraction = 1;
    for (const w of arena.obstacles) {
      const hit = segmentRect(p, to, w, r.radius);
      if (hit) fraction = Math.min(fraction, hit.t);
    }
    const body = segmentCircle(p, to, boss, bossRadius);
    if (body !== null) fraction = Math.min(fraction, body);
    for (const axis of ["x", "y"] as const) {
      const lo = arena.bounds[axis] + r.radius,
        hi =
          arena.bounds[axis] +
          (axis === "x" ? arena.bounds.width : arena.bounds.height) -
          r.radius;
      if (to[axis] < lo || to[axis] > hi)
        fraction = Math.min(
          fraction,
          ((to[axis] < lo ? lo : hi) - p[axis]) / (to[axis] - p[axis]),
        );
    }
    return {
      aim: Math.atan2(Math.sin(aim), Math.cos(aim)),
      clear: 2000 * fraction,
    };
  }).sort((a, b) => b.clear - a.clear);
  assert(
    lanes[0].clear > 420,
    "actual open lane for the finite live flak shell",
  );
  return lanes[0];
}
export async function heavyFlakFlow(
  a: HeavyFlakAdapter,
  variant: HeavyFlakVariant,
  options: { purchase?: (item: string) => Promise<void> } = {},
) {
  const view = () => {
      const v = a.view();
      assert(v);
      return v;
    },
    p = () => view().players.find((p) => p.id === a.owner)!,
    manual = variant === "compact" || variant === "frontal",
    starting = manual ? 12 : 3,
    ownedShots = () =>
      a.events
        .flatMap((e) => (e.type === "shots" ? e.shots : []))
        .filter((s) => s.owner === a.owner),
    flakShots = () => ownedShots().filter((s) => s.visual === "flak"),
    removed = (id: number) =>
      a.events.some((e) => e.type === "remove" && e.ids.includes(id)),
    cues = new Map<number, FlakBurstCue>();
  let sequence = 0;
  const collect = () => {
      for (const c of a.bursts.values())
        if (c.owner === a.owner) cues.set(c.id, structuredClone(c));
      for (const c of view().classCues)
        if (c.kind === "heavy-flak-burst" && c.owner === a.owner)
          cues.set(c.id, structuredClone(c));
    },
    input = (action: Partial<InputFrame> = {}) => {
      const frame = { ...idleInput(), sequence: ++sequence, aim: 0, ...action };
      assert(validInput(frame));
      a.input(frame);
      return sequence;
    };
  assert.equal(p().sp, starting);
  assert.equal(p().skills.length, 0);
  const items = [
    "heavy-ordnance-1",
    ids.entry,
    ...(manual
      ? [variant === "compact" ? ids.compact : ids.frontal, ids.command]
      : []),
  ];
  for (const item of items) {
    if (options.purchase) await options.purchase(item);
    else await a.purchase(item);
    await heavyWait(
      () => p().skills.includes(item),
      "separate real accepted purchase view: " + item,
    );
  }
  assert.equal(p().sp, manual ? 4 : 0);
  assert.deepEqual(p().skills, items);
  await a.start();
  await heavyWait(() => view().phase === "combat", "ordinary combat");
  let aim = 0;
  if (variant === "cover") {
    const target = grenadeApproach(
        p(),
        runtimeArena(view().arenaId, view().run.difficulty),
      ),
      end = Date.now() + 5500;
    let arrived = false;
    while (!arrived) {
      assert(Date.now() < end, "actual Heavy walk to reachable runtime cover");
      const d = distance(p(), target);
      if (d > 6) {
        input({
          moveX: (target.x - p().x) / d,
          moveY: (target.y - p().y) / d,
          aim: target.aim,
        });
        await new Promise((r) => setTimeout(r, 25));
      } else {
        const stopped = input({ aim: target.aim });
        await heavyWait(
          () => p().ack >= stopped,
          "actual stopped position acknowledgment",
        );
        arrived = distance(p(), target) <= 9;
      }
    }
    aim = target.aim;
  } else aim = heavyOpenLane(view(), a.owner).aim;
  await a.pause(true);
  const beforeTick = view().combatTick,
    beforeAmmo = p().ammo,
    beforePosition = { x: p().x, y: p().y },
    beforeTimers = { q: p().qAt, e: p().eAt, ultimate: p().ultimateAt };
  input({
    technique1: true,
    technique2: true,
    fire: true,
    reload: true,
    moveX: 1,
    q: true,
    e: true,
    ultimate: true,
    aim,
  });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(view().combatTick, beforeTick);
  assert.equal(p().ammo, beforeAmmo);
  assert.equal(ownedShots().length, 0);
  assert.deepEqual({ x: p().x, y: p().y }, beforePosition);
  await a.pause(false);
  const stopped = input({ aim });
  await heavyWait(
    () => p().ack >= stopped,
    "discard paused requests and accept fresh idle",
  );
  assert.equal(ownedShots().length, 0);
  assert.equal(p().ammo, beforeAmmo);
  const ammunition = p().ammo;
  input({ technique1: true, technique2: true, aim });
  await heavyWait(() => {
    collect();
    return flakShots().length === 1 && p().kit.heavyFlakShotAt! > 0;
  }, "actual shot event batch and separate launch view");
  const shell = flakShots()[0],
    born = p().kit.heavyFlakShotAt!,
    recovery = p().kit.technique1At!,
    seconds =
      variant === "compact"
        ? r.compactFuseSeconds
        : variant === "frontal"
          ? r.frontalFuseSeconds
          : r.fuseSeconds,
    until = born + Math.ceil(seconds * HZ);
  assert.equal(shell.expires, until);
  assert.equal(shell.damage, 0);
  assert.equal(shell.radius, r.radius);
  assert.equal(p().ammo, ammunition - 1);
  assert(recovery > until);
  assert.equal(ownedShots().length, 1);
  assert.equal(p().qAt, beforeTimers.q);
  assert.equal(p().eAt, beforeTimers.e);
  assert.equal(p().ultimateAt, beforeTimers.ultimate);
  assert(
    !a.events.some((e) => e.type === "sound" && e.id === "heavy-flak-command"),
  );
  for (const key of ["reserved", "pending", "weapon", "required", "flights"])
    assert(!(key in shell));
  assert(
    !Object.hasOwn(p().kit, "heavyFlakX") &&
      !Object.hasOwn(p().kit, "heavyFlakY"),
  );
  if (variant === "cover") {
    await heavyWait(() => {
      collect();
      return (
        removed(shell.id) &&
        cues.size === 1 &&
        (p().kit.heavyFlakUntil ?? 0) === 0
      );
    }, "physical runtime cover consumes actual shell and separately reports its burst");
    const cue = [...cues.values()][0],
      arena = runtimeArena(view().arenaId, view().run.difficulty),
      forward = { x: cue.x + Math.cos(aim), y: cue.y + Math.sin(aim) };
    assert(cue.at < until);
    assert(
      arena.obstacles.some(
        (w) => segmentRect(shell, forward, w, r.radius) !== null,
      ),
      "actual burst lies at the real approached cover",
    );
    assert(distance(shell, cue) < 80);
    assert.equal(cue.radius, r.baseRadius);
    assert.equal(cue.arc, Math.PI * 2);
    assert(cue.contacts.length <= r.projectileLimit);
    await a.checkSharedBurst?.(cue);
    a.checkOwnerStreams?.(shell.id);
    return {
      passed: true,
      variant,
      ordinaryStartingSP: 3,
      actualSkillPurchases: 2,
      remainingSP: 0,
      actualWalkingToRuntimeCover: true,
      actualPhysicalCoverContact: true,
      actualOneRoundAndRecovery: true,
      oneActualFiniteBurst: true,
      actualInterceptions: cue.contacts.length,
      pauseDiscardsRequests: true,
      noCheckpointOrBudgetHealthPositionInjection: true,
    };
  }
  assert(
    shell.expires > view().combatTick && !removed(shell.id),
    "a real live flak shell before flight pause",
  );
  await a.pause(true);
  assert(
    shell.expires > view().combatTick && !removed(shell.id),
    "flight still exists at actual pause",
  );
  const pausedTick = view().combatTick,
    flightUntil = p().kit.heavyFlakUntil;
  assert.equal(flightUntil, until);
  await a.lateAndNonHostChecks?.();
  input({
    technique1: true,
    technique2: true,
    fire: true,
    reload: true,
    moveX: 1,
    aim,
  });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(view().combatTick, pausedTick);
  assert.equal(p().kit.heavyFlakUntil, until);
  assert.equal(p().ammo, ammunition - 1);
  assert(!removed(shell.id));
  assert.equal(ownedShots().length, 1);
  a.checkOwnerStreams?.(shell.id);
  if (variant === "fuse") {
    await a.pause(false);
    const fresh = input({ aim });
    await heavyWait(
      () => p().ack >= fresh,
      "fresh idle after a frozen finite fuse",
    );
    await heavyWait(() => {
      collect();
      return removed(shell.id) && cues.size === 1 && view().combatTick >= until;
    }, "actual natural fuse expiry, owner removal and separate burst view");
    const cue = [...cues.values()][0];
    assert.equal(cue.at, until);
    assert.equal(cue.radius, r.baseRadius);
    assert.equal(cue.arc, Math.PI * 2);
    assert(cue.contacts.length <= r.projectileLimit);
    assert.equal(p().ammo, ammunition - 1);
    assert.equal(p().kit.technique1At, recovery);
    assert.equal(flakShots().length, 1);
    assert(
      !a.events.some(
        (e) => e.type === "sound" && e.id === "heavy-flak-command",
      ),
    );
    return {
      passed: true,
      variant,
      ordinaryStartingSP: 3,
      actualSkillPurchases: 2,
      remainingSP: 0,
      actualOneRoundAndRecovery: true,
      actualLiveFlightNaturalExpiry: true,
      actualOwnerRemoval: true,
      oneActualFiniteBurst: true,
      actualInterceptions: cue.contacts.length,
      pauseFreezesFlightAndRecovery: true,
      pauseDiscardsRequests: true,
      noCheckpointOrBudgetHealthPositionInjection: true,
    };
  }
  if (variant === "exit") {
    assert(a.end, "Peer host end operation must be supplied.");
    await a.end();
    await heavyWait(
      () => view().phase === "defeat" && removed(shell.id),
      "host end removes actual live flak and its owner event",
    );
    assert.equal(
      view().classCues.filter((c) => c.kind === "heavy-flak-burst").length,
      0,
    );
    assert.equal(flakShots().length, 1);
    a.checkOwnerStreams?.(shell.id);
    return {
      passed: true,
      variant,
      ordinaryStartingSP: 3,
      actualSkillPurchases: 2,
      remainingSP: 0,
      actualOneRoundAndRecovery: true,
      actualLiveFlightAtHostEnd: true,
      actualOwnerRemoval: true,
      pauseFreezesFlightAndRecovery: true,
      pauseDiscardsRequests: true,
      noCheckpointOrBudgetHealthPositionInjection: true,
    };
  }
  await a.pause(false);
  const resumed = input({ aim });
  await heavyWait(
    () => p().ack >= resumed && view().combatTick > born,
    "fresh idle after flight pause",
  );
  assert.equal(p().kit.technique1At, recovery);
  assert.equal(p().kit.heavyFlakUntil, until);
  assert.equal(ownedShots().length, 1);
  input({ technique2: true, aim });
  await heavyWait(() => {
    collect();
    return (
      removed(shell.id) &&
      cues.size === 1 &&
      (p().kit.heavyFlakUntil ?? 0) === 0
    );
  }, "actual manual command, separate removal and finite burst");
  const cue = [...cues.values()][0];
  assert(cue.at < until);
  assert.equal(
    cue.radius,
    variant === "compact" ? r.compactRadius : r.frontalReach,
  );
  assert.equal(cue.arc, variant === "compact" ? Math.PI * 2 : r.frontalArc);
  assert.equal(cue.aim, aim);
  assert(cue.contacts.length <= r.projectileLimit);
  assert.equal(p().ammo, ammunition - 1);
  assert.equal(p().kit.technique1At, recovery);
  assert(
    a.events.some((e) => e.type === "sound" && e.id === "heavy-flak-command"),
  );
  await a.checkSharedBurst?.(cue);
  a.checkOwnerStreams?.(shell.id);
  input({ technique2: true, aim });
  const again = sequence;
  await heavyWait(() => p().ack >= again, "empty repeated command rejected");
  assert.equal(flakShots().length, 1);
  assert.equal(p().ammo, ammunition - 1);
  assert.equal(p().kit.technique1At, recovery);
  return {
    passed: true,
    variant,
    ordinaryStartingSP: 12,
    actualSkillPurchases: 4,
    remainingSP: 4,
    actualCapturedPatternAndOriginalFuse: true,
    actualOneRoundAndRecovery: true,
    sameLaunchFrameCommandRejected: true,
    actualAcquiredManualCommand: true,
    oneActualFiniteBurst: true,
    actualInterceptions: cue.contacts.length,
    pauseFreezesFlightAndRecovery: true,
    pauseDiscardsRequests: true,
    noCheckpointOrBudgetHealthPositionInjection: true,
  };
}
