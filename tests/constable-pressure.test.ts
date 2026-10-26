import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Game, data } from '../src/shared/game.ts';
import { classifiedContract } from '../src/shared/boss-threat.ts';
import { segmentRect, distance } from '../src/shared/geometry.ts';
import { BossVisualMotion } from '../src/client/boss-visual-motion.ts';
import { constableArt, constableCombatPose } from '../src/client/constable-presentation.ts';
import { constablePhaseName } from '../src/client/constable-phase-text.ts';
import labels from '../src/client/constable-phase-labels.json';

function fixture(
  variant: 'normal' | 'brutal' = 'normal',
  arenaId = 'gatehouse',
  invulnerable = true,
  difficulty='normal',
) {
  const lobby = new Game({
    seed: 415,difficulty,
    mode: 'endless',
    maxPlayers: 1,
    openingBossId: 'constable',
    openingArenaId: arenaId,
  });
  lobby.addPlayer('solo', 'Mara', 'soldier');
  const save = lobby.offlineCheckpoint()!;
  Object.assign(save.selectedContract, classifiedContract('constable'), { variant });
  const game = Game.restoreOffline(save);
  assert(game.start());
  if (invulnerable) game.players.get('solo')!.invulnerableUntil = 1e9;
  return game;
}
function phase(game: Game, index: number) {
  index=Math.min(1,index);
  game.boss.health = game.boss.maxHealth * [1, 0.49][index];
  for (let n = 0; game.boss.phase < index; n++) {
    assert(n < 1000);
    game.step();
  }
}

test('Constable two-phase schedule executes opening volleys and final shared-gap rings with Brutal pincers', () => {
  for (const variant of ['normal', 'brutal'] as const)
    for (let visible = 0; visible < 2; visible++) {
      const stage=visible===0?0:variant==='brutal'?3:2;
      const game = fixture(variant);
      phase(game, visible);
      const start = game.combatTick;
      while (game.boss.castAt <= start || !game.warnings.some((w) => w.kind !== 'zone')) {
        game.step();
        assert(game.combatTick - start < 200);
      }
      const warnings = game.warnings.filter((w) => w.kind !== 'zone');
      assert.equal(new Set(warnings.map((w) => w.id)).size, warnings.length);
      assert(warnings.every((w) => w.at - game.combatTick >= 25));
      if (stage === 0) {
        assert.equal(warnings.length, variant === 'brutal' ? 4 : 2);
        assert(warnings.every((w) => w.kind === 'fan'));
        assert.equal(warnings[1].at - warnings[0].at, 12);
      } else {
        const rings = warnings.filter((w) => w.kind === 'ring');
        assert.equal(rings.length, stage === 3 || variant === 'brutal' ? 3 : 2);
        assert.equal(warnings.filter((w) => w.kind === 'fan').length, stage === 3 ? 2 : 0);
        const commonGap =
          rings[0].arc -
          (Math.max(...rings.map((w) => w.aim)) - Math.min(...rings.map((w) => w.aim)));
        assert(commonGap > Math.PI / 4, 'Staggered rings retain a substantial common escape wedge');
        assert(warnings.reduce((n, w) => n + w.count, 0) >= 46);
      }
      assert.equal(game.boss.castEndsAt, Math.max(...warnings.map((w) => w.at)) + 20);
      assert.equal(game.boss.threat, 1);
      assert.equal(classifiedContract('constable').subtier, 1);
    }
});

test('all maps keep walking Constable inside bounds and cover while casts, Accords and stagger plant his feet', () => {
  for (const map of data.arenas) {
    const game = fixture('normal', map.id,true,'easy');
    const start = { x: game.boss.x, y: game.boss.y };
    let traveled = 0;
    for (let n = 0; n < 700; n++) {
      const old = { ...game.boss };
      game.step();
      const b = game.boss,
        box = game.arena.bounds;
      const step = distance(old, b);
      traveled += step;
      assert(step <= 56 / 30 + 1e-6, `${map.id}: bounded physical step`);
      assert(
        b.x >= box.x + 58 &&
          b.x <= box.x + box.width - 58 &&
          b.y >= box.y + 58 &&
          b.y <= box.y + box.height - 58,
      );
      for (const rect of game.arena.obstacles)
        assert(!segmentRect(b, b, rect, 58 - 0.001), `${map.id}: cover penetration`);
      if (game.combatTick < game.boss.castEndsAt) assert.equal(step, 0);
    }
    assert(
      traveled > 65,
      `${map.id}: patrol actually changes position (${traveled}, net ${distance(start, game.boss)})`,
    );
    game.boss.staggerUntil = game.combatTick + 90;
    const planted = { ...game.boss };
    for (let n = 0; n < 60; n++) {
      game.step();
      assert.equal(distance(planted, game.boss), 0);
    }
    game.boss.staggerUntil = 0;
    game.boss.health = game.boss.maxHealth * 0.49;
    game.step();
    assert(game.accord);
    const accordPosition = { ...game.boss };
    for (let n = 0; n < 30; n++) {
      game.step();
      assert.equal(distance(accordPosition, game.boss), 0);
    }
  }
});

test('warning origins and aim remain locked through both volley releases and movement resumes afterwards', () => {
  const game = fixture();
  while (!game.boss.castAt) game.step();
  const warnings = game.warnings.map((w) => ({ ...w }));
  const origin = { ...game.boss };
  const releases = new Map<number, number>();
  game.drainEvents();
  for (let n = 0; n < 90; n++) {
    const until = game.boss.castEndsAt;
    game.step();
    const emitted = game.drainEvents().flatMap((e) => (e.type === 'shots' ? e.shots : []));
    if (game.combatTick < until) assert.equal(distance(origin, game.boss), 0);
    for (const pending of game.warnings) {
      const locked = warnings.find((w) => w.id === pending.id);
      if (locked) assert.deepEqual(pending, locked);
    }
    for (const warning of warnings)
      if (game.combatTick === warning.at) {
        const batch = emitted.filter((s) => s.owner === 'hostile');
        assert.equal(batch.length, warning.count);
        releases.set(warning.at, batch.length);
      }
    if (game.combatTick >= until && distance(origin, game.boss) > 0) break;
  }
  assert.equal(releases.size, 2);
  assert(distance(origin, game.boss) > 0);
});

test('actual lockdown projectiles preserve the announced overlapping escape wedge', () => {
  const game = fixture();
  phase(game, 2);
  const start = game.combatTick;
  while (game.boss.castAt <= start || !game.warnings.some((w) => w.kind === 'ring')) game.step();
  const rings = game.warnings.filter((w) => w.kind === 'ring').map((w) => ({ ...w }));
  const safeAim = (Math.min(...rings.map((w) => w.aim)) + Math.max(...rings.map((w) => w.aim))) / 2;
  let checked = 0;
  game.drainEvents();
  for (let n = 0; n < 100; n++) {
    game.step();
    const emitted = game.drainEvents().flatMap((e) => (e.type === 'shots' ? e.shots : []));
    for (const ring of rings)
      if (game.combatTick === ring.at) {
        const shots = emitted.filter((s) => s.owner === 'hostile');
        assert.equal(shots.length, ring.count);
        for (const shot of shots) {
          const angle = Math.atan2(shot.vy, shot.vx);
          const delta = Math.atan2(Math.sin(angle - safeAim), Math.cos(angle - safeAim));
          assert(
            Math.abs(delta) >= Math.PI / 8,
            'No ring projectile crosses the central 45-degree escape sector',
          );
        }
        checked++;
      }
    if (checked === rings.length) break;
  }
  assert.equal(checked, 2);
});

test('stationary survivors take real arrest damage while leaving the locked zone avoids that field', () => {
  const game = fixture('normal', 'gatehouse', false);
  const player = game.players.get('solo')!;
  let locked: { x: number; y: number; at: number; until: number; radius: number } | undefined;
  while (!locked) {
    game.step();
    locked = game.warnings.find((w) => w.kind === 'zone' && distance(w, player) < 1);
    assert(game.combatTick < 250);
  }
  const health = player.health + player.shield;
  const impact = Math.ceil(locked.at / 30) * 30;
  while (game.combatTick < impact) game.step();
  assert(
    player.health + player.shield < health,
    'An occupied arrest field really damages the survivor',
  );
  const other = fixture('normal', 'gatehouse', false);
  const moving = other.players.get('solo')!;
  while (other.combatTick < impact - 1) {
    other.step();
    if (other.combatTick === locked.at - 2) {
      const angle = Math.atan2(locked.y - other.boss.y, locked.x - other.boss.x);
      moving.x = locked.x + Math.cos(angle) * (locked.radius + 45);
      moving.y = locked.y + Math.sin(angle) * (locked.radius + 45);
    }
  }
  const safeHealth = moving.health + moving.shield;
  other.step();
  assert.equal(moving.health + moving.shield, safeHealth);
});

test('boss locomotion holds between 30 Hz positions at 60 Hz draw and resets at cast boundaries', () => {
  const game = fixture();
  const clock = new BossVisualMotion();
  let runFrames = 0;
  for (let frame = 0; frame < 180; frame++) {
    game.boss.x = 800 + Math.floor(frame / 2);
    const moving = clock.sample(game.boss, frame / 2, true);
    if (frame >= 2) {
      assert(moving);
      runFrames++;
    }
  }
  assert.equal(runFrames, 178);
  assert(!clock.sample(game.boss, 90, false));
  assert(!clock.sample(game.boss, 91, true));
  assert(!clock.sample(game.boss, 95, true));
  game.boss.x++;
  assert(clock.sample(game.boss, 96, true));
  assert(!clock.sample(game.boss, 100, true));
  game.boss.hurtAt = game.combatTick;
  assert.equal(constableCombatPose(game.boss, 0, 0, false, undefined, true).clip, 'shuffle');
  game.boss.castAt = 0;
  game.boss.castReleaseAt = 26;
  game.boss.castEndsAt = 58;
  assert.equal(constableCombatPose(game.boss, 0, 0, false, undefined, true).clip, 'attack');
  game.boss.staggerUntil = 90;
  assert.equal(constableCombatPose(game.boss, 0, 0, false, undefined, true).clip, 'stagger');
  game.boss.health = 0;
  game.boss.defeatedAt = 1;
  assert.equal(constableCombatPose(game.boss, 1, 0, false, undefined, true).clip, 'defeat');
});

test('the selected four-pose atlas binds exact independent reconstruction and the original 27-pose contract', () => {
  const result = JSON.parse(
    readFileSync('reviews/constable-pressure-2026-10-25/shuffle-reconstruction.json', 'utf8'),
  );
  const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  assert.equal(sha(result.verifier), result.verifierSha256);
  for (const input of result.inputs) assert.equal(sha(input.path), input.sha256);
  assert(result.passed && result.retained27PosesUnchanged && result.wholeNativeRgbaConserved);
  assert.equal(constableArt.clips.shuffle.frames, 4);
  const atlas = readFileSync(constableArt.clips.shuffle.atlas);
  assert.equal(atlas[25], 6);
  assert.equal(atlas.readUInt32BE(16), constableArt.clips.shuffle.cellSize * 4);
});

test('named Constable phases cover all fifteen supported languages and retain the ordinary phase number', () => {
  assert.deepEqual(Object.keys(labels).sort(), data.locales.map((l) => l.id).sort());
  for (const language of data.locales) {
    const names = [0, 1, 2, 3].map((p) => constablePhaseName(p, language.id));
    assert.equal(new Set(names).size, 4);
    assert(names.every((n) => typeof n === 'string' && n.length > 0));
  }
  assert.equal(constablePhaseName(2, 'missing'), 'Lockdown');
});

test('Easy Standard shield transitions cancel outgoing volleys, arrest fields and stale cast poses', () => {
  for (const boundary of ['volley', 'arrest']) {
    const game = fixture('normal','gatehouse',true,'easy');
    while (
      boundary === 'volley' ? !game.shots.size : !game.fields.some((f) => f.owner === 'hostile')
    ) {
      game.step();
      assert(game.combatTick < 200);
    }
    if (boundary === 'volley') assert(game.warnings.some((w) => w.kind === 'fan'));
    const origin = { ...game.boss };
    game.boss.health = game.boss.maxHealth * 0.49;
    game.step();
    assert.equal(game.boss.phase, 1);
    assert(game.accord);
    assert.equal(game.warnings.length, 0);
    assert.equal([...game.shots.values()].filter((s) => s.owner === 'hostile').length, 0);
    assert.equal(game.fields.filter((f) => f.owner === 'hostile').length, 0);
    assert.equal(game.boss.castReleaseAt, 0);
    assert.equal(distance(origin, game.boss), 0);
  }
});

test('issued map/fixed-grade Practice boundaries preserve identity and progress through the Constable content revision', () => {
  for (const version of [13, 14]) {
    const lobby = new Game({ seed: 891, mode: 'endless', maxPlayers: 1 });
    lobby.addPlayer('solo', 'Mara', 'soldier');
    const player = lobby.players.get('solo')!;
    player.coins = 987;
    player.upgrades.damage = 2;
    const save = lobby.offlineCheckpoint()!;
    save.protocolVersion = version;
    save.contentRevision = 'b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241';
    const before = JSON.stringify(save);
    const restored = Game.restoreOffline(save);
    const after = restored.offlineCheckpoint()!;
    assert.equal(after.settings.runId, save.settings.runId);
    assert.equal(after.player.coins, 987);
    assert.deepEqual(after.player.upgrades, save.player.upgrades);
    assert.deepEqual(after.player.progress, save.player.progress);
    assert.deepEqual(after.completedBossIds, save.completedBossIds);
    assert.deepEqual(after.endlessHistory, save.endlessHistory);
    assert.notEqual(after.contentRevision, save.contentRevision);
    assert.equal(JSON.stringify(save), before);
  }
});

test('content-only migration still rejects unknown revisions, online records and forged current-version threat cards', () => {
  const lobby = new Game({ seed: 891, mode: 'endless', maxPlayers: 1 });
  lobby.addPlayer('solo', 'Mara', 'soldier');
  const issued = lobby.offlineCheckpoint()!;
  issued.contentRevision = 'b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241';
  const unknown = structuredClone(issued);
  unknown.contentRevision = 'f'.repeat(64);
  assert.throws(() => Game.restoreOffline(unknown));
  const online = { ...issued, practiceOnly: false, serverOnly: true };
  assert.throws(() => Game.restoreOffline(online));
  for (const fields of [{ threat: 10 }, { subtier: -2 }, { risk: 1 }]) {
    const forged = structuredClone(issued);
    Object.assign(forged.selectedContract, fields);
    assert.throws(() => Game.restoreOffline(forged));
  }
  const premium = structuredClone(issued);
  premium.selectedContract.bounty = 2.5;
  assert.equal(
    Game.restoreOffline(premium).offlineCheckpoint()!.selectedContract.bounty,
    classifiedContract('constable').bounty,
  );
});
