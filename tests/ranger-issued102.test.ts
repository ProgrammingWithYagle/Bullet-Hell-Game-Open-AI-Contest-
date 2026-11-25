import reactionEdition from './fixtures/alchemist-issued104-bindings.json';
import fieldEdition from './fixtures/ranger-issued103-bindings.json';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { rangerTrackerIds } from '../src/shared/ranger-tracker.ts';
import { CONTENT_REVISION, PROTOCOL, implementedClassIds } from '../src/shared/protocol.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import binding from './fixtures/ranger-issued102-bindings.json';

const packed = readFileSync(new URL('./fixtures/ranger-issued102.json.gz', import.meta.url));
const raw = gunzipSync(packed);
const issued = JSON.parse(raw.toString('utf8'));
const hash = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

test('issued 102 restores all 19,534 local ownership fixtures under the current edition', () => {
  assert.equal(PROTOCOL, 105);
  assert.equal(issued.protocol, 102);
  assert.equal(issued.sourceCommit, binding.sourceCommit);
  assert.equal(issued.contentRevision, binding.sourceRevision);
  assert.equal(hash(raw), binding.fixtureSha256);
  assert.equal(hash(packed), binding.gzipSha256);
  assert.equal(raw.length, binding.rawBytes);
  assert.equal(packed.length, binding.gzipBytes);
  assert(issued.controlledLocalFixture && !issued.onlineProof && !issued.privateRecordsRead);
  const original = data.specializationSkills.slice(0, 143);
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
  assert.equal(issued.lamentBuilds.length, 841);
  assert.equal(issued.misdirectionBuilds.length, 2557);
  assert.equal(issued.measuredBuilds.length, 249);
  assert.equal(issued.counterstrokeBuilds.length, 841);
  assert.equal(issued.pursuitBuilds.length, 2557);
  assert.equal(issued.cohortBuilds.length, 249);
  assert.equal(issued.bondBuilds.length, 894);
  assert.equal(issued.formationBuilds.length, 2972);
  assert.equal(issued.sightBuilds.length, 243);
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
    assert.equal(game.kitStatus('solo').rangerTracker, undefined);
    if (skills.includes('ranger-sight-draw-1')) assert(game.kitStatus('solo').rangerSight);
    if (skills.includes('summoner-set-the-line-1')) assert(game.kitStatus('solo').formation);
    if (skills.includes('summoner-mending-bond-1')) assert(game.kitStatus('solo').bond);
    if (skills.includes('summoner-cohort-drive-1')) assert(game.kitStatus('solo').cohort);
    if (skills.includes('swordsman-passing-cut-1')) assert(game.kitStatus('solo').pursuit);
    if (skills.includes('swordsman-drawn-reply-1')) assert(game.kitStatus('solo').counterstroke);
    if (skills.includes('swordsman-held-edge-1')) assert(game.kitStatus('solo').measuredStance);
  }
});

test('the issued Ranger Marksman edition rejects later skills, wrong versions and server records', () => {
  const checkpoint = issued.classes.find((row: { restored: { classId: string } }) => row.restored.classId === 'ranger').checkpoint;
  for (const item of Object.values(rangerTrackerIds)) {
    const forged = structuredClone(checkpoint);
    forged.player.skills.push(item);
    assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
  }
  for (const change of [
    { protocolVersion: 101 }, { protocolVersion: 103 }, { contentRevision: CONTENT_REVISION },
    { practiceOnly: false }, { serverOnly: true }, { players: [] }, { transactions: [] },
  ]) assert.throws(() => Game.restoreOffline({ ...checkpoint, ...change }), /versionMismatch/);
});

test('issued 102 preserves both HUD layouts, all three remaps and the full profile and Practice rosters', () => {
  assert.deepEqual(issued.profiles.map((entry: { layout: string }) => entry.layout), ['grouped', 'separate']);
  for (const { profile, parsed, history } of issued.profiles) {
    const restored = parseProfile(JSON.stringify(profile));
    assert.deepEqual(restored.settings, parsed.settings);
    assert.deepEqual(restored.controls, parsed.controls);
    assert.deepEqual(restored.runs, parsed.runs);
    assert.deepEqual(restored.runs.map(row => row.classId), implementedClassIds);
    assert.deepEqual(restored.legacyCampaigns, history);
    assert.equal(restored.contentRevision, CONTENT_REVISION);
    const wrong = history.map((row: { id: string }) => ({ ...row, id: 'wrong-' + row.id, protocol: 103 }));
    assert.deepEqual(practiceRecords({ getItem: () => JSON.stringify([...history, ...wrong]),
      setItem: () => assert.fail() }), history);
  }
});

test('Ranger Tracker extends all fifteen exact issued dictionaries', () => {
  assert.equal(Object.keys(issued.dictionaries).length, 15);
  const appended = new Set([...binding.addedLocaleKeys, ...reactionEdition.addedLocaleKeys, ...fieldEdition.addedLocaleKeys]);
  assert.equal(binding.addedLocaleKeys.length, 23);
  for (const [name, original] of Object.entries(issued.dictionaries)) {
    const { messages } = JSON.parse(readFileSync(new URL('../locales/' + name + '.json', import.meta.url), 'utf8'));
    for (const key of appended) assert(Object.hasOwn(messages, key), key);
    const older = Object.fromEntries(Object.entries(messages).filter(([key]) => !appended.has(key)));
    assert.equal(hash(JSON.stringify(older)), original, name);
  }
});
