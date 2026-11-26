// Reproducible local simulation fixture; not rendered FPS, player balance or host capacity.
import fs from "node:fs";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { Game, data } from "../src/shared/game.ts";
import { CONTENT_REVISION, PROTOCOL } from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import { bossFloorPosition } from "../src/shared/boss-body-bounds.ts";
const output = process.argv[2];
assert(
  /^reviews\/summoner-2026-11-01\/performance-[a-z0-9-]+\.json$/.test(
    output ?? "",
  ),
);
assert(!fs.existsSync(output), "Preserve earlier performance evidence");
const rows: Record<string, number | string | boolean>[] = [];
const percentile = (v: number[], p: number) =>
  v.toSorted((a, b) => a - b)[Math.min(v.length - 1, Math.floor(v.length * p))];
for (const arena of ["gatehouse", "triage-yard"])
  for (const count of [1, 8, 50])
    for (const army of [false, true]) {
      const g = new Game({
        mode: "endless",
        maxPlayers: 50,
        seed: 41,
        openingArenaId: arena,
        arenaSelection: "fixed",
      });
      g.testingModified = true;
      for (let i = 0; i < count; i++) {
        const p = g.addPlayer(
          "owner-" + i,
          "Synthetic Summoner " + i,
          "summoner",
        );
        p.totalSp = 27;
        for (const s of data.skills.filter(
          (s) =>
            s.classId === "summoner" && s.subbranchId === "bonds-foundation",
        ))
          assert(g.transact(p.id, { id: s.id, kind: "skill", item: s.id }).ok);
      }
      assert(g.start());
      g.boss.health = g.boss.maxHealth = 1e9;
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      const definition = data.bosses.find((b) => b.id === g.boss.id)!,
        position = bossFloorPosition(
          g.boss.id,
          { x: g.arena.playerSpawn.x - 220, y: g.arena.playerSpawn.y - 100 },
          definition.radius,
          g.arena.bounds,
          g.obstacles,
        );
      g.boss.x = position.x;
      g.boss.y = position.y;
      for (const p of g.players.values()) {
        p.invulnerableUntil = 1e9;
        if (army) {
          for (let i = 0; i < 3; i++) {
            p.qAt = 0;
            (Reflect.get(g, "ability") as Function).call(g, p, "q");
          }
          (Reflect.get(g, "ability") as Function).call(g, p, "ultimate");
        }
      }
      const entities = g.retinue.entities.size;
      assert.equal(entities, army ? count * 8 : 0);
      const samples: number[] = [],
        snapshots: number[] = [];
      for (let i = 0; i < 150; i++) {
        const start = performance.now();
        g.step();
        samples.push(performance.now() - start);
        if (i % 15 === 0) {
          const began = performance.now();
          viewOf(g, "owner-0");
          snapshots.push(performance.now() - began);
        }
      }
      assert.equal(g.retinue.entities.size, entities);
      if (army)
        assert(
          g.boss.health < g.boss.maxHealth,
          "The populated fixture must exercise actual attacks",
        );
      rows.push({
        arena,
        players: count,
        entities,
        army,
        ticks: 150,
        stepMeanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
        stepP95Ms: percentile(samples, 0.95),
        stepP99Ms: percentile(samples, 0.99),
        stepMaxMs: Math.max(...samples),
        localViewP95Ms: percentile(snapshots, 0.95),
        bossDamage: g.boss.maxHealth - g.boss.health,
      });
    }
const result = {
  createdAt: new Date().toISOString(),
  contentRevision: CONTENT_REVISION,
  protocol: PROTOCOL,
  kind: "Local synthetic retinue simulation and snapshot timing",
  rows,
  allEntitiesRemainWithinBudget: true,
  limits: [
    "150ticks per case, two actual covered maps,1/8/50real player records with0or8owned entities each. Boss casting is held to retain the full worst-case population; ordinary mobs and hostile projectile pressure are excluded.",
    "Setup uses legal21SP Bonds foundation prefixes inside a testing-modified late-budget fixture. It is not an earned route clear or a human balance witness.",
    "Timings are local to this machine and include cold paths. They do not measure browser rendering, encoded transport, actual client fanout, production/free-host capacity or physical devices.",
    "No threshold is used to label performance accepted. Investigate the worst populated cases before claiming readiness.",
  ],
};
fs.mkdirSync("reviews/summoner-2026-11-01", { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    output,
    rows: rows.length,
    worst: rows
      .toSorted((a, b) => Number(b.stepP99Ms) - Number(a.stepP99Ms))
      .slice(0, 3),
  }),
);
