import { Game, data } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { runtimeArenas, authoredArenas } from "../src/shared/arena-layouts.ts";
import { segmentRect } from "../src/shared/geometry.ts";
import {
  PROTOCOL,
  CONTENT_REVISION,
  type BossId,
} from "../src/shared/protocol.ts";
import { encounterPhases } from "../src/shared/encounter-policy.ts";
import { writeFileSync } from "node:fs";
let combinations = 0,
  ticks = 0,
  peakShots = 0;
const issues: any[] = [];
for (const map of runtimeArenas)
  for (const boss of data.bosses)
    for (const form of ["normal", "brutal", "crazed"] as const) {
      const count = encounterPhases(boss.id, form).length;
      for (let phase = 0; phase < count; phase++) {
        const g = createPracticeGame(
          {
            openingArenaId: map.id,
            openingBossId: boss.id as BossId,
            mode: "endless",
          },
          "Audit",
          "soldier",
          form,
        );
        g.start();
        g.players.get("solo")!.invulnerableUntil = 1e9;
        g.boss.deadline = 1e9;
        if (phase) {
          const phases = encounterPhases(boss.id, form);
          g.boss.health =
            g.boss.maxHealth * (phases[phase].healthThreshold - 0.01);
          while (g.boss.phase < phase) g.step();
        }
        for (let tick = 0; tick < 100; tick++) {
          g.step();
          g.drainEvents();
          ticks++;
          peakShots = Math.max(peakShots, g.shots.size);
          const b = g.arena.bounds;
          if (
            !Number.isFinite(g.boss.x + g.boss.y) ||
            g.boss.x < b.x ||
            g.boss.x > b.x + b.width ||
            g.boss.y < b.y ||
            g.boss.y > b.y + b.height
          ) {
            issues.push({
              map: map.id,
              boss: boss.id,
              form,
              phase,
              tick,
              problem: "Boss center outside playable bounds",
              position: { x: g.boss.x, y: g.boss.y },
            });
            break;
          }
          if (g.shots.size > 4000) throw Error("Projectile cap exceeded");
        }
        combinations++;
      }
    }
const maps = runtimeArenas.map((a) => {
  const old = authoredArenas.find((m) => m.id === a.id)!;
  return {
    id: a.id,
    previous: old.bounds,
    current: a.bounds,
    areaReductionPercent:
      100 * (1 - (a.width * a.height) / (old.width * old.height)),
  };
});
const report = {
  passed: issues.length === 0,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  combinations,
  simulationTicks: ticks,
  peakHostileShots: peakShots,
  maps,
  issues,
  limits: [
    "Actual single-authority shared Game casts for each phase/form/map; 100 ticks per phase. No SDK clients or rendered clients.",
    "Finite positions/caps are technical evidence, not final mechanics, full progression, capacity, WAN, device or human balance acceptance.",
  ],
};
writeFileSync(
  "reviews/crazed-horizon-2026-10-26/all-boss-geometry.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, issues: issues.slice(0, 20) }));
if (!report.passed) process.exitCode = 1;
