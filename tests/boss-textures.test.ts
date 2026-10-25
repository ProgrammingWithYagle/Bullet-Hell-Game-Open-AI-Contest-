import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  BossTextureCache,
  bossTextureReferences,
  bossTexturePose,
  preloadBossTextureBase,
  retireBossTexture,
  BOSS_ATLAS_CAPACITY,
  BOSS_ATLAS_RETRY_MS,
} from '../src/client/boss-textures.ts';
import { encounterArt } from '../src/client/encounter-presentation.ts';
const ids = bossTextureReferences.lazyBossIds;
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
function fixture() {
  const calls: string[] = [],
    evicted: string[] = [],
    held = new Set<string>();
  const pending = new Map<string, { resolve(): void; reject(error: Error): void }>();
  let time = 0;
  const cache = new BossTextureCache(
    {
      load(id) {
        calls.push(id);
        return new Promise<void>((resolve, reject) =>
          pending.set(id, {
            resolve: () => {
              held.add(id);
              pending.delete(id);
              resolve();
            },
            reject: (error) => {
              pending.delete(id);
              reject(error);
            },
          }),
        );
      },
      evict(id) {
        held.delete(id);
        evicted.push(id);
      },
    },
    () => time,
  );
  return {
    cache,
    calls,
    evicted,
    held,
    pending,
    setTime: (value: number) => (time = value),
    complete: (id: string) => pending.get(id)!.resolve(),
    fail: (id: string) => pending.get(id)!.reject(new Error('fixture transport failure')),
  };
}

test('startup loads every boss identity and shared actor but no deferred full boss atlas', () => {
  const calls: { kind: string; key: string; size?: number }[] = [];
  const animations = Object.fromEntries(
    encounterArt.map((e) => [e.bossId + '-action', 'fixture/' + e.bossId]),
  );
  const identities = Object.fromEntries(ids.map((id) => [id, 'fixture/' + id]));
  const loader = {
    image(key: string, _url: string) {
      calls.push({ kind: 'identity', key });
    },
    spritesheet(key: string, _url: string, options: { frameWidth: number; frameHeight: number }) {
      assert.equal(options.frameWidth, options.frameHeight);
      calls.push({ kind: 'atlas', key, size: options.frameWidth });
    },
  };
  preloadBossTextureBase(loader, encounterArt, animations, identities);
  assert.equal(calls.filter((c) => c.kind === 'identity').length, 57);
  assert.equal(calls.filter((c) => c.kind === 'atlas').length, 8);
  assert(
    calls.some((c) => c.key === 'regent-action'),
    'Cross-encounter historical Regent stays preloaded',
  );
  for (const id of ids) assert(!calls.some((c) => c.key === id + '-action'));
  for (const id of [
    'rat',
    'infirmary-minion',
    'choir-voice',
    'crow',
    'bell-keeper',
    'throne-attendant',
    'moth',
  ])
    assert(calls.some((c) => c.key === id + '-action'));
  assert.throws(
    () => preloadBossTextureBase(loader, encounterArt, animations, {}),
    /Missing boss identity/,
  );
});

test('all 57 exact identity references keep their original atlas, dimensions, origin and world size', () => {
  for (const entry of bossTextureReferences.entries) {
    const original = encounterArt.find((e) => e.bossId === entry.bossId)!;
    assert.equal(sha(entry.sourceAtlas), entry.sourceAtlasSha256);
    assert.equal(original.atlasSha256, entry.sourceAtlasSha256);
    assert.equal(sha(entry.reference), entry.referenceSha256);
    assert.deepEqual(entry.origin, original.origin);
    assert.equal(entry.displayCell, original.displayCell);
    const png = readFileSync(entry.reference);
    assert.equal(png.readUInt32BE(16), original.cellSize);
    assert.equal(png.readUInt32BE(20), original.cellSize);
    assert.equal(png[25], 6);
  }
  assert(
    bossTextureReferences.summary.maximumCachedDecodedBytes <
      bossTextureReferences.summary.baselineDecodedBytes * 0.3,
  );
});

test('an unavailable full atlas uses that same boss identity at frame zero and ready/shared textures keep their actual pose', () => {
  for (const id of ids) {
    assert.deepEqual(bossTexturePose(id, 5, false), { key: id + '-reference', frame: 0 });
    assert.deepEqual(bossTexturePose(id, 5, true), { key: id + '-action', frame: 5 });
  }
  for (const id of bossTextureReferences.alwaysLoadedIds)
    assert.deepEqual(bossTexturePose(id, 3, false), { key: id + '-action', frame: 3 });
});

test('one in-flight request coalesces repeated and superseded bosses without retaining stale completions', async () => {
  const f = fixture();
  const [a, b, c] = ids;
  f.cache.request(a);
  f.cache.request(a);
  f.cache.request(b);
  f.cache.request(c);
  assert.deepEqual(f.calls, [a]);
  assert.equal(f.pending.size, 1);
  f.complete(a);
  await flush();
  assert.deepEqual(f.calls, [a, c]);
  assert.deepEqual(f.evicted, [a]);
  f.complete(c);
  await flush();
  assert.deepEqual(f.cache.diagnostics().loaded, [c]);
  assert.deepEqual([...f.held], [c]);
  f.cache.request(c);
  assert.deepEqual(f.calls, [a, c]);
});

test('cycling the full boss roster retains at most two decoded full atlases and reserves space before each load', async () => {
  const f = fixture();
  for (const id of ids) {
    f.cache.request(id);
    assert(f.held.size <= 1);
    assert.equal(f.pending.size, 1);
    f.complete(id);
    await flush();
    assert(f.held.size <= 2);
    assert(f.cache.diagnostics().loaded.length <= 2);
    assert(f.held.has(id));
    assert.equal(f.cache.diagnostics().loading, null);
  }
  assert.equal(BOSS_ATLAS_CAPACITY, 2);
  assert.equal(f.calls.length, 57);
  assert.deepEqual(f.cache.diagnostics().loaded, ids.slice(-2));
});

test('failed loads keep the identity available and retry only after five seconds with a monotonic finite clock', async () => {
  const f = fixture(),
    id = ids[0];
  f.cache.request(id);
  f.fail(id);
  await flush();
  assert.equal(f.cache.diagnostics().failedLoads, 1);
  for (const time of [0, 100, 4999, Number.NaN, -100]) {
    f.setTime(time);
    f.cache.request(id);
    assert.equal(f.calls.length, 1);
  }
  f.setTime(5000);
  f.cache.request(id);
  assert.equal(f.calls.length, 2);
  f.complete(id);
  await flush();
  assert(f.held.has(id));
  assert.equal(BOSS_ATLAS_RETRY_MS, 5000);
});

test('scene shutdown releases cached resources and rejects further requests, including a late completion', async () => {
  const f = fixture();
  f.cache.request(ids[0]);
  f.complete(ids[0]);
  await flush();
  f.cache.request(ids[1]);
  f.cache.dispose();
  f.cache.request(ids[2]);
  assert.equal(f.calls.length, 2);
  assert.equal(f.held.size, 0);
  f.complete(ids[1]);
  await flush();
  assert.equal(f.held.size, 0);
  assert.equal(f.cache.diagnostics().disposed, true);
  assert.deepEqual(f.cache.diagnostics().loaded, []);
  const unknown = fixture();
  for (const id of ['constable', 'lantern-warden', 'regent', 'not-authored'])
    unknown.cache.request(id);
  assert.equal(unknown.calls.length, 0);
});

test('a live boss sprite releases its old atlas for its own identity before the texture is destroyed', () => {
  const id = ids[0],
    events: string[] = [];
  const sprite = {
    texture: { key: id + '-action' },
    anims: {
      stop() {
        events.push('stop');
      },
    },
    setTexture(key: string, frame?: number | string) {
      assert.equal(frame, 0);
      this.texture.key = key;
      events.push(key);
    },
  };
  const textures = {
    exists: () => true,
    remove(key: string) {
      assert.notEqual(sprite.texture.key, key);
      events.push('remove:' + key);
    },
  };
  retireBossTexture(id, sprite, textures);
  assert.deepEqual(events, ['stop', id + '-reference', 'remove:' + id + '-action']);
});
