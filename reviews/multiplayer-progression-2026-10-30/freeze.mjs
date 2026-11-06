import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { verifyDesktopSource } from '../../tools/desktop-source.mjs';
import { additionalSourceBinding } from '../control-settings-2026-10-30/review-inputs.mjs';
const label = process.argv[2] ?? '01';
assert(/^\d{2}$/.test(label));
const scope = 'reviews/multiplayer-progression-2026-10-30',
  root = 'output/multiplayer-progression-2026-10-30/frozen-r' + label;
assert(!fs.existsSync(root));
const read = (p) => JSON.parse(fs.readFileSync(p)),
  sha = (b) => createHash('sha256').update(b).digest('hex');
const verified = read(
    'reviews/control-settings-2026-10-30/local-verification.json',
  ),
  fingerprints = verifyDesktopSource(
    process.cwd(),
    read(
      'reviews/control-settings-2026-10-30/gate-02/runtime-verification.json',
    ),
  );
assert.deepEqual(fingerprints, verified.fingerprints);
const extra = additionalSourceBinding();
assert.equal(extra.sha256, verified.additionalSourceBinding.sha256);
const reviewedHead = execFileSync(
  'git',
  ['-c', 'core.bare=false', 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim();
await build({
  entryPoints: [scope + '/server.mts', scope + '/probe.mts'],
  outdir: root,
  bundle: true,
  platform: 'node',
  format: 'esm',
  outExtension: { '.js': '.mjs' },
  packages: 'external',
  define: { __GA_TESTING_BUILD__: 'false' },
  logLevel: 'silent',
});
const bundles = ['server.mjs', 'probe.mjs'].map((name) => ({
  name,
  bytes: fs.statSync(root + '/' + name).size,
  sha256: sha(fs.readFileSync(root + '/' + name)),
}));
const report = {
  createdAt: new Date().toISOString(),
  reviewedHead,
  runtimeSourceCommit: 'cb0ca6d3c27d32c0930381334d0dedbb14d4cc7f',
  buildId: '2026.10.30-control-settings',
  protocol: 43,
  ...fingerprints,
  additionalSourceBinding: {
    sha256: extra.sha256,
    files: extra.files,
    bytes: extra.bytes,
  },
  bundles,
  harnessSources: ['freeze.mjs', 'server.mts', 'probe.mts'].map((name) => ({
    path: scope + '/' + name,
    sha256: sha(fs.readFileSync(scope + '/' + name)),
  })),
  root: path.resolve(root),
  limits: [
    'External pinned project node_modules required; IPC-only QA authority. No production entry point or preview changed.',
  ],
};
fs.writeFileSync(
  root + '/freeze.json',
  JSON.stringify(report, null, 2) + '\n',
  { flag: 'wx' },
);
fs.writeFileSync(
  scope + '/freeze-' + label + '.json',
  JSON.stringify(report, null, 2) + '\n',
  { flag: 'wx' },
);
console.log(JSON.stringify({ root, reviewedHead, bundles }));
