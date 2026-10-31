import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const source = process.argv[2];
assert(/^[a-f0-9]{40}$/.test(source ?? ''));
const git = (dir, ...args) => execFileSync('git', ['-c', 'core.bare=false', '-C', dir, ...args], { maxBuffer: 8 * 1024 * 1024 });
const remote = git('.wiki-checkout', 'remote', 'get-url', 'origin').toString().trim();
assert.equal(remote, 'https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-.wiki.git');
assert.equal(git('.wiki-checkout', 'status', '--porcelain').toString().trim(), '', 'Wiki has local changes');
const before = git('.wiki-checkout', 'rev-parse', 'HEAD').toString().trim();
const remoteBefore = git('.wiki-checkout', 'ls-remote', 'origin', 'refs/heads/master').toString().split(/\s+/)[0];
assert.equal(before, remoteBefore, 'Published Wiki changed; inspect before updating');
const files = fs.readdirSync('docs/wiki').filter(name => name.endsWith('.md')).sort();
assert.equal(files.length, 18);
const changed = [];
for (const file of files) {
  const bytes = git('.', 'show', source + ':docs/wiki/' + file);
  assert.equal(fs.readFileSync('docs/wiki/' + file, 'utf8').replaceAll('\r\n', '\n'), bytes.toString(), 'Uncommitted canonical page: ' + file);
  const target = '.wiki-checkout/' + file;
  if (!fs.readFileSync(target).equals(bytes)) {
    for (let attempt = 0;; attempt++) {
      try { fs.writeFileSync(target, bytes); break; }
      catch (error) { if (error.code !== 'UNKNOWN' || attempt === 2) throw error; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200); }
    }
    changed.push(file);
  }
}
assert.deepEqual(changed, ['Changelog.md', 'Development-Progress.md', 'Getting-Started.md', 'Home.md']);
git('.wiki-checkout', 'add', '--', ...changed);
git('.wiki-checkout', 'commit', '-m', 'Document Tutorial, full cover and clearer loadout');
const published = git('.wiki-checkout', 'rev-parse', 'HEAD').toString().trim();
const receipt = { sourceCommit: source, before, publishedCommit: published, pagesChanged: changed, userAuthorized: true, exactPageAndImageVerificationPending: true };
fs.writeFileSync('reviews/public-polish-followup-2026-10-28/wiki-prepared.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
git('.wiki-checkout', 'push', 'origin', 'HEAD:master');
fs.writeFileSync('reviews/public-polish-followup-2026-10-28/wiki-push.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt));
