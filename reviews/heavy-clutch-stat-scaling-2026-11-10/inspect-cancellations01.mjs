import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const root = 'C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)';
const repo = 'ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-';
const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' };
for (const k of Object.keys(env)) if (/^(GIT_TRACE|GCM_TRACE|GIT_CURL_VERBOSE)/i.test(k)) delete env[k];
const credential = execFileSync('git', ['-c', 'core.bare=false', 'credential', 'fill'], { cwd: root, input: 'protocol=https\nhost=github.com\npath=' + repo + '.git\n\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], env, timeout: 10000 });
const token = credential.split(/\r?\n/).find(l => l.startsWith('password='))?.slice(9); assert(token);
const api = 'https://api.github.com/repos/' + repo;
const get = async url => { assert(url.startsWith(api + '/')); const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10000) }); assert(r.ok, 'Read HTTP ' + r.status); return r.json(); };
const rows = [];
for (const id of [129628239570, 129628301768]) {
  const job = await get(api + '/actions/jobs/' + id);
  assert(job.conclusion === 'cancelled');
  const [check, annotations] = await Promise.all([get(job.check_run_url), get(job.check_run_url + '/annotations?per_page=100')]);
  rows.push({ jobId: id, runId: job.run_id, startedAt: job.started_at, completedAt: job.completed_at, elapsedSeconds: (Date.parse(job.completed_at) - Date.parse(job.started_at)) / 1000, conclusion: job.conclusion, checkConclusion: check.conclusion, checkTitle: check.output?.title, checkSummary: check.output?.summary, annotationCount: check.output?.annotations_count, annotations: annotations.map(a => ({ level: a.annotation_level, title: a.title, message: a.message })) });
}
const report = { checkedAt: new Date().toISOString(), sourceCommit: '205d1bd35db96f0b9a4054514f887e6865b5a660', workflowTimeoutMinutesUnchanged: 20, rows, credentialsPrintedOrStored: false, sourceChanged: false, limits: 'Exact original cancelled jobs and check-run annotations; no workflow retry or timeout extension.' };
fs.writeFileSync(new URL('ci-cancellation-audit01.json', import.meta.url), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report));
