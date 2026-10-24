import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chooseMusicBuffer, validMusicDuration } from '../src/client/audio-delivery.ts';
import library from '../assets/production/audio/delivery/library.json';
import { bossThemes } from '../src/client/boss-music.ts';
test('61 compressed tracks retain exact original master hashes and delivery hashes', () => {
  assert.deepEqual(
    library.tracks.map((t) => t.id).sort(),
    ['city-wake', ...Object.values(bossThemes)].sort(),
  );
  for (const t of library.tracks) {
    for (const [path, hash] of [
      [t.masterPath, t.masterSha256],
      [t.deliveryPath, t.deliverySha256],
    ])
      assert.equal(
        createHash('sha256')
          .update(readFileSync(new URL('../' + path, import.meta.url)))
          .digest('hex'),
        hash,
      );
    assert(t.deliveryBytes < t.masterBytes * 0.15);
  }
});
test('music duration tolerates resampling but rejects encoder padding and invalid buffers', () => {
  assert(validMusicDuration({ length: 48000, sampleRate: 48000 }, 44100, 44100));
  assert(!validMusicDuration({ length: 44676, sampleRate: 44100 }, 44100, 44100));
  assert(!validMusicDuration({ length: 1, sampleRate: NaN }, 1, 44100));
});
test('bad compressed padding falls back to PCM and stays bypassed for the page', async () => {
  const failed = new Set<string>(),
    seen: string[] = [],
    invalid: string[] = [];
  const pair = { compressed: 'mp3', master: 'wav', frames: 44100, rate: 44100 };
  const load = async (url: string) => {
    seen.push(url);
    return { length: url === 'mp3' ? 44676 : 44100, sampleRate: 44100 };
  };
  assert.equal((await chooseMusicBuffer(pair, load, failed, (u) => invalid.push(u))).url, 'wav');
  assert.deepEqual(invalid, ['mp3']);
  assert.equal((await chooseMusicBuffer(pair, load, failed, () => {})).url, 'wav');
  assert.deepEqual(seen, ['mp3', 'wav', 'wav']);
});
test('decoder failure preserves playback through PCM; two invalid decoders fail without a source', async () => {
  const pair = { compressed: 'mp3', master: 'wav', frames: 44100, rate: 44100 };
  assert.equal(
    (
      await chooseMusicBuffer(
        pair,
        async (u) => {
          if (u === 'mp3') throw Error('codec');
          return { length: 44100, sampleRate: 44100 };
        },
        new Set(),
        () => {},
      )
    ).url,
    'wav',
  );
  await assert.rejects(
    chooseMusicBuffer(
      pair,
      async () => ({ length: 2, sampleRate: 44100 }),
      new Set(),
      () => {},
    ),
  );
});
