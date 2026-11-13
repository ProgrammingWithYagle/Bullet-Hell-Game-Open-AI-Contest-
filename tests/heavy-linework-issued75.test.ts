import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, data } from '../src/shared/game.ts';
import { CONTENT_REVISION, PROTOCOL, implementedClassIds } from '../src/shared/protocol.ts';
import { lineworkIds } from '../src/shared/heavy-linework.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import { validControls } from '../src/client/input-bindings.ts';

const issued = JSON.parse(
  readFileSync(new URL('./fixtures/heavy-linework-issued75.json', import.meta.url), 'utf8'),
);

test('exact edition 75 restores 68 issued techniques, twelve classes and six Lineworker builds', () => {
  assert.equal(issued.protocol, 75);
  assert.equal(
    issued.contentRevision,
    '912c760975a4e284f19941e658c3724a62a050012453f6b7f3905f539df45d3e',
  );
  assert.deepEqual(
    issued.issuedSpecializationIds,
    data.specializationSkills
      .filter((skill) => skill.id !== lineworkIds.guide)
      .map((skill) => skill.id),
  );
  assert.deepEqual(
    issued.issuedGeneralIds,
    data.generalSkills.map((skill) => skill.id),
  );
  assert.equal(issued.issuedGeneralIds.length, 4);
  assert.equal(issued.individual.length, 68);
  assert.deepEqual(
    issued.classes.map((row: { classId: string }) => row.classId),
    implementedClassIds,
  );
  assert.equal(issued.lineworker.length, 6);
  assert.equal(
    issued.lineworker.filter((row: { purchases: string[] }) =>
      row.purchases.includes(lineworkIds.reserve),
    ).length,
    3,
  );
  for (const row of [...issued.individual, ...issued.classes, ...issued.lineworker]) {
    const input = structuredClone(row.checkpoint);
    const game = Game.restoreOffline(input);
    const player = game.players.get('solo')!;
    const { classId, skills, weapon, ammo, coins, health, maxHealth, totalSp } = player;
    assert.deepEqual(
      { classId, skills, weapon, ammo, coins, health, maxHealth, totalSp, phase: game.phase },
      row.restored,
      row.name,
    );
    assert.equal(game.shots.size, 0);
    assert.equal(game.kitStatus(player.id).lineworkConnection, undefined);
    const checkpoint = game.offlineCheckpoint()!;
    assert(checkpoint.practiceOnly);
    assert.equal(checkpoint.protocolVersion, PROTOCOL);
    assert.equal(checkpoint.contentRevision, CONTENT_REVISION);
    assert.deepEqual(input, row.checkpoint);
  }
});

test('edition 75 profiles retain both HUD layouts, all three remaps and all twelve local records', () => {
  assert.deepEqual(
    issued.profiles.map((row: { layout: string }) => row.layout),
    ['grouped', 'separate'],
  );
  for (const row of issued.profiles) {
    const parsed = parseProfile(JSON.stringify(row.profile));
    assert(validControls(parsed.controls));
    assert.deepEqual(parsed.controls, row.parsed.controls);
    assert.deepEqual(parsed.settings, row.parsed.settings);
    assert.deepEqual(parsed.runs, row.parsed.runs);
    assert.deepEqual(parsed.legacyCampaigns, row.history);
    assert.deepEqual(
      parsed.runs.map((run) => run.classId),
      implementedClassIds,
    );
    assert.equal(parsed.contentRevision, CONTENT_REVISION);
    assert(parsed.practiceOnly && !parsed.verified);
  }
  const history = issued.profiles[0].history;
  const readHistory = (rows: unknown[]) =>
    practiceRecords({
      getItem: () => JSON.stringify(rows),
      setItem: () => assert.fail('Read only'),
    });
  assert.deepEqual(readHistory(history), history);
  for (const row of history) {
    assert.deepEqual(
      readHistory([
        row,
        ...[47, 74, 76].map((protocol) => ({ ...row, id: 'wrong-' + protocol, protocol })),
        { ...row, id: 'verified-' + row.id, verified: true },
      ]),
      [row],
    );
  }
});

test('edition 75 rejects a future guide, mismatched editions and server envelopes', () => {
  const issuedCheckpoint = issued.lineworker[0].checkpoint;
  const future = structuredClone(issuedCheckpoint);
  future.player.skills.push(lineworkIds.guide);
  assert.throws(() => Game.restoreOffline(future), /versionMismatch/);
  for (const patch of [
    { protocolVersion: 74 },
    { protocolVersion: 76 },
    { contentRevision: CONTENT_REVISION },
    { practiceOnly: false },
    { serverOnly: true },
    { players: [] },
  ])
    assert.throws(() => Game.restoreOffline({ ...issuedCheckpoint, ...patch }), /versionMismatch/);
});
