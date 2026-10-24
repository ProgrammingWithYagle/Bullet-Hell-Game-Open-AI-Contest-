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
