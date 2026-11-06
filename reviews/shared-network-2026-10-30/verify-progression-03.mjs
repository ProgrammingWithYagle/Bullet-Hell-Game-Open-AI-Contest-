import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const scope = 'reviews/shared-network-2026-10-30';
const read = file => JSON.parse(fs.readFileSync(file)), sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const local = read(scope + '/local-verification-03.json'), report = read(scope + '/progression-03.json');
assert(local.passed && report.passed);
assert.equal(report.freeze.buildId, local.buildId);
assert.equal(report.freeze.runtimeSourceSha256, local.fingerprints.runtimeSourceSha256);
assert.equal(report.freeze.sourceSnapshotSha256, local.fingerprints.sourceSnapshotSha256);
assert.equal(report.freeze.additionalSourceBinding.sha256, local.additionalSourceBinding.sha256);
for (const bundle of report.freeze.bundles) assert.equal(sha(report.freeze.root + '/' + bundle.name), bundle.sha256);
const cases = [];
for (const size of [8, 16, 50]) {
  const c = report.cases.find(c => c.size === size);
  assert(c?.passed);
  assert.equal(c.record.peakPlayers, size); assert.equal(c.record.rosterCount, size + 1);
  assert.equal(c.record.clears, size === 8 ? 5 : 3); assert.equal(c.record.rank, 1);
  assert.equal(c.record.rosterPages, size === 50 ? 2 : 1); assert(c.persistedAfterRestart);
  assert.equal(c.encounters.length, size === 8 ? 5 : 3);
  assert.equal(c.input.rejected, 0); assert(c.input.accepted > size * 10);
  assert.equal(c.input.clientsWithEvents, size); assert(c.mixedBuilds >= 7);
  for (const [i, fight] of c.encounters.entries()) {
    assert.equal(fight.arena, 'ossuary-works'); assert.equal(fight.active, i === 0 ? size - 1 : size);
    assert.equal(new Set(fight.classes).size, 7); assert(fight.combatTicks > 0);
  }
  assert.equal(c.closed.rooms, 0); assert.equal(c.closed.capacity.reservedSlots, 0);
  assert.equal(sha(c.database.path), c.database.sha256);
  cases.push({ size, mode: c.mode, visibility: c.visibility, fights: c.encounters.length, mixedBuilds: c.mixedBuilds, acceptedInputs: c.input.accepted, rejectedInputs: c.input.rejected, record: c.record, persistedAfterRestart: true });
}
const result = { checkedAt: new Date().toISOString(), passed: true, sourceBoundBy: local.fingerprints, buildId: local.buildId, report: scope + '/progression-03.json', reportSha256: sha(scope + '/progression-03.json'), cases, limits: report.limits.concat('The historical fifty-client join timeout remains preserved with cause unproven; this run does not establish its cause.') };
fs.writeFileSync(scope + '/progression-verification-01.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, cases: cases.map(c => ({ size: c.size, fights: c.fights, roster: c.record.rosterCount })) }));
