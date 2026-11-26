import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const { sourceFingerprints, verifyDesktopSource } = await import(pathToFileURL(path.resolve('tools/desktop-source.mjs')).href);

function fixture(t: TestContext) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'grave-desktop-source-'));
  fs.mkdirSync(path.join(root, 'src')); fs.mkdirSync(path.join(root, 'tests'));
  const names = ['src/runtime.ts', 'tests/rules.test.ts', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json', 'vite.config.ts', 'index.html'];
  for (const name of names) fs.writeFileSync(path.join(root, name), name + '\n');
  t.after(() => {
    for (const folder of ['src', 'tests']) {
      for (const name of fs.readdirSync(path.join(root, folder))) fs.unlinkSync(path.join(root, folder, name));
      fs.rmdirSync(path.join(root, folder));
    }
    for (const name of fs.readdirSync(root)) fs.unlinkSync(path.join(root, name));
    fs.rmdirSync(root);
  });
  return root;
}

test('desktop input checks accept the verified source and reject failed or stale runtime reports', t => {
  const root = fixture(t), current = sourceFingerprints(root);
  assert.deepEqual(verifyDesktopSource(root, { passed: true, ...current }), current);
  assert.throws(() => verifyDesktopSource(root, { passed: false, ...current }), /passing source verification/);
  fs.writeFileSync(path.join(root, 'src/runtime.ts'), 'a later runtime');
  assert.throws(() => verifyDesktopSource(root, { passed: true, ...current }), /current runtime source/);
});

test('a changed or newly added test invalidates desktop source evidence without changing the runtime fingerprint', t => {
  const root = fixture(t), current = sourceFingerprints(root);
  fs.writeFileSync(path.join(root, 'tests/added.test.ts'), 'new acceptance rule');
  assert.equal(sourceFingerprints(root).runtimeSourceSha256, current.runtimeSourceSha256);
  assert.throws(() => verifyDesktopSource(root, { passed: true, ...current }), /current source\/test snapshot/);
  fs.unlinkSync(path.join(root, 'tests/added.test.ts'));
  fs.appendFileSync(path.join(root, 'tests/rules.test.ts'), 'updated acceptance rule');
  assert.throws(() => verifyDesktopSource(root, { passed: true, ...current }), /current source\/test snapshot/);
});

test('the real desktop builder refuses failed evidence before creating a package', t => {
  const root = fixture(t), report = path.join(root, 'failed.json'), output = path.join(root, 'must-not-exist');
  fs.writeFileSync(report, JSON.stringify({ passed: false }));
  const run = spawnSync(process.execPath, ['tools/build-desktop.mjs', output, report, 'public'], { encoding: 'utf8' });
  assert.notEqual(run.status, 0);
  assert(run.stderr.includes('passing source verification'));
  assert(!fs.existsSync(output));
});
