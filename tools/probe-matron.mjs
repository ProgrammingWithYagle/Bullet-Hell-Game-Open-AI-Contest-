import fs from "node:fs";
import assert from "node:assert/strict";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
const rows = [];
let observedTicks = 0,
  walkVertices = 0,
  activeWalkTicks = 0,
  stationaryWalkTicks = 0;
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties)
    for (const form of ["normal", "brutal", "crazed"])
      for (const phase of [0, 1]) {
        const g = createPracticeGame(
          {
            mode: "endless",
            openingBossId: "matron",
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
        if (phase) g.boss.health = g.boss.maxHealth * 0.49;
        const b = g.arena.bounds,
          radius = data.bosses.find((b) => b.id === "matron").radius,
          origin = { x: g.boss.x, y: g.boss.y },
          walks = new Set(),
          broods = new Set(),
          pulses = new Map(),
          needles = new Map(),
          relays = new Map();
        let peakNests = 0,
          peakMinions = 0,
          peakHostiles = 0,
          moved = 0,
          walking = 0,
          stationary = 0;
        const clear = (p, r) => {
          assert(
            p.x - r >= b.x - 0.01 &&
              p.x + r <= b.x + b.width + 0.01 &&
              p.y - r >= b.y - 0.01 &&
              p.y + r <= b.y + b.height + 0.01,
            "actual offset bounds",
          );
          assert(
            !g.arena.obstacles.some((o) => segmentRect(p, p, o, r - 0.2)),
            "actual masonry",
          );
        };
        const walls = [
          ...g.arena.obstacles,
          ...g.arena.lavaPits.map((p) => ({
            x: p.x - p.radius,
            y: p.y - p.radius,
            width: p.radius * 2,
            height: p.radius * 2,
          })),
        ];
        for (let i = 0; i < 1800 && g.phase === "combat"; i++) {
          const old = { x: g.boss.x, y: g.boss.y };
          g.step();
          observedTicks++;
          clear(g.boss, radius);
          assert(
            !walls.some((o) => segmentRect(g.boss, g.boss, o, radius - 0.2)),
            "body lava footprint",
          );
          assert(distance(old, g.boss) <= 175 / 30 + 0.02, "movement budget");
          moved = Math.max(moved, distance(origin, g.boss));
          const cues = g.bossCues(),
            nests = cues.filter(
              (q) => q.kind === "service-prop" && q.role === "nest",
            );
          peakNests = Math.max(peakNests, nests.length);
          assert(nests.length <= 3);
          peakMinions = Math.max(peakMinions, g.minions.actors.size);
          assert(g.minions.actors.size <= 18);
          peakHostiles = Math.max(
            peakHostiles,
            [...g.shots.values()].filter((s) => s.owner === "hostile").length,
          );
          for (const n of nests) clear(n, n.radius);
          for (const m of g.minions.actors.values()) clear(m, m.radius);
          for (const q of cues) {
            if (q.kind === "matron-walk") {
              if (!walks.has(q.id)) {
                walks.add(q.id);
                assert(q.at - q.beganAt >= 20);
                for (let n = 0; n < q.path.length; n++) {
                  walkVertices++;
                  clear(q.path[n], radius);
                  if (n)
                    assert(
                      !walls.some((o) =>
                        segmentRect(q.path[n - 1], q.path[n], o, radius - 0.2),
                      ),
                      "complete marked route",
                    );
                }
              }
              if (g.combatTick >= q.at) {
                walking++;
                if (distance(old, g.boss) < 0.01) stationary++;
              }
            }
            if (q.kind === "matron-brood") {
              assert(q.at - q.beganAt >= 36);
              assert.equal(q.count, phase ? 4 : 2);
              broods.add(q.id);
            }
            if (q.kind === "matron-pulse") {
              assert(q.at - q.beganAt >= 48);
              const lock = {
                x: q.x,
                y: q.y,
                at: q.at,
                gap: q.gap,
                gapAngle: q.gapAngle,
                until: q.until,
              };
              if (pulses.has(q.id)) assert.deepEqual(lock, pulses.get(q.id));
              else pulses.set(q.id, lock);
              const set = relays.get(q.beganAt) ?? new Set();
              set.add(q.sourceId);
              relays.set(q.beganAt, set);
            }
            if (q.kind === "matron-needles") {
              assert(q.at - q.beganAt >= 42);
              const lock = { x: q.x, y: q.y, at: q.at, angles: q.angles };
              if (needles.has(q.id)) assert.deepEqual(lock, needles.get(q.id));
              else needles.set(q.id, lock);
            }
          }
        }
        const relayMaximum = Math.max(
          0,
          ...[...relays.values()].map((s) => s.size),
        );
        assert(
          walks.size >= 2 && moved > 32 && pulses.size && broods.size,
          "complete sequence " +
            map.id +
            "/" +
            difficulty.id +
            "/" +
            form +
            "/" +
            phase,
        );
        assert(phase ? relayMaximum >= 2 : relayMaximum === 1, "phase relay");
        if (g.boss.variant !== "normal")
          assert(needles.size, "advanced sequence");
        assert.equal(stationary, 0);
        activeWalkTicks += walking;
        stationaryWalkTicks += stationary;
        g.boss.health = 0;
        g.step();
        assert.equal(g.minions.actors.size, 0);
        assert(
          !g
            .bossCues()
            .some(
              (q) =>
                q.kind.startsWith("matron-") ||
                (q.kind === "service-prop" && q.role === "nest"),
            ),
        );
        rows.push({
          map: map.id,
          difficulty: difficulty.id,
          requestedForm: form,
          effectiveForm: g.boss.variant,
          phase,
          walks: walks.size,
          broods: broods.size,
          pulses: pulses.size,
          needleGroups: needles.size,
          relayMaximum,
          maximumBossDisplacement: moved,
          activeWalkTicks: walking,
          stationaryWalkTicks: stationary,
          peakNests,
          peakMinions,
          peakHostiles,
        });
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
  peakNests: Math.max(...rows.map((r) => r.peakNests)),
  peakMinions: Math.max(...rows.map((r) => r.peakMinions)),
  peakHostiles: Math.max(...rows.map((r) => r.peakHostiles)),
  rows,
  limits: [
    "Actual-Game stationary invulnerable mechanics sampling, not rendered, a played clear, performance/capacity or final balance acceptance.",
    "Full offset bounds, masonry, complete walk paths, body lava footprints and actor caps are checked. Existing global form pressure remains.",
  ],
};
fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...report, rows: undefined }));
