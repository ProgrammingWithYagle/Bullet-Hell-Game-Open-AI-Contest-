import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {verifyDesktopSource} from '../../tools/desktop-source.mjs';
const root = 'reviews/publication-sync-2026-10-29';
const read = file => JSON.parse(fs.readFileSync(file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', ['-c', 'core.bare=false', ...args], {maxBuffer: 4 * 1024 * 1024});
const gate = read(root + '/gate-01/runtime-verification.json');
const fingerprints = verifyDesktopSource(process.cwd(), gate);
const preservation = read(root + '/gate-01/gate-preservation.json');
assert(preservation.passed);
assert.equal(preservation.receipts.length, 8);
for (const receipt of preservation.receipts) assert.equal(sha(fs.readFileSync(receipt.file)), receipt.issuedSha256);
const log = fs.readFileSync(root + '/full-gate-01.log', 'utf8');
for (const term of ['tests 827', 'pass 827', 'fail 0', 'Verification passed; evidence:']) assert(log.includes(term), term);
const runtimeChanges = git('diff', '--name-only', 'fe82c7e38c8fa73804678b6637815b23aceb0ce5', '--', 'src', 'tests').toString().trim().split('\n').filter(Boolean);
assert.deepEqual(runtimeChanges, ['src/shared/development-progress.json']);
const archived = [...read(root + '/guide-history-preservation.json').files, ...read(root + '/additional-guide-preservation.json').files];
for (const item of archived) {const bytes = fs.readFileSync(item.archivedAs); assert.equal(bytes.length, item.bytes); assert.equal(sha(bytes), item.sha256);}
const ci = read(root + '/windows-source-ci.json');
assert.equal(ci.sourceCommit, 'fe82c7e38c8fa73804678b6637815b23aceb0ce5');
assert.equal(ci.jobs.length, 2);
for (const job of ci.jobs) {assert.equal(job.headRevision, ci.sourceCommit); assert.equal(job.conclusion, 'success'); assert.equal(sha(fs.readFileSync(job.path)), job.sha256);}
const checkedAt = new Date().toISOString();
fs.writeFileSync(root + '/current-local-verification.json', JSON.stringify({checkedAt, passed: true, buildId: '2026.10.29-chat-confirmation', protocol: 42, tests: 827, pass: 827, fail: 0, fingerprints, gateReportSha256: sha(fs.readFileSync(root + '/gate-01/runtime-verification.json')), runtimeChangesSinceNativeSource: runtimeChanges, gameplayChanged: false, sourcePublicationAuthorized: true, archivedGuidesVerified: archived.length, issuedReportsPreserved: 8, windowsSourceCI: ci, currentJournalSourceCI: 'Capture after publishing this source commit.', limits: ['Guide and generated progress text changed; current full local software gate passes. Existing frozen previews and Windows package retain their exact issued source.', 'Current Wiki/PR/final metadata publication is recorded in later closure receipts; this report is the pre-publication local check.', 'No rendered/human/device/listening/native-language/WAN or final-balance acceptance.']}, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({passed: true, tests: 827, archivedGuides: archived.length, issuedReports: 8, fingerprints, runtimeChanges}));
