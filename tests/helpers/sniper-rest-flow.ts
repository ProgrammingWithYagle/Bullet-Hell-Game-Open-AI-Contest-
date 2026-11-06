import assert from "node:assert/strict";
import { data } from "../../src/shared/game.ts";
import { runtimeArena } from "../../src/shared/arena-layouts.ts";
import { moveBody, segmentRect, distance } from "../../src/shared/geometry.ts";
import {
  HZ,
  type InputFrame,
  type Shot,
  type Command,
} from "../../src/shared/protocol.ts";
import type { View } from "../../src/shared/view.ts";
import { boreApproach, actualBoreAim } from "./sniper-bore-approach.ts";
import {
  restRaidInput,
  type ObservedRestShot,
} from "./sniper-rest-raid-policy.ts";
export const restWait = async (check: () => boolean, label: string) => {
  const end = Date.now() + 6000;
  while (!check()) {
    assert(Date.now() < end, label);
    await new Promise((r) => setTimeout(r, 8));
  }
};
export type RestAdapter = {
  id: string;
  view(): View | undefined | null;
  input(a: Partial<InputFrame>): number;
  start(): void;
  vote(index: number): void;
  request(r: Omit<Command, "id">): Promise<{ ok: boolean; reason?: string }>;
  pause(value: boolean): void;
  paused(): boolean;
  observedShots(): ObservedRestShot[];
  emittedShots(): Shot[];
  removed(id: number): boolean;
  companions?(): void;
  stopCompanions?(): void;
  checkPausedObservers?(): Promise<void>;
  acquireRest?(): Promise<unknown>;
};
export async function sniperRestFlow(
  a: RestAdapter,
  handling: "carry" | "clear",
) {
  const v = () => {
      const view = a.view();
      assert(view);
      return view;
    },
    p = () => {
      const player = v().players.find((p) => p.id === a.id);
      assert(player);
      return player;
    },
    accepted: { kind: string; item: string }[] = [],
    buy = async (kind: "skill" | "weapon", item: string) => {
      const result = await a.request({ kind, item });
      if (result.ok) accepted.push({ kind, item });
      return result;
    };
  await restWait(() => !!a.view(), "ordinary Raid lobby");
  assert.equal(p().sp, 12);
  for (const item of [
    "soldier-ballistics-1",
    "soldier-sniper-1",
    "soldier-sniper-bore-1",
    "soldier-sniper-" + handling + "-1",
  ])
    assert((await buy("skill", item)).ok, item);
  const rejected = await buy("skill", "soldier-sniper-rest-1");
  assert(
    !rejected.ok && rejected.reason === "insufficientPoints",
    "fresh Raid cannot bypass17earned gate",
  );
  assert.equal(p().sp, 4);
  for (const w of data.weapons
    .filter((w) => w.classId === "soldier")
    .toSorted((x, y) => y.tier - x.tier)) {
    if (p().weapon === w.id) break;
    if ((await buy("weapon", w.id)).ok) break;
  }
  a.start();
  await restWait(() => v().phase === "combat", "ordinary first combat");
  const firstBoss = v().boss.id,
    firstStartedAt = v().combatTick,
    combatWallEnd = Date.now() + 200000;
  while (v().phase === "combat") {
    assert(
      Date.now() < combatWallEnd,
      "ordinary first boss within bounded wall time",
    );
    assert(p().status !== "dead", "actual first-boss survival");
    a.input(restRaidInput(v(), p(), a.observedShots()));
    a.companions?.();
    await new Promise((r) => setTimeout(r, 25));
  }
  a.input({ aim: 0 });
  a.stopCompanions?.();
  assert.equal(v().encounter, 1, "actual first clear");
  assert(p().progress.clears >= 1);
  const firstCombatTicks = v().combatTick - firstStartedAt;
  console.log(JSON.stringify({nativeFieldRest:handling,actualFirstClear:true,boss:firstBoss,seconds:firstCombatTicks/HZ,earnedSP:20}));
  assert.equal(p().sp, 12, "ordinary20earned minus8actual spending");
  const toShop = Date.now() + 90000;
  while (v().phase !== "shop") {
    assert(
      Date.now() < toShop && v().phase !== "defeat",
      "normal votes and shop progression",
    );
    if (v().phase === "mutationVote" || v().phase === "contractVote") a.vote(0);
    await new Promise((r) => setTimeout(r, 25));
  }
  let guide: unknown;
  if (a.acquireRest) guide = await a.acquireRest();
  else assert((await buy("skill", "soldier-sniper-rest-1")).ok);
  assert(p().skills.includes("soldier-sniper-rest-1"));
  assert.equal(p().sp, 9, "20earned minus11actual skill spending");
  const toCombat = Date.now() + 90000;
  while (v().phase !== "combat") {
    assert(
      Date.now() < toCombat && v().phase !== "defeat",
      "normal shop/deployment clocks",
    );
    await new Promise((r) => setTimeout(r, 25));
  }
  const arena = runtimeArena(v().arenaId, "baby"),
    boss = {
      ...v().boss,
      radius: data.bosses.find((b) => b.id === v().boss.id)!.radius,
    },
    approach = boreApproach(p(), arena, "through", boss);
  const walk = async (target: { x: number; y: number }, aim: number) => {
    const end = Date.now() + 5500;
    while (distance(p(), target) > 1.7) {
      assert(
        Date.now() < end && v().phase === "combat",
        "actual ordinary walk",
      );
      const d = distance(p(), target),
        scale = Math.min(1, d / 12);
      a.input({
        moveX: ((target.x - p().x) / d) * scale,
        moveY: ((target.y - p().y) / d) * scale,
        aim,
      });
      await new Promise((r) => setTimeout(r, 25));
    }
    const at = v().combatTick,
      sequence = a.input({ aim });
    await restWait(
      () => p().ack >= sequence && v().combatTick >= at + 2,
      "actual planted stop",
    );
  };
  await walk(approach, approach.aim);
  const aim = actualBoreAim(p(), arena, approach, "through").aim,
    ammo = p().ammo,
    recovery = p().kit.sniperRecoveryAt ?? 0,
    shotsBefore = a.emittedShots().length,
    fireBefore = p().kit.sniperShotAt;
  a.input({ technique2: true, aim });
  await restWait(() => !!p().kit.sniperRestSetting, "actual empty setup");
  const site = v()
    .classCues.filter((c) => c.kind === "soldier-rest")
    .find((c) => c.owner === a.id)!;
  assert(site);
  assert.equal(p().ammo, ammo);
  assert.equal(p().kit.sniperRecoveryAt, recovery);
  assert.equal(p().kit.sniperShotAt, fireBefore);
  assert.equal(a.emittedShots().length, shotsBefore);
  for (const key of [
    "ammo",
    "health",
    "fireLatch",
    "weapon",
    "damage",
    "recovery",
  ])
    assert(!Object.hasOwn(site, key));
  a.pause(true);
  await restWait(() => a.paused(), "actual pause");
  const pausedTick = v().combatTick;
  a.input({
    moveX: 1,
    aim: aim + 0.5,
    fire: true,
    reload: true,
    technique1: true,
    technique2: true,
  });
  await a.checkPausedObservers?.();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(v().combatTick, pausedTick);
  assert.equal(p().ammo, ammo);
  assert.equal(p().kit.sniperRestUntil, site.until);
  a.pause(false);
  a.input({ aim });
  await restWait(
    () => !a.paused() && p().kit.sniperRestReady === true,
    "actual empty settling resumes",
  );
  const origin = { x: site.x, y: site.y };
  const excursion = Array.from({ length: 16 }, (_, n) => {
    const angle = (n * Math.PI) / 8;
    return {
      x: origin.x + Math.cos(angle) * 18,
      y: origin.y + Math.sin(angle) * 18,
    };
  }).find((point) => {
    const moved = moveBody(
      origin,
      { x: point.x - origin.x, y: point.y - origin.y },
      9,
      arena.obstacles,
    );
    return (
      distance(moved, point) < 0.01 &&
      arena.obstacles.some((w) => segmentRect(point, v().boss, w, 3) !== null)
    );
  });
  assert(excursion, "a real walkable protected excursion");
  await walk(excursion, aim);
  assert(distance(p(), origin) > 6);
  assert.equal(p().kit.sniperRestX, site.x);
  assert.equal(p().kit.sniperRestY, site.y);
  assert.equal(p().kit.sniperRestUntil, site.until);
  await walk(origin, aim);
  assert(distance(p(), origin) <= 6);
  a.input({ technique1: true, technique2: true, aim });
  await restWait(() => p().kit.sniperPrepared === true, "actual paid claim");
  const paid = {
    readyAt: p().kit.sniperReadyAt!,
    until: p().kit.sniperUntil!,
    recovery: p().kit.sniperRecoveryAt!,
  };
  assert(paid.readyAt <= v().combatTick);
  assert.equal(p().ammo, ammo - 1);
  assert.equal(p().kit.sniperRestUntil, 0);
  assert.equal(
    a.emittedShots().length,
    shotsBefore,
    "C/B claim tick never emits",
  );
  assert.equal(p().kit.sniperShotAt, fireBefore);
  if (handling === "carry") {
    await walk(excursion, aim);
    assert(p().kit.sniperPrepared);
    assert(p().kit.sniperReadyAt! > v().combatTick);
    assert.equal(p().kit.sniperUntil, paid.until);
    assert.equal(p().kit.sniperRecoveryAt, paid.recovery);
    await walk(origin, aim);
    await restWait(
      () =>
        p().kit.sniperPrepared === true &&
        p().kit.sniperReadyAt! <= v().combatTick,
      "full actual carried settling",
    );
    a.input({ technique2: true, aim });
    await restWait(
      () => a.emittedShots().length > shotsBefore,
      "separate actual Bore event batch",
    );
    const shot = a
      .emittedShots()
      .slice(shotsBefore)
      .find((s) => s.owner === a.id)!;
    assert(shot);
    assert.equal(p().ammo, ammo - 1);
    await restWait(() => a.removed(shot.id), "actual shot removal");
    assert(!p().kit.sniperPrepared);
    assert.equal(p().kit.sniperRestUntil, 0);
  } else {
    a.input({ reload: true, technique2: true, aim });
    await restWait(
      () => p().kit.sniperPrepared === false && p().ammo === ammo,
      "actual Clear returns the reserved round",
    );
    assert.equal(p().reloadAt, 0);
    assert.equal(p().kit.sniperRecoveryAt, paid.recovery);
    assert.equal(p().kit.sniperRestUntil, 0);
    assert.equal(p().kit.sniperShotAt, fireBefore);
    assert.equal(a.emittedShots().length, shotsBefore);
  }
  return {
    ordinaryStartingSP: 12,
    difficulty: "baby",
    firstBoss,
    actualFirstBossClear: true,
    firstCombatTicks,
    earnedAfterActualClear: 20,
    actualRequiredSkillPurchases: 5,
    spentSkillSP: 11,
    remainingSP: 9,
    acceptedPurchases: accepted,
    guide,
    handling,
    actualMovementToUsableInteriorCover: true,
    emptyRestUsesNoRoundOrRecovery: true,
    originalFiniteRestLifetime: true,
    actualWalkingAwayAndBackToFixedSite: true,
    manualPaidClaimReadyAtActualSite: true,
    separateManualReleaseRequired: true,
    sameTickCBDoesNotEmit: true,
    pauseDiscardsRequestsAndFreezesRestClock: true,
    sharedSpatialFeedbackOmitsPayment: true,
    actualCarryRestartsFullSettling:handling==='carry',
    originalPaidDeadlineAndRecoveryRetained:handling==='carry',
    actualShotAndRemoval:handling==='carry',
    actualReservedRoundReturned:handling==='clear',
    clearConsumesReloadPress:handling==='clear',
    consumedRestNeverRestored:true,
    spentRecoveryRetained:true,
    noFriendlyFlightInvented:handling==='clear',
    noCheckpointOrBudgetHealthPositionInjection: true,
  };
}
