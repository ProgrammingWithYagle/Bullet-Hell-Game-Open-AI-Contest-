import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import library from '../assets/delivery/selection-portraits-v1/library.json';
import provenance from '../docs/selection-portraits-2026-10-25.json';
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
test('seven selection portraits share a full-body canvas and visible body height, with two new whole native poses and old five identities retained', () => {
  assert.equal(library.entries.length, 7);
  assert.equal(provenance.requests.length, 2);
  assert.deepEqual(
    library.entries.filter((e) => e.newPose).map((e) => e.classId),
    ['soldier', 'medic'],
  );
  for (const e of library.entries) {
    assert.equal(sha(e.source), e.sourceSha256);
    assert.equal(sha(e.image), e.imageSha256);
    const png = readFileSync(e.image);
    assert.equal(png.readUInt32BE(16), 480);
    assert.equal(png.readUInt32BE(20), 640);
    assert.equal(png[25], 6);
    assert(Math.abs(e.targetAlpha16Bounds[3] - e.targetAlpha16Bounds[1] - 576) <= 2);
    assert(e.targetAlpha16Bounds[3] >= 607 && e.targetAlpha16Bounds[3] <= 609);
  }
  for (const r of provenance.requests) {
    assert.equal(sha(r.file), r.sha256);
    assert.equal(sha(r.request), r.requestSha256);
    for (const b of r.inputBindings) assert.equal(sha(b.projectPath), b.sha256);
  }
});
