import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { Game } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { constableArt, constableCombatPose } from '../src/client/constable-presentation.ts';
import provenance from '../docs/constable-motion-2026-10-25.json';
import metadataBinding from '../reviews/constable-motion-2026-10-25/metadata-portability.json';

function fixture(variant: 'normal' | 'brutal' = 'normal') {
  const lobby = new Game({ mode: 'endless', seed: 583, maxPlayers: 1 });
  lobby.addPlayer('solo', 'Mara', 'soldier');
  const checkpoint = lobby.offlineCheckpoint()!;
  checkpoint.selectedContract.bossId = 'constable';
  checkpoint.selectedContract.variant = variant;
  const game = Game.restoreOffline(checkpoint);
  assert(game.start());
  game.players.get('solo')!.invulnerableUntil = 1e9;
  return game;
}

test('Constable retains all four native sheets, nineteen complete poses and the original eight attack frames', () => {
  const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  assert.equal(provenance.requests.length, 4);
  assert.equal(constableArt.entries.length, 5);
  assert.equal(
    constableArt.entries.reduce((n, clip) => n + clip.frames, 0),
    27,
  );
  for (const request of provenance.requests) {
    assert.equal(sha(request.file), request.sha256);
    assert.equal(sha(request.request), request.requestSha256);
    for (const binding of request.inputBindings)
      assert.equal(sha(binding.projectPath), binding.sha256);
  }
  for (const clip of constableArt.entries) {
    assert.equal(sha(clip.atlas), clip.atlasSha256);
    const png = readFileSync(clip.atlas);
    assert.equal(png.readUInt32BE(16), clip.cellSize * clip.columns);
    assert.equal(png.readUInt32BE(20), clip.cellSize * Math.ceil(clip.frames / clip.columns));
    assert.equal(png[25], 6);
  }
  assert.equal(sha(provenance.priorAttack.atlas), provenance.priorAttack.atlasSha256);
  assert.equal(sha(metadataBinding.issuedWindowsReference), provenance.priorAttack.metadataSha256);
  assert(
    [metadataBinding.issuedWindowsSha256, metadataBinding.canonicalGitBlobSha256].includes(
      sha(provenance.priorAttack.metadata),
    ),
  );
  assert.equal(
    createHash('sha256')
      .update(readFileSync(provenance.priorAttack.metadata, 'utf8').replaceAll('\r\n', '\n'))
      .digest('hex'),
    metadataBinding.canonicalGitBlobSha256,
  );
  assert.equal(constableArt.clips.attack.displayCell, 300);
  assert.equal(constableArt.groundOffsetY, 65);
});

test('normal and Brutal Constable casts hold anticipation until actual authority release and never mutate game state', () => {
  for (const variant of ['normal', 'brutal'] as const) {
    const game = fixture(variant);
    let anticipation = 0,
      releases = 0,
      sawZone = false;
    for (let tick = 0; tick < 500; tick++) {
      game.step();
      const before = JSON.stringify(game.offlineCheckpoint());
      const view = viewOf(game, 'solo');
      const pose = constableCombatPose(view.boss, view.tick, view.combatTick);
      if (view.combatTick >= view.boss.castAt && view.combatTick < view.boss.castReleaseAt) {
        assert.equal(pose.clip, 'attack');
        assert(pose.frame >= 1 && pose.frame <= 3);
        anticipation++;
        sawZone ||= view.warnings.some((w) => w.kind === 'zone');
      }
      if (view.combatTick === view.boss.castReleaseAt && view.boss.castReleaseAt > 0) {
        assert.deepEqual(pose, { clip: 'attack', frame: 4 });
        releases++;
      }
      assert.equal(JSON.stringify(game.offlineCheckpoint()), before);
    }
    assert(anticipation > 100 && releases >= 4 && sawZone);
  }
});

test('drawing lead cannot release early and the old ten-fps warning-start release would be fourteen ticks early', () => {
  const game = fixture();
  while (!game.boss.castReleaseAt) game.step();
  assert.equal(game.boss.castReleaseAt - game.boss.castAt, 26);
  assert.equal(game.boss.castReleaseAt - (game.boss.castAt + 12), 14);
  while (game.combatTick < game.boss.castReleaseAt - 1) game.step();
  const before = JSON.stringify(game.boss);
  assert.deepEqual(
    constableCombatPose(game.boss, game.tick, game.combatTick, false, {
      tick: game.tick + 1.5,
      combatTick: game.combatTick + 1.5,
    }),
    { clip: 'attack', frame: 3 },
  );
  game.step();
  assert.deepEqual(constableCombatPose(game.boss, game.tick, game.combatTick), {
    clip: 'attack',
    frame: 4,
  });
  assert.equal(game.boss.castAt, JSON.parse(before).castAt);
});

test('hurt cannot replace a warning, recovery or stagger, and becomes its own planted three-pose response at rest', () => {
  const game = fixture();
  game.boss.hurtAt = game.combatTick;
  assert.deepEqual(constableCombatPose(game.boss, game.tick, game.combatTick), {
    clip: 'hurt',
    frame: 0,
  });
  assert.deepEqual(constableCombatPose(game.boss, game.tick + 6, game.combatTick + 6), {
    clip: 'hurt',
    frame: 2,
  });
  assert.equal(constableCombatPose(game.boss, game.tick + 9, game.combatTick + 9).clip, 'idle');
  while (!game.boss.castReleaseAt) game.step();
  game.boss.hurtAt = game.combatTick;
  assert.equal(constableCombatPose(game.boss, game.tick, game.combatTick).clip, 'attack');
  while (game.combatTick < game.boss.castReleaseAt) game.step();
  game.boss.hurtAt = game.combatTick;
  assert.deepEqual(constableCombatPose(game.boss, game.tick, game.combatTick), {
    clip: 'attack',
    frame: 4,
  });
  game.boss.staggerUntil = game.combatTick + 120;
  assert.equal(constableCombatPose(game.boss, game.tick, game.combatTick).clip, 'stagger');
});

test('a real successful Accord replaces interrupted casts with the complete stagger interval', () => {
  const game = fixture();
  game.boss.health = game.boss.maxHealth * 0.7;
  const player = game.players.get('solo')!;
  player.x = 560;
  player.y = 550;
  while (!game.accords) {
    game.step();
    assert(game.combatTick < 100);
  }
  assert.equal(game.warnings.length, 0);
  assert.equal(game.boss.castReleaseAt, 0);
  const seen = new Set<number>();
  while (game.combatTick < game.boss.staggerUntil - 1) {
    const pose = constableCombatPose(game.boss, game.tick, game.combatTick);
    assert.equal(pose.clip, 'stagger');
    seen.add(pose.frame);
    game.step();
  }
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3]);
  game.step();
  assert.notEqual(constableCombatPose(game.boss, game.tick, game.combatTick).clip, 'stagger');
});

test('Constable defeat plays on world time after combat stops, settles once and retains the banked reward', () => {
  const game = fixture();
  game.boss.health = 0;
  const coins = game.players.get('solo')!.coins;
  game.step();
  assert(game.players.get('solo')!.coins > coins);
  const banked = game.players.get('solo')!.coins,
    combatTick = game.combatTick,
    seen = new Set<number>();
  for (let tick = 0; tick < 50; tick++) {
    const pose = constableCombatPose(game.boss, game.tick, game.combatTick);
    assert.equal(pose.clip, 'defeat');
    seen.add(pose.frame);
    game.step();
  }
  assert.equal(game.combatTick, combatTick);
  assert.equal(game.players.get('solo')!.coins, banked);
  assert.deepEqual([...seen], [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(
    constableCombatPose(
      {
        ...game.boss,
        hurtAt: game.combatTick,
        castAt: game.combatTick,
        castReleaseAt: game.combatTick + 30,
        castEndsAt: game.combatTick + 50,
      },
      game.tick,
      game.combatTick,
    ),
    { clip: 'defeat', frame: 7 },
  );
});

test('reduced motion preserves every authoritative state with bounded readable frames', () => {
  const game = fixture();
  assert.deepEqual(constableCombatPose(game.boss, game.tick, game.combatTick, true), {
    clip: 'idle',
    frame: 0,
  });
  game.boss.hurtAt = game.combatTick;
  assert.deepEqual(constableCombatPose(game.boss, game.tick, game.combatTick, true), {
    clip: 'hurt',
    frame: 0,
  });
  while (!game.boss.castReleaseAt) game.step();
  assert.deepEqual(constableCombatPose(game.boss, game.tick, game.combatTick, true), {
    clip: 'attack',
    frame: 3,
  });
  while (game.combatTick < game.boss.castReleaseAt) game.step();
  assert.deepEqual(constableCombatPose(game.boss, game.tick, game.combatTick, true), {
    clip: 'attack',
    frame: 4,
  });
  game.boss.staggerUntil = game.combatTick + 120;
  assert.deepEqual(constableCombatPose(game.boss, game.tick, game.combatTick, true), {
    clip: 'stagger',
    frame: 0,
  });
  game.boss.health = 0;
  game.step();
  assert.deepEqual(constableCombatPose(game.boss, game.tick, game.combatTick, true), {
    clip: 'defeat',
    frame: 7,
  });
  assert.equal(
    constableCombatPose(game.boss, game.tick, game.combatTick, false, {
      tick: NaN,
      combatTick: Infinity,
    }).frame,
    0,
  );
});

test('Constable metadata binds both the exact committed LF blob and historical Windows CRLF bytes', () => {
  const sha = (value: Buffer) => createHash('sha256').update(value).digest('hex');
  const committed = execFileSync('git', [
    '-c',
    'core.bare=false',
    'show',
    'HEAD:' + metadataBinding.metadata,
  ]);
  const issued = readFileSync(metadataBinding.issuedWindowsReference);
  assert.equal(sha(committed), metadataBinding.canonicalGitBlobSha256);
  assert.equal(sha(issued), metadataBinding.issuedWindowsSha256);
  assert.equal(
    sha(readFileSync(metadataBinding.issuedProvenance)),
    metadataBinding.issuedProvenanceSha256,
  );
  assert(issued.equals(Buffer.from(committed.toString('utf8').replaceAll('\n', '\r\n'))));
  assert.deepEqual(JSON.parse(committed.toString()), JSON.parse(issued.toString()));
  const allowed = [metadataBinding.canonicalGitBlobSha256, metadataBinding.issuedWindowsSha256];
  assert(!allowed.includes(sha(Buffer.concat([committed, Buffer.from(' ')]))));
  assert(!allowed.includes(sha(Buffer.from(committed.toString().replace('512', '513')))));
});
