import type { RaidCue } from "../../src/shared/raid-director.ts";
import { serviceBeamContact } from "../../src/shared/service-director.ts";
import assert from "node:assert/strict";
import { runtimeArena } from "../../src/shared/arena-layouts.ts";
import {
  distance,
  segmentRect,
  segmentCircle,
} from "../../src/shared/geometry.ts";
import { HZ, type InputFrame } from "../../src/shared/protocol.ts";
import {
  sniperRestFlow,
  restWait,
  type RestAdapter,
} from "./sniper-rest-flow.ts";
import { withdrawalRaidInput } from "./sniper-withdrawal-raid-policy.ts";
type Point = { x: number; y: number };
export type WithdrawalAdapter = RestAdapter & {
  inspectWithdrawal?(canBuy: boolean): Promise<unknown>;
  checkPairPaused?(): Promise<void>;
};
/** Ordinary inputs/purchases through two actual clears; no Game/checkpoint injection. */
export async function sniperWithdrawalFlow(
  a: WithdrawalAdapter,
  handling: "carry" | "clear",
) {
  const v = () => {
      const value = a.view();
      assert(value);
      return value;
    },
    p = () => {
      const player = v().players.find((p) => p.id === a.id);
      assert(player);
      return player;
    };
  const extraPurchases: { kind: string; item: string }[] = [];
  const base = await sniperRestFlow(
    {
      ...a,
      checkPausedObservers: undefined,
      acquireRest: async () => {
        let result: unknown;
        if (a.acquireRest) result = await a.acquireRest();
        else {
          assert(
            (await a.request({ kind: "skill", item: "soldier-sniper-rest-1" }))
              .ok,
          );
          extraPurchases.push({ kind: "skill", item: "soldier-sniper-rest-1" });
        }
        if (a.inspectWithdrawal) await a.inspectWithdrawal(false);
        const rejected = await a.request({
          kind: "skill",
          item: "soldier-sniper-withdrawal-1",
        });
        assert(
          !rejected.ok && rejected.reason === "insufficientPoints",
          "20earned cannot bypass27earned gate in the actual safe shop",
        );
        for (const request of [
          { kind: "upgrade", item: "health" },
          { kind: "upgrade", item: "damage" },
          { kind: "supply", item: "medkit" },
        ] as const) {
          const bought = await a.request(request);
          if (bought.ok) extraPurchases.push({ ...request });
        }
        return result;
      },
    },
    handling,
  );
  assert.equal(v().encounter, 1);
  assert.equal(p().sp, 9);
  const secondBoss = v().boss.id,
    secondStartedAt = v().combatTick,
    combatEnd = Date.now() + 200000;
  while (v().phase === "combat") {
    assert(
      Date.now() < combatEnd,
      "second ordinary Raid boss within bounded wall time",
    );
    assert(p().status !== "dead", "actual second-boss survival");
    a.input(withdrawalRaidInput(v(), p(), a.observedShots()));
    a.companions?.();
    await new Promise((r) => setTimeout(r, 25));
  }
  a.input({ aim: 0 });
  a.stopCompanions?.();
  assert.equal(v().encounter, 2, "two actual boss clears");
  assert(p().progress.clears >= 2);
  assert.equal(p().sp, 16, "27earned minus11spent");
  const secondCombatTicks = v().combatTick - secondStartedAt;
  console.log(
    JSON.stringify({
      nativeWithdrawal: handling,
      actualSecondClear: true,
      boss: secondBoss,
      seconds: secondCombatTicks / HZ,
      earnedSP: 27,
    }),
  );
  let end = Date.now() + 90000;
  while (v().phase !== "shop") {
    assert(
      Date.now() < end && v().phase !== "defeat",
      "normal second votes/shop",
    );
    if (v().phase === "mutationVote" || v().phase === "contractVote") a.vote(0);
    await new Promise((r) => setTimeout(r, 25));
  }
  let guide: unknown;
  if (a.inspectWithdrawal) guide = await a.inspectWithdrawal(true);
  else
    assert(
      (await a.request({ kind: "skill", item: "soldier-sniper-withdrawal-1" }))
        .ok,
    );
  assert(p().skills.includes("soldier-sniper-withdrawal-1"));
  assert.equal(p().sp, 10, "six actual skill purchases spend17 of27");
  end = Date.now() + 90000;
  while (v().phase !== "combat") {
    assert(
      Date.now() < end && v().phase !== "defeat",
      "normal second shop/deployment clocks",
    );
    await new Promise((r) => setTimeout(r, 25));
  }
  await restWait(
    () => v().bossCues.some((c) => c.kind.startsWith("raid-")),
    "actual visible first raid warning before planning",
  );
  const announcedLanes = v().bossCues.filter(
    (c): c is Extract<RaidCue, { kind: "raid-lane" }> =>
      c.kind === "raid-lane" &&
      !c.disabled &&
      c.damage > 0 &&
      c.until > v().combatTick,
  );
  const arena = runtimeArena(v().arenaId, v().run.difficulty),
    inside = (q: Point) =>
      q.x > arena.bounds.x + 24 &&
      q.y > arena.bounds.y + 24 &&
      q.x < arena.bounds.x + arena.bounds.width - 24 &&
      q.y < arena.bounds.y + arena.bounds.height - 24,
    clear = (x: Point, y: Point) =>
      inside(y) &&
      !announcedLanes.some((lane) => serviceBeamContact(x, y, lane, 9)) &&
      !arena.obstacles.some((w) => segmentRect(x, y, w, 12) !== null) &&
      !arena.lavaPits.some(
        (l) => segmentCircle(x, y, l, l.radius + 18) !== null,
      ),
    candidates: { a: Point; b: Point; score: number }[] = [];
  for (let radius = 0; radius <= 400; radius += 40)
    for (let n = 0; n < 16; n++) {
      const first = {
        x: p().x + Math.cos((n * Math.PI) / 8) * radius,
        y: p().y + Math.sin((n * Math.PI) / 8) * radius,
      };
      if (!clear(p(), first)) continue;
      for (let m = 0; m < 16; m++) {
        const second = {
          x: first.x + Math.cos((m * Math.PI) / 8) * 112,
          y: first.y + Math.sin((m * Math.PI) / 8) * 112,
        };
        if (
          !clear(first, second) ||
          distance(first, v().boss) < 200 ||
          distance(second, v().boss) < 200
        )
          continue;
        const protectedCount = [first, second].filter((q) =>
          arena.obstacles.some((w) => segmentRect(q, v().boss, w, 3) !== null),
        ).length;
        candidates.push({
          a: first,
          b: second,
          score:
            radius * 0.1 -
            protectedCount * 100 +
            Math.abs(distance(first, v().boss) - 420) * 0.05,
        });
      }
    }
  candidates.sort((a, b) => a.score - b.score);
  assert(
    candidates.length,
    "actual reachable separated positions in current runtime arena",
  );
  const route = candidates[0];
  console.log(
    JSON.stringify({
      withdrawalPlan: true,
      boss: v().boss.id,
      tick: v().combatTick,
      route,
      announcedLanes: announcedLanes.map((c) => ({ ...c })),
      actualBody: { x: p().x, y: p().y, health: p().health },
    }),
  );
  const walk = async (target: Point, aim: number) => {
    const end = Date.now() + 5500;
    do {
      while (distance(p(), target) > 1) {
        assert(
          Date.now() < end && v().phase === "combat",
          "actual paired-position walk",
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
        "actual paired-position planted stop",
      );
      assert(
        Date.now() < end && v().phase === "combat",
        "actual post-stop arrival remains inside existing walk bound",
      );
    } while (distance(p(), target) > 1.5);
  };
  const sites = () =>
    v()
      .classCues.filter((c) => c.kind === "soldier-rest")
      .filter((c) => c.owner === a.id);
  const aimA = Math.atan2(v().boss.y - route.a.y, v().boss.x - route.a.x),
    aimB = Math.atan2(v().boss.y - route.b.y, v().boss.x - route.b.x);
  await walk(route.a, aimA);
  const ammo = p().ammo,
    recovery = p().kit.sniperRecoveryAt ?? 0,
    shotAt = p().kit.sniperShotAt;
  // Wait only for original spent C recovery from the previous encounter if a future phase ever retains it.
  await restWait(
    () => v().combatTick >= (p().kit.sniperRecoveryAt ?? 0),
    "ordinary available first C",
  );
  a.input({ technique2: true, aim: aimA });
  await restWait(() => sites().length === 1, "first actual empty position");
  let first = { ...sites()[0] };
  await restWait(
    () => v().combatTick >= first.readyAt && p().kit.sniperRestReady === true,
    "first full empty settling",
  );
  await walk(route.b, aimB);
  assert(p().kit.sniperRestCanSecond);
  a.input({ technique2: true, aim: aimB });
  await restWait(() => sites().length === 2, "second actual empty position");
  const second = { ...sites().find((c) => c.id !== first.id)! };
  await restWait(
    () =>
      sites().length === 2 &&
      sites().every((c) => c.readyAt <= v().combatTick) &&
      p().kit.sniperRestCount === 2,
    "second full empty settling",
  );
  assert(distance(first, second) >= 96);
  assert.equal(p().ammo, ammo);
  assert.equal(p().kit.sniperRecoveryAt, recovery);
  assert.equal(p().kit.sniperShotAt, shotAt);
  assert.equal(first.until - first.at, 9 * HZ);
  assert.equal(second.until - second.at, 9 * HZ);
  a.pause(true);
  await restWait(() => a.paused(), "paired-position authoritative pause");
  const pausedTick = v().combatTick;
  a.input({
    fire: true,
    reload: true,
    technique1: true,
    technique2: true,
    moveX: 1,
    aim: aimB + 0.5,
  });
  await a.checkPairPaused?.();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(v().combatTick, pausedTick);
  assert.equal(p().ammo, ammo);
  assert.equal(sites().length, 2);
  a.pause(false);
  a.input({ aim: aimB });
  await restWait(() => !a.paused(), "paired-position resume");
  await walk(first, aimA);
  assert(
    distance(p(), first) <= 1.5,
    "actual position is still at the first site after stopping",
  );
  assert(
    sites().some(
      (c) =>
        c.id === first.id &&
        c.readyAt <= v().combatTick &&
        c.until > v().combatTick,
    ),
    "the actual original settled first site remains",
  );
  const before = a.emittedShots().length;
  a.input({ technique1: true, technique2: true, aim: aimA });
  await restWait(
    () => p().kit.sniperPrepared === true,
    "first actual paid paired claim",
  );
  const paidAt = p().kit.sniperReadyAt!,
    firstRecovery = p().kit.sniperRecoveryAt!,
    firstUntil = p().kit.sniperUntil!;
  console.log(
    JSON.stringify({
      withdrawalFirstClaim: true,
      thirdBoss: v().boss.id,
      tick: v().combatTick,
      paidAt,
      firstUntil,
      firstRecovery,
      first,
      second,
      actualSites: sites(),
      body: {
        x: p().x,
        y: p().y,
        aim: p().aim,
        health: p().health,
        ack: p().ack,
      },
      kit: p().kit,
    }),
  );
  assert(paidAt <= v().combatTick);
  assert.equal(p().ammo, ammo - 1);
  assert.equal(p().kit.sniperWithdrawalUntil, 0);
  assert.equal(sites().length, 1);
  assert.equal(a.emittedShots().length, before, "C/B claim cannot emit");
  a.input({ technique1: true, aim: aimA });
  await restWait(
    () =>
      p().kit.sniperPrepared === false &&
      p().kit.sniperWithdrawalUntil === second.until &&
      a.emittedShots().length > before,
    "actual first manual shot plus separate owner event batch earns return",
  );
  const firstShot = a
    .emittedShots()
    .slice(before)
    .find((s) => s.owner === a.id)!;
  assert(firstShot);
  assert.equal(p().ammo, ammo - 1);
  assert.equal(sites()[0].id, second.id);
  assert.equal(sites()[0].until, second.until);
  await walk(second, aimB);
  assert(p().kit.sniperWithdrawalReady);
  assert(
    v().combatTick < firstRecovery,
    "physical return during existing C recovery",
  );
  a.input({ technique1: true, technique2: true, aim: aimB });
  await restWait(
    () => p().kit.sniperPrepared === true,
    "one actual paid return during recovery",
  );
  const returnAt = p().kit.sniperReadyAt!,
    returnUntil = p().kit.sniperUntil!,
    extended = p().kit.sniperRecoveryAt!;
  assert.equal(extended, firstRecovery + (firstRecovery - paidAt));
  assert.equal(returnUntil - returnAt, 3 * HZ);
  assert.equal(p().ammo, ammo - 2);
  assert.equal(sites().length, 0);
  assert.equal(p().kit.sniperWithdrawalUntil, 0);
  assert.equal(
    a.emittedShots().length,
    before + 1,
    "return C/B claim cannot emit",
  );
  if (handling === "clear") {
    a.input({ reload: true, technique2: true, aim: aimB });
    await restWait(
      () => p().kit.sniperPrepared === false && p().ammo === ammo - 1,
      "actual return Clear refunds only its reserved round",
    );
    assert.equal(p().reloadAt, 0);
    assert.equal(p().kit.sniperRecoveryAt, extended);
    assert.equal(p().kit.sniperWithdrawalUntil, 0);
    assert.equal(sites().length, 0);
    assert.equal(a.emittedShots().length, before + 1);
  } else {
    a.input({ technique2: true, aim: aimB });
    await restWait(
      () =>
        p().kit.sniperPrepared === false &&
        a.emittedShots().length > before + 1,
      "actual second manual Bore release and separate owner event",
    );
    const secondShot = a
      .emittedShots()
      .slice(before + 1)
      .find((s) => s.owner === a.id)!;
    assert(secondShot);
    assert.notEqual(firstShot.id, secondShot.id);
    assert.equal(p().ammo, ammo - 2);
    await restWait(
      () => a.removed(firstShot.id) && a.removed(secondShot.id),
      "both actual physical shots removed",
    );
  }
  const after = p().ammo;
  const deniedSequence = a.input({ technique1: true, aim: aimB });
  await restWait(
    () => p().ack >= deniedSequence,
    "actual denied repeated C acknowledgement",
  );
  const sequence = a.input({ aim: aimB });
  await restWait(() => p().ack >= sequence, "no repeated old pair");
  assert(!p().kit.sniperPrepared);
  assert.equal(p().ammo, after);
  assert.equal(p().kit.sniperRecoveryAt, extended);
  return {
    ...base,
    acceptedPurchases: [
      ...base.acceptedPurchases,
      ...extraPurchases,
      { kind: "skill", item: "soldier-sniper-withdrawal-1" },
    ],
    guide,
    secondBoss,
    secondCombatTicks,
    actualSecondBossClear: true,
    earnedAfterTwoActualClears: 27,
    actualRequiredSkillPurchases: 6,
    spentSkillSP: 17,
    remainingSP: 10,
    normalVotesShopDeploymentClocks: true,
    actualTwoIndependentlySettledPositions: true,
    originalSeparateFiniteDeadlines: true,
    actualWalkingBetweenBothPositions: true,
    actualFirstManualReleaseEarnsReturn: true,
    actualPaidReturnDuringRecovery: true,
    extendedRecoveryByOneOrdinaryDuration: true,
    bothClaimTicksCannotEmit: true,
    pairPauseDiscardsRequestsAndFreezesClocks: true,
    actualSecondManualShot: handling === "carry",
    actualReturnRoundCleared: handling === "clear",
    clearKeepsExtendedDebt: handling === "clear",
    noRecursivePairOrReturnedSite: true,
    ordinaryEarnedCoinEquipmentAndHealing: true,
    visibleRaidLaneAndValvePolicy: true,
    noCheckpointOrBudgetHealthPositionInjection: true,
    firstPaidUntil: firstUntil,
    originalReturnUntil: second.until,
  };
}
