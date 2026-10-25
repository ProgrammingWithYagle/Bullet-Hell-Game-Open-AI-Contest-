import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Game, type Boss } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { bossDefeatFrame, openingDefeatArt } from '../src/client/boss-defeat-presentation.ts';
import {
  bossTexturePose,
  bossTextureReferences,
  retireBossTexture,
} from '../src/client/boss-textures.ts';
import provenance from '../docs/opening-defeats-2026-10-25.json';

function fixture(id: Boss['id'], variant: 'normal' | 'brutal' = 'normal') {
  const lobby = new Game({ mode: 'endless', maxPlayers: 1, seed: 583 });
  lobby.addPlayer('solo', 'Mara', 'soldier');
  const save = lobby.offlineCheckpoint()!;
  save.selectedContract.bossId = id;
  save.selectedContract.variant = variant;
  const game = Game.restoreOffline(save);
  assert(game.start());
  game.players.get('solo')!.invulnerableUntil = 1e9;
  return game;
}
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

test('seven combined boss atlases retain every original source and bind fifty-six complete new collapse poses', () => {
  assert.equal(provenance.requests.length, 8);
  assert.equal(openingDefeatArt.entries.length, 7);
  for (const request of provenance.requests) {
    assert.equal(sha(request.file), request.sha256);
    assert.equal(sha(request.request), request.requestSha256);
    for (const binding of request.inputBindings)
      assert.equal(sha(binding.projectPath), binding.sha256);
  }
  for (const clip of openingDefeatArt.entries) {
    assert.equal(sha(clip.baseAtlas), clip.baseAtlasSha256);
    assert.equal(sha(clip.defeatSource), clip.defeatSourceSha256);
    assert.equal(sha(clip.atlas), clip.atlasSha256);
    assert.equal(clip.liveFrames, 8);
    assert.equal(clip.frames, 16);
    assert.equal(clip.defeatFrames, 8);
    assert.equal(clip.defeatStartFrame, 8);
    assert.equal(clip.defeatFps, 8);
    const png = readFileSync(clip.atlas);
    assert.equal(png.readUInt32BE(16), clip.cellSize * 4);
    assert.equal(png.readUInt32BE(20), clip.cellSize * 4);
    assert.equal(png[25], 6);
    assert(clip.cellSize <= 512);
    const selected = provenance.requests.filter((r) => r.bossId === clip.bossId).at(-1)!;
    assert.equal(selected.file, clip.defeatSource);
  }
  assert(
    provenance.requests
      .find((r) => r.bossId === 'black-ambulance' && r.version === 1)!
      .status.startsWith('Rejected'),
  );
});

test('all seven normal and Brutal defeats play once on world time after authority stops combat and bank rewards only once', () => {
  for (const clip of openingDefeatArt.entries)
    for (const variant of ['normal', 'brutal'] as const) {
      const game = fixture(clip.bossId as Boss['id'], variant);
      for (let n = 0; n < 70; n++) game.step();
      const beforeKill = viewOf(game, 'solo');
      assert.equal(
        bossDefeatFrame(beforeKill.boss, beforeKill.tick, false, beforeKill.tick + 1.5),
        null,
      );
      game.boss.health = 0;
      assert.equal(
        bossDefeatFrame(game.boss, game.tick),
        null,
        'Zero health alone cannot predict the authority defeat record',
      );
      const coins = game.players.get('solo')!.coins;
      game.step();
      assert(game.completedBossIds.has(clip.bossId as Boss['id']));
      assert(game.players.get('solo')!.coins > coins);
      assert.equal(game.warnings.length, 0);
      assert.equal(game.fields.length, 0);
      assert.equal(game.minions.actors.size, 0);
      const banked = game.players.get('solo')!.coins,
        combatTick = game.combatTick;
      const seen = new Set<number>();
      for (let n = 0; n < 45; n++) {
        const view = viewOf(game, 'solo'),
          before = JSON.stringify(view);
        const frame = bossDefeatFrame(view.boss, view.tick)!;
        seen.add(frame);
        assert(frame >= 8 && frame <= 15);
        assert.equal(JSON.stringify(view), before);
        game.step();
      }
      assert.deepEqual([...seen], [8, 9, 10, 11, 12, 13, 14, 15]);
      assert.equal(game.combatTick, combatTick);
      assert.equal(game.players.get('solo')!.coins, banked);
      assert.equal(bossDefeatFrame(game.boss, game.tick), 15);
    }
});

test('stale cast, hurt and stagger cues cannot restart a settled defeat; reduced motion and a fresh encounter have explicit states', () => {
  for (const clip of openingDefeatArt.entries) {
    const game = fixture(clip.bossId as Boss['id']);
    game.boss.health = 0;
    game.step();
    assert.equal(bossDefeatFrame(game.boss, game.tick, true), 15);
    assert.equal(bossDefeatFrame(game.boss, game.tick, false, NaN), 8);
    const later = game.tick + 60;
    const stale = {
      ...game.boss,
      castAt: game.combatTick,
      castReleaseAt: game.combatTick + 30,
      castEndsAt: game.combatTick + 50,
      hurtAt: game.combatTick,
      staggerUntil: game.combatTick + 120,
    };
    assert.equal(bossDefeatFrame(stale, later), 15);
    assert.equal(bossDefeatFrame(stale, later, false, Infinity), 15);
    const fresh = fixture(clip.bossId as Boss['id']);
    assert.equal(bossDefeatFrame(fresh.boss, fresh.tick), null);
  }
  const other = fixture('constable');
  other.boss.health = 0;
  other.step();
  assert.equal(
    bossDefeatFrame(other.boss, other.tick),
    null,
    'Separate Constable/Warden renderers keep their own complete contracts',
  );
});

test('unavailable collapse atlases use their own exact settled image while live fallback identities stay unchanged', () => {
  assert.equal(bossTextureReferences.settledReferences.length, 7);
  for (const reference of bossTextureReferences.settledReferences) {
    assert.equal(sha(reference.reference), reference.referenceSha256);
    const png = readFileSync(reference.reference);
    assert.equal(png.readUInt32BE(16), reference.referenceWidth);
    assert.equal(png.readUInt32BE(20), reference.referenceHeight);
    assert.equal(reference.sourceFrame, 15);
    for (const frame of [8, 12, 15]) {
      assert.deepEqual(bossTexturePose(reference.bossId, frame, false), {
        key: reference.bossId + '-defeat-reference',
        frame: 0,
      });
      assert.deepEqual(bossTexturePose(reference.bossId, frame, true), {
        key: reference.bossId + '-action',
        frame,
      });
    }
    assert.deepEqual(bossTexturePose(reference.bossId, 4, false), {
      key: reference.bossId + '-reference',
      frame: 0,
    });
  }
  assert(bossTextureReferences.summary.maximumCachedDecodedBytes < 100 * 1024 * 1024);
});

test('evicting a live or defeated combined atlas releases the sprite to the matching identity before texture destruction', () => {
  for (const clip of openingDefeatArt.entries)
    for (const frame of [4, 8, 15]) {
      const calls: string[] = [];
      const holder = {
        texture: { key: clip.bossId + '-action' },
        frame: { name: String(frame) },
        anims: {
          stop() {
            calls.push('stop');
          },
        },
        setTexture(key: string, nextFrame?: number | string) {
          calls.push(key);
          this.texture.key = key;
          this.frame.name = String(nextFrame);
          return this;
        },
      };
      const manager = {
        exists() {
          return true;
        },
        remove(key: string) {
          assert.notEqual(holder.texture.key, key);
          calls.push('remove:' + key);
        },
      };
      retireBossTexture(clip.bossId, holder, manager);
      assert.deepEqual(calls, [
        'stop',
        clip.bossId + (frame >= 8 ? '-defeat-reference' : '-reference'),
        'remove:' + clip.bossId + '-action',
      ]);
    }
});
