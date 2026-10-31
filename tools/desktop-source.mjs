import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

export function sourceFingerprints(root) {
  const walk = directory => fs.readdirSync(path.join(root, directory)).sort().flatMap(name => {
    const file = directory + '/' + name, stat = fs.lstatSync(path.join(root, file));
    assert(!stat.isSymbolicLink(), 'Source input must not be a symlink: ' + file);
    return stat.isDirectory() ? walk(file) : [file];
  });
  const runtime = walk('src').sort();
  const inputs = [...runtime, ...walk('tests'), 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json', 'vite.config.ts', 'index.html'].sort();
  const fingerprint = files => {
    const hash = createHash('sha256');
    for (const file of files) hash.update(file + '\0').update(fs.readFileSync(path.join(root, file)));
    return hash.digest('hex');
  };
  return { runtimeSourceSha256: fingerprint(runtime), sourceSnapshotSha256: fingerprint(inputs) };
}

export function verifyDesktopSource(root, verification) {
  assert(verification?.passed === true, 'A passing source verification report is required');
  const current = sourceFingerprints(root);
  assert.equal(verification.runtimeSourceSha256, current.runtimeSourceSha256, 'Verification report does not match the current runtime source');
  assert.equal(verification.sourceSnapshotSha256, current.sourceSnapshotSha256, 'Verification report does not match the current source/test snapshot');
  return current;
}
