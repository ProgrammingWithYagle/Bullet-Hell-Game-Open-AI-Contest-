import fs from "node:fs";
import assert from "node:assert/strict";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import {
  encounterPhases,
  encounterVariant,
} from "../src/shared/encounter-policy.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
const rows = [];
let observedTicks = 0,
  walkVertices = 0,
  activeWalkTicks = 0,
  stationaryWalkTicks = 0;
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties)
    for (const form of ["normal", "brutal", "crazed"]) {
      const phases = encounterPhases(
        "alchemist",
        encounterVariant(difficulty.id, form),
      );
      for (let phase = 0; phase < phases.length; phase++) {
        const g = createPracticeGame(
          {
            mode: "endless",
            openingBossId: "alchemist",
            openingArenaId: map.id,
            difficulty: difficulty.id,
            seed: 491,
          },
          "Mara",
          "soldier",
          form,
        );
        g.start();
        for (const p of g.players.values()) p.invulnerableUntil = 1e9;
        if (phase)
          g.boss.health =
            g.boss.maxHealth * (phases[phase].healthThreshold - 0.01);
        const b = g.arena.bounds,
          radius = 58,
          origin = { x: g.boss.x, y: g.boss.y },
          walks = new Set(),
          pools = new Map(),
          fronts = new Map(),
          sprays = new Map(),
          drained = new Set(),
          legsets = new Map();
        let peakPools = 0,
          peakHostiles = 0,
          moved = 0,
          walking = 0,
          stationary = 0;
        const walls = [
          ...g.arena.obstacles,
          ...g.arena.lavaPits.map((p) => ({
            x: p.x - p.radius,
            y: p.y - p.radius,
            width: p.radius * 2,
            height: p.radius * 2,
          })),
        ];
        const clear = (p, r) => {
          assert(
            p.x - r >= b.x - 0.01 &&
              p.x + r <= b.x + b.width + 0.01 &&
              p.y - r >= b.y - 0.01 &&
              p.y + r <= b.y + b.height + 0.01,
            "actual offset bounds",
          );
          assert(
            !walls.some((o) => segmentRect(p, p, o, r - 0.2)),
            "masonry/lava footprint",
          );
        };
        for (let tick = 0; tick < 1800 && g.phase === "combat"; tick++) {
          const old = { x: g.boss.x, y: g.boss.y };
          g.step();
          observedTicks++;
          clear(g.boss, radius);
          assert(
            distance(old, g.boss) <= 166.25 / 30 + 0.02,
            "body speed budget",
          );
          moved = Math.max(moved, distance(origin, g.boss));
          const cues = g.bossCues(),
            livep = cues.filter((q) => q.kind === "mold-pool");
          peakPools = Math.max(peakPools, livep.length);
          assert(livep.length <= 3);
          peakHostiles = Math.max(
            peakHostiles,
            [...g.shots.values()].filter((q) => q.owner === "hostile").length,
          );
          for (const q of cues) {
            if (q.kind === "mold-walk") {
              if (!walks.has(q.id)) {
                walks.add(q.id);
                assert(q.at - q.beganAt >= 20);
                for (let i = 0; i < q.path.length; i++) {
                  walkVertices++;
                  clear(q.path[i], 58);
                  if (i)
                    assert(
                      !walls.some((o) =>
                        segmentRect(q.path[i - 1], q.path[i], o, 58),
                      ),
                      "complete road",
                    );
                }
              }
              if (g.combatTick >= q.at) {
                walking++;
                if (distance(old, g.boss) < 0.01) stationary++;
              }
            }
            if (q.kind === "mold-pool") {
              clear(q, q.radius);
              assert(q.at - q.beganAt >= 39);
              const lock = { x: q.x, y: q.y, at: q.at, radius: q.radius };
              if (pools.has(q.id)) assert.deepEqual(lock, pools.get(q.id));
              else pools.set(q.id, lock);
              if (q.drainedAt) drained.add(q.id);
            }
            if (q.kind === "mold-front") {
              clear(q, q.radius);
              assert(q.at - q.beganAt >= 45);
              const lock = {
                path: q.path,
                at: q.at,
                leg: q.leg,
                legs: q.legs,
                draining: q.draining,
              };
              if (fronts.has(q.id)) assert.deepEqual(lock, fronts.get(q.id));
              else fronts.set(q.id, lock);
              const set = legsets.get(q.legs) ?? new Set();
              set.add(q.leg);
              legsets.set(q.legs, set);
            }
            if (q.kind === "mold-spray") {
              assert(q.at - q.beganAt >= 39);
              const lock = { x: q.x, y: q.y, angles: q.angles, at: q.at };
              if (sprays.has(q.id)) assert.deepEqual(lock, sprays.get(q.id));
              else sprays.set(q.id, lock);
            }
          }
        }
        const legs = phase === 3 && g.boss.variant === "crazed" ? 4 : phase;
        assert.equal(g.boss.phase, phase);
        assert(
          walks.size >= 2 && moved > 32 && pools.size,
          "mixing sequence " +
            map.id +
            "/" +
            difficulty.id +
            "/" +
            form +
            "/" +
            phase,
        );
        if (legs) {
          assert(
            legsets.get(legs)?.size === legs,
            "complete reaction legs " +
              map.id +
              "/" +
              difficulty.id +
              "/" +
              form +
              "/" +
              phase,
          );
        } else assert.equal(fronts.size, 0);
        if (phase >= 2)
          assert(
            drained.size,
            "decant drains " +
              map.id +
              "/" +
              difficulty.id +
              "/" +
              form +
              "/" +
              phase,
          );
        if (g.boss.variant !== "normal") assert(sprays.size, "advanced spray");
        assert.equal(stationary, 0);
        activeWalkTicks += walking;
        stationaryWalkTicks += stationary;
        g.boss.health = 0;
        g.step();
        assert(!g.bossCues().some((q) => q.kind.startsWith("mold-")));
        rows.push({
          map: map.id,
          difficulty: difficulty.id,
          requestedForm: form,
          effectiveForm: g.boss.variant,
          phase,
          walks: walks.size,
          pools: pools.size,
          fronts: fronts.size,
          expectedReactionLegs: legs,
          drainedPools: drained.size,
          sprayGroups: sprays.size,
          maximumBossDisplacement: moved,
          activeWalkTicks: walking,
          stationaryWalkTicks: stationary,
          peakPools,
          peakHostiles,
        });
      }
    }
const report = {
  passed: true,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  cases: rows.length,
  observedTicks,
  walkVertices,
  activeWalkTicks,
  stationaryWalkTicks,
  peakPools: Math.max(...rows.map((r) => r.peakPools)),
  peakHostiles: Math.max(...rows.map((r) => r.peakHostiles)),
  rows,
  limits: [
    "Actual-Game stationary invulnerable mechanics samples; no rendered, personally played clear, final balance or performance/device/capacity acceptance.",
    "Full actual offset bounds, masonry/lava body/pool footprint, complete routes, locked tells, full leg sets, draining and cleanup are measured.",
  ],
};
fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...report, rows: undefined }));
