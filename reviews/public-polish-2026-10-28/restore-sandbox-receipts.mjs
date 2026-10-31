import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = 'reviews/public-polish-2026-10-28/sandbox-interrupted';
fs.mkdirSync(root, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const reports = [];
for (const file of ['reviews/small-wakes-2026-10-26/art-verification.json', 'reviews/warden-patrol-2026-10-25/art-verification.json']) {
  const rerun = fs.readFileSync(file);
  const original = execFileSync('git', ['-c', 'core.bare=false', 'show', '825b6472ab9f5c6a697f7859bc512147d4c73ab2:' + file]);
  const savedAs = root + '/' + file.slice(8).replaceAll('/', '--');
  fs.writeFileSync(savedAs, rerun, { flag: 'wx' });
  fs.writeFileSync(file, original);
  if (!fs.readFileSync(file).equals(original)) throw new Error('Issued restoration failed');
  reports.push({ file, savedAs, rerunSha256: sha(rerun), restoredIssuedSha256: sha(original),
    authority: '825b6472ab9f5c6a697f7859bc512147d4c73ab2 committed issued JSON; .gitattributes requires LF' });
}
fs.writeFileSync(root + '/report.json', JSON.stringify({ passed: false, reason: 'Sandbox loopback returned EACCES; its failing test run was interrupted. Host owner/observer fixture passes separately.',
  fullGatePassed: false, restoredReports: reports, wrapperFinallyRan: false, retainedLog: 'output/public-polish-2026-10-28/full-gate.log' }, null, 2) + '\n');
console.log(JSON.stringify({ restoredIssuedReports: reports.length, rerunsRetained: true }));
