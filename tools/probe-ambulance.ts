import fs from "node:fs";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import {
  CONTENT_REVISION,
  PROTOCOL,
  type BossVariant,
} from "../src/shared/protocol.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
const rows: unknown[] = [];
let ticks = 0,
  peakBursts = 0,
  peakHostiles = 0,
  patrolTicks = 0,
  stationaryPatrolTicks = 0,
  patrolWarningVertices = 0;
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties)
    for (const form of ["normal", "brutal", "crazed"] as BossVariant[])
      for (const phase of [0, 1]) {
        const g = createPracticeGame(
          {
            mode: "endless",
            openingBossId: "black-ambulance",
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
          radius = data.bosses.find((b) => b.id === "black-ambulance")!.radius;
        let liveBursts = 0,
          hostiles = 0,
          patrol = 0,
          stalled = 0,
          driver = 0,
          moved = 0;
        const ids = new Set<number>(),
          drivers = new Set<number>(),
          patrolIds = new Set<number>(),
          origin = { x: g.boss.x, y: g.boss.y };
        for (let i = 0; i < 1800 && g.phase === "combat"; i++) {
          const old = { x: g.boss.x, y: g.boss.y };
          g.step();
          ticks++;
          const boss = g.boss;
          if (
            boss.x - radius < b.x - 0.01 ||
            boss.x + radius > b.x + b.width + 0.01 ||
            boss.y - radius < b.y - 0.01 ||
            boss.y + radius > b.y + b.height + 0.01
          )
            throw Error("Body outside offset arena: " + map.id);
          if (
            g.arena.obstacles.some((o) =>
              segmentRect(boss, boss, o, radius - 0.2),
            )
          )
            throw Error("Body overlaps actual masonry: " + map.id);
          if (distance(old, boss) > 600 / 30 + 0.02)
            throw Error("Movement exceeds bounded body speed");
          moved = Math.max(moved, distance(origin, boss));
          const cues = g.bossCues(),
            p = cues.find((q) => q.kind === "ambulance-patrol");
          if(p?.kind==='ambulance-patrol'&&!patrolIds.has(p.id)){
            patrolIds.add(p.id);
            for(let i=0;i<p.path.length;i++){
              const point=p.path[i];patrolWarningVertices++;
              if(point.x-radius<b.x-.01||point.x+radius>b.x+b.width+.01||point.y-radius<b.y-.01||point.y+radius>b.y+b.height+.01)throw Error('Patrol warning outside offset bounds');
              if(g.arena.obstacles.some(o=>segmentRect(i?p.path[i-1]:point,point,o,radius-.2)))throw Error('Patrol warning crosses cover');
            }
          }
          if (p?.kind === "ambulance-patrol" && g.combatTick >= p.moveAt) {
            patrol++;
            if (distance(old, boss) < 0.01) stalled++;
          }
          for (const q of cues) {
            if (q.kind === "ambulance-lane") {
              ids.add(q.id);
              if (q.at - q.beganAt < 42) throw Error("Incomplete road warning");
              if (
                g.arena.obstacles.some((o) =>
                  segmentRect(
                    { x: q.x1, y: q.y1 },
                    { x: q.x2, y: q.y2 },
                    o,
                    radius - 0.2,
                  ),
                )
              )
                throw Error("Warned road crosses cover");
            }
            if (q.kind === "driver") drivers.add(q.id);
            if (q.kind === "ambulance-burst" && q.at - q.beganAt < 38)
              throw Error("Incomplete door warning");
          }
          liveBursts = Math.max(
            liveBursts,
            cues.filter((q) => q.kind === "ambulance-burst").length,
          );
          hostiles = Math.max(
            hostiles,
            [...g.shots.values()].filter((s) => s.owner === "hostile").length,
          );
        }
        driver = drivers.size;
        if (!ids.size || !driver || moved < 32)
          throw Error(
            "Sequence did not execute: " +
              map.id +
              "/" +
              difficulty.id +
              "/" +
              form +
              "/" +
              phase +
              " " +
              JSON.stringify({
                driver,
                lanes: ids.size,
                moved,
                gamePhase: g.phase,
                bossPhase: g.boss.phase,
                tick: g.combatTick,
                cues: g.bossCues(),
              }),
          );
        peakBursts = Math.max(peakBursts, liveBursts);
        peakHostiles = Math.max(peakHostiles, hostiles);
        patrolTicks += patrol;
        stationaryPatrolTicks += stalled;
        rows.push({
          map: map.id,
          difficulty: difficulty.id,
          requestedForm: form,
          effectiveForm: g.boss.variant,
          phase,
          dispatches: ids.size,
          driverWindows: driver,
          patrolTicks: patrol,
          stationaryPatrolTicks: stalled,
          maximumDisplacement: moved,
          peakBursts: liveBursts,
          peakHostiles: hostiles,
        });
      }
const report = {
  passed: true,
  protocol: PROTOCOL,
  contentRevision: CONTENT_REVISION,
  cases: rows.length,
  observedTicks: ticks,
  peakBursts,
  peakHostiles,
  patrolTicks,
  stationaryPatrolTicks,
  patrolWarningVertices,
  rows,
  limits: [
    "Actual-Game stationary invulnerable mechanics sequences. No played clear, rendered, final balance or physical-device/native-language/listening/WAN/capacity acceptance.",
    "Full offset bounds are used. The earlier false outside result compared only dimensions and is explicitly rejected.",
  ],
};
fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...report, rows: undefined }));
