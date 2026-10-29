// Progression smoke with deliberate boss defeats and accelerated intermissions.
// Exercises real authority transactions/save validation; does not measure player combat balance.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Game, data } from '../src/shared/game.ts';
import { bossDefeatRemaining } from '../src/shared/boss-defeat-flow.ts';
import {
  CONTENT_REVISION,
  PROTOCOL,
  implementedClassIds,
  type Command,
  type ModeId,
} from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { recordProfileView, loadProfile, summary } from '../src/client/profile.ts';
export function progressionMatrix() {
  const rows: {
    mode: ModeId;
    classId: string;
    difficulty: string;
    clears: number;
    restoredBoundaries: number;
    purchases: number;
    finalSp: number;
    capstones: number;
    incomeGranted: number;
    campaign: boolean;
    hardUnlock: boolean;
    profileXp: number;
  }[] = [];
  let serial = 0;
  for (const mode of data.modes)
    for (const classId of implementedClassIds)
      for (const difficulty of data.difficulties) {
        let g = new Game({
          mode: mode.id as ModeId,
          seed: 173,
          runId: `matrix-${mode.id}-${classId}-${difficulty.id}`,
          difficulty: difficulty.id,
          maxPlayers: 1,
        });
        g.addPlayer('solo', 'Matrix', classId);
        const cl = data.classes.find((c) => c.id === classId)!;
        const map = new Map<string, string>(),
          store = {
            getItem: (k: string) => map.get(k) ?? null,
            setItem: (k: string, v: string) => {
              map.set(k, v);
            },
          };
        let purchases = 0,
          boundaries = 0;
        const build = () => {
          const p = g.players.get('solo')!;
          const buy = (kind: Command['kind'], item: string) => {
            const command = { id: 'matrix-' + ++serial, kind, item },
              result = g.transact('solo', command);
            assert.deepEqual(
              g.transact('solo', command),
              result,
              'Transaction retry must not double-charge',
            );
            if (result.ok) purchases++;
            assert(p.coins >= 0);
            return result.ok;
          };
          const path = cl.branches[0].subbranches[0].id;
          for (const skill of data.skills
            .filter((s) => s.classId === classId && s.subbranchId === path)
            .sort((a, b) => a.depth - b.depth)) {
            if (!p.skills.includes(skill.id) && !buy('skill', skill.id)) break;
          }
          for (const weapon of data.weapons
            .filter((w) => w.classId === classId)
            .sort((a, b) => b.tier - a.tier))
            if (
              weapon.tier > data.weapons.find((w) => w.id === p.weapon)!.tier &&
              buy('weapon', weapon.id)
            )
              break;
          for (const upgrade of data.upgrades) {
            for (let level = p.upgrades[upgrade.id] ?? 0; level < upgrade.maximum; level++)
              if (!buy('upgrade', upgrade.id)) break;
          }
          const spent = p.skills.reduce(
            (n, id) => n + data.skills.find((s) => s.id === id)!.cost,
            0,
          );
          assert(spent <= p.totalSp);
          assert(
            p.skills.filter((id) => data.skills.find((s) => s.id === id)!.capstone).length <= 1,
          );
        };
        build();
        g.start();
        const length = mode.encounters ?? 24;
        for (let fight = 0; fight < length; fight++) {
          assert.equal(g.phase, 'combat');
          const p = g.players.get('solo')!;
          assert.equal(p.progress.firstEncounter, 0);
          assert.equal(p.progress.clears, fight);
          assert.equal(p.classId, classId);
          assert(Number.isFinite(g.boss.maxHealth) && g.boss.maxHealth > 0);
          assert(g.boss.deadline > g.combatTick);
          // Defeat fixture: progression and persistence only, never a combat win-rate claim.
          g.boss.health = 0;
          g.step();
          recordProfileView(viewOf(g, 'solo'), 'solo', store);
          assert.equal(p.progress.clears, fight + 1);
          if (fight + 1 === length) break;
          const checkpoint = g.offlineCheckpoint();
          assert(checkpoint);
          const restored = Game.restoreOffline(checkpoint);
          boundaries++;
          assert.deepEqual(restored.players.get('solo')!.progress, p.progress);
          assert.deepEqual(restored.players.get('solo')!.skills, p.skills);
          assert.equal(restored.players.get('solo')!.coins, p.coins);
          assert.equal(restored.settings.runId, g.settings.runId);
          g = restored;
          for (let remaining = bossDefeatRemaining(g.boss, g.tick); remaining > 0; remaining--) g.step();
          let phases = 0;
          while (g.phase !== 'combat') {
            assert(++phases <= 4, 'Finite intermission progression');
            if (g.phase === 'mutationVote' || g.phase === 'contractVote') assert(g.vote('solo', 0));
            if (g.phase === 'shop') build();
            g.phaseEnds = g.tick;
            g.step();
          }
        }
        const p = g.players.get('solo')!,
          s = summary(loadProfile(store));
        if (mode.id === 'endless') {
          assert.equal(g.phase, 'mutationVote');
          assert.equal(p.totalSp, 27);
          assert.equal(s.streaks[difficulty.id].personal, length);
          // A new unfinished fight loses but never removes any already banked mastery.
          while ((g.phase as string) !== 'combat') {
            g.phaseEnds = g.tick;
            g.step();
          }
          p.status = 'eliminated';
          g.step();
          assert.equal(g.phase, 'defeat');
          recordProfileView(viewOf(g, 'solo'), 'solo', store);
          assert.equal(summary(loadProfile(store)).classes[classId].clears, length);
        } else {
          if(g.phase==='secretOffer')for(const survivor of g.players.values())g.vote(survivor.id,0);
        assert.equal(g.phase, 'victory');
          assert.equal(p.totalSp, 27);
          assert.equal(g.campaignBank!.encounters, length);
          assert.equal(s.campaigns, 1);
          assert.equal(s.hardUnlocked, difficulty.id === 'hard');
        }
        rows.push({
          mode: mode.id as ModeId,
          classId,
          difficulty: difficulty.id,
          clears: length,
          restoredBoundaries: boundaries,
          purchases,
          finalSp: p.totalSp,
          capstones: p.skills.filter((id) => data.skills.find((s) => s.id === id)!.capstone).length,
          incomeGranted: p.incomeGranted,
          campaign: mode.id !== 'endless',
          hardUnlock: s.hardUnlocked,
          profileXp: s.classes[classId].xp,
        });
      }
  assert.equal(rows.length, 210);
  return rows;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = process.argv[2];
  if (!/^reviews\/balance\/[a-z0-9-]+\.json$/.test(output ?? '') || existsSync(output))
    throw Error('Choose a new reviews/balance JSON path');
  const rows = progressionMatrix();
  mkdirSync('reviews/balance', { recursive: true });
  const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const report = {
    createdAt: new Date().toISOString(),
    passed: true,
    protocol: PROTOCOL,
    contentRevision: CONTENT_REVISION,
    timedCombinations: rows.filter((r) => r.campaign).length,
    endlessCombinations: rows.filter((r) => !r.campaign).length,
    encounters: rows.reduce((n, r) => n + r.clears, 0),
    restoredBoundaries: rows.reduce((n, r) => n + r.restoredBoundaries, 0),
    sourceFiles: [
      { path: 'src/shared/game.ts', sha256: hash('src/shared/game.ts') },
      { path: 'tools/progression-matrix.ts', sha256: hash('tools/progression-matrix.ts') },
    ],
    limits: [
      'Deliberate boss defeats and accelerated intermissions test progression/save/economy/profile rules only.',
      'No combat feasibility, win rate, human pacing, rendered, physical-device or hosted capacity acceptance is claimed.',
    ],
    rows,
  };
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      passed: true,
      timed: report.timedCombinations,
      endless: report.endlessCombinations,
      encounters: report.encounters,
      restores: report.restoredBoundaries,
    }),
  );
}
