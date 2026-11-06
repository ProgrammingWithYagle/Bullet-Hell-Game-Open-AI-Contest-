import {
  ClerkAppeal,
  clerkAppealRules as r,
} from "../src/shared/clerk-appeal.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { runtimeArena, runtimeArenas } from "../src/shared/arena-layouts.ts";
import { data } from "../src/shared/game.ts";
import { segmentRect, distance } from "../src/shared/geometry.ts";
import { CONTENT_REVISION, PROTOCOL } from "../src/shared/protocol.ts";
import { writeFileSync } from "node:fs";
let samples = 0,
  fanRoutes = 0,
  extendedBeyondMinimum = 0,
  minMargin = 1e9,
  maxCrazed = 0;
const rows: object[] = [];
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties) {
    const a = runtimeArena(map.id, difficulty.id),
      b = a.bounds;
    let cases = 0;
    for (const nx of [0.15, 0.5, 0.85])
      for (const ny of [0.25, 0.5, 0.75]) {
        const p = {
          id: "p",
          x: b.x + b.width * nx,
          y: b.y + b.height * ny,
          oldX: 0,
          oldY: 0,
        };
        p.oldX = p.x;
        p.oldY = p.y;
        if (a.obstacles.some((o) => segmentRect(p, p, o, 9))) continue;
        for (const form of ["normal", "brutal", "crazed"] as const)
          for (const phase of [0, 1]) {
            const random =
                form === "crazed" || (form === "brutal" && phase > 0),
              count = r.stampCounts[form];
            for (let choice = 0; choice < (random ? count : 1); choice++) {
              const d = new ClerkAppeal();
              let id = 0;
              const c: SignatureContext = {
                tick: 0,
                bossId: "quarantine-clerk",
                boss: { ...a.bossSpawn },
                radius: 58,
                targets: [p],
                aimTargets: [p],
                obstacles: a.obstacles,
                bounds: b,
                hazardCircles: a.lavaPits,
                phase,
                variant: form,
                brutal: form !== "normal",
                damageScale: 1,
                id: () => ++id,
                random: () => (choice + 0.5) / count,
                damage: () => {},
                spawnRat: () => {},
              };
              if (!d.cast(c, p, { speed: 0, damage: 10, telegraph: 1.3 }))
                throw Error("Cast omitted");
              while (!d.cues().some((s) => s.kind === "stamp")) {
                c.tick++;
                d.step(c);
                if (c.tick > 300) throw Error("No complete field");
              }
              const stamps = d.cues().filter((s) => s.kind === "stamp"),
                safe = stamps.find((s) => s.safeAt > 0)!;
              if (stamps.length !== count || !safe)
                throw Error("Incomplete field");
              const expected = random ? choice + 1 : phase ? 3 : 1;
              if (safe.index !== expected)
                throw Error("Choice not authoritative");
              if (stamps.some((s) => s.at <= c.tick))
                throw Error("Unwarned strike");
              for (const s of stamps) {
                if (
                  a.obstacles.some((o) => segmentRect(s, s, o, s.radius + 10))
                )
                  throw Error("Seal overlaps masonry");
                if (
                  a.lavaPits.some(
                    (l) => distance(s, l) <= s.radius + l.radius + 10,
                  )
                )
                  throw Error("Seal overlaps lava");
              }
              const minimum = Math.ceil(r.shelterSeconds[form] * 30);
              if (form !== "normal") {
                if (safe.until - safe.safeAt < minimum)
                  throw Error("Short shelter");
                if (safe.until - safe.safeAt > minimum) extendedBeyondMinimum++;
                const multiplier =
                  form === "crazed"
                    ? data.rules.crazed.projectileMultiplier
                    : data.rules.brutal.projectileMultiplier;
                const lastDelay = Math.ceil(
                  (data.rules.brutal.echoDelaySeconds +
                    (Math.ceil(multiplier) - 2) *
                      data.rules.brutal.echoWaveSpacingSeconds) *
                    30,
                );
                for (const fan of d
                  .cues()
                  .filter((s) => s.kind === "clerk-volley")) {
                  const travel = Math.ceil(
                    (Math.max(
                      0,
                      Math.hypot(fan.x - safe.x, fan.y - safe.y) -
                        safe.radius -
                        r.volleyRadius,
                    ) /
                      fan.speed) *
                      30,
                  );
                  const margin = safe.until - (fan.at + lastDelay + travel);
                  if (margin < 15)
                    throw Error("Final echo outlives shelter exit margin");
                  minMargin = Math.min(minMargin, margin);
                  fanRoutes++;
                }
              } else if (safe.until - safe.safeAt !== 75)
                throw Error("Standard timing changed");
              if (form === "crazed")
                maxCrazed = Math.max(maxCrazed, safe.until - safe.safeAt);
              samples++;
              cases++;
            }
          }
      }
    rows.push({ map: map.id, difficulty: difficulty.id, cases });
  }
if (samples !== 8092)
  throw Error("Unexpected target/choice coverage " + samples);
const report = {
  passed: true,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  samples,
  validMapTargets: 289,
  fanRoutes,
  minimumMarginTicks: minMargin,
  extendedBeyondMinimum,
  maxCrazedShelterTicks: maxCrazed,
  rows,
  limits: [
    "Actual controller warnings and every numbered choice at sampled valid map targets; not rendered, human balance, FPS, WAN or device acceptance.",
    "Latest echo uses the maximum possible rational-budget wave; obstacle absorption and cancellations may reduce actual arrivals.",
  ],
};
writeFileSync(
  "reviews/clerk-venom-2026-10-27/random-shelter.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, rows: undefined }));
