import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, arena, data } from '../src/shared/game.ts';
import { moveBody } from '../src/shared/geometry.ts';
import {
  buildGrade,
  equivalentBuilds,
  gradeCapacity,
  rateBuild,
} from '../src/shared/build-rating.ts';
test('painted Gatehouse borders stop walking and long dashes while all fifty spawn positions remain clear', () => {
  for (const [start, delta, axis, expected] of [
    [{ x: 800, y: 300 }, { x: 0, y: -1000 }, 'y', 174],
    [{ x: 250, y: 650 }, { x: -1000, y: 0 }, 'x', 104],
    [{ x: 1350, y: 650 }, { x: 1000, y: 0 }, 'x', 1496],
    [{ x: 400, y: 750 }, { x: 0, y: 1000 }, 'y', 841],
    [{ x: 800, y: 850 }, { x: 0, y: 1000 }, 'y', 956],
  ] as const) {
    const result = moveBody(start, delta, 9, arena.obstacles);
    assert(Math.abs(result[axis] - expected) < 0.2);
  }
  const g = new Game({ seed: 12, mode: 'endless', difficulty: 'normal', maxPlayers: 50 });
  for (let i = 0; i < 50; i++) g.addPlayer('p' + i, 'Survivor ' + i, i % 2 ? 'medic' : 'soldier');
  g.start();
  for (const p of g.players.values())
    for (const r of arena.obstacles)
      assert(
        !(p.x > r.x - 9 && p.x < r.x + r.width + 9 && p.y > r.y - 9 && p.y < r.y + r.height + 9),
        'Spawn inside masonry',
      );
});
test('the same published role-normalized rating produces HUD grades and concrete squad examples', () => {
  for (const cl of data.classes) {
    const starter = { classId: cl.id, weapon: cl.weapon, skills: [], upgrades: {} };
    assert(Math.abs(rateBuild(starter) - 1) < 0.001);
    assert.equal(buildGrade(rateBuild(starter)), 'D-');
    assert(rateBuild({ ...starter, upgrades: { damage: 3 } }) > rateBuild(starter));
  }
  for (const required of [0.4, 1, 3.4, 12, 50])
    for (const size of [1, 5, 16, 50]) {
      for (const example of equivalentBuilds(required, size)) {
        const capacity = gradeCapacity(data.grades.indexOf(example.grade));
        assert(example.count * capacity >= required);
        if (example.count > 1) assert((example.count - 1) * capacity < required);
      }
    }
});
