import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import history from '../src/shared/update-history.json';
import notices from '../src/client/changelog-notices.json';
import catalog from '../content/catalog.json';
import { implementedBossIds } from '../src/shared/game.ts';
import { implementedClassIds, implementedModeIds, PROTOCOL } from '../src/shared/protocol.ts';
import { runtimeArenas } from '../src/shared/arena-layouts.ts';
import { changelogHTML } from '../src/client/ui/changelog.ts';

test('journal snapshot agrees with actual playable content rather than authored future content', () => {
  assert.deepEqual(history.snapshot, {
    bosses: implementedBossIds.length,
    classes: implementedClassIds.length,
    skills: catalog.skills.filter((x) => implementedClassIds.some((id) => id === x.classId)).length,
    weapons: catalog.weapons.filter((x) => implementedClassIds.some((id) => id === x.classId))
      .length,
    maps: runtimeArenas.length,
    modes: [...implementedModeIds],
    protocol: PROTOCOL,
  });
  assert.equal(new Set(history.entries.map((x) => x.id)).size, history.entries.length);
  history.entries.forEach((entry, i) => {
    assert(Number.isFinite(Date.parse(entry.date)));
    if (i) assert(entry.date <= history.entries[i - 1].date);
  });
  execFileSync(process.execPath, ['tools/sync-changelog.mjs', '--check']);
});
test('journal preserves locale navigation, semantic dates and explicitly English editorial content', () => {
  assert.deepEqual(Object.keys(notices).sort(), catalog.locales.map((x) => x.id).sort());
  for (const [locale, english] of Object.entries(notices)) {
    const html = changelogHTML({ title: '<History>', back: 'Back', english }, locale);
    assert(html.includes('lang="en" dir="ltr"'));
    assert(html.includes('&lt;History&gt;'));
    assert.equal((html.match(/<article /g) ?? []).length, history.entries.length);
    assert.equal((html.match(/<time datetime=/g) ?? []).length, history.entries.length);
    assert(html.includes('id="back-home"'));
    assert(html.includes(history.buildId));
  }
});
