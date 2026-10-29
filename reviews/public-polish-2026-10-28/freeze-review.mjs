import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
const commit = process.argv[2];
assert(/^[a-f0-9]{40}$/.test(commit ?? ''), 'Supply the source commit');
const git = (...args) => execFileSync('git', ['-c', 'core.bare=false', ...args], { maxBuffer: 16 * 1024 * 1024 });
assert.equal(git('rev-parse', 'HEAD').toString().trim(), commit, 'Freeze the current reviewed source commit');
const walk = dir => fs.readdirSync(dir).sort().flatMap(name => {
  const file = dir + '/' + name, stat = fs.lstatSync(file);
  assert(!stat.isSymbolicLink(), 'No symlink in review inputs: ' + file);
  return stat.isDirectory() ? walk(file) : [file];
});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const inputs = [...walk('src'), ...walk('tests'), 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json', 'vite.config.ts', 'index.html'].sort();
const tree = git('ls-tree', '-r', '-z', commit, '--', 'src', 'tests', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json', 'vite.config.ts', 'index.html').toString().split('\0').filter(Boolean).map(row => {
  const [info, name] = row.split('\t'); return [name, info.split(' ')[2]];
});
assert.deepEqual(inputs, tree.map(([name]) => name).sort(), 'Runtime/test inputs differ from the committed file set');
const treeMap = new Map(tree), endings = [], runtimeHash = createHash('sha256'), localHash = createHash('sha256'), committedHash = createHash('sha256');
for (const file of inputs) {
  const bytes = fs.readFileSync(file); let committedBytes = bytes;
  if (blob(bytes) !== treeMap.get(file)) {
    assert.equal(file, 'pnpm-workspace.yaml', 'Uncommitted runtime/test bytes: ' + file);
    committedBytes = Buffer.from(bytes.toString().replaceAll('\r\n', '\n'));
    assert.equal(blob(committedBytes), treeMap.get(file), 'Unexpected workspace change');
    endings.push({ file, localBytes: bytes.length, committedBytes: committedBytes.length });
  }
  localHash.update(file + '\0').update(bytes); committedHash.update(file + '\0').update(committedBytes);
  if (file.startsWith('src/')) runtimeHash.update(file + '\0').update(bytes);
}
const runtimeSourceSha256 = runtimeHash.digest('hex'), sourceSnapshotSha256 = localHash.digest('hex');
const gatePath = 'reviews/public-polish-2026-10-28/host-gate-02/runtime-verification.json';
const gate = JSON.parse(fs.readFileSync(gatePath));
assert(gate.passed, 'The complete local gate must pass first');
assert.equal(gate.runtimeSourceSha256, runtimeSourceSha256);
assert.equal(gate.sourceSnapshotSha256, sourceSnapshotSha256);
const candidate = 'output/candidate-first-watch-public';
const endpoint = 'http://127.0.0.1:2588', url = 'http://127.0.0.1:5214/';
const built = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', candidate, '--logLevel', 'warn'], {
  encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, env: { ...process.env, VITE_GAME_AUDIENCE: 'public', VITE_GAME_SERVER: endpoint },
});
fs.writeFileSync('reviews/public-polish-2026-10-28/public-build.log', (built.stdout ?? '') + (built.stderr ?? ''), { flag: 'wx' });
assert.equal(built.status, 0, 'Public build failed');
const afterBuildHash = createHash('sha256');
for (const file of walk('src').sort()) afterBuildHash.update(file + '\0').update(fs.readFileSync(file));
assert.equal(afterBuildHash.digest('hex'), runtimeSourceSha256, 'Source changed during public build');
const jsFiles = walk(candidate).filter(file => file.endsWith('.js'));
const main = jsFiles.filter(file => !path.basename(file).startsWith('offline.worker-')).map(file => fs.readFileSync(file, 'utf8')).join('\n');
const workers = jsFiles.filter(file => path.basename(file).startsWith('offline.worker-'));
assert.equal(workers.length, 1);
assert(main.includes(endpoint), 'Candidate does not bind to the selected review backend');
for (const markup of ['<select id="opening-boss"', 'id="testing-coins"', 'id="testing-apply"', 'id="testing-unlock-home"'])
  assert(!main.includes(markup), 'Testing menu leaked into public build: ' + markup);
assert(!fs.readFileSync(workers[0], 'utf8').includes('testingCommand'), 'Public worker contains a testing command branch');
for (const required of ['id="gentle-start"', 'id="assets-progress"', 'arena-legend']) assert(main.includes(required), 'Missing public presentation: ' + required);
const history = JSON.parse(fs.readFileSync('src/shared/update-history.json'));
const content = JSON.parse(fs.readFileSync('content/revision.json')).sha256;
const root = 'output/playtest-first-watch-public-' + commit.slice(0, 7), backendRoot = 'output/frozen-first-watch-' + commit.slice(0, 7);
const outputRoot = path.resolve('output') + path.sep;
for (const dir of [root, backendRoot]) { assert(path.resolve(dir).startsWith(outputRoot)); assert(!fs.existsSync(dir), 'Refusing to overwrite frozen root: ' + dir); }
fs.mkdirSync(root); fs.cpSync(candidate, root, { recursive: true, force: false, errorOnExist: true });
fs.mkdirSync(backendRoot);
const serverPath = backendRoot + '/server.mjs';
await build({ entryPoints: ['src/server/index.ts'], bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: serverPath, logLevel: 'silent' });
const identity = { sourceCommit: commit, buildId: history.buildId, protocol: history.snapshot.protocol, contentRevision: content,
  audience: 'public', runtimeSourceSha256, sourceSnapshotSha256, committedSnapshotSha256: committedHash.digest('hex'), lineEndingOnlyDifferences: endings, endpoint };
fs.writeFileSync(root + '/preview-build.json', JSON.stringify(identity, null, 2) + '\n', { flag: 'wx' });
const members = walk(root).map(file => ({ path: file.slice(root.length + 1), bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) }));
const report = { passed: true, createdAt: new Date().toISOString(), ...identity, root: path.resolve(root), url,
  files: members.length, bytes: members.reduce((n, m) => n + m.bytes, 0), members,
  backend: { path: path.resolve(serverPath), bytes: fs.statSync(serverPath).size, sha256: sha(fs.readFileSync(serverPath)), externalProjectNodeModulesRequired: true },
  gate: { path: gatePath, sha256: sha(fs.readFileSync(gatePath)) }, publicMenuAndWorkerIsolation: true,
  renderedAccepted: false, humanAccepted: false, notAPublicDeployment: true,
  limits: ['Exact committed runtime/test inputs and local native gate; static build and byte identity only. No rendered, human, audio, native-language, device or WAN acceptance.', 'Backend helper uses external pinned project node_modules and is not a portable Windows release. No earlier frozen root or service was replaced.'] };
fs.writeFileSync('reviews/public-polish-2026-10-28/preview-public-bytes.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ...identity, root: report.root, files: report.files, bytes: report.bytes, backend: report.backend, url }));
