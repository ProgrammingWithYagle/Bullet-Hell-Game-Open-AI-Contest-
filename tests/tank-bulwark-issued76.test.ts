import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, data } from '../src/shared/game.ts';
import { CONTENT_REVISION, PROTOCOL, implementedClassIds } from '../src/shared/protocol.ts';
import { lineworkIds } from '../src/shared/heavy-linework.ts';
import {bulwarkIds} from '../src/shared/tank-bulwark.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import { validControls } from '../src/client/input-bindings.ts';

const issued = JSON.parse(
  readFileSync(new URL('./fixtures/tank-bulwark-issued76.json', import.meta.url), 'utf8'),
);

test('exact edition 76 restores 69 issued techniques, twelve classes and nine Lineworker builds', () => {
  assert.equal(issued.protocol, 76);
  assert.equal(
    issued.contentRevision,
    '345593d5c0275ad0d5c4a794e08cc1e7d7646e8ae8c597644d47f40540376848',
  );
  assert.deepEqual(
    issued.issuedSpecializationIds,
    data.specializationSkills
      .filter((skill) => issued.issuedSpecializationIds.includes(skill.id))
      .map((skill) => skill.id),
  );
  assert.deepEqual(
    issued.issuedGeneralIds,
    data.generalSkills.map((skill) => skill.id),
  );
  assert.equal(issued.issuedGeneralIds.length, 4);
  assert.equal(issued.individual.length, 69);
  assert.deepEqual(
    issued.classes.map((row: { classId: string }) => row.classId),
    implementedClassIds,
  );
  assert.equal(issued.lineworker.length, 9);
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

test('edition 76 profiles retain both HUD layouts, all three remaps and all twelve local records', () => {
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
        ...[47, 75, 77].map((protocol) => ({ ...row, id: 'wrong-' + protocol, protocol })),
        { ...row, id: 'verified-' + row.id, verified: true },
      ]),
      [row],
    );
  }
});

test('edition 76 rejects future Tank ownership, mismatched editions and server envelopes', () => {
  const issuedCheckpoint = issued.lineworker[0].checkpoint;
  const future = structuredClone(issuedCheckpoint);
  future.player.skills.push(bulwarkIds.entry);
  assert.throws(() => Game.restoreOffline(future), /versionMismatch/);
  for (const patch of [
    { protocolVersion: 75 },
    { protocolVersion: 77 },
    { contentRevision: CONTENT_REVISION },
    { practiceOnly: false },
    { serverOnly: true },
    { players: [] },
  ])
    assert.throws(() => Game.restoreOffline({ ...issuedCheckpoint, ...patch }), /versionMismatch/);
});

for(const handling of ['none','pivot','port'] as const)test('actual current-edition Tank '+handling+' purchases restore only local ownership with no invented live shield',()=>{
  const game=new Game({mode:'endless',seed:41});game.encounter=9;const player=game.addPlayer('solo','Controlled current Tank restore','tank');
  const ids=['tank-protection-1',bulwarkIds.entry,...(handling==='none'?[]:[bulwarkIds[handling]])];
  for(const item of ids)assert(game.transact(player.id,{id:item,kind:'skill',item}).ok);
  const checkpoint=game.offlineCheckpoint()!;assert(checkpoint.practiceOnly);assert.equal(checkpoint.protocolVersion,PROTOCOL);assert.equal(checkpoint.contentRevision,CONTENT_REVISION);
  const restored=Game.restoreOffline(structuredClone(checkpoint)),owner=restored.players.get('solo')!;
  assert.deepEqual(owner.skills,ids);assert.equal(restored.classCues().length,0);assert.equal(restored.shots.size,0);
  assert.equal(restored.kitStatus(owner.id).bulwarkCarried,false);assert.deepEqual(restored.kitStatus(owner.id).bulwarkPanelIds,[]);
  assert.equal(restored.kitStatus(owner.id).bulwarkPortPhase,'closed');assert(restored.offlineCheckpoint()!.practiceOnly);
});
