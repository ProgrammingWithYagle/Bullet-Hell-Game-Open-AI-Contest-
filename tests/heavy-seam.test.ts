import test from "node:test";
import assert from "node:assert/strict";
import {
  HeavyFlak,
  flakIds as ids,
  heavyFlakRules as rules,
} from "../src/shared/heavy-flak.ts";
import { seamId } from "../src/shared/heavy-seam.ts";
import { idleInput, HZ } from "../src/shared/protocol.ts";
const eq: (a: unknown, b: unknown) => void = assert.deepEqual,
  ok = (v: unknown, message?: string) => assert(v, message),
  near = (a: number, b: number) =>
    assert(Math.abs(a - b) < 1e-8, a + " vs " + b);
// Explicit controlled controller fixtures; ordinary acquisition and actual peers are tested separately.
function fixture(
  options: {
    seam?: boolean;
    handling?: "running" | "hanging";
    pattern?: "compact" | "frontal";
  } = {},
) {
  const m = new HeavyFlak(rules),
    p: any = {
      id: "hux",
      classId: "heavy",
      skills: [
        ids.entry,
        ids.command,
        ...(options.seam === false ? [] : [seamId]),
        ...(options.handling ? [ids[options.handling]] : []),
        ...(options.pattern ? [ids[options.pattern]] : []),
      ],
      connected: true,
      status: "active",
      health: 140,
      weapon: "heavy-0",
      ammo: 20,
      aim: 0,
      x: 0,
      y: 0,
      reloadAt: 0,
      dashUntil: 0,
      channelUntil: 0,
      overdriveUntil: 0,
      input: idleInput(),
    },
    w: any = {
      tick: 100,
      next: 1,
      capacity: true,
      emission: true,
      combat: true,
      shots: new Map(),
      walls: [],
      removed: [],
      sounds: [],
      updates: [],
      failed: new Set(),
      afterRemove: undefined,
    };
  let sequence = 0;
  const remove = (s: any) => {
      if (w.failed.has(s.id) || !w.shots.delete(s.id)) return false;
      const id = s.id;
      m.forget(id);
      w.removed.push(id);
      w.afterRemove?.(s);
      return true;
    },
    ctx = () => ({
      tick: w.tick,
      stats: () => ({ cooldown: 1 }) as any,
      canEmit: () => w.capacity,
      shoot: (_: any, speed: number, radius: number, seconds: number) => {
        if (!w.emission) return;
        const s = {
          id: w.next++,
          owner: p.id,
          x: p.x,
          y: p.y,
          vx: Math.cos(p.aim) * speed,
          vy: Math.sin(p.aim) * speed,
          radius,
          damage: 0,
          pierce: 0,
          expires: w.tick + Math.ceil(seconds * HZ),
          visual: "flak" as const,
        };
        w.shots.set(s.id, s);
        return s;
      },
      shot: (id: number) => w.shots.get(id),
      remove,
      update: (s: any) => w.updates.push(structuredClone(s)),
      obstacles: () => w.walls,
      sound: (_: any, id: string, point = p) =>
        w.sounds.push({ id, point: { x: point.x, y: point.y } }),
    }),
    input = (action: any = {}) => {
      p.input = { ...idleInput(), sequence: ++sequence, aim: p.aim, ...action };
    },
    advance = (body: number | null = null) => {
      for (const s of [...w.shots.values()] as any[])
        if (
          m.has(s.id) &&
          !m.advance(s, {
            tick: w.tick,
            owner: p,
            bounds: { x: -1000, y: -1000, width: 3000, height: 3000 },
            obstacles: w.walls,
            body: () => body,
          })
        )
          remove(s);
    },
    flush = () =>
      m.flush({
        tick: w.tick,
        combat: w.combat,
        players: [p],
        obstacles: w.walls,
        shots: () => [...w.shots.values()],
        remove,
        id: () => w.next++,
        sound: (_: any, id: string, point: any) =>
          w.sounds.push({ id, point: { x: point.x, y: point.y } }),
      }),
    hostile = (id: number, x: number, y = 0, extra: any = {}) => {
      const s = {
        id,
        owner: "hostile",
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 3,
        damage: 9,
        pierce: 0,
        expires: 1000,
        ...extra,
      };
      w.shots.set(id, s);
      return s;
    },
    sweep = () => {
      for (const id of m.step(w.tick, [p])) {
        const s = w.shots.get(id);
        if (s) remove(s);
      }
    },
    launch = () => {
      input({ technique1: true });
      ok(m.cast(p, ctx()));
      advance();
    },
    travel = (steps = 9) => {
      for (let i = 0; i < steps; i++) {
        w.tick++;
        sweep();
        advance();
        flush();
      }
    },
    contacts = () =>
      m.cues().filter((c) => c.kind === "heavy-flak-seam-contacts");
  return {
    m,
    p,
    w,
    ctx,
    input,
    advance,
    flush,
    hostile,
    remove,
    sweep,
    launch,
    travel,
    contacts,
  };
}
test("actual admitted/advance points, one real round, original recovery/fuse and separate C", () => {
  const f = fixture();
  f.launch();
  eq(f.p.ammo, 19);
  eq(f.m.ownerCues("hux", 100)[0].points, [
    { x: 0, y: 0 },
    { x: 15, y: 0 },
  ]);
  eq(f.m.cast(f.p, f.ctx()), false);
  f.w.tick++;
  eq(f.m.cast(f.p, f.ctx()), false);
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  eq(f.w.shots.size, 0);
  eq(f.m.status(f.p, 101).technique1At, 340);
  eq(f.p.ammo, 19);
  eq(f.m.status(f.p, 101).heavyFlakShotAt, 100);
  eq(f.m.status(f.p, 101).heavyFlakSeamAt, 101);
  eq(f.m.blocksPrimary("hux", 101), false);
  f.flush();
  eq(f.m.ownerCues("hux", 101)[0].stage, "cut");
  eq(f.m.ownerCues("hux", 101)[0].points, [
    { x: 0, y: 0 },
    { x: 15, y: 0 },
  ]);
});
test("late cut intercepts the thin old path while default B retains the broad current point", () => {
  for (const cut of [true, false]) {
    const f = fixture();
    f.launch();
    f.travel();
    near(f.w.shots.get(1).x, 150);
    f.hostile(10, 15);
    f.hostile(11, 150, 35);
    f.w.tick++;
    f.input(cut ? { technique1: true } : { technique2: true });
    ok(cut ? f.m.cast(f.p, f.ctx()) : f.m.command(f.p, f.ctx()));
    f.flush();
    eq(f.w.shots.has(10), !cut);
    eq(f.w.shots.has(11), cut);
    eq(f.p.ammo, 19);
    eq(f.m.status(f.p, f.w.tick).technique1At, 340);
  }
});
test("running early one removal and seam remainder share the original three total", () => {
  const f = fixture({ handling: "running" });
  f.launch();
  f.w.tick++;
  f.input({ technique2: true });
  f.hostile(10, 20);
  ok(f.m.command(f.p, f.ctx()));
  f.advance();
  f.flush();
  const early = f.m.cues().find((c) => c.kind === "heavy-flak-burst")!;
  eq(early.contacts.length, 1);
  f.travel(8);
  f.hostile(20, 145);
  f.hostile(21, 70);
  f.hostile(22, 10);
  f.w.tick++;
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  f.flush();
  eq(f.contacts()[0].contacts.length, 2);
  eq(f.contacts()[0].contacts, [
    { x: 145, y: 0 },
    { x: 70, y: 0 },
  ]);
  ok(f.w.shots.has(22));
  eq(early.contacts.length + f.contacts()[0].contacts.length, 3);
  eq(f.p.ammo, 19);
  eq(f.m.status(f.p, f.w.tick).technique1At, 340);
});
test("hanging records no duplicate travel during arrest and preserves the original expiry", () => {
  const f = fixture({ handling: "hanging" });
  f.launch();
  f.travel(5);
  const until = f.w.shots.get(1).expires;
  f.w.tick++;
  f.input({ technique2: true });
  ok(f.m.command(f.p, f.ctx()));
  f.advance();
  const before = f.m.ownerCues("hux", f.w.tick)[0].points;
  eq(f.w.updates.length, 1);
  eq(f.w.updates[0].vx, 0);
  for (let i = 0; i < 3; i++) {
    f.w.tick++;
    f.advance();
  }
  eq(f.m.ownerCues("hux", f.w.tick)[0].points, before);
  eq(f.w.shots.get(1).expires, until);
  f.hostile(10, 15);
  f.w.tick++;
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  f.flush();
  eq(f.contacts()[0].contacts, [{ x: 15, y: 0 }]);
  eq(f.m.ownerCues("hux", f.w.tick)[0].points, before);
  eq(f.p.ammo, 19);
});
test("current cover latches a broken filament; removing cover does not mend it or cancel B", () => {
  const f = fixture();
  f.launch();
  f.travel();
  f.w.walls = [{ x: 80, y: -20, width: 10, height: 40 }];
  f.w.tick++;
  f.advance();
  eq(f.m.status(f.p, f.w.tick).heavyFlakSeamBroken, true);
  f.w.walls = [];
  f.w.tick++;
  f.advance();
  f.input({ technique1: true });
  eq(f.m.cast(f.p, f.ctx()), false);
  ok(f.w.shots.has(1));
  eq(f.p.ammo, 19);
  f.w.tick++;
  f.input({ technique2: true });
  ok(f.m.command(f.p, f.ctx()));
  f.flush();
  eq(f.contacts().length, 0);
  ok(f.m.cues().some((c) => c.kind === "heavy-flak-burst"));
});
test("a cover crossing seen at command rejects without removing the paid flight", () => {
  const f = fixture();
  f.launch();
  f.travel();
  f.w.walls = [{ x: 80, y: -20, width: 10, height: 40 }];
  f.w.tick++;
  f.input({ technique1: true });
  eq(f.m.cast(f.p, f.ctx()), false);
  ok(f.w.shots.has(1));
  f.w.walls = [];
  f.w.tick++;
  f.input({ technique1: true });
  eq(f.m.cast(f.p, f.ctx()), false);
  eq(f.m.status(f.p, f.w.tick).heavyFlakSeamBroken, true);
  eq(f.p.ammo, 19);
});
test("cover arriving after accepted cut cancels interception without inventing a refund", () => {
  const f = fixture();
  f.launch();
  f.travel();
  f.hostile(10, 15);
  f.w.tick++;
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  f.w.walls = [{ x: 80, y: -20, width: 10, height: 40 }];
  f.flush();
  ok(f.w.shots.has(10));
  eq(f.contacts()[0].contacts, []);
  eq(f.m.ownerCues("hux", f.w.tick)[0].broken, true);
  eq(f.p.ammo, 19);
  eq(f.m.status(f.p, f.w.tick).technique1At, 340);
});
test("current-cover context is mandatory for a cut and missing context leaves flight intact", () => {
  const f = fixture();
  f.launch();
  f.w.tick++;
  f.input({ technique1: true });
  const { obstacles, ...ctx } = f.ctx();
  eq(f.m.cast(f.p, ctx), false);
  ok(f.w.shots.has(1));
  eq(f.p.ammo, 19);
});
for (const reason of [
  "reload",
  "dodge",
  "ultimate",
  "reloading",
  "dashing",
  "channeling",
  "overdrive",
])
  test(
    "busy cut " +
      reason +
      " rejects without additional spending or cancellation",
    () => {
      const f = fixture();
      f.launch();
      f.w.tick++;
      f.input({ technique1: true });
      if (["reload", "dodge", "ultimate"].includes(reason))
        f.p.input[reason] = true;
      else
        f.p[
          reason === "reloading"
            ? "reloadAt"
            : reason === "dashing"
              ? "dashUntil"
              : reason === "channeling"
                ? "channelUntil"
                : "overdriveUntil"
        ] = 102;
      eq(f.m.cast(f.p, f.ctx()), false);
      ok(f.w.shots.has(1));
      eq(f.p.ammo, 19);
      eq(f.m.status(f.p, 101).technique1At, 340);
    },
  );
test("already paid cut needs neither another round nor another shot-pool admission", () => {
  const f = fixture();
  f.launch();
  f.p.ammo = 0;
  f.w.capacity = false;
  f.w.emission = false;
  f.w.tick++;
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  f.flush();
  eq(f.p.ammo, 0);
  eq(f.w.shots.size, 0);
  eq(f.m.status(f.p, 101).technique1At, 340);
});
test("first admission still rejects empty magazine/full capacity without payment or trace", () => {
  for (const reason of ["empty", "capacity", "emission"]) {
    const f = fixture();
    if (reason === "empty") f.p.ammo = 0;
    else f.w[reason] = false;
    f.input({ technique1: true });
    const before = f.p.ammo;
    eq(f.m.cast(f.p, f.ctx()), false);
    eq(f.p.ammo, before);
    eq(f.m.ownerCues("hux", 100), []);
    eq(f.m.status(f.p, 100).technique1At, 0);
  }
});
test("original fuse boundary rejects the late C and retains the issued natural point burst", () => {
  const f = fixture();
  f.launch();
  f.travel(17);
  f.w.tick++;
  f.input({ technique1: true });
  eq(f.w.tick, 118);
  eq(f.m.cast(f.p, f.ctx()), false);
  f.advance();
  f.flush();
  eq(f.contacts().length, 0);
  ok(f.m.cues().some((c) => c.kind === "heavy-flak-burst"));
  eq(f.m.ownerCues("hux", 118), []);
  eq(f.p.ammo, 19);
});
test("actual body contact ends the physical shell before a later cut", () => {
  const f = fixture();
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  f.advance(0.5);
  f.flush();
  eq(f.w.shots.size, 0);
  eq(f.m.ownerCues("hux", 100), []);
  f.w.tick++;
  f.input({ technique1: true });
  eq(f.m.cast(f.p, f.ctx()), false);
  eq(f.p.ammo, 19);
  near((f.m.cues()[0] as any).x, 7.5);
});
for (const loss of [
  "owner",
  "health",
  "weapon",
  "entry",
  "manual",
  "seam",
  "handling",
  "pattern",
])
  test(
    "queued seam " + loss + " loss cancels work and retains spent recovery",
    () => {
      const f = fixture({ handling: "running", pattern: "compact" });
      f.launch();
      f.w.tick++;
      f.input({ technique1: true });
      f.hostile(10, 10);
      ok(f.m.cast(f.p, f.ctx()));
      if (loss === "owner") f.p.connected = false;
      else if (loss === "health") f.p.health = 0;
      else if (loss === "weapon") f.p.weapon = "heavy-1";
      else
        f.p.skills = f.p.skills.filter(
          (id: string) =>
            id !==
            (loss === "entry"
              ? ids.entry
              : loss === "manual"
                ? ids.command
                : loss === "seam"
                  ? seamId
                  : loss === "handling"
                    ? ids.running
                    : ids.compact),
        );
      f.flush();
      eq(f.contacts().length, 0);
      eq(f.m.ownerCues("hux", f.w.tick), []);
      ok(f.w.shots.has(10));
      eq(f.m.status(f.p, f.w.tick).technique1At, 340);
      eq(f.p.ammo, 19);
    },
  );
test("required Seam loss removes flight/private trace and re-adding it does not restore the carrier", () => {
  const f = fixture();
  f.launch();
  f.p.skills = f.p.skills.filter((id: string) => id !== seamId);
  f.w.tick++;
  f.sweep();
  eq(f.w.shots.size, 0);
  eq(f.m.ownerCues("hux", f.w.tick), []);
  f.p.skills.push(seamId);
  f.input({ technique1: true });
  eq(f.m.cast(f.p, f.ctx()), false);
  eq(f.m.status(f.p, f.w.tick).technique1At, 340);
  eq(f.p.ammo, 19);
});
test("pool reuse and mutated owner cue copies cannot move the captured path or sound origin", () => {
  const f = fixture();
  f.launch();
  f.travel();
  const old = f.m.ownerCues("hux", 109)[0];
  old.points[0].x = 999;
  f.hostile(10, 15);
  f.p.x = 700;
  f.p.y = 400;
  f.w.afterRemove = (s: any) => {
    if (s.visual === "flak") {
      Object.assign(s, {
        id: 500,
        owner: "hostile",
        x: 900,
        y: 900,
        expires: 1000,
        visual: undefined,
      });
      f.w.shots.set(500, s);
    }
  };
  f.w.tick++;
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  f.flush();
  eq(f.contacts()[0].contacts, [{ x: 15, y: 0 }]);
  eq(f.m.ownerCues("hux", 110)[0].points[0], { x: 0, y: 0 });
  eq(
    f.w.sounds
      .filter((s: any) => s.id.startsWith("heavy-flak-seam"))
      .map((s: any) => s.point),
    [
      { x: 700, y: 400 },
      { x: 700, y: 400 },
    ],
  );
});
test("failed actual removal spends no quota and allows later stable candidates", () => {
  const f = fixture();
  f.launch();
  f.travel();
  for (const [id, x] of [
    [10, 145],
    [11, 140],
    [12, 135],
    [13, 130],
    [14, 125],
  ])
    f.hostile(id, x);
  f.w.failed.add(10);
  f.w.tick++;
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  f.flush();
  eq(f.contacts()[0].contacts, [
    { x: 140, y: 0 },
    { x: 135, y: 0 },
    { x: 130, y: 0 },
  ]);
  ok(f.w.shots.has(10) && f.w.shots.has(14));
});
test("sampling uses actual end-of-tick hostile positions and excludes friendly/large/expired circles", () => {
  const f = fixture();
  f.launch();
  f.travel();
  const enters = f.hostile(10, 900),
    leaves = f.hostile(11, 15);
  f.hostile(12, 15, 0, { owner: "ally" });
  f.hostile(13, 15, 0, { radius: 7 });
  f.hostile(14, 15, 0, { expires: 110 });
  f.w.tick++;
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  enters.x = 15;
  leaves.x = 900;
  f.flush();
  eq(f.contacts()[0].contacts, [{ x: 15, y: 0 }]);
  for (const id of [11, 12, 13, 14]) ok(f.w.shots.has(id));
});
test("public cues contain contact marks only and owner-path API returns nothing to foreign viewers", () => {
  const f = fixture();
  f.launch();
  f.travel();
  eq(f.m.ownerCues("foreign", 109), []);
  f.hostile(10, 15);
  f.w.tick++;
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  f.flush();
  const publicCue = f.contacts()[0];
  eq(
    Object.keys(publicCue).sort(),
    ["kind", "id", "owner", "at", "until", "contacts"].sort(),
  );
  eq(f.m.ownerCues("foreign", 110), []);
  const own = f.m.ownerCues("hux", 110);
  ok(own[0].points.length > 2);
  own[0].points[0].x = 999;
  eq(f.m.ownerCues("hux", 110)[0].points[0], { x: 0, y: 0 });
  for (const forbidden of [
    "quota",
    "remaining",
    "path",
    "points",
    "token",
    "weapon",
  ])
    ok(!Object.hasOwn(publicCue, forbidden));
});
test("cut is one finite sample, not a persistent trap, and its cues expire", () => {
  const f = fixture();
  f.launch();
  f.w.tick++;
  f.input({ technique1: true });
  ok(f.m.cast(f.p, f.ctx()));
  f.flush();
  f.hostile(10, 10);
  f.w.tick++;
  f.flush();
  ok(f.w.shots.has(10));
  f.w.tick = 107;
  f.sweep();
  eq(f.contacts().length, 0);
  eq(f.m.ownerCues("hux", 107), []);
});
test("cancel/phase clear removes all unfinished private/public work with issued recovery semantics", () => {
  for (const phaseClear of [false, true]) {
    const f = fixture();
    f.launch();
    f.w.tick++;
    f.input({ technique1: true });
    ok(f.m.cast(f.p, f.ctx()));
    f.flush();
    if (phaseClear) f.m.clear();
    else f.m.cancelOwner("hux");
    eq(f.contacts().length, 0);
    eq(f.m.ownerCues("hux", 101), []);
    eq(f.m.status(f.p, 101).technique1At, phaseClear ? 0 : 340);
  }
});
test("the hard trace budget remains25points even under repeated controlled advance calls", () => {
  const f = fixture();
  f.launch();
  for (let i = 0; i < 30; i++) f.advance();
  const cue = f.m.ownerCues("hux", 100)[0];
  ok(cue.points.length <= 25, "hard bounded trace exceeded25points");
  eq(cue.broken, true);
});
