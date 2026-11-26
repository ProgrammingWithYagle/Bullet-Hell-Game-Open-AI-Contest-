import fs from "node:fs";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import {
  idleInput,
  HZ,
  CONTENT_REVISION,
  PROTOCOL,
} from "../src/shared/protocol.ts";
// Controlled common inputs and real damage/cover. No human clear or final balance verdict.
const rows = [];
for (const target of ["ordinary", "boss"] as const)
  for (const movement of ["hold", "relocate"] as const)
    for (const path of [
      "engineer-machinery-1",
      "engineer-traps-1",
      "engineer-builder-1",
    ]) {
      const g = new Game({
          mode: "endless",
          seed: 2209,
          arenaSelection: "fixed",
          openingArenaId: "gatehouse",
        }),
        p = g.addPlayer("p", "Tamsin", "engineer");
      const allies = [
        g.addPlayer("left", "North guard", "engineer"),
        g.addPlayer("right", "South guard", "engineer"),
      ];
      for (const item of ["engineer-constructs-1", path])
        assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
      g.start();
      g.obstacles.splice(0);
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      g.boss.health = g.boss.maxHealth = 100000;
      g.boss.x = target === "boss" ? 980 : 1250;
      g.boss.y = target === "boss" ? 600 : 200;
      p.x = p.oldX = 800;
      p.y = p.oldY = 600;
      p.aim = 0;
      allies.forEach((a, i) => {
        a.x = a.oldX = 800;
        a.y = a.oldY = i ? 680 : 520;
      });
      for (const member of g.players.values()) member.invulnerableUntil = 0;
      if (target === "ordinary")
        g.minions.spawn(
          900001,
          {
            kind: "ordinary",
            x: 920,
            y: 600,
            health: 100000,
            speed: 0,
            radius: 12,
            damage: 0,
          },
          0,
        );
      const health = new Map(
        [...g.players.values()].map((p) => [p.id, p.health + p.shield]),
      );
      const originalHit = g.classKits.hitConstruct.bind(g.classKits);
      let absorbed = 0,
        maxConstructs = 0,
        peakCharges = 0;
      g.classKits.hitConstruct = (id, damage) => {
        const body = g.classKits
          .constructs()
          .find((b) => b.id === id && b.owner === p.id);
        if (body) absorbed += Math.min(body.health, Math.max(0, damage));
        originalHit(id, damage);
      };
      for (let tick = 0; tick < 12 * HZ; tick++) {
        if (tick >= 2 * HZ && (tick - 2 * HZ) % (1.5 * HZ) === 0)
          for (const [i, y] of [520, 600, 680].entries()) {
            const id = 1000000 + tick * 3 + i;
            g.shots.set(id, {
              id,
              owner: "hostile",
              x: 1200,
              y,
              vx: -600,
              vy: 0,
              radius: 3,
              damage: 4,
              expires: g.combatTick + 6 * HZ,
              pierce: 0,
            });
          }
        g.submitInput(p.id, {
          ...idleInput(),
          sequence: tick + 1,
          aim: 0,
          q: tick === 0,
          moveY: movement === "relocate" && tick < 60 ? -1 : 0,
        });
        g.step();
        maxConstructs = Math.max(
          maxConstructs,
          g.classKits.constructs().filter((c) => c.owner === p.id).length,
        );
        peakCharges = Math.max(
          peakCharges,
          g
            .classCues()
            .filter(
              (c) =>
                c.kind === "engineer-charge" &&
                c.owner === p.id &&
                c.state !== "spent",
            ).length,
        );
      }
      const lost = (id: string) =>
        Math.max(
          0,
          health.get(id)! -
            g.players.get(id)!.health -
            g.players.get(id)!.shield,
        );
      rows.push({
        path,
        target,
        movement,
        seconds: 12,
        totalSp: p.totalSp,
        spentSp: p.skills.reduce((n, id) => n + g.skillCost(id), 0),
        ownedSkills: [...p.skills],
        ownedDamage: p.damageDealt,
        constructDamageAbsorbed: absorbed,
        ownerHealthAndShieldLost: lost(p.id),
        allyHealthAndShieldLost: allies.reduce((n, a) => n + lost(a.id), 0),
        maxConstructs,
        peakCharges,
        allAlive: [...g.players.values()].every((p) => p.status === "active"),
        allyDamageCredit: allies.reduce((n, a) => n + a.damageDealt, 0),
      });
    }
assert(
  rows.every(
    (r) =>
      r.totalSp === 3 &&
      r.spentSp === 3 &&
      r.allAlive &&
      r.allyDamageCredit === 0,
  ),
);
assert(
  rows
    .filter((r) => r.path === "engineer-builder-1")
    .every(
      (r) =>
        r.ownedDamage === 0 &&
        r.constructDamageAbsorbed > 0 &&
        r.allyHealthAndShieldLost === 0,
    ),
);
assert(
  rows
    .filter((r) => r.path === "engineer-traps-1")
    .every(
      (r) => r.maxConstructs === 0 && r.peakCharges === 1 && r.ownedDamage > 0,
    ),
);
assert(
  rows
    .filter((r) => r.path === "engineer-machinery-1" && r.movement === "hold")
    .every((r) => r.ownedDamage > 0),
);
const report = {
  passed: true,
  createdAt: new Date().toISOString(),
  contentRevision: CONTENT_REVISION,
  protocol: PROTOCOL,
  seed: 2209,
  rows,
  limits: [
    "Controlled actual Game simulation: three 3-SP Engineer entries, stationary high-health targets, no primary fire, boss attacks disabled, actual four-damage incoming lanes and real allied health. No invulnerability or altered combat clock.",
    "The fixed input policy illustrates sentry firing, prepared damage and cooperative cover. It does not rank overall power, measure an encounter clear, assess enjoyment or establish final balance.",
    "Late abilities, legal 27-SP alternatives, natural reward acquisition, real peers and optimized workers have separate focused checks. Human rendered/device/listening and full replay assessment remain open.",
  ],
};
const scope = "reviews/engineer-builder-2026-11-03";
fs.mkdirSync(scope, { recursive: true });
fs.writeFileSync(
  scope + "/entry-comparison.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    passed: report.passed,
    rows: rows.length,
    sample: rows.filter(
      (r) => r.target === "ordinary" && r.movement === "hold",
    ),
    limits: report.limits,
  }),
);
