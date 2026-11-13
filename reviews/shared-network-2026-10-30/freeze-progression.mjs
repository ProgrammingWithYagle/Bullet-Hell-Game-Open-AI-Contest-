import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { verifyDesktopSource } from '../../tools/desktop-source.mjs';
import { additionalSourceBinding } from './review-inputs.mjs';
const label = process.argv[2] ?? '01';
assert(/^\d{2}$/.test(label));
const scope = 'reviews/shared-network-2026-10-30', root = 'output/shared-network-2026-10-30/frozen-r' + label;
assert(!fs.existsSync(root));
const read = p => JSON.parse(fs.readFileSync(p)), sha = b => createHash('sha256').update(b).digest('hex');
const verified = read(scope + '/local-verification-03.json');
const fingerprints = verifyDesktopSource(process.cwd(), read(scope + '/gate-03/runtime-verification.json'));
assert.deepEqual(fingerprints, verified.fingerprints);
const extra = additionalSourceBinding();
assert.equal(extra.sha256, verified.additionalSourceBinding.sha256);
await build({ entryPoints: [scope + '/server.mts', scope + '/probe.mts'], outdir: root, bundle: true, platform: 'node', format: 'esm', outExtension: { '.js': '.mjs' }, packages: 'external', define: { __GA_TESTING_BUILD__: 'false' }, logLevel: 'silent' });
const bundles = ['server.mjs', 'probe.mjs'].map(name => ({ name, bytes: fs.statSync(root + '/' + name).size, sha256: sha(fs.readFileSync(root + '/' + name)) }));
const report = {
  createdAt: new Date().toISOString(), reviewedHead: execFileSync('git', ['-c', 'core.bare=false', 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runtimeSourceCommit: null, candidateSourceBoundByFingerprints: true,
  buildId: '2026.10.30-shared-network', protocol: 43, ...fingerprints,
  additionalSourceBinding: { sha256: extra.sha256, files: extra.files, bytes: extra.bytes }, bundles,
  harnessSources: ['freeze-progression.mjs', 'server.mts', 'probe.mts'].map(name => ({ path: scope + '/' + name, sha256: sha(fs.readFileSync(scope + '/' + name)) })),
  root: path.resolve(root), limits: ['Pre-commit candidate bound to complete local gate fingerprints. Final publication resolves the source commit separately.', 'External pinned project node_modules required; IPC-only QA authority. No production entry point or preview changed.'],
};
for (const file of [root + '/freeze.json', scope + '/freeze-' + label + '.json']) fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ root, bundles }));
