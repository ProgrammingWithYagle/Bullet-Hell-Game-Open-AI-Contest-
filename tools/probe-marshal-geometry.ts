import {
  MarshalChains,
  marshalRules as r,
  marshalEnvelopeLength,
} from "../src/shared/marshal-chains.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { runtimeArena, runtimeArenas } from "../src/shared/arena-layouts.ts";
import { data } from "../src/shared/game.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import { CONTENT_REVISION, PROTOCOL } from "../src/shared/protocol.ts";
import { writeFileSync } from "node:fs";
const failures: object[] = [],
  rows: object[] = [];
let cases = 0,
  vertices = 0;
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties) {
    const a = runtimeArena(map.id, difficulty.id),
      b = a.bounds;
    let passed = 0;
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
            const d = new MarshalChains();
            let id = 0;
            const c: SignatureContext = {
              tick: 1,
              bossId: "chain-marshal",
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
              damage: () => {},
              spawnRat: () => {},
            };
            for (
              let n = 0;
              n < 300 && !d.cues().some((s) => s.kind === "chain");
              n++
            ) {
              d.step(c);
              c.tick++;
            }
            const chains = d.cues().filter((s) => s.kind === "chain");
            cases++;
            if (chains.length !== 2) {
              failures.push({
                map: map.id,
                difficulty: difficulty.id,
                form,
                phase,
                target: p,
                issue: "Incomplete pair",
              });
              continue;
            }
            for (const q of chains) {
              if (q.at - (c.tick - 1) < 42) throw Error("Short warning");
              if (a.obstacles.some((o) => segmentRect(q, q, o, q.radius + 10)))
                throw Error("Anchor overlaps cover");
              if (a.obstacles.some((o) => segmentRect(p, q, o, 3)))
                throw Error("Anchor cannot be shot from warned target");
              if (
                a.lavaPits.some(
                  (l) => distance(q, l) <= q.radius + l.radius + 10,
                )
              )
                throw Error("Anchor in lava");
              if (q.edge.length !== 76) throw Error("Unexpected warning bound");
              if (
                chains.some(
                  (other) =>
                    other.id !== q.id &&
                    distance(q, other) <= r.anchorSeparation,
                )
              )
                throw Error("Anchor pair too close");
              for (const point of q.edge) {
                if (Object.keys(point).sort().join(",") !== "x,y")
                  throw Error("Non-geometry data leaked");
                if (
                  point.x < b.x + 9 - 0.01 ||
                  point.y < b.y + 9 - 0.01 ||
                  point.x > b.x + b.width - 9 + 0.01 ||
                  point.y > b.y + b.height - 9 + 0.01
                )
                  throw Error("Warning leaves board");
                if (
                  a.obstacles.some((o) => {
                    const hit = segmentRect(q, point, o, 9);
                    return hit && hit.t < 0.9999;
                  })
                )
                  throw Error("Warning crosses cover");
                vertices++;
              }
              for (let n = 0; n <= 300; n++) {
                const theta = q.startAngle + (q.sweep * n) / 300,
                  length = marshalEnvelopeLength(q, theta);
                if (!Number.isFinite(length) || length < 0 || length > 610.001)
                  throw Error("Bad envelope intersection");
              }
            }
            passed++;
          }
      }
    rows.push({ map: map.id, difficulty: difficulty.id, passed });
    console.log(
      JSON.stringify({
        map: map.id,
        difficulty: difficulty.id,
        completedCases: cases,
        failures: failures.length,
      }),
    );
  }
const report = {
  passed: failures.length === 0,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  cases,
  vertices,
  failures,
  rows,
  limits: [
    "Actual controller placements/warnings at sampled map targets. Not rendered, device or human balance acceptance.",
  ],
};
writeFileSync(
  "reviews/shifting-writ-2026-10-27/geometry.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    ...report,
    rows: undefined,
    failures: failures.slice(0, 5),
  }),
);
if (!report.passed) process.exitCode = 1;
