import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const previews = [];
for (const audience of ['testing', 'public']) {
  const previous = JSON.parse(fs.readFileSync('reviews/connection-clarity-2026-10-29/preview-' + audience + '-live-check.json'));
  const checks = [];
  for (const name of ['index.html', 'preview-build.json']) {
    const expected = previous.httpChecks.find(c => c.path === name);
    assert(expected);
    const response = await fetch(previous.url + name, {signal: AbortSignal.timeout(10000)});
    assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(sha(bytes), expected.sha256);
    checks.push({path: name, status: response.status, bytes: bytes.length, sha256: sha(bytes)});
  }
  const response = await fetch(previous.endpoint + '/api/health', {signal: AbortSignal.timeout(10000)});
  assert.equal(response.status, 200);
  const health = await response.json();
  for (const key of ['status', 'startedAt', 'sourceCommit', 'protocolVersion', 'contentRevision', 'audience']) assert.equal(health[key], previous.health[key], key);
  assert.equal(health.teamRecords.available, true);
  assert.equal(health.teamRecords.scope, 'server');
  previews.push({audience, url: previous.url, endpoint: previous.endpoint, sourceCommit: health.sourceCommit, startedAt: health.startedAt, protocol: health.protocolVersion, checks, teamRecords: health.teamRecords, persistentOwnerUnchanged: true});
}
fs.writeFileSync('reviews/connection-clarity-2026-10-29/preserved-preview-availability.json', JSON.stringify({checkedAt: new Date().toISOString(), passed: true, previews, limits: ['Read-only index/metadata hashes and backend health/owner checks. No rooms created or stopped, no records submitted, and no new gameplay or rendered/human review.']}, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({passed: true, previews: previews.map(p => ({audience: p.audience, url: p.url, sourceCommit: p.sourceCommit, persistentOwnerUnchanged: true}))}));
