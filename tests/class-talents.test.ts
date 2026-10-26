import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, data, type Player } from '../src/shared/game.ts';
import {
  HZ,
  idleInput,
  PROTOCOL,
  type ClassId,
  type InputFrame,
  type Shot,
} from '../src/shared/protocol.ts';
import { hasTalent, talentForSkill } from '../src/shared/class-talents.ts';
import { constructHit } from '../src/shared/class-kits.ts';
import { Prediction } from '../src/client/prediction.ts';
import { viewOf } from '../src/shared/view.ts';
import { distance } from '../src/shared/geometry.ts';
const steps = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
const close = (a: number, b: number) =>
  assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function purchase(g: Game, p: Player, lane: number, depth = 3) {
  const phase = g.phase;
  g.phase = 'lobby';
  p.totalSp = 27;
  const cl = data.classes.find((c) => c.id === p.classId)!;
  const nodes = data.skills
    .filter(
      (s) =>
        s.classId === p.classId &&
        s.branchId === cl.branches[1].id &&
        s.lane === lane &&
        s.depth <= depth,
    )
    .sort((a, b) => a.depth - b.depth);
  for (const s of nodes)
    if (!p.skills.includes(s.id))
      assert(
        g.transact(p.id, { id: s.id, kind: 'skill', item: s.id }).ok,
        s.id,
      );
  g.phase = phase;
  return nodes;
}
function fixture(
  classId: ClassId,
  lane: number,
  party = 1,
  difficulty = 'normal',
  depth = 3,
) {
  const g = new Game({
    difficulty,
    maxPlayers: Math.max(2, party),
    mode: 'endless',
    seed: 41,
  });
  const p = g.addPlayer('p', 'Survivor', classId);
  purchase(g, p, lane, depth);
  for (let i = 1; i < party; i++) g.addPlayer('a' + i, 'Ally ' + i, 'soldier');
  g.start();
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.maxHealth = g.boss.health = 1e6;
  g.boss.x = 800;
  g.boss.y = 300;
  for (const a of g.players.values()) {
    a.x = a.oldX = 800;
    a.y = a.oldY = 700;
    a.invulnerableUntil = 1e9;
  }
  return { g, p };
}
function press(g: Game, action: Partial<InputFrame>, id = 'p') {
  const p = g.players.get(id)!;
  g.submitInput(id, {
    ...idleInput(),
    sequence: p.ack + 1,
    aim: -Math.PI / 2,
    ...action,
  });
  g.step();
}
function owned(g: Game, p: Player) {
  return [...g.shots.values()].filter((s) => s.owner === p.id);
}
function hostile(
  g: Game,
  point: { x: number; y: number },
  angle: number,
  damage: number,
) {
  return (Reflect.get(g, 'emitShot') as Function).call(
    g,
    'hostile',
    point.x,
    point.y,
    angle,
    6000,
    damage,
    3,
  ) as Shot;
}
test('21 transformations are legal six-SP depth-three purchases with stable IDs and prerequisites', () => {
  assert.equal(data.skills.length, 378);
  const transformed = data.skills.filter((s) => 'transform' in s);
  assert.equal(transformed.length, 21);
  assert.equal(new Set(transformed.map((s) => talentForSkill(s.id))).size, 21);
  for (const cl of data.classes) {
    const g = new Game(),
      p = g.addPlayer('p', 'Survivor', cl.id as ClassId);
    const nodes = transformed.filter((s) => s.classId === cl.id);
    assert.equal(nodes.length, 3);
    assert.deepEqual(nodes.map((s) => s.lane).sort(), [0, 1, 2]);
    for (const s of nodes) {
      assert.equal(s.depth, 3);
      assert.equal(s.capstone, false);
      assert.equal(s.cost, 3);
      assert(s.prerequisite);
    }
    const path = purchase(g, p, 0);
    assert.equal(
      path.reduce((n, s) => n + s.cost, 0),
      6,
    );
    assert(hasTalent(p, talentForSkill(path[2].id)!));
  }
});
test('Breach Cadence emits three real delayed shots on the locked aim with unchanged damage budget', () => {
  const { g, p } = fixture('soldier', 0),
    ability = g.stats(p).ability,
    before = g.boss.health;
  press(g, { e: true });
  assert.equal(owned(g, p).length, 1);
  const first = owned(g, p)[0];
  press(g, { aim: 0 });
  steps(g, 2);
  assert.equal(owned(g, p).length, 1);
  g.step();
  assert.equal(owned(g, p).length, 2);
  steps(g, 4);
  assert.equal(owned(g, p).length, 3);
  for (const s of owned(g, p)) close(s.vx, first.vx);
  close(
    owned(g, p).reduce((n, s) => n + s.damage, 0),
    45 * ability,
  );
  steps(g, 20);
  close(before - g.boss.health, 45 * ability);
});
test('Marching Colors follows authority and prediction beyond the original rally location', () => {
  const { g, p } = fixture('soldier', 2);
  press(g, { q: true });
  const field = g.fields[0];
  assert.equal(field.anchor, p.id);
  close(field.radius, 170 * (1 + (g.stats(p).effects.rallyRadius ?? 0)) * 0.75);
  const prediction = new Prediction(),
    view = viewOf(g, p.id);
  prediction.acknowledge(view, p.id);
  for (let i = 0; i < 60; i++) {
    const input = { ...idleInput(), sequence: p.ack + 1, moveY: 1 };
    prediction.submit(input, view);
    g.submitInput(p.id, input);
    g.step();
  }
  assert(p.y > 950);
  close(prediction.player!.y, p.y);
  close(field.y, p.y);
});
test('Supply Line has a weaker field and refills only present allies a second time at midpoint', () => {
  const { g, p } = fixture('soldier', 1, 3),
    inside = g.players.get('a1')!,
    outside = g.players.get('a2')!;
  outside.x = 1300;
  p.ammo = inside.ammo = outside.ammo = 0;
  press(g, { ultimate: true });
  const field = g.fields[0];
  assert(p.ammo > 0 && inside.ammo > 0);
  assert.equal(outside.ammo, 0);
  close(
    field.potency,
    0.25 * (1 + (g.stats(p).effects.ultimatePotency ?? 0)) * g.stats(p).ability,
  );
  p.ammo = inside.ammo = 0;
  const at = 1 + Math.floor((field.until - 1) / 2);
  steps(g, at - g.combatTick - 1);
  assert.equal(p.ammo, 0);
  g.step();
  assert(p.ammo > 0 && inside.ammo > 0);
  assert.equal(outside.ammo, 0);
});
test('Split Suppression creates two narrow cones, a central gap, real slow and the same total pellet damage', () => {
  const { g, p } = fixture('heavy', 2);
  press(g, { q: true });
  const shots = owned(g, p);
  assert.equal(shots.length, 14);
  close(
    shots.reduce((n, s) => n + s.damage, 0),
    45 * g.stats(p).ability,
  );
  for (const s of shots) {
    const delta =
      (Math.abs(Math.atan2(s.vy, s.vx) + Math.PI / 2) * 180) / Math.PI;
    assert(delta >= 14.9 && delta <= 37.1);
  }
  const s = shots[0],
    length = Math.hypot(s.vx, s.vy);
  const actor = g.spawnMinion({
    kind: 'ordinary',
    x: p.x + (s.vx / length) * 100,
    y: p.y + (s.vy / length) * 100,
    radius: 10,
    speed: 0,
    health: 100,
    damage: 0,
  })!;
  steps(g, 4);
  assert(actor.health < 100);
  assert.equal(actor.slowMultiplier, 0.6);
  assert(actor.slowUntil > g.combatTick);
});
test('Shoulder Mantlet follows aim, takes finite projectile damage and trades body armor for its front wall', () => {
  const { g, p } = fixture('heavy', 0);
  press(g, { e: true });
  const wall = g.classKits.constructs()[0];
  close(wall.health, 80 * g.stats(p).ability);
  assert.equal(wall.halfSpan, 65);
  press(g, { moveX: 1, aim: 0 });
  close(wall.x, p.x + 65);
  close(wall.aim, 0);
  const hp = wall.health;
  hostile(g, { x: wall.x + 80, y: wall.y }, Math.PI, 10);
  g.step();
  close(wall.health, hp - 10);
  p.invulnerableUntil = 0;
  const before = p.health,
    s = g.stats(p);
  g.damage(p, 20);
  close(before - p.health, 20 * (1 - s.armor) * (1 - 0.25 * s.ability));
  hostile(g, { x: wall.x + 80, y: wall.y }, Math.PI, 1000);
  g.step();
  assert.equal(g.classKits.constructs().length, 0);
});
test('Furnace Vents schedules short-lived rings only during Overdrive', () => {
  const { g, p } = fixture('heavy', 1);
  press(g, { ultimate: true });
  assert.equal(owned(g, p).length, 0);
  steps(g, 29);
  assert.equal(owned(g, p).length, 0);
  g.step();
  assert.equal(owned(g, p).length, 8);
  close(
    owned(g, p).reduce((n, s) => n + s.damage, 0),
    30 * (1 + (g.stats(p).effects.ultimatePotency ?? 0)),
  );
  assert(
    g
      .classCues()
      .some((c) => c.kind === 'talent-area' && c.talent === 'furnace-vents'),
  );
  steps(g, 22);
  assert.equal(owned(g, p).length, 0);
  steps(g, 38);
  assert.equal(owned(g, p).length, 8);
  steps(g, 8 * HZ);
  assert.equal(owned(g, p).length, 0);
  assert.equal(g.transforms.cues().length, 0);
});
test('Cornerstone creates two angled half-length finite walls with matching swept collision', () => {
  const { g, p } = fixture('tank', 2);
  press(g, { q: true });
  const walls = g.classKits.constructs();
  assert.equal(walls.length, 2);
  close(
    walls.reduce((n, w) => n + w.health, 0),
    150 * g.stats(p).ability * (1 + (g.stats(p).effects.barrierHealth ?? 0)),
  );
  for (const w of walls) {
    assert.equal(w.halfSpan, 55);
    assert(
      constructHit({ x: w.x - 200, y: w.y }, { x: w.x + 200, y: w.y }, w, 3) !==
        null,
    );
    const c = Math.cos(w.aim),
      s = Math.sin(w.aim),
      point = { x: w.x - s * 90, y: w.y + c * 90 };
    assert.equal(constructHit(point, point, w, 0), null);
  }
});
test('Wake Guard leaves a two-second departure wall without replacing the ordinary Q wall', () => {
  const { g, p } = fixture('tank', 0);
  press(g, { q: true });
  const start = { x: p.x, y: p.y };
  press(g, { e: true });
  const wake = g.classKits.constructs().find((w) => w.source === 'wake')!;
  assert(wake);
  close(wake.x, start.x);
  close(wake.y, start.y);
  close(wake.health, 80 * g.stats(p).ability);
  assert.equal(wake.until - wake.at, 2 * HZ);
  assert.equal(g.classKits.constructs().length, 2);
  steps(g, 10);
  assert(p.y < start.y);
  close(wake.y, start.y);
  steps(g, 2 * HZ);
  assert(!g.classKits.constructs().includes(wake));
});
test('Procession follows its owner, admits late allies once and cannot refill shields by leaving and returning', () => {
  const { g, p } = fixture('tank', 1, 2),
    ally = g.players.get('a1')!;
  ally.x = 1300;
  press(g, { ultimate: true });
  const shield = 90 * (1 + (g.stats(p).effects.ultimatePotency ?? 0));
  close(g.classKits.status(p.id, g.combatTick).shield, shield);
  assert.equal(g.classKits.status(ally.id, g.combatTick).shield, 0);
  p.x = 1000;
  ally.x = 1000;
  g.step();
  close(g.classKits.status(ally.id, g.combatTick).shield, shield);
  g.classKits.shieldHit(ally.id, 30, g.combatTick);
  ally.x = 1400;
  steps(g, 8);
  assert.equal(g.classKits.status(ally.id, g.combatTick).armor, 0);
  ally.x = 1000;
  g.step();
  close(g.classKits.status(ally.id, g.combatTick).shield, shield - 30);
  const cue = g.transforms.cues().find((c) => c.talent === 'procession')!;
  close(cue.x, p.x);
  steps(g, 8 * HZ);
  assert.equal(g.classKits.status(ally.id, g.combatTick).shield, 0);
});
test('Field Triage anchors healing on the injured ally and retains reduced radius while moving', () => {
  const { g, p } = fixture('medic', 2, 2),
    ally = g.players.get('a1')!;
  ally.health = 20;
  ally.x = 980;
  press(g, { q: true });
  const f = g.fields[0];
  assert.equal(f.anchor, ally.id);
  close(f.radius, 105);
  ally.x = 1100;
  const before = ally.health;
  g.step();
  close(f.x, 1100);
  assert(ally.health > before);
  assert(p.healing > 0);
  p.status = 'downed';
  p.downUntil = 1e9;
  g.step();
  assert(!g.fields.includes(f));
});
test('Serum Relay heals and cleanses three unique targets through a chain beyond the old radius', () => {
  const { g, p } = fixture('medic', 0, 5);
  p.x = 800;
  p.health = p.maxHealth;
  for (let i = 1; i <= 4; i++) {
    const a = g.players.get('a' + i)!;
    a.x = 800 - i * 120;
    a.health = 20;
    a.slowUntil = 1e9;
  }
  press(g, { e: true });
  const amount = 20 * g.stats(p).ability;
  for (let i = 1; i <= 3; i++) {
    const a = g.players.get('a' + i)!;
    close(a.health, 20 + amount);
    assert.equal(a.slowUntil, 0);
  }
  assert.equal(g.players.get('a4')!.health, 20);
  assert.equal(
    g.transforms.cues().filter((c) => c.kind === 'talent-link').length,
    3,
  );
});
test('Second Breath spreads healing into three pulses and still gives Normal 25% revival with none on Hard', () => {
  for (const difficulty of ['normal', 'hard']) {
    const { g, p } = fixture('medic', 1, 3, difficulty),
      alive = g.players.get('a1')!,
      down = g.players.get('a2')!;
    alive.health = 10;
    down.health = 0;
    down.status = 'downed';
    down.downUntil = 1e9;
    press(g, { ultimate: true });
    steps(g, HZ);
    const potency = 1 + (g.stats(p).effects.ultimatePotency ?? 0),
      heal = g.difficulty.healing;
    close(alive.health, 10 + 24 * potency * heal);
    assert.equal(down.status, difficulty === 'normal' ? 'active' : 'downed');
    if (difficulty === 'normal') close(down.health, down.maxHealth * 0.25);
    steps(g, 3 * HZ);
    close(alive.health, 10 + 42 * potency * heal);
    if (difficulty === 'hard') assert.equal(down.status, 'downed');
  }
});
test('Ward Echo delivers 40 then 25 at a locked point while keeping the finite allied shield', () => {
  const { g, p } = fixture('mage', 0);
  g.boss.y = 500;
  const before = g.boss.health;
  press(g, { e: true });
  close(before - g.boss.health, 40 * g.stats(p).ability);
  p.x = 1000;
  steps(g, 22);
  close(before - g.boss.health, 40 * g.stats(p).ability);
  g.step();
  close(before - g.boss.health, 65 * g.stats(p).ability);
});
test('Twin Sigils makes two smaller centers with half burst damage and separate persistent slow regions', () => {
  const { g, p } = fixture('mage', 2);
  g.boss.y = 200;
  press(g, { q: true });
  const sigils = g.classKits.cues().filter((c) => c.kind === 'sigil');
  assert.equal(sigils.length, 2);
  close(distance(sigils[0], sigils[1]), 170);
  for (const s of sigils)
    close(s.radius, 80 * (1 + (g.stats(p).effects.sigilRadius ?? 0)));
  const actors = sigils.map((s) =>
    g.spawnMinion({
      kind: 'ordinary',
      x: s.x,
      y: s.y,
      radius: 9,
      speed: 0,
      health: 100,
      damage: 0,
    })!,
  );
  g.step();
  assert(actors.every((a) => a.slowMultiplier === 0.45));
  p.qAt = 0;
  press(g, { q: true });
  for (const a of actors) close(a.health, 100 - 17.5 * g.stats(p).ability);
});
test('Orbit Requiem uses three actual moving pulse centers and splits the original pulse budget', () => {
  const { g, p } = fixture('mage', 1);
  g.boss.x = p.x;
  g.boss.y = p.y;
  const before = g.boss.health;
  press(g, { ultimate: true });
  const first = g.transforms.cues().filter((c) => c.talent === 'orbit-requiem');
  assert.equal(first.length, 3);
  assert(first.every((c) => Math.abs(distance(c, p) - 140) < 1e-6));
  const pulseDamage = before - g.boss.health;
  assert(
    pulseDamage > 0 &&
      pulseDamage <= 120 * (1 + (g.stats(p).effects.ultimatePotency ?? 0)),
  );
  p.x = 1000;
  steps(g, HZ);
  const next = g.transforms.cues().filter((c) => c.talent === 'orbit-requiem');
  assert.equal(next.length, 3);
  assert(next.every((c) => Math.abs(distance(c, p) - 140) < 1e-6));
  steps(g, 3 * HZ);
  assert.equal(g.transforms.cues().length, 0);
});
test('Crossfire Pair halves each turret health and damage and assigns distinct near/far target preferences', () => {
  const { g, p } = fixture('engineer', 2);
  const actor = g.spawnMinion({
    kind: 'ordinary',
    x: 800,
    y: 530,
    radius: 10,
    speed: 0,
    health: 1000,
    damage: 0,
  })!;
  press(g, { q: true });
  const pair = g.classKits.constructs().filter((c) => c.kind === 'turret');
  assert.equal(pair.length, 2);
  assert(pair.some((c) => c.farAim));
  for (const t of pair) close(t.health, 40 * g.stats(p).ability);
  const shots = owned(g, p);
  assert.equal(shots.length, 2);
  assert(
    Math.abs(
      Math.atan2(shots[0].vy, shots[0].vx) -
        Math.atan2(shots[1].vy, shots[1].vx),
    ) > 0.01,
  );
  steps(g, HZ);
  assert(actor.health < 1000 && g.boss.health < 1e6);
  p.qAt = 0;
  press(g, { q: true });
  assert.equal(g.classKits.constructs().length, 2);
});
test('Return Current stores only absorbed HP damage and releases at most 72 nearby damage once', () => {
  const { g, p } = fixture('engineer', 0);
  press(g, { e: true });
  const wall = g.classKits.constructs()[0];
  g.boss.y = wall.y - 80;
  hostile(g, { x: wall.x, y: wall.y - 100 }, Math.PI / 2, 60);
  g.step();
  hostile(g, { x: wall.x, y: wall.y - 100 }, Math.PI / 2, 60);
  g.step();
  close(wall.absorbed!, 120);
  const before = g.boss.health;
  steps(g, wall.until - g.combatTick);
  close(before - g.boss.health, 72);
  steps(g, 10);
  close(before - g.boss.health, 72);
});
test('Foundry Relay is a finite moving siege body with 160 base health and 160 pixels-per-second speed', () => {
  const { g, p } = fixture('engineer', 1);
  press(g, { ultimate: true });
  const siege = g.classKits.constructs().find((c) => c.kind === 'siege')!;
  close(siege.health, 160 * (1 + (g.stats(p).effects.ultimatePotency ?? 0)));
  assert(siege.mobile);
  p.x = 1000;
  const from = { x: siege.x, y: siege.y };
  g.step();
  assert(distance(from, siege) > 0);
  assert(distance(from, siege) <= 160 / HZ + 1e-6);
  const before = g.boss.health;
  steps(g, 2 * HZ);
  assert(g.boss.health < before);
  p.status = 'downed';
  p.downUntil = 1e9;
  g.step();
  assert(!g.classKits.constructs().includes(siege));
});
test('Decoy Veil attracts actual targeting and absorbs projectiles without entering the player roster', () => {
  const { g, p } = fixture('assassin', 2);
  press(g, { q: true });
  const decoy = g.classKits.constructs().find((c) => c.kind === 'decoy')!;
  assert(decoy);
  assert.equal(decoy.health, 60);
  assert.equal(
    decoy.until - decoy.at,
    Math.ceil(4 * (1 + (g.stats(p).effects.veilDuration ?? 0)) * HZ),
  );
  p.x = 1000;
  const targets = (Reflect.get(g, 'aimTargets') as Function).call(
    g,
  ) as Player[];
  assert.equal(targets.length, 1);
  assert.equal(targets[0].id, 'decoy:' + decoy.id);
  assert.equal(g.players.size, 1);
  assert.equal(viewOf(g, p.id).players.length, 1);
  hostile(g, { x: decoy.x - 80, y: decoy.y }, 0, 35);
  g.step();
  assert.equal(decoy.health, 25);
  hostile(g, { x: decoy.x - 80, y: decoy.y }, 0, 35);
  g.step();
  assert.equal(g.classKits.constructs().length, 0);
  assert.equal((Reflect.get(g, 'aimTargets') as Function).call(g).length, 0);
});
test('Aftercut splits actual path damage 60/40 and holds the delayed sweep at the original path', () => {
  const { g, p } = fixture('assassin', 0);
  g.boss.y = 600;
  const before = g.boss.health,
    damage = 50 * g.stats(p).ability;
  press(g, { e: true });
  close(before - g.boss.health, damage * 0.6);
  p.x = 1000;
  steps(g, 13);
  close(before - g.boss.health, damage * 0.6);
  g.step();
  close(before - g.boss.health, damage);
});
test('Unwritten Traps trades duration and a charge for three real departure pulses', () => {
  const { g, p } = fixture('assassin', 1);
  p.eAt = 1e9;
  press(g, { ultimate: true });
  const state = g.classKits.status(p.id, g.combatTick);
  assert.equal(state.stepCharges, 2);
  assert.equal(state.passageUntil - g.combatTick, Math.ceil(3.5 * HZ));
  g.boss.y = p.y;
  const before = g.boss.health,
    damage = 20 * (1 + (g.stats(p).effects.ultimatePotency ?? 0));
  press(g, { e: true });
  const sweep = 100 * (1 + (g.stats(p).effects.ultimatePotency ?? 0));
  close(before - g.boss.health, sweep + damage);
  assert.equal(g.classKits.status(p.id, g.combatTick).stepCharges, 1);
  steps(g, 39);
  close(before - g.boss.health, sweep + 3 * damage);
  steps(g, 4 * HZ);
  assert.equal(g.classKits.status(p.id, g.combatTick).stepCharges, 0);
});
test('scheduled talent damage and cues stop when their owner is down or the encounter ends', () => {
  const { g, p } = fixture('mage', 0, 2);
  g.boss.y = 500;
  press(g, { e: true });
  const before = g.boss.health;
  p.status = 'downed';
  p.downUntil = 1e9;
  steps(g, HZ);
  assert.equal(g.boss.health, before);
  assert.equal(g.transforms.cues().length, 0);
  const b = fixture('heavy', 1);
  press(b.g, { ultimate: true });
  b.g.boss.health = 0;
  b.g.step();
  steps(b.g, 4 * HZ);
  assert.equal(b.g.transforms.cues().length, 0);
  assert.equal(b.g.shots.size, 0);
});
test('issued protocol-17 local saves retain skill node ownership and progression under protocol 19', () => {
  const { g, p } = fixture('soldier', 0);
  g.phase = 'lobby';
  g.encounter = 9;
  p.coins = 901;
  const save = g.offlineCheckpoint()!;
  save.protocolVersion = 17;
  save.contentRevision =
    'd4419d906f67286576ca3f6795e03a921269aff861b36e2e82ce68aa2e501775';
  const restored = Game.restoreOffline(save),
    after = [...restored.players.values()][0];
  assert.equal(PROTOCOL, 19);
  assert.equal(after.coins, 901);
  assert.deepEqual(after.skills, p.skills);
  assert(hasTalent(after, 'breach-cadence'));
  assert.throws(
    () => Game.restoreOffline({ ...save, serverOnly: true }),
    /versionMismatch/,
  );
});
test('every talent has authored names and behavior help in all fifteen locales', () => {
  const talents = data.skills.map((s) => talentForSkill(s.id)).filter(Boolean);
  for (const locale of data.locales) {
    const text = JSON.parse(
      readFileSync('locales/' + locale.id + '.json', 'utf8'),
    ).messages;
    for (const id of talents) {
      assert(text['talent.' + id + '.name']);
      assert(text['talent.' + id + '.description']);
    }
  }
});

test('Furnace Vents uses the advertised lower primary-fire bonus during the real weapon cadence', () => {
  const { g, p } = fixture('heavy', 1);
  press(g, { ultimate: true });
  p.fireAt = g.combatTick + 1;
  press(g, { fire: true });
  const weapon = data.weapons.find((w) => w.id === p.weapon)!,
    s = g.stats(p),
    rate = Math.min(
      2.5,
      s.fireRate * (1 + 0.4 * (1 + (s.effects.ultimatePotency ?? 0))),
    );
  close(p.fireAt - g.combatTick, HZ / (weapon.fireRate * rate));
});
test('class transformation paths retain the existing turret and ultimate capstones', () => {
  const e = fixture('engineer', 0, 1, 'normal', 6);
  purchase(e.g, e.p, 2);
  press(e.g, { q: true });
  e.p.qAt = 0;
  press(e.g, { q: true });
  assert.equal(
    e.g.classKits.constructs().filter((c) => c.kind === 'turret').length,
    4,
  );
  const a = fixture('assassin', 0, 1, 'normal', 6);
  purchase(a.g, a.p, 1);
  press(a.g, { ultimate: true });
  assert.equal(a.g.classKits.status(a.p.id, a.g.combatTick).stepCharges, 3);
});
test('Return Current cancels on replacement, clips overkill and stops if its owner is down', () => {
  const { g, p } = fixture('engineer', 0, 2);
  press(g, { e: true });
  let wall = g.classKits.constructs()[0];
  g.classKits.hitConstruct(wall.id, 60);
  g.boss.y = wall.y - 50;
  const before = g.boss.health;
  p.eAt = 0;
  press(g, { e: true });
  assert.equal(g.boss.health, before);
  wall = g.classKits.constructs()[0];
  g.classKits.hitConstruct(wall.id, 1e6);
  g.step();
  close(before - g.boss.health, 72);
  p.eAt = 0;
  press(g, { e: true });
  wall = g.classKits.constructs()[0];
  g.classKits.hitConstruct(wall.id, 1e6);
  p.status = 'downed';
  p.downUntil = 1e9;
  const after = g.boss.health;
  g.step();
  assert.equal(g.boss.health, after);
});
test('ordinary enemy contact damages the finite decoy through its target adapter', () => {
  const { g, p } = fixture('assassin', 2);
  press(g, { q: true });
  const decoy = g.classKits.constructs()[0];
  p.x = 1100;
  g.spawnMinion({
    kind: 'ordinary',
    x: decoy.x,
    y: decoy.y,
    radius: 12,
    speed: 0,
    health: 100,
    damage: 25,
  });
  g.step();
  assert.equal(decoy.health, 35);
  assert.equal(p.health, p.maxHealth);
});
test('transformation jobs remain bounded and are cancelled by disconnecting before release', () => {
  const { g, p } = fixture('mage', 0, 2);
  for (let i = 0; i < 90; i++) {
    p.eAt = 0;
    press(g, { e: true });
  }
  const pending = Reflect.get(g.transforms, 'tasks') as unknown[];
  assert(pending.length <= 64);
  p.connected = false;
  g.step();
  assert.equal((Reflect.get(g.transforms, 'tasks') as unknown[]).length, 0);
  assert.equal(g.transforms.cues().length, 0);
});
