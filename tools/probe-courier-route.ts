import { createPracticeGame } from "../src/shared/practice-start.ts";
import { Game, data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import { segmentRect, distance } from "../src/shared/geometry.ts";
import { PROTOCOL, CONTENT_REVISION, HZ } from "../src/shared/protocol.ts";
import { writeFileSync } from "node:fs";
let combinations = 0,
  ticks = 0,
  peakHostiles = 0;
const rows: object[] = [];
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties)
    for (const selectedForm of ["normal", "brutal", "crazed"] as const)
      for (const phase of [0, 1]) {
        const g = createPracticeGame(
          {
            openingBossId: "courier",
            openingArenaId: map.id,
            difficulty: difficulty.id,
            mode: "endless",
            seed: 981,
          },
          "Route audit",
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
        // Exercise route behavior without letting the optional Baby/Easy circle event pause this sample.
        g.accord = null;
        const expected =
            (phase ? 2 : 1) + (g.boss.variant === "normal" ? 0 : 1),
          legIds = new Set<number>();
        let began = false,
          finished = false,
          dispatch = false,
          observed = 0;
        for (; observed < 1800; observed++) {
          const old = { x: g.boss.x, y: g.boss.y };
          g.step();
          g.drainEvents();
          ticks++;
          const route = g.director.courier;
          if (route.busy) began = true;
          const b = g.arena.bounds,
            r = data.bosses.find((b) => b.id === "courier")!.radius;
          if (
            g.boss.x < b.x + r - 0.01 ||
            g.boss.x > b.x + b.width - r + 0.01 ||
            g.boss.y < b.y + r - 0.01 ||
            g.boss.y > b.y + b.height - r + 0.01
          )
            throw Error("Courier body left actual bounds: " + map.id);
          if (distance(old, g.boss) > 600 / HZ + 0.01)
            throw Error("Courier exceeded movement cap");
          for (const c of g.director.cues()) {
            if (c.kind === "charge") {
              legIds.add(c.id);
              if (
                g.obstacles.some(
                  (o) =>
                    segmentRect(
                      { x: c.x1, y: c.y1 },
                      { x: c.x2, y: c.y2 },
                      o,
                      r,
                    ) !== null,
                )
              )
                throw Error("Warning crosses masonry: " + map.id);
            }
            if (c.kind === "courier-dispatch") {
              dispatch = true;
              if (c.angles.length !== (phase ? 12 : 8))
                throw Error("Dispatch count mismatch");
            }
          }
          peakHostiles = Math.max(
            peakHostiles,
            [...g.shots.values()].filter((s) => s.owner === "hostile").length,
          );
          if (began && !route.busy) {
            finished = true;
            break;
          }
        }
        if (
          !finished ||
          legIds.size !== expected ||
          dispatch !== (g.boss.variant !== "normal")
        )
          throw Error(
            JSON.stringify({
              map: map.id,
              difficulty: difficulty.id,
              selectedForm,
              actual: g.boss.variant,
              phase,
              finished,
              legs: legIds.size,
              expected,
              dispatch,
            }),
          );
        rows.push({
          map: map.id,
          difficulty: difficulty.id,
          selectedForm,
          actualForm: g.boss.variant,
          phase,
          legs: legIds.size,
          dispatch,
          ticks: observed + 1,
        });
        combinations++;
      }
const report = {
  passed: true,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  combinations,
  observedTicks: ticks,
  peakHostileProjectiles: peakHostiles,
  rows,
  limits: [
    "Automated first complete route per map/difficulty/selected form/phase; no rendered, physical-device, listening, native-language or final human balance acceptance.",
    "Optional Baby/Easy Standard phase-circle event removed from these route-only samples; dedicated tests separately cover real successful assistance.",
    "No FPS, GPU, WAN, full-fight endurance or multiplayer capacity claim.",
  ],
};
writeFileSync(
  "reviews/courier-route-2026-10-26/all-route-geometry.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, rows: undefined }));
