import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import {
  traverseIds as ids,
  heavyTraverseRules as r,
} from "../src/shared/heavy-traverse.ts";
import { idleInput, HZ } from "../src/shared/protocol.ts";
const near = (a: number, b: number) =>
  assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
// Actual production Game/pool/geometry/damage with controlled boss/cover/minions. Fittings use Raid12; earned Short acquisition is separate.
function fixture(mode: "loose" | "spade" | "floating" = "loose") {
  const g: any = new Game({
      mode: mode === "loose" ? "short" : "raid",
      difficulty: "normal",
      seed: 41,
      maxPlayers: 2,
      arenaSelection: "fixed",
      openingArenaId: "gatehouse",
    }),
    p = g.addPlayer("owner", "Hux", "heavy"),
    ally = g.addPlayer("ally", "Mara", "soldier");
  assert.equal(p.totalSp, mode === "loose" ? 3 : 12);
  for (const item of [
    "heavy-ordnance-1",
    ids.entry,
    ...(mode === "loose" ? [] : [ids[mode]]),
  ])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
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
  Object.assign(p, { x: 600, y: 600, oldX: 600, oldY: 600 });
  Object.assign(ally, { x: 1400, y: 900, oldX: 1400, oldY: 900 });
  g.drainEvents();
  let sequence = 0;
  const emitted: any[] = [],
    events: any[] = [];
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
    const batch = g.drainEvents();
    events.push(...batch);
    for (const e of batch)
      if (e.type === "shots")
        emitted.push(
          ...e.shots
            .filter((s: any) => s.owner === p.id)
            .map((s: any) => ({ ...s, admittedAt: g.combatTick })),
        );
    return batch;
  };
  const target = (x: number, y: number, health = 1000) =>
    g.spawnMinion({
      kind: "ordinary",
      x,
      y,
      health,
      speed: 0,
      radius: 16,
      damage: 0,
    })!;
  return {
    g,
    p,
    ally,
    step,
    target,
    emitted,
    events,
    status: () => g.traverse.status(p, g.combatTick),
    stroke: () =>
      emitted.filter(
        (s) => Math.abs(s.damage - r.damage * g.stats(p).damage) < 1e-6,
      ),
  };
}
function check(name: string, run: () => unknown) {
  test(name, () => {
    run();
  });
}
check(
  "actual fixed-step controller pays exactly four actual physical shots and exposes primary only afterward",
  () => {
    const f = fixture();
    f.step({ technique1: true, fire: true });
    for (let i = 0; i < 29; i++) f.step({ fire: true });
    assert.equal(f.emitted.length, 3);
    assert.equal(f.p.ammo, 42);
    f.step({ fire: true });
    assert.equal(f.emitted.length, 4);
    assert.equal(f.p.ammo, 41);
    f.step({ fire: true });
    assert(f.emitted.length > 4);
    assert.deepEqual(
      f.stroke().map((s) => s.admittedAt),
      [1, 11, 21, 31],
    );
    return {
      strokeTicks: f.stroke().map((s) => s.admittedAt),
      ordinaryFirstAt: f.emitted[4].admittedAt,
      ammo: f.p.ammo,
    };
  },
);
check(
  "the two fittings have different ground and aim contracts under actual movement",
  () => {
    const rows = [];
    for (const mode of ["loose", "spade", "floating"] as const) {
      const f = fixture(mode);
      f.step({ technique1: true });
      for (let i = 0; i < 35; i++) f.step({ moveY: 1, aim: 0.8 });
      assert.equal(f.stroke().length, 4);
      const a = f.stroke().map((s) => Math.atan2(s.vy, s.vx));
      if (mode === "floating") {
        assert(f.p.y > 810);
        assert(a.every((n) => n === 0));
      } else {
        const recoilY =
          mode === "spade"
            ? 0
            : f
                .stroke()
                .reduce(
                  (n, s) =>
                    n + Math.sin(Math.atan2(s.vy, s.vx)) * r.recoilDistance,
                  0,
                );
        near(f.p.y, 600 + (190 * 5) / HZ - recoilY);
        assert(a[1] > 0.7);
      }
      if (mode === "spade") near(f.p.x, 600);
      else assert(f.p.x < 590);
      rows.push({
        mode,
        x: f.p.x,
        y: f.p.y,
        shotAngles: a,
        paid: 45 - f.p.ammo,
      });
    }
    return rows;
  },
);
check(
  "Floating can walk beyond actual cover and engage separate physical lanes while planted strokes stay occluded",
  () => {
    const rows = [];
    for (const mode of ["loose", "spade", "floating"] as const) {
      const f = fixture(mode);
      f.g.arena.obstacles.push({ x: 700, y: 500, width: 20, height: 200 });
      const targets = [600, 600 + 190 / 3, 600 + 380 / 3, 790].map((y) =>
        f.target(900, y, r.damage * f.g.stats(f.p).damage),
      );
      f.step({ technique1: true });
      for (let i = 0; i < 60; i++) f.step({ moveY: 1 });
      const losses = targets.map((t) => t.maxHealth - t.health);
      if (mode === "floating") {
        assert.equal(losses.filter((n) => n > 0).length, 2);
        assert(f.p.damageDealt > 89);
      } else assert.equal(f.p.damageDealt, 0);
      rows.push({
        mode,
        losses,
        damage: f.p.damageDealt,
        shots: f.stroke().length,
      });
    }
    return rows;
  },
);
check(
  "manual slew can redirect later actual rounds while Floating keeps its birth bearing",
  () => {
    const rows = [];
    for (const mode of ["loose", "spade", "floating"] as const) {
      const f = fixture(mode),
        first = f.target(850, 600),
        second = f.target(850, 800),
        aim = Math.atan2(200, 250);
      f.step({ technique1: true });
      for (let i = 0; i < 55; i++) f.step({ aim });
      assert(first.health < first.maxHealth);
      if (mode === "floating") near(second.health, second.maxHealth);
      else assert(second.health < second.maxHealth);
      rows.push({
        mode,
        firstDamage: first.maxHealth - first.health,
        turnedDamage: second.maxHealth - second.health,
        angles: f.stroke().map((s) => Math.atan2(s.vy, s.vx)),
      });
    }
    return rows;
  },
);
check(
  "real environmental displacement breaks Set Spade and preserves already fired physical work",
  () => {
    const f = fixture("spade");
    f.step({ technique1: true });
    const until = f.status().technique1At;
    f.g.director.services.movement = () => ({ multiplier: 1, x: 30, y: 0 });
    f.step();
    assert(f.p.x > 600);
    assert.equal(f.status().heavyTraverseUntil, 0);
    for (let i = 0; i < 33; i++) f.step();
    assert.equal(f.stroke().length, 1);
    assert.equal(f.status().technique1At, until);
    return { shots: f.stroke().length, x: f.p.x, recovery: until };
  },
);
check(
  "paid physical shots use their copied emission origin for source-sensitive armor after the owner moves",
  () => {
    const f = fixture("floating");
    Object.assign(f.g.boss, { x: 1000, y: 600 });
    const origins: any[] = [];
    f.g.director.district.bodyMultiplier = (p: any) => {
      origins.push({ x: p.x, y: p.y });
      return 0.5;
    };
    f.step({ technique1: true });
    f.step({ technique1: true, moveY: 1 });
    for (let i = 0; i < 16; i++) f.step({ moveY: 1 });
    assert.equal(origins.length, 1);
    near(origins[0].x, 600);
    near(origins[0].y, 600);
    return { origins, owner: { x: f.p.x, y: f.p.y }, damage: f.p.damageDealt };
  },
);
check(
  "actual downing and disconnect remove tracked physical shots with no recovery refund",
  () => {
    for (const kind of ["damage", "disconnect"]) {
      const f = fixture();
      f.step({ technique1: true });
      const until = f.status().technique1At;
      assert([...f.g.shots.values()].some((s: any) => s.owner === f.p.id));
      if (kind === "damage") {
        f.p.shield = 0;
        f.p.invulnerableUntil = 0;
        f.g.damage(f.p, 1e6);
      } else f.g.setConnected(f.p.id, false);
      assert.equal(
        [...f.g.shots.values()].filter((s: any) => s.owner === f.p.id).length,
        0,
        kind,
      );
      assert.equal(f.status().technique1At, until, kind);
    }
    return { downing: true, disconnect: true };
  },
);
check(
  "actual host exit removes all physical stroke shots rather than merely clearing controller metadata",
  () => {
    const f = fixture();
    f.step({ technique1: true });
    assert(f.g.endByHost());
    assert.equal(
      [...f.g.shots.values()].filter((s: any) => s.owner === f.p.id).length,
      0,
    );
    return { actualHostExit: true };
  },
);
check(
  "actual recoil collides with cover while Braced Firing retains its issued window without new protection",
  () => {
    const f = fixture();
    f.g.arena.obstacles.push({ x: 575, y: 500, width: 10, height: 200 });
    f.step({ technique1: true, e: true });
    for (let i = 0; i < 35; i++) f.step();
    assert(f.p.x >= 594 - 1e-3 && f.p.x < 594.01);
    assert.equal(f.p.braceUntil, 1 + 5 * HZ);
    assert.equal(f.stroke().length, 4);
    assert.equal(f.p.invulnerableUntil, HZ);
    return {
      x: f.p.x,
      braceUntil: f.p.braceUntil,
      shots: f.stroke().length,
      damagePerShot: f.stroke()[0].damage,
    };
  },
);

test("actual shared pool rejects the first round atomically and cancels future unpaid work on later exhaustion", () => {
  for (const initiallyFull of [false, true]) {
    const f = fixture();
    if (!initiallyFull) f.step({ technique1: true });
    while (f.g.shots.size < 6000)
      assert(f.g.emitShot(f.ally.id, 1400, 900, 0, 0, 0, 1, 0, 10));
    const ammo = f.p.ammo;
    if (initiallyFull) {
      f.step({ technique1: true });
      assert.equal(f.p.ammo, ammo);
      assert.equal(f.status().technique1At, 0);
      assert.equal(f.status().heavyTraverseUntil, 0);
    } else {
      for (let n = 0; n < 10; n++) f.step();
      assert.equal(f.p.ammo, ammo);
      assert.equal(f.status().heavyTraverseUntil, 0);
      assert.equal(f.status().technique1At, 241);
      assert.equal(f.stroke().length, 1);
    }
  }
});
test("actual running recovery survives roster disconnect/rejoin and cannot be reissued by a new input", () => {
  const f = fixture();
  f.step({ technique1: true });
  const at = f.status().technique1At;
  f.g.setConnected(f.p.id, false);
  f.g.setConnected(f.p.id, true);
  f.step({ technique1: true });
  assert.equal(f.p.ammo, 44);
  assert.equal(f.status().technique1At, at);
  assert.equal(f.status().heavyTraverseUntil, 0);
});
test("actual channel early return cancels future work without removing already paid flight or refunding recovery", () => {
  const f = fixture();
  f.step({ technique1: true });
  f.p.channelUntil = 100;
  f.step();
  assert.equal(f.status().heavyTraverseUntil, 0);
  assert.equal(f.p.ammo, 44);
  assert.equal(f.status().technique1At, 241);
  assert([...f.g.shots.values()].some((s: any) => f.g.traverse.has(s.id)));
});
