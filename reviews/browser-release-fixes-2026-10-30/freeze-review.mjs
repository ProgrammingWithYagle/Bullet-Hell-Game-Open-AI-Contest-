import {additionalSourceBinding} from './review-inputs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
const commit = process.argv[2];
assert(/^[a-f0-9]{40}$/.test(commit ?? ''), 'Supply the source commit');
const audience = process.argv[3];
assert(['public', 'testing'].includes(audience), 'Supply public or testing');
const attempt = process.argv[4] ?? '01';
assert(/^\d{2}$/.test(attempt), 'Supply a two-digit review attempt');
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
const gatePath = 'reviews/browser-release-fixes-2026-10-30/gate-01/runtime-verification.json';
const gate = JSON.parse(fs.readFileSync(gatePath));
assert(gate.passed, 'The complete local gate must pass first');
assert.equal(gate.runtimeSourceSha256, runtimeSourceSha256);
assert.equal(gate.sourceSnapshotSha256, sourceSnapshotSha256);
const additional=additionalSourceBinding();
const preservation=JSON.parse(fs.readFileSync('reviews/browser-release-fixes-2026-10-30/gate-01/gate-preservation.json'));
assert(preservation.passed,'Verification and preservation of issued reports must both pass');
assert.equal(additional.sha256,preservation.additionalSourceBinding.sha256);
const additionalLineEndingOnlyDifferences = [], committedAdditionalHash = createHash('sha256');
for(const member of additional.members) {
  const committed = git('show',commit+':'+member.path), local = fs.readFileSync(member.path);
  committedAdditionalHash.update(member.path+'\0').update(committed);
  if(!local.equals(committed)) {
    assert(['LICENSE','reviews/multiplayer-progression-2026-10-30/frozen-inputs-01.json'].includes(member.path),'Uncommitted art/locale/check input: '+member.path);
    assert(Buffer.from(local.toString().replaceAll('\r\n','\n')).equals(committed),'Unexpected license text change');
    additionalLineEndingOnlyDifferences.push({file:member.path,localBytes:local.length,committedBytes:committed.length,localSha256:sha(local),committedSha256:sha(committed)});
  }
}
const committedAdditionalSourceSha256 = committedAdditionalHash.digest('hex');
const candidate = 'output/candidate-browser-fixes-' + audience;
const endpoint = 'http://127.0.0.1:' + (audience === 'testing' ? 2638 : 2639), url = 'http://127.0.0.1:' + (audience === 'testing' ? 5264 : 5265) + '/';
const built = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', candidate, '--logLevel', 'warn'], {
  encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, env: { ...process.env, VITE_GAME_AUDIENCE: audience, VITE_GAME_SERVER: endpoint },
});
fs.writeFileSync('reviews/browser-release-fixes-2026-10-30/' + audience + '-build-' + attempt + '.log', (built.stdout ?? '') + (built.stderr ?? ''), { flag: 'wx' });
assert.equal(built.status, 0, 'Public build failed');
const afterBuildHash = createHash('sha256');
for (const file of walk('src').sort()) afterBuildHash.update(file + '\0').update(fs.readFileSync(file));
assert.equal(afterBuildHash.digest('hex'), runtimeSourceSha256, 'Source changed during public build');
const jsFiles = walk(candidate).filter(file => file.endsWith('.js'));
const main = jsFiles.filter(file => !path.basename(file).startsWith('offline.worker-')).map(file => fs.readFileSync(file, 'utf8')).join('\n');
const workers = jsFiles.filter(file => path.basename(file).startsWith('offline.worker-'));
assert.equal(workers.length, 1);
assert(main.includes(endpoint), 'Candidate does not bind to the selected review backend');
const workerText = fs.readFileSync(workers[0], 'utf8');
for (const markup of ['<select id="opening-boss"', 'id="testing-coins"', 'id="testing-apply"', 'testing-unlock-home'])
  assert.equal(main.includes(markup), audience === 'testing', 'Wrong audience menu branch: ' + markup);
assert.equal(workerText.includes('testingCommand'), audience === 'testing', 'Wrong audience worker branch');
assert.equal(main.includes('class="setup-build"'), audience === 'testing', 'Wrong audience development footer');
for (const required of ['id="gentle-start"', 'id="assets-progress"', 'arena-legend', 'difficulty-emblem', 'mode-preview', 'run-stat-list', 'phase-countdown', 'hud-actions', 'data-home-gallery', 'data-gallery-previous', 'data-gallery-next', 'ui.errorLanguage', 'ui.loadingLanguage', 'ui.applyingProfile', 'language-welcome-title', 'data-welcome-language', 'ui.defaultDisplayName'])
  assert(main.includes(required), 'Missing shared presentation: ' + required);
for(const required of ['ui.controlsSaved','ui.controlsUnchanged','ui.controlMouseLeft','ui.controlMouseMiddle','ui.controlMouseRight','ui.controlSpace','ui.controlLeftStick']) assert(main.includes(required),'Missing readable controls: '+required);
assert(main.includes('data-shop-status'),'Missing equipment purchase status');
assert(main.includes('data-resource-art'),'Missing painted equipment/resources');
for(const name of ['equipment-case-v1','coins-v1','skill-manual-v1']) {
 const emitted=walk(candidate).filter(file=>path.basename(file).startsWith(name+'-')&&file.endsWith('.png'));
 assert.equal(emitted.length,1,'Missing unique resource icon: '+name);
 assert.equal(sha(fs.readFileSync(emitted[0])),sha(fs.readFileSync('assets/production/ui/resources/'+name+'.png')),'Resource bytes changed');
}
assert(main.includes('data-record-mode')&&main.includes('data-record-week'),'Missing records filters');
for(const required of ['lobby-navigation','room-invite-hud','randomRun','randomEncounter','boss-defeated','arena-world-'])
  assert(main.includes(required),'Missing room/map follow-up presentation: '+required);
for(const required of ['room-password-dialog','player-vitals','map-collage','ui.preparingNextEncounter','ui.preparingResults','menu-room-invite-slot','chatReceipt','chat-delivery-status','ui.chatDeliveryUncertain'])
  assert(main.includes(required),'Missing interface clarity presentation: '+required);
for(const required of ['host-pause-match','data-host-pause','data-host-end','data-password-toggle','invite-room-password','ui.matchEndedByHost','matchPaused']) assert(main.includes(required),'Missing host controls: '+required);
assert(/\.pauseButton\.id\s*=\s*(['"\x60])host-pause-match\1/.test(main),'Missing imperative host pause button assignment');
for(const required of ['id="cancel-loading"','ui.searchingRooms','ui.findingRoom','ui.errorServerAddress','ui.errorRoomUnavailable']) assert(main.includes(required),'Missing connection clarity: '+required);
for(const required of ['ui.medicReviveHealth','ui.medicReviveOne','ui.selfReviveHelp','ui.regenOff'])
  assert(main.includes(required),'Missing recovery follow-up presentation: '+required);
const history = JSON.parse(fs.readFileSync('src/shared/update-history.json'));
const content = JSON.parse(fs.readFileSync('content/revision.json')).sha256;
const root = 'output/playtest-browser-fixes-' + audience + '-' + commit.slice(0, 7) + '-r' + attempt, backendRoot = 'output/frozen-browser-fixes-' + audience + '-' + commit.slice(0, 7) + '-r' + attempt;
const outputRoot = path.resolve('output') + path.sep;
for (const dir of [root, backendRoot]) { assert(path.resolve(dir).startsWith(outputRoot)); assert(!fs.existsSync(dir), 'Refusing to overwrite frozen root: ' + dir); }
fs.cpSync(candidate, root, { recursive: true, force: false, errorOnExist: true });
fs.mkdirSync(backendRoot);
const serverPath = backendRoot + '/server.mjs';
await build({ entryPoints: ['src/server/index.ts'], bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: serverPath, logLevel: 'silent' });
const identity = { sourceCommit: commit, buildId: history.buildId, protocol: history.snapshot.protocol, contentRevision: content,
  audience, additionalSourceBinding: {sha256:additional.sha256,files:additional.files,bytes:additional.bytes}, committedAdditionalSourceSha256, additionalLineEndingOnlyDifferences, runtimeSourceSha256, sourceSnapshotSha256, committedSnapshotSha256: committedHash.digest('hex'), lineEndingOnlyDifferences: endings, endpoint };
fs.writeFileSync(root + '/preview-build.json', JSON.stringify(identity, null, 2) + '\n', { flag: 'wx' });
const members = walk(root).map(file => ({ path: file.slice(root.length + 1), bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) }));
const report = { passed: true, createdAt: new Date().toISOString(), ...identity, root: path.resolve(root), url,
  files: members.length, bytes: members.reduce((n, m) => n + m.bytes, 0), members,
  backend: { path: path.resolve(serverPath), bytes: fs.statSync(serverPath).size, sha256: sha(fs.readFileSync(serverPath)), externalProjectNodeModulesRequired: true },
  gate: { path: gatePath, sha256: sha(fs.readFileSync(gatePath)) }, audienceMenuAndWorkerIsolation: true,
  freezerSha256: sha(fs.readFileSync(import.meta.filename)), reviewAttempt: attempt,
  renderedAccepted: false, humanAccepted: false, notAPublicDeployment: true,
  limits: ['Exact committed runtime/test inputs and local native gate; static build and byte identity only. No rendered, human, audio, native-language, device or WAN acceptance.', 'Backend helper uses external pinned project node_modules and is not a portable Windows release. No earlier frozen root or service was replaced.'] };
fs.writeFileSync('reviews/browser-release-fixes-2026-10-30/preview-' + audience + '-bytes.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ...identity, root: report.root, files: report.files, bytes: report.bytes, backend: report.backend, url }));
