import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
const walk = (dir) =>
  fs
    .readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const p = path.join(dir, name);
      return fs.statSync(p).isDirectory() ? walk(p) : [p];
    });
const runtimeHash = () => {
  const h = createHash("sha256");
  for (const p of walk(path.join(root, "src")).sort()) {
    h.update(path.relative(root, p).split(path.sep).join("/") + "\0");
    h.update(fs.readFileSync(p));
  }
  return h.digest("hex");
};
const runtimeSourceSha256 = runtimeHash();
const load = (p) =>
  import(pathToFileURL(root + "/src/shared/" + p + ".ts").href);
const { createPracticeGame } = await load("practice-start"),
  { data } = await load("game"),
  { encounterPhases, encounterVariant } = await load("encounter-policy");
const { PROTOCOL, CONTENT_REVISION } = await load("protocol");
const run = process.env.PHASE_MATRIX_RUN ?? "current";
const result = spawnSync(
  "git",
  ["-c", "core.bare=false", "rev-parse", "HEAD"],
  { cwd: root, encoding: "utf8" },
);
assert.equal(result.status, 0);
const rows = [],
  faults = [];
let ticks = 0,
  comparisons = 0,
  items = 0,
  peakCues = 0;
function snapshot(g) {
  const out = new Map();
  for (const q of g.bossCues())
    if (q.kind !== "arena-lava") out.set("cue:" + q.kind + ":" + q.id, q);
  for (const q of g.warnings) out.set("warning:" + q.id, q);
  for (const q of g.shots.values())
    if (q.owner === "hostile") out.set("shot:" + q.id, { ...q });
  for (const q of g.fields)
    if (q.owner === "hostile") out.set("field:" + q.id, { ...q });
  for (const q of g.minions.actors.values())
    out.set("minion:" + q.id, { ...q });
  return out;
}
function meaningful(g) {
  if (g.boss.id === "lantern-warden")
    return g.signatures.some((s) => s.phase === "warning");
  return [...snapshot(g)].some(
    ([key, q]) =>
      !key.startsWith("cue:") ||
      (!q.kind.endsWith("-walk") &&
        !q.kind.endsWith("-patrol") &&
        ![
          "sack",
          "small-motion",
          "service-prop",
          "district-prop",
          "raid-prop",
          "endless-prop",
          "early-prop",
          "small-prop",
        ].includes(q.kind)),
  );
}
function setup(boss, difficulty, variant, phase) {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: boss.id,
      openingArenaId: boss.preferredArena,
      difficulty,
      seed: 829,
    },
    "Mara",
    "soldier",
    variant,
  );
  g.start();
  g.boss.deadline = 1e9;
  g.boss.phase = phase;
  const phases = encounterPhases(boss.id, g.boss.variant);
  g.boss.health =
    g.boss.maxHealth *
    ((phases[phase].healthThreshold + phases[phase + 1].healthThreshold) / 2);
  if (phase) {
    g.attackAt = phases[phase].attacks.map((_, i) => 45 + i * 38);
    if (boss.id === "lantern-warden") g.resetWarden();
  }
  for (const p of g.players.values()) p.invulnerableUntil = 1e9;
  return g;
}
function step(g) {
  g.step();
  ticks++;
  peakCues = Math.max(peakCues, g.bossCues().length);
}
for (const boss of data.bosses)
  for (const difficulty of data.difficulties) {
    const forms = [
      ...new Set(
        ["normal", "brutal", "crazed"].map((v) =>
          encounterVariant(difficulty.id, v),
        ),
      ),
    ];
    for (const form of forms) {
      const phases = encounterPhases(boss.id, form);
      for (let phase = 0; phase < phases.length - 1; phase++) {
        const control = setup(boss, difficulty.id, form, phase),
          cases = Array.from({ length: 4 }, () => ({
            g: setup(boss, difficulty.id, form, phase),
            tracked: null,
            at: 0,
            checked: 0,
            lost: [],
            changed: [],
            assist: false,
            warden: false,
          }));
        for (let i = 0; i < 2200 && !meaningful(control); i++) {
          step(control);
          for (const c of cases) step(c.g);
        }
        assert(
          meaningful(control),
          "No attack witness " + boss.id + "/" + form + "/" + phase,
        );
        const initial = snapshot(control),
          start = control.combatTick;
        let release = Math.min(
          ...[...initial.values()].map((q) => q.at).filter((t) => t > start),
        );
        if (boss.id === "lantern-warden") {
          const s = control.signatures[0];
          release = start + Math.max(1, 36 - s.phaseTick);
        }
        if (!Number.isFinite(release)) release = start + 15;
        const moments = [
          start,
          Math.max(start, release - 1),
          release,
          release + 12,
        ];
        let end = Math.max(...moments) + 180;
        while (control.combatTick <= end) {
          const before = snapshot(control),
            priorSignatures = structuredClone(control.signatures);
          for (let i = 0; i < cases.length; i++) {
            const c = cases[i];
            if (control.combatTick === moments[i]) {
              assert.equal(c.g.boss.phase, phase);
              c.tracked = new Set(before.keys());
              c.at = control.combatTick + 1;
              c.g.boss.health =
                c.g.boss.maxHealth *
                (phases[phase + 1].healthThreshold - 0.001);
              c.warden = priorSignatures.some((s) => s.phase !== "rest");
            }
          }
          step(control);
          const expected = snapshot(control);
          for (const c of cases) {
            step(c.g);
            if (!c.tracked) continue;
            if (c.g.boss.phase !== phase + 1)
              faults.push({
                boss: boss.id,
                difficulty: difficulty.id,
                form,
                phase,
                reason: "Phase did not advance",
                at: c.g.combatTick,
              });
            if (c.at === c.g.combatTick) c.assist = !!c.g.accord;
            const actual = snapshot(c.g);
            c.checked++;
            comparisons++;
            for (const key of c.tracked) {
              const want = expected.get(key),
                got = actual.get(key);
              if (!want) continue;
              items++;
              if (!got) {
                if (!c.lost.includes(key)) c.lost.push(key);
                continue;
              }
              // Release deadlines and issued damage do not change when the phase changes.
              for (const prop of [
                "at",
                "until",
                "damage",
                "potency",
                "expires",
                "speed",
              ])
                if (
                  want[prop] !== undefined &&
                  got[prop] !== want[prop] &&
                  !c.changed.some((q) => q.key === key && q.prop === prop)
                )
                  c.changed.push({
                    key,
                    prop,
                    want: want[prop],
                    got: got[prop],
                  });
            }
            if (
              c.warden &&
              control.signatures.some((s) => s.phase === "active") &&
              c.g.combatTick < c.at + 100
            )
              if (
                JSON.stringify(control.signatures) !==
                JSON.stringify(c.g.signatures)
              )
                faults.push({
                  boss: boss.id,
                  difficulty: difficulty.id,
                  form,
                  phase,
                  reason: "Committed Warden sweep changed",
                  at: c.g.combatTick,
                });
          }
        }
        for (let i = 0; i < cases.length; i++) {
          const c = cases[i];
          const row = {
            boss: boss.id,
            difficulty: difficulty.id,
            form,
            from: phase,
            to: phase + 1,
            moment: ["warning", "before-release", "release", "active"][i],
            transitionAt: c.at,
            checked: c.checked,
            assist: c.assist,
            lost: c.lost,
            changed: c.changed,
          };
          rows.push(row);
        }
      }
    }
    if (rows.length && rows.length % 500 === 0)
      console.log(
        JSON.stringify({ progress: boss.id, cases: rows.length, ticks }),
      );
  }
const report = {
  passed:
    rows.every((r) => !r.lost.length && !r.changed.length) && !faults.length,
  kind: "Actual Game legal-phase carryover matrix with controlled phase seeding",
  baseHead: result.stdout.trim(),
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  runtimeSourceSha256,
  cases: rows.length,
  gameTicks: ticks,
  comparisonTicks: comparisons,
  trackedItemComparisons: items,
  peakCues,
  casesWithLostWork: rows.filter((r) => r.lost.length).length,
  casesWithChangedLocks: rows.filter((r) => r.changed.length).length,
  faults: faults.slice(0, 100),
  rows,
  limits: [
    "All 66 identities, every global difficulty, each distinct effective form and each legal phase boundary on its preferred arena; the separate first-entry matrix also covers all requested-form mappings.",
    "Four transitions per boundary: first warning, just before release, release and twelve ticks into travel. Each witness is followed for at least180ticks (sixseconds at30Hz), comparing the continuing no-transition control.",
    "Stationary invulnerable real-Game samples verify continuing identities, release deadlines and damage locks, not human clears, all routes, rendered balance, device/WAN or performance acceptance.",
    "Each phase is seeded before its first casts using actual Game owners; this matrix does not substitute for continuous full-progression endurance or exact child-effect/damage/prediction/network regressions.",
  ],
};
assert.equal(
  runtimeHash(),
  runtimeSourceSha256,
  "Runtime source changed while the matrix ran",
);
const dest = process.argv[2] ? path.resolve(process.argv[2]) : path.join(
  root,
  "reviews/phase-continuity-2026-10-28",
  "matrix-" + run + ".json",
);
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...report, rows: undefined }));
if (!report.passed) process.exitCode = 1;
