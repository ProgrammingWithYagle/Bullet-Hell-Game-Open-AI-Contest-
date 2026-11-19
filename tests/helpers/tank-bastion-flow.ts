import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { data } from '../../src/shared/game.ts';
import { distance } from '../../src/shared/geometry.ts';
import { HZ, type InputFrame, type Vec } from '../../src/shared/protocol.ts';
import { bastionIds, bastionRules, TankBastion, type BastionCue } from '../../src/shared/tank-bastion.ts';
import type { PlayerView, View } from '../../src/shared/view.ts';
import { bulwarkTrialWorld, clearTrialWalk } from './tank-bulwark-staging.ts';
import { restWait } from './sniper-rest-flow.ts';
import { restRaidInput } from './sniper-rest-raid-policy.ts';
import type { InterceptionTransport } from './tank-interceptor-earned-flow.ts';

type BaseChoice = 'plain' | 'split' | 'corner';
export type BastionChoice = BaseChoice | 'relief' | 'countermarch';
type BastionTransport = InterceptionTransport & { equipAlly?(): Promise<void> };
type Actor = { player(): PlayerView; input(props: Partial<InputFrame>): number };
type Peer = Actor & { checkGate(gate: BastionCue): Promise<void>; checkClaim(until: number): Promise<void> };
const skills = [...data.skills, ...data.generalSkills, ...data.specializationSkills];
const issuedUltimate = data.classes.find(cls => cls.id === 'tank')!.ultimate;
const point = ({ x, y }: Vec) => ({ x, y });
const offset = (center: Vec, n: Vec, depth: number, side: number) =>
  ({ x: center.x + n.x * depth - n.y * side, y: center.y + n.y * depth + n.x * side });

function formation(view: View, tank: PlayerView, runner: PlayerView, choice: BaseChoice, reversed: boolean, late: boolean) {
  const world = { ...bulwarkTrialWorld(view), playerRadius: data.rules.playerRadius };
  const planner = new TankBastion(() => assert.fail('Inspection cannot allocate a cue'));
  const queue = [{ at: point(tank), dx: 0, dy: 0, parent: -1 }], seen = new Set(['0:0']);
  for (let index = 0; index < queue.length && index < 384; index++) {
    const node = queue[index];
    for (let turn = 0; turn < 16; turn++) {
      const bearing = -Math.PI / 2 + turn * Math.PI / 8;
      const aim = Math.atan2(Math.sin(bearing), Math.cos(bearing));
      if (!planner.canPlant({ ...tank, ...node.at, aim }, world)) continue;
      const face = { x: Math.cos(aim), y: Math.sin(aim) };
      const normal = choice === 'corner' ? { x: -face.y, y: face.x } : face;
      const center = offset(node.at, face, -bastionRules.lead, 0);
      const lateral = choice === 'split' ? -30 : choice === 'corner' ? -30 : 0;
      const from = offset(center, normal, 16, lateral), to = offset(center, normal, -16, lateral);
      const approach = reversed ? to : from;
      if (!clearTrialWalk(world, runner.id === tank.id ? node.at : runner, approach) || !clearTrialWalk(world, from, to)) continue;
      const shelter = reversed ? [offset(center, normal, 0, -67), offset(center, normal, -16, -67), to] : [from, to];
      if (late && !shelter.every((at, index) => clearTrialWalk(world, shelter[index - 1] ?? node.at, at))) continue;
      const reverseAim = Math.atan2(-normal.y, -normal.x);
      const path: Vec[] = [];
      for (let at = index; queue[at].parent >= 0; at = queue[at].parent) path.unshift(queue[at].at);
      return { aim, reverseAim, from, to, path, shelter };
    }
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = node.dx + dx, y = node.dy + dy, key = x + ':' + y;
      if (seen.has(key)) continue;
      const at = { x: tank.x + x * 26, y: tank.y + y * 26 };
      if (!clearTrialWalk(world, node.at, at)) continue;
      seen.add(key);
      queue.push({ at, dx: x, dy: y, parent: index });
    }
  }
}

export async function earnedBastionFlow(t: BastionTransport, choice: BastionChoice, peer?: Peer) {
  const fit = choice === 'relief' ? 'split' : choice === 'countermarch' ? 'corner' : choice;
  const late = choice === 'relief' || choice === 'countermarch' ? bastionIds[choice] : undefined;
  const view = () => { const v = t.view(); assert(v); return v; };
  const player = () => { const p = view().players.find(p => p.id === t.id); assert(p); return p; };
  const tank = { player, input: t.input }, runner = peer ?? tank;
  const spent = () => player().skills.reduce((sum, id) => sum + skills.find(s => s.id === id)!.cost, 0);
  const earned = () => player().sp + spent();
  const live = () => view().classCues.find((cue): cue is BastionCue => cue.kind === 'tank-gate-signal' && cue.owner === t.id);
  async function acknowledge(actor: Actor, props: Partial<InputFrame>, label: string) {
    const sequence = actor.input(props);
    await restWait(() => actor.player().ack >= sequence, label);
  }
  async function walk(actor: Actor, target: Vec, aim: number) {
    const deadline = Date.now() + 8500;
    while (distance(actor.player(), target) > 1.4) {
      assert(Date.now() < deadline && view().phase === 'combat', 'Ordinary walk reaches the planned sill');
      const p = actor.player(), scale = Math.max(distance(p, target) / 0.36, p.speed / HZ * 4);
      await acknowledge(actor, { moveX: (target.x - p.x) / scale, moveY: (target.y - p.y) / scale, aim }, 'Official walk acknowledged');
    }
    await acknowledge(actor, { aim }, 'Walk released');
  }
  async function equip() {
    for (const weapon of data.weapons.filter(w => w.classId === 'tank').sort((a, b) => b.tier - a.tier)) {
      if (player().weapon === weapon.id || (await t.purchase({ kind: 'weapon', item: weapon.id })).ok) break;
    }
    for (const item of ['damage', 'health', 'fire-rate', 'reload', 'magazine']) await t.purchase({ kind: 'upgrade', item });
    await t.purchase({ kind: 'supply', item: 'medkit' });
  }
  const buy = (item: string) => t.purchase({ kind: 'skill', item });

  assert.equal(earned(), 3);
  assert(!Object.hasOwn(player().kit, 'bastionCanPlant'));
  assert((await buy('tank-protection-1')).ok);
  assert((await buy(bastionIds.entry)).ok);
  assert(!(await buy(bastionIds.split)).ok);
  assert(!(await buy(bastionIds.corner)).ok);
  await equip();
  t.start();
  await restWait(() => view().phase === 'combat', 'Actual Short deployment');
  await t.onFirstCombat?.();
  const actualEarnedSequence = [3];
  for (const clears of late ? [1, 2] : [1]) {
    const deadline = Date.now() + 185_000;
    while (view().phase === 'combat') {
      assert(Date.now() < deadline, 'Ordinary Short clear ' + clears);
      t.input({ ...restRaidInput(view(), player(), [...t.observed.values()]), ultimate: false });
      t.allyPolicy?.();
      await sleep(25);
    }
    t.stopAlly?.();
    assert.equal(player().progress.clears, clears);
    assert.equal(earned(), clears === 1 ? 9 : 15);
    actualEarnedSequence.push(earned());
    const payoutDeadline = Date.now() + 90_000;
    while (view().phase !== 'shop') {
      assert(view().phase !== 'defeat' && Date.now() < payoutDeadline);
      if (['contractVote', 'mutationVote'].includes(view().phase)) t.vote(0);
      await sleep(25);
    }
    if (clears === 1 && fit !== 'plain') {
      assert((await buy(bastionIds[fit])).ok);
      assert.equal((await buy(bastionIds[fit === 'split' ? 'corner' : 'split'])).reason, 'incompatibleItem');
    }
    if (late) {
      if (clears === 1) {
        assert.equal((await buy(late)).reason, 'insufficientPoints');
        await equip();
        await t.equipAlly?.();
      } else assert((await buy(late)).ok);
    }
    const deploymentDeadline = Date.now() + 90_000;
    while (view().phase !== 'combat') {
      const current = view();
      assert(current.phase !== 'defeat' && Date.now() < deploymentDeadline,
        'Ordinary deployment after the paid shop: ' + JSON.stringify({ phase: current.phase, tick: current.tick, phaseEnds: current.phaseEnds }));
      await sleep(25);
    }
  }

  assert(!view().run.testingModified && !view().run.customized);
  const reversed = choice === 'countermarch';
  const route = formation(view(), player(), runner.player(), fit, reversed, !!late);
  assert(route, 'A real terrain-safe formation exists');
  for (const waypoint of route.path) await walk(tank, waypoint, route.aim);
  if (peer) await walk(peer, reversed ? route.to : route.from, route.aim);
  await acknowledge(tank, { aim: route.aim }, 'Aimed bearing acknowledged separately');
  await restWait(() => player().kit.bastionCanPlant === true, 'Owned station is available on clear ground');
  const eventStart = t.events.length;
  await acknowledge(tank, { aim: route.aim, technique2: true }, 'Paid Action 2 acknowledged');
  await restWait(() => !!live(), 'Station arrives separately from Action 2 acknowledgment');
  const gate = structuredClone(live()!);
  assert.equal(gate.until - gate.at, Math.ceil(issuedUltimate.duration * HZ));
  assert.equal(player().ultimateAt - gate.at, Math.ceil(issuedUltimate.cooldown * HZ));
  assert.equal(gate.entrances.length, fit === 'plain' ? 1 : 2);
  assert(gate.entrances.every(face => face.open));
  await restWait(() => t.events.slice(eventStart).some(event =>
    event.type === 'sound' && event.id === 'tank-gate-plant' && event.owner === t.id), 'Separate plant feedback reaches the owner');
  await peer?.checkGate(gate);

  t.pause(true);
  await restWait(() => t.paused(), 'Authoritative pause acknowledgment');
  const paused = { tick: view().combatTick, ack: player().ack, owner: point(player()) };
  t.input({ moveX: 1, dodge: true, technique2: true, aim: route.aim });
  await sleep(120);
  assert.equal(view().combatTick, paused.tick);
  assert.equal(player().ack, paused.ack);
  assert.deepEqual(live(), gate);
  t.pause(false);
  await restWait(() => !t.paused(), 'Resume acknowledgment');
  await acknowledge(tank, { aim: route.aim }, 'Neutral Action 2 release after resume');
  assert(distance(paused.owner, player()) < 0.25);

  let adjustedGate: BastionCue | undefined;
  let finalClaimant = runner;
  async function adjust(kind: 'turn' | 'relief', aim: number) {
    await acknowledge(tank, { aim }, 'Separate stationary fitting aim');
    await restWait(() => player().kit.bastionAdjustment === kind, 'Owned late fitting is ready');
    const after = t.events.length, recovery = player().ultimateAt;
    await acknowledge(tank, { aim, technique2: true }, 'Owned late Action 2 acknowledged');
    await restWait(() => t.events.slice(after).some(event =>
      event.type === 'sound' && event.id === 'tank-gate-adjust' && event.owner === t.id), 'Private late operation response');
    await restWait(() => {
      const updated = live();
      if (updated?.id !== gate.id) return false;
      return kind === 'relief'
        ? updated.entrances[0].open && !updated.entrances[1].open
        : Math.cos(updated.entrances[1].aim - gate.entrances[1].aim) < -0.9999;
    }, 'Changed geometry observed independently of the action acknowledgment');
    adjustedGate = structuredClone(live()!);
    assert.equal(adjustedGate.id, gate.id);
    assert.equal(adjustedGate.until, gate.until);
    assert.equal(player().ultimateAt, recovery);
    await peer?.checkGate(adjustedGate);
  }
  if (reversed) {
    for (const waypoint of route.shelter) await walk(tank, waypoint, route.reverseAim);
    await adjust('turn', route.reverseAim);
    await walk(runner, route.from, route.reverseAim);
  } else {
    if (!peer) await walk(runner, route.from, route.aim);
    await walk(runner, route.to, route.aim);
    if (choice === 'relief') {
      await restWait(() => runner.player().kit.armorUntil === gate.until, 'The first half pays its original guard');
      assert.deepEqual(live()?.entrances.map(face => face.open), [false, true]);
      if (peer) {
        await peer.checkClaim(gate.until);
        for (const waypoint of route.shelter) await walk(tank, waypoint, route.aim);
      }
      await adjust('relief', route.aim);
      if (peer) {
        await walk(tank, route.from, route.aim);
        await walk(tank, route.to, route.aim);
        finalClaimant = tank;
      }
    }
  }
  await restWait(() => finalClaimant.player().kit.armorUntil === gate.until, 'Original deadline on the actual guard');
  assert.equal(finalClaimant.player().kit.armor, fit === 'split' ? 0.175 : 0.35);
  if (choice === 'split') assert.deepEqual(live()?.entrances.map(face => face.open), [false, true]);
  else if (choice === 'relief' && !peer) assert.deepEqual(live()?.entrances.map(face => face.open), [true, false]);
  else assert.equal(live(), undefined);
  if (peer && finalClaimant === peer) await peer.checkClaim(gate.until);
  else await restWait(() => t.events.some(event => event.type === 'sound' && event.id === 'tank-gate-claim' &&
    event.owner === t.id), 'Separate owned claim feedback');
  const result = { passed: true, choice, actualEarnedSequence, spent: spent(),
    sharedGate: gate, ...(adjustedGate ? { adjustedGate } : {}), guardUntil: gate.until,
    pausedCommandsDiscarded: true, claimant: finalClaimant.player().classId };

  if (t.end) {
    t.end();
    await restWait(() => view().phase === 'defeat' && !!view().endedByHost, 'Actual host exit');
    assert.equal(live(), undefined);
  }
  return result;
}
