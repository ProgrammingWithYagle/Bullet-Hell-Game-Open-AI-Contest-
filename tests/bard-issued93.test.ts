import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { lamentIds } from '../src/shared/bard-lament.ts';
import { CONTENT_REVISION, PROTOCOL, implementedClassIds } from '../src/shared/protocol.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import binding from './fixtures/bard-issued93-bindings.json';

const raw = readFileSync(new URL('./fixtures/bard-issued93.json', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const issued = JSON.parse(raw);
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

test('issued 93 restores all 8,104 local ownership fixtures under protocol 94', () => {
  assert.equal(PROTOCOL, 94);
  assert.equal(issued.protocol, 93);
  assert.equal(issued.sourceCommit, binding.sourceCommit);
  assert.equal(issued.contentRevision, binding.sourceRevision);
  assert.equal(hash(raw), binding.fixtureSha256);
  assert(issued.controlledLocalFixture && !issued.onlineProof && !issued.privateRecordsRead);
  const original = data.specializationSkills.slice(0, 116);
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
  assert.equal(issued.duelistBuilds.length, 243);
  assert.equal(issued.infiltratorBuilds.length, 847);
  assert.equal(issued.markHunterBuilds.length, 2557);
  assert.equal(issued.conductorBuilds.length, 249);
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
    assert.equal(game.kitStatus('solo').lamenting, undefined);
  }
});

test('the issued Conductor edition rejects later skills, wrong versions and server records', () => {
  const checkpoint = issued.conductorBuilds[0].checkpoint;
  for (const item of Object.values(lamentIds)) {
    const forged = structuredClone(checkpoint);
    forged.player.skills.push(item);
    assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
  }
  for (const change of [
    { protocolVersion: 92 }, { protocolVersion: 94 }, { contentRevision: CONTENT_REVISION },
    { practiceOnly: false }, { serverOnly: true }, { players: [] }, { transactions: [] },
  ]) assert.throws(() => Game.restoreOffline({ ...checkpoint, ...change }), /versionMismatch/);
});

test('issued 93 preserves both HUD layouts, all three remaps and the full profile and Practice rosters', () => {
  assert.deepEqual(issued.profiles.map((entry: { layout: string }) => entry.layout), ['grouped', 'separate']);
  for (const { profile, parsed, history } of issued.profiles) {
    const restored = parseProfile(JSON.stringify(profile));
    assert.deepEqual(restored.settings, parsed.settings);
    assert.deepEqual(restored.controls, parsed.controls);
    assert.deepEqual(restored.runs, parsed.runs);
    assert.deepEqual(restored.runs.map(row => row.classId), implementedClassIds);
    assert.deepEqual(restored.legacyCampaigns, history);
    assert.equal(restored.contentRevision, CONTENT_REVISION);
    const wrong = history.map((row: { id: string }) => ({ ...row, id: 'wrong-' + row.id, protocol: 94 }));
    assert.deepEqual(practiceRecords({ getItem: () => JSON.stringify([...history, ...wrong]),
      setItem: () => assert.fail() }), history);
  }
});

test('Lament extends all fifteen exact issued dictionaries', () => {
  assert.equal(Object.keys(issued.dictionaries).length, 15);
  const appended = new Set(binding.addedLocaleKeys);
  assert.equal(appended.size, 19);
  for (const [name, original] of Object.entries(issued.dictionaries)) {
    const { messages } = JSON.parse(readFileSync(new URL('../locales/' + name + '.json', import.meta.url), 'utf8'));
    for (const key of appended) assert(Object.hasOwn(messages, key), key);
    const older = Object.fromEntries(Object.entries(messages).filter(([key]) => !appended.has(key)));
    assert.equal(hash(JSON.stringify(older)), original, name);
  }
});
