import assert from "node:assert/strict";
import {
  HZ,
  idleInput,
  validInput,
  type InputFrame,
} from "../../src/shared/protocol.ts";
import {
  clutchId,
  keyedId,
  openId,
  heavyTraverseRules as r,
} from "../../src/shared/heavy-traverse.ts";
import {
  heavyOpenLane,
  heavyWait,
  type HeavyFlakAdapter,
} from "./heavy-flak-flow.ts";
export type ClutchCarriage = "loose" | "spade" | "floating";
export type ClutchHandling = typeof keyedId | typeof openId;
const bearingDelta = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** Actual owned operation only. Acquisition and current unmodified worker/room are supplied by the caller. */
export async function heavyClutchHandlingOperation(
  a: HeavyFlakAdapter,
  mode: ClutchCarriage,
  handling: ClutchHandling,
) {
  const view = () => {
    const v = a.view();
    assert(v);
    return v;
  };
  const p = () => {
    const p = view().players.find((p) => p.id === a.owner);
    assert(p);
    return p;
  };
  assert(p().skills.includes(clutchId) && p().skills.includes(handling));
  const previous = new Set(
    a.events.flatMap((e) =>
      e.type === "shots" ? e.shots.map((s) => s.id) : [],
    ),
  );
  let eventStart = a.events.length;
  const shots = () => [
    ...new Map(
      a.events
        .slice(eventStart)
        .flatMap((e) => (e.type === "shots" ? e.shots : []))
        .filter((s) => s.owner === a.owner && !previous.has(s.id))
        .map((s) => [s.id, s]),
    ).values(),
  ];
  const C = () =>
    shots().filter((s) => Math.abs(Math.hypot(s.vx, s.vy) - r.speed) < 1e-6);
  const primary = () => shots().filter((s) => !C().some((c) => c.id === s.id));
  const removed = (id: number) =>
    a.events.some((e) => e.type === "remove" && e.ids.includes(id));
  const sounds = (id: string) =>
    a.events
      .slice(eventStart)
      .filter((e) => e.type === "sound" && e.owner === a.owner && e.id === id);
  let sequence = p().ack;
  const input = (action: Partial<InputFrame> = {}) => {
    const frame = { ...idleInput(), sequence: ++sequence, aim: 0, ...action };
    frame.aim = Math.atan2(Math.sin(frame.aim), Math.cos(frame.aim));
    assert(validInput(frame));
    a.input(frame);
    return sequence;
  };
  await a.pause(true);
  const initialTick = view().combatTick,
    ammo = p().ammo;
  input({
    technique1: true,
    technique2: true,
    fire: true,
    reload: true,
    dodge: true,
    ultimate: true,
  });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(view().combatTick, initialTick);
  assert.equal(p().ammo, ammo);
  assert.equal(p().kit.heavyTraverseUntil, 0);
  // Retain delayed policy messages; bind this operation after the actual paused boundary settles.
  for (const e of a.events)
    if (e.type === "shots") for (const s of e.shots) previous.add(s.id);
  eventStart = a.events.length;
  assert.equal(shots().length, 0);
  await a.pause(false);
  const idle = input();
  await heavyWait(
    () => p().ack >= idle,
    "fresh idle after discarded paused handling requests",
  );
  assert.equal(p().ammo, ammo);
  assert.equal(shots().length, 0);
  const aim = heavyOpenLane(view(), a.owner).aim;
  input({ technique1: true, technique2: true, aim });
  await heavyWait(
    () => C().length === 1 && (p().kit.heavyTraverseUntil ?? 0) > 0,
    "first actual C event plus separate authoritative handling view",
  );
  const born = p().kit.heavyTraverseBornAt!,
    until = p().kit.heavyTraverseUntil!,
    recovery = p().kit.technique1At!;
  assert.equal(p().ammo, ammo - 1);
  assert(!p().kit.heavyClutchUsed);
  await a.pause(true);
  const firstPaused = view().combatTick;
  assert(firstPaused < born + 10);
  await a.lateAndNonHostChecks?.();
  const origin = { x: p().x, y: p().y },
    moveX = Math.cos(aim),
    moveY = Math.sin(aim);
  input({
    technique1: true,
    technique2: true,
    fire: true,
    reload: true,
    dodge: true,
    ultimate: true,
  });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(view().combatTick, firstPaused);
  assert.equal(p().ammo, ammo - 1);
  assert.equal(p().kit.heavyTraverseUntil, until);
  assert(!p().kit.heavyClutchUsed);
  await a.pause(false);
  input({
    technique2: true,
    aim: handling === keyedId ? aim + 0.12 : aim,
    moveX,
    moveY,
  });
  await heavyWait(
    () =>
      !!p().kit.heavyClutchLifted && sounds("heavy-clutch-lift").length === 1,
    "actual handling lift plus its separate sound event",
  );
  assert.equal(p().kit.heavyClutchHandling, handling);
  assert((p().kit.heavyClutchAt ?? Infinity) < born + 10);
  let converted = 0;
  if (handling === keyedId) {
    await heavyWait(
      () =>
        (p().kit.heavyClutchForfeited ?? 0) >= 1 &&
        (p().kit.heavyTraverseUntil ?? 0) > 0,
      "one original Keyed opportunity really passes unpaid during calibration",
    );
  } else {
    input({ aim, moveX, moveY, fire: true });
    await heavyWait(
      () => primary().length > 0,
      "actual admitted ordinary primary event while lifted",
    );
    input({ aim, moveX, moveY });
  }
  await a.pause(true);
  const liftedPaused = view().combatTick,
    moved = { x: p().x, y: p().y };
  assert(Math.hypot(moved.x - origin.x, moved.y - origin.y) > 5);
  let forfeited: number;
  if ((p().kit.heavyTraverseUntil ?? 0) > 0) {
    converted = p().kit.heavyClutchConverted ?? 0;
    forfeited = p().kit.heavyClutchForfeited ?? 0;
    assert(p().kit.heavyClutchLifted && liftedPaused < born + 30);
  } else {
    // Slow delivery can expose several genuine held-fire rounds. All three conversions must arrive separately.
    assert.equal(handling, openId);
    assert(liftedPaused < born + 10);
    converted = forfeited = 3;
  }
  // An actual primary round has one firing event even when Iron Rain adds pellets.
  // Slow delivery can also leave the held trigger live after its third conversion.
  const paidPrimaryRounds = ammo - 1 - p().ammo,
    primaryRounds = () => sounds("weapon-heavy-lmg").length;
  assert(Number.isInteger(paidPrimaryRounds) && paidPrimaryRounds >= converted);
  const postStrokePrimaryRounds = paidPrimaryRounds - converted;
  if (postStrokePrimaryRounds) {
    assert.equal(handling, openId);
    assert.equal(converted, 3);
    assert.equal(p().kit.heavyTraverseUntil, 0);
  }
  await heavyWait(
    () =>
      primaryRounds() === paidPrimaryRounds &&
      primary().length >= paidPrimaryRounds,
    "separate admitted primary firing events and physical projectiles match every actually paid round",
  );
  assert.equal(p().ammo, ammo - 1 - paidPrimaryRounds);
  if (handling === keyedId) {
    assert.equal(converted, 0);
    assert(forfeited >= 1);
  } else assert(converted >= 1 && converted <= 3);
  const heldBearing = p().kit.heavyTraverseAim!;
  if (handling === keyedId)
    assert(
      bearingDelta(aim, heldBearing) > 0 &&
        bearingDelta(aim, heldBearing) <= 0.120001,
    );
  input({
    technique1: true,
    technique2: true,
    fire: true,
    reload: true,
    dodge: true,
    ultimate: true,
  });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(view().combatTick, liftedPaused);
  assert.equal(p().ammo, ammo - 1 - paidPrimaryRounds);
  assert.equal(p().kit.technique1At, recovery);
  assert.equal(primaryRounds(), paidPrimaryRounds);
  assert(primary().length >= paidPrimaryRounds);
  const expectedC = r.rounds - forfeited;
  const engage = (p().kit.heavyTraverseUntil ?? 0) > 0;
  await a.pause(false);
  if (engage) {
    input({
      technique2: true,
      aim: handling === keyedId ? aim + Math.PI : aim,
    });
    await heavyWait(
      () => sounds("heavy-clutch-engage").length === 1,
      "separate stationary handling re-engagement on the original window",
    );
    input({ aim: handling === keyedId ? aim + Math.PI : aim });
  } else input({ aim });
  await heavyWait(
    () => C().length === expectedC && (p().kit.heavyTraverseUntil ?? 0) === 0,
    "all actual original-slot C event messages AND completed authoritative view",
  );
  const ticks = C().map((s) => s.expires - HZ * r.lifeSeconds);
  assert.equal(ticks[0], born);
  assert.equal(new Set(ticks).size, ticks.length);
  assert(
    ticks.every((t) => [born, born + 10, born + 20, born + 30].includes(t)),
  );
  if (engage) assert.equal(ticks.at(-1), born + 30);
  assert.equal(p().ammo, ammo - ticks.length - paidPrimaryRounds);
  assert.equal(ticks.length + forfeited, 4);
  assert.equal(p().kit.technique1At, recovery);
  assert.equal(sounds("heavy-clutch-lift").length, 1);
  assert.equal(sounds("heavy-clutch-engage").length, engage ? 1 : 0);
  for (const s of C()) {
    assert.equal(s.radius, r.radius);
    assert.equal(s.pierce, 0);
    assert(s.damage > 0);
    const expected =
      handling === keyedId && s.expires - HZ * r.lifeSeconds > born
        ? heldBearing
        : aim;
    assert(Math.abs(bearingDelta(expected, Math.atan2(s.vy, s.vx))) < 1e-6);
  }
  for (const s of shots()) {
    for (const key of [
      "origin",
      "weapon",
      "mode",
      "stroke",
      "required",
      "requiresClutch",
      "requiresHandling",
    ])
      assert(!(key in s));
    a.checkOwnerStreams?.(s.id);
  }
  let actualHostExit = false;
  if (a.end) {
    const alive = shots().filter((s) => !removed(s.id));
    assert(alive.length > 0);
    await a.end();
    await heavyWait(
      () => alive.every((s) => removed(s.id)),
      "host exit removes actual handled flights and delivers separate owner removals",
    );
    actualHostExit = true;
  } else
    await heavyWait(
      () => shots().every((s) => removed(s.id)),
      "actual finite handled-flight removals",
    );
  for (const s of shots()) a.checkOwnerStreams?.(s.id);
  return {
    passed: true,
    mode,
    handling,
    actualAdmissionTicks: ticks,
    actualCrounds: ticks.length,
    actualPrimaryRounds: paidPrimaryRounds,
    actualPostStrokePrimaryRounds: postStrokePrimaryRounds,
    actualPrimaryProjectiles: primary().length,
    actualPrimaryRoundFiringEvents: primaryRounds(),
    actualTradedSlots: converted,
    actualPassedSlots: forfeited - converted,
    actualPaidRounds: ticks.length + paidPrimaryRounds,
    actualLiftAndSeparateReengagement: engage,
    originalBorn: born,
    originalUntil: until,
    originalRecovery: recovery,
    originalOpportunitiesConserved: true,
    actualStoredBearing: heldBearing,
    initialBearing: aim,
    actualLiftedMovement: { from: origin, to: moved },
    pausedBeforeAndDuringLift: true,
    pausedRequestsDiscarded: true,
    actualHostExit,
    shots: shots().map((s) => ({ ...s })),
    noCheckpointOrBudgetHealthPositionInjection: true,
    limits:
      "Actual operation/admission/movement/privacy evidence. Native operation need not isolate positive C damage. Controlled Game values, natural/replay outcomes and human/rendered/device/native-language/listening/motion/final balance remain separate.",
  };
}
