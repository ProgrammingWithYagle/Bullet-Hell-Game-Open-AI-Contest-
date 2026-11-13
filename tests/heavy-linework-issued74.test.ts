import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, data } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { restRaidInput, type ObservedRestShot } from './helpers/sniper-rest-raid-policy.ts';
import { CONTENT_REVISION, PROTOCOL, idleInput, implementedClassIds } from '../src/shared/protocol.ts';
import { lineworkIds } from '../src/shared/heavy-linework.ts';
import { parseProfile } from '../src/client/profile.ts';
import { practiceRecords } from '../src/client/progress.ts';
import {
  defaultControls,
  migrateMobilityControls,
  validControls,
} from '../src/client/input-bindings.ts';

const issued = JSON.parse(
  readFileSync(new URL('./fixtures/heavy-linework-issued74.json', import.meta.url), 'utf8'),
);

test('exact edition 74 preserves all 67 issued technique restores, twelve classes and three Lineworker configurations', () => {
  assert.equal(issued.protocol, 74);
  assert.equal(
    issued.contentRevision,
    'a7874267d15e45143a83ac286f78a3a2c79c0964bea0b033fff3f86915c9f0d1',
  );
  assert.deepEqual(
    issued.issuedSpecializationIds,
    data.specializationSkills
      .filter((skill) => skill.id !== lineworkIds.reserve && skill.id !== lineworkIds.guide)
      .map((skill) => skill.id),
  );
  assert.deepEqual(
    issued.issuedGeneralIds,
    data.generalSkills.map((skill) => skill.id),
  );
  assert.equal(issued.individual.length, 67);
  assert.equal(issued.classes.length, 12);
  assert.equal(issued.lineworker.length, 3);
  assert.equal(PROTOCOL, 76);
  for (const row of [...issued.individual, ...issued.classes, ...issued.lineworker]) {
    const input = structuredClone(row.checkpoint);
    const g = Game.restoreOffline(input),
      p = g.players.get('solo')!;
    const current = {
      classId: p.classId,
      skills: p.skills,
      weapon: p.weapon,
      ammo: p.ammo,
      coins: p.coins,
      health: p.health,
      maxHealth: p.maxHealth,
      totalSp: p.totalSp,
      phase: g.phase,
    };
    assert.deepEqual(current, row.restored, row.name);
    assert.equal(g.shots.size, 0);
    assert.equal(g.kitStatus(p.id).lineworkConnection, undefined);
    assert.equal(g.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
    assert.deepEqual(input, row.checkpoint);
  }
});

test('issued profile migration retains both layouts and all legacy keys, then picks an unused reserve binding', () => {
  for (const row of issued.profiles) {
    const parsed = parseProfile(JSON.stringify(row.profile));
    const { technique3: addedKey, ...bindings } = parsed.controls.bindings;
    const { technique3: addedPad, ...gamepad } = parsed.controls.gamepad;
    assert.deepEqual(bindings, row.parsed.controls.bindings);
    assert.deepEqual(gamepad, row.parsed.controls.gamepad);
    assert(!Object.values(bindings).flat().includes(addedKey[0]));
    assert(!Object.values(gamepad).includes(addedPad));
    assert(validControls(parsed.controls));
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
  const legacy = structuredClone(issued.profiles[0].profile.controls);
  legacy.bindings.technique2[0] = defaultControls().bindings.technique3[0];
  const migrated = migrateMobilityControls(legacy);
  assert(validControls(migrated));
  assert.deepEqual(migrated.bindings.technique2, legacy.bindings.technique2);
  assert.notEqual(migrated.bindings.technique3[0], legacy.bindings.technique2[0]);
});

test('all twelve issued history records require exact protocol 74 and stay local', () => {
  const old = issued.profiles[0].history;
  const readHistory = (rows: unknown[]) =>
    practiceRecords({
      getItem: () => JSON.stringify(rows),
      setItem: () => assert.fail('Read only'),
    });
  assert.deepEqual(readHistory(old), old);
  for (const r of old) {
    const variants = [
      r,
      ...[47, 73, 75].map((protocol) => ({ ...r, id: 'wrong-' + protocol, protocol })),
      { ...r, id: 'verified-' + r.id, verified: true },
    ];
    assert.deepEqual(readHistory(variants), [r]);
  }
});

test('issued 74 cannot claim Reserve Anchor or a server envelope', () => {
  const issuedCheckpoint = issued.lineworker[0].checkpoint;
  const future = structuredClone(issuedCheckpoint);
  future.player.skills.push(lineworkIds.reserve);
  assert.throws(() => Game.restoreOffline(future), /versionMismatch/);
  for (const patch of [
    { protocolVersion: 73 },
    { protocolVersion: 75 },
    { practiceOnly: false },
    { serverOnly: true },
    { players: [] },
  ])
    assert.throws(() => Game.restoreOffline({ ...issuedCheckpoint, ...patch }), /versionMismatch/);
});

test('a real current reserve purchase restores ownership without a transient anchor or new record authority', () => {
  const g = new Game({ mode: 'short', difficulty: 'baby', seed: 41, openingArenaId: 'gatehouse', arenaSelection: 'fixed' });
  const p = g.addPlayer('solo', 'Earned Reserve Anchor save', 'heavy');
  let serial = 0, sequence = 0, equippedAfterClear = false;
  const buy = (kind: 'skill' | 'weapon' | 'upgrade' | 'supply', item: string) =>
    g.transact(p.id, { kind, item, id: 'earned-save-' + ++serial }).ok;
  const equip = () => {
    for (const weapon of data.weapons.filter(weapon => weapon.classId === 'heavy').sort((a, b) => b.tier - a.tier))
      if (p.weapon === weapon.id || buy('weapon', weapon.id)) break;
    for (const item of ['damage', 'health', 'fire-rate', 'reload', 'magazine']) buy('upgrade', item);
    buy('supply', 'medkit');
  };
  assert.equal(p.totalSp, 3);
  for (const item of ['heavy-ordnance-1', lineworkIds.entry]) assert(buy('skill', item));
  equip();
  assert(g.start());
  const observed = new Map<number, ObservedRestShot>();
  while (g.tick < 15_000 && g.phase !== 'defeat' && !(g.phase === 'shop' && g.encounter === 2)) {
    if (g.phase === 'combat') {
      const view = viewOf(g, p.id);
      assert(g.submitInput(p.id, { ...idleInput(), ...restRaidInput(view, view.players[0], [...observed.values()]),
        sequence: ++sequence, clientTick: g.combatTick }));
    } else if (g.phase === 'mutationVote' || g.phase === 'contractVote') g.vote(p.id, 0);
    else if (g.phase === 'shop' && g.encounter === 1 && !equippedAfterClear) {
      assert.equal(p.totalSp, 9);
      equip();
      equippedAfterClear = true;
    }
    g.step();
    for (const event of g.drainEvents()) {
      if (event.type === 'shots') for (const shot of event.shots) observed.set(shot.id, { ...shot, seenAt: g.combatTick });
      if (event.type === 'remove') for (const id of event.ids) observed.delete(id);
    }
  }
  assert.equal(g.phase, 'shop');
  assert.equal(g.encounter, 2);
  assert.equal(p.progress.clears, 2);
  assert.equal(p.totalSp, 15);
  assert(buy('skill', lineworkIds.reserve));
  const checkpoint = g.offlineCheckpoint()!;
  assert.equal(checkpoint.protocolVersion, 76);
  assert(checkpoint.practiceOnly);
  const restored = Game.restoreOffline(checkpoint),
    player = restored.players.get('solo')!;
  assert.deepEqual(player.skills, p.skills);
  assert.equal(restored.shots.size, 0);
  assert.equal(restored.kitStatus(player.id).lineworkConnection, undefined);
});
