import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { survivorDelivery, deliveredSurvivorClip } from '../src/client/survivor-delivery.ts';
import { survivorActionArt } from '../src/client/survivor-action-presentation.ts';
import { survivorArt } from '../src/client/survivor-presentation.ts';
import { heavyArt } from '../src/client/heavy-presentation.ts';
import actions from '../assets/production/motion/survivor-actions/library.json';
import runs from '../assets/production/motion/survivor-library.json';
import legacy from '../assets/production/motion/legacy-survivor-library.json';
import heavy from '../assets/production/motion/heavy-library.json';
const originals = [...actions.entries, ...runs.entries, ...legacy.entries, ...heavy.entries];
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('all 820 selected survivor poses retain exact original contracts and have bounded two-times display delivery textures', () => {
  assert.equal(originals.length, 168);
  assert.equal(survivorDelivery.entries.length, 168);
  assert.equal(
    survivorDelivery.entries.reduce((sum, e) => sum + e.frames, 0),
    820,
  );
  for (const original of originals) {
    const entry = survivorDelivery.entries.find((e) => e.id === original.id)!;
    assert.equal(sha(original.atlas), original.atlasSha256);
    assert.equal(entry.source, original.atlas);
    assert.equal(entry.sourceSha256, original.atlasSha256);
    assert.equal(sha(entry.atlas), entry.atlasSha256);
    assert.equal(entry.frames, original.frames);
    assert.equal(entry.fps, original.fps);
    assert.equal(entry.columns, original.columns);
    assert.equal(entry.displayCell, original.displayCell);
    assert.deepEqual(entry.origin, original.origin);
    assert(entry.cellSize <= original.cellSize);
    assert(entry.pixelDensity >= Math.min(2, original.cellSize / original.displayCell));
    const image = readFileSync(entry.atlas);
    assert.equal(image.readUInt32BE(16), entry.columns * entry.cellSize);
    assert.equal(image.readUInt32BE(20), Math.ceil(entry.frames / entry.columns) * entry.cellSize);
    assert.equal(image[25], 6);
  }
  const north = survivorDelivery.entries.find((e) => e.id === 'engineer-run-north')!;
  assert.equal(north.frames, 4);
  assert.equal(north.excludedSourceFrames, 4);
  assert.equal(readFileSync(north.atlas).readUInt32BE(20), north.cellSize);
});

test('every live action and run selector uses matching delivery cells while retaining world origin and size', () => {
  const live = [...survivorActionArt.entries, ...survivorArt.entries, ...heavyArt.entries];
  assert.equal(live.length, 168);
  for (const clip of live) {
    const original = originals.find((e) => e.id === clip.id)!;
    const delivery = survivorDelivery.entries.find((e) => e.id === clip.id)!;
    assert.equal(clip.cellSize, delivery.cellSize);
    assert.equal(clip.frames, original.frames);
    assert.equal(clip.fps, original.fps);
    assert.equal(clip.displayCell, original.displayCell);
    assert.deepEqual(clip.origin, original.origin);
  }
  const copy = structuredClone(originals[0]);
  assert.throws(() => deliveredSurvivorClip({ ...copy, id: 'missing-art' }), /contract mismatch/);
  assert.throws(
    () => deliveredSurvivorClip({ ...copy, frames: copy.frames + 1 }),
    /contract mismatch/,
  );
  assert.throws(
    () => deliveredSurvivorClip({ ...copy, cellSize: copy.cellSize + 32 }),
    /contract mismatch/,
  );
  assert.throws(() => deliveredSurvivorClip({ ...copy, origin: [0, 0] }), /contract mismatch/);
  const before = JSON.stringify(copy);
  deliveredSurvivorClip(copy);
  assert.equal(JSON.stringify(copy), before);
});

test('the complete survivor delivery atlas set stays below sixty percent of its original decoded RGBA allocation', () => {
  const source = survivorDelivery.entries.reduce((sum, e) => sum + e.sourceDecodedBytes, 0);
  const delivered = survivorDelivery.entries.reduce((sum, e) => sum + e.deliveryDecodedBytes, 0);
  assert.equal(source, survivorDelivery.summary.sourceDecodedBytes);
  assert.equal(delivered, survivorDelivery.summary.deliveryDecodedBytes);
  assert(delivered < source * 0.6);
  assert(delivered > 0);
  assert.equal(survivorDelivery.summary.decodedBytesSaved, source - delivered);
});
