import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const stage = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)';
const base = '205d1bd35db96f0b9a4054514f887e6865b5a660';
const scope = 'reviews/heavy-clutch-stat-scaling-2026-11-10';
process.chdir(root);
const git = (...a) => execFileSync('git', ['-c', 'core.bare=false', ...a], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
assert.equal(git('rev-parse', 'HEAD'), base); assert.equal(git('branch', '--show-current'), 'feat/first-playable-loop');
assert.equal(git('diff', '--cached'), ''); assert.equal(git('diff', '--', 'src', 'tests', 'tools', 'content', 'assets', 'locales'), '');
assert(!fs.existsSync(scope));
const planned = new Map();
let s = fs.readFileSync('tests/helpers/heavy-clutch-flow.ts', 'utf8');
assert.equal((s.match(/assert\(s\.damage>=r\.damage\);/g) ?? []).length, 1);
s = s.replace('assert(s.damage>=r.damage);', 'assert(Number.isFinite(s.damage)&&s.damage>0);');
s = s.replace('const aim=heavyOpenLane(view(),a.owner).aim;', 'const statContextAtStrokeStart={skills:[...p().skills],upgrades:{...p().upgrades},mutations:view().mutations.map(m=>({...m}))};const aim=heavyOpenLane(view(),a.owner).aim;');
s = s.replace('return{passed:true,mode,actualAdmissionTicks:', 'return{passed:true,mode,statContextAtStrokeStart,actualAdmissionTicks:');
assert(s.includes('statContextAtStrokeStart,')); planned.set('tests/helpers/heavy-clutch-flow.ts', s);
s = fs.readFileSync('tests/helpers/heavy-traverse-flow.ts', 'utf8');
assert.equal((s.match(/assert\(first\.damage >= r\.damage\);/g) ?? []).length, 1);
s = s.replace('assert(first.damage >= r.damage);', 'assert(Number.isFinite(first.damage) && first.damage > 0);');
s = s.replace('  const aim = heavyOpenLane(view(), a.owner).aim;', '  const statContextAtStrokeStart = { skills: [...p().skills], upgrades: { ...p().upgrades }, mutations: view().mutations.map(m => ({ ...m })) };\n  const aim = heavyOpenLane(view(), a.owner).aim;');
s = s.replace('    fourSeparatePaidRounds: true,', '    fourSeparatePaidRounds: true,\n    statContextAtStrokeStart,');
assert(s.includes('statContextAtStrokeStart,')); planned.set('tests/helpers/heavy-traverse-flow.ts', s);
s = fs.readFileSync(stage + '/stat-adapter01.mts', 'utf8');
const prefix = '../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/';
s = s.replaceAll(prefix + 'src/', '../../src/').replaceAll(prefix + 'tests/helpers/heavy-flak-flow.ts', './heavy-flak-flow.ts').replace('const g = new Game(', 'const g: any = new Game(');
planned.set('tests/helpers/heavy-stat-proof-fixture.ts', '// Controlled actual-Game stat regression only; not an earned or transport fixture.\n' + s);
s = fs.readFileSync('tools/verify.mjs', 'utf8');
assert(s.includes("['--import','tsx','--test',...tests]"));
s = s.replace("import {spawnSync}", "import {availableParallelism} from 'node:os';\nimport {spawnSync}");
s = s.replace("const commands=", "// A bounded floor lets real peer/worker clocks overlap on small CI runners without extending any timeout or omitting a case.\nconst testFileConcurrency=Math.max(4,Math.min(8,availableParallelism()));\nconst commands=");
s = s.replace("['--import','tsx','--test',...tests]", "['--import','tsx','--test','--test-concurrency='+testFileConcurrency,...tests]");
s = s.replace('passed:true,sourceSnapshotSha256:', "passed:true,testFileConcurrency,testFiles:tests.length,verificationDriverSha256:createHash('sha256').update(readFileSync('tools/verify.mjs')).digest('hex'),sourceSnapshotSha256:");
planned.set('tools/verify.mjs', s);
const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import { statAdapter } from './helpers/heavy-stat-proof-fixture.ts';
import { heavyClutchOperation } from './helpers/heavy-clutch-flow.ts';
import { heavyTraverseFlow } from './helpers/heavy-traverse-flow.ts';
import { heavyTraverseRules as rules } from '../src/shared/heavy-traverse.ts';
for (const mode of ['loose', 'spade', 'floating'] as const) {
  for (const mutation of ['lifeline', 'iron-rain'] as const)
    test('real Clutch operation preserves exact reduced stat-scaled physical damage and paid slots: ' + mode + '/' + mutation, async () => {
      const f = statAdapter(mode, 'clutch', mutation);
      try {
        await f.prepareClutch();
        const expected = rules.damage * f.g.stats(f.p).damage;
        assert(expected > 0 && expected < rules.damage);
        const result = await heavyClutchOperation(f.adapter, mode);
        assert(result.shots.every(s => Math.abs(s.damage - expected) < 1e-9));
        assert.equal(result.actualPaidRounds + result.actualForfeitedSlots, 4);
        assert(result.actualHostExit);
        assert.deepEqual(result.statContextAtStrokeStart.mutations, [{ id: mutation, remaining: 2 }]);
      } finally { f.dispose(); }
    });
  test('real entry operation preserves four separate reduced-damage rounds and physical host cleanup: ' + mode, async () => {
    const f = statAdapter(mode, 'entry', 'iron-rain');
    try {
      const result = await heavyTraverseFlow(f.adapter, mode);
      const expected = rules.damage * f.g.stats(f.p).damage;
      assert(expected > 0 && expected < rules.damage);
      assert.equal(result.shots.length, 4);
      assert(result.shots.every(s => Math.abs(s.damage - expected) < 1e-9));
      assert.deepEqual(result.actualAdmissionTicks.map(t => t - result.actualAdmissionTicks[0]), [0, 10, 20, 30]);
      assert(result.actualHostExit);
      assert.deepEqual(result.statContextAtStrokeStart.mutations, [{ id: 'iron-rain', remaining: 2 }]);
    } finally { f.dispose(); }
  });
}
`;
planned.set('tests/heavy-traverse-stat-proof.test.ts', test);
for (const [f] of planned) if (!fs.existsSync(f)) assert(!git('ls-files', '--', f));
fs.mkdirSync(scope);
fs.writeFileSync(scope + '/.gitattributes', '*.log -text -whitespace\n*.mts -text\n*.txt -text\n', { flag: 'wx' });
for (const [f, text] of planned) fs.writeFileSync(f, text);
for (const name of ['damage-floor-reproduction01.json', 'reproduce-damage-floor01.mts', 'stat-adapter01.mts']) fs.copyFileSync(stage + '/' + name, scope + '/' + name, fs.constants.COPYFILE_EXCL);
const sha = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const report = { checkedAt: new Date().toISOString(), base, expectedTests: 2161, previousTests: 2152, regressionCases: 9, gameplayAndContentChanges: false, fullSevenChecksPreserved: true, testFileConcurrencyMinimum: 4, maximum: 8, timeoutAndDeadlineChanges: false, verificationDriverSha256: sha('tools/verify.mjs'), files: [...planned.keys()].map(file => ({ file, sha256: sha(file) })), originalNativeAndCICancellationsPreserved: true, noSourceBearingProgressRegeneration: true };
fs.writeFileSync(stage + '/admission01.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(scope + '/admission01.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ admittedTestProofOnly: true, expectedTests: 2161, paths: planned.size, gameplayAndContentExact: true, fullSuiteBoundedParallelism: '4..8', existingTimeoutsUnchanged: true }));
