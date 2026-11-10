import { heavyPostOperation } from './heavy-post-flow.ts';
import assert from "node:assert/strict";
import { data } from "../../src/shared/game.ts";
import { HZ } from "../../src/shared/protocol.ts";
import {
  traverseIds as ids,
  lanyardId,
  clutchId,
  keyedId,
  openId,
} from "../../src/shared/heavy-traverse.ts";
import { restWait } from "./sniper-rest-flow.ts";
import { restRaidInput } from "./sniper-rest-raid-policy.ts";
import { bossDefeatRemaining } from "../../src/shared/boss-defeat-flow.ts";
import {

  type ClutchCarriage,
  type ClutchHandling,
} from "./heavy-clutch-handling-flow.ts";

/** Raid12→20 source transport checks and Short3→9→15→21 exact-served reviews use the same real-authority operation. */
async function runEarnedPostFlow(
  a: any,
  mode: ClutchCarriage,
  handling: ClutchHandling | undefined,
  acquisition: "short" | "raid",
) {
  const v = () => {
    const v = a.view();
    assert(v);
    return v;
  };
  const p = () => {
    const p = v().players.find((p: any) => p.id === a.id);
    assert(p);
    return p;
  };
  const all = [
    ...data.skills,
    ...data.generalSkills,
    ...data.specializationSkills,
  ];
  const spent = () =>
      p().skills.reduce(
        (n: number, id: string) => n + all.find((s) => s.id === id)!.cost,
        0,
      ),
    earned = () => p().sp + spent();
  const accepted: any[] = [],
    clocks: any[] = [],
    clears: any[] = [],
    seen = new Set<string>();
  const clock = () => {
    const key = v().encounter + ":" + v().phase;
    if (seen.has(key)) return;
    seen.add(key);
    const maximum =
      v().phase === "shop"
        ? 25
        : v().phase === "loading"
          ? 5
          : ["mutationVote", "contractVote"].includes(v().phase)
            ? 15
            : 0;
    if (maximum) {
      const remaining =
        v().phaseEnds - v().tick - bossDefeatRemaining(v().boss, v().tick);
      assert(remaining <= maximum * HZ);
      clocks.push({
        phase: v().phase,
        encounter: v().encounter,
        remainingTicks: remaining,
        maximumOriginalTicks: maximum * HZ,
      });
    }
  };
  const request = async (kind: string, item: string) => {
    const r = await a.request({ kind, item });
    if (r.ok) accepted.push({ kind, item });
    return r;
  };
  const buy = async (item: string) => {
    const execute = async () => assert((await request("skill", item)).ok);
    await a.acquire(item, true, execute);
  };
  const inspect = async (item: string, canBuy: boolean) =>
    a.acquire(
      item,
      canBuy,
      async () => assert.fail("Inspection never submits a purchase"),
      false,
    );
  const equip = async () => {
    for (const w of data.weapons
      .filter((w) => w.classId === "heavy")
      .toSorted((x, y) => y.tier - x.tier)) {
      if (p().weapon === w.id) break;
      if ((await request("weapon", w.id)).ok) break;
    }
    for (const item of ["damage", "health", "fire-rate", "reload", "magazine"])
      await request("upgrade", item);
    await request("supply", "medkit");
  };
  const initial = acquisition === "short" ? 3 : 12,
    clearCount = acquisition === "short" ? 3 : 1;
  await restWait(() => !!a.view(), "actual Heavy handling lobby");
  assert.equal(p().sp, initial);
  assert.equal(p().skills.length, 0);
  await buy("heavy-ordnance-1");
  await buy(ids.entry);
  if (acquisition === "raid") {
    if (mode !== "loose") await buy(ids[mode]);
    await buy(clutchId);
  }
  if (handling) await inspect(handling, false);
  await equip();
  a.start();
  for (let clear = 1; clear <= clearCount; clear++) {
    await restWait(
      () => v().phase === "combat",
      "actual earned handling combat " + clear,
    );
    const born = v().combatTick,
      boss = v().boss.id,
      end = Date.now() + 200000;
    while (v().phase === "combat") {
      assert(Date.now() < end, "existing ordinary per-clear policy bound");
      a.input(restRaidInput(v(), p(), a.observedShots()));
      a.companions?.();
      await new Promise((r) => setTimeout(r, 25));
    }
    a.input({ aim: 0 });
    a.stopCompanions?.();
    assert.notEqual(v().phase, "defeat");
    assert.equal(v().encounter, clear);
    assert(p().progress.clears >= clear);
    assert.equal(earned(), initial + clear * (acquisition === "raid" ? 8 : 6));
    clears.push({
      boss,
      combatTicks: v().combatTick - born,
      actualEarnedSP: earned(),
    });
    console.log(
      JSON.stringify({
        mode,
        handling,
        acquisition,
        actualClear: clears.at(-1),
      }),
    );
    const shopEnd = Date.now() + 90000;
    while (v().phase !== "shop") {
      assert(
        Date.now() < shopEnd && v().phase !== "defeat",
        "original vote clocks reach actual shop",
      );
      clock();
      if (["mutationVote", "contractVote"].includes(v().phase)) a.vote(0);
      await new Promise((r) => setTimeout(r, 25));
    }
    clock();
    if (acquisition === "short" && clear === 1) {
      if (mode !== "loose") await buy(ids[mode]); else await inspect(ids.spade, true);
      await inspect(clutchId, false);if (handling) await inspect(handling, false);await inspect(lanyardId, false);
    } else if (acquisition === "short" && clear === 2) {
      await buy(clutchId);if (handling) { await buy(handling);await inspect(handling === keyedId ? openId : keyedId, false); }
      await inspect(lanyardId, false);
    } else {
      if (acquisition === "raid" && handling) { await buy(handling);await inspect(handling === keyedId ? openId : keyedId, false); }
      await buy(lanyardId);
      assert.equal(spent(), 10 + (mode === "loose" ? 0 : 2) + (handling ? 3 : 0));
    }
    await equip();
    const nextEnd = Date.now() + 90000;
    while (v().phase !== "combat") {
      assert(
        Date.now() < nextEnd && v().phase !== "defeat",
        "original shop and deployment clocks",
      );
      clock();
      await new Promise((r) => setTimeout(r, 25));
    }
  }
  assert.equal(earned(), acquisition === "short" ? 21 : 20);
  assert.equal(v().encounter, clearCount);
  assert(!v().run.testingModified && !v().run.customized);
  await restWait(
    () => p().status === "active" && !p().kit.heavyTraverseBlocked,
    "actual acquired handling owner ready",
  );
  const sequence = a.input({ aim: 0 });
  await restWait(
    () => p().ack >= sequence,
    "last policy sequence before the separate operation",
  );
  const operation = await heavyPostOperation(
    {
      owner: a.id,
      view: a.view,
      events: a.events(),
      bursts: new Map(),
      input: a.input,
      purchase: async () => assert.fail("Operation cannot purchase"),
      start: async () => assert.fail("Operation cannot restart"),
      pause: async (value) => {
        a.pause(value);
        await restWait(
          () => !!a.paused() === value,
          "actual pause acknowledgment and authoritative view",
        );
      },
      ...(a.end ? { end: a.end } : {}),
      lateAndNonHostChecks: a.checkPausedObservers,
      checkOwnerStreams: a.checkOwnerStreams,
    },
    mode,
    handling,
  );
  return {
    ...operation,
    modeOfAcquisition: acquisition,
    difficulty: "baby",
    actualStartingSP: initial,
    actualEarnedSequence: acquisition === "short" ? [3, 9, 15, 21] : [12, 20],
    actualBossClears: clearCount,
    actualPostPurchaseAt: earned(),
    sourceMenuPurchases: accepted.filter((r) => r.kind === "skill").length,
    spentSkillSP: spent(),
    remainingSP: p().sp,
    clears,
    observedClocks: clocks,
    noCheckpointOrBudgetHealthPositionHazardInjection: true,
    limits: [
      "Actual earned purchases, original vote/shop/deployment/death-hold clocks. Source MenuDOM has explicit asset/i18n stubs and actual authoritative purchase views.",
      "Raid12→20 source transport cases are separate from fresh exact-served Short3→9→15→21 reviews. No timeout extension, injected budget or online promotion of a local import is used.",
      "Actual operation admissions need not measure positive C damage. Controlled Game values, natural/replay outcomes and human/rendered/device/native-language/listening/motion/final balance remain separate.",
    ],
  };
}

export async function earnedPostFlow(a: any, mode: ClutchCarriage, handling: ClutchHandling | undefined, acquisition: "short" | "raid") {
  try { return await runEarnedPostFlow(a, mode, handling, acquisition); }
  catch (error) {
    const v = a.view(), p = v?.players.find((p: any) => p.id === a.id);
    console.error(JSON.stringify({ actualTerminalContext: { mode, handling: handling ?? "omitted", acquisition, phase: v?.phase, tick: v?.tick, combatTick: v?.combatTick, encounter: v?.encounter, matchPaused: v?.matchPaused, boss: v && { id: v.boss.id, x: v.boss.x, y: v.boss.y, health: v.boss.health }, owner: p && { id: p.id, ack: p.ack, status: p.status, x: p.x, y: p.y, health: p.health, ammo: p.ammo, skills: p.skills, upgrades: p.upgrades, kit: p.kit }, mutations: v?.mutations }, noTimeoutOrPolicyChange: true }));
    throw error;
  }
}
