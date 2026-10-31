import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {writeTextAtomic} from '../../tools/write-text-atomic.mjs';
const root = 'reviews/contest-publication-2026-10-30';
const push = JSON.parse(fs.readFileSync(root + '/wiki-push.json'));
const file = 'reviews/wiki-runtime-publication.json';
const issued = fs.readFileSync(file), sha = bytes => createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync('output/contest-publication-2026-10-30', {recursive: true});
fs.writeFileSync('output/contest-publication-2026-10-30/issued-wiki-publication.json', issued, {flag: 'wx'});
let status = 1, current;
try {
  const run = spawnSync(process.execPath, ['tools/verify-wiki-publication.mjs', push.sourceCommit], {stdio: 'inherit', env: process.env});
  status = run.status ?? 1;
  current = fs.readFileSync(file);
  if (status === 0) {
    const report = JSON.parse(current);
    assert.equal(report.sourceCommit, push.sourceCommit);
    assert.equal(report.publishedCommit, push.publishedCommit);
    fs.writeFileSync(root + '/wiki-publication.json', current, {flag: 'wx'});
  }
} finally {
  if (!fs.readFileSync(file).equals(issued)) writeTextAtomic(file, issued);
  assert(fs.readFileSync(file).equals(issued));
  fs.writeFileSync(root + '/wiki-receipt-preservation.json', JSON.stringify({passed: status === 0, issuedSha256: sha(issued), restoredSha256: sha(fs.readFileSync(file)), currentReportSha256: current ? sha(current) : null, sourceCommit: push.sourceCommit, publishedCommit: push.publishedCommit}, null, 2) + '\n', {flag: 'wx'});
}
process.exitCode = status;
