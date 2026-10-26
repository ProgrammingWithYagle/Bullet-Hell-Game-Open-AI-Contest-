import { classifiedContract } from '../src/shared/boss-threat.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { PROTOCOL } from '../src/shared/protocol.ts';
import { sampleWarden, wrappedAngle } from '../src/shared/warden-signature.ts';
import { wardenCombatPose, wardenArt } from '../src/client/warden-presentation.ts';

function encounter(variant: 'normal' | 'brutal' = 'normal', protectedPlayer = true,difficulty='normal') {
  const lobby = new Game({ difficulty,seed: 583, maxPlayers: 1, mode: 'endless' });
  lobby.addPlayer('solo', 'Mara', 'soldier');
  const save = lobby.offlineCheckpoint()!;
  Object.assign(save.selectedContract, classifiedContract('lantern-warden'));
  save.selectedContract.variant = variant;
  const game = Game.restoreOffline(save);
  game.start();
  game.players.get('solo')!.invulnerableUntil = protectedPlayer ? 1e9 : 0;
  return game;
}
const place = (game: Game, angle: number, radius = 200) => {
  const player = game.players.get('solo')!;
  player.x = game.boss.x + 55 + Math.cos(angle) * radius;
  player.y = game.boss.y + Math.sin(angle) * radius;
};

test('Warden executes harmless warning, actual damage at release and a bounded contact interval', () => {
  const game = encounter('normal', false),
    player = game.players.get('solo')!;
  const aim = game.signatures[0].cone.aim,
    health = player.health;
  place(game, aim);
  for (let tick = 0; tick < 35; tick++) game.step();
  assert.equal(player.health, health);
  assert.equal(game.signatures[0].phase, 'warning');
  game.step();
  assert.equal(game.signatures[0].phase, 'active');
  const damage = health - player.health;
  assert(damage > 0);
  for (let tick = 0; tick < 14; tick++) game.step();
  assert.equal(health - player.health, damage);
  game.step();
  assert(Math.abs(health - player.health - damage * 2) < 1e-9);
});

test('the marked trailing interior stays clear of both auxiliary hazards and signature damage', () => {
  const game = encounter('normal', false),
    player = game.players.get('solo')!;
  const aim = game.signatures[0].cone.aim,
    health = player.health;
  for (let tick = 1; tick < 156; tick++) {
    const next = sampleWarden(tick, { x: game.boss.x + 55, y: game.boss.y }, aim);
    place(game, next.trailingSafe.aim, 220);
    game.step();
    assert.equal(player.health, health);
    if (game.signatures.some((sample) => sample.phase === 'active')) {
      assert.equal(
        [...game.shots.values()].some((shot) => shot.owner === 'hostile'),
        false,
      );
      assert.equal(
        game.fields.some((field) => field.owner === 'hostile'),
        false,
      );
    }
  }
});

test('Warden fan/zone casts use their own radius, duration, damage and rest windows', () => {
  const game = encounter();
  let fan = false,
    zone = false,
    actualZone = false,
    hostileShots = false;
  for (let tick = 0; tick < 1100; tick++) {
    game.step();
    for (const warning of game.warnings) {
      fan ||= warning.kind === 'fan';
      if (warning.kind === 'zone') {
        zone = true;
        assert.equal(warning.radius, 60);
        assert.equal(warning.until - warning.at, 90);
        assert(Math.abs(warning.damage - 9 * 0.975) < 1e-9);
      }
    }
    actualZone ||= game.fields.some((field) => field.kind === 'zone');
    hostileShots ||= [...game.shots.values()].some((shot) => shot.owner === 'hostile');
    if (game.signatures.some((sample) => sample.phase === 'active')) {
      assert.equal(game.warnings.length, 0);
      assert.equal(
        game.fields.some((field) => field.owner === 'hostile'),
        false,
      );
    }
  }
  assert(fan && zone && actualZone && hostileShots);
});

test('Warden Brutal scales health/deadline/contact damage and second visible phase retains the authored delayed sweep', () => {
  const normal = encounter('normal', false),
    brutal = encounter('brutal', false);
  assert.equal(brutal.boss.maxHealth, normal.boss.maxHealth * 2);
  assert.equal(brutal.boss.deadline, normal.boss.deadline * 1.5);
  for (const game of [normal, brutal]) {
    place(game, game.signatures[0].cone.aim);
    for (let tick = 0; tick < 36; tick++) game.step();
  }
  assert(
    Math.abs(
      brutal.players.get('solo')!.damageTaken - normal.players.get('solo')!.damageTaken * 2,
    ) < 1e-9,
  );
  const game = encounter('brutal');
  game.boss.health = game.boss.maxHealth * 0.2;
  for (let tick = 0; tick < 1000 && game.boss.phase < 1; tick++) game.step();
  assert.equal(game.boss.phase, 1);
  for (let tick = 0; tick < 75; tick++) game.step();
  assert.equal(game.signatures.length, 2);
  assert(game.signatures.every((sample) => sample.phase === 'active'));
  const [first, echo] = game.signatures;
  assert.equal(first.tick - echo.tick, 38);
  assert(
    Math.abs(wrappedAngle(first.cone.aim - echo.cone.aim) - (((38 * 24) / 30) * Math.PI) / 180) <
      1e-9,
  );
});

test('an Easy Standard Accord removes the sweep and restarts with a complete new tell after stagger', () => {
  const game = encounter('normal',true,'easy'),
    player = game.players.get('solo')!;
  game.boss.health = game.boss.maxHealth * 0.49;
  player.x = 560;
  player.y = 550;
  for (let tick = 0; tick < 60; tick++) game.step();
  assert.equal(game.accords, 1);
  assert.equal(game.signatures.length, 0);
  const until = game.boss.staggerUntil;
  while (game.combatTick < until - 1) {
    game.step();
    assert.equal(game.signatures.length, 0);
  }
  game.step();
  assert.equal(game.signatures[0].phaseTick, 0);
  for (let tick = 0; tick < 35; tick++) {
    game.step();
    assert.equal(game.signatures[0].phase, 'warning');
  }
  game.step();
  assert.equal(game.signatures[0].phase, 'active');
});

test('Warden defeat clears hazards, grants rewards once and animates on world ticks after combat stops', () => {
  const game = encounter();
  game.boss.health = 0;
  const coins = game.players.get('solo')!.coins;
  game.step();
  assert.equal(game.phase, 'mutationVote');
  assert(game.completedBossIds.has('lantern-warden'));
  assert.equal(game.signatures.length, 0);
  assert.equal(game.warnings.length, 0);
  assert.equal(game.fields.length, 0);
  assert(game.players.get('solo')!.coins > coins);
  assert.deepEqual(wardenCombatPose(game.boss, game.tick, game.combatTick, []), {
    clip: 'defeat',
    frame: 0,
  });
  const banked = game.players.get('solo')!.coins,
    combatTick = game.combatTick;
  for (let tick = 0; tick < 40; tick++) game.step();
  assert.equal(game.players.get('solo')!.coins, banked);
  assert.equal(game.combatTick, combatTick);
  assert.deepEqual(wardenCombatPose(game.boss, game.tick, game.combatTick, []), {
    clip: 'defeat',
    frame: 7,
  });
  assert.equal(
    wardenArt.clips.defeat.frameDurationsMs.reduce((a, b) => a + b),
    1000,
  );
});

test('concealed contracts retain server identity and completed-appearance history through boundaries', () => {
  const game = new Game({ seed: 38, maxPlayers: 1, mode: 'endless' });
  game.addPlayer('solo', 'Mara', 'soldier');
  game.start();
  game.boss.health = 0;
  game.step();
  while ((game.phase as string) === 'mutationVote') game.step();
  assert(
    game.contractCards.every((card) => card.bossId !== 'constable' && card.variant === 'normal'),
  );
  assert(viewOf(game, 'solo').contractCards.every((card) => !('bossId' in card)));
  const restored = Game.restoreOffline(game.offlineCheckpoint());
  assert.deepEqual([...restored.completedBossIds], ['constable']);
  assert.deepEqual(restored.contractCards, game.contractCards);
  const offered = game.contractCards.map((c) => c.bossId);
  while (game.phase !== 'combat') game.step();
  const chosen = game.boss.id;
  assert(offered.includes(chosen));
  assert.equal(
    game.boss.deadline - game.combatTick,
    data.bosses.find((boss) => boss.id === chosen)!.timer * 30,
  );
  game.boss.health = 0;
  game.step();
  while ((game.phase as string) === 'mutationVote') game.step();
  assert(
    game.contractCards.every(
      (card) => !game.completedBossIds.has(card.bossId!) && card.variant === 'normal',
    ),
  );
  assert.throws(() =>
    Game.restoreOffline({
      ...game.offlineCheckpoint()!,
      completedBossIds: ['unimplemented'],
    }),
  );
  assert.equal(Game.restoreOffline(game.offlineCheckpoint()).boss.id, chosen);
  assert.equal(Game.restoreAuthoritative(game.authoritativeCheckpoint()).boss.id, chosen);
});

test('protocol-4 local Practice saves migrate without granting new boss history; online state stays strict', () => {
  const game = new Game({ maxPlayers: 1 });
  game.addPlayer('solo', 'Mara', 'soldier');
  game.start();
  game.boss.health = 0;
  game.step();
  const legacy = JSON.parse(JSON.stringify(game.offlineCheckpoint()));
  legacy.protocolVersion = 4;
  delete legacy.completedBossIds;
  delete legacy.selectedContract.bossId;
  const before = JSON.stringify(legacy);
  const restored = Game.restoreOffline(legacy);
  assert.equal(JSON.stringify(legacy), before, 'migration must not mutate the received save');
  assert.deepEqual([...restored.completedBossIds], ['constable']);
  assert.equal(restored.offlineCheckpoint()!.protocolVersion, PROTOCOL);
  assert.equal(restored.players.get('solo')!.coins, game.players.get('solo')!.coins);
  assert.throws(() => Game.restoreOffline({ ...legacy, serverOnly: true }));
  assert.throws(() =>
    Game.restoreAuthoritative({
      ...game.authoritativeCheckpoint()!,
      protocolVersion: 4,
    }),
  );
  assert.throws(() => Game.restoreOffline({ ...legacy, player: { ...legacy.player, coins: -1 } }));
});

test('hurt and auxiliary casts cannot replace the active signature pose or restart a completed defeat', () => {
  const game = encounter();
  game.boss.hurtAt = 35;
  const active = sampleWarden(36, { x: 855, y: 250 }, 0);
  assert.equal(wardenCombatPose(game.boss, 36, 36, [active]).clip, 'attack');
  const channel = sampleWarden(50, { x: 855, y: 250 }, 0);
  assert.equal(wardenCombatPose(game.boss, 50, 50, [channel]).clip, 'channel');
  assert.equal(wardenCombatPose(game.boss, 36, 36, []).clip, 'hurt');
});
