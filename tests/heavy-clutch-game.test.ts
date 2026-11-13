import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import {
  traverseIds as ids,
  clutchId,
  heavyTraverseRules as r,
} from "../src/shared/heavy-traverse.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { clutchGameFixture as fixture } from "./helpers/heavy-clutch-game-fixture.ts";
function check(name: string, fn: () => unknown) {
  test("Feed Clutch: " + name, () => {
    fn();
  });
}
check(
  "actual source movement releases lifted walking immediately and real Braced Firing still applies its independent60percent speed",
  () => {
    const f = fixture("spade");
    f.step({ technique1: true, e: true });
    f.step({ technique2: true, moveY: 1 });
    assert(Math.abs(f.p.y - 603.8) < 1e-6);
    assert.equal(f.p.braceUntil, 151);
    assert.equal(f.status().heavyClutchLifted, true);
    assert.equal(f.p.ammo, 44);
    assert.equal(f.status().technique1At, 241);
    return { actualY: f.p.y, braceUntil: f.p.braceUntil, recovery: 241 };
  },
);
check(
  "actual reload, dodge and ultimate stop lifted future work while retaining paid flights and their original recovery",
  () => {
    const rows = [];
    for (const key of ["reload", "dodge", "ultimate"]) {
      const f = fixture();
      f.step({ technique1: true });
      const id = f.flights()[0].id;
      f.step({ technique2: true });
      f.step({ [key]: true });
      assert.equal(f.status().heavyTraverseUntil, 0);
      assert.equal(f.status().technique1At, 241);
      assert.equal(f.p.ammo, 44);
      assert(f.g.shots.has(id));
      rows.push({
        key,
        paidShotStillActual: true,
        recovery: 241,
        reloadAt: f.p.reloadAt,
        dashUntil: f.p.dashUntil,
        overdriveUntil: f.p.overdriveUntil,
      });
    }
    return rows;
  },
);
check(
  "actual early channel return cancels the lifted feed without refund or a delayed catch-up",
  () => {
    const f = fixture();
    f.step({ technique1: true });
    f.step({ technique2: true });
    f.p.channelUntil = 100;
    f.step();
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.p.ammo, 44);
    assert.equal(f.status().technique1At, 241);
    assert.equal(f.flights().length, 1);
    return { channelUntil: f.p.channelUntil, paidFlights: 1, recovery: 241 };
  },
);
check(
  "actual operation loss removes only dependent later flights and keeps the earlier base round without refund",
  () => {
    const f = fixture("floating");
    f.step({ technique1: true });
    const earlier = f.flights()[0].id;
    f.step({ technique2: true });
    f.step({ technique2: true });
    while (f.g.combatTick < 12) f.step();
    assert.equal(f.flights().length, 2);
    const later = f.flights().find((s: any) => s.id !== earlier)!.id;
    f.p.skills = f.p.skills.filter((id: string) => id !== clutchId);
    f.step();
    assert(f.g.shots.has(earlier));
    assert(!f.g.shots.has(later));
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.p.ammo, 43);
    assert.equal(f.status().technique1At, 241);
    assert.equal(f.status().heavyTraverseShotAt, 0);
    return { earlierRetained: earlier, laterRemoved: later, recovery: 241 };
  },
);
check(
  "actual full pool ends a re-engaged unpaid slot with no extra round, deferred shot or recovery reset",
  () => {
    const f = fixture();
    f.step({ technique1: true });
    f.step({ technique2: true });
    f.step({ technique2: true });
    while (f.g.shots.size < 6000)
      assert(f.g.emitShot(f.ally.id, 1400, 900, 0, 0, 0, 1, 0, 10));
    while (f.g.combatTick < 11) f.step();
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.p.ammo, 44);
    assert.equal(f.status().technique1At, 241);
    assert.equal(f.emitted.length, 1);
    return { pool: f.g.shots.size, actualRounds: 1, recovery: 241 };
  },
);
check(
  "actual host exit removes lifted C flight, while actual pooled reuse cannot redirect owner cancellation to another player",
  () => {
    const first = fixture();
    first.step({ technique1: true });
    first.step({ technique2: true });
    const id = first.flights()[0].id;
    assert(first.g.endByHost());
    assert(!first.g.shots.has(id));
    assert.equal(first.status().heavyTraverseUntil, 0);
    const second = fixture();
    second.step({ technique1: true });
    const old = second.flights()[0],
      oldId = old.id;
    second.g.removeShot(old);
    const reused = second.g.emitShot(
      second.ally.id,
      1400,
      900,
      0,
      0,
      0,
      1,
      0,
      10,
    );
    assert.equal(reused, old);
    assert.notEqual(reused.id, oldId);
    second.g.setConnected(second.p.id, false);
    assert.equal(second.g.shots.get(reused.id), reused);
    assert.equal(second.status().technique1At, 241);
    return {
      hostRemovedActual: id,
      reusedActualId: reused.id,
      foreignOwner: reused.owner,
      recovery: 241,
    };
  },
);
check(
  "lifted walking retains paid recoil through actual body/cover collision",
  () => {
    const f = fixture();
    f.g.arena.obstacles.push({ x: 575, y: 500, width: 10, height: 200 });
    f.step({ technique1: true });
    for (let tick = 2; tick <= 5; tick++)
      f.step({ technique2: tick === 2, moveY: 1 });
    assert(Math.abs(f.p.x - 594) < 0.01);
    assert(Math.abs(f.p.y - (600 + (190 * 4) / 30)) < 0.002);
    assert.equal(f.p.ammo, 44);
    assert.equal(f.status().heavyClutchLifted, true);
    assert.equal(f.status().technique1At, 241);
    return { x: f.p.x, y: f.p.y, paidRounds: 1, recovery: 241 };
  },
);
check(
  "Spade lifts, moves, and replants at its actual new body point; later actual displacement breaks it",
  () => {
    const f = fixture("spade");
    f.step({ technique1: true });
    f.step({ technique2: true, moveY: 1 });
    f.step({ moveY: 1 });
    const post = { x: f.p.x, y: f.p.y };
    f.step({ technique2: true });
    assert.equal(f.status().heavyClutchLifted, false);
    assert.equal(f.status().heavyTraversePostX, post.x);
    assert.equal(f.status().heavyTraversePostY, post.y);
    f.g.director.services.movement = () => ({ multiplier: 1, x: 0, y: 60 });
    f.step();
    assert(Math.hypot(f.p.x - post.x, f.p.y - post.y) > 1);
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.p.ammo, 44);
    assert.equal(f.status().technique1At, 241);
    return {
      replantedAt: post,
      afterControlledExternalForce: { x: f.p.x, y: f.p.y },
      paidRounds: 1,
    };
  },
);
check(
  "required fitting or weapon loss removes the actual base and post-clutch flights without changing recovery",
  () => {
    const rows = [];
    for (const mode of ["spade", "floating"] as const)
      for (const loss of ["fitting", "weapon"]) {
        const f = fixture(mode);
        f.step({ technique1: true });
        f.step({ technique2: true });
        f.step({ technique2: true });
        while (f.g.combatTick < 12) f.step();
        const ids = f.flights().map((s: any) => s.id);
        assert.equal(ids.length, 2);
        if (loss === "fitting")
          f.p.skills = f.p.skills.filter(
            (id: string) => id !== "heavy-traverse-" + mode + "-1",
          );
        else f.p.weapon = "heavy-1";
        f.step();
        assert(ids.every((id: number) => !f.g.shots.has(id)));
        assert.equal(f.status().heavyTraverseUntil, 0);
        assert.equal(f.status().technique1At, 241);
        rows.push({ mode, loss, actualFlightIdsRemoved: ids, recovery: 241 });
      }
    return rows;
  },
);
check(
  "a post-clutch round keeps its copied emission origin for actual armor dispatch after the owner walks away",
  () => {
    const f = fixture("floating"),
      origins: any[] = [];
    Object.assign(f.g.boss, { x: 1000, y: 600 });
    f.g.director.district.bodyMultiplier = (p: any) => {
      origins.push({ x: p.x, y: p.y });
      return 0.5;
    };
    f.step({ technique1: true });
    f.step({ technique2: true, moveY: 1 });
    f.step({ technique2: true, moveY: -1 });
    while (f.g.combatTick < 11) f.step();
    const later = f.flights().find((s: any) => s.id !== f.emitted[0].id)!;
    assert(later);
    const emission = { ...f.g.traverse.origin(later.id) };
    f.step({ technique1: true, moveY: 1 });
    while (f.g.combatTick < 28) f.step({ moveY: 1 });
    assert.equal(origins.length, 2);
    assert(Math.abs(origins[0].y - 600) < 1e-6);
    assert(Math.abs(origins[1].x - emission.x) < 1e-6);
    assert(Math.abs(origins[1].y - emission.y) < 1e-6);
    assert(Math.abs(f.p.y - origins[1].y) > 50);
    assert(Math.abs(f.p.damageDealt - 48.6) < 1e-6);
    return {
      controlledArmorMultiplier: 0.5,
      origins,
      owner: { x: f.p.x, y: f.p.y },
      damage: f.p.damageDealt,
    };
  },
);
check(
  "holding the lift through all original slots ends the stroke and permits ordinary primary without a delayed C shot",
  () => {
    const f = fixture();
    f.step({ technique1: true });
    f.step({ technique2: true });
    while (f.g.combatTick < 30) f.step({ fire: true });
    assert.equal(f.emitted.length, 1);
    f.step({ fire: true });
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.status().technique1At, 241);
    assert.equal(f.emitted.length, 2);
    assert.equal(f.p.ammo, 43);
    assert(f.emitted[1].damage < 48.6);
    return {
      lastOriginalSlot: 31,
      actualCShots: 1,
      ordinaryShotAt: 31,
      recovery: 241,
    };
  },
);

test("Feed Clutch controlled value keeps real cover, paid rounds, damage and the useful primary-cancel alternative across all three carriages", () => {
  const rows: any[] = [];
  for (const mode of ["loose", "spade", "floating"] as const)
    for (const strategy of ["keep", "cancel-primary", "clutch"] as const) {
      const g: any = new Game({
          mode: "raid",
          seed: 41,
          maxPlayers: 2,
          arenaSelection: "fixed",
          openingArenaId: "gatehouse",
        }),
        p = g.addPlayer("owner", "Hux", "heavy"),
        ally = g.addPlayer("ally", "Mara", "soldier");
      for (const item of [
        "heavy-ordnance-1",
        ids.entry,
        ...(mode === "loose" ? [] : [ids[mode]]),
      ])
        assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
      if (strategy === "clutch")
        assert(
          g.transact(p.id, { id: clutchId, kind: "skill", item: clutchId }).ok,
        );
      assert(g.start());
      g.boss.id = "constable";
      g.director.reset("constable");
      Object.assign(g.boss, {
        x: 1200,
        y: 200,
        health: 1e6,
        maxHealth: 1e6,
        staggerUntil: 1e9,
        deadline: 1e9,
      });
      Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
      g.arena.obstacles.length = g.arena.lavaPits.length = 0;
      g.arena.obstacles.push({ x: 700, y: 500, width: 20, height: 200 });
      Object.assign(p, { x: 600, y: 600, oldX: 600, oldY: 600 });
      Object.assign(ally, { x: 1400, y: 900, oldX: 1400, oldY: 900 });
      const target = g.spawnMinion({
        kind: "ordinary",
        x: 900,
        y: 600 + (20 * 190) / 30,
        health: 1000,
        speed: 0,
        radius: 16,
        damage: 0,
      })!;
      assert(target);
      g.drainEvents();
      let sequence = 0;
      const emitted: any[] = [],
        operations: any[] = [],
        positions: any[] = [];
      const step = (input: any = {}) => {
        assert(
          g.submitInput(p.id, {
            ...idleInput(),
            sequence: ++sequence,
            aim: 0,
            ...input,
          }),
        );
        g.step();
        positions.push({
          tick: g.combatTick,
          x: p.x,
          y: p.y,
          feedUntil: g.traverse.status(p, g.combatTick).heavyTraverseUntil,
          lifted: g.traverse.status(p, g.combatTick).heavyClutchLifted,
        });
        for (const e of g.drainEvents()) {
          if (e.type === "shots")
            for (const s of e.shots)
              if (s.owner === p.id)
                emitted.push({ ...s, admittedAt: g.combatTick });
          if (
            e.type === "sound" &&
            e.owner === p.id &&
            [
              "heavy-clutch-lift",
              "heavy-clutch-engage",
              "heavy-traverse-release",
            ].includes(e.id)
          )
            operations.push({ id: e.id, at: g.combatTick });
        }
      };
      step({ technique1: true });
      for (let tick = 2; tick <= 60; tick++) {
        const moving = tick >= 6 && tick <= 25,
          action: any = { moveY: moving ? 1 : 0 };
        if (strategy === "clutch" && (tick === 6 || tick === 26))
          action.technique2 = true;
        if (strategy === "cancel-primary") {
          if (tick === 6) action.technique1 = true;
          if (tick >= 6) action.fire = true;
        }
        step(action);
      }
      const special = emitted.filter(
          (s) => Math.abs(Math.hypot(s.vx, s.vy) - r.speed) < 1e-6,
        ),
        damage = target.maxHealth - target.health,
        row = {
          mode,
          strategy,
          actualPaidStrokeRounds: special.length,
          strokeAdmissionTicks: special.map((s) => s.admittedAt),
          actualPrimaryRounds: emitted.length - special.length,
          actualAmmoSpent: 45 - p.ammo,
          actualTargetDamage: damage,
          actualCreditedDamage: p.damageDealt,
          operations,
          finalBody: { x: p.x, y: p.y },
          positionsAtKeySteps: positions.filter((q) =>
            [1, 6, 11, 21, 26, 31].includes(q.tick),
          ),
          realProjectileMuzzleOrigins: special.map((s) => ({
            tick: s.admittedAt,
            x: s.x,
            y: s.y,
          })),
          originalRecovery: g.traverse.status(p, g.combatTick).technique1At,
        };
      assert.equal(row.originalRecovery, 241);
      if (strategy === "clutch") {
        assert.deepEqual(row.strokeAdmissionTicks, [1, 31]);
        assert.equal(row.actualAmmoSpent, 2);
        assert(damage > 0);
        assert.equal(operations.length, 2);
        assert.equal(positions.find((q) => q.tick === 11)!.lifted, true);
      }
      if (strategy === "keep" && mode !== "floating") {
        assert.equal(damage, 0);
        assert.equal(row.actualPaidStrokeRounds, 4);
      }
      if (strategy === "keep" && mode === "floating") {
        assert(damage > 0);
        assert.equal(row.actualPaidStrokeRounds, 4);
      }
      if (strategy === "cancel-primary") {
        assert.equal(row.actualPaidStrokeRounds, 1);
        assert(row.actualPrimaryRounds > 0);
      }
      rows.push(row);
    }

  assert.equal(rows.length, 9);
  for (const row of rows.filter((r) => r.strategy === "clutch")) {
    assert.deepEqual(row.strokeAdmissionTicks, [1, 31]);
    assert.equal(row.actualAmmoSpent, 2);
    assert(Math.abs(row.actualTargetDamage - 48.6) < 1e-6);
  }
  for (const row of rows.filter((r) => r.strategy === "cancel-primary")) {
    assert.equal(row.actualAmmoSpent, 15);
    assert(Math.abs(row.actualTargetDamage - 64.8) < 1e-6);
  }
});
