import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data, type Player } from '../src/shared/game.ts';
import { idleInput, HZ, type InputFrame, type Shot } from '../src/shared/protocol.ts';
import { swordCircleContact, swordGuardContact } from '../src/shared/sword-geometry.ts';
import rules from '../src/shared/sword-rules.json';
import { viewOf } from '../src/shared/view.ts';

const step = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
function fixture() {
  const g = new Game({ mode: 'endless', maxPlayers: 2, seed: 41 }),
    p = g.addPlayer('p', 'Dara', 'swordsman');
  g.addPlayer('ally', 'Mara', 'soldier');
  g.start();
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.x = 1000;
  g.boss.y = 700;
  for (const a of g.players.values()) {
    a.x = a.oldX = 800;
    a.y = a.oldY = 700;
    a.shield = 0;
    a.invulnerableUntil = 1e9;
  }
  return { g, p };
}
function press(g: Game, input: Partial<InputFrame>) {
  const p = g.players.get('p')!;
  g.submitInput(p.id, {
    ...idleInput(),
    sequence: p.ack + 1,
    aim: 0,
    ...input,
  });
  g.step();
}
function shoot(g: Game, x: number, y: number, angle: number, speed = 1200) {
  return (Reflect.get(g, 'emitShot') as Function).call(
    g,
    'hostile',
    x,
    y,
    angle,
    speed,
    10,
    3,
  ) as Shot;
}
function talent(g: Game, p: Player, lane: number) {
  const phase = g.phase;
  g.phase = 'shop';
  p.totalSp = 27;
  for (const s of data.skills
    .filter(
      (s) =>
        s.classId === 'swordsman' && s.branchId === 'measure' && s.lane === lane && s.depth <= 3,
    )
    .sort((a, b) => a.depth - b.depth))
    assert(g.transact(p.id, { id: s.id, kind: 'skill', item: s.id }).ok);
  g.phase = phase;
}

test('Finite blade sectors reach the correct side and edge, include grazing contact and stop at real cover', () => {
  const p = { x: 0, y: 0 },
    arc = (100 * Math.PI) / 180;
  assert(swordCircleContact(p, 0, 100, arc, { x: 100, y: 0 }, 5));
  assert(!swordCircleContact(p, 0, 100, arc, { x: 120, y: 0 }, 5));
  assert(!swordCircleContact(p, 0, 100, arc, { x: -30, y: 0 }, 5));
  assert(swordCircleContact(p, 0, 100, arc, { x: 60, y: 80 }, 15));
  assert(
    !swordCircleContact(p, 0, 100, arc, { x: 80, y: 0 }, 5, [
      { x: 35, y: -20, width: 10, height: 40 },
    ]),
  );
  assert(swordCircleContact(p, 0, 100, Math.PI * 2, { x: -60, y: 0 }, 5));
});

test('A moving frontal guard catches approaching shots and cannot catch a shot leaving its back', () => {
  const p = { x: 0, y: 0 };
  const hit = swordGuardContact({ x: 100, y: 0 }, { x: -20, y: 0 }, p, p, 0, 3, 30, 38, 3);
  assert(hit !== null && hit > 0 && hit < 1);
  assert.equal(swordGuardContact({ x: -100, y: 0 }, { x: 20, y: 0 }, p, p, 0, 3, 30, 38, 3), null);
  assert.equal(
    swordGuardContact({ x: 100, y: 90 }, { x: -20, y: 90 }, p, p, 0, 3, 30, 38, 3),
    null,
  );
  assert(
    swordGuardContact({ x: 60, y: 0 }, { x: 60, y: 0 }, p, { x: 40, y: 0 }, 0, 3, 30, 38, 3) !==
      null,
  );
});

test('Primary uses real delayed sword contact, spends Breath and emits no disguised ranged projectile', () => {
  const { g, p } = fixture();
  const before = g.boss.health,
    breath = p.ammo;
  press(g, { fire: true });
  assert.equal(p.ammo, breath - 1);
  assert.equal(g.shots.size, 0);
  assert.equal(g.boss.health, before);
  step(g, rules.primaryWindupTicks);
  assert.equal(g.boss.health, before);
  press(g, {});
  p.x = p.oldX = 900;
  p.fireAt = 0;
  press(g, { fire: true });
  assert.equal(g.boss.health, before);
  step(g, rules.primaryWindupTicks);
  assert(g.boss.health < before);
  assert.equal(g.shots.size, 0);
  assert(g.classCues().some((c) => c.kind === 'sword-cut'));
});

test('A cut keeps its committed aim and a dodge cancels it without refunding Breath', () => {
  const { g, p } = fixture();
  p.x = p.oldX = 900;
  const before = g.boss.health,
    breath = p.ammo;
  press(g, { fire: true, aim: Math.PI });
  press(g, { aim: 0 });
  step(g, 3);
  assert.equal(g.boss.health, before);
  p.fireAt = 0;
  press(g, { fire: true });
  press(g, { dodge: true, moveY: 1 });
  step(g, 5);
  assert.equal(g.boss.health, before);
  assert.equal(p.ammo, breath - 2);
});

test('Measured Cut waits, advances through clear space, hits for its own ability budget and grants no invulnerability', () => {
  const { g, p } = fixture();
  p.invulnerableUntil = 0;
  const before = g.boss.health,
    start = p.x;
  press(g, { q: true });
  assert.equal(p.x, start);
  assert.equal(g.movementSpeed(p), 240 * 0.6);
  step(g, rules.measureWindupTicks);
  assert.equal(p.x, start + rules.measureAdvance);
  assert(g.boss.health < before);
  assert.equal(p.invulnerableUntil, 0);
  assert.equal(g.movementSpeed(p), 240);
});

test('The frontal guard removes at most three physical shots, records one nonstacking counter and leaves rear shots alone', () => {
  const { g, p } = fixture();
  press(g, { e: true });
  const front = Array.from({ length: 4 }, (_, i) => shoot(g, 860, 700, Math.PI, 1200 + i));
  const rear = shoot(g, 740, 700, 0);
  step(g, 1);
  assert.equal(front.filter((s) => !g.shots.has(s.id)).length, 3);
  assert(g.shots.has(rear.id));
  assert.equal(g.sword.status(p.id, g.combatTick).guardRemaining, 0);
  assert.equal(g.sword.status(p.id, g.combatTick).counterUntil, g.combatTick + rules.counterTicks);
  assert.equal(viewOf(g, p.id).players[0].kit.guardRemaining, 0);
});

test('Cover and a nearer team barrier win before a guard, so blocked shots cannot farm counters', () => {
  for (const barrier of [false, true]) {
    const { g, p } = fixture();
    press(g, { e: true });
    if (barrier)
      g.fields.push({
        id: 555,
        owner: 'ally',
        kind: 'barrier',
        x: 875,
        y: 700,
        radius: 12,
        until: 1e6,
        potency: 100,
      });
    else
      Object.defineProperty(g, 'obstacles', {
        value: [
          {
            x: 868,
            y: 660,
            width: 10,
            height: 80,
          },
        ],
      });
    const shot = shoot(g, 920, 700, Math.PI);
    step(g, 3);
    assert(!g.shots.has(shot.id));
    assert.equal(g.sword.status(p.id, g.combatTick).counterUntil, 0);
  }
});

test('A real parry opens a stronger next primary attempt; an empty swing spends that opening', () => {
  const { g, p } = fixture();
  press(g, { e: true });
  shoot(g, 860, 700, Math.PI);
  step(g, 2);
  assert(g.sword.status(p.id, g.combatTick).counterUntil > 0);
  press(g, { fire: true, aim: Math.PI });
  assert.equal(g.sword.status(p.id, g.combatTick).counterUntil, 0);
  step(g, 4);
  const cue = g.classCues().find((c) => c.kind === 'sword-cut');
  assert(cue && 'counter' in cue && cue.counter);
});

test('Long Measure supplies three committed cuts, expires and cannot attack by itself', () => {
  const { g, p } = fixture(),
    before = g.boss.health;
  press(g, { ultimate: true });
  step(g, 10);
  assert.equal(g.boss.health, before);
  assert.equal(g.sword.status(p.id, g.combatTick).swordCuts, 3);
  for (let i = 0; i < 3; i++) {
    p.fireAt = 0;
    press(g, { fire: true, aim: Math.PI });
    press(g, {});
    step(g, 4);
  }
  assert.equal(g.sword.status(p.id, g.combatTick).swordCuts, 0);
  step(g, rules.ultimateTicks);
  assert.equal(g.sword.status(p.id, g.combatTick).swordUntil, 0);
});

test('Return Step moves the actual player back after the committed cut without granting a dodge window', () => {
  const { g, p } = fixture();
  talent(g, p, 0);
  const start = p.x;
  p.invulnerableUntil = 0;
  press(g, { q: true });
  step(g, rules.measureWindupTicks);
  assert.equal(p.x, start + 90);
  step(g, rules.returnStepDelayTicks);
  assert.equal(p.x, start + 30);
  assert.equal(p.invulnerableUntil, 0);
  assert.equal(p.dashUntil, 0);
});

test('Open Circle actually changes the empowered sector, and Second Watch exposes its quiet interval with the same shot quota', () => {
  const circle = fixture();
  talent(circle.g, circle.p, 1);
  press(circle.g, { ultimate: true });
  press(circle.g, { fire: true });
  step(circle.g, 4);
  const cue = circle.g.classCues().find((c) => c.kind === 'sword-cut');
  assert(cue && 'arc' in cue);
  assert.equal(cue.arc, Math.PI * 2);
  const split = fixture();
  talent(split.g, split.p, 2);
  press(split.g, { e: true });
  assert(split.g.sword.status(split.p.id, split.g.combatTick).guardActive);
  step(split.g, 6);
  assert(!split.g.sword.status(split.p.id, split.g.combatTick).guardActive);
  step(split.g, 5);
  assert(split.g.sword.status(split.p.id, split.g.combatTick).guardActive);
  assert.equal(split.g.sword.status(split.p.id, split.g.combatTick).guardRemaining, 3);
});

test('Disconnect, incapacitation and host end clear pending cuts, guard and empowered charges', () => {
  for (const end of ['disconnect', 'down', 'host']) {
    const { g, p } = fixture();
    press(g, { q: true, e: true, ultimate: true });
    if (end === 'disconnect') p.connected = false;
    else if (end === 'down') p.status = 'downed';
    else g.endByHost();
    g.step();
    assert.equal(g.sword.cues([...g.players.values()], g.combatTick).length, 0, end);
    assert.equal(g.sword.status(p.id, g.combatTick).swordCuts, 0, end);
  }
});
