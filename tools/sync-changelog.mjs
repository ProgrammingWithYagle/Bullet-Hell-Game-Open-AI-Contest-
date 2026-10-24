// One reviewed history drives the local menu and both public Markdown surfaces.
import { readFileSync, writeFileSync } from 'node:fs';
const h = JSON.parse(readFileSync('src/shared/update-history.json', 'utf8'));
const repo = 'https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-';
const body =
  `# Changelog\n\nDevelopment build **${h.buildId}**, protocol ${h.snapshot.protocol}. These entries describe the feature-branch source; the public playtest remains an earlier protocol-4 deployment.\n\n` +
  h.entries
    .map(
      (entry) =>
        `## ${entry.date} — ${entry.title}\n\n` +
        entry.groups
          .map(
            (group) =>
              `### ${group.title}\n\n` + group.items.map((item) => `- ${item}`).join('\n') + '\n\n',
          )
          .join('') +
        (entry.commit ? `[Source checkpoint](${repo}/commit/${entry.commit}).\n\n` : ''),
    )
    .join('') +
  '## Still in development\n\n' +
  h.limitations.map((x) => '- ' + x).join('\n') +
  `\n\n[Earlier production history](${repo}/blob/feat/first-playable-loop/docs/history/CHANGELOG-2026-10-24.md). Historical counts describe their own checkpoints.\n`;
const paths = ['CHANGELOG.md', 'docs/wiki/Changelog.md'];
for (const path of paths) {
  if (process.argv.includes('--check')) {
    if (readFileSync(path, 'utf8').replaceAll('\r\n', '\n') !== body)
      throw new Error('Stale changelog: ' + path + '; run node tools/sync-changelog.mjs');
  } else writeFileSync(path, body);
}
console.log(
  'Changelog ' +
    (process.argv.includes('--check') ? 'parity verified' : 'synchronized') +
    ': two Markdown surfaces and shared in-game history',
);
