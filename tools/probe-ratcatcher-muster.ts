import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import { segmentRect, distance } from "../src/shared/geometry.ts";
import { PROTOCOL, CONTENT_REVISION, HZ } from "../src/shared/protocol.ts";
import { writeFileSync } from "node:fs";
const rows: object[] = [];
let combinations = 0,
  observedTicks = 0,
  peakRats = 0,
  peakHostiles = 0;
const radius = data.bosses.find((b) => b.id === "ratcatcher")!.radius;
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties)
    for (const selectedForm of ["normal", "brutal", "crazed"] as const)
      for (const phase of [0, 1]) {
        const g = createPracticeGame(
          {
            openingBossId: "ratcatcher",
            openingArenaId: map.id,
            difficulty: difficulty.id,
            mode: "endless",
            seed: 981,
          },
          "Muster audit",
          "soldier",
          selectedForm,
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
          packIds = new Set<number>(),
          whistleIds = new Set<number>(),
          locked = new Map<number, string>();
        let moved = 0,
          maxDistance = 0,
          ratSeen = false;
        for (let sample = 0; sample < 1000; sample++) {
          const old = { x: g.boss.x, y: g.boss.y };
          g.step();
          g.drainEvents();
          observedTicks++;
          const b = g.arena.bounds,
            sack = g.director.weakPoint()!,
            delta = distance(old, g.boss);
          moved += delta;
          maxDistance = Math.max(maxDistance, distance(origin, g.boss));
          if (delta > 80 / HZ + 0.01)
            throw Error("Muster exceeded patrol speed");
          if (
            g.boss.x < b.x + radius - 0.01 ||
            g.boss.x > b.x + b.width - radius + 0.01 ||
            g.boss.y < b.y + radius - 0.01 ||
            g.boss.y > b.y + b.height - radius + 0.01
          )
            throw Error("Boss body outside actual bounds");
          if (
            sack.x < b.x + sack.radius - 0.01 ||
            sack.x > b.x + b.width - sack.radius + 0.01 ||
            sack.y < b.y + sack.radius - 0.01 ||
            sack.y > b.y + b.height - sack.radius + 0.01
          )
            throw Error("Sack outside actual bounds");
          if (
            delta > 0.01 &&
            g.obstacles.some(
              (o) => segmentRect(old, g.boss, o, radius) !== null,
            )
          )
            throw Error("Patrol crossed masonry");
          for (const cue of g.director.cues()) {
            if (cue.kind === "scent") {
              if (cue.lane === 1) packIds.add(cue.id);
              const serialized = JSON.stringify(cue),
                before = locked.get(cue.id);
              if (before && before !== serialized)
                throw Error("Scent warning retargeted");
              locked.set(cue.id, serialized);
              if (
                g.obstacles.some(
                  (o) =>
                    segmentRect(
                      { x: cue.x1, y: cue.y1 },
                      { x: cue.x2, y: cue.y2 },
                      o,
                      radius,
                    ) !== null,
                )
              )
                throw Error("Scent lane crosses masonry");
            }
            if (cue.kind === "ratcatcher-whistle" && g.combatTick < cue.at) {
              whistleIds.add(cue.id);
              const serialized = JSON.stringify(cue),
                before = locked.get(cue.id);
              if (before && before !== serialized)
                throw Error("Whistle warning retargeted");
              locked.set(cue.id, serialized);
            }
          }
          const rats = [...g.minions.actors.values()].filter(
            (r) => r.kind === "rat",
          );
          peakRats = Math.max(peakRats, rats.length);
          ratSeen ||= rats.length > 0;
          if (rats.length > 12) throw Error("Rat cap exceeded");
          for (const rat of rats) {
            if (
              !Number.isFinite(rat.x + rat.y) ||
              rat.x < b.x + rat.radius - 0.01 ||
              rat.x > b.x + b.width - rat.radius + 0.01 ||
              rat.y < b.y + rat.radius - 0.01 ||
              rat.y > b.y + b.height - rat.radius + 0.01
            )
              throw Error("Rat outside actual bounds");
          }
          const hostile = [...g.shots.values()].filter(
            (s) => s.owner === "hostile",
          ).length;
          peakHostiles = Math.max(peakHostiles, hostile);
          if (hostile > 4000) throw Error("Hostile cap exceeded");
        }
        if (
          packIds.size < 2 ||
          !ratSeen ||
          (phase && maxDistance < 50) ||
          (!phase && moved > 0.001) ||
          (g.boss.variant === "normal"
            ? whistleIds.size > 0
            : whistleIds.size < 2)
        )
          throw Error(
            JSON.stringify({
              map: map.id,
              difficulty: difficulty.id,
              selectedForm,
              actualForm: g.boss.variant,
              phase,
              packWarnings: packIds.size,
              whistleWarnings: whistleIds.size,
              maxDistance,
              moved,
              ratSeen,
            }),
          );
        rows.push({
          map: map.id,
          difficulty: difficulty.id,
          selectedForm,
          actualForm: g.boss.variant,
          phase,
          observedTicks: 1000,
          packWarnings: packIds.size,
          whistleWarnings: whistleIds.size,
          movedPixels: Math.round(moved * 100) / 100,
          maxDistanceFromStart: Math.round(maxDistance * 100) / 100,
        });
        combinations++;
      }
const report = {
  passed: true,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  combinations,
  observedTicks,
  peakRats,
  peakHostiles,
  rows,
  limits: [
    "Actual Game samples of1000ticks per map/difficulty/selected form/phase, requiring multiple complete musters. No full-fight, progression-endurance, FPS, WAN or multiplayer capacity acceptance.",
    "Optional Baby/Easy Standard phase-circle event removed only in these route samples; real assistance cleanup is covered separately.",
    "No browser control, rendered, physical-device, native-language, listening or final human balance acceptance.",
  ],
};
writeFileSync(
  "reviews/ratcatcher-muster-2026-10-26/all-muster-geometry.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, rows: undefined }));
