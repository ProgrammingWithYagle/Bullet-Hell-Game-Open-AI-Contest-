import { threatHealth } from '../src/shared/boss-threat.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { progressionMatrix } from '../tools/progression-matrix.ts';
import { Game, data } from '../src/shared/game.ts';
import { type BossId } from '../src/shared/protocol.ts';
test('all 168 timed class/mode/difficulty and 42 Endless combinations preserve legal power, saves and personal progress', () => {
  const rows = progressionMatrix();
  assert.equal(rows.filter((r) => r.campaign).length, 168);
  assert.equal(rows.filter((r) => !r.campaign).length, 42);
  assert(rows.every((r) => r.finalSp === 27 && r.capstones <= 1));
});
test('runtime opening health matches the independently published authored uptime-model rows', () => {
  const lines = readFileSync(new URL('../docs/balance/uptime-model.csv', import.meta.url), 'utf8')
      .trim()
      .split(/\r?\n/),
    headers = lines.shift()!.split(',');
  let checked = 0;
  for (const line of lines) {
    const v = line.split(','),
      r = Object.fromEntries(headers.map((k, i) => [k, v[i]]));
    if (r.fight !== '1' || r.classId !== 'soldier') continue;
    const g = new Game({
      mode: r.mode as 'short',
      difficulty: r.difficulty,
      openingBossId: r.boss as BossId,
      maxPlayers: 1,
    });
    g.addPlayer('solo', 'Health fixture', 'soldier');
    g.start();
    assert(
      Math.abs(g.boss.maxHealth - Number(r.bossHealth)) < 0.011,
      `${r.mode}/${r.difficulty}/${r.boss}: ${g.boss.maxHealth} vs ${r.bossHealth}`,
    );
    checked++;
  }
  assert(checked >= 100);
});
test('every boss uses its authored base duration, with Brutal HP/deadline and Raid/secret scaling kept independent', () => {
  const fixture = (id: BossId, brutal = false, mode: 'short' | 'raid' = 'short') => {
    const g = new Game({ openingBossId: id, mode, maxPlayers: 1 });
    g.addPlayer('solo', 'Health fixture', 'soldier');
    const save = g.offlineCheckpoint()!;
    save.selectedContract.variant = brutal ? 'brutal' : 'normal';
    const run = Game.restoreOffline(save);
    run.start();
    return run;
  };
  assert(Math.abs(fixture('constable').boss.maxHealth - 1944) < 1e-9);
  assert(Math.abs(fixture('courier').boss.maxHealth - 850.5) < 1e-9);
  for (const b of data.bosses) {
    const normal = fixture(b.id as BossId),
      brutal = fixture(b.id as BossId, true);
    const expected = 1800 * threatHealth(b.id) * (b.timer / 120) * b.healthFactor;
    assert(Math.abs(normal.boss.maxHealth - expected) < 1e-7, b.id);
    assert(Math.abs(brutal.boss.maxHealth / normal.boss.maxHealth - 2) < 1e-9, b.id + ' Brutal HP');
    assert.equal(brutal.boss.deadline, normal.boss.deadline * 1.5, b.id + ' Brutal duration');
  }
  const raid = fixture('chain-colossus', false, 'raid');
  const raidExpected =
    1800 *
    threatHealth('chain-colossus') *
    (data.bosses.find((b) => b.id === 'chain-colossus')!.timer / 120) *
    data.bosses.find((b) => b.id === 'chain-colossus')!.healthFactor *
    1.25;
  assert(Math.abs(raid.boss.maxHealth - raidExpected) < 1e-7);
  assert.equal(
    fixture('uncounted', false, 'raid').boss.maxHealth,
    fixture('uncounted').boss.maxHealth,
  );
});
