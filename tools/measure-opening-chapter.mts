import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { CONTENT_REVISION, type ClassId, type BossId } from '../src/shared/protocol.ts';
const chapter = data.storyChapters[0],
  rows = [];
const upgradeCost = (id: string, n: number) => {
  const u = data.upgrades.find((u) => u.id === id)!;
  return n * u.basePrice + (u.priceStep * n * (n - 1)) / 2;
};
for (const difficulty of data.difficulties)
  for (const cl of data.classes)
    for (const index of [0, 2]) {
      const bossId = (index === 0 ? 'constable' : 'matron') as BossId;
      const coins = Math.floor(
        (chapter.economy.startingCoins + chapter.economy.coinsPerObjective * index) *
          difficulty.coins,
      );
      let best = { dps: 0, weapon: cl.weapon, damage: 0, rate: 0, spent: 0 };
      for (const weapon of data.weapons.filter((w) => w.classId === cl.id))
        for (let damage = 0; damage <= 5; damage++)
          for (let rate = 0; rate <= 5; rate++) {
            const spent =
              weapon.price + upgradeCost('damage', damage) + upgradeCost('fire-rate', rate);
            if (spent > coins) continue;
            const dps =
              (weapon.damage *
                (1 + 0.14 * damage) *
                weapon.pellets *
                (weapon.pellets > 1 ? 0.7 : 1) *
                weapon.magazine) /
              (weapon.magazine / (weapon.fireRate * (1 + 0.07 * rate)) + weapon.reloadTime);
            if (dps > best.dps) best = { dps, weapon: weapon.id, damage, rate, spent };
          }
      // Use the shared boss and actual shop/stat rules. This is a model, not a credited chapter clear.
      const game = new Game({
        mode: 'short',
        difficulty: difficulty.id,
        openingBossId: bossId,
        freePlay: { openingBossId: bossId, bossDeadlineMultiplier: 2 },
      });
      const p = game.addPlayer('model', 'Model', cl.id as ClassId);
      p.coins = coins;
      p.incomeGranted = coins;
      if (best.weapon !== p.weapon)
        assert(game.transact(p.id, { id: 'weapon', kind: 'weapon', item: best.weapon }).ok);
      for (const [kind, count] of [
        ['damage', best.damage],
        ['fire-rate', best.rate],
      ] as const)
        for (let n = 0; n < count; n++)
          assert(game.transact(p.id, { id: kind + n, kind: 'upgrade', item: kind }).ok);
      const stats = game.stats(p),
        weapon = data.weapons.find((w) => w.id === p.weapon)!;
      const dps =
        (weapon.damage *
          stats.damage *
          weapon.pellets *
          (weapon.pellets > 1 ? 0.7 : 1) *
          stats.magazine) /
        (stats.magazine / (weapon.fireRate * stats.fireRate) + weapon.reloadTime * stats.reload);
      assert(Math.abs(dps - best.dps) < 0.001);
      game.start();
      const budget = (game.boss.deadline - game.combatTick) / 30,
        estimated = game.boss.health / (dps * 0.65);
      rows.push({
        classId: cl.id,
        difficulty: difficulty.id,
        bossId,
        availableCoins: coins,
        spentCoins: best.spent,
        weapon: best.weapon,
        skillPoints: 0,
        preparedWeaponDamageEffects: 0,
        health: game.boss.health,
        deadlineSeconds: budget,
        estimatedSeconds: estimated,
        deadlineRatio: estimated / budget,
      });
    }
const report = {
  schemaVersion: 1,
  contentRevision: CONTENT_REVISION,
  kind: 'Analytical early-build feasibility, not human balance',
  assumptions: {
    attackUptime: 0.65,
    shotgunPelletHits: 0.7,
    bossClockMultiplier: 2,
    criticalHitsIncluded: false,
    classAbilitiesIncluded: false,
    ordinaryEnemyAndNestWorkIncluded: false,
    preparedFoundationsDoNotAddWeaponDamage: true,
    solo: true,
  },
  rows: rows.length,
  deadlineMisses: rows.filter((r) => r.deadlineRatio > 1).length,
  worst: rows.toSorted((a, b) => b.deadlineRatio - a.deadlineRatio).slice(0, 12),
  limits: [
    'Does not measure movement, cover, player survival, support actions, nest-clearing time or human accuracy.',
    'Requires choosing the shown affordable offensive purchase; other preparations can differ.',
    'Boss health, attack definitions, fixed grades and Original Campaign timers are unchanged.',
  ],
  passed: rows.every((r) => r.deadlineRatio <= 1),
};
fs.writeFileSync('reviews/opening-chapter-balance.json', JSON.stringify(report, null, 2) + '\n');
const fields = Object.keys(rows[0]);
fs.writeFileSync(
  'docs/balance/opening-chapter.csv',
  [
    fields.join(','),
    ...rows.map((row) => fields.map((field) => row[field as keyof typeof row]).join(',')),
  ].join('\n') + '\n',
);
console.log(
  JSON.stringify({
    passed: report.passed,
    rows: report.rows,
    deadlineMisses: report.deadlineMisses,
    worst: report.worst[0],
  }),
);
assert(report.passed, 'Early chapter loadouts need further timer/economy work');
