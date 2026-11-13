import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeArenas } from '../src/shared/arena-layouts.ts';
import { segmentRect, moveBody } from '../src/shared/geometry.ts';
import { Game } from '../src/shared/game.ts';
import { Prediction } from '../src/client/prediction.ts';
import { viewOf } from '../src/shared/view.ts';
import { idleInput } from '../src/shared/protocol.ts';
test('six maps have six distinct footprints and cover layouts with reachable spawns and all Accord pads', () => {
  assert.equal(new Set(runtimeArenas.map((a) => a.width + 'x' + a.height)).size, 6);
  assert.equal(new Set(runtimeArenas.map((a) => JSON.stringify(a.cover))).size, 6);
  const pads = [
    { x: 560, y: 550 },
    { x: 1040, y: 550 },
    { x: 800, y: 650 },
    { x: 570, y: 720 },
    { x: 1030, y: 720 },
  ];
  for (const map of runtimeArenas) {
    const free = (x: number, y: number) =>
      !map.obstacles.some((o) => segmentRect({ x, y }, { x, y }, o, 9));
    const g = new Game({ openingArenaId: map.id, maxPlayers: 50, mode: 'endless' });
    for (let i = 0; i < 50; i++) g.addPlayer('p' + i, 'Survivor', 'soldier');
    g.start();
    assert(
      [...g.players.values()].every((p) => free(p.x, p.y)),
      map.id + ' has a blocked spawn',
    );
    assert(free(map.bossSpawn.x, map.bossSpawn.y));
    assert(
      pads.every((p) => free(p.x, p.y)),
      map.id + ' has an obstructed Accord center',
    );
    const seen = new Set<string>(),
      queue: { x: number; y: number }[] = [];
    const tile = (p: { x: number; y: number }) => ({
      x: Math.round(p.x / 20) * 20,
      y: Math.round(p.y / 20) * 20,
    });
    queue.push(tile(map.playerSpawn));
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i],
        key = p.x + ':' + p.y;
      if (seen.has(key) || p.x < 9 || p.x > 1591 || p.y < 9 || p.y > 991 || !free(p.x, p.y))
        continue;
      seen.add(key);
      queue.push(
        { x: p.x + 20, y: p.y },
        { x: p.x - 20, y: p.y },
        { x: p.x, y: p.y + 20 },
        { x: p.x, y: p.y - 20 },
      );
    }
    for (const point of [...pads, map.bossSpawn]) {
      const p = tile(point);
      assert(seen.has(p.x + ':' + p.y), map.id + ' isolates a required route/objective');
    }
    for (const delta of [
      { x: 5000, y: 0 },
      { x: -5000, y: 0 },
      { x: 0, y: 5000 },
      { x: 0, y: -5000 },
    ]) {
      const p = moveBody(map.playerSpawn, delta, 9, map.obstacles);
      assert(p.x >= map.bounds.x + 9 - 0.01 && p.x <= map.bounds.x + map.width - 9 + 0.01);
      assert(p.y >= map.bounds.y + 9 - 0.01 && p.y <= map.bounds.y + map.height - 9 + 0.01);
    }
  }
});
test('prediction and authoritative movement agree on every new footprint, including fast dodges against cover', () => {
  for (const map of runtimeArenas) {
    const g = new Game({ openingArenaId: map.id }),
      p = g.addPlayer('p', 'Mara', 'soldier');
    g.start();
    g.boss.staggerUntil = 1e9;
    const prediction = new Prediction();
    prediction.acknowledge(viewOf(g, p.id), p.id);
    for (let sequence = 1; sequence <= 90; sequence++) {
      const input = {
        ...idleInput(),
        sequence,
        moveY: -1,
        moveX: sequence % 40 < 20 ? 1 : -1,
        dodge: sequence === 20 || sequence === 70,
      };
      prediction.submit(input, viewOf(g, p.id));
      g.submitInput(p.id, input);
      g.step();
      assert(Math.abs(prediction.player!.x - p.x) < 1e-7);
      assert(Math.abs(prediction.player!.y - p.y) < 1e-7);
    }
  }
});
