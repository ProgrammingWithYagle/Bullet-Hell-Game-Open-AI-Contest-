import fs from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const base = 'https://grave-accord.yigallin0423.chatgpt.site/';
const root = 'output/sites-contest-2026-10-30/build', scope = 'reviews/contest-publication-2026-10-30';
const manifest = JSON.parse(fs.readFileSync(root + '/contest-build.json'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const selected = new Set(['index.html', 'contest-build.json']);
for (const m of manifest.members) if (/\.(js|css)$/.test(m.path)) selected.add(m.path);
for (const name of ['cover-v1', 'equipment-case-v1', 'coins-v1', 'skill-manual-v1', 'city-wake', 'hollow-muster', 'accord-success', 'noto-sans-latin-400-normal', 'gatehouse-v2', 'triage-yard-v2', 'ossuary-works-v2', 'sunken-chapel-v2', 'bell-foundry-v2', 'crown-crypt-v2']) {
  const match = manifest.members.find(m => m.path.startsWith('assets/' + name + '-') && !m.path.endsWith('.woff'));
  assert(match, 'Missing selected asset ' + name); selected.add(match.path);
}
const checked = [], paths = [...selected];
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < paths.length) {
    const path = paths[cursor++], response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(25000) });
    assert.equal(response.status, 200, path); const bytes = Buffer.from(await response.arrayBuffer());
    let compared = bytes;
    if (path === 'index.html') {
      const html = bytes.toString(), injections = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].filter(m => m[1].includes('window.__CF$cv$params') && m[1].includes('/cdn-cgi/challenge-platform/scripts/jsd/main.js') && m[1].includes("a.style.visibility='hidden'"));
      assert.equal(injections.length, 1, 'Expected one known Cloudflare JSD injection');
      compared = Buffer.from(html.replace(injections[0][0], ''));
    }
    assert.equal(sha(compared), sha(fs.readFileSync(root + '/' + path)), 'Published bytes differ after known platform injection: ' + path);
    const type = response.headers.get('content-type') ?? '';
    if (path.endsWith('.js')) assert(/javascript/.test(type), 'Wrong JS MIME ' + path);
    checked.push({ path, status: response.status, bytes: bytes.length, sha256: sha(bytes), contentType: type });
  }
}));
const mainPath = manifest.members.find(m => /assets\/index-.*\.js$/.test(m.path)).path;
const main = fs.readFileSync(root + '/' + mainPath, 'utf8');
assert(main.includes(manifest.endpoint));
for (const marker of ['id="testing-coins"', 'id="testing-apply"', '<select id="opening-boss"', 'class="setup-build"']) assert(!main.includes(marker), marker);
const worker = manifest.members.find(m => /offline\.worker-.*\.js$/.test(m.path));
assert(!fs.readFileSync(root + '/' + worker.path, 'utf8').includes('testingCommand'));
const response = await fetch(manifest.endpoint + '/api/health', { headers: { Origin: base.slice(0, -1) } });
assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), base.slice(0, -1));
const health = await response.json(); assert.equal(health.sourceCommit, manifest.gameSourceCommit); assert.equal(health.protocolVersion, manifest.protocol); assert.equal(health.audience, 'public');
const report = { checkedAt: new Date().toISOString(), passed: true, url: base, gameSourceCommit: manifest.gameSourceCommit, siteSourceCommit: 'e2212c81261f370ba4bd4f54dfdb57952c14fa65', checked, publicAudienceOnly: true, matchingBackend: health, originalMasterFallbacksPinned: 67, currentRenderedAccepted: false, limits: ['Native successful publication plus exact deployed asset bytes/MIME and exact HTML after removing the single identified Cloudflare JSD injection. No current browser/rendered/human/device/listening acceptance.'] };
fs.writeFileSync(scope + '/live-verification-04.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, url: base, files: checked.length, bytes: checked.reduce((n, c) => n + c.bytes, 0), protocol: health.protocolVersion }));
