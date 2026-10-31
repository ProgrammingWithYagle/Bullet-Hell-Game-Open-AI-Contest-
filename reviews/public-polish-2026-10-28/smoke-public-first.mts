import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Session } from '../../src/client/session.ts';
const manifest = JSON.parse(fs.readFileSync('reviews/public-polish-2026-10-28/preview-public-bytes.json', 'utf8'));
const processes = JSON.parse(fs.readFileSync('reviews/public-polish-2026-10-28/preview-processes.json', 'utf8'));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const expected = (name: string) => manifest.members.find((m: { path: string }) => m.path === name);
const checked: unknown[] = [];
const files = new Set<string>(['index.html', 'preview-build.json']);
for (const pattern of [/\/index-.*\.js$/, /\/index-.*\.css$/, /offline\.worker-.*\.js$/,
  /arena-v1-.*\.png$/, /triage-yard-ground-v1-.*\.png$/, /ossuary-works-ground-v1-.*\.png$/,
  /sunken-chapel-ground-v1-.*\.png$/, /bell-foundry-ground-v1-.*\.png$/, /crown-crypt-ground-v1-.*\.png$/,
  /alchemist-action-walk-v2-atlas-.*\.png$/, /bellringer-action-walk-v2-atlas-.*\.png$/]) {
  const member = manifest.members.find((m: { path: string }) => pattern.test(m.path));
  assert(member, 'Missing HTTP sample for ' + pattern); files.add(member.path);
}
for (const file of files) {
  const response = await fetch(new URL(file, manifest.url), { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, file);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(sha(bytes), expected(file).sha256, 'Served bytes differ from frozen root: ' + file);
  checked.push({ path: file, status: response.status, bytes: bytes.length, sha256: sha(bytes) });
}
const healthResponse = await fetch(manifest.endpoint + '/api/health', { headers: { Origin: manifest.url.slice(0, -1) }, signal: AbortSignal.timeout(10000) });
const health = await healthResponse.json();
assert.equal(healthResponse.status, 200);
assert.equal(healthResponse.headers.get('access-control-allow-origin'), manifest.url.slice(0, -1));
assert.equal(health.sourceCommit, manifest.sourceCommit);
assert.equal(health.protocolVersion, manifest.protocol);
assert.equal(health.contentRevision, manifest.contentRevision);
assert.equal(health.audience, 'public');
assert.equal(health.playable.bosses, 66); assert.equal(health.playable.classes, 7);
assert(Math.abs(Date.parse(health.startedAt) - Date.parse(processes.backend.startedAt)) < 10000);
const denied = await fetch(manifest.endpoint + '/api/health', { headers: { Origin: 'http://127.0.0.1:5213' } });
assert.equal(denied.headers.get('access-control-allow-origin'), null);
assert.equal(sha(fs.readFileSync(manifest.backend.path)), manifest.backend.sha256);
const wait = async (check: () => boolean) => {
  const deadline = Date.now() + 10000;
  while (!check()) { assert(Date.now() < deadline, 'Public peer state did not arrive'); await new Promise(r => setTimeout(r, 20)); }
};
const before = await fetch(manifest.endpoint + '/api/metrics').then(r => r.json());
assert.equal(before.rooms, 0, 'Dedicated review server already has a room; do not disturb players');
const owner = new Session(manifest.endpoint), observer = new Session(manifest.endpoint);
let peerSample: unknown;
try {
  const options = { name: 'Review probe', classId: 'soldier' as const, mode: 'short' as const,
    difficulty: 'baby', openingArenaId: 'gatehouse', openingBossId: 'gate-widow' as const };
  await owner.connect(options);
  await observer.connect({ ...options, name: 'Review observer', classId: 'medic' }, { roomId: owner.room!.roomId });
  await wait(() => owner.view?.players.length === 2 && observer.view?.players.length === 2);
  owner.start(); await wait(() => observer.view?.phase === 'combat' && owner.view?.phase === 'combat');
  const a = owner.view!, b = observer.view!;
  assert.equal(a.boss.id, b.boss.id);
  assert.notEqual(a.boss.id, 'gate-widow', 'Public authority accepted the chosen rehearsal opener');
  assert.equal(a.run.difficulty, 'baby'); assert.equal(a.run.mode, 'short');
  assert.equal(a.run.testingModified, false);
  assert.equal(b.run.testingModified, false);
  peerSample = { peers: 2, phase: b.phase, bossId: b.boss.id, form: b.boss.variant, difficulty: b.run.difficulty,
    mode: b.run.mode, sameBoss: true, chosenRehearsalOpenerIgnored: true, testingModified: false,
    noPersonalClearClaimed: true };
} finally {
  await Promise.allSettled([owner.close(), observer.close()]);
}
await new Promise(r => setTimeout(r, 1500));
const after = await fetch(manifest.endpoint + '/api/metrics').then(r => r.json());
assert.equal(after.rooms, 0); assert.equal(after.connections, 0);
const report = { passed: true, checkedAt: new Date().toISOString(), sourceCommit: manifest.sourceCommit,
  buildId: manifest.buildId, protocol: manifest.protocol, contentRevision: manifest.contentRevision, audience: 'public',
  url: manifest.url, root: manifest.root, endpoint: manifest.endpoint, httpChecks: checked,
  health, cors: { matchingOriginAllowed: true, previousPreviewOriginDenied: true },
  backendBundleSha256: manifest.backend.sha256, peerSample, probeRoomsClosed: true,
  renderedAccepted: false, humanAccepted: false,
  limits: ['Native HTTP/hash/CORS and real owner/observer transport only. No browser, personal clear, human balance, audio, native-language or physical-device acceptance.', 'No existing frozen service was stopped or replaced; the smoke room used only this newly created review backend.'] };
fs.writeFileSync('reviews/public-polish-2026-10-28/preview-live-check.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, url: report.url, sourceCommit: report.sourceCommit, httpChecks: checked.length, peerSample, probeRoomsClosed: true }));
