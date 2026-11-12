import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game, data } from '../src/shared/game.ts';
import { PROTOCOL, CONTENT_REVISION, implementedClassIds } from '../src/shared/protocol.ts';
import { freshProfile, parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
const issued = JSON.parse(
  fs.readFileSync(new URL('./fixtures/heavy-linework-issued73.json', import.meta.url), 'utf8'),
);
function restored(row: any) {
  assert.equal(row.checkpoint.protocolVersion, 73);
  assert.equal(row.checkpoint.contentRevision, issued.contentRevision);
  const original = structuredClone(row.checkpoint),
    g = Game.restoreOffline(original),
    p = g.players.get('solo')!;
  assert.equal(p.classId, row.classId);
  assert.deepEqual(p.skills, row.checkpoint.player.skills);
  assert.equal(p.ammo, row.actualIssued73Restored.ammo);
  assert.equal(p.coins, row.actualIssued73Restored.coins);
  assert.equal(p.weapon, row.actualIssued73Restored.weapon);
  assert.equal(p.totalSp, row.actualIssued73Restored.totalSp);
  assert.equal(p.health, row.actualIssued73Restored.health);
  assert.equal(p.maxHealth, row.actualIssued73Restored.maxHealth);
  assert.equal(g.phase, row.actualIssued73Restored.phase);
  assert(!p.skills.some((id) => id.startsWith('heavy-linework')));
  assert.equal(g.shots.size, 0);
  const output = g.offlineCheckpoint()!;
  assert.equal(output.protocolVersion, PROTOCOL);
  assert.equal(output.contentRevision, CONTENT_REVISION);
  assert.deepEqual(original, row.checkpoint, 'Import must not rewrite issued evidence');
  return g;
}
test('issued73 fixture is actual captured64-technique/fourGeneral authority, never a proposed Lineworker boundary', () => {
  assert.equal(issued.protocol, 73);
  assert.equal(
    issued.contentRevision,
    '9dc09a2d8243caf47ed6f3c9b1f4140814e24a7b482040d34538d0056c0cbce2',
  );
  assert.equal(
    issued.runtimeSourceSha256,
    'c213467e0877fce574552b98139e4171a71ad4430069102a880db46c65f86de8',
  );
  assert.equal(issued.issuedSpecializationIds.length, 64);
  assert.equal(issued.issuedGeneralIds.length, 4);
  assert.equal(issued.privateUserDataIncluded, false);
  assert.equal(issued.proposedCheckpointCreatedOrImported, false);
  assert.equal(issued.all64ActualIssuedTechniqueOwnerships.length, 64);
  assert.equal(PROTOCOL, 75);
});
for (const classId of implementedClassIds)
  test(
    'actual captured issued73 ' +
      classId +
      ' safe ownership restores locally without new techniques',
    () => {
      const row = issued.fixtures.find((r: any) => r.name === 'issued73-' + classId);
      assert(row);
      restored(row);
    },
  );
test('all nine actual issued73 Tethered carriage/handling combinations retain their exact purchased capstone and mobility', () => {
  const rows = issued.fixtures.filter((r: any) => r.name.startsWith('issued73-post-'));
  assert.equal(rows.length, 9);
  for (const row of rows) {
    const g = restored(row);
    assert(g.players.get('solo')!.skills.includes('heavy-traverse-lanyard-1'));
    assert.equal(g.players.get('solo')!.totalSp, 27);
  }
});
test('every one of the64issued techniques retains its actual affordable prerequisite ownership', () => {
  assert.deepEqual(
    new Set(issued.all64ActualIssuedTechniqueOwnerships.map((r: any) => r.id)),
    new Set(issued.issuedSpecializationIds),
  );
  for (const row of issued.all64ActualIssuedTechniqueOwnerships) {
    const g = restored(row);
    assert(g.players.get('solo')!.skills.includes(row.id));
    assert(g.players.get('solo')!.skills.reduce((n, id) => n + g.skillCost(id), 0) <= 27);
  }
});
for (const layout of ['grouped', 'separate'])
  test(
    'issued73 all12class profiles preserve ' + layout + 'HUD, remaps and exact local histories',
    () => {
      const p = issued.profiles.find((p: any) => p.layout === layout).profile,
        parsed = parseProfile(JSON.stringify(p));
      assert.equal(parsed.contentRevision, CONTENT_REVISION);
      const { technique3: _key, ...bindings } = parsed.controls.bindings;
      const { technique3: _button, ...gamepad } = parsed.controls.gamepad;
      assert.deepEqual({ ...parsed.controls, bindings, gamepad }, p.controls);
      for (const key of ['settings', 'runs', 'legacyCampaigns', 'mastery'])
        assert.deepEqual((parsed as any)[key], p[key]);
      assert.equal(parsed.practiceOnly, true);
      assert.equal(parsed.verified, false);
      assert.equal(parsed.runs.length, 12);
      assert.equal(parsed.legacyCampaigns.length, 12);
    },
  );
test('issued73 historical records require exact protocol73 across all12class rosters and stay local', () => {
  for (const classId of implementedClassIds) {
    const kept = issued.profiles[0].profile.legacyCampaigns.find((r: any) => r.classId === classId);
    assert(kept);
    const raw = [
      kept,
      ...[44, 45, 47, 53, 54, 69, 70, 71, 72, 74].map((protocol) => ({
        ...kept,
        id: 'wrong-' + protocol,
        protocol,
      })),
      { ...kept, id: 'online', verified: true },
      { ...kept, id: 'foreign', contentRevision: 'f'.repeat(64) },
    ];
    const result = practiceRecords({
      getItem: () => JSON.stringify(raw),
      setItem: () => assert.fail('History read cannot rewrite issued records'),
    });
    assert.deepEqual(result, [kept]);
  }
});
test('wrong or server authority envelopes cannot disguise themselves as issued73 ownership', () => {
  const saved = issued.fixtures.find((r: any) => r.classId === 'heavy').checkpoint;
  for (const patch of [
    { protocolVersion: 72 },
    { protocolVersion: 74 },
    { contentRevision: 'f'.repeat(64) },
    { practiceOnly: false },
    { serverOnly: true },
    { players: [] },
    { transactions: [] },
  ])
    assert.throws(
      () => Game.restoreOffline({ ...structuredClone(saved), ...patch }),
      /versionMismatch/,
    );
});
test('issued73 cannot claim any later canonical Lineworker technique through local migration', () => {
  for (const id of ['heavy-linework-1', 'heavy-linework-yoke-1', 'heavy-linework-sheave-1']) {
    const saved = structuredClone(
      issued.fixtures.find((r: any) => r.classId === 'heavy').checkpoint,
    );
    saved.player.skills.push(id);
    assert.throws(() => Game.restoreOffline(saved), /versionMismatch/);
  }
});
test('issued73 profile migration rejects online or invented discipline claims', () => {
  for (const p of issued.profiles.map((p: any) => p.profile)) {
    assert.throws(() => parseProfile(JSON.stringify({ ...p, verified: true })), /Profile/);
    assert.throws(() => parseProfile(JSON.stringify({ ...p, practiceOnly: false })), /Profile/);
    assert.throws(
      () => parseProfile(JSON.stringify({ ...p, contentRevision: 'f'.repeat(64) })),
      /Profile/,
    );
    const invented = structuredClone(p);
    invented.runs[0].classId = 'invented';
    assert.throws(() => parseProfile(JSON.stringify(invented)), /Profile/);
  }
});
test('actual current-edition purchases restore as local ownership without carrying a live anchor or online verification', () => {
  const g = new Game({ mode: 'short' }),
    p = g.addPlayer('solo', 'Controlled canonical ownership', 'heavy');
  for (const item of ['heavy-ordnance-1', 'heavy-linework-1'])
    assert(g.transact(p.id, { id: item, kind: 'skill', item }).ok);
  const save = g.offlineCheckpoint()!;
  assert.equal(save.protocolVersion, 75);
  assert.equal(save.contentRevision, CONTENT_REVISION);
  const restored = Game.restoreOffline(save),
    r = restored.players.get('solo')!;
  assert.deepEqual(r.skills, p.skills);
  assert.equal(restored.shots.size, 0);
  assert.equal(restored.kitStatus(r.id).lineworkUntil, 0);
  assert.equal(restored.kitStatus(r.id).lineworkRecovery, 0);
  const profile = freshProfile();
  assert.equal(profile.verified, false);
  assert.equal(profile.practiceOnly, true);
  assert.equal(data.specializationSkills.length, 68);
});
