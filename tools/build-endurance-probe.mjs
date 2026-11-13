import { build, version } from 'esbuild';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const name = process.argv[2];
assert(/^[a-z0-9-]+$/.test(name ?? ''));
const out = 'release/performance/' + name;
assert(!existsSync(out), 'Preserve issued frozen bundle');
mkdirSync(out, { recursive: true });
const walk = (dir) =>
  readdirSync(dir)
    .sort()
    .flatMap((n) => {
      const p = dir + '/' + n;
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const source = walk('src').map((path) => ({ path, sha256: sha(path) }));
const runtimeHash = createHash('sha256');
for (const f of source) {
  runtimeHash.update(f.path + '\0');
  runtimeHash.update(readFileSync(f.path));
}
const digest = runtimeHash.digest('hex');
const verification = JSON.parse(readFileSync('reviews/runtime-verification.json', 'utf8'));
assert(
  verification.passed && verification.runtimeSourceSha256 === digest,
  'Freeze an already-verified runtime',
);
const entries = ['measure-endurance', 'endurance-server-fixture'];
await build({
  entryPoints: entries.map((n) => 'tools/' + n + '.ts'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
  outdir: out,
  outExtension: { '.js': '.mjs' },
  logLevel: 'warning',
});
const report = {
  createdAt: new Date().toISOString(),
  commit: execFileSync('git', ['-c', 'core.bare=false', 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  runtimeSourceSha256: digest,
  verificationSourceSnapshot: verification.sourceSnapshotSha256,
  verificationPassed: true,
  esbuildVersion: version,
  node: process.version,
  source,
  lockfile: { path: 'pnpm-lock.yaml', sha256: sha('pnpm-lock.yaml') },
  tools: [...entries.map((n) => 'tools/' + n + '.ts'), 'tools/build-endurance-probe.mjs'].map(
    (path) => ({ path, sha256: sha(path) }),
  ),
  bundles: entries.map((n) => ({ name: n + '.mjs', sha256: sha(out + '/' + n + '.mjs') })),
};
writeFileSync(out + '/freeze.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ out, runtimeSourceSha256: digest, bundles: report.bundles }));
