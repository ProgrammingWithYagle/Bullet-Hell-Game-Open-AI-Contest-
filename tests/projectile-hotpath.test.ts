import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/shared/game.ts';
import { constructHit, type Construct } from '../src/shared/class-kits.ts';
import { segmentRect } from '../src/shared/geometry.ts';
import type { Shot, Vec } from '../src/shared/protocol.ts';
test('friendly weapon projectiles damage Walking District blocks while hostile shots stop, and a destroyed block stops shielding within the same tick', () => {
  const g = new Game({ mode: 'endless', openingBossId: 'walking-district', maxPlayers: 1 });
  const p = g.addPlayer('solo', 'Block tester', 'soldier');
  g.start();
  p.invulnerableUntil = 1e9;
  for (let n = 0; n < 120; n++) g.step();
  const block = g.director.endless
    .cues()
    .find((c) => c.kind === 'endless-prop' && c.role === 'block');
  assert(block && block.kind === 'endless-prop');
  const clear = Reflect.get(g, 'clearShots') as () => void,
    step = Reflect.get(g, 'stepShots') as () => void;
  const emit = Reflect.get(g, 'emitShot') as (
    owner: string,
    x: number,
    y: number,
    aim: number,
    speed: number,
    damage: number,
    radius?: number,
  ) => Shot;
  clear.call(g);
  const fire = (owner: string, damage: number) =>
    emit.call(g, owner, block.x, block.y - 70.1, Math.PI / 2, 4206, damage, 5);
  const before = block.health,
    shot = fire(p.id, 45);
  step.call(g);
  assert.equal(block.health, before - 45);
  assert(!g.shots.has(shot.id));
  const hostile = fire('hostile', 5);
  step.call(g);
  assert(!g.shots.has(hostile.id));
  assert.equal(block.health, before - 45);
  fire(p.id, 1000);
  const through = fire('hostile', 5);
  step.call(g);
  assert.equal(block.health, 0);
  assert(
    g.shots.has(through.id),
    'Destruction must invalidate the cached solid before the next shot',
  );
});
test('construct broad-phase rejection preserves rotated wall corners, endpoints and large projectile padding', () => {
  const body: Construct = {
    id: 1,
    kind: 'wall',
    owner: 'tank',
    x: 800,
    y: 500,
    radius: 20,
    aim: 0,
    health: 150,
    maxHealth: 150,
    at: 0,
    until: 300,
  };
  const original = (from: Vec, to: Vec, pad: number) => {
    const c = Math.cos(body.aim),
      s = Math.sin(body.aim),
      local = (p: Vec) => ({
        x: (p.x - body.x) * c + (p.y - body.y) * s,
        y: -(p.x - body.x) * s + (p.y - body.y) * c,
      });
    return (
      segmentRect(local(from), local(to), { x: -12, y: -110, width: 24, height: 220 }, pad)?.t ??
      null
    );
  };
  for (const angle of [0, 0.25, 0.75, 1.4, 2.7, Math.PI])
    for (const pad of [0, 5, 30, 200])
      for (let n = 0; n < 600; n++) {
        body.aim = angle;
        const a = { x: 800 + Math.cos(n * 1.23) * 400, y: 500 + Math.sin(n * 0.91) * 400 },
          b = { x: 800 + Math.cos(n * 0.32) * 400, y: 500 + Math.sin(n * 0.53) * 400 };
        const actual = constructHit(a, b, body, pad),
          expected = original(a, b, pad);
        if (expected === null) assert.equal(actual, null);
        else {
          assert(actual !== null);
          assert(Math.abs(actual - expected) < 1e-12);
        }
      }
});

test('cached weak-point snapshots refresh after a sack breaks before another shot in the same batch', () => {
  const g = new Game({ openingBossId: 'ratcatcher', maxPlayers: 1 });
  const clearArena = { ...g.arena, obstacles: [] };
  Object.defineProperty(g, 'arena', { get: () => clearArena });
  g.addPlayer('solo', 'Sack tester', 'soldier');
  g.start();
  g.step();
  const clear = Reflect.get(g, 'clearShots') as () => void,
    step = Reflect.get(g, 'stepShots') as () => void;
  const emit = Reflect.get(g, 'emitShot') as (
    owner: string,
    x: number,
    y: number,
    aim: number,
    speed: number,
    damage: number,
    radius?: number,
  ) => Shot;
  clear.call(g);
  const sack = g.director.weakPoint()!;
  assert(sack.health > 0);
  const health = g.boss.health;
  emit.call(g, 'solo', sack.x, sack.y - 85, Math.PI / 2, 7500, 100, 5);
  emit.call(g, 'solo', sack.x, sack.y - 85, Math.PI / 2, 7500, 10, 5);
  step.call(g);
  assert.equal(g.director.weakPoint()!.health, 0);
  assert.equal(g.boss.health, health - 10);
});
test('construct broad-phase candidates preserve oldest-shield precedence and immediate destruction across eight overlapping walls', () => {
  const g = new Game({ maxPlayers: 8 });
  const clearArena = { ...g.arena, obstacles: [] };
  Object.defineProperty(g, 'arena', { get: () => clearArena });
  for (let n = 0; n < 8; n++) g.addPlayer('tank-' + n, 'Tank', 'tank');
  g.start();
  const context = Reflect.get(g, 'kitContext') as () => Parameters<typeof g.classKits.cast>[2];
  for (const p of g.players.values()) g.classKits.cast(p, 'q', context.call(g));
  const walls = g.classKits.constructs();
  assert.equal(walls.length, 8);
  for (const wall of walls) {
    wall.x = 200;
    wall.y = 200;
    wall.aim = 0;
  }
  const emit = Reflect.get(g, 'emitShot') as (
    owner: string,
    x: number,
    y: number,
    aim: number,
    speed: number,
    damage: number,
    radius?: number,
  ) => Shot;
  emit.call(g, 'hostile', 100, 200, 0, 6000, 200, 5);
  emit.call(g, 'hostile', 100, 200, 0, 6000, 10, 5);
  (Reflect.get(g, 'stepShots') as () => void).call(g);
  assert.equal(walls[0].health, 0);
  assert.equal(walls[1].health, walls[1].maxHealth - 10);
  assert(walls.slice(2).every((w) => w.health === w.maxHealth));
});
