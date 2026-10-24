import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import items from '../assets/production/items/library.json' with { type: 'json' };
import historicMotion from '../assets/production/motion/encounter-library.json' with { type: 'json' };
import civicMotion from '../assets/production/motion/civic-library.json' with { type: 'json' };
import serviceMotion from '../assets/production/motion/service-library.json' with { type: 'json' };
import districtMotion from '../assets/production/motion/district-library.json' with { type: 'json' };
import raidMotion from '../assets/production/motion/raid-library.json' with { type: 'json' };
const motion = {
  entries: [
    ...historicMotion.entries,
    ...civicMotion.entries,
    ...serviceMotion.entries,
    ...districtMotion.entries,
    ...raidMotion.entries,
  ],
};
import music from '../assets/production/audio/boss-themes/library.json' with { type: 'json' };
import { data, implementedBossIds } from '../src/shared/game.ts';
import { implementedClassIds } from '../src/shared/protocol.ts';
import { musicIdentity, bossThemes } from '../src/client/boss-music.ts';

test('illustrations cover every playable weapon, supply, specialization path and mutation without generic substitutions', () => {
  const actual = (kind: string) =>
    items.entries
      .filter((e) => e.itemKind === kind)
      .map((e) => e.itemId)
      .sort();
  assert.deepEqual(
    actual('weapon'),
    data.weapons
      .filter((w) => implementedClassIds.some((c) => c === w.classId))
      .map((w) => w.id)
      .sort(),
  );
  assert.deepEqual(actual('supply'), data.supplies.map((s) => s.id).sort());
  assert.deepEqual(actual('mutation'), data.mutations.map((m) => m.id).sort());
  const skills = data.skills.filter((s) => implementedClassIds.some((c) => c === s.classId));
  assert.equal(skills.length, 378);
  assert.deepEqual(actual('skill'), [...new Set(skills.map((s) => s.subbranchId))].sort());
  assert.equal(items.entries.length, 123);
  assert.equal(new Set(items.entries.map((e) => e.atlasSha256)).size, 123);
  for (const entry of items.entries) {
    const bytes = readFileSync(entry.atlas);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.atlasSha256);
    assert.equal(bytes.readUInt32BE(16), 256);
    assert.equal(bytes.readUInt32BE(20), 256);
    assert.equal(bytes[25], 6, 'PNG must preserve RGBA');
  }
});
test('fifty-four drawn boss/part/minion action atlases retain 432 distinct frames, common action scale and exact source hashes', () => {
  assert.equal(motion.entries.length, 54);
  assert.equal(
    motion.entries.reduce((sum, e) => sum + e.frames, 0),
    432,
  );
  for (const id of implementedBossIds.filter((id) => id !== 'constable' && id !== 'lantern-warden'))
    assert(
      motion.entries.some((e) => e.bossId === id),
      id + ' lacks a drawn action atlas',
    );
  for (const entry of motion.entries) {
    assert.equal(
      createHash('sha256').update(readFileSync(entry.source)).digest('hex'),
      entry.sourceSha256,
    );
    const bytes = readFileSync(entry.atlas);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.atlasSha256);
    assert.equal(bytes.readUInt32BE(16), entry.columns * entry.cellSize);
    assert.equal(bytes.readUInt32BE(20), entry.cellSize * 2);
    assert(entry.origin[0] === 0.5 && entry.origin[1] > 0);
    assert(entry.displayCell > 0);
  }
});
test('each playable boss selects its own complete original theme and intermission returns to city music', () => {
  assert.deepEqual(Object.keys(bossThemes).sort(), [...implementedBossIds].sort());
  assert.equal(
    new Set(implementedBossIds.map((b) => musicIdentity(true, b))).size,
    implementedBossIds.length,
  );
  assert.equal(musicIdentity(false, 'ratcatcher'), 'city-wake');
  assert.equal(music.tracks.length, implementedBossIds.length);
  for (const boss of implementedBossIds) {
    const track = music.tracks.find((t) => t.bossId === boss)!;
    assert(track);
    assert.equal(track.id, musicIdentity(true, boss));
    const bytes = readFileSync(track.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), track.sha256);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
    assert.equal(track.clippedSamples, 0);
    assert(track.durationSeconds > 25);
    assert.equal(track.loopEndFrameExclusive, track.frames);
    assert(track.score.length > 80 && track.score.some((e) => e.bus === 'lead'));
  }
});
