import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game, type Player } from '../src/shared/game.ts';
import { fieldDressingRules, fieldSurgeryIds } from '../src/shared/medic-field-surgery.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

type Options = {
  fitted?: 'step' | 'aside' | 'tie' | 'wrap';
  allies?: 0 | 1 | 2;
  owned?: boolean;
  difficulty?: 'normal' | 'hellish';
};
const same = (actual: number, expected: number) =>
  assert(Math.abs(actual - expected) < 1e-6, actual + ' vs ' + expected);
const sound = (events: ReturnType<Game['drainEvents']>, state: string) =>
  events.filter(event => event.type === 'sound' && event.id === 'medic-dressing-' + state);

function fixture({ fitted, allies = 0, owned = true, difficulty = 'normal' }: Options = {}) {
  const g = new Game({ mode: 'short', seed: 41, difficulty, maxPlayers: allies + 1,
    openingArenaId: 'gatehouse', arenaSelection: 'fixed' });
  const later = fitted === 'tie' || fitted === 'wrap';
  const parent = fitted === 'tie' ? 'step' : fitted === 'wrap' ? 'aside' : fitted;
  g.encounter = later ? 2 : parent ? 1 : 0;
  const medic = g.addPlayer('medic', 'Iona', 'medic');
  const ally = allies >= 1 ? g.addPlayer('ally', 'Mara', 'soldier') : undefined;
  const other = allies >= 2 ? g.addPlayer('other', 'Second Medic', 'medic') : undefined;
  for (const owner of other ? [medic, other] : [medic]) {
    assert.equal(owner.totalSp, later ? 15 : parent ? 9 : 3);
    assert(g.transact(owner.id, { id: 'triage', kind: 'skill', item: 'medic-triage-1' }).ok);
    if (owned) assert(g.transact(owner.id, { id: 'entry', kind: 'skill', item: fieldSurgeryIds.entry }).ok);
    if (parent && owner === medic) {
      const opposing = parent === 'step' ? 'aside' : 'step';
      assert(g.transact(owner.id, { id: 'fitting', kind: 'skill', item: fieldSurgeryIds[parent] }).ok);
      if (later) assert(g.transact(owner.id, { id: 'later-fitting', kind: 'skill', item: fieldSurgeryIds[fitted] }).ok);
      const denied = g.transact(owner.id, { id: 'opposing', kind: 'skill', item: fieldSurgeryIds[opposing] });
      assert.equal(denied.reason, 'incompatibleItem');
    }
  }
  assert(g.start());
  g.boss.deadline = g.boss.staggerUntil = 10_000;
  // Controlled geometry leaves movement, treatment, damage and commands authoritative.
  const at = { x: medic.x, y: medic.y };
  const arena = structuredClone(g.arena);
  Object.defineProperty(g, 'arena', { get: () => arena });
  arena.obstacles = [];
  arena.lavaPits = [];
  arena.bounds = { x: at.x - 420, y: at.y - 420, width: 840, height: 840 };
  if (ally) Object.assign(ally, { x: at.x + 70, y: at.y });
  if (other) Object.assign(other, { x: at.x + 70, y: at.y + 70 });
  function step(commands: Record<string, Partial<InputFrame>> = {}) {
    for (const p of g.players.values()) {
      if (p.connected) assert(g.submitInput(p.id, { ...idleInput(), aim: 0, ...commands[p.id], sequence: p.ack + 1, clientTick: g.combatTick }));
    }
    g.step();
    return g.drainEvents();
  }
  while (g.combatTick < Math.max(...Array.from(g.players.values(), player => player.invulnerableUntil))) step();
  const state = () => g.fieldSurgery.state(medic.id);
  const treatmentCues = () => g.classCues().filter(cue => cue.kind === 'medic-dressing');
  function until(end: number, commands: Record<string, Partial<InputFrame>> = {}) {
    const lines = [];
    while (g.combatTick < end) lines.push(...step(commands));
    return lines;
  }
  function wound(patient: Player, amount: number) {
    patient.shield = 0;
    g.damage(patient, amount, false);
    assert(patient.health > 0 && patient.health < patient.maxHealth);
  }
  function begin(patient: Player = medic, aim = 0) {
    assert.equal(sound(step({ medic: { technique1: true, aim } }), 'prepare').length, 1);
    assert.equal(state()?.target, patient.id);
    return g.combatTick + fieldDressingRules.preparationTicks;
  }
  return { g, medic, ally, other, at, arena, step, until, state, treatmentCues, wound, begin };
}

test('Field Dressing spends the ordinary Q recovery on its first actual dose', () => {
  const f = fixture(), control = fixture({ owned: false });
  const { medic, g } = f;
  f.wound(medic, 75);
  const first = f.begin();
  const ammo = medic.ammo;
  const before = medic.health;
  f.until(first - 1);
  assert.equal(medic.qAt, 0);
  assert.equal(medic.healing, 0);
  assert.equal(f.treatmentCues().length, 0);
  assert.equal(sound(f.step(), 'dose').length, 1);
  const recovery = medic.qAt;
  control.step({ medic: { q: true } });
  assert.equal(recovery - g.combatTick, control.medic.qAt - control.g.combatTick);
  assert.equal(sound(f.until(first + 2 * fieldDressingRules.doseTicks), 'dose').length, 2);
  assert(!f.state());
  assert.equal(medic.qAt, recovery);
  assert.equal(medic.ammo, ammo);
  assert.equal(g.fields.length, 0);
  same(medic.health - before, medic.healing);
  assert(medic.healing > 34 && medic.progress.rescues === 0);
  f.step({ medic: { q: true, technique1: true } });
  assert.equal(g.fields.length, 0);
  assert(!f.state());
});

test('the owner sees the chosen patient in preparation and both actors see the admitted dose cue', () => {
  const f = fixture({ allies: 1 });
  const ally = f.ally!;
  f.wound(f.medic, 35);
  f.wound(ally, 65);
  const first = f.begin(ally);
  const otherView = () => viewOf(f.g, ally.id);
  assert.equal(viewOf(f.g, f.medic.id).players[0].kit.fieldDressing?.patient, ally.id);
  assert.equal(otherView().players[0].kit.fieldDressing, undefined);
  assert.equal(otherView().classCues.filter(cue => cue.kind === 'medic-dressing').length, 0);
  const selfBefore = f.medic.health, allyBefore = ally.health;
  f.until(first);
  const pulse = f.treatmentCues()[0];
  assert(pulse?.owner === f.medic.id && pulse.patient === ally.id && pulse.at === first);
  assert.equal(pulse.until - pulse.at, fieldDressingRules.cueTicks);
  assert.deepEqual(otherView().classCues.find(cue => cue.kind === 'medic-dressing'), pulse);
  assert.equal(otherView().players[0].kit.fieldDressing, undefined);
  assert.equal(f.medic.health, selfBefore);
  same(ally.health - allyBefore, f.medic.healing);
  f.g.setConnected(ally.id, false);
  assert.equal(f.treatmentCues().length, 0);
  assert(!f.state());
});

test('aiming at a healthy or blocked ally preserves Q and leaves a wounded Medic untreated', () => {
  const f = fixture({ allies: 1 });
  f.wound(f.medic, 50);
  f.step({ medic: { technique1: true } });
  assert(!f.state());
  f.wound(f.ally!, 45);
  f.arena.obstacles.push({ x: f.at.x + 29, y: f.at.y - 24, width: 10, height: 48 });
  f.step({ medic: { technique1: true } });
  assert(!f.state() && f.medic.qAt === 0);
  const first = f.begin(f.medic, Math.PI);
  assert.equal(sound(f.until(first), 'dose').length, 1);
});

for (const reason of ['movement', 'damage', 'Q'] as const) {
  test('preparation ends before its first dose after ' + reason, () => {
    const f = fixture();
    f.wound(f.medic, 60);
    const first = f.begin();
    if (reason === 'movement') f.step({ medic: { moveY: 1 } });
    if (reason === 'damage') { f.wound(f.medic, 8); f.step(); }
    if (reason === 'Q') f.step({ medic: { q: true } });
    assert(!f.state());
    assert.equal(sound(f.until(first + 20), 'dose').length, 0);
    if (reason === 'Q') assert(f.g.fields.some(field => field.kind === 'heal'));
    else assert.equal(f.medic.qAt, 0);
  });
}

test('concurrent Medics fill missing health once and debit the dose that restores it', () => {
  const f = fixture({ allies: 2 });
  const ally = f.ally!, other = f.other!;
  f.wound(ally, 4);
  const missing = ally.maxHealth - ally.health;
  f.step({ medic: { technique1: true }, other: { technique1: true, aim: -Math.PI / 2 } });
  assert.equal(f.state()?.target, ally.id);
  assert.equal(f.g.fieldSurgery.state(other.id)?.target, ally.id);
  f.until(f.g.combatTick + fieldDressingRules.preparationTicks);
  same(f.medic.healing + other.healing, missing);
  assert.equal(Number(f.medic.qAt > 0) + Number(other.qAt > 0), 1);
  assert.equal(f.treatmentCues().length, 1);
  assert.equal(ally.health, ally.maxHealth);
});

test('Hellish Field Dressing restores health without granting revival or removing slow', () => {
  const f = fixture({ allies: 1, difficulty: 'hellish' });
  f.wound(f.medic, 60);
  const ally = f.ally!;
  ally.health = 0;
  ally.status = 'downed';
  ally.downUntil = 10000;
  f.medic.slowUntil = f.g.combatTick + 100;
  const first = f.begin(f.medic, Math.PI);
  assert.equal(sound(f.until(first), 'dose').length, 1);
  assert(f.medic.healing > 0 && f.medic.slowUntil > f.g.combatTick);
  assert.equal(ally.status, 'downed');
  assert.equal(f.medic.selfRevives, 0);
  assert.equal(f.medic.shield, 0);
});

test('Steady Step follows an ally with actual walking and two remaining doses on the original clock', () => {
  for (const fitted of [undefined, 'step'] as const) {
    const f = fixture({ fitted, allies: 1 });
    const ally = f.ally!;
    ally.x = f.medic.x + 96;
    f.wound(ally, 75);
    const first = f.begin(ally);
    f.until(first);
    const recovery = f.medic.qAt;
    const walked = f.until(first + 4, { medic: { moveX: 1 }, ally: { moveX: 1 } });
    same(ally.x - f.medic.x, 96);
    if (fitted) {
      assert.equal(sound(walked, 'step').length, 1);
      assert(f.state()!.walked > 25 && f.state()!.walked <= fieldDressingRules.stepDistance);
    } else assert(!f.state());
    assert.equal(sound(f.until(first + 2 * fieldDressingRules.doseTicks), 'dose').length, fitted ? 2 : 0);
    assert.equal(f.medic.qAt, recovery);
  }
});

test('Steady Step beyond the total allowance spends movement and ends the remaining treatment', () => {
  const f = fixture({ fitted: 'step' });
  f.wound(f.medic, 65);
  const first = f.begin();
  f.until(first);
  const recovered = f.medic.healing, recovery = f.medic.qAt;
  f.until(first + 14, { medic: { moveX: 1 } });
  assert(f.medic.x - f.at.x > fieldDressingRules.stepDistance);
  assert(!f.state());
  assert.equal(f.medic.healing, recovered);
  assert.equal(f.medic.qAt, recovery);
});

test('Set Aside allows a paid primary and retains only one later dose and the same patient', () => {
  const f = fixture({ fitted: 'aside', allies: 1 });
  const ally = f.ally!;
  f.wound(ally, 70);
  const first = f.begin(ally);
  f.until(first);
  const recovery = f.medic.qAt, before = f.medic.ammo;
  assert.equal(sound(f.step({ medic: { technique1: true } }), 'hold').length, 1);
  const heldUntil = f.state()!.holdingUntil;
  assert.equal(heldUntil - f.g.combatTick, fieldDressingRules.holdTicks);
  assert.equal(f.g.kitStatus(f.medic.id).fieldDressing?.phase, 'held');
  f.step({ medic: { moveY: 1, fire: true, aim: Math.PI } });
  assert.equal(f.medic.ammo, before - 1);
  assert.equal(sound(f.until(first + 16), 'dose').length, 0);
  const resumed = f.step({ medic: { technique1: true, aim: Math.PI } });
  assert.equal(sound(resumed, 'resume').length, 1);
  assert.equal(sound(resumed, 'dose').length, 1);
  assert.equal(f.treatmentCues()[0].patient, ally.id);
  assert.equal(f.medic.qAt, recovery);
  assert(!f.state());
});

test('blocked Set Aside resumption preserves the original deadline and the charged first dose', () => {
  const f = fixture({ fitted: 'aside', allies: 1 });
  f.wound(f.ally!, 65);
  f.until(f.begin(f.ally!));
  f.step({ medic: { technique1: true } });
  const deadline = f.state()!.holdingUntil, placed = f.medic.healing;
  f.arena.obstacles.push({ x: f.at.x + 29, y: f.at.y - 24, width: 10, height: 48 });
  f.step({ medic: { technique1: true } });
  assert.equal(f.state()!.holdingUntil, deadline);
  f.until(deadline - 1);
  f.arena.obstacles = [];
  assert.equal(sound(f.step({ medic: { technique1: true } }), 'dose').length, 0);
  assert.equal(f.medic.healing, placed);
  assert(!f.state());
});

test('Tie Off trades the third dose for a real primary round while the original second dose settles', () => {
  for (const allies of [0, 1] as const) {
    const f = fixture({ fitted: 'tie', allies });
    const patient = f.ally ?? f.medic;
    f.wound(patient, 68);
    const first = f.begin(patient);
    f.until(first);
    const paid = f.medic.qAt, ammo = f.medic.ammo, health = patient.health;
    assert.equal(sound(f.step({ medic: { moveY: 1 } }), 'step').length, 1);
    assert(f.g.kitStatus(f.medic.id).fieldDressing?.canTie);
    assert.equal(sound(f.step({ medic: { moveY: 1, technique1: true } }), 'tie').length, 1);
    const before = viewOf(f.g, patient.id);
    const knot = before.classCues.find(cue => cue.kind === 'medic-dressing-knot');
    assert(knot?.patient === patient.id && knot.owner === f.medic.id && knot.radius === 24);
    assert.equal(knot.until, first + 6);
    if (f.ally) assert.equal(before.players.find(player => player.id === f.medic.id)?.kit.fieldDressing, undefined);
    assert.equal(f.g.kitStatus(f.medic.id).fieldDressing?.ready, false);
    assert.equal(sound(f.step({ medic: { fire: true } }), 'dose').length, 0);
    assert.equal(f.medic.ammo, ammo - 1);
    assert.deepEqual(f.g.classCues().find(cue => cue.kind === 'medic-dressing-knot'), knot);
    assert.equal(patient.health, health);
    assert.equal(sound(f.until(first + 6), 'dose').length, 1);
    assert(patient.health > health && !f.state());
    assert.equal(sound(f.until(first + 12), 'dose').length, 0);
    assert.equal(f.medic.qAt, paid);
  }
});

test('Movement bound, reach and removal cancel a tied dose and erase its shared anchor', () => {
  for (const cause of ['leave', 'wall', 'disconnect', 'ownership'] as const) {
    const f = fixture({ fitted: 'tie', allies: 1 });
    const patient = f.ally!;
    f.wound(patient, 68);
    const first = f.begin(patient);
    f.until(first);
    f.step({ medic: { moveY: 1 } });
    f.step({ medic: { moveY: 1, technique1: true } });
    const before = patient.health, paid = f.medic.qAt;
    assert.equal(f.g.kitStatus(f.medic.id).fieldDressing?.phase, 'tied');
    if (cause === 'wall') f.arena.obstacles.push({ x: f.medic.x + 30, y: f.at.y - 24, width: 8, height: 90 });
    if (cause === 'disconnect') f.g.setConnected(patient.id, false);
    if (cause === 'ownership') f.medic.skills = f.medic.skills.filter(skill => skill !== fieldSurgeryIds.tie);
    const events = f.until(first + 6, cause === 'leave' ? { ally: { dodge: true, moveY: 1 } } : {});
    assert.equal(sound(events, 'dose').length, 0, cause);
    assert.equal(patient.health, before, cause);
    assert.equal(f.medic.qAt, paid);
    assert(!f.state());
    assert(!f.g.classCues().some(cue => cue.kind === 'medic-dressing-knot'));
  }
});

test('A real raid pull cancels the paid Steady Step alongside ordinary walk input', () => {
  const f = fixture({ fitted: 'tie' });
  f.wound(f.medic, 68);
  const first = f.begin();
  f.until(first);
  const m = f.medic, paid = m.qAt, x = m.x, health = m.health;
  f.g['director'].raids['shapes'].push({
    kind: 'raid-lane', style: 'pull', id: 65_001, x1: m.x - 60, y1: m.y, x2: m.x + 60, y2: m.y,
    width: 90, damage: 0, forceX: 45, forceY: 0, disabled: false, dependencies: [], index: 0,
    at: first + 1, until: first + 4,
  });
  assert.equal(sound(f.step({ medic: { moveY: 1 } }), 'stop').length, 1);
  assert(m.x > x + 1);
  assert.equal(m.health, health);
  assert.equal(m.qAt, paid);
  assert(!f.state());
});

test('Wrapped Dressing pauses accrued preparation through a primary shot and resumes with the original patient', () => {
  for (const allies of [0, 1] as const) {
    const f = fixture({ fitted: 'wrap', allies });
    const patient = f.ally ?? f.medic;
    f.wound(patient, 68);
    const first = f.begin(patient);
    f.until(first - 9);
    const health = patient.health, ammo = f.medic.ammo;
    assert(f.g.kitStatus(f.medic.id).fieldDressing?.canWrap);
    assert.equal(sound(f.step({ medic: { technique1: true } }), 'wrap').length, 1);
    const wrapped = f.g.kitStatus(f.medic.id).fieldDressing!;
    assert(wrapped.phase === 'wrapped' && wrapped.nextAt === f.g.combatTick + 24);
    assert.equal(f.medic.qAt, 0);
    assert.equal(f.g.classCues().length, 0);
    const x = f.medic.x;
    f.step({ medic: { fire: true, moveX: -1 } });
    assert(f.medic.x < x && f.medic.ammo === ammo - 1);
    assert.equal(sound(f.until(first + 4), 'dose').length, 0);
    assert.equal(patient.health, health);
    assert.equal(f.medic.qAt, 0);
    assert.equal(sound(f.step({ medic: { technique1: true } }), 'resume').length, 1);
    const resumed = f.g.kitStatus(f.medic.id).fieldDressing!;
    assert(resumed.phase === 'preparing' && resumed.patient === patient.id);
    assert.equal(resumed.startedAt, f.g.combatTick - 8);
    assert.equal(resumed.nextAt, f.g.combatTick + 8);
    assert.equal(f.medic.qAt, 0);
    assert.equal(sound(f.until(resumed.nextAt!), 'dose').length, 1);
    assert(patient.health > health && f.medic.qAt > f.g.combatTick);
    assert.equal(sound(f.until(resumed.nextAt! + 12), 'dose').length, 2);
    assert(!f.state());
  }
});

test('An early wrap cancels normally and an expired wrapped preparation pays no Q recovery', () => {
  const early = fixture({ fitted: 'wrap' });
  early.wound(early.medic, 62);
  early.begin();
  assert.equal(sound(early.step({ medic: { technique1: true } }), 'stop').length, 1);
  assert.equal(early.medic.qAt, 0);
  const expired = fixture({ fitted: 'wrap' });
  expired.wound(expired.medic, 62);
  const first = expired.begin();
  expired.until(first - 9);
  expired.step({ medic: { technique1: true } });
  const end = expired.state()!.holdingUntil;
  expired.until(end - 1);
  const events = expired.step({ medic: { technique1: true } });
  assert.equal(sound(events, 'stop').length, 1);
  assert.equal(sound(events, 'dose').length, 0);
  assert.equal(expired.medic.qAt, 0);
  assert(!expired.state());
});
