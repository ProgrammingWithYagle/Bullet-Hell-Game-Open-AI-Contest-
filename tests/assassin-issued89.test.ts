import measuredEdition from './fixtures/bard-issued95-bindings.json';
import entranceEdition from './fixtures/bard-issued94-bindings.json';
import lamentEdition from './fixtures/bard-issued93-bindings.json';
import conductorEdition from './fixtures/bard-issued92-bindings.json';
import hunterEdition from './fixtures/assassin-issued91-bindings.json';
import infiltratorEdition from './fixtures/assassin-issued90-bindings.json';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { duelistIds } from '../src/shared/assassin-called-opening.ts';
import { CONTENT_REVISION, PROTOCOL, implementedClassIds } from '../src/shared/protocol.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import binding from './fixtures/assassin-issued89-bindings.json';

const raw = readFileSync(new URL('./fixtures/assassin-issued89.json', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const issued = JSON.parse(raw);
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

test('issued 89 restores all 4,196 local ownership fixtures under the current edition', () => {
  assert.equal(PROTOCOL, 96);
  assert.equal(issued.protocol, 89);
  assert.equal(issued.sourceCommit, binding.sourceCommit);
  assert.equal(issued.contentRevision, binding.sourceRevision);
  assert.equal(hash(raw), binding.fixtureSha256);
  assert(issued.controlledLocalFixture && !issued.onlineProof && !issued.privateRecordsRead);
  const original = data.specializationSkills.slice(0, 104);
  assert.deepEqual(original.map(node => node.id), issued.issuedSpecializationIds);
  assert.equal(hash(JSON.stringify({ ...data, specializationSkills: original })), binding.sourceRevision);
  assert.deepEqual(data.generalSkills.map(node => node.id), issued.issuedGeneralIds);
  assert.equal(issued.lateScreenHybrids.length, 72);
  assert.equal(issued.fullMedicStates.length, 8);
  assert.equal(issued.fieldSurgeryHybrids.length, 24);
  assert.equal(issued.lateSurgeryHybrids.length, 16);
  assert.equal(issued.responseHybrids.length, 36);
  assert.equal(issued.preventiveHybrids.length, 72);
  assert.equal(issued.bindingBuilds.length, 249);
  assert.equal(issued.spatialBuilds.length, 841);
  assert.equal(issued.volatileBuilds.length, 2557);
  assert.deepEqual([issued.sourcePushWorkflow, issued.sourcePullWorkflow], binding.sourceWorkflowIds);
  assert.equal(issued.frozenWorkflowCases, binding.checkedFrozenCases);
  const builds = Object.keys(issued.counts).flatMap(key => {
    assert.equal(issued[key].length, issued.counts[key]);
    return issued[key];
  });
  assert.equal(builds.length, binding.ownershipFixtures);
  for (const row of builds) {
    const input = structuredClone(row.checkpoint);
    const game = Game.restoreOffline(input);
    const { skills, classId, totalSp, weapon, coins, ammo, health, maxHealth } = game.players.get('solo')!;
    assert.deepEqual({ skills, classId, totalSp, weapon, coins, ammo, health, maxHealth, phase: game.phase }, row.restored, row.name);
    assert.deepEqual(input, row.checkpoint);
    assert.equal(game.offlineCheckpoint()!.protocolVersion, PROTOCOL);
    assert.equal(game.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
    assert.equal(game.fieldSurgery.hasTreatments, false);
    assert.equal(game.kitStatus('solo').calledOpening, undefined);
  }
});

test('the issued Volatile Spellwork edition rejects later skills, wrong versions and server records', () => {
  const checkpoint = issued.volatileBuilds[0].checkpoint;
  for (const item of Object.values(duelistIds)) {
    const forged = structuredClone(checkpoint);
    forged.player.skills.push(item);
    assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
  }
  for (const change of [
    { protocolVersion: 88 }, { protocolVersion: 90 }, { contentRevision: CONTENT_REVISION },
    { practiceOnly: false }, { serverOnly: true }, { players: [] }, { transactions: [] },
  ]) assert.throws(() => Game.restoreOffline({ ...checkpoint, ...change }), /versionMismatch/);
});

test('issued 89 preserves both HUD layouts, all three remaps and the full profile and Practice rosters', () => {
  assert.deepEqual(issued.profiles.map((entry: { layout: string }) => entry.layout), ['grouped', 'separate']);
  for (const { profile, parsed, history } of issued.profiles) {
    const restored = parseProfile(JSON.stringify(profile));
    assert.deepEqual(restored.settings, parsed.settings);
    assert.deepEqual(restored.controls, parsed.controls);
    assert.deepEqual(restored.runs, parsed.runs);
    assert.deepEqual(restored.runs.map(row => row.classId), implementedClassIds);
    assert.deepEqual(restored.legacyCampaigns, history);
    assert.equal(restored.contentRevision, CONTENT_REVISION);
    const wrong = history.map((row: { id: string }) => ({ ...row, id: 'wrong-' + row.id, protocol: 90 }));
    assert.deepEqual(practiceRecords({ getItem: () => JSON.stringify([...history, ...wrong]),
      setItem: () => assert.fail() }), history);
  }
});

test('Duelist extends all fifteen exact issued dictionaries', () => {
  assert.equal(Object.keys(issued.dictionaries).length, 15);
  const appended = new Set([...binding.addedLocaleKeys, ...measuredEdition.addedLocaleKeys, ...entranceEdition.addedLocaleKeys, ...lamentEdition.addedLocaleKeys, ...conductorEdition.addedLocaleKeys, ...hunterEdition.addedLocaleKeys, ...infiltratorEdition.addedLocaleKeys]);
  assert.equal(binding.addedLocaleKeys.length, 22);
  for (const [name, original] of Object.entries(issued.dictionaries)) {
    const { messages } = JSON.parse(readFileSync(new URL('../locales/' + name + '.json', import.meta.url), 'utf8'));
    for (const key of appended) assert(Object.hasOwn(messages, key), key);
    const older = Object.fromEntries(Object.entries(messages).filter(([key]) => !appended.has(key)));
    assert.equal(hash(JSON.stringify(older)), original, name);
  }
});
