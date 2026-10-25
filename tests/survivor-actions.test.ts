import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Game } from '../src/shared/game.ts';
import { viewOf, type View } from '../src/shared/view.ts';
import { HZ, idleInput } from '../src/shared/protocol.ts';
import {
  SurvivorActionClock,
  survivorActionArt,
} from '../src/client/survivor-action-presentation.ts';
import library from '../assets/production/motion/survivor-actions/library.json';
import provenance from '../docs/survivor-actions-2026-10-24.json';
import engineerProvenance from '../docs/engineer-actions-2026-10-24.json';
const tankLibrary = library.entries.filter((entry) => entry.classId === 'tank');

function fixture() {
  const game = new Game({ maxPlayers: 2, seed: 714, mode: 'endless' });
  const player = game.addPlayer('tank', 'Bastion', 'tank');
  game.addPlayer('medic', 'Iona', 'medic');
  assert(game.start());
  player.aim = Math.PI / 2;
  const clock = new SurvivorActionClock();
  let view = viewOf(game, player.id);
  clock.observe(view);
  const update = (ticks = 0) => {
    game.tick += ticks;
    game.combatTick += ticks;
    view = viewOf(game, player.id);
    clock.observe(view);
    return view;
  };
  const pose = (moving = false, reduced = false) =>
    clock.pose(view.players[0], view, moving, reduced);
  return { game, player, clock, update, pose, view: () => view };
}

test('Tank actions retain twenty distinct directional clips, 88 drawn poses and every immutable native/request binding', () => {
  assert.equal(tankLibrary.length, 20);
  assert.equal(
    tankLibrary.reduce((n, clip) => n + clip.frames, 0),
    88,
  );
  assert.equal(provenance.requests.length, 25);
  for (const action of ['idle', 'attack', 'hurt', 'dash', 'downed'])
    assert.deepEqual(
      tankLibrary
        .filter((e) => e.action === action)
        .map((e) => e.direction)
        .sort(),
      ['east', 'north', 'south', 'west'],
    );
  const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  for (const entry of tankLibrary) {
    assert.equal(sha(entry.source), entry.sourceSha256);
    assert.equal(sha(entry.atlas), entry.atlasSha256);
    const png = readFileSync(entry.atlas);
    assert.equal(png.readUInt32BE(16), entry.columns * entry.cellSize);
    assert.equal(png.readUInt32BE(20), Math.ceil(entry.frames / entry.columns) * entry.cellSize);
    assert.equal(png[25], 6);
  }
  for (const request of provenance.requests) {
    assert.equal(sha(request.file), request.sha256);
    assert.equal(sha(request.request), request.requestSha256);
    for (const binding of request.inputBindings)
      assert.equal(sha(binding.projectPath), binding.sha256);
  }
  assert.equal(survivorActionArt.entries.length, 40);
});

test('actual weapon shots trigger a complete stationary firing cycle without repeated snapshots restarting it', () => {
  const s = fixture();
  assert.equal(s.pose()!.action, 'idle');
  assert(
    s.game.submitInput(s.player.id, { ...idleInput(), sequence: 1, aim: Math.PI / 2, fire: true }),
  );
  const ammo = s.player.ammo;
  s.game.step();
  assert(s.player.ammo < ammo);
  s.update();
  assert.equal(s.pose()!.action, 'attack');
  assert.equal(s.pose()!.frame, 0);
  for (const [elapsed, expected] of [
    [3, 1],
    [6, 2],
    [9, 3],
  ] as const) {
    s.player.ammo--;
    s.update(3);
    assert.equal(
      s.pose()!.frame,
      expected,
      'Repeated firing delta must not reset the cycle at elapsed ' + elapsed,
    );
  }
  s.update(1);
  assert.equal(s.pose()!.action, 'idle');
  s.player.ammo--;
  s.update(1);
  assert.equal(s.pose()!.action, 'attack');
  assert.equal(s.pose()!.frame, 0);
  assert.equal(
    s.pose(true),
    undefined,
    'Planted firing art yields to the existing directional run while moving',
  );
});

test('damage interrupts a shot, recovers, and keeps movement available rather than replaying stale hit poses', () => {
  const s = fixture();
  s.player.ammo--;
  s.update(1);
  assert.equal(s.pose()!.action, 'attack');
  s.player.health -= 10;
  s.update(1);
  assert.equal(s.pose()!.action, 'hurt');
  assert.equal(s.pose(true)!.action, 'hurt');
  s.update(4);
  assert.equal(s.pose()!.frame, 1);
  s.update(4);
  assert.equal(s.pose()!.action, 'idle');
  assert.equal(s.pose(true), undefined);
  s.player.health += 5;
  s.update(1);
  assert.equal(s.pose()!.action, 'idle', 'Healing is not a hit');
});

test('a real dodge follows movement direction, completes every drawn frame within the authoritative interval and wins over hurt', () => {
  const s = fixture();
  s.player.health -= 10;
  s.update(1);
  assert(
    s.game.submitInput(s.player.id, {
      ...idleInput(),
      sequence: 1,
      aim: Math.PI / 2,
      moveX: -1,
      dodge: true,
    }),
  );
  s.game.step();
  s.update();
  const frames = new Set<number>();
  while (s.game.combatTick < s.player.dashUntil) {
    const pose = s.pose(true)!;
    assert.equal(pose.action, 'dash');
    assert.equal(pose.facing, 'west');
    frames.add(pose.frame);
    s.update(1);
  }
  assert.deepEqual([...frames], [0, 1, 2, 3, 4, 5]);
  assert.notEqual(s.pose()?.action, 'dash');
});

test('downed motion locks its facing, holds the resting frame, and revival clears attack/hurt history', () => {
  const s = fixture();
  s.player.ammo--;
  s.update(1);
  s.player.status = 'downed';
  s.player.health = 0;
  s.player.downUntil = s.game.combatTick + 20 * HZ;
  s.update();
  assert.equal(s.pose()!.action, 'downed');
  assert.equal(s.pose()!.frame, 0);
  s.player.aim = Math.PI;
  s.update(5);
  assert.equal(s.pose()!.facing, 'south');
  assert.equal(s.pose()!.frame, 1);
  s.update(30);
  assert.equal(s.pose()!.frame, 5);
  s.update(100);
  assert.equal(s.pose()!.frame, 5);
  s.player.status = 'eliminated';
  s.update(1);
  assert.equal(s.pose()!.frame, 5);
  s.player.status = 'active';
  s.player.health = s.player.maxHealth / 2;
  s.update(1);
  assert.equal(s.pose()!.action, 'idle');
  assert.equal(s.pose()!.facing, 'west');
});

test('late observers of an existing fall, reduced motion, waiting participants and other classes have explicit stable poses', () => {
  const s = fixture();
  const late = new SurvivorActionClock();
  s.player.status = 'downed';
  s.player.downUntil = s.game.combatTick + 20 * HZ - 60;
  const view = s.update();
  late.observe(view);
  assert.equal(late.pose(view.players[0], view, false)!.frame, 5);
  assert.equal(late.pose(view.players[0], view, false, true)!.frame, 5);
  s.player.status = 'active';
  s.player.health = s.player.maxHealth;
  s.update(1);
  const idle = s.pose(false, true)!;
  s.update(18);
  assert.equal(s.pose(false, true)!.frame, idle.frame);
  s.player.ammo--;
  s.update(1);
  assert.equal(s.pose(false, true)!.frame, 1);
  s.player.status = 'waiting';
  s.update(1);
  assert.equal(s.pose(), undefined);
  assert.equal(s.clock.pose(view.players[1], view, false), undefined);
});

test('new runs, encounter boundaries, backward clocks and removed participants cannot inherit action state', () => {
  const s = fixture();
  s.player.ammo--;
  s.update(1);
  assert.equal(s.pose()!.action, 'attack');
  for (const mutate of [
    (v: View) => (v.run.id += '-new'),
    (v: View) => v.encounter++,
    (v: View) => v.tick--,
  ]) {
    const view = structuredClone(s.view());
    mutate(view);
    view.players[0].ammo--;
    s.clock.observe(view);
    assert.equal(s.clock.pose(view.players[0], view, false)!.action, 'idle');
  }
  const absent = structuredClone(s.view());
  absent.players = [];
  s.clock.observe(absent);
  assert.equal(s.clock.pose(s.view().players[0], absent, false), undefined);
  s.clock.observe(s.view());
  assert.equal(s.pose()!.action, 'idle');
});

test('Engineer actions preserve twenty independent clips, all 23 returns and their exact input bindings', () => {
  const clips = library.entries.filter((entry) => entry.classId === 'engineer');
  assert.equal(clips.length, 20);
  assert.equal(
    clips.reduce((n, e) => n + e.frames, 0),
    88,
  );
  assert.equal(engineerProvenance.requests.length, 23);
  const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  for (const action of ['idle', 'attack', 'hurt', 'dash', 'downed'])
    assert.deepEqual(
      clips
        .filter((e) => e.action === action)
        .map((e) => e.direction)
        .sort(),
      ['east', 'north', 'south', 'west'],
    );
  for (const clip of clips) {
    assert.equal(sha(clip.source), clip.sourceSha256);
    assert.equal(sha(clip.atlas), clip.atlasSha256);
  }
  for (const native of engineerProvenance.requests) {
    assert.equal(sha(native.file), native.sha256);
    assert.equal(sha(native.request), native.requestSha256);
    for (const binding of native.inputBindings)
      assert.equal(sha(binding.projectPath), binding.sha256);
  }
});

test('Engineer and Tank presentation cues stay independent through fire, fall, revive and a class identity change', () => {
  const game = new Game({ maxPlayers: 2, seed: 715 });
  const engineer = game.addPlayer('engineer', 'Nell', 'engineer'),
    tank = game.addPlayer('tank', 'Bastion', 'tank');
  assert(game.start());
  engineer.aim = 0;
  tank.aim = Math.PI;
  const clock = new SurvivorActionClock();
  const update = () => {
    const view = viewOf(game, engineer.id);
    clock.observe(view);
    return view;
  };
  let view = update();
  assert.equal(clock.pose(view.players[0], view, false)!.texture, 'engineer-idle-east');
  assert.equal(clock.pose(view.players[1], view, false)!.texture, 'tank-idle-west');
  assert(game.submitInput(engineer.id, { ...idleInput(), sequence: 1, fire: true, aim: 0 }));
  assert(game.submitInput(tank.id, { ...idleInput(), sequence: 1, aim: Math.PI }));
  game.step();
  view = update();
  assert.equal(clock.pose(view.players[0], view, false)!.texture, 'engineer-attack-east');
  assert.equal(clock.pose(view.players[1], view, false)!.action, 'idle');
  tank.status = 'downed';
  tank.downUntil = game.combatTick + 20 * HZ;
  view = update();
  assert.equal(clock.pose(view.players[1], view, false)!.texture, 'tank-downed-west');
  assert.equal(clock.pose(view.players[0], view, false)!.action, 'attack');
  engineer.health -= 5;
  game.tick++;
  game.combatTick++;
  view = update();
  assert.equal(clock.pose(view.players[0], view, false)!.texture, 'engineer-hurt-east');
  tank.status = 'active';
  tank.health = tank.maxHealth;
  view = update();
  assert.equal(clock.pose(view.players[1], view, false)!.action, 'idle');
  const changed = structuredClone(view);
  changed.players[0].classId = 'tank';
  changed.players[0].ammo--;
  clock.observe(changed);
  assert.equal(clock.pose(changed.players[0], changed, false)!.texture, 'tank-idle-east');
});
