import lateMedicEdition from './fixtures/medic-issued83-bindings.json';
import medicEdition from './fixtures/medic-issued82-bindings.json';
import interceptorFittings from './fixtures/tank-interceptor-issued81-bindings.json';
import bulwarkFittings from './fixtures/tank-bulwark-issued80-bindings.json';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { bastionIds } from '../src/shared/tank-bastion.ts';
import { CONTENT_REVISION, PROTOCOL, implementedClassIds } from '../src/shared/protocol.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import binding from './fixtures/tank-bastion-issued79-bindings.json';

const bytes = readFileSync(new URL('./fixtures/tank-bastion-issued79.json', import.meta.url), 'utf8');
const issued = JSON.parse(bytes);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

test('the exact issued Bastion edition restores all 207 local build fixtures', () => {
  assert.equal(PROTOCOL,84);
  assert.equal(issued.protocol, 79);
  assert.equal(issued.sourceCommit, binding.sourceCommit);
  assert.equal(issued.contentRevision, binding.sourceRevision);
  assert.equal(digest(bytes.replaceAll('\r\n', '\n')), binding.fixtureSha256);
  assert(issued.controlledLocalFixture && !issued.onlineProof && !issued.privateRecordsRead);
  assert.deepEqual(data.specializationSkills.slice(0, 78).map(skill => skill.id), issued.issuedSpecializationIds);
  assert.deepEqual(data.generalSkills.map(skill => skill.id), issued.issuedGeneralIds);
  assert.deepEqual(issued.classes.map((row: { classId: string }) => row.classId), implementedClassIds);
  assert.equal(issued.bastionHybrids.length, 48);
  const cases = [issued.individual, issued.classes, issued.lineworker, issued.wallHybrids, issued.interceptorHybrids, issued.bastionHybrids].flat();
  assert.equal(cases.length, binding.ownershipFixtures);
  for (const row of cases) {
    const checkpoint = structuredClone(row.checkpoint);
    const restored = Game.restoreOffline(checkpoint);
    const { skills, classId, totalSp, weapon, coins, ammo, health, maxHealth } = restored.players.get('solo')!;
    assert.deepEqual({ skills, classId, totalSp, weapon, coins, ammo, health, maxHealth, phase: restored.phase }, row.restored, row.name);
    assert.deepEqual(checkpoint, row.checkpoint);
    const after = restored.offlineCheckpoint()!;
    assert(after.practiceOnly);
    assert.equal(after.protocolVersion, PROTOCOL);
    assert.equal(after.contentRevision, CONTENT_REVISION);
    assert.equal(restored.classCues().length, 0);
  }
});

test('issued 79 rejects late fitting ownership and wrong trust or edition', () => {
  const eligible = [
    [bastionIds.relief, issued.individual.find((row: { name: string }) => row.name === bastionIds.split).checkpoint],
    [bastionIds.countermarch, issued.individual.find((row: { name: string }) => row.name === bastionIds.corner).checkpoint],
  ];
  for (const [id, checkpoint] of eligible) {
    const added = structuredClone(checkpoint);
    added.player.skills.push(id);
    assert.throws(() => Game.restoreOffline(added), /versionMismatch/);
    for (const patch of [
      { protocolVersion: 78 }, { protocolVersion: 80 }, { protocolVersion: 38 }, { contentRevision: CONTENT_REVISION },
      { practiceOnly: false }, { serverOnly: true }, { players: [] },
    ]) assert.throws(() => Game.restoreOffline({ ...checkpoint, ...patch }), /versionMismatch/);
  }
});

test('issued 79 preserves both HUD layouts, saved remaps and all twelve local record classes', () => {
  assert.deepEqual(issued.profiles.map((p: { layout: string }) => p.layout), ['grouped', 'separate']);
  for (const { profile, parsed, history } of issued.profiles) {
    const actual = parseProfile(JSON.stringify(profile));
    assert.deepEqual(actual.controls, parsed.controls);
    assert.deepEqual(actual.settings, parsed.settings);
    assert.deepEqual(actual.runs, parsed.runs);
    assert.deepEqual(actual.runs.map(row => row.classId), implementedClassIds);
    assert.deepEqual(actual.legacyCampaigns, history);
    assert(actual.practiceOnly && !actual.verified);
    assert.equal(actual.contentRevision, CONTENT_REVISION);
    const wrong = history.flatMap((row: { id: string }) => [47, 78, 80].map(protocol =>
      ({ ...row, id: protocol + '-' + row.id, protocol })));
    assert.deepEqual(practiceRecords({ getItem: () => JSON.stringify([...history, ...wrong]), setItem: () => assert.fail('Read only') }), history);
  }
});

test('late-fittings copy preserves all fifteen issued 79 message dictionaries', () => {
  assert.equal(Object.keys(issued.dictionaries).length, 15);
  const appended = new Set([...binding.addedLocaleKeys, ...bulwarkFittings.addedLocaleKeys,...lateMedicEdition.addedLocaleKeys,...medicEdition.addedLocaleKeys,...interceptorFittings.addedLocaleKeys]);
  for (const [id, sha256] of Object.entries(issued.dictionaries)) {
    const locale = JSON.parse(readFileSync(new URL('../locales/' + id + '.json', import.meta.url), 'utf8'));
    for (const key of appended) assert(Object.hasOwn(locale.messages, key), key);
    const original = Object.fromEntries(Object.entries(locale.messages).filter(([key]) => !appended.has(key)));
    assert.equal(digest(JSON.stringify(original)), sha256, id);
  }
});
