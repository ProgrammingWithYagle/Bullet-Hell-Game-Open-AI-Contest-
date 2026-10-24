import { brandExecutable } from './brand-executable.mjs';
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
} from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url),
  root = resolve(import.meta.dirname, '..');
process.chdir(root);
const history = JSON.parse(readFileSync('src/shared/update-history.json', 'utf8')),
  pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const requested = process.argv[2],
  output = requested
    ? resolve(requested)
    : resolve('release', 'Grave-Accord-' + history.buildId + '-win32-x64');
if (existsSync(output))
  throw Error('Choose a new output directory; existing builds are preserved.');
if (!existsSync('dist/index.html')) throw Error('Run the production client build first.');
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
cpSync('dist', join(appDir, 'client'), { recursive: true });
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
  });
  for (const input of Object.keys(result.metafile.inputs)) {
    if (!input.includes('node_modules/')) continue;
    let directory = dirname(resolve(input));
    while (directory !== root && !existsSync(join(directory, 'package.json'))) {
      const parent = dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
    if (!existsSync(join(directory, 'package.json'))) continue;
    const dependency = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    runtimePackages.set(dependency.name + '@' + dependency.version, { directory, ...dependency });
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
});
writeFileSync(
  join(appDir, '__test__', 'smoke.html'),
  '<!doctype html><html><head><meta charset="utf-8"><title>Grave Accord automated package fixture</title></head><body><p>Automated offline package validation</p><script type="module" src="./smoke.js"></script></body></html>',
);
const files = readdirSync('dist/assets'),
  worker = files.find((f) => /^offline\.worker-.*\.js$/.test(f)),
  font = files.find((f) => /noto-sans-latin-400-normal.*\.woff2$/.test(f));
if (!worker || !font) throw Error('Missing worker/font in production build.');
const music = JSON.parse(
  readFileSync('assets/production/audio/delivery/library.json', 'utf8'),
).tracks.map((t) => {
  const file = files.find((f) => f.startsWith(t.id + '-') && f.endsWith('.mp3'));
  if (!file) throw Error('Missing delivery ' + t.id);
  return { id: t.id, url: '../assets/' + file, frames: t.frames, sampleRate: t.sampleRate };
});
writeFileSync(
  join(appDir, '__test__', 'bundle.json'),
  JSON.stringify({ worker: '../assets/' + worker, font: '../assets/' + font, music }, null, 2) +
    '\n',
);
for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md'])
  copyFileSync(name, join(output, name === 'LICENSE' ? 'GAME-LICENSE.txt' : name));
writeFileSync(
  join(output, 'READ-ME.txt'),
  `GRAVE ACCORD - DEVELOPMENT PLAYTEST\n${pkg.version} / ${history.buildId}\n\nExtract the whole folder and start Grave Accord.exe. Offline solo requires no Node, internet or multiplayer server.\nProfile/settings live in GraveAccordData beside the executable when writable; Profile offers JSON export/import.\nLAN hosting starts only from the in-game LAN menu. Keep the host application open. Use a private IPv4 address on the same network; the game does not alter your firewall.\nThis is an unsigned development build. Complete animation, tuning, rendered/human/device/language acceptance, global rankings and durable online restart recovery remain open.\n`,
);
const walk = (dir) =>
  readdirSync(dir)
    .sort()
    .flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const manifest = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  buildId: history.buildId,
  version: pkg.version,
  electron: require('electron/package.json').version,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceDirty:
    execFileSync('git', ['-c', 'core.bare=false', 'status', '--porcelain'], {
      encoding: 'utf8',
    }).trim().length > 0,
  buildTools: ['tools/build-desktop.mjs', 'tools/brand-executable.mjs'].map((path) => ({
    path,
    sha256: hash(path),
  })),
  sourceSnapshot: JSON.parse(readFileSync('reviews/runtime-verification.json', 'utf8'))
    .sourceSnapshotSha256,
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
