import reactionEdition from './fixtures/alchemist-issued104-bindings.json';
import fieldEdition from './fixtures/ranger-issued103-bindings.json';
import trackerEdition from './fixtures/ranger-issued102-bindings.json';
import rangerEdition from './fixtures/summoner-issued101-bindings.json';
import formationEdition from './fixtures/summoner-issued100-bindings.json';
import bondEdition from './fixtures/summoner-issued99-bindings.json';
import cohortEdition from './fixtures/swordsman-issued98-bindings.json';
import pursuitEdition from './fixtures/swordsman-issued97-bindings.json';
import replyEdition from './fixtures/swordsman-issued96-bindings.json';
import measuredEdition from './fixtures/bard-issued95-bindings.json';
import entranceEdition from './fixtures/bard-issued94-bindings.json';
import lamentEdition from './fixtures/bard-issued93-bindings.json';
import conductorEdition from './fixtures/bard-issued92-bindings.json';
import hunterEdition from './fixtures/assassin-issued91-bindings.json';
import infiltratorEdition from './fixtures/assassin-issued90-bindings.json';
import duelistEdition from './fixtures/assassin-issued89-bindings.json';
import volatileEdition from './fixtures/mage-issued88-bindings.json';
import spatialEdition from './fixtures/mage-issued87-bindings.json';
import mageEdition from './fixtures/mage-issued86-bindings.json';
import preventiveEdition from './fixtures/medic-issued85-bindings.json';
import responseEdition from './fixtures/medic-issued84-bindings.json';
import lateMedicEdition from './fixtures/medic-issued83-bindings.json';
import medicEdition from './fixtures/medic-issued82-bindings.json';
import interceptorFittings from './fixtures/tank-interceptor-issued81-bindings.json';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { bulwarkIds } from '../src/shared/tank-bulwark.ts';
import { CONTENT_REVISION, PROTOCOL, implementedClassIds } from '../src/shared/protocol.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import binding from './fixtures/tank-bulwark-issued80-bindings.json';

const bytes = readFileSync(new URL('./fixtures/tank-bulwark-issued80.json', import.meta.url), 'utf8');
const issued = JSON.parse(bytes);
const digest = (text: string) => createHash('sha256').update(text).digest('hex');

test('the issued Bastion fittings edition restores all 241 exact local builds', () => {
  assert.equal(PROTOCOL, 105);
  assert.equal(issued.protocol, 80);
  assert.equal(issued.sourceCommit, binding.sourceCommit);
  assert.equal(issued.contentRevision, binding.sourceRevision);
  assert.equal(digest(bytes.replaceAll('\r\n', '\n')), binding.fixtureSha256);
  assert(issued.controlledLocalFixture && !issued.onlineProof && !issued.privateRecordsRead);
  const original = data.specializationSkills.slice(0, 80);
  assert.deepEqual(original.map(skill => skill.id), issued.issuedSpecializationIds);
  assert.equal(digest(JSON.stringify({ ...data, specializationSkills: original })), issued.contentRevision);
  assert.deepEqual(data.generalSkills.map(skill => skill.id), issued.issuedGeneralIds);
  assert.deepEqual(issued.classes.map((row: { classId: string }) => row.classId), implementedClassIds);
  assert.equal(issued.lateBastionHybrids.length, 32);
  const fixtures = [
    issued.individual, issued.classes, issued.lineworker, issued.wallHybrids, issued.interceptorHybrids,
    issued.bastionHybrids, issued.lateBastionHybrids,
  ].flat();
  assert.equal(fixtures.length, binding.ownershipFixtures);
  for (const row of fixtures) {
    const checkpoint = structuredClone(row.checkpoint);
    const restored = Game.restoreOffline(checkpoint);
    const { skills, classId, totalSp, weapon, coins, ammo, health, maxHealth } = restored.players.get('solo')!;
    assert.deepEqual({ skills, classId, totalSp, weapon, coins, ammo, health, maxHealth, phase: restored.phase }, row.restored, row.name);
    assert.deepEqual(checkpoint, row.checkpoint);
    const migrated = restored.offlineCheckpoint()!;
    assert(migrated.practiceOnly);
    assert.equal(migrated.protocolVersion, PROTOCOL);
    assert.equal(migrated.contentRevision, CONTENT_REVISION);
    assert.deepEqual(restored.classCues(), []);
  }
});

test('issued 80 rejects future fittings, mismatched versions and live room records', () => {
  for (const [parent, newFitting] of [
    [bulwarkIds.pivot, bulwarkIds.foldedSetdown],
    [bulwarkIds.port, bulwarkIds.sidePort],
  ]) {
    const original = issued.individual.find((row: { name: string }) => row.name === parent).checkpoint;
    const forged = structuredClone(original);
    forged.player.skills.push(newFitting);
    assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
    for (const patch of [
      { protocolVersion: 79 }, { protocolVersion: 81 }, { contentRevision: CONTENT_REVISION },
      { practiceOnly: false }, { serverOnly: true }, { players: [] }, { transactions: [] },
    ]) assert.throws(() => Game.restoreOffline({ ...original, ...patch }), /versionMismatch/);
  }
});

test('issued 80 retains both HUD layouts, remaps and historical records for all classes', () => {
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
    const invalid = history.flatMap((row: { id: string }) => [47, 79, 81].map(protocol =>
      ({ ...row, id: protocol + '-' + row.id, protocol })));
    assert.deepEqual(practiceRecords({ getItem: () => JSON.stringify([...history, ...invalid]), setItem: () => assert.fail('Read only') }), history);
  }
});

test('the two late Bulwark fittings append copy to all fifteen issued 80 dictionaries', () => {
  assert.equal(Object.keys(issued.dictionaries).length, 15);
  const appended = new Set([...binding.addedLocaleKeys,...reactionEdition.addedLocaleKeys, ...fieldEdition.addedLocaleKeys, ...trackerEdition.addedLocaleKeys, ...rangerEdition.addedLocaleKeys, ...formationEdition.addedLocaleKeys, ...bondEdition.addedLocaleKeys, ...cohortEdition.addedLocaleKeys, ...pursuitEdition.addedLocaleKeys, ...replyEdition.addedLocaleKeys, ...measuredEdition.addedLocaleKeys, ...entranceEdition.addedLocaleKeys, ...lamentEdition.addedLocaleKeys, ...conductorEdition.addedLocaleKeys, ...hunterEdition.addedLocaleKeys, ...infiltratorEdition.addedLocaleKeys, ...duelistEdition.addedLocaleKeys, ...volatileEdition.addedLocaleKeys, ...spatialEdition.addedLocaleKeys, ...mageEdition.addedLocaleKeys, ...preventiveEdition.addedLocaleKeys, ...responseEdition.addedLocaleKeys,...lateMedicEdition.addedLocaleKeys,...medicEdition.addedLocaleKeys,...interceptorFittings.addedLocaleKeys]);
  assert.equal(binding.addedLocaleKeys.length, 11);
  for (const [id, hash] of Object.entries(issued.dictionaries)) {
    const locale = JSON.parse(readFileSync(new URL('../locales/' + id + '.json', import.meta.url), 'utf8'));
    for (const key of appended) assert(Object.hasOwn(locale.messages, key), key);
    const original = Object.fromEntries(Object.entries(locale.messages).filter(([key]) => !appended.has(key)));
    assert.equal(digest(JSON.stringify(original)), hash, id);
  }
});
