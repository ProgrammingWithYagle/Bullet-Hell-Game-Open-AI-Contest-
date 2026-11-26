import fs from "node:fs";
import { widowLayout, ejectClosingGates } from "../src/shared/widow-gates.ts";
import { clerkStampCenters } from "../src/shared/clerk-placement.ts";
import { runtimeArena, runtimeArenas } from "../src/shared/arena-layouts.ts";
import { data } from "../src/shared/game.ts";
import { segmentRect } from "../src/shared/geometry.ts";
import { CONTENT_REVISION, PROTOCOL } from "../src/shared/protocol.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
let cases = 0,
  ejections = 0,
  disconnected = 0;
const failures: unknown[] = [];
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties) {
    const a = runtimeArena(map.id, difficulty.id),
      b = a.bounds,
      targets = [
        a.playerSpawn,
        ...[0.15, 0.5, 0.85].flatMap((x) =>
          [0.15, 0.5, 0.85].map((y) => ({
            x: b.x + x * b.width,
            y: b.y + y * b.height,
          })),
        ),
      ].filter((p) => !a.obstacles.some((o) => segmentRect(p, p, o, 9)));
    for (const target of targets)
      for (const axis of ["horizontal", "vertical"] as const)
        for (let lane = 0; lane < 3; lane++) {
          let id = 0;
          const c: SignatureContext = {
            tick: 1,
            bossId: "gate-widow",
            boss: { ...a.bossSpawn },
            radius: 58,
            targets: [{ id: "p", ...target, oldX: target.x, oldY: target.y }],
            obstacles: a.obstacles,
            bounds: b,
            hazardCircles: a.lavaPits,
            phase: 0,
            brutal: false,
            id: () => ++id,
            damage: () => {},
            spawnRat: () => {},
            damageScale: 1,
          };
          const l = widowLayout(c, axis, lane);
          cases++;
          if (!l) {
            failures.push({
              map: map.id,
              difficulty: difficulty.id,
              target,
              axis,
              lane,
              error: "no-layout",
            });
            continue;
          }
          const solids = l.gates.filter((_, n) => n !== l.openLane),
            start = ejectClosingGates(
              target,
              solids,
              9,
              a.obstacles,
              a.lavaPits,
            );
          const reachable =
            clerkStampCenters(
              b,
              [...a.obstacles, ...solids],
              start,
              [],
              [],
              9,
              1,
              30,
              (p) => Math.hypot(p.x - l.passage.x, p.y - l.passage.y) < 64,
            ).length > 0;
          if (!reachable) {
            disconnected++;
            failures.push({
              map: map.id,
              difficulty: difficulty.id,
              target,
              axis,
              lane,
              error: "no-connected-opening-on-body-grid",
              layout: l,
            });
          }
          for (const solid of solids)
            for (let x = solid.x; x <= solid.x + solid.width; x += 8)
              for (let y = solid.y; y <= solid.y + solid.height; y += 8) {
                const p = { x, y };
                if (
                  x < b.x + 9 ||
                  x > b.x + b.width - 9 ||
                  y < b.y + 9 ||
                  y > b.y + b.height - 9 ||
                  a.obstacles.some((o) => segmentRect(p, p, o, 9))
                )
                  continue;
                const q = ejectClosingGates(
                  p,
                  solids,
                  9,
                  a.obstacles,
                  a.lavaPits,
                );
                ejections++;
                const overlap = solids.some(
                  (r) =>
                    q.x > r.x - 9 &&
                    q.x < r.x + r.width + 9 &&
                    q.y > r.y - 9 &&
                    q.y < r.y + r.height + 9,
                );
                if (
                  overlap ||
                  a.obstacles.some((o) => segmentRect(q, q, o, 9)) ||
                  q.x < b.x + 9 ||
                  q.x > b.x + b.width - 9 ||
                  q.y < b.y + 9 ||
                  q.y > b.y + b.height - 9
                )
                  failures.push({
                    map: map.id,
                    difficulty: difficulty.id,
                    target,
                    axis,
                    lane,
                    error: "unsafe-ejection",
                    before: p,
                    after: q,
                    layout: l,
                  });
              }
        }
  }
const report = {
  passed: !failures.length,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  cases,
  ejections,
  disconnected,
  failures,
  limits: [
    "Actual current layout/ejection and a conservative body-grid opening route; not rendered, device, final balance or universal path proof.",
  ],
};
fs.writeFileSync(
  process.argv[2] ?? "reviews/widow-layouts.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, failures: failures.slice(0, 3) }));
if (failures.length) process.exitCode = 1;
