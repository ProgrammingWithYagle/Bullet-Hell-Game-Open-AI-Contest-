// Reproducible authority fixture. No rendered FPS, outgoing fanout or host-capacity claim.
import fs from "node:fs";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { Game, data } from "../src/shared/game.ts";
import {
  idleInput,
  CONTENT_REVISION,
  PROTOCOL,
} from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import { bossFloorPosition } from "../src/shared/boss-body-bounds.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
const output = process.argv[2];
assert(
  /^reviews\/ranger-2026-11-02\/performance-[a-z0-9-]+\.json$/.test(
    output ?? "",
  ),
);
assert(!fs.existsSync(output), "Preserve earlier performance evidence");
const percentile = (v: number[], p: number) =>
  v.toSorted((a, b) => a - b)[Math.min(v.length - 1, Math.floor(v.length * p))];
const rows: Record<string, number | string | boolean>[] = [];
for (const arena of ["gatehouse", "triage-yard"])
  for (const count of [1, 8, 50])
    for (const ordinary of [0, 60]) {
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
          "ranger-owner-" + i,
          "Synthetic Ranger " + i,
          "ranger",
        );
        p.totalSp = 27;
        p.coins = p.incomeGranted = 5000;
        for (const lane of [0, 2])
          for (const n of data.skills
            .filter(
              (n) =>
                n.classId === "ranger" &&
                n.branchId === "fieldcraft" &&
                n.lane === lane &&
                n.depth <= (lane === 0 ? 3 : 6),
            )
            .sort((a, b) => a.depth - b.depth))
            assert(
              g.transact(p.id, { id: n.id, kind: "skill", item: n.id }).ok,
            );
        assert(
          g.transact(p.id, { id: "bow", kind: "weapon", item: "ranger-3" }).ok,
        );
        for (const id of ["damage", "fire-rate"])
          for (let j = 0; j < 5; j++)
            assert(
              g.transact(p.id, { id: id + j, kind: "upgrade", item: id }).ok,
            );
      }
      assert(g.start());
      g.boss.health = g.boss.maxHealth = 1e9;
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      const first = [...g.players.values()][0],
        radius = data.bosses.find((b) => b.id === g.boss.id)!.radius;
      const candidates = Array.from({ length: 32 }, (_, i) => {
        const a = (i * Math.PI) / 16;
        return bossFloorPosition(
          g.boss.id,
          { x: first.x + Math.cos(a) * 320, y: first.y + Math.sin(a) * 320 },
          radius,
          g.arena.bounds,
          g.obstacles,
        );
      });
      const position = candidates.find(
        (p) =>
          distance(p, first) >= 240 &&
          !g.obstacles.some((w) => segmentRect(first, p, w, 3)),
      );
      assert(position, "The covered map needs a legal finite bow lane");
      g.boss.x = position.x;
      g.boss.y = position.y;
      for (let round = 0; round < 4; round++) {
        for (const p of g.players.values()) {
          const c = Reflect.get(g, "rangerContext").call(g),
            o = Reflect.get(g, "rangerOptions").call(g, p);
          const aim = Array.from(
            { length: 16 },
            (_, i) => -Math.PI + (i * Math.PI) / 8,
          ).find((a) => g.ranger.canCast({ ...p, aim: a }, "e", c, o));
          assert(aim !== undefined, "No legal cable from the actual spawn");
          g.submitInput(p.id, {
            ...idleInput(),
            sequence: p.ack + 1,
            aim,
            e: true,
          });
        }
        g.step();
        assert(
          [...g.players.values()].every(
            (p) => g.kitStatus(p.id).rangerTraps === round + 1,
          ),
          JSON.stringify({
            arena,
            count,
            ordinary,
            round,
            boss: { x: g.boss.x, y: g.boss.y },
            players: [...g.players.values()]
              .slice(0, 8)
              .map((p) => ({
                id: p.id,
                x: p.x,
                y: p.y,
                aim: p.aim,
                lines: g.kitStatus(p.id).rangerTraps,
                eAt: p.eAt,
                tick: g.combatTick,
              })),
          }),
        );
        if (round < 3)
          while (
            g.combatTick <
            Math.max(...[...g.players.values()].map((p) => p.eAt))
          )
            g.step();
      }
      for (const p of g.players.values())
        g.submitInput(p.id, {
          ...idleInput(),
          sequence: p.ack + 1,
          aim: p.aim,
          ultimate: true,
        });
      g.step();
      for (let i = 0; i < ordinary; i++) {
        const candidate = bossFloorPosition(
          g.boss.id,
          {
            x: position.x + ((i % 6) - 3) * 12,
            y: position.y + Math.floor(i / 6) * 8,
          },
          10,
          g.arena.bounds,
          g.obstacles,
        );
        assert(
          g.spawnMinion({
            kind: "ordinary",
            ...candidate,
            health: 1e6,
            speed: 0,
            radius: 10,
            damage: 0,
            lifeSeconds: 1200,
          }),
        );
      }
      const samples: number[] = [],
        views: number[] = [];
      let maxGround = 0,
        maxCues = 0,
        maxCueBytes = 0,
        maxViewBytes = 0,
        maxLines = 0;
      const before = [...g.players.values()].reduce(
        (n, p) => n + p.damageDealt,
        0,
      );
      for (let tick = 0; tick < 60; tick++) {
        for (const p of g.players.values())
          g.submitInput(p.id, {
            ...idleInput(),
            sequence: p.ack + 1,
            aim: Math.atan2(g.boss.y - p.y, g.boss.x - p.x),
            fire: true,
          });
        let at = performance.now();
        g.step();
        samples.push(performance.now() - at);
        at = performance.now();
        const view = viewOf(g, first.id);
        views.push(performance.now() - at);
        const ground = view.classCues.filter(
          (c) => c.kind === "ranger-trap" || c.kind === "ranger-survey",
        );
        maxGround = Math.max(maxGround, ground.length);
        maxCues = Math.max(maxCues, view.classCues.length);
        maxLines = Math.max(
          maxLines,
          ground.filter((c) => c.kind === "ranger-trap").length,
        );
        maxCueBytes = Math.max(
          maxCueBytes,
          Buffer.byteLength(JSON.stringify(view.classCues)),
        );
        maxViewBytes = Math.max(
          maxViewBytes,
          Buffer.byteLength(JSON.stringify(view)),
        );
      }
      const actualDamage =
        [...g.players.values()].reduce((n, p) => n + p.damageDealt, 0) - before;
      assert(actualDamage > 0, "The fixture must execute real damaging arrows");
      assert.equal(maxLines, count * 4);
      assert.equal(maxGround, count * 5);
      rows.push({
        arena,
        players: count,
        ordinary,
        measuredTicks: 60,
        ownedTriplinesAtPeak: maxLines,
        groundCuesAtPeak: maxGround,
        maxClassCues: maxCues,
        rawClassCueJsonBytes: maxCueBytes,
        rawViewJsonBytes: maxViewBytes,
        actualCreditedDamage: actualDamage,
        meanStepMs: samples.reduce((n, v) => n + v, 0) / samples.length,
        p95StepMs: percentile(samples, 0.95),
        p99StepMs: percentile(samples, 0.99),
        maxStepMs: Math.max(...samples),
        p95ViewMs: percentile(views, 0.95),
      });
    }
const report = {
  checkedAt: new Date().toISOString(),
  passed: true,
  contentRevision: CONTENT_REVISION,
  protocol: PROTOCOL,
  rows,
  conditions: {
    maps: 2,
    rosters: [1, 8, 50],
    ordinaryActors: [0, 60],
    legalSkillBudget: 27,
    syntheticEquipmentWallet: 5000,
    bossCastingHeld: true,
    playersInvulnerable: true,
    ordinarySpeed: 0,
    ordinaryDamage: 0,
    measuredTicksPerCase: 60,
    realArrowAttacks: true,
    legalCooldownWarmup: true,
  },
  limits: [
    "Authority CPU and raw diagnostic JSON only. No rendered clients, encoded Colyseus transport, outbound fanout, WAN, device, human, balance, hostile-pressure or free-host capacity acceptance.",
    "The short window captures the real four-cable overlap after legal cooldown warmup. The first cable later expires normally; no lifetime extension or fabricated fourth cast is used.",
    "Raw JSON sizes are diagnostic view/class-cue strings, not measured network traffic or a bandwidth claim.",
  ],
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
