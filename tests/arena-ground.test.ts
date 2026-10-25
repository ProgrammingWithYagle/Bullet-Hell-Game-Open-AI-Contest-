import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runtimeArenas, runtimeArena } from '../src/shared/arena-layouts.ts';
import {
  ARENA_BACKDROP_DEPTH,
  ARENA_GROUND_DEPTH,
  applyArenaGround,
  arenaGroundArt,
  arenaGroundPlacement,
  preloadArenaGrounds,
} from '../src/client/arena-presentation.ts';
import provenance from '../docs/arena-ground-2026-10-25.json';

test('five opaque ground paintings bind their exact natives and all six existing map footprints', () => {
  const sha = (value: Buffer) => createHash('sha256').update(value).digest('hex');
  assert.equal(arenaGroundArt.entries.length, 6);
  assert.equal(provenance.requests.length, 5);
  assert.equal(
    sha(
      execFileSync('git', [
        '-c',
        'core.bare=false',
        'show',
        'HEAD:' + arenaGroundArt.geometrySource,
      ]),
    ),
    arenaGroundArt.geometrySourceSha256,
  );
  let decoded = 0;
  for (const entry of arenaGroundArt.entries) {
    assert.deepEqual(entry.worldBounds, runtimeArena(entry.id).bounds);
    assert.equal(sha(readFileSync(entry.source)), entry.sourceSha256);
    const png = readFileSync(entry.image);
    assert.equal(sha(png), entry.imageSha256);
    assert.equal(png.readUInt32BE(16), entry.imageSize[0]);
    assert.equal(png.readUInt32BE(20), entry.imageSize[1]);
    assert([2, 6].includes(png[25]));
    assert.equal(entry.decodedRgbaBytes, entry.imageSize[0] * entry.imageSize[1] * 4);
    if (!entry.unchangedOriginal) decoded += entry.decodedRgbaBytes;
  }
  assert.equal(decoded, 25_576_800);
  assert(decoded < 26 * 1024 * 1024);
  const old = arenaGroundArt.entries.find((e) => e.id === 'gatehouse')!;
  assert.equal(old.source, old.image);
  assert.equal(old.sourceSha256, old.imageSha256);
  for (const request of provenance.requests) {
    assert.equal(sha(readFileSync(request.file)), request.sha256);
    assert.equal(sha(readFileSync(request.request)), request.requestSha256);
    for (const binding of request.inputBindings)
      assert.equal(sha(readFileSync(binding.projectPath)), binding.sha256);
  }
});

test('map switches reset the whole floor rectangle below cover without changing collision, bounds or spawns', () => {
  const before = JSON.stringify(runtimeArenas);
  const state = {
    texture: '',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    originX: 0,
    originY: 0,
    depth: 0,
    alpha: 0,
    visible: false,
  };
  const image = {
    setTexture(key: string) {
      state.texture = key;
      return this;
    },
    setPosition(x: number, y: number) {
      state.x = x;
      state.y = y;
      return this;
    },
    setOrigin(x: number, y: number) {
      state.originX = x;
      state.originY = y;
      return this;
    },
    setDisplaySize(width: number, height: number) {
      state.width = width;
      state.height = height;
      return this;
    },
    setDepth(depth: number) {
      state.depth = depth;
      return this;
    },
    setAlpha(alpha: number) {
      state.alpha = alpha;
      return this;
    },
    setVisible(visible: boolean) {
      state.visible = visible;
      return this;
    },
  };
  const expected = {
    gatehouse: [0, 0, 1600, 1000],
    'triage-yard': [0, 50, 1600, 900],
    'ossuary-works': [150, 0, 1300, 1000],
    'sunken-chapel': [100, 40, 1400, 920],
    'bell-foundry': [50, 75, 1500, 850],
    'crown-crypt': [180, 60, 1240, 880],
  };
  for (const id of [...Object.keys(expected), ...Object.keys(expected).reverse(), 'gatehouse']) {
    const [x, y, width, height] = expected[id as keyof typeof expected];
    const placement = applyArenaGround(image, id);
    assert.deepEqual(
      [
        state.x - state.width * state.originX,
        state.y - state.height * state.originY,
        state.width,
        state.height,
      ],
      [x, y, width, height],
    );
    assert.equal(state.texture, 'arena-ground-' + id);
    assert.equal(state.depth, ARENA_GROUND_DEPTH);
    assert(ARENA_BACKDROP_DEPTH < state.depth && state.depth < 0);
    assert.equal(state.alpha, 0.8);
    assert.equal(state.visible, true);
    assert.equal(placement.texture, state.texture);
  }
  const last = { ...state };
  assert.throws(() => applyArenaGround(image, 'invented-map'));
  assert.deepEqual(state, last);
  assert.equal(JSON.stringify(runtimeArenas), before);
});

test('the actual floor preload planner queues every identity once and rejects missing URLs before queuing', () => {
  const files: { key: string; url: string }[] = [];
  const loader = {
    image(key: string, url: string) {
      files.push({ key, url });
    },
  };
  const urls = Object.fromEntries(runtimeArenas.map((a) => [a.id, 'local/' + a.id + '.png']));
  preloadArenaGrounds(loader, urls);
  assert.equal(files.length, 6);
  assert.equal(new Set(files.map((f) => f.key)).size, 6);
  for (const arena of runtimeArenas)
    assert(
      files.some(
        (f) => f.key === arenaGroundPlacement(arena.id).texture && f.url === urls[arena.id],
      ),
    );
  files.length = 0;
  delete urls['crown-crypt'];
  assert.throws(() => preloadArenaGrounds(loader, urls), /Missing arena ground URL/);
  assert.equal(files.length, 0);
});
