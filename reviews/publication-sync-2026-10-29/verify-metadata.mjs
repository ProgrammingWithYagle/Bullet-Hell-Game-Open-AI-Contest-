import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {verifyDesktopSource} from '../../tools/desktop-source.mjs';
const root = 'reviews/publication-sync-2026-10-29', source = 'ac16ddccb9747610e114f8e34c5464021ef820de';
const git = (...args) => execFileSync('git', ['-c', 'core.bare=false', ...args], {maxBuffer: 8 * 1024 * 1024});
const read = file => JSON.parse(fs.readFileSync(file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fingerprints = verifyDesktopSource(process.cwd(), read(root + '/gate-01/runtime-verification.json'));
assert.equal(git('diff', source, '--', 'src', 'tests').length, 0);
for (const report of ['windows-source-ci.json', 'journal-source-ci.json']) for (const job of read(root + '/' + report).jobs) {assert.equal(job.conclusion, 'success'); assert.equal(sha(fs.readFileSync(job.path)), job.sha256);}
const preservation = read(root + '/gate-01/gate-preservation.json');
for (const item of preservation.receipts) assert.equal(sha(fs.readFileSync(item.file)), item.issuedSha256);
const wiki = read(root + '/wiki-publication.json');
assert.equal(git('-C', '.wiki-checkout', 'rev-parse', 'HEAD').toString().trim(), wiki.publishedCommit);
assert.equal(git('-C', '.wiki-checkout', 'status', '--porcelain').toString().trim(), '');
for (const page of wiki.files) {
  const canonical = fs.readFileSync('docs/wiki/' + page.file, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(sha(Buffer.from(canonical)), page.sha256);
}
const archived = [...read(root + '/guide-history-preservation.json').files, ...read(root + '/additional-guide-preservation.json').files];
for (const item of archived) {assert.equal(sha(fs.readFileSync(item.archivedAs)), item.sha256); assert.equal(sha(git('show', source + ':' + item.archivedAs)), item.sha256);}
const before = read(root + '/pr-after.json'), config = read('docs/github/first-loop-pr.json');
assert.equal(before.title, config.title); assert.equal(before.body, config.body); assert.equal(before.draft, true); assert.equal(before.merged, false);
const wikiIssued = read(root + '/wiki-receipt-preservation.json');
assert.equal(sha(fs.readFileSync('reviews/wiki-runtime-publication.json')), wikiIssued.issuedSha256);
const report = {checkedAt: new Date().toISOString(), passed: true, sourceCommit: source, runtimeTree: git('rev-parse', source + ':src').toString().trim(), testsTree: git('rev-parse', source + ':tests').toString().trim(), fingerprints, runtimeChangesSinceSourceCI: [], sourceJobsWithCompleteLogs: 4, wikiPagesUnchanged: wiki.pages, wikiImagesVerified: wiki.images.length, archivedGuidesExactInGitAndDisk: archived.length, issuedGateReceiptsPreserved: preservation.receipts.length, issuedWikiReceiptPreserved: true, prDescriptionMatchesLocalConfig: true, limits: ['This is the pre-commit closure-metadata equivalence check. Final branch/PR head and check status are read after the authorized metadata push.', 'Software, Git/HTTP and source evidence only; no rendered/human/device/listening/language/WAN acceptance.']};
fs.writeFileSync(root + '/metadata-equivalence.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
