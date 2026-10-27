import fs from "node:fs";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import {
  PROTOCOL,
  CONTENT_REVISION,
  type BossVariant,
} from "../src/shared/protocol.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import { clerkAppealRules as r } from "../src/shared/clerk-appeal.ts";
const rows: unknown[] = [];
let observedTicks = 0,
  peakDomains = 0,
  peakGates = 0,
  peakNeedles = 0,
  peakHostiles = 0;
for (const bossId of ["gate-widow", "quarantine-clerk"] as const)
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties)
      for (const variant of ["normal", "brutal", "crazed"] as BossVariant[])
        for (const phase of [0, 1]) {
          const g = createPracticeGame(
            {
              openingBossId: bossId,
              openingArenaId: map.id,
              difficulty: difficulty.id,
              mode: "endless",
              seed: 491,
            },
            "Mara",
            "soldier",
            variant,
          );
          g.start();
          for (const p of g.players.values()) p.invulnerableUntil = 1e9;
          if (phase) g.boss.health = g.boss.maxHealth * 0.49;
          let gates = 0,
            domains = 0,
            needles = 0,
            hostiles = 0,
            moved = 0,
            sets = new Set<number>(),
            domainIds = new Set<number>();
          const initial = { x: g.boss.x, y: g.boss.y };
          for (let n = 0; n < 1800 && g.phase === "combat"; n++) {
            const old = { x: g.boss.x, y: g.boss.y };
            g.step();
            observedTicks++;
            moved = Math.max(moved, distance(initial, g.boss));
            if (distance(old, g.boss) > 72 / 30 + 0.02)
              throw Error("Movement exceeds authored speed");
            if (
              g.arena.obstacles.some((o) =>
                segmentRect(g.boss, g.boss, o, data.bosses.find((b) => b.id === g.boss.id)!.radius - 0.2),
              )
            )
              throw Error("Boss overlaps masonry");
            const cues = g.bossCues(),
              gateCues = cues.filter((c) => c.kind === "gate"),
              domainCues = cues.filter((c) => c.kind === "clerk-domain"),
              needleCues = cues.filter((c) => c.kind === "widow-needles");
            gates = Math.max(gates, gateCues.length);
            domains = Math.max(domains, domainCues.length);
            needles = Math.max(needles, needleCues.length);
            hostiles = Math.max(
              hostiles,
              [...g.shots.values()].filter((s) => s.owner === "hostile").length,
            );
            if (gateCues.length) {
              if (gateCues.length !== 3)
                throw Error("Multiple simultaneous gate sets");
              sets.add(gateCues[0].id);
            }
            for (const q of domainCues) domainIds.add(q.id);
          }
          if (phase && moved < 32)
            throw Error(
              "Late phase did not move: " +
                bossId +
                "/" +
                map.id +
                "/" +
                difficulty.id,
            );
          if (bossId === "gate-widow" && !sets.size)
            throw Error("No gate sequence");
          if (
            bossId === "quarantine-clerk" &&
            phase &&
            g.boss.variant === "crazed" &&
            !domains
          )
            throw Error("No late Crazed domains");
          if (domains > r.maximumDomains || hostiles > 4000)
            throw Error("State budget exceeded");
          peakDomains = Math.max(peakDomains, domains);
          peakGates = Math.max(peakGates, gates);
          peakNeedles = Math.max(peakNeedles, needles);
          peakHostiles = Math.max(peakHostiles, hostiles);
          rows.push({
            bossId,
            map: map.id,
            difficulty: difficulty.id,
            selectedVariant: variant,
            actualVariant: g.boss.variant,
            phase,
            moved,
            gateSets: sets.size,
            domains,
            domainIdentities: domainIds.size,
            needles,
            hostiles,
          });
        }
const endurance = [];
const timerFactors = data.mutations
    .map((m) => ("timer" in m.modifiers ? m.modifiers.timer : 1) as number)
    .filter((v) => v > 1)
    .sort((a, b) => b - a)
    .slice(0, 3),
  maximumTimerFactor = timerFactors.reduce((a, b) => a * b, 1);
const minimumDomainInterval =
    r.stampWarnings.crazed +
    9 * r.stampSpacing.crazed +
    r.lateReopenDelaySeconds +
    r.activeSeconds +
    r.domainWarningSeconds,
  maximumSeconds =
    data.bosses.find((b) => b.id === "quarantine-clerk")!.timer *
    data.bosses.find((b) => b.id === "quarantine-clerk")!.variants.crazed
      .deadlineMultiplier *
    maximumTimerFactor,
  conservativeDomainBound =
    Math.ceil(maximumSeconds / minimumDomainInterval) * r.domainCount;
if (conservativeDomainBound >= r.maximumDomains)
  throw Error("Domain storage can truncate a legitimate finite encounter");
for (const map of runtimeArenas) {
  const g = createPracticeGame(
    {
      openingBossId: "quarantine-clerk",
      openingArenaId: map.id,
      difficulty: "hellish",
      mode: "endless",
      seed: 772,
    },
    "Mara",
    "soldier",
    "crazed",
  );
  g.start();
  for (const p of g.players.values()) p.invulnerableUntil = 1e9;
  g.boss.health = g.boss.maxHealth * 0.49;
  let peak = 0;
  const batches = new Set<number>();
  const ids = new Set<number>(),
    began = g.combatTick,
    deadline = g.boss.deadline;
  for (let n = 0; n < 20000 && g.phase === "combat"; n++) {
    g.step();
    const cues = g.bossCues(),
      stamps = cues.filter((c) => c.kind === "stamp"),
      domains = cues.filter((c) => c.kind === "clerk-domain");
    for (const q of domains) ids.add(q.id);
    for (const stamp of stamps)
      batches.add(
        stamp.at - (stamp.index - 1) * Math.ceil(r.stampSpacing.crazed * 30),
      );
    peak = Math.max(peak, domains.length);
  }
  if (g.phase !== "defeat" || g.combatTick !== deadline)
    throw Error("Natural deadline evidence did not end on its real clock");
  if (ids.size !== batches.size * 2 || peak >= r.maximumDomains)
    throw Error("A legitimate stamp batch lost its two lasting domains");
  endurance.push({
    map: map.id,
    ticks: g.combatTick - began,
    naturalDeadline: deadline,
    batches: batches.size,
    domainIdentities: ids.size,
    peakDomains: peak,
    ending: g.phase,
  });
}
const report = {
  passed: true,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  cases: rows.length,
  observedTicks,
  peakDomains,
  peakGates,
  peakNeedles,
  peakHostiles,
  maximumTimerFactor,
  maximumSeconds,
  minimumDomainInterval,
  conservativeDomainBound,
  storageCap: r.maximumDomains,
  endurance,
  rows,
  limits: [
    "Actual Game sequences with stationary invulnerable survivors. Real damage, prediction, worker and client tests are separate.",
    "Natural-deadline endurance is a mechanics/storage check ending in timeout, not a played clear or balance acceptance.",
    "No universal rendered/device/native-language/listening/FPS/WAN/capacity/full-progression acceptance.",
  ],
};
fs.writeFileSync(
  process.argv[2] ?? "reviews/crossed-threshold-sequences.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, rows: undefined }));
