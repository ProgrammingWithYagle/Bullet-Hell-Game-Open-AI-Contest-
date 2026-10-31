import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {writeTextAtomic} from '../../tools/write-text-atomic.mjs';
const source = process.argv[2], root = 'reviews/control-settings-2026-10-30';
assert(/^[a-f0-9]{40}$/.test(source ?? ''));
assert(!fs.existsSync(root + '/wiki-prepared.json'), 'Preserve an issued Wiki transaction');
const git = (dir, ...args) => execFileSync('git', ['-c', 'core.bare=false', '-C', dir, ...args], {maxBuffer: 8 * 1024 * 1024});
const repository = 'https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-';
assert.equal(git('.', 'remote', 'get-url', 'origin').toString().trim(), repository + '.git');
assert.equal(git('.wiki-checkout', 'remote', 'get-url', 'origin').toString().trim(), repository + '.wiki.git');
assert.equal(git('.wiki-checkout', 'status', '--porcelain').toString().trim(), '', 'Wiki has local changes');
const sourceRemote = git('.', 'ls-remote', 'origin', 'refs/heads/feat/first-playable-loop').toString().split(/\s+/)[0];
assert.equal(sourceRemote, source, 'Publish the canonical source first');
const before = git('.wiki-checkout', 'rev-parse', 'HEAD').toString().trim();
assert.equal(before, git('.wiki-checkout', 'ls-remote', 'origin', 'refs/heads/master').toString().split(/\s+/)[0], 'Published Wiki changed');
const files = fs.readdirSync('docs/wiki').filter(name => name.endsWith('.md')).sort();
assert.equal(files.length, 18);
const changed = [], pending = [];
for (const file of files) {
  const bytes = git('.', 'show', source + ':docs/wiki/' + file);
  assert.equal(fs.readFileSync('docs/wiki/' + file, 'utf8').replaceAll('\r\n', '\n'), bytes.toString(), 'Uncommitted canonical page: ' + file);
  if (!fs.readFileSync('.wiki-checkout/' + file).equals(bytes)) {changed.push(file); pending.push({file, bytes});}
}
assert.deepEqual(changed, ['Accessibility-and-Languages.md', 'Changelog.md', 'Development-Progress.md', 'Getting-Started.md', 'Home.md']);
for (const {file, bytes} of pending) writeTextAtomic('.wiki-checkout/' + file, bytes);
git('.wiki-checkout', 'add', '--', ...changed);
git('.wiki-checkout', 'commit', '-m', 'Document reliable control settings and readable bindings');
const publishedCommit = git('.wiki-checkout', 'rev-parse', 'HEAD').toString().trim();
const receipt = {createdAt: new Date().toISOString(), sourceCommit: source, before, publishedCommit, pagesChanged: changed, userAuthorized: true, exactPageAndImageVerificationPending: true};
fs.writeFileSync(root + '/wiki-prepared.json', JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
git('.wiki-checkout', 'push', 'origin', 'HEAD:master');
assert.equal(publishedCommit, git('.wiki-checkout', 'ls-remote', 'origin', 'refs/heads/master').toString().split(/\s+/)[0]);
fs.writeFileSync(root + '/wiki-push.json', JSON.stringify({...receipt, remoteHeadVerified: true}, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(receipt));
