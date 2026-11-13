// Repository-scoped pre-release/asset publication. Credentials remain only in process memory.
import { readFileSync, writeFileSync, statSync, createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, basename, join } from 'node:path';
const repository = 'ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-',
  base = '/repos/' + repository;
const configPath = process.argv[2];
if (!/^docs\/github\/windows-prerelease\.json$/.test(configPath ?? ''))
  throw Error('Use the prepared repository release description.');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
if (
  !/^[a-f0-9]{40}$/.test(config.target_commitish) ||
  !/^dev-windows-\d{8}-\d+$/.test(config.tag_name) ||
  config.prerelease !== true ||
  config.draft !== false ||
  config.make_latest !== false
)
  throw Error('Expected a concrete development pre-release and verified source SHA.');
const credential = spawnSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
});
const token = credential.stdout
  ?.split('\n')
  .find((s) => s.startsWith('password='))
  ?.slice(9);
if (!token) throw Error('Configured repository credential unavailable.');
async function api(method, path, body) {
  if (!path.startsWith(base + '/')) throw Error('Outside authorized repository');
  const response = await fetch('https://api.github.com' + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json();
  if (!response.ok) throw Error(method + ' ' + path + ': ' + response.status + ' ' + value.message);
  return value;
}
const assetRoot = resolve(process.argv[3] ?? 'outputs');
const files = config.assets?.map((file) => ({ ...file, path: join(assetRoot, file.name) }));
delete config.assets;
if (!Array.isArray(files) || files.length < 2 || files.length > 5)
  throw Error('Bounded verified assets required');
for (const file of files) {
  if (
    basename(file.path) !== file.name ||
    !/^Grave_Accord_[A-Za-z0-9_.-]+\.(zip|json|txt|md)$/.test(file.name) ||
    !/^[a-f0-9]{64}$/.test(file.sha256)
  )
    throw Error('Invalid prepared asset');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(resolve(file.path))) hash.update(chunk);
  if (hash.digest('hex') !== file.sha256) throw Error('Asset changed: ' + file.name);
}
const checks = await api('GET', base + '/commits/' + config.target_commitish + '/check-runs');
if (!checks.check_runs.some((c) => c.name === 'verify' && c.conclusion === 'success'))
  throw Error('Wait for an actual passing verify check on the exact source commit.');
const prior = await api('GET', base + '/releases?per_page=100');
let release = prior.find((r) => r.tag_name === config.tag_name);
if (release) {
  if (release.target_commitish !== config.target_commitish || !release.prerelease || release.draft)
    throw Error('Existing release identity differs; preserve it.');
} else release = await api('POST', base + '/releases', { ...config, make_latest: 'false' });
const uploads = await api('GET', base + '/releases/' + release.id + '/assets');
const published = [];
for (const file of files) {
  let asset = uploads.find((a) => a.name === file.name);
  if (asset) {
    if (asset.size !== statSync(file.path).size || asset.digest !== 'sha256:' + file.sha256)
      throw Error('Existing asset mismatch: ' + file.name);
  } else {
    const endpoint = new URL(release.upload_url.split('{')[0]);
    if (
      endpoint.hostname !== 'uploads.github.com' ||
      endpoint.pathname !== base + '/releases/' + release.id + '/assets'
    )
      throw Error('Unexpected upload route');
    endpoint.searchParams.set('name', file.name);
    console.log('Uploading ' + file.name + ' (' + statSync(file.path).size + ' bytes)');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'Content-Type': file.name.endsWith('.zip') ? 'application/zip' : 'application/octet-stream',
        'Content-Length': String(statSync(file.path).size),
      },
      body: createReadStream(file.path),
      duplex: 'half',
      signal: AbortSignal.timeout(600000),
    });
    asset = await response.json();
    if (!response.ok) throw Error('Upload failed: ' + response.status + ' ' + asset.message);
    if (asset.size !== statSync(file.path).size || asset.digest !== 'sha256:' + file.sha256)
      throw Error('Published asset size/digest mismatch: ' + file.name);
  }
  published.push({
    id: asset.id,
    name: asset.name,
    bytes: asset.size,
    sha256: file.sha256,
    url: asset.browser_download_url,
  });
}
const result = {
  createdAt: new Date().toISOString(),
  passed: true,
  sourceCommit: config.target_commitish,
  url: release.html_url,
  tag: release.tag_name,
  draft: release.draft,
  prerelease: release.prerelease,
  assets: published,
  limits: [
    'Development pre-release from the verified feature branch. Protected main and the old public Site are unchanged.',
    'Automated package evidence does not replace human, rendered, device, physical-LAN or final gameplay acceptance.',
  ],
};
writeFileSync(
  'reviews/windows-prerelease-publication.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify(result, null, 2));
