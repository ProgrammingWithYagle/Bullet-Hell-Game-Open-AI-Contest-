import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = 'reviews/public-polish-2026-10-28/host-gate-02';
const backups = 'output/public-polish-2026-10-28/issued-receipts-host-gate-02';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const log = fs.readFileSync('output/public-polish-2026-10-28/host-full-gate-02.log', 'utf8');
assert(log.includes('Verification passed; evidence: reviews/runtime-verification.json'));
assert(log.includes('tests 755') && log.includes('pass 755') && log.includes('fail 0'));
const receipts = [];
for (const name of fs.readdirSync(backups)) {
  const file = name.replaceAll('--', '/');
  assert(file.startsWith('reviews/') && !file.includes('..'));
  const original = fs.readFileSync(path.join(backups, name));
  const fresh = fs.readFileSync(file);
  const savedAs = root + '/' + file.slice('reviews/'.length).replaceAll('/', '--');
  if (!fs.existsSync(savedAs)) fs.writeFileSync(savedAs, fresh, { flag: 'wx' });
  // Most immutable reports already match; do not reopen identical issued files for writing.
  if (!fresh.equals(original)) fs.writeFileSync(file, original);
  assert(fs.readFileSync(file).equals(original), 'Issued report differs after restoration: ' + file);
  receipts.push({ file, issuedSha256: sha(original), rerunSha256: sha(fs.readFileSync(savedAs)), savedAs,
    restoredSha256: sha(fs.readFileSync(file)) });
}
const runtime = JSON.parse(fs.readFileSync(root + '/runtime-verification.json'));
assert(runtime.passed && runtime.checks.every(c => c.passed));
fs.writeFileSync(root + '/gate-preservation.json', JSON.stringify({ createdAt: new Date().toISOString(),
  passed: true, fullGateExitCode: 0, tests: 755, pass: 755, fail: 0, originalWrapperExitCode: 1,
  wrapperError: 'OneDrive UNKNOWN while reopening the identical stage1-validation.json for redundant restoration; current report capture and byte-exact restoration completed separately.',
  receipts, runtimeSourceSha256: runtime.runtimeSourceSha256, sourceSnapshotSha256: runtime.sourceSnapshotSha256,
  limits: ['All five local gate checks passed. Cleanup failure and its correction are retained separately; no browser/rendered, human, audio, native-language or physical-device acceptance.'] }, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, tests: 755, allGateChecks: runtime.checks, restoredIssuedReports: receipts.length,
  runtimeSourceSha256: runtime.runtimeSourceSha256, sourceSnapshotSha256: runtime.sourceSnapshotSha256 }));
