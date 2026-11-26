import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Game, data } from '../src/shared/game.ts';
import {
  CONTENT_REVISION,
  PROTOCOL,
  implementedClassIds,
  type BossId,
  type ModeId,
  type Contract,
} from '../src/shared/protocol.ts';
const output = process.argv[2];
if (!/^reviews\/balance\/[a-z0-9-]+\.json$/.test(output ?? '') || existsSync(output))
  throw Error('Choose a new reviews/balance JSON path');
const rows = [];
for (const boss of data.bosses) {
  const mode = data.modes.find((m) => m.id === (boss.secret ? 'long' : boss.route))!;
  assert(mode);
  for (const difficulty of data.difficulties)
    for (const players of [1, 8, 16, 50].filter((n) => n <= mode.maxPlayers))
      for (const brutal of [false, true]) {
        const g = new Game({
          seed: 161,
          mode: mode.id as ModeId,
          difficulty: difficulty.id,
          maxPlayers: mode.maxPlayers,
          openingBossId: boss.id as BossId,
          openingArenaId: boss.preferredArena,
        });
        const contract = Reflect.get(g, 'selectedContract') as Contract;
        contract.threat = boss.secret ? 11 : Math.max(boss.minThreat, mode.id === 'raid' ? 4 : 1);
        contract.variant = brutal ? 'brutal' : 'normal';
        for (let n = 0; n < players; n++)
          g.addPlayer('audit-' + n, 'Audit', implementedClassIds[n % implementedClassIds.length]);
        g.start();
        const expected =
          data.rules.bossHealthBase *
          data.rules.bossHealthThreatGrowth ** (Math.min(10, contract.threat) - 1) *
          (boss.timer / 120) *
          boss.healthFactor *
          (mode.id === 'raid' && !boss.secret ? 1.25 : 1) *
          difficulty.health *
          (1 + data.rules.bossHealthAdditionalPlayer * (players - 1)) *
          (brutal ? 2 : 1);
        assert(Math.abs(g.boss.maxHealth - expected) / expected < 1e-10, boss.id + ' health');
        assert.equal((g.boss.deadline - g.combatTick) / 30, boss.timer * (brutal ? 1.5 : 1));
        assert.equal(g.players.size, players);
        rows.push({
          boss: boss.id,
          mode: mode.id,
          difficulty: difficulty.id,
          players,
          variant: contract.variant,
          threat: g.boss.threat,
          authoredSeconds: boss.timer,
          deadlineSeconds: (g.boss.deadline - g.combatTick) / 30,
          actualHealth: g.boss.maxHealth,
          expectedHealth: expected,
          attackableFractionAssumption: boss.damageWindowFraction,
        });
      }
}
mkdirSync('reviews/balance', { recursive: true });
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const report = {
  createdAt: new Date().toISOString(),
  passed: true,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  bosses: 60,
  cases: rows.length,
  sourceFiles: ['src/shared/game.ts', 'tools/audit-boss-health.ts'].map((path) => ({
    path,
    sha256: sha(path),
  })),
  limits: [
    'Checks exact authored health/deadline math by actually deploying every boss in legal route-size cohorts.',
    'Base authored duration scales HP; the separate Brutal deadline extension never multiplies its already doubled HP again.',
    'No combat feasibility, attack uptime, player win-rate, human pacing, rendered or hosted capacity acceptance is claimed.',
  ],
  rows,
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
const columns = Object.keys(rows[0]) as (keyof (typeof rows)[number])[];
writeFileSync(
  output.replace(/\.json$/, '.csv'),
  [columns.join(','), ...rows.map((r) => columns.map((k) => r[k]).join(','))].join('\n') + '\n',
);
console.log(
  JSON.stringify({
    passed: true,
    bosses: 60,
    cases: rows.length,
    maximumHealth: Math.max(...rows.map((r) => r.actualHealth)),
  }),
);
