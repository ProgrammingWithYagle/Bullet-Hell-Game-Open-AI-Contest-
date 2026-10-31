import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import { segmentRect, distance } from "../src/shared/geometry.ts";
import { clerkStampCenters } from "../src/shared/clerk-placement.ts";
import { PROTOCOL, CONTENT_REVISION, HZ } from "../src/shared/protocol.ts";
import { writeFileSync } from "node:fs";
const placementFailures: object[] = [],
  rows: object[] = [];
let targetSamples = 0,
  combinations = 0,
  observedTicks = 0,
  peakStamps = 0,
  peakHostiles = 0;
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties) {
    const g = createPracticeGame(
      {
        openingBossId: "quarantine-clerk",
        openingArenaId: map.id,
        difficulty: difficulty.id,
        mode: "endless",
      },
      "Placement audit",
      "soldier",
    );
    g.start();
    const b = g.arena.bounds;
    for (const nx of [0.15, 0.5, 0.85])
      for (const ny of [0.25, 0.5, 0.75]) {
        const target = { x: b.x + b.width * nx, y: b.y + b.height * ny };
        if (g.obstacles.some((o) => segmentRect(target, target, o, 9)))
          continue;
        targetSamples++;
        const first = clerkStampCenters(
            b,
            g.obstacles,
            target,
            g.arena.lavaPits,
          ),
          second = clerkStampCenters(
            b,
            g.obstacles,
            target,
            g.arena.lavaPits,
            first,
          );
        if (first.length !== 3 || second.length !== 3)
          placementFailures.push({
            map: map.id,
            difficulty: difficulty.id,
            target,
            first: first.length,
            second: second.length,
          });
      }
  }
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties)
    for (const form of ["normal", "brutal", "crazed"] as const)
      for (const phase of [0, 1]) {
        const g = createPracticeGame(
          {
            openingBossId: "quarantine-clerk",
            openingArenaId: map.id,
            difficulty: difficulty.id,
            mode: "endless",
            seed: 981,
          },
          "Appeal audit",
          "soldier",
          form,
        );
        g.start();
        const p = g.players.get("solo")!;
        p.invulnerableUntil = 1e9;
        g.boss.deadline = 1e9;
        if (phase) {
          g.boss.health = g.boss.maxHealth * 0.49;
          g.step();
        }
        g.accord = null;
        const origin = { x: g.boss.x, y: g.boss.y },
          ids = new Set<number>(),
          locked = new Map<number, string>();
        let moved = 0;
        for (let n = 0; n < 1000; n++) {
          const old = { x: g.boss.x, y: g.boss.y };
          g.step();
          g.drainEvents();
          observedTicks++;
          moved += distance(old, g.boss);
          const b = g.arena.bounds,
            r = 58;
          if (distance(old, g.boss) > 72 / HZ + 0.01)
            throw Error("Patrol speed exceeded");
          if (
            g.boss.x < b.x + r - 0.01 ||
            g.boss.x > b.x + b.width - r + 0.01 ||
            g.boss.y < b.y + r - 0.01 ||
            g.boss.y > b.y + b.height - r + 0.01
          )
            throw Error("Clerk left actual bounds");
          if (
            distance(old, g.boss) > 0.01 &&
            g.obstacles.some((o) => segmentRect(old, g.boss, o, r))
          )
            throw Error("Patrol crossed masonry");
          const stamps = g.director.cues().filter((c) => c.kind === "stamp");
          peakStamps = Math.max(peakStamps, stamps.length);
          for (const s of stamps) {
            if (s.kind !== "stamp") continue;
            ids.add(s.id);
            const text = JSON.stringify(s);
            if (locked.has(s.id) && locked.get(s.id) !== text)
              throw Error("Stamp retargeted");
            locked.set(s.id, text);
            if (
              s.x - s.radius < b.x ||
              s.x + s.radius > b.x + b.width ||
              s.y - s.radius < b.y ||
              s.y + s.radius > b.y + b.height
            )
              throw Error("Stamp outside bounds");
            if (g.obstacles.some((o) => segmentRect(s, s, o, s.radius + 10)))
              throw Error("Stamp intersects masonry");
            if (
              g.arena.lavaPits.some(
                (p) => distance(s, p) <= s.radius + p.radius + 10,
              )
            )
              throw Error("Stamp overlaps lava");
          }
          const hostile = [...g.shots.values()].filter(
            (s) => s.owner === "hostile",
          ).length;
          peakHostiles = Math.max(peakHostiles, hostile);
          if (hostile > 4000) throw Error("Hostile cap exceeded");
        }
        if (ids.size < 6 || (phase && moved < 50) || (!phase && moved > 0.001))
          throw Error(
            JSON.stringify({
              map: map.id,
              difficulty: difficulty.id,
              form,
              actual: g.boss.variant,
              phase,
              stamps: ids.size,
              moved,
            }),
          );
        rows.push({
          map: map.id,
          difficulty: difficulty.id,
          selectedForm: form,
          actualForm: g.boss.variant,
          phase,
          stamps: ids.size,
          movedPixels: Math.round(moved * 100) / 100,
          observedTicks: 1000,
        });
        combinations++;
      }
const report = {
  passed: placementFailures.length === 0,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  targetSamples,
  priorPlacementFailures: 61,
  placementFailures,
  combinations,
  observedTicks,
  peakStamps,
  peakHostiles,
  rows,
  limits: [
    "Automated valid-target placement and multiple actual sequences per map/difficulty/form/phase. No full-fight, progression endurance, FPS, WAN or capacity acceptance.",
    "Optional Baby/Easy Standard phase-circle event removed only in sequence samples; real assistance cleanup is tested separately.",
    "No browser control or rendered/device/native-language/listening/final human balance acceptance.",
  ],
};
writeFileSync(
  "reviews/clerk-appeal-2026-10-26/all-clerk-geometry.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, rows: undefined }));
if (!report.passed) process.exit(1);
