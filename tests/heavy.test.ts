import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data, type Player } from '../src/shared/game.ts';
import { Minions } from '../src/shared/minions.ts';
import {
  idleInput,
  HZ,
  implementedClassIds,
  type InputFrame,
  type Shot,
} from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { Prediction } from '../src/client/prediction.ts';
import { heavyPose, heavyArt } from '../src/client/heavy-presentation.ts';

function setup() {
  const game = new Game({ seed: 871, maxPlayers: 1 });
  const player = game.addPlayer('solo', 'Hux', 'heavy');
  return { game, player };
}
function start(game: Game, player: Player) {
  game.start();
  game.boss.staggerUntil = 1e9;
  game.boss.deadline = 1e9;
  game.boss.health = game.boss.maxHealth = 1e9;
  player.x = 800;
  player.y = 700;
  player.invulnerableUntil = 1e9;
}
function input(game: Game, player: Player, action: Partial<InputFrame> = {}) {
  assert(game.submitInput(player.id, { ...idleInput(), sequence: player.ack + 1, ...action }));
  game.step();
  return game.drainEvents();
}
function buyPath(game: Game, player: Player, effect: string) {
  player.totalSp = 27;
  const leaf = data.skills.find((node) => node.classId === 'heavy' && effect in node.effects)!;
  assert(leaf, effect);
  for (const node of data.skills.filter(
    (node) => node.classId === 'heavy' && node.subbranchId === leaf.subbranchId,
  ))
    assert(game.transact(player.id, { id: node.id, kind: 'skill', item: node.id }).ok);
}
const ordinary = {
  kind: 'ordinary' as const,
  x: 870,
  y: 700,
  health: 1000,
  speed: 0,
  radius: 16,
  damage: 10,
};
const spawned = (events: ReturnType<Game['drainEvents']>) =>
  events.flatMap((event) => (event.type === 'shots' ? event.shots : []));

test('Heavy is admitted with authored health, weapon, movement and Practice/server boundary saves', () => {
  assert.deepEqual(implementedClassIds, [
    'soldier',
    'medic',
    'heavy',
    'tank',
    'mage',
    'engineer',
    'assassin',
  ]);
  const { game, player } = setup();
  assert.equal(player.health, 140);
  assert.equal(player.weapon, 'heavy-0');
  assert.equal(player.ammo, 45);
  assert.equal(game.movementSpeed(player), 190);
  const save = JSON.parse(JSON.stringify(game.offlineCheckpoint()));
  assert.equal(Game.restoreOffline(save).players.get('solo')!.classId, 'heavy');
  const serverSave = JSON.parse(JSON.stringify(game.authoritativeCheckpoint()));
  assert.equal(Game.restoreAuthoritative(serverSave).players.get('solo')!.weapon, 'heavy-0');
  save.protocolVersion = 4;
  assert.throws(() => Game.restoreOffline(save), /versionMismatch/);
  assert.throws(() => game.addPlayer('locked', 'Nell', 'tank' as never));
});

test('Suppressing Cone emits fourteen short-range rounds, credits actual damage and slows ordinary enemies', () => {
  const { game, player } = setup();
  start(game, player);
  const target = game.spawnMinion({ ...ordinary, speed: 90 })!;
  const events = input(game, player, { q: true, aim: 0 });
  const shots = spawned(events);
  assert.equal(shots.length, 14);
  assert.equal(player.ammo, 45);
  assert(Math.abs(shots.reduce((n, shot) => n + shot.damage, 0) - 45) < 1e-8);
  assert.equal(player.qAt - game.combatTick, 12 * HZ);
  for (let tick = 0; tick < 9; tick++) input(game, player);
  assert(target.health < target.maxHealth);
  assert.equal(target.slowMultiplier, 0.6);
  assert(target.slowUntil > game.combatTick);
  assert(player.damageDealt > 0);
  assert.equal([...game.shots.values()].filter((shot) => shot.owner === 'solo').length, 0);
  const before = target.x;
  input(game, player);
  assert(Math.abs(before - target.x - (90 * 0.6) / HZ) < 1e-9);
  const end = target.slowUntil;
  while (game.combatTick < end) input(game, player);
  assert.equal(target.slowMultiplier, 1);
});

test('suppression duration skills change the actual slow deadline; bosses are never ordinary slowed actors', () => {
  const run = (skilled: boolean) => {
    const { game, player } = setup();
    if (skilled) buyPath(game, player, 'suppressionDuration');
    const duration = 3 * (1 + (game.stats(player).effects.suppressionDuration ?? 0));
    start(game, player);
    const target = game.spawnMinion(ordinary)!;
    input(game, player, { q: true, aim: 0 });
    for (let tick = 0; tick < 10; tick++) input(game, player);
    return { game, player, target, duration };
  };
  const base = run(false),
    upgraded = run(true);
  assert(upgraded.target.slowUntil > base.target.slowUntil);
  assert.equal(
    upgraded.target.slowUntil - base.target.slowUntil,
    Math.ceil(upgraded.duration * HZ) - Math.ceil(base.duration * HZ),
  );
  const { game, player } = setup();
  start(game, player);
  player.x = 800;
  player.y = 390;
  const health = game.boss.health;
  input(game, player, { q: true, aim: -Math.PI / 2 });
  for (let tick = 0; tick < 10; tick++) input(game, player);
  assert(game.boss.health < health);
  assert.equal(game.minions.actors.size, 0);
  assert.equal('slowUntil' in game.boss, false);
});

test('suppression cannot damage targets beyond its authored radius', () => {
  const { game, player } = setup();
  start(game, player);
  const target = game.spawnMinion({ ...ordinary, x: 1040, radius: 2 })!;
  input(game, player, { q: true, aim: 0 });
  for (let tick = 0; tick < 12; tick++) input(game, player);
  assert.equal(target.health, target.maxHealth);
  assert.equal(target.slowUntil, 0);
});

test('Braced Firing applies five seconds of armor, fire cadence and movement cost, respecting the armor cap', () => {
  const { game, player } = setup();
  start(game, player);
  input(game, player, { e: true });
  assert.equal(player.braceUntil - game.combatTick, 5 * HZ);
  assert.equal(player.eAt - game.combatTick, 18 * HZ);
  assert.equal(game.movementSpeed(player), 190 * 0.6);
  player.invulnerableUntil = 0;
  game.damage(player, 20);
  assert(Math.abs(player.damageTaken - 11) < 1e-9);
  const frame = viewOf(game, 'solo');
  const prediction = new Prediction();
  prediction.acknowledge(frame, 'solo');
  const x = player.x;
  const move = { ...idleInput(), sequence: player.ack + 1, moveX: 1 };
  prediction.submit(move, frame);
  input(game, player, move);
  assert(Math.abs(player.x - x - (190 * 0.6) / HZ) < 1e-9);
  assert(Math.abs(player.x - prediction.player!.x) < 1e-9);
  const count = (braced: boolean) => {
    const { game: g, player: p } = setup();
    start(g, p);
    let fired = 0;
    for (let tick = 0; tick < 120; tick++) {
      fired += spawned(input(g, p, { fire: true, e: braced && tick === 0 })).length;
    }
    return fired;
  };
  assert(count(true) > count(false));
  const capped = setup();
  buyPath(capped.game, capped.player, 'armor');
  start(capped.game, capped.player);
  input(capped.game, capped.player, { e: true });
  capped.player.invulnerableUntil = 0;
  capped.game.damage(capped.player, 100);
  assert(capped.player.damageTaken >= 35 - 1e-9);
});

test('Foundry Overture cancels reload, preserves ammo, adds two pierces and blocks manual reload until expiry', () => {
  const { game, player } = setup();
  start(game, player);
  player.ammo = 0;
  player.reloadAt = 99;
  const shots = spawned(input(game, player, { ultimate: true, fire: true, reload: true }));
  assert.equal(player.overdriveUntil - game.combatTick, 6 * HZ);
  assert.equal(player.ultimateAt - game.combatTick, 90 * HZ);
  assert.equal(player.ammo, 0);
  assert.equal(player.reloadAt, 0);
  assert.equal(shots[0].pierce, 2);
  assert.equal(game.movementSpeed(player), 190 * 0.65);
  let count = shots.length;
  for (let tick = 0; tick < 90; tick++)
    count += spawned(input(game, player, { fire: true, reload: true })).length;
  assert(count > 30);
  assert.equal(player.ammo, 0);
  assert.equal(player.reloadAt, 0);
  input(game, player, { e: true });
  assert.equal(game.movementSpeed(player), 190 * 0.6);
  while (game.combatTick < player.overdriveUntil) input(game, player, { fire: true });
  input(game, player, { fire: true });
  assert(player.reloadAt > game.combatTick);
});

test('ultimate duration and potency skills affect the real firing window', () => {
  const { game, player } = setup();
  buyPath(game, player, 'ultimateDuration');
  const stats = game.stats(player);
  start(game, player);
  input(game, player, { ultimate: true });
  assert.equal(
    player.overdriveUntil - game.combatTick,
    Math.ceil((6 + stats.effects.ultimateDuration) * HZ),
  );
  assert(player.overdriveUntil - game.combatTick > 180);
  assert(player.ultimateAt - game.combatTick <= 90 * HZ);
  let upgradedShots = 0;
  for (let tick = 0; tick < 90; tick++)
    upgradedShots += spawned(input(game, player, { fire: true })).length;
  const base = setup();
  start(base.game, base.player);
  input(base.game, base.player, { ultimate: true });
  let baseShots = 0;
  for (let tick = 0; tick < 90; tick++)
    baseShots += spawned(input(base.game, base.player, { fire: true })).length;
  assert(
    upgradedShots > baseShots,
    'Purchased ultimate potency changes sustained fire during the actual window',
  );
});

test('fractional fire deadlines sustain 35 shots/second at 30Hz and do not create an idle backlog', () => {
  const { game, player } = setup();
  player.coins = 100000;
  assert(game.transact(player.id, { id: 'weapon', kind: 'weapon', item: 'heavy-2' }).ok);
  buyPath(game, player, 'fireRate');
  start(game, player);
  player.overdriveUntil = 10000;
  player.braceUntil = 10000;
  let count = 0,
    maximum = 0;
  for (let tick = 0; tick < 300; tick++) {
    const fired = spawned(input(game, player, { fire: true })).length;
    count += fired;
    maximum = Math.max(maximum, fired);
  }
  assert(count >= 349 && count <= 351, String(count));
  assert(maximum <= 2);
  for (let tick = 0; tick < 300; tick++) input(game, player);
  assert.equal(spawned(input(game, player, { fire: true })).length, 1);
});

test('piercing bullets hit distinct ordinary enemies before the boss, never repeated overlaps or targets behind walls', () => {
  const { game, player } = setup();
  start(game, player);
  player.x = 800;
  player.y = 550;
  const first = game.spawnMinion({ ...ordinary, x: 800, y: 480 })!;
  const second = game.spawnMinion({ ...ordinary, x: 800, y: 420 })!;
  const shot: Shot = {
    id: 9000,
    owner: player.id,
    x: 800,
    y: 550,
    vx: 0,
    vy: -12000,
    radius: 4,
    damage: 10,
    expires: 30,
    pierce: 2,
  };
  game.shots.set(shot.id, shot);
  const health = game.boss.health;
  input(game, player);
  assert.equal(first.health, 990);
  assert.equal(second.health, 990);
  assert(game.boss.health < health);
  assert.equal(game.shots.has(shot.id), false);
  assert.equal(player.damageDealt, 30);
  const contact = game.spawnMinion({ ...ordinary, x: 800, y: 550, radius: 20 })!;
  game.shots.set(9001, { ...shot, id: 9001, x: 800, y: 550, vx: 10, vy: 0, pierce: 2 });
  for (let tick = 0; tick < 5; tick++) input(game, player);
  assert.equal(contact.health, 990);
  const obstacle = data.arenas.find((arena) => arena.id === 'gatehouse')!.obstacles[0];
  const victim = game.spawnMinion({
    ...ordinary,
    x: obstacle.x + obstacle.width + 35,
    y: obstacle.y + obstacle.height / 2,
  })!;
  game.shots.set(9002, {
    ...shot,
    id: 9002,
    x: obstacle.x - 25,
    y: victim.y,
    vx: (obstacle.width + 100) * HZ,
    vy: 0,
    pierce: 2,
  });
  input(game, player);
  assert.equal(victim.health, 1000);
});

test('ordinary actors enforce the sixty-enemy cap, wall collision, hit validity and expiry', () => {
  const actors = new Minions();
  for (let id = 1; id <= 60; id++) assert(actors.spawn(id, ordinary, 0));
  assert.equal(actors.spawn(61, ordinary, 0), null);
  assert.throws(() => actors.hit(1, NaN, 0));
  assert.throws(() => actors.hit(1, 1, 0, 1, -1));
  assert.throws(() => new Minions().spawn(1, { ...ordinary, x: -1 }, 0));
  const wall = { x: 900, y: 600, width: 80, height: 200 };
  const actor = actors.actors.get(1)!;
  actor.speed = 600;
  actors.step(1, [{ id: 'target', x: 1100, y: 700 }], [wall], () =>
    assert.fail('No contact through a wall'),
  );
  assert(actor.x < wall.x - actor.radius + 0.01);
  actors.step(1800, [], [], () => {});
  assert.equal(actors.actors.size, 0);
});

test('victory ends Heavy buffs and clears ordinary actors from saved boundaries', () => {
  const { game, player } = setup();
  start(game, player);
  game.spawnMinion(ordinary);
  input(game, player, { e: true, ultimate: true });
  game.boss.health = 0;
  input(game, player);
  assert.equal(game.phase, 'mutationVote');
  assert.equal(game.minions.actors.size, 0);
  assert.equal(player.braceUntil, 0);
  assert.equal(player.overdriveUntil, 0);
  const restored = Game.restoreOffline(JSON.parse(JSON.stringify(game.offlineCheckpoint())));
  assert.equal(restored.players.get('solo')!.classId, 'heavy');
  assert.equal(restored.encounter, 1);
});

test('Heavy movement selects all four drawn facings and shares the original idle world scale', () => {
  for (const [aim, direction, idle] of [
    [0, 'East', 1],
    [Math.PI, 'West', 3],
    [-Math.PI / 2, 'North', 2],
    [Math.PI / 2, 'South', 0],
  ] as const) {
    const run = heavyPose(aim, true, 'active', 9);
    assert.equal(run.texture, 'heavy-run-' + direction);
    assert.equal(run.frame, 3);
    const still = heavyPose(aim, false, 'active', 9);
    assert.equal(still.texture, 'heavy-reference');
    assert.equal(still.frame, idle);
    assert.equal(heavyPose(aim, true, 'downed', 9).frame, idle);
    assert.equal(heavyPose(aim, true, 'active', 9, true).texture, 'heavy-reference');
    assert.equal(run.origin[1], still.origin[1]);
    assert(Math.abs(run.displayCell / 320 - still.displayCell / 256) < 1e-12);
  }
  assert.equal(
    heavyArt.entries.reduce((total, entry) => total + entry.frames, 0),
    32,
  );
});
