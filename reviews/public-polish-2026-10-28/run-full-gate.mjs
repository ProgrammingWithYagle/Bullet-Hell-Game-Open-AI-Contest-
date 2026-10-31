import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const label = process.argv[2] ?? 'host-gate';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid gate label');
const root = 'reviews/public-polish-2026-10-28/' + label;
fs.mkdirSync(root, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const issued = [
  'reviews/resonant-tolls-2026-10-27/art-verification.json',
  'reviews/alchemist-lab-2026-10-27/art-verification.json',
  'reviews/warden-patrol-2026-10-25/art-verification.json',
  'reviews/small-wakes-2026-10-26/art-verification.json',
  'reviews/resonant-tolls-2026-10-27/emitted-atlases-testing.json',
  'reviews/resonant-tolls-2026-10-27/emitted-atlases-public.json',
  'reviews/stage1-validation.json', 'reviews/runtime-verification.json',
];
const originals = issued.filter(file => fs.existsSync(file)).map(file => ({ file, bytes: fs.readFileSync(file) }));
const backupRoot = 'output/public-polish-2026-10-28/issued-receipts-' + label;
fs.mkdirSync(backupRoot, { recursive: true });
for (const { file, bytes } of originals) {
  fs.writeFileSync(path.join(backupRoot, file.replaceAll('/', '--')), bytes, { flag: 'wx' });
}
let status = 1;
try {
  const run = spawnSync(process.execPath, ['tools/verify.mjs'], { stdio: 'inherit', env: process.env });
  status = run.status ?? 1;
} finally {
  const receipts = [];
  for (const { file, bytes } of originals) {
    const fresh = fs.existsSync(file) ? fs.readFileSync(file) : null;
    const savedAs = path.join(root, file.slice('reviews/'.length).replaceAll('/', '--'));
    if (fresh) fs.writeFileSync(savedAs, fresh);
    fs.writeFileSync(file, bytes);
    const restored = fs.readFileSync(file);
    if (!restored.equals(bytes)) throw new Error('Historical receipt did not restore: ' + file);
    receipts.push({ file, issuedSha256: sha(bytes), rerunSha256: fresh ? sha(fresh) : null,
      savedAs: savedAs.replaceAll('\\', '/'), restoredSha256: sha(restored) });
  }
  fs.writeFileSync(root + '/gate-preservation.json', JSON.stringify({
    createdAt: new Date().toISOString(), passed: status === 0, exitCode: status, receipts,
    limits: ['Current software verification only. Historical issued receipts are restored byte-for-byte; current reruns have separate paths. No browser, human, audio, native-language or device acceptance.'],
  }, null, 2) + '\n');
}
process.exitCode = status;
