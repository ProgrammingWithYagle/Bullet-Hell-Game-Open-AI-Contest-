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
import bulwarkFittings from './fixtures/tank-bulwark-issued80-bindings.json';
import lateBinding from './fixtures/tank-bastion-issued79-bindings.json';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { CONTENT_REVISION, PROTOCOL, implementedClassIds } from '../src/shared/protocol.ts';
import { bastionIds } from '../src/shared/tank-bastion.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import { validControls } from '../src/client/input-bindings.ts';
import binding from './fixtures/tank-bastion-issued78-bindings.json';

const bytes = readFileSync(new URL('./fixtures/tank-bastion-issued78.json', import.meta.url), 'utf8');
const issued = JSON.parse(bytes);
const sha = (value: string) => createHash('sha256').update(value).digest('hex');

test('exact issued 78 restores all 156 local ownership cases without changing the original', () => {
  assert.equal(PROTOCOL, 101);
  assert.equal(issued.protocol, 78);
  assert.equal(issued.contentRevision, binding.sourceRevision);
  assert.equal(issued.sourceCommit, binding.sourceCommit);
  assert.equal(sha(bytes.replaceAll('\r\n', '\n')), binding.normalizedFixtureSha256);
  assert(issued.capturedFromOriginalExecutableSource && issued.controlledLocalFixture && !issued.onlineProof);
  assert.equal(issued.issuedSpecializationIds.length, 75);
  assert.deepEqual(data.specializationSkills.slice(0, 75).map(s => s.id), issued.issuedSpecializationIds);
  assert.deepEqual(data.generalSkills.map(s => s.id), issued.issuedGeneralIds);
  assert.deepEqual(issued.classes.map((row: { classId: string }) => row.classId), implementedClassIds);
  assert.equal(issued.interceptionHybrids.length, 48);
  const checkpoints = [...issued.individual, ...issued.classes, ...issued.lineworker, ...issued.tankHybrids, ...issued.interceptionHybrids];
  assert.equal(checkpoints.length, binding.ownershipFixtures);
  for (const row of checkpoints) {
    const before = structuredClone(row.checkpoint);
    const game = Game.restoreOffline(before);
    const { classId, skills, weapon, ammo, coins, health, maxHealth, totalSp } = game.players.get('solo')!;
    assert.deepEqual({ classId, skills, weapon, ammo, coins, health, maxHealth, totalSp, phase: game.phase }, row.restored, row.name);
    const checkpoint = game.offlineCheckpoint()!;
    assert(checkpoint.practiceOnly);
    assert.equal(checkpoint.protocolVersion, PROTOCOL);
    assert.equal(checkpoint.contentRevision, CONTENT_REVISION);
    assert.deepEqual(before, row.checkpoint);
    assert.equal(game.classCues().length, 0);
  }
});

test('issued 78 retains all twelve local profile and history classes, both HUD layouts and three remaps', () => {
  assert.deepEqual(issued.profiles.map((p: { layout: string }) => p.layout), ['grouped', 'separate']);
  for (const { profile, parsed: expected, history } of issued.profiles) {
    const actual = parseProfile(JSON.stringify(profile));
    assert(validControls(actual.controls));
    assert.deepEqual(actual.controls, expected.controls);
    assert.deepEqual(actual.settings, expected.settings);
    assert.deepEqual(actual.runs, expected.runs);
    assert.deepEqual(actual.runs.map(run => run.classId), implementedClassIds);
    assert.deepEqual(actual.legacyCampaigns, history);
    assert(actual.practiceOnly && !actual.verified);
    assert.equal(actual.contentRevision, CONTENT_REVISION);

    const corrupt = history.flatMap((row: Record<string, unknown>) => [47, 77, 79].map(protocol =>
      ({ ...row, id: 'wrong-' + protocol + '-' + row.id, protocol })));
    const records = practiceRecords({
      getItem: () => JSON.stringify([...history, ...corrupt]),
      setItem: () => assert.fail('Read only'),
    });
    assert.deepEqual(records, history);
  }
});

test('the issued 78 boundary rejects new Bastion ownership, mismatched revisions and server envelopes', () => {
  const checkpoint = issued.interceptionHybrids[0].checkpoint;
  for (const id of Object.values(bastionIds)) {
    const forged = structuredClone(checkpoint);
    forged.player.skills.push(id);
    assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
  }
  for (const patch of [
    { protocolVersion: 79 }, { protocolVersion: 77 }, { protocolVersion: 47 }, { contentRevision: CONTENT_REVISION },
    { practiceOnly: false }, { serverOnly: true }, { players: [] },
  ]) assert.throws(() => Game.restoreOffline({ ...checkpoint, ...patch }), /versionMismatch/);
});

test('all fifteen issued 78 dictionaries retain their exact previous messages', () => {
  assert.equal(Object.keys(issued.localeHashes).length, 15);
  const added = new Set([...binding.addedLocaleKeys, ...lateBinding.addedLocaleKeys, ...bulwarkFittings.addedLocaleKeys,...formationEdition.addedLocaleKeys, ...bondEdition.addedLocaleKeys, ...cohortEdition.addedLocaleKeys, ...pursuitEdition.addedLocaleKeys, ...replyEdition.addedLocaleKeys, ...measuredEdition.addedLocaleKeys, ...entranceEdition.addedLocaleKeys, ...lamentEdition.addedLocaleKeys, ...conductorEdition.addedLocaleKeys, ...hunterEdition.addedLocaleKeys, ...infiltratorEdition.addedLocaleKeys, ...duelistEdition.addedLocaleKeys, ...volatileEdition.addedLocaleKeys, ...spatialEdition.addedLocaleKeys, ...mageEdition.addedLocaleKeys, ...preventiveEdition.addedLocaleKeys, ...responseEdition.addedLocaleKeys,...lateMedicEdition.addedLocaleKeys,...medicEdition.addedLocaleKeys,...interceptorFittings.addedLocaleKeys]);
  for (const [id, hash] of Object.entries(issued.localeHashes)) {
    const locale = JSON.parse(readFileSync(new URL('../locales/' + id + '.json', import.meta.url), 'utf8'));
    for (const key of added) assert(Object.hasOwn(locale.messages, key), id + ' ' + key);
    const projected = Object.fromEntries(Object.entries(locale.messages).filter(([key]) => !added.has(key)));
    assert.equal(sha(JSON.stringify(projected)), hash, id);
  }
});
