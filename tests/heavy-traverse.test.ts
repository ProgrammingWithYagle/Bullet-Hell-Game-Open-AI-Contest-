import test from "node:test";
import assert from "node:assert/strict";
import {
  HeavyTraverse,
  traverseIds as ids,
  heavyTraverseRules as rules,
  type TraverseContext,
} from "../src/shared/heavy-traverse.ts";
import { HZ, idleInput, type Shot } from "../src/shared/protocol.ts";
import { moveBody } from "../src/shared/geometry.ts";

function fixture(fitting?: "spade" | "floating") {
  const p: any = {
    id: "owner",
    classId: "heavy",
    skills: [ids.entry, ...(fitting ? [ids[fitting]] : [])],
    connected: true,
    status: "active",
    health: 140,
    weapon: "heavy-0",
    ammo: 45,
    aim: 0,
    x: 600,
    y: 600,
    reloadAt: 0,
    dashUntil: 0,
    channelUntil: 0,
    overdriveUntil: 0,
    input: { ...idleInput(), sequence: 1 },
  };
  const controller = new HeavyTraverse(),
    shots = new Map<number, Shot>(),
    emitted: Shot[] = [],
    sounds: string[] = [];
  let serial = 0,
    capacity = true,
    admit = true;
  const c: TraverseContext = {
    tick: 1,
    stats: () => ({ damage: 1, cooldown: 1 }),
    canEmit: () => capacity,
    shoot: (owner, aim, damage, speed, radius, life) => {
      if (!admit) return;
      const shot = {
        id: ++serial,
        owner: owner.id,
        x: owner.x,
        y: owner.y,
        vx: Math.cos(aim) * speed,
        vy: Math.sin(aim) * speed,
        radius,
        damage,
        pierce: 0,
        expires: c.tick + life * HZ,
      };
      shots.set(shot.id, shot);
      emitted.push({ ...shot });
      return shot;
    },
    sound: (_p, id) => sounds.push(id),
  };
  const authority = () => ({
    players: [p],
    tick: c.tick,
    shot: (id: number) => shots.get(id),
    remove: (s: Shot) => {
      shots.delete(s.id);
      controller.forget(s.id);
    },
  });
  const step = (input: Record<string, unknown> = {}, obstacles: any[] = []) => {
    c.tick++;
    p.input = {
      ...idleInput(),
      sequence: p.input.sequence + 1,
      aim: p.aim,
      ...input,
    };
    p.aim = p.input.aim;
    controller.beforeMove(p, c);
    const recoil = controller.recoil(p, c.tick),
      walk = controller.walkFactor(p.id);
    const moved = moveBody(
      p,
      {
        x: (p.input.moveX * 190 * walk + recoil.x) / HZ,
        y: (p.input.moveY * 190 * walk + recoil.y) / HZ,
      },
      9,
      obstacles,
    );
    p.x = moved.x;
    p.y = moved.y;
    if (p.input.technique1) controller.cast(p, c);
    controller.advance(p, c);
    controller.reconcile(authority());
  };
  return {
    p,
    controller,
    shots,
    emitted,
    sounds,
    c,
    step,
    authority,
    capacity: (value: boolean) => (capacity = value),
    admit: (value: boolean) => (admit = value),
  };
}
test("four individually admitted paid rounds keep exact combat slots and recovery", () => {
  const f = fixture();
  assert(f.controller.cast(f.p, f.c));
  const born = f.c.tick,
    recovery = f.controller.status(f.p, born).technique1At;
  for (let i = 0; i < 40; i++) f.step();
  assert.equal(f.emitted.length, 4);
  assert.equal(f.p.ammo, 41);
  assert.deepEqual(
    f.emitted.map((s) => s.expires - HZ),
    [born, born + 10, born + 20, born + 30],
  );
  assert.equal(f.controller.status(f.p, f.c.tick).technique1At, recovery);
  assert.equal(recovery, born + 240);
  assert.equal(f.controller.blocksPrimary(f.p.id, f.c.tick), false);
  assert(Math.abs(f.p.x - 568) < 1e-8);
  assert.equal(f.p.y, 600);
});
test("a fresh cancellation releases manual walking in that step without erasing paid recoil or actual flight", () => {
  const f = fixture();
  assert(f.controller.cast(f.p, f.c));
  const recovery = f.controller.status(f.p, 1).technique1At;
  f.step({ technique1: true, moveY: 1 });
  assert(f.p.y > 600);
  assert(f.p.x < 600);
  assert.equal(f.controller.status(f.p, 2).heavyTraverseUntil, 0);
  for (let i = 0; i < 35; i++) f.step();
  assert.equal(f.emitted.length, 1);
  assert.equal(f.p.ammo, 44);
  assert.equal(f.shots.size, 1);
  assert.equal(f.controller.status(f.p, f.c.tick).technique1At, recovery);
});
test("same-sequence and birth-tick repeats cannot cancel or restart the stroke", () => {
  const f = fixture();
  assert(f.controller.cast(f.p, f.c));
  assert.equal(f.controller.cast(f.p, f.c), false);
  f.c.tick++;
  f.p.input.technique1 = true;
  f.controller.beforeMove(f.p, f.c);
  assert.equal(f.controller.cast(f.p, f.c), false);
  assert.equal(f.controller.status(f.p, 2).heavyTraverseUntil, 32);
  assert.equal(f.emitted.length, 1);
});
test("each initial busy, fresh interruption, empty and failed admission rejects with no payment or recovery", () => {
  for (const change of [
    (f: any) => (f.p.reloadAt = 20),
    (f: any) => (f.p.dashUntil = 20),
    (f: any) => (f.p.channelUntil = 20),
    (f: any) => (f.p.overdriveUntil = 20),
    (f: any) => (f.p.input.reload = true),
    (f: any) => (f.p.input.dodge = true),
    (f: any) => (f.p.input.ultimate = true),
    (f: any) => (f.p.ammo = 0),
    (f: any) => f.capacity(false),
    (f: any) => f.admit(false),
  ]) {
    const f = fixture();
    change(f);
    const ammo = f.p.ammo;
    assert.equal(f.controller.cast(f.p, f.c), false);
    assert.equal(f.p.ammo, ammo);
    assert.equal(f.emitted.length, 0);
    assert.equal(f.controller.status(f.p, 1).technique1At, 0);
    assert.equal(f.controller.walkFactor(f.p.id), 1);
  }
});
test("future pool failure, empty or interruption cancels unpaid work without catch-up or refund", () => {
  for (const why of [
    "pool",
    "shoot",
    "empty",
    "reload",
    "dodge",
    "ultimate",
    "channel",
  ] as const) {
    const f = fixture();
    assert(f.controller.cast(f.p, f.c));
    for (let i = 0; i < 9; i++) f.step();
    if (why === "pool") f.capacity(false);
    if (why === "shoot") f.admit(false);
    if (why === "empty") f.p.ammo = 0;
    if (why === "channel") f.p.channelUntil = 30;
    f.step({ [why]: ["reload", "dodge", "ultimate"].includes(why) });
    f.capacity(true);
    f.admit(true);
    f.p.ammo = 30;
    f.p.channelUntil = 0;
    for (let i = 0; i < 35; i++) f.step();
    assert.equal(f.emitted.length, 1, why);
    assert.equal(f.controller.status(f.p, f.c.tick).technique1At, 241, why);
    assert.equal(f.shots.size, 1, why);
  }
  const f = fixture();
  assert(f.controller.cast(f.p, f.c));
  f.c.tick = 12;
  f.controller.advance(f.p, f.c);
  assert.equal(f.controller.status(f.p, 12).heavyTraverseUntil, 0);
  assert.equal(f.emitted.length, 1);
});
test("manual slew is bounded per combat step and within the birth sector, while Floating stays locked", () => {
  const f = fixture();
  assert(f.controller.cast(f.p, f.c));
  f.step({ aim: Math.PI });
  const first = f.controller.status(f.p, f.c.tick).heavyTraverseAim;
  assert(Math.abs(first - rules.turnPerSecond / HZ) < 1e-9);
  for (let i = 0; i < 8; i++) f.controller.advance(f.p, f.c);
  assert.equal(f.controller.status(f.p, f.c.tick).heavyTraverseAim, first);
  for (let i = 0; i < 28; i++) f.step({ aim: Math.PI });
  assert(
    f.emitted.every(
      (s) => Math.abs(Math.atan2(s.vy, s.vx)) <= rules.halfArc + 1e-9,
    ),
  );
  const floating = fixture("floating");
  assert(floating.controller.cast(floating.p, floating.c));
  for (let i = 0; i < 30; i++) floating.step({ aim: Math.PI, moveY: 1 });
  assert(floating.p.y > 780);
  assert(floating.emitted.every((s) => s.vy === 0 && s.vx === rules.speed));
});
test("Set Spade requires a planted input, removes new recoil, and loses unpaid work after actual displacement", () => {
  const f = fixture("spade");
  f.p.input.moveX = 1;
  assert.equal(f.controller.cast(f.p, f.c), false);
  assert.equal(f.p.ammo, 45);
  f.p.input.moveX = 0;
  assert(f.controller.cast(f.p, f.c));
  for (let i = 0; i < 10; i++) f.step({ moveY: 1 });
  assert.equal(f.p.x, 600);
  assert.equal(f.p.y, 600);
  assert.equal(f.emitted.length, 2);
  f.p.x += 2;
  f.step();
  assert.equal(f.controller.status(f.p, f.c.tick).heavyTraverseUntil, 0);
  assert.equal(f.emitted.length, 2);
  assert.equal(f.controller.status(f.p, f.c.tick).technique1At, 241);
});
test("paid recoil uses actual body cover collision instead of tunnelling or gaining immunity", () => {
  const f = fixture();
  assert(f.controller.cast(f.p, f.c));
  for (let i = 0; i < 40; i++)
    f.step({}, [{ x: 575, y: 500, width: 10, height: 200 }]);
  assert(f.p.x >= 594 - 1e-3 && f.p.x <= 594.01);
  assert.equal(f.emitted.length, 4);
  assert.equal(f.p.invulnerableUntil, undefined);
});
test("owner, weapon, entry or required fitting loss removes actual tracked flights and retains recovery", () => {
  for (const loss of [
    "owner",
    "weapon",
    "entry",
    "fitting",
    "downed",
  ] as const) {
    const f = fixture("floating");
    assert(f.controller.cast(f.p, f.c));
    if (loss === "owner") f.p.connected = false;
    if (loss === "weapon") f.p.weapon = "heavy-1";
    if (loss === "entry") f.p.skills = [];
    if (loss === "fitting") f.p.skills = [ids.entry];
    if (loss === "downed") f.p.status = "downed";
    f.controller.reconcile(f.authority());
    assert.equal(f.shots.size, 0, loss);
    assert.equal(f.controller.walkFactor(f.p.id), 1, loss);
    assert.equal(f.controller.status(f.p, 1).technique1At, 241, loss);
    assert.deepEqual(f.controller.recoil(f.p, 2), { x: 0, y: 0 }, loss);
  }
});
test("pooled object reuse cannot redirect cancellation onto another owner or a new actual id", () => {
  const f = fixture();
  assert(f.controller.cast(f.p, f.c));
  const old = f.shots.get(1)!;
  f.shots.delete(1);
  Object.assign(old, { id: 9, owner: "other" });
  f.shots.set(9, old);
  f.p.connected = false;
  f.controller.reconcile(f.authority());
  assert.equal(f.shots.get(9), old);
  assert.equal(f.shots.size, 1);
  f.controller.clear();
  assert.equal(f.controller.status(f.p, 1).technique1At, 0);
});

test("reconciliation cancels busy or expired feed even when an early Game channel return skips player advancement", () => {
  for (const reason of ["channel", "deadline"]) {
    const f = fixture();
    assert(f.controller.cast(f.p, f.c));
    if (reason === "channel") f.p.channelUntil = 100;
    else f.c.tick = 32;
    f.controller.reconcile(f.authority());
    assert.equal(f.controller.status(f.p, f.c.tick).heavyTraverseUntil, 0);
    assert.equal(f.p.ammo, 44);
    assert.equal(f.controller.status(f.p, f.c.tick).technique1At, 241);
    assert.equal(f.shots.size, 1);
  }
});
test("stored firing origins are copied values and invalidated shots cannot feed prediction or a new owner pose", () => {
  const f = fixture("floating");
  assert(f.controller.cast(f.p, f.c));
  f.p.x += 100;
  f.p.y += 50;
  assert.deepEqual(f.controller.origin(1), { x: 600, y: 600 });
  assert.equal(f.controller.status(f.p, 1).heavyTraverseShotAt, 1);
  f.p.weapon = "heavy-1";
  f.controller.reconcile(f.authority());
  assert.equal(f.controller.status(f.p, 1).heavyTraverseShotAt, 0);
  assert.equal(f.shots.size, 0);
});
