import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  bellChainPosition,
  bellChainStage,
  bellChainRules,
} from "../src/shared/bell-return-chain.ts";
import assert from "node:assert/strict";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import {
  encounterPhases,
  encounterVariant,
} from "../src/shared/encounter-policy.ts";
import { bellWalls, bellClapperContact } from "../src/shared/bell-carillon.ts";
import { segmentRect, distance } from "../src/shared/geometry.ts";
import { gappedRingContact } from "../src/shared/ring-contact.ts";
import { bellFrame } from "../src/client/bell-presentation.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
const out =
    process.argv[2] ?? "reviews/returning-clapper-2026-10-28/sequences.json",
  rows = [];
function runtimeHash() {
  const walk = (d) =>
      fs
        .readdirSync(d)
        .sort()
        .flatMap((n) => {
          const p = d + "/" + n;
          return fs.statSync(p).isDirectory() ? walk(p) : [p];
        }),
    h = createHash("sha256");
  for (const p of walk("src").sort()) {
    h.update(p + "\0");
    h.update(fs.readFileSync(p));
  }
  return h.digest("hex");
}
const runtimeSourceSha256 = runtimeHash();
let observedTicks = 0,
  walkVertices = 0,
  activeWalkTicks = 0,
  stationaryWalkTicks = 0,
  openingWitnesses = 0,
  totalOverlapTicks = 0,
  totalEchoOverlapTicks = 0,
  totalClapperOverlapTicks = 0;
for (const map of runtimeArenas)
  for (const d of data.difficulties)
    for (const requestedForm of ["normal", "brutal", "crazed"]) {
      const effective = encounterVariant(d.id, requestedForm),
        phases = encounterPhases("bellringer", effective);
      for (let phase = 0; phase < phases.length; phase++) {
        if (
          process.env.BELL_PROBE_CASE &&
          process.env.BELL_PROBE_CASE !==
            [map.id, d.id, requestedForm, phase].join("/")
        )
          continue;
        const g = createPracticeGame(
          {
            mode: "endless",
            openingBossId: "bellringer",
            openingArenaId: map.id,
            difficulty: d.id,
            seed: 491,
          },
          "Mara",
          "soldier",
          requestedForm,
        );
        g.start();
        g.boss.deadline = 1e9;
        for (const p of g.players.values()) p.invulnerableUntil = 1e9;
        g.boss.phase = phase; // Seed a legal phase before any score owns work.
        if (phase)
          g.boss.health =
            g.boss.maxHealth * (phases[phase].healthThreshold - 0.01);
        while (g.boss.phase < phase) g.step();
        const known = new Map(),
          primary = new Map(),
          echoes = new Set(),
          clappers = new Set(),
          gait = new Set(),
          walks = new Set(),
          sounds = new Set(),
          chains = new Map(),
          chainStages = new Set();
        let caseTicks = 0,
          peakCues = 0,
          peakFronts = 0,
          overlapTicks = 0,
          echoOverlapTicks = 0,
          clapperOverlapTicks = 0,
          finished = false,
          opening = null,
          closedTowardTarget = null,
          firstClapper = null,
          returnPealOverlapTicks = 0,
          headDamageTicks = 0;
        const context = {
          map: map.id,
          difficulty: d.id,
          requestedForm,
          effectiveForm: effective,
          phase,
        };
        try {
          for (let n = 0; n < 3000; n++) {
            const before = g.bossCues().find((q) => q.kind === "bell-walk"),
              old = { x: g.boss.x, y: g.boss.y };
            g.step();
            caseTicks++;
            observedTicks++;
            assert.equal(g.phase, "combat");
            assert.equal(g.boss.phase, phase);
            const c = g.signatureContext(),
              walls = bellWalls(c),
              cues = g.bossCues().filter((q) => q.kind.startsWith("bell-"));
            for (const e of g.events)
              if (e.type === "sound" && e.id.startsWith("bell-"))
                sounds.add(e.id);
            assert(
              g
                .bossCues()
                .every(
                  (q) => q.kind.startsWith("bell-") || q.kind === "arena-lava",
                ),
            );
            assert.equal(
              [...g.shots.values()].filter((q) => q.owner === "hostile").length,
              0,
            );
            assert(
              walls.every(
                (o) => segmentRect(g.boss, g.boss, o, c.radius - 0.2) === null,
              ),
            );
            if (before && g.combatTick >= before.at) {
              const travel = distance(old, g.boss);
              assert(travel <= before.speed / 30 + 0.01);
              if (g.combatTick < before.until - 1) {
                activeWalkTicks++;
                if (travel < 0.0001) stationaryWalkTicks++;
              }
            }
            const active = cues.filter(
              (q) => q.kind === "bell-ring" && q.state === "travel",
            );
            const head = cues.find((q) => q.kind === "bell-chain");
            if (head?.state === "return" && active.length)
              returnPealOverlapTicks++;
            if (head && (head.state === "outbound" || head.state === "return"))
              headDamageTicks++;
            peakFronts = Math.max(peakFronts, active.length);
            peakCues = Math.max(peakCues, cues.length);
            assert(cues.length <= 18);
            if (active.length > 1) overlapTicks++;
            if (active.some((q) => q.echo) && active.some((q) => !q.echo))
              echoOverlapTicks++;
            if (
              active.length &&
              cues.some((q) => q.kind === "bell-clapper" && q.state === "swing")
            )
              clapperOverlapTicks++;
            const frame = bellFrame(cues, g.combatTick);
            if (frame >= 8) gait.add(frame);
            assert.equal(bellFrame(cues, g.combatTick, true), 0);
            assert.equal(new Set(cues.map((q) => q.id)).size, cues.length);
            for (const q of cues) {
              assert(Number.isSafeInteger(q.id));
              for (const value of Object.values(q))
                if (typeof value === "number") assert(Number.isFinite(value));
              const prev = known.get(q.id);
              if (q.kind === "bell-chain") {
                chainStages.add(q.state);
                assert.equal(q.state, bellChainStage(q, g.combatTick));
                const point = bellChainPosition(q, g.combatTick);
                assert(
                  Math.abs(point.x - q.x) < 1e-6 &&
                    Math.abs(point.y - q.y) < 1e-6,
                );
                assert.equal(
                  g.director.weakPoints().some((w) => w.id === q.id),
                  q.state === "rewarn",
                );
                assert.equal(q.health, q.maxHealth);
                assert.equal(q.maxHealth, effective === "crazed" ? 65 : 45);
                assert.equal(q.at - q.beganAt, 39);
                assert.equal(q.returnAt - q.returnWarnAt, 36);
                assert.equal(q.damage, bellChainRules.damage * c.damageScale);
                assert(
                  walls.every(
                    (o) =>
                      segmentRect(
                        { x: q.originX, y: q.originY },
                        { x: q.endX, y: q.endY },
                        o,
                        q.radius + 1,
                      ) === null,
                  ),
                );
                assert(
                  Math.abs(g.boss.x - q.originX) < 1e-6 &&
                    Math.abs(g.boss.y - q.originY) < 1e-6,
                  "Body moved during a physical throw",
                );
                if (!chains.has(q.id)) chains.set(q.id, structuredClone(q));
                for (const key of [
                  "originX",
                  "originY",
                  "endX",
                  "endY",
                  "at",
                  "outwardEndAt",
                  "returnWarnAt",
                  "returnAt",
                  "until",
                  "maxHealth",
                  "damage",
                ])
                  assert.equal(q[key], chains.get(q.id)[key]);
              }
              if (q.kind === "bell-walk" && !prev) {
                walks.add(q.id);
                walkVertices += q.path.length;
                for (let i = 0; i < q.path.length; i++) {
                  assert.deepEqual(Object.keys(q.path[i]).sort(), ["x", "y"]);
                  if (i)
                    assert(
                      walls.every(
                        (o) =>
                          segmentRect(
                            q.path[i - 1],
                            q.path[i],
                            o,
                            c.radius - 0.2,
                          ) === null,
                      ),
                    );
                }
                const target = { x: q.targetX, y: q.targetY },
                  start = distance(q.path[0], target),
                  end = distance(q.path.at(-1), target);
                closedTowardTarget = { before: start, after: end };
                if (start > 260)
                  assert(
                    end < start,
                    "Initial approach failed to close toward the survivor",
                  );
              }
              if (q.kind === "bell-ring") {
                if (q.echo) echoes.add(q.id);
                else primary.set(q.strike, q.returning);
                assert(
                  Math.abs(
                    q.gap -
                      ((effective === "normal" ? 46 : 35) * Math.PI) / 180,
                  ) < 1e-9,
                );
                assert(!q.held);
                assert(!["quiet", "rewarn"].includes(q.state));
                if (prev) {
                  for (const key of [
                    "x",
                    "y",
                    "speed",
                    "width",
                    "initialGapAngle",
                    "gapAngle",
                    "gap",
                    "at",
                    "returning",
                    "echo",
                  ])
                    assert.equal(q[key], prev[key]);
                  assert(
                    Math.abs(q.radius - prev.radius) <= q.speed / 30 + 0.01,
                  );
                  assert(
                    q.returning
                      ? q.radius <= prev.radius
                      : q.radius >= prev.radius,
                  );
                } else {
                  assert.equal(
                    q.at - q.beganAt,
                    q.echo ? 48 : q.returning ? 45 : 33,
                  );
                  const p = Reflect.get(
                    g.director.services.bellringer,
                    "opening",
                  );
                  assert(walls.every((o) => segmentRect(p, p, o, 12) === null));
                  const r = distance(p, q);
                  assert(r >= 130);
                  assert(
                    !gappedRingContact(p, p, {
                      ...q,
                      oldRadius: r - 8,
                      radius: r + 8,
                    }),
                    "Shared floor point is outside a full-body opening",
                  );
                  openingWitnesses++;
                  if (!opening) opening = { x: p.x, y: p.y };
                }
              }
              if (q.kind === "bell-clapper") {
                assert.equal(
                  q.reach,
                  q.echo ? 250 : effective === "normal" ? 260 : 340,
                );
                clappers.add(q.id);
                if (!firstClapper && !q.echo) firstClapper = q;
                if (prev)
                  for (const key of [
                    "x",
                    "y",
                    "angle",
                    "halfAngle",
                    "reach",
                    "at",
                    "until",
                  ])
                    assert.equal(q[key], prev[key]);
                else assert.equal(q.at - q.beganAt, 36);
              }
              if (q.kind === "bell-resonator")
                assert(
                  walls.every(
                    (o) => segmentRect(q, q, o, q.radius - 0.2) === null,
                  ),
                );
              known.set(q.id, structuredClone(q));
            }
            if (primary.size && !g.director.services.bellringer.busy) {
              finished = true;
              break;
            }
          }
          assert(finished, "Complete score did not finish");
          assert.deepEqual(
            [...primary.values()],
            phases[phase].tollOrder.map((v) => v === "in"),
          );
          assert.equal(stationaryWalkTicks, 0);
          assert.equal(gait.size, 8);
          assert(walks.size > 0);
          assert(overlapTicks > 0);
          assert(clapperOverlapTicks > 0);
          assert(peakFronts >= (effective === "normal" ? 2 : 3));
          assert(
            firstClapper &&
              opening &&
              !bellClapperContact(opening, opening, firstClapper),
            "The initial clapper covers the common ring opening",
          );
          assert.equal(
            clappers.size,
            effective === "normal"
              ? phase
                ? 2
                : 1
              : (phase >= 3 ? 3 : 2) + (effective === "crazed" ? 1 : 0),
          );
          assert.equal(chains.size, effective === "normal" ? 0 : 1);
          if (effective !== "normal") {
            assert.deepEqual(
              [...chainStages].sort(),
              ["windup", "outbound", "settle", "rewarn", "return"].sort(),
            );
            assert(returnPealOverlapTicks > 0);
            assert(headDamageTicks > 0);
          }
          assert(!g.director.weakPoints().some((w) => w.kind === "bell-chain"));
          if (effective === "crazed") {
            assert(echoOverlapTicks > 0);
            assert.equal(echoes.size, phase >= 2 ? 4 : 3);
            assert(sounds.has("bell-answer"));
          } else assert.equal(echoes.size, 0);
          assert(sounds.has("bell-toll") && sounds.has("bell-clapper"));
          assert.equal(
            Reflect.get(g.director.services.bellringer, "hits").size,
            0,
          );
          assert.deepEqual(g.director.services.bellringer.cues(), []);
          g.boss.health = 0;
          g.step();
          assert(!g.bossCues().some((q) => q.kind.startsWith("bell-")));
        } catch (error) {
          fs.writeFileSync(
            out + ".failure.json",
            JSON.stringify(
              {
                ...context,
                reason: String(error),
                tick: g.combatTick,
                cues: g.bossCues(),
                boss: g.boss,
                bounds: g.arena.bounds,
                walls: bellWalls(g.signatureContext()),
              },
              null,
              2,
            ) + "\n",
          );
          throw error;
        }
        totalOverlapTicks += overlapTicks;
        totalEchoOverlapTicks += echoOverlapTicks;
        totalClapperOverlapTicks += clapperOverlapTicks;
        rows.push({
          ...context,
          caseTicks,
          primaryOrder: [...primary.values()],
          echoes: echoes.size,
          chains: chains.size,
          chainStages: [...chainStages],
          returnPealOverlapTicks,
          headDamageTicks,
          clappers: clappers.size,
          walks: walks.size,
          walkFrames: [...gait].sort((a, b) => a - b),
          closedTowardTarget,
          commonOpening: opening,
          overlapTicks,
          echoOverlapTicks,
          clapperOverlapTicks,
          peakCues,
          peakFronts,
          sounds: [...sounds].sort(),
        });
      }
    }
const report = {
  passed: true,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  runtimeSourceSha256,
  cases: rows.length,
  observedTicks,
  maximumCaseTicks: Math.max(...rows.map((r) => r.caseTicks)),
  walkVertices,
  activeWalkTicks,
  stationaryWalkTicks,
  openingWitnesses,
  totalOverlapTicks,
  totalEchoOverlapTicks,
  totalClapperOverlapTicks,
  peakActiveFronts: Math.max(...rows.map((r) => r.peakFronts)),
  peakCues: Math.max(...rows.map((r) => r.peakCues)),
  hostileProjectiles: 0,
  chainedClappers: rows.reduce((n, r) => n + r.chains, 0),
  totalReturnPealOverlapTicks: rows.reduce(
    (n, r) => n + r.returnPealOverlapTicks,
    0,
  ),
  standardCalibration: { gapDegrees: 46, clapperReach: 260, beatTicks: 32 },
  rows,
  limits: [
    "Actual-Game stationary invulnerable samples through one complete score per map/difficulty/requested-form/effective-phase. No personally played clear, rendered or final human balance acceptance.",
    "Common openings and the first clapper escape are verified on body-clear real floor. This does not prove a route from every possible player position during every overlap.",
    "No performance/capacity/WAN/device/native-language/listening acceptance.",
    "Phase continuity has a separate current-runtime all-boss matrix and targeted return-chain/network regressions. Alchemist Crazed tuning and the General mobility branch remain follow-ups.",
  ],
};
assert.equal(
  runtimeHash(),
  runtimeSourceSha256,
  "Runtime changed during complete-score probe",
);
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...report, rows: undefined }));
