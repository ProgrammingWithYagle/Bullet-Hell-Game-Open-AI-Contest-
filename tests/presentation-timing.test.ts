import { PresentationClock, PRESENTATION_LEAD_TICKS } from '../src/client/presentation-clock.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { HZ, idleInput } from '../src/shared/protocol.ts';
import { SurvivorActionClock } from '../src/client/survivor-action-presentation.ts';

test('a real Rescue Charge spreads its six drawn poses across the complete ten-tick charge interval', () => {
  const game = new Game({ maxPlayers: 1, seed: 1921, mode: 'endless' });
  const p = game.addPlayer('tank', 'Bram', 'tank');
  assert(game.start());
  p.invulnerableUntil = 1e9;
  const clock = new SurvivorActionClock();
  clock.observe(viewOf(game, p.id));
  assert(game.submitInput(p.id, { ...idleInput(), sequence: 1, e: true, aim: 0 }));
  game.step();
  const started = game.combatTick;
  assert.equal(p.dashUntil - started, 10);
  const observed: number[] = [];
  while (game.combatTick < p.dashUntil) {
    const view = viewOf(game, p.id);
    clock.observe(view);
    const pose = clock.pose(view.players[0], view, true)!;
    assert.equal(pose.action, 'dash');
    assert.equal(pose.facing, 'east');
    assert.equal(pose.frame, Math.floor(((game.combatTick - started) * 6) / 10));
    observed.push(pose.frame);
    game.step();
  }
  assert.deepEqual([...new Set(observed)], [0, 1, 2, 3, 4, 5]);
});

test('sixty-Hz rendering between twenty-Hz authority patches exposes every short-dodge pose without changing authority state', () => {
  const game = new Game({ maxPlayers: 1, seed: 1922, mode: 'endless' });
  const p = game.addPlayer('soldier', 'Mara', 'soldier');
  assert(game.start());
  p.invulnerableUntil = 1e9;
  const clock = new SurvivorActionClock();
  clock.observe(viewOf(game, p.id), 0);
  assert(game.submitInput(p.id, { ...idleInput(), sequence: 1, dodge: true, aim: 0, moveX: 1 }));
  game.step();
  const firstTick = game.combatTick;
  let view = viewOf(game, p.id),
    nextPatch = 50;
  clock.observe(view, 0);
  const frames = new Set<number>();
  for (let frame = 0; frame <= 12; frame++) {
    const milliseconds = (frame * 1000) / 60;
    if (milliseconds + 1e-6 >= nextPatch) {
      const target = firstTick + Math.floor((milliseconds * HZ) / 1000 + 1e-6);
      while (game.combatTick < target) game.step();
      view = viewOf(game, p.id);
      clock.observe(view, milliseconds);
      nextPatch += 50;
    }
    const authorityBefore = JSON.stringify(view);
    const pose = clock.pose(view.players[0], view, true, false, milliseconds)!;
    assert.equal(pose.action, 'dash');
    frames.add(pose.frame);
    assert.equal(JSON.stringify(view), authorityBefore);
  }
  assert.deepEqual([...frames], [0, 1, 2, 3, 4, 5]);
});

test('the drawing clock is monotonic between patches, ignores duplicate observations and stops at one patch of lead', () => {
  const game = new Game({ maxPlayers: 1, seed: 1923, mode: 'endless' });
  const p = game.addPlayer('mage', 'Sable', 'mage');
  assert(game.start());
  const view = viewOf(game, p.id);
  view.tick = 100;
  view.combatTick = 30;
  const clock = new PresentationClock();
  clock.observe(view, 1000);
  assert.deepEqual(clock.sample(1025), { tick: 100.75, combatTick: 30.75 });
  clock.observe(structuredClone(view), 1040);
  assert.deepEqual(clock.sample(1050), { tick: 101.5, combatTick: 31.5 });
  assert.deepEqual(clock.sample(10000), { tick: 101.5, combatTick: 31.5 });
  view.tick++;
  view.combatTick++;
  clock.observe(view, 1060);
  assert.deepEqual(clock.sample(1060), { tick: 101.5, combatTick: 31.5 });
  assert.deepEqual(clock.sample(1040), { tick: 101.5, combatTick: 31.5 });
  assert.deepEqual(clock.sample(Number.NaN), { tick: 101.5, combatTick: 31.5 });
  assert.deepEqual(clock.sample(Number.POSITIVE_INFINITY), { tick: 101.5, combatTick: 31.5 });
  assert.deepEqual(clock.sample(1110), { tick: 102.5, combatTick: 32.5 });
  assert.equal(PRESENTATION_LEAD_TICKS, 1.5);
});

test('run, encounter, phase and backward authority boundaries reset drawing time while noncombat clocks stay paused', () => {
  const game = new Game({ maxPlayers: 1, seed: 1924, mode: 'endless' });
  const p = game.addPlayer('medic', 'Iona', 'medic');
  assert(game.start());
  const start = viewOf(game, p.id);
  start.tick = 200;
  start.combatTick = 100;
  for (const boundary of [
    (v: typeof start) => {
      v.run.id += '-other';
      v.tick = 2;
      v.combatTick = 1;
    },
    (v: typeof start) => {
      v.encounter++;
      v.tick = 201;
      v.combatTick = 0;
    },
    (v: typeof start) => {
      v.phase = 'shop';
    },
    (v: typeof start) => {
      v.tick = 50;
      v.combatTick = 20;
    },
  ]) {
    const clock = new PresentationClock();
    clock.observe(start, 0);
    clock.sample(50);
    const next = structuredClone(start);
    boundary(next);
    clock.observe(next, 100);
    assert.deepEqual(clock.sample(100), { tick: next.tick, combatTick: next.combatTick });
    const later = clock.sample(10000);
    assert.equal(later.tick, next.tick + 1.5);
    assert.equal(later.combatTick, next.combatTick + (next.phase === 'combat' ? 1.5 : 0));
  }
});

test('interpolated action frames keep authority-selected status and reduced motion stable through a stalled patch', () => {
  const game = new Game({ maxPlayers: 1, seed: 1925, mode: 'endless' });
  const p = game.addPlayer('engineer', 'Tamsin', 'engineer');
  assert(game.start());
  p.status = 'downed';
  p.downUntil = game.combatTick + 20 * HZ;
  p.health = 0;
  const clock = new SurvivorActionClock();
  let view = viewOf(game, p.id);
  clock.observe(view, 0);
  const saved = JSON.stringify(view);
  assert.equal(clock.pose(view.players[0], view, false, false, 0)!.frame, 0);
  const first = clock.pose(view.players[0], view, false, false, 50)!;
  assert.equal(first.action, 'downed');
  assert.deepEqual(
    clock.pose(view.players[0], view, false, false, 10000),
    first,
    'A stale patch never runs an unbounded fall clock',
  );
  assert.equal(clock.pose(view.players[0], view, false, true, 10000)!.frame, 5);
  assert.equal(JSON.stringify(view), saved);
  p.status = 'active';
  p.health = p.maxHealth;
  game.tick++;
  view = viewOf(game, p.id);
  clock.observe(view, 10001);
  assert.equal(clock.pose(view.players[0], view, false, false, 10001)!.action, 'idle');
  assert.equal(clock.pose(view.players[0], view, false, true, 10020)!.frame, 0);
});
