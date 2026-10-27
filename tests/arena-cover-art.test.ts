import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runtimeArenas, runtimeArena } from '../src/shared/arena-layouts.ts';
import { arenaCoverPlan } from '../src/client/arena-covers.ts';
import { segmentRect } from '../src/shared/geometry.ts';
test('every secondary map uses non-bed art bound to its exact authoritative cover rectangle', () => {
  assert.deepEqual(arenaCoverPlan('gatehouse'), []);
  for (const map of runtimeArenas.filter((map) => map.id !== 'gatehouse')) {
    const plan = arenaCoverPlan(map.id);
    assert.equal(plan.length, map.cover.length);
    for (const [index, cover] of plan.entries()) {
      assert.notEqual(cover.texture, 'environment-0');
      const { texture, ...rect } = cover;
      assert.deepEqual(rect, map.cover[index]);
      const png = readFileSync(
        'assets/production/environment/' + texture.replace('environment-', '') + '.png',
      );
      assert.equal(png[25], 6);
    }
  }
});
test('secondary maps have distinct encounter axes and a genuine factory chicane rather than another open center lane', () => {
  const axes = runtimeArenas.map((map) =>
    Math.round(
      (Math.atan2(map.bossSpawn.y - map.playerSpawn.y, map.bossSpawn.x - map.playerSpawn.x) * 180) /
        Math.PI,
    ),
  );
  assert(new Set(axes).size >= 5);
  const factory = runtimeArena('ossuary-works');
  assert(
    factory.cover.some((rect) => segmentRect(factory.bossSpawn, factory.playerSpawn, rect, 9)),
  );
  assert(factory.cover.some((rect) => rect.x === factory.bounds.x));
  assert(factory.cover.some((rect) => rect.x + rect.width === factory.bounds.x + factory.width));
  const chapel = runtimeArena('sunken-chapel');
  assert.equal(chapel.playerSpawn.y, chapel.bossSpawn.y);
  assert(chapel.bossSpawn.x - chapel.playerSpawn.x > 750);
});
