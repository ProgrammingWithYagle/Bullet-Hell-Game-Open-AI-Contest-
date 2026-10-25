import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data, arena } from '../src/shared/game.ts';
import { idleInput, validInput } from '../src/shared/protocol.ts';
import { segmentCircle, moveBody } from '../src/shared/geometry.ts';
const quiet = (count = 1) => {
  const g = new Game();
  for (let i = 0; i < count; i++)
    g.addPlayer('p' + i, 'Survivor ' + i, i === 1 ? 'medic' : 'soldier');
  g.start();
  g.boss.staggerUntil = 1e9;
  return g;
};
const advance = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
test('input is finite, bounded, strict and replay-resistant', () => {
  const i = { ...idleInput(), sequence: 1 };
  assert(validInput(i));
  for (const bad of [
    { ...i, moveX: NaN },
    { ...i, aim: Infinity },
    { ...i, moveX: 2 },
    { ...i, sequence: 1.5 },
    { ...i, extra: true },
    { ...i, fire: 1 },
  ])
    assert(!validInput(bad));
  const g = quiet();
  assert(g.submitInput('p0', i));
  assert(!g.submitInput('p0', i));
  g.step();
  assert(!g.submitInput('p0', i));
  assert(!g.submitInput('p0', { ...i, sequence: 9000 }));
});
test('swept collision catches a bullet crossing the complete body in one tick', () => {
  assert.equal(segmentCircle({ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 500, y: 0 }, 10), 0.49);
  assert.equal(segmentCircle({ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 500, y: 30 }, 10), null);
  assert.equal(segmentCircle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 10), 0);
});
test('swept dash blocks and slides at arena cover instead of tunnelling', () => {
  const box = arena.obstacles[0],
    p = moveBody({ x: box.x - 100, y: box.y + 30 }, { x: 500, y: 80 }, 9, arena.obstacles);
  assert(p.x <= box.x - 9 + 0.1);
  assert(p.y > box.y + 30);
});
test('diagonal movement has the same speed and clients cannot multiply steps', () => {
  const a = quiet(),
    b = quiet();
  a.submitInput('p0', { ...idleInput(), sequence: 1, moveX: 1 });
  b.submitInput('p0', { ...idleInput(), sequence: 1, moveX: 1, moveY: 1 });
  const aa = { ...a.players.get('p0')! },
    bb = { ...b.players.get('p0')! };
  a.step();
  b.step();
  assert(
    Math.abs(
      Math.hypot(a.players.get('p0')!.x - aa.x, a.players.get('p0')!.y - aa.y) -
        Math.hypot(b.players.get('p0')!.x - bb.x, b.players.get('p0')!.y - bb.y),
    ) < 1e-9,
  );
});
test('purchase deduplication is atomic and conflicts cannot spend twice', () => {
  const g = new Game(),
    p = g.addPlayer('p', 'Mara', 'soldier'),
    r = { id: 'buy-1', kind: 'upgrade', item: 'damage' };
  assert(g.transact('p', r).ok);
  const coins = p.coins;
  assert(g.transact('p', r).ok);
  assert.equal(p.coins, coins);
  assert.equal(p.upgrades.damage, 1);
  assert(!g.transact('p', { ...r, item: 'health' }).ok);
  assert.equal(p.coins, coins);
  g.start();
  assert(!g.transact('p', { ...r, id: 'buy-2' }).ok);
});
test('skill prerequisites, budgets, class ownership and one capstone are enforced', () => {
  const g = new Game(),
    p = g.addPlayer('p', 'Mara', 'soldier');
  p.totalSp = 100;
  const nodes = data.skills.filter((s) => s.classId === 'soldier'),
    first = nodes.filter((s) => s.subbranchId === nodes[0].subbranchId),
    second = nodes.filter((s) => s.subbranchId === nodes[6].subbranchId);
  assert(!g.transact('p', { id: 'bad', kind: 'skill', item: first[2].id }).ok);
  assert(
    !g.transact('p', {
      id: 'wrong-class',
      kind: 'skill',
      item: data.skills.find((s) => s.classId === 'medic')!.id,
    }).ok,
  );
  for (const node of first)
    assert(g.transact('p', { id: node.id, kind: 'skill', item: node.id }).ok);
  for (const node of second.slice(0, 5))
    assert(g.transact('p', { id: node.id, kind: 'skill', item: node.id }).ok);
  assert(!g.transact('p', { id: 'second-capstone', kind: 'skill', item: second[5].id }).ok);
});
test('friendly bullets pass through teammates without damage', () => {
  const g = quiet(2),
    a = g.players.get('p0')!,
    b = g.players.get('p1')!;
  a.x = 500;
  a.y = 800;
  b.x = 550;
  b.y = 800;
  for (let i = 1; i <= 30; i++) {
    g.submitInput(a.id, { ...idleInput(), sequence: i, aim: 0, fire: true });
    g.step();
  }
  assert.equal(b.health, b.maxHealth);
  assert(a.ammo < 12);
});
test('two-second teammate channel revives and interrupted channels reset', () => {
  const g = quiet(2),
    a = g.players.get('p0')!,
    b = g.players.get('p1')!;
  a.x = b.x = 800;
  a.y = b.y = 700;
  b.invulnerableUntil = 0;
  g.damage(b, 1000);
  assert.equal(b.status, 'downed');
  for (let i = 1; i <= 30; i++) {
    g.submitInput(a.id, { ...idleInput(), sequence: i, interact: true });
    g.step();
  }
  g.submitInput(a.id, { ...idleInput(), sequence: 31 });
  g.step();
  assert.equal(a.reviveProgress, 0);
  for (let i = 32; i < 91; i++) {
    g.submitInput(a.id, { ...idleInput(), sequence: i, interact: true });
    g.step();
  }
  assert.equal(b.status, 'downed');
  g.submitInput(a.id, { ...idleInput(), sequence: 91, interact: true });
  g.step();
  assert.equal(b.status, 'active');
  assert.equal(b.health, b.maxHealth * 0.5);
});
test('solo self-revive is available once per encounter, then defeat follows', () => {
  const g = quiet(),
    p = g.players.get('p0')!;
  p.invulnerableUntil = 0;
  g.damage(p, 1000);
  for (let i = 1; i <= 60; i++) {
    g.submitInput(p.id, { ...idleInput(), sequence: i, interact: true });
    g.step();
  }
  assert.equal(p.status, 'active');
  assert.equal(p.selfRevives, 0);
  p.invulnerableUntil = 0;
  g.damage(p, 1000);
  g.step();
  assert.equal(g.phase, 'defeat');
});
test('Medic ultimate channels, returns an eliminated ally and freezes its cooldown in shops', () => {
  const g = quiet(2),
    a = g.players.get('p0')!,
    m = g.players.get('p1')!;
  a.x = m.x = 800;
  a.y = m.y = 700;
  a.health = 0;
  a.status = 'eliminated';
  g.submitInput(m.id, { ...idleInput(), sequence: 1, ultimate: true });
  g.step();
  assert.equal(a.status, 'eliminated');
  advance(g, 30);
  assert.equal(a.status, 'active');
  assert.equal(a.health, a.maxHealth * 0.6);
  const combat = g.combatTick,
    ready = m.ultimateAt;
  g.phase = 'shop';
  g.phaseEnds = g.tick + 1000;
  advance(g, 600);
  assert.equal(g.combatTick, combat);
  assert.equal(m.ultimateAt, ready);
});
test('votes, rewards and shop follow authoritative timers and late arrivals wait for a boundary', () => {
  const g = quiet(),
    p = g.players.get('p0')!;
  const late = g.addPlayer('late', 'Iona', 'medic');
  assert.equal(late.status, 'waiting');
  g.boss.health = 0;
  g.step();
  assert.equal(g.phase, 'mutationVote');
  assert.equal(p.coins, 758);
  assert.equal(p.totalSp, 9);
  assert.equal(new Set(g.mutationCards).size, 3);
  assert(g.vote(p.id, 1));
  assert(!g.vote(p.id, 5));
  advance(g, 449);
  assert.equal(g.phase, 'mutationVote');
  g.step();
  assert.equal(g.phase, 'contractVote');
  assert.equal(g.mutations.length, 1);
  assert(
    g.contractCards.every(
      (c) => Number.isFinite(c.recommendedRating) && c.recommendedRating > 0 && c.risk === 0,
    ),
  );
  assert(new Set(g.contractCards.map((c) => c.threat + '/' + c.subtier)).size > 1);
  g.vote(p.id, 0);
  advance(g, 450);
  assert.equal(g.phase, 'shop');
  advance(g, 750);
  assert.equal(g.phase, 'loading');
  advance(g, 150);
  assert.equal(g.phase, 'combat');
  assert.equal(late.status, 'active');
});
test('boss timeout defeats the encounter independently of party health', () => {
  const g = quiet();
  g.boss.deadline = g.combatTick + 1;
  g.step();
  assert.equal(g.phase, 'defeat');
});
test('seed replay produces the same complete combat state', () => {
  const run = () => {
    const g = new Game({ seed: 987 });
    g.addPlayer('p', 'Mara', 'soldier');
    g.start();
    for (let i = 1; i <= 600; i++) {
      g.submitInput('p', {
        ...idleInput(),
        sequence: i,
        aim: -Math.PI / 2,
        fire: true,
        moveX: Math.sin(i / 30),
        q: i === 30,
        ultimate: i === 80,
      });
      g.step();
      g.drainEvents();
    }
    return g.snapshot();
  };
  assert.deepEqual(run(), run());
});
