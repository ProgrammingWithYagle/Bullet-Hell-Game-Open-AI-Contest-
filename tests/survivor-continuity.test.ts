import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { idleInput, type ClassId } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import {
  SurvivorVisualMotion,
  stableFacing,
  MOVEMENT_GRACE_MS,
} from '../src/client/survivor-visual-motion.ts';
import { SurvivorActionClock } from '../src/client/survivor-action-presentation.ts';
import { survivorPose } from '../src/client/survivor-presentation.ts';
import { heavyPose } from '../src/client/heavy-presentation.ts';

test('sixty-Hz drawing over actual thirty-Hz movement no longer alternates run and idle between movement updates for any class', () => {
  for (const definition of data.classes) {
    const game = new Game({ maxPlayers: 1, mode: 'endless', seed: 532 });
    const p = game.addPlayer('p', 'Survivor', definition.id as ClassId);
    assert(game.start());
    p.invulnerableUntil = 1e9;
    game.boss.staggerUntil = 1e9;
    const motion = new SurvivorVisualMotion();
    let view = viewOf(game, p.id);
    motion.observe(view);
    motion.sample(view.players[0], 0);
    let oldSpriteX = p.x,
      oldSpriteY = p.y;
    const oldStates: boolean[] = [],
      newStates: boolean[] = [];
    for (let tick = 1; tick <= 30; tick++) {
      assert(game.submitInput(p.id, { ...idleInput(), sequence: tick, moveX: 1, aim: 0 }));
      game.step();
      view = viewOf(game, p.id);
      motion.observe(view);
      const player = view.players[0];
      const before = JSON.stringify(view);
      for (let draw = 0; draw < 2; draw++) {
        const now = (tick * 1000) / 30 + (draw * 1000) / 60;
        oldStates.push(Math.hypot(player.x - oldSpriteX, player.y - oldSpriteY) > 0.35);
        oldSpriteX = player.x;
        oldSpriteY = player.y;
        const stable = motion.sample(player, now);
        newStates.push(stable.moving);
        const pose =
          definition.id === 'heavy'
            ? heavyPose(player.aim, stable.moving, player.status, tick, false, stable.facing)
            : survivorPose(
                definition.id as ClassId,
                player.aim,
                stable.moving,
                player.status,
                tick,
                false,
                stable.facing,
              );
        assert(pose.texture.toLowerCase().includes('run-east'));
      }
      assert.equal(JSON.stringify(view), before);
    }
    assert(oldStates.some((value, index) => index > 0 && value !== oldStates[index - 1]));
    assert(newStates.every(Boolean));
    const last = view.players[0];
    assert(motion.sample(last, 1000 + MOVEMENT_GRACE_MS - 1).moving);
    assert.equal(motion.sample(last, 1000 + MOVEMENT_GRACE_MS + 1).moving, false);
  }
});

test('twenty-Hz movement patches retain a run between frames but stop at a bounded grace period and reset on encounter, departure and death', () => {
  const game = new Game({ maxPlayers: 1, mode: 'endless' });
  const p = game.addPlayer('p', 'Mara', 'soldier');
  assert(game.start());
  let view = viewOf(game, p.id);
  const motion = new SurvivorVisualMotion();
  motion.observe(view);
  motion.sample(view.players[0], 0);
  for (let ms = 50; ms <= 500; ms += 50) {
    view = structuredClone(view);
    view.tick += 2;
    view.combatTick += 2;
    view.players[0].x += 8;
    motion.observe(view);
    for (const offset of [0, 16, 33]) assert(motion.sample(view.players[0], ms + offset).moving);
  }
  assert.equal(motion.sample(view.players[0], 500 + MOVEMENT_GRACE_MS + 1).moving, false);
  const dead = { ...view.players[0], status: 'downed' };
  assert.equal(motion.sample(dead, 605).moving, false);
  view.encounter++;
  motion.observe(view);
  assert.equal(motion.sample(view.players[0], 610).moving, false);
  motion.observe({ ...view, players: [] });
  motion.observe(view);
  assert.equal(motion.sample(view.players[0], 620).moving, false);
});

test('small diagonal aim jitter does not flip sprite sheets while deliberate direction changes remain immediate and finite', () => {
  let facing = stableFacing(0);
  const seen = new Set<string>();
  for (let n = 0; n < 120; n++) {
    facing = stableFacing(Math.PI / 4 + ((n % 2 ? 1 : -1) * Math.PI) / 60, facing);
    seen.add(facing);
  }
  assert.deepEqual([...seen], ['east']);
  assert.equal(stableFacing(Math.PI / 2, facing), 'south');
  assert.equal(stableFacing(-Math.PI / 2, 'south'), 'north');
  assert.equal(stableFacing(Math.PI, 'east'), 'west');
  assert.equal(stableFacing(NaN, 'north'), 'north');
});

test('one-shot attack and hurt directions remain at their authoritative onset instead of flipping with later aim changes', () => {
  for (const definition of data.classes) {
    const game = new Game({ maxPlayers: 1, mode: 'endless' });
    const p = game.addPlayer('p', 'Survivor', definition.id as ClassId);
    assert(game.start());
    const clock = new SurvivorActionClock();
    let view = viewOf(game, p.id);
    view.players[0].aim = 0;
    clock.observe(view);
    view = structuredClone(view);
    view.tick++;
    view.combatTick++;
    view.players[0].ammo--;
    clock.observe(view);
    assert.equal(clock.pose(view.players[0], view, false)!.facing, 'east');
    view.players[0].aim = Math.PI / 2;
    assert.equal(clock.pose(view.players[0], view, false)!.facing, 'east');
    view = structuredClone(view);
    view.tick++;
    view.combatTick++;
    view.players[0].health--;
    view.players[0].aim = -Math.PI / 2;
    clock.observe(view);
    assert.equal(clock.pose(view.players[0], view, false)!.facing, 'north');
    view.players[0].aim = 0;
    assert.equal(clock.pose(view.players[0], view, false)!.facing, 'north');
  }
});
