import assert from 'node:assert/strict';
import { HZ, type InputFrame } from '../../src/shared/protocol.ts';
import { lanyardId, clutchId, heavyTraverseRules as rules } from '../../src/shared/heavy-traverse.ts';
import { heavyWait, type HeavyFlakAdapter } from './heavy-flak-flow.ts';
import { handlingLane, type ClutchCarriage, type ClutchHandling } from './heavy-clutch-handling-flow.ts';

type PostTransportAdapter = Omit<HeavyFlakAdapter, 'input'> & { input(action: Partial<InputFrame>): number; paused(): boolean };

/** Real authority/transport only. The caller supplies actual earned purchases and its unchanged client/server. */
export async function heavyPostOperation(a: PostTransportAdapter, mode: ClutchCarriage, handling?: ClutchHandling) {
  const view = () => { const v = a.view();assert(v);return v; };
  const owner = () => { const p = view().players.find(p => p.id === a.owner);assert(p);return p; };
  assert(owner().skills.includes(lanyardId) && owner().skills.includes(clutchId));
  if (handling) assert(owner().skills.includes(handling));
  const previous = new Set(a.events.flatMap(e => e.type === 'shots' ? e.shots.map(s => s.id) : []));
  const startEvent = a.events.length;
  const rounds = () => [...new Map(a.events.slice(startEvent).flatMap(e => e.type === 'shots' ? e.shots : [])
    .filter(s => s.owner === a.owner && !previous.has(s.id) && Math.abs(Math.hypot(s.vx, s.vy) - rules.speed) < 1e-6 && s.radius === rules.radius)
    .map(s => [s.id, { ...s }] as const)).values()];
  const removed = (id: number) => a.events.some(e => e.type === 'remove' && e.ids.includes(id));
  await a.pause(true);await heavyWait(() => a.paused(), 'actual pre-post pause');
  const pausedBefore = view().combatTick, ammo = owner().ammo;
  a.input({ technique1: true, technique2: true, fire: true, reload: true, dodge: true, q: true, e: true, ultimate: true });
  await new Promise(resolve => setTimeout(resolve, 140));assert.equal(view().combatTick, pausedBefore);assert.equal(owner().ammo, ammo);assert.equal(rounds().length, 0);
  await a.pause(false);const idle = a.input({});await heavyWait(() => owner().ack >= idle, 'fresh idle discards paused post requests');
  const aim = handlingLane(view(), a.owner).aim;
  const statContextAtStrokeStart = { skills: [...owner().skills], upgrades: { ...owner().upgrades }, mutations: view().mutations.map(m => ({ ...m })) };
  a.input({ aim, technique1: true });
  await heavyWait(() => rounds().length === 1 && (owner().kit.heavyTraverseBornAt ?? 0) > 0, 'first actual paid C round and separate authoritative post view');
  const born = owner().kit.heavyTraverseBornAt!, until = owner().kit.heavyTraverseUntil!, recovery = owner().kit.technique1At!;
  assert.equal(until - born, rules.deadlineTicks);assert.equal(owner().ammo, ammo - 1);
  a.input({ aim, technique2: true });await heavyWait(() => !!owner().kit.heavyClutchLifted, 'separate real feed lift before posting');
  const liftAt = owner().kit.heavyClutchAt!, liftSequence = owner().kit.heavyClutchSequence!;
  a.input({ aim, technique2: true });await heavyWait(() => owner().kit.heavyClutchUsed === true && !owner().kit.heavyClutchLifted, 'separate real re-engagement before posting');
  const engageAt = owner().kit.heavyClutchAt!, engageSequence = owner().kit.heavyClutchSequence!;assert(engageAt > liftAt && engageSequence > liftSequence);
  assert((owner().kit.heavyClutchSlotsRemaining ?? 0) >= 2, 'at least two original opportunities for an actual post');
  a.input({ aim, technique2: true });await heavyWait(() => (owner().kit.heavyLanyardAt ?? 0) > engageAt, 'third separate command stakes the actual gun');
  const postAt = owner().kit.heavyLanyardAt!, postSequence = owner().kit.heavyLanyardSequence!, post = { x: owner().kit.heavyLanyardX!, y: owner().kit.heavyLanyardY! }, bearing = owner().kit.heavyTraverseAim!;
  assert(postSequence > engageSequence);assert.equal(owner().kit.heavyClutchAt, engageAt);assert.equal(owner().kit.heavyTraverseUntil, until);assert.equal(owner().kit.technique1At, recovery);
  const forfeited = owner().kit.heavyClutchForfeited ?? 0, converted = owner().kit.heavyClutchConverted ?? 0;
  assert.equal(converted, 0);const expected = rules.rounds - forfeited;assert(expected >= 3 && expected <= 4);
  const from = { x: owner().x, y: owner().y }, direction = { x: Math.cos(aim), y: Math.sin(aim) };
  a.input({ aim: Math.atan2(Math.sin(aim + .8), Math.cos(aim + .8)), moveX: direction.x, moveY: direction.y });
  await heavyWait(() => (owner().kit.heavyLanyardUntil ?? 0) > view().combatTick && (owner().x - from.x) * direction.x + (owner().y - from.y) * direction.y > 5, 'actual forward walking while the paid gun remains posted');
  const moved = { x: owner().x, y: owner().y }, movedAt = view().combatTick;
  a.input({ aim });assert(movedAt < until);assert(Math.hypot(moved.x - post.x, moved.y - post.y) <= 64);assert.equal(owner().kit.heavyLanyardX, post.x);assert.equal(owner().kit.heavyLanyardY, post.y);assert.equal(owner().kit.heavyTraverseAim, bearing);
  await a.pause(true);await heavyWait(() => a.paused(), 'actual posted gun pause');
  assert((owner().kit.heavyLanyardAt ?? 0) > 0, 'post still has unpaid work at its original pause');
  await heavyWait(() => rounds().length === owner().kit.heavyTraverseRounds, 'separate actual paid event batch catches up to the paused post view');
  const paused = view().combatTick, count = rounds().length, paidAmmo = owner().ammo;
  a.input({ aim, technique1: true, technique2: true, fire: true, reload: true, dodge: true, q: true, e: true, ultimate: true });
  await new Promise(resolve => setTimeout(resolve, 140));assert.equal(view().combatTick, paused);assert.equal(rounds().length, count);assert.equal(owner().ammo, paidAmmo);assert.equal(owner().kit.heavyTraverseUntil, until);assert.equal(owner().kit.heavyLanyardX, post.x);assert.equal(owner().kit.heavyLanyardY, post.y);
  await a.lateAndNonHostChecks?.();
  await a.pause(false);a.input({ aim });
  await heavyWait(() => rounds().length === expected && (owner().kit.heavyTraverseUntil ?? 0) === 0, 'all remaining original posted opportunities and their separate shot batches');
  const actual = rounds(), ticks = actual.map(s => s.expires - Math.ceil(rules.lifeSeconds * HZ));
  assert.equal(owner().ammo, ammo - actual.length);assert.equal(owner().kit.technique1At, recovery);assert.equal(ticks[0], born);assert(ticks.every(t => [0, 10, 20, 30].includes(t - born)));assert.equal(ticks.at(-1), born + 30);assert.equal(actual.length + forfeited, 4);
  for (const shot of actual) {
    assert(Number.isFinite(shot.damage) && shot.damage > 0);assert.equal(shot.pierce, 0);a.checkOwnerStreams?.(shot.id);
    if (shot.expires - Math.ceil(rules.lifeSeconds * HZ) >= postAt) { assert(Math.abs(shot.x - post.x) < 1e-5 && Math.abs(shot.y - post.y) < 1e-5);assert(Math.abs(Math.atan2(Math.sin(Math.atan2(shot.vy, shot.vx) - bearing), Math.cos(Math.atan2(shot.vy, shot.vx) - bearing))) < 1e-5); }
    for (const field of ['origin', 'requiresLanyard', 'requiresClutch', 'requiresHandling', 'tether']) assert(!(field in shot));
  }
  let actualHostExit = false;const hostExitCShotIds: number[] = [];
  if (a.end) {
    hostExitCShotIds.push(...actual.filter(s => !removed(s.id)).map(s => s.id));assert(hostExitCShotIds.length > 0);await a.end();await heavyWait(() => hostExitCShotIds.every(removed), 'actual host exit and separate owner-only paid C removals');actualHostExit = true;
  } else await heavyWait(() => actual.every(s => removed(s.id)), 'actual finite post-flight expiry');
  return { passed: true, mode, handling: handling ?? 'omitted', actualThirdSeparatePost: true, liftAt, engageAt, postAt, liftSequence, engageSequence, postSequence, actualPostOrigin: post, actualStoredBearing: bearing,
    actualPostedWalking: { from, to: moved, direction, forwardProgress: (moved.x - from.x) * direction.x + (moved.y - from.y) * direction.y, tick: movedAt, originalUntil: until, minimumRequired: 5 },
    actualAdmissionTicks: ticks, actualCrounds: actual.length, actualForfeitedSlots: forfeited, actualPrimaryTrades: converted, originalBorn: born, originalUntil: until, originalRecovery: recovery, statContextAtStrokeStart, shots: actual,
    originalOpportunitiesConserved: true, oneOriginalRecovery: true, pausedBeforeAndDuringPost: true, pausedRequestsDiscarded: true, actualHostExit, hostExitCShotIds,
    noCheckpointOrBudgetHealthPositionHazardInjection: true, limits: 'Actual earned source purchases and physical operation admissions. The carried Clutch/Keyed/Open operations retain separate earlier proofs; this post operation does not trade primary while lifted. Native contacts may be zero. Controlled Game damage/evasion, full rendered/device/native-language/listening/motion/human/final-balance acceptance remain separate.' };
}
