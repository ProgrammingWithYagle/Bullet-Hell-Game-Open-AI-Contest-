import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialGrid, segmentCircleXY } from '../src/shared/geometry.ts';
import { Minions } from '../src/shared/minions.ts';
test('reused grid output deduplicates straddling actors, preserves owned results and clears stale cells', () => {
  const grid = new SpatialGrid<{ x: number; y: number }>(),
    a = { x: 128, y: 128 },
    b = { x: 240, y: 180 };
  grid.insert(a, 20);
  grid.insert(b, 20);
  const saved = grid.query({ x: 90, y: 90 }, { x: 260, y: 210 }, 10),
    scratch = [{ x: -1, y: -1 }];
  grid.queryInto({ x: 90, y: 90 }, { x: 260, y: 210 }, 10, scratch);
  assert.equal(scratch.length, 2);
  assert.deepEqual(new Set(scratch), new Set([a, b]));
  grid.clear();
  grid.queryInto({ x: 90, y: 90 }, { x: 260, y: 210 }, 10, scratch);
  assert.equal(scratch.length, 0);
  assert.deepEqual(new Set(saved), new Set([a, b]));
  assert.equal(segmentCircleXY(-100, 0, 100, 0, 0, 0, 10), 0.45);
  assert.equal(segmentCircleXY(-100, 10, 100, 10, 0, 0, 10), 0.5);
  assert.equal(segmentCircleXY(-100, 11, 100, 11, 0, 0, 10), null);
});
test('ordinary actor contact sweeps the moving survivor and retains its contact cooldown', () => {
  const actors = new Minions();
  actors.spawn(1, { kind: 'rat', x: 700, y: 500, health: 12, speed: 0, radius: 12, damage: 8 }, 0);
  const target = { id: 'solo', x: 900, y: 500, oldX: 500, oldY: 500 };
  let damage = 0;
  actors.step(1, [target], [], (_, amount) => (damage += amount));
  assert.equal(damage, 8);
  actors.step(2, [target], [], (_, amount) => (damage += amount));
  assert.equal(damage, 8);
});
