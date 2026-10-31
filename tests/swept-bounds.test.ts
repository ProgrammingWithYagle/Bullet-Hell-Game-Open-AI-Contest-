import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentRect } from '../src/shared/geometry.ts';

test('swept rectangle broad phase preserves fast crossings, padded grazing and stationary contacts', () => {
  const wall = { x: 100, y: 100, width: 20, height: 20 };
  assert.equal(segmentRect({ x: 0, y: 90 }, { x: 200, y: 90 }, wall, 10)?.t, 0.45);
  assert.equal(segmentRect({ x: 0, y: 89.999 }, { x: 200, y: 89.999 }, wall, 10), null);
  assert.equal(segmentRect({ x: 110, y: 0 }, { x: 110, y: 1000 }, wall)?.t, 0.1);
  assert.equal(segmentRect({ x: 130, y: 110 }, { x: 130, y: 110 }, wall, 10)?.t, 0);
  assert.equal(segmentRect({ x: 130.001, y: 110 }, { x: 130.001, y: 110 }, wall, 10), null);
  const diagonal = segmentRect({ x: 0, y: 0 }, { x: 1000, y: 1000 }, wall);
  assert.equal(diagonal?.t, 0.1);
  assert.deepEqual(diagonal?.normal, { x: 0, y: -1 });
  assert.equal(segmentRect({ x: 90, y: 90 }, { x: 90, y: 90 }, wall, 10)?.t, 0);
  assert.equal(segmentRect({ x: 0, y: 150 }, { x: 1000, y: 150 }, wall), null);
});
