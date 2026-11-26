import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { fixture } from './game-fixture02.mts';
import { openId } from './handling-candidate01.mts';
const stage = path.dirname(fileURLToPath(import.meta.url));
const report: any = { checkedAt: new Date().toISOString(), registered: false, canonicalFilesWritten: false, onlineProof: false, countsAs2093Tests: false, controlledProposedOwnershipOnly: true, binding: JSON.parse(fs.readFileSync(stage + '/game-study02-binding.json', 'utf8')), rows: [] };
try {
  for (const mode of ['loose', 'spade', 'floating'] as const) for (const handling of [undefined, openId]) {
    const f = fixture(mode, handling);
    const target = f.g.spawnMinion({ kind: 'ordinary', x: 400, y: 600 + 190 / 30, health: 5, speed: 0, radius: 16, damage: 0 });
    assert(target);
    f.step({ technique1: true });
    f.step({ technique2: true, fire: true, moveY: 1, aim: Math.PI });
    const emission = f.shots.find(s => s.admittedAt === 2);
    while (f.g.combatTick < 18) f.step({ moveY: 1 });
    assert(f.p.y > 700);
    assert.deepEqual(f.special().map(s => s.admittedAt), [1]);
    if (handling) {
      assert.equal(target.health, 0);
      assert.equal(f.conversions.length, 1);
      assert.equal(f.p.ammo, 43);
      assert(emission && emission.vx < 0);
      assert.equal(f.status().heavyClutchConverted, 1);
    } else {
      assert.equal(target.health, 5);
      assert.equal(f.conversions.length, 0);
      assert.equal(f.p.ammo, 44);
      assert.equal(emission, undefined);
    }
    assert.equal(f.status().technique1At, 241);
    report.rows.push({ mode, handling: handling ?? 'issued Clutch', actualTimeGate: 18, sameTriggerAt: 2, actualTargetRemainingHealth: target.health, actualOwnerY: f.p.y, actualAmmoSpent: 45 - f.p.ammo, actualConversionCount: f.conversions.length, actualCslots: [1], originalRecovery: 241 });
  }
  report.passed = true;
} catch (e: any) { report.passed = false; report.error = e.stack; }
report.limits = 'A controlled low-health off-bearing target and identical single primary trigger demonstrate immediate tactical access while walking, not a build ranking or final balance. The earlier value report preserves the lower total damage and forfeited future C opportunity.';
fs.writeFileSync(path.resolve(stage, '../../outputs/Heavy-clutch-handling-game-tactical01.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
