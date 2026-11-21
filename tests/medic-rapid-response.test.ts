import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game, data, type Player } from '../src/shared/game.ts';
import { distance, segmentRect } from '../src/shared/geometry.ts';
import { fieldSurgeryIds } from '../src/shared/medic-field-surgery.ts';
import { rapidResponseIds, rapidResponseRules as rescue } from '../src/shared/medic-rapid-response.ts';
import { HZ, idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

type Fixture = { fitted?: 'switchback' | 'handoff'; allies?: boolean; owned?: boolean; difficulty?: string };
const right = { moveX: 1 };
const runRight = { ...right, technique2: true };
const dose = { technique2: true };
const exact = (actual: number, expected: number) => assert(Math.abs(actual - expected) < 1e-6, `${actual} vs ${expected}`);
const responseSounds = (g: Game, event: string) =>
  g.drainEvents().filter(e => e.type === 'sound' && e.id === 'medic-response-' + event);

function fixture({ fitted, allies = false, difficulty = 'normal', owned = true }: Fixture = {}) {
  const game = new Game({ mode: 'short', difficulty, maxPlayers: allies ? 2 : 1,
    openingArenaId: 'gatehouse', arenaSelection: 'fixed', seed: 131 });
  game.encounter = fitted ? 1 : 0;
  const medic = game.addPlayer('medic', 'Iona', 'medic');
  const ally = allies ? game.addPlayer('ally', 'Adelaide', 'soldier') : undefined;
  assert.equal(medic.totalSp, fitted ? 9 : 3);
  const buy = (item: string) => game.transact(medic.id, { id: item, kind: 'skill', item });
  assert(buy('medic-recovery-1').ok);
  if (owned) assert(buy(rapidResponseIds.entry).ok);
  if (fitted) assert(buy(rapidResponseIds[fitted]).ok);
  assert(game.start());
  game.boss.deadline = game.boss.staggerUntil = 10000;
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game, 'arena', { get: () => arena });
  function place(x = 600, y = 600) { Object.assign(medic, { x, y }); }
  if (ally) Object.assign(ally, { x: 700, y: 600 });
  place();
  function frame(command: Partial<InputFrame> = {}, partner: Partial<InputFrame> = {}) {
    for (const p of game.players.values()) {
      if (!p.connected) continue;
      assert(game.submitInput(p.id, { ...idleInput(), aim: 0, ...(p === medic ? command : partner), sequence: p.ack + 1,
        clientTick: game.combatTick }));
    }
    game.step();
  }
  function repeat(count: number, command: Partial<InputFrame> = {}) {
    for (let i = 0; i < count; i++) frame(command);
  }
  function wound(player: Player, amount: number) {
    player.shield = 0;
    game.damage(player, amount, false);
  }
  repeat(Math.max(...[...game.players.values()].map(p => p.invulnerableUntil)));
  const phase = () => game.kitStatus(medic.id).rapidResponse?.phase;
  const status = () => game.kitStatus(medic.id).rapidResponse!;
  const pulses = () => game.classCues().filter(cue => cue.kind === 'medic-response-dose');
  const xAtStart = medic.x;
  function cover() { frame(runRight); repeat(5, right); }
  return { game, medic, ally, arena, place, frame, repeat, wound, phase, status, pulses, xAtStart, cover };
}

test('Rescue Run starts with a paid clear step, retains ordinary dodge and spends exactly the issued E clock', () => {
  const f = fixture(), control = fixture({ owned: false });
  const { game, medic } = f;
  f.frame(dose);
  assert.equal(f.phase(), 'idle');
  assert.equal(medic.eAt, 0);
  const wall = { x: medic.x + data.rules.playerRadius, y: medic.y - 40, width: 30, height: 80 };
  f.arena.obstacles = [wall];
  f.frame(runRight);
  assert.equal(f.phase(), 'idle');
  assert.equal(medic.eAt, 0);
  f.arena.obstacles = [];
  f.frame(runRight);
  control.frame({ e: true });
  assert.equal(f.phase(), 'running');
  assert.equal(medic.eAt - game.combatTick, control.medic.eAt - control.game.combatTick);
  assert.equal(medic.dodgeCharges, 1);
  assert(medic.invulnerableUntil < game.combatTick);
  exact(medic.x - f.xAtStart, game.movementSpeed(medic) / HZ * rescue.speed);
  assert.equal(responseSounds(game, 'launch').length, 1);
  assert(!game.fields.length);
  control.frame(runRight);
  assert.equal(control.phase(), undefined);
  assert.equal(responseSounds(control.game, 'launch').length, 0);
});

test('Simultaneous issued E takes precedence and retains the existing heal and status cleanse', () => {
  const f = fixture({ allies: true }), ally = f.ally!;
  f.wound(ally, 60);
  ally.slowUntil = ally.poisonUntil = f.game.combatTick + HZ * 2;
  ally.poisonNextAt = ally.poisonUntil;
  f.frame({ ...runRight, e: true });
  assert.equal(f.phase(), 'idle');
  assert(f.medic.eAt > f.game.combatTick);
  assert.equal(ally.slowUntil, 0);
  assert.equal(ally.poisonUntil, 0);
  exact(f.medic.healing, 20 * f.game.stats(f.medic).ability);
});

test('An arrival reserves one focused dose of actual healing and retains the paid recovery', () => {
  const f = fixture(), { game, medic } = f;
  f.wound(medic, 52);
  const before = medic.health;
  f.cover();
  const recovery = medic.eAt;
  assert(f.status().walked! >= rescue.requiredWalk);
  assert.equal(medic.health, before);
  f.frame();
  assert.equal(f.phase(), 'arrived');
  assert.equal(f.status().patient, medic.id);
  assert.equal(responseSounds(game, 'arrive').length, 1);
  f.frame(dose);
  assert.equal(f.phase(), 'idle');
  assert.equal(f.pulses().length, 1);
  assert.equal(f.pulses()[0].patient, medic.id);
  assert.equal(responseSounds(game, 'dose').length, 1);
  exact(medic.health - before, 16 * game.stats(medic).ability);
  assert.equal(medic.eAt, recovery);
  f.frame(dose);
  assert.equal(responseSounds(game, 'dose').length, 0);
  assert.equal(medic.eAt, recovery);
  assert.equal(medic.progress.rescues, 0);
});

test('Insufficient walking, movement after arrival, firing, health loss and expiry each forfeit the paid dose', () => {
  for (const failure of ['short', 'walk', 'fire', 'hurt', 'expired'] as const) {
    const f = fixture(), { medic, game } = f;
    f.wound(medic, 40);
    const before = medic.health;
    if (failure === 'short') f.frame(runRight);
    else f.cover();
    const recovery = medic.eAt;
    if (failure === 'walk' || failure === 'expired') f.frame();
    if (failure === 'walk') f.frame(right);
    if (failure === 'fire') {
      const ammo = medic.ammo;
      f.frame({ ...right, fire: true });
      assert.equal(medic.ammo, ammo - 1);
    }
    if (failure === 'hurt') f.wound(medic, 8);
    if (failure === 'expired') f.repeat(rescue.arrivalTicks);
    f.frame(dose);
    assert.equal(f.phase(), 'idle', failure);
    assert.equal(game.kitStatus(medic.id).rapidResponse?.ready, false, failure);
    assert.equal(medic.health, before - (failure === 'hurt' ? 8 : 0), failure);
    assert.equal(medic.eAt, recovery, failure);
    assert.equal(f.pulses().length, 0, failure);
  }
});

test('Slowing still applies, and ordinary dodging takes its own real charge and recovery', () => {
  const f = fixture(), { game, medic } = f;
  medic.slowUntil = game.combatTick + HZ * 2;
  f.frame(runRight);
  exact(medic.x - f.xAtStart, game.movementSpeed(medic) / HZ * rescue.speed * .65);
  const recovery = medic.eAt;
  f.frame({ ...right, dodge: true });
  assert.equal(f.phase(), 'idle');
  assert.equal(medic.dodgeCharges, 0);
  assert(medic.dashUntil > game.combatTick);
  assert(medic.invulnerableUntil > game.combatTick);
  assert.equal(medic.eAt, recovery);
});

test('A raid pull combined with ordinary movement cannot supply the required walking distance', () => {
  const f = fixture(), { game, medic } = f;
  f.wound(medic, 50);
  f.frame(runRight);
  const counted = f.status().walked;
  const recovery = medic.eAt;
  const { x, y } = medic;
  game['director'].raids['shapes'].push({ kind: 'raid-lane', style: 'pull', id: 65_001,
    x1: x - 60, y1: y, x2: x + 200, y2: y, width: 100, damage: 0, forceX: 45, forceY: 0,
    disabled: false, dependencies: [], index: 0, at: game.combatTick + 1, until: game.combatTick + 8 });
  f.repeat(6, right);
  assert(medic.x > x + 48);
  assert.equal(f.status().walked, counted);
  f.frame(dose);
  assert.equal(f.phase(), 'idle');
  assert.equal(medic.healing, 0);
  assert.equal(medic.eAt, recovery);
});

test('A focused ally dose needs a clear patient line and is shared after the owner-only arrival state', () => {
  const f = fixture({ allies: true }), { game, medic, ally } = f;
  f.wound(medic, 35);
  f.wound(ally!, 50);
  const before = ally!.health;
  f.cover();
  f.frame();
  assert.equal(viewOf(game, medic.id).players.find(p => p.id === medic.id)?.kit.rapidResponse?.patient, ally!.id);
  assert.equal(viewOf(game, ally!.id).players.find(p => p.id === medic.id)?.kit.rapidResponse, undefined);
  const wall = { x: medic.x + 17, y: medic.y - 60, width: 13, height: 120 };
  f.arena.obstacles = [wall];
  f.frame(dose);
  assert.equal(ally!.health, before);
  assert.equal(medic.healing, 0);
  assert.equal(f.phase(), 'arrived');
  f.arena.obstacles = [];
  f.frame(dose);
  exact(ally!.health - before, rescue.dose * game.stats(medic).ability);
  for (const observer of [medic.id, ally!.id]) {
    const cues = viewOf(game, observer).classCues.filter(cue => cue.kind === 'medic-response-dose');
    assert.equal(cues.length, 1);
    assert.equal(cues[0].patient, ally!.id);
  }
});

test('Switchback extends the original deadline only once after a real sharp turn', () => {
  const f = fixture({ fitted: 'switchback' }), { game, medic } = f;
  f.cover();
  const deadline = f.status().until!;
  const recovery = medic.eAt;
  f.frame(runRight);
  assert.equal(f.status().until, deadline);
  const y = medic.y;
  f.arena.obstacles = [{ x: medic.x - 40, y: medic.y + data.rules.playerRadius, width: 80, height: 30 }];
  f.frame({ moveY: 1, technique2: true });
  assert.equal(medic.y, y);
  assert.equal(f.status().until, deadline);
  assert.equal(responseSounds(game, 'switch').length, 0);
  f.arena.obstacles = [];
  f.frame({ moveY: -1, technique2: true });
  assert(medic.y < y);
  assert.equal(f.status().until, deadline + rescue.switchTicks);
  assert.equal(f.status().switched, true);
  assert.equal(responseSounds(game, 'switch').length, 1);
  f.frame({ moveY: 1, technique2: true });
  assert.equal(f.status().until, deadline + rescue.switchTicks);
  assert.equal(medic.eAt, recovery);
});

test('Moving Handoff treats an actual ally while moving and ends the run after one smaller dose', () => {
  const f = fixture({ fitted: 'handoff', allies: true }), { game, medic, ally } = f;
  f.wound(ally!, 60);
  const before = ally!.health;
  f.cover();
  const recovery = medic.eAt;
  const x = medic.x, other = ally!.x;
  f.frame(runRight, right);
  assert(ally!.x > other && medic.x > x);
  exact(ally!.health - before, rescue.movingDose * game.stats(medic).ability);
  assert.equal(f.pulses()[0].patient, ally!.id);
  assert.equal(responseSounds(game, 'handoff').length, 1);
  assert.equal(f.phase(), 'idle');
  assert.equal(medic.eAt, recovery);
  f.frame(dose);
  assert.equal(responseSounds(game, 'dose').length, 0);
});

test('A rescue can approach around a wall, with the full ordinary revive channel and no terrain bypass', () => {
  const f = fixture({ allies: true }), { game, medic, ally } = f;
  f.wound(ally!, ally!.maxHealth * 2);
  assert.equal(ally!.status, 'downed');
  f.place(659, 600);
  const wall = { x: 677, y: 570, width: 14, height: 65 };
  f.arena.obstacles = [wall];
  assert(distance(medic, ally!) < 55 && segmentRect(medic, ally!, wall));
  f.repeat(HZ * 2 + 1, { interact: true });
  assert.equal(ally!.status, 'downed');
  assert.equal(medic.reviveProgress, 0);
  f.frame({ moveY: -1, technique2: true });
  f.repeat(3, { moveY: -1 });
  assert(medic.y < wall.y - data.rules.playerRadius);
  f.repeat(4, right);
  assert(medic.x > wall.x + wall.width + data.rules.playerRadius);
  f.repeat(2, { moveY: 1 });
  assert(distance(medic, ally!) <= 55 && !segmentRect(medic, ally!, wall));
  f.repeat(HZ * 2 - 1, { interact: true });
  assert.equal(ally!.status, 'downed');
  assert.equal(medic.progress.rescues, 0);
  f.frame({ interact: true });
  assert.equal(ally!.status, 'active');
  assert.equal(ally!.health, ally!.maxHealth * .45);
  assert.equal(medic.progress.rescues, 1);
  assert.equal(medic.healing, 0);
});

test('Hellish movement and focused treatment are available while manual revival remains disabled', () => {
  const f = fixture({ allies: true, difficulty: 'hellish' }), { game, medic, ally } = f;
  f.wound(ally!, 250);
  f.wound(medic, 40);
  assert.equal(ally!.status, 'downed');
  f.cover();
  f.frame({ technique2: true, aim: Math.PI });
  assert(medic.healing > 0);
  f.repeat(HZ * 2, { interact: true });
  assert.notEqual(ally!.status, 'active');
  assert.equal(medic.reviveProgress, 0);
  assert.equal(medic.progress.rescues, 0);
});

test('Disconnect drops the owned route without refunding E or handing off the reserved dose', () => {
  const f = fixture({ allies: true });
  f.wound(f.ally!, 50);
  f.cover();
  f.frame();
  const recovery = f.medic.eAt;
  f.game.setConnected(f.medic.id, false);
  f.frame();
  f.game.setConnected(f.medic.id, true);
  f.frame(dose);
  assert.equal(f.phase(), 'idle');
  assert.equal(f.medic.eAt, recovery);
  assert.equal(f.pulses().length, 0);
  assert.equal(f.medic.healing, 0);
});

test('The voluntary 9-SP purchase fits one Rapid Response option beside Field Surgery', () => {
  for (const selected of ['switchback', 'handoff'] as const) {
    const g = new Game({ mode: 'short', maxPlayers: 1 });
    g.encounter = 1;
    const p = g.addPlayer('medic', 'Iona', 'medic');
    let transaction = 0;
    const buy = (item: string) => g.transact(p.id, { kind: 'skill', item, id: 'purchase-' + ++transaction });
    assert.equal(p.totalSp, 9);
    assert(!buy(rapidResponseIds[selected]).ok);
    for (const item of ['medic-recovery-1', rapidResponseIds.entry, 'medic-triage-1', fieldSurgeryIds.entry, rapidResponseIds[selected]]) {
      assert(buy(item).ok, item);
    }
    assert.equal(viewOf(g, p.id).players[0].sp, 1);
    const opposite = selected === 'switchback' ? 'handoff' : 'switchback';
    assert.equal(buy(rapidResponseIds[opposite]).reason, 'incompatibleItem');
    assert.equal(viewOf(g, p.id).players[0].sp, 1);
  }
});
