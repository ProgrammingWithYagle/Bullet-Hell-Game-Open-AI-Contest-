import { brandExecutable } from './brand-executable.mjs';
import { verifyDesktopSource } from './desktop-source.mjs';
// Bundles the existing runtime; no Node installation or source checkout ships with the application.
import { build } from 'esbuild';
import {
  cpSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  copyFileSync,
  renameSync,
  mkdtempSync,
} from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url),
  root = resolve(import.meta.dirname, '..');
process.chdir(root);
const history = JSON.parse(readFileSync('src/shared/update-history.json', 'utf8')),
  pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const verificationPath = resolve(process.argv[3] ?? 'reviews/runtime-verification.json');
const sourceVerificationBytes = readFileSync(verificationPath);
const sourceVerification = JSON.parse(sourceVerificationBytes);
const audience = process.argv[4] ?? 'public';
assert(['public', 'testing'].includes(audience), 'Choose public or testing');
verifyDesktopSource(root, sourceVerification);
const git = (...args) => execFileSync('git', ['-c', 'core.bare=false', ...args], { encoding: 'utf8' }).trim();
assert.equal(git('status', '--porcelain'), '', 'Build a package from a clean committed checkout');
const sourceCommit = git('rev-parse', 'HEAD');
const requested = process.argv[2],
  output = requested
    ? resolve(requested)
    : resolve('release', 'Grave-Accord-' + history.buildId + '-' + audience + '-win32-x64');
if (existsSync(output))
  throw Error('Choose a new output directory; existing builds are preserved.');
mkdirSync('output', { recursive: true });
const clientRoot = mkdtempSync(resolve('output', 'desktop-client-'));
const clientBuild = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', clientRoot, '--logLevel', 'warn'], {
  stdio: 'inherit', env: { ...process.env, VITE_GAME_AUDIENCE: audience },
});
assert.equal(clientBuild.status, 0, 'The desktop client build failed');
verifyDesktopSource(root, sourceVerification);
const walk = directory => readdirSync(directory).sort().flatMap(name => {
  const file = join(directory, name), stat = statSync(file);
  return stat.isDirectory() ? walk(file) : [file];
});
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const clientFiles = walk(clientRoot);
const mainText = clientFiles.filter(p => p.endsWith('.js') && !/offline\.worker-/.test(p)).map(p => readFileSync(p, 'utf8')).join('\n');
const worker = clientFiles.find(p => /offline\.worker-.*\.js$/.test(p));
assert(worker, 'Missing desktop offline worker');
for (const markup of ['<select id="opening-boss"', 'id="testing-coins"', 'class="setup-build"'])
  assert.equal(mainText.includes(markup), audience === 'testing', 'Desktop menu audience mismatch: ' + markup);
assert.equal(readFileSync(worker, 'utf8').includes('testingCommand'), audience === 'testing', 'Desktop worker audience mismatch');
const electronDist = dirname(require('electron'));
mkdirSync(output, { recursive: true });
cpSync(electronDist, output, { recursive: true });
renameSync(join(output, 'electron.exe'), join(output, 'Grave Accord.exe'));
brandExecutable(
  join(output, 'Grave Accord.exe'),
  resolve('assets/production/desktop/icon.ico'),
  pkg.version,
);
const appDir = join(output, 'resources', 'app');
mkdirSync(appDir, { recursive: true });
copyFileSync('assets/production/desktop/icon.png', join(appDir, 'icon.png'));
cpSync(clientRoot, join(appDir, 'client'), { recursive: true });
const runtimePackages = new Map();
for (const [source, dest] of [
  ['src/desktop/main.ts', 'main.cjs'],
  ['src/desktop/preload.ts', 'preload.cjs'],
  ['src/desktop/lan-child.ts', 'lan.cjs'],
]) {
  const result = await build({
    metafile: true,
    entryPoints: [source],
    outfile: join(appDir, dest),
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    external: ['electron', 'bufferutil', 'utf-8-validate', 'msgpackr-extract'],
    minify: false,
    legalComments: 'eof',
    logLevel: 'warning',
    define: { __GA_TESTING_BUILD__: JSON.stringify(audience === 'testing') },
  });
  for (const input of Object.keys(result.metafile.inputs)) {
    if (!input.includes('node_modules/')) continue;
    let directory = dirname(resolve(input)),
      dependency;
    // Some packages have nested type-only package.json files. License ownership
    // belongs to the nearest named/versioned package, not that module marker.
    while (directory !== root) {
      if (existsSync(join(directory, 'package.json'))) {
        const candidate = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
        if (typeof candidate.name === 'string' && typeof candidate.version === 'string') {
          dependency = candidate;
          break;
        }
      }
      const parent = dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
    if (!dependency) throw Error('Missing package identity for ' + input);
    runtimePackages.set(dependency.name + '@' + dependency.version, { ...dependency, directory });
  }
}
cpSync('docs/licenses', join(output, 'docs', 'licenses'), { recursive: true });
const recordedNotices = JSON.parse(
  readFileSync('docs/licenses/runtime-inventory.json', 'utf8'),
).packages;
const licenseRoot = join(output, 'runtime-licenses');
mkdirSync(licenseRoot, { recursive: true });
const notices = [];
for (const [key, dependency] of runtimePackages) {
  const folder = join(licenseRoot, key.replaceAll('/', '-'));
  mkdirSync(folder, { recursive: true });
  const licenses = readdirSync(dependency.directory).filter(
    (name) =>
      /^(licen[sc]e|copying|notice|copyright)(\.|-|$)/i.test(name) &&
      statSync(join(dependency.directory, name)).isFile(),
  );
  for (const license of licenses)
    copyFileSync(join(dependency.directory, license), join(folder, license));
  const noticeFiles = licenses.map((n) => 'runtime-licenses/' + key.replaceAll('/', '-') + '/' + n);
  if (!noticeFiles.length) {
    const known = recordedNotices.find(
      (p) => p.name === dependency.name && p.version === dependency.version,
    );
    if (!known?.notices?.length || known.notices.some((p) => !existsSync(join(output, p))))
      throw Error('Missing verbatim license for ' + key);
    noticeFiles.push(...known.notices);
  }
  notices.push({
    name: dependency.name,
    version: dependency.version,
    license: dependency.license,
    files: noticeFiles,
  });
}
writeFileSync(join(output, 'RUNTIME-LICENSES.json'), JSON.stringify(notices, null, 2) + '\n');
writeFileSync(
  join(appDir, 'package.json'),
  JSON.stringify(
    {
      name: 'grave-accord',
      productName: 'Grave Accord',
      version: pkg.version,
      main: 'main.cjs',
      private: true,
      license: 'MIT',
    },
    null,
    2,
  ) + '\n',
);
mkdirSync(join(appDir, '__test__'), { recursive: true });
await build({
  entryPoints: ['src/desktop/smoke.ts'],
  outfile: join(appDir, '__test__', 'smoke.js'),
  bundle: true,
  platform: 'browser',
  target: 'es2022',
  format: 'esm',
  legalComments: 'eof',
  logLevel: 'warning',
  define: { __GA_TESTING_BUILD__: JSON.stringify(audience === 'testing') },
});
writeFileSync(
  join(appDir, '__test__', 'smoke.html'),
  '<!doctype html><html><head><meta charset="utf-8"><title>Grave Accord automated package fixture</title></head><body><p>Automated offline package validation</p><script type="module" src="./smoke.js"></script></body></html>',
);
const files = readdirSync(join(clientRoot, 'assets')),
  workerName = files.find((f) => /^offline\.worker-.*\.js$/.test(f)),
  font = files.find((f) => /noto-sans-latin-400-normal.*\.woff2$/.test(f));
if (!workerName || !font) throw Error('Missing worker/font in production build.');
const music = JSON.parse(
  readFileSync('assets/production/audio/delivery/library.json', 'utf8'),
).tracks.map((t) => {
  const file = files.find((f) => f.startsWith(t.id + '-') && f.endsWith('.mp3'));
  if (!file) throw Error('Missing delivery ' + t.id);
  return { id: t.id, url: '../assets/' + file, frames: t.frames, sampleRate: t.sampleRate };
});
writeFileSync(
  join(appDir, '__test__', 'bundle.json'),
  JSON.stringify({ worker: '../assets/' + workerName, font: '../assets/' + font, music }, null, 2) +
    '\n',
);
for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md'])
  copyFileSync(name, join(output, name === 'LICENSE' ? 'GAME-LICENSE.txt' : name));
writeFileSync(
  join(output, 'READ-ME.txt'),
  `GRAVE ACCORD - DEVELOPMENT PLAYTEST\n${pkg.version} / ${history.buildId} / ${audience}\n\nExtract the whole folder and start Grave Accord.exe. Choose New here? then Start gently for an easy Solo run, or open Tutorial to learn the basics. Offline Solo needs no Node installation, internet connection or multiplayer server.\nCoins buy gear and supplies; skill points buy class skills. Inspect an item before buying it. Local progress and records are available from the main menu.\nProfile/settings live in GraveAccordData beside the executable when writable; Profile offers JSON export/import.\nFor players on the same network, open Local network and choose Host or Join. Keep the host application open. Share its private IPv4 address. The game does not change firewall rules.\nThis is an unsigned development build. Complete animation, tuning, rendered/human/device/language acceptance, global rankings and durable online restart recovery remain open.\n`,
);
verifyDesktopSource(root, sourceVerification);
assert.equal(git('rev-parse', 'HEAD'), sourceCommit, 'Source commit changed during packaging');
assert.equal(git('status', '--porcelain'), '', 'Checkout changed during packaging');
writeFileSync(join(output, 'SOURCE-VERIFICATION.json'), sourceVerificationBytes);
const clientVerification = {
  schemaVersion: 2, passed: true, sourceCommit, buildId: history.buildId, audience,
  runtimeSourceSha256: sourceVerification.runtimeSourceSha256,
  sourceSnapshotSha256: sourceVerification.sourceSnapshotSha256,
  sourceVerificationSha256: createHash('sha256').update(sourceVerificationBytes).digest('hex'),
  artifacts: clientFiles.map(file => ({ path: file.slice(clientRoot.length + 1).replaceAll('\\', '/'), bytes: statSync(file).size, sha256: hash(file) })),
  limits: ['Fresh compiled client and source/report identity; native software and manual review remain separate.'],
};
writeFileSync(join(output, 'CLIENT-VERIFICATION.json'), JSON.stringify(clientVerification, null, 2) + '\n');
const manifest = {
  schemaVersion: 2,
  createdAt: new Date().toISOString(),
  buildId: history.buildId,
  version: pkg.version,
  electron: require('electron/package.json').version,
  sourceCommit, sourceDirty: false, audience,
  sourceVerification: { path: 'SOURCE-VERIFICATION.json', sha256: hash(join(output, 'SOURCE-VERIFICATION.json')) },
  clientVerification: { path: 'CLIENT-VERIFICATION.json', sha256: hash(join(output, 'CLIENT-VERIFICATION.json')) },
  buildTools: ['tools/build-desktop.mjs', 'tools/desktop-source.mjs', 'tools/brand-executable.mjs'].map((path) => ({
    path,
    sha256: hash(path),
  })),
  sourceSnapshot: sourceVerification.sourceSnapshotSha256,
  runtimeSourceSha256: sourceVerification.runtimeSourceSha256,
  files: walk(output).map((p) => ({
    path: p.slice(output.length + 1).replaceAll('\\', '/'),
    bytes: statSync(p).size,
    sha256: hash(p),
  })),
  limits: [
    'Unsigned development package; manifest does not establish physical device, rendered or human acceptance.',
    'Original PCM fallback masters remain bundled.',
  ],
};
writeFileSync(join(output, 'BUILD-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(
  JSON.stringify({
    output,
    files: manifest.files.length,
    bytes: manifest.files.reduce((n, f) => n + f.bytes, 0),
    electron: manifest.electron,
    buildId: history.buildId,
  }),
);
