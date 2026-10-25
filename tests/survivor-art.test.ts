import legacyRuns from '../assets/production/motion/legacy-survivor-library.json';
import originalWalks from '../assets/proofs/directions/walk-normalization.json';
import { HZ } from '../src/shared/protocol.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import library from '../assets/production/motion/survivor-library.json' with { type: 'json' };
import { additionalSurvivors, survivorPose } from '../src/client/survivor-presentation.ts';
test('four additional survivors have independent directional runs with 124 approved poses and preserved native hashes', () => {
  assert.equal(library.entries.length, 16);
  assert.equal(
    library.entries.reduce((n, e) => n + e.frames, 0),
    124,
  );
  for (const id of additionalSurvivors) {
    assert.deepEqual(
      library.entries
        .filter((e) => e.classId === id)
        .map((e) => e.direction)
        .sort(),
      ['east', 'north', 'south', 'west'],
    );
    for (const [angle, face] of [
      [0, 'east'],
      [Math.PI / 2, 'south'],
      [Math.PI, 'west'],
      [-Math.PI / 2, 'north'],
    ] as const) {
      for (
        let frame = 0;
        frame < library.entries.find((e) => e.id === id + '-run-' + face)!.frames;
        frame++
      ) {
        const pose = survivorPose(id, angle, true, 'active', frame * 3);
        assert.equal(pose.texture, id + '-run-' + face);
        assert.equal(pose.frame, frame);
      }
      assert.equal(survivorPose(id, angle, true, 'active', 0, true).texture, id + '-reference');
      assert.equal(survivorPose(id, angle, true, 'downed', 0).texture, id + '-reference');
    }
  }
  for (const entry of library.entries) {
    for (const [path, hash] of [
      [entry.source, entry.sourceSha256],
      [entry.atlas, entry.atlasSha256],
    ])
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), hash);
    const png = readFileSync(entry.atlas);
    assert.equal(png.readUInt32BE(16), 1536);
    assert.equal(png.readUInt32BE(20), 768);
    assert.equal(png[25], 6);
  }
});

for (const classId of ['soldier', 'medic'] as const) {
  test(
    classId +
      ' independent runs retain original north/south art, loop at their authored speed and share the action scale',
    () => {
      const entries = legacyRuns.entries.filter((e) => e.classId === classId);
      assert.equal(entries.length, 4);
      assert.equal(
        entries.reduce((sum, e) => sum + e.frames, 0),
        24,
      );
      for (const [aim, direction] of [
        [0, 'east'],
        [Math.PI / 2, 'south'],
        [Math.PI, 'west'],
        [-Math.PI / 2, 'north'],
      ] as const) {
        const clip = entries.find((e) => e.direction === direction)!;
        const vertical = direction === 'north' || direction === 'south';
        assert.equal(clip.frames, vertical ? 4 : 8);
        assert.equal(clip.fps, vertical ? 8 : 10);
        for (let index = 0; index <= clip.frames; index++) {
          const pose = survivorPose(classId, aim, true, 'active', (index * HZ) / clip.fps + 0.001);
          assert.equal(pose.texture, classId + '-run-' + direction);
          assert.equal(pose.frame, index % clip.frames);
          assert.equal(pose.displayCell / clip.cellSize, 56 / 180);
          assert.deepEqual(pose.origin, clip.origin);
        }
        for (const [moving, status, reduced] of [
          [false, 'active', false],
          [true, 'active', true],
          [true, 'waiting', false],
        ] as const) {
          const first = survivorPose(classId, aim, moving, status, 0, reduced);
          const later = survivorPose(classId, aim, moving, status, 200, reduced);
          assert.equal(first.texture, classId + '-run-' + direction);
          assert.equal(first.frame, 0);
          assert.deepEqual(
            later,
            first,
            'Stopped, waiting and reduced-motion fallbacks remain stable',
          );
        }
        for (const [path, digest] of [
          [clip.source, clip.sourceSha256],
          [clip.atlas, clip.atlasSha256],
        ]) {
          assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), digest);
        }
        if (vertical) {
          const original = originalWalks.entries.find(
            (e) => e.classId === classId && e.direction === direction,
          )!;
          assert.equal(clip.source, original.source);
          assert.equal(clip.sourceSha256, original.sourceSha256);
        }
      }
    },
  );
}
