import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import {
  idleInput,
  HZ,
  type InputFrame,
  type Shot,
} from "../src/shared/protocol.ts";
import {
  flakIds as ids,
  heavyFlakRules as r,
} from "../src/shared/heavy-flak.ts";
import { viewOf } from "../src/shared/view.ts";
let serial = 0;
const remaining = (g: Game, p: { id: string }) =>
  viewOf(g, p.id).players.find((v) => v.id === p.id)!.sp;
const buy = (g: Game, owner: string, item: string) => {
  const result = g.transact(owner, {
    id: "flak-" + ++serial,
    kind: "skill",
    item,
  });
  assert(result.ok, item + ":" + result.reason);
};
// Controlled fixtures isolate production authority and physics. They are not earned progression or online proof.
function fixture(extra: string[] = []) {
  const g = new Game({
      mode: extra.length ? "raid" : "short",
      difficulty: "normal",
      seed: 41,
      maxPlayers: 2,
      arenaSelection: "fixed",
      openingArenaId: "gatehouse",
    }),
    p = g.addPlayer("solo", "Hux", "heavy"),
    ally = g.addPlayer("ally", "Perrin", "medic");
  const initial = p.totalSp;
  buy(g, p.id, "heavy-ordnance-1");
  buy(g, p.id, ids.entry);
  for (const id of extra) buy(g, p.id, id);
  assert(g.start());
  g.boss.id = "constable";
  (g as any).director.reset("constable");
  g.boss.x = 1200;
  g.boss.y = 200;
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  g.arena.obstacles.length = g.arena.lavaPits.length = 0;
  p.x = p.oldX = 600;
  p.y = p.oldY = 600;
  ally.x = ally.oldX = 1400;
  ally.y = ally.oldY = 900;
  g.drainEvents();
  let sequence = 0;
  const step = (input: Partial<InputFrame> = {}) => {
    assert(
      g.submitInput(p.id, {
        ...idleInput(),
        sequence: ++sequence,
        aim: 0,
        ...input,
      }),
    );
    g.step();
  };
  const emit = (
    owner: string,
    x: number,
    y: number,
    speed = 0,
    angle = 0,
    radius = 3,
    damage = 9,
  ) => {
    const shot = (g as any).emitShot(
      owner,
      x,
      y,
      angle,
      speed,
      damage,
      radius,
      0,
      10,
    ) as Shot | undefined;
    assert(shot);
    return shot;
  };
  const flights = () =>
      [...g.shots.values()].filter(
        (s) => s.owner === p.id && s.visual === "flak",
      ),
    bursts = () => g.classCues().filter((c) => c.kind === "heavy-flak-burst");
  return { g, p, ally, step, emit, flights, bursts, initial };
}
test("ordinary Short3SP buys exactly Fresh Belt and Flak Round, with no bonus budget", () => {
  const f = fixture();
  assert.equal(f.initial, 3);
  assert.equal(remaining(f.g, f.p), 0);
  assert.deepEqual(f.p.skills, ["heavy-ordnance-1", ids.entry]);
  assert.equal(f.p.totalSp, 3);
  assert.equal(
    data.specializationSkills.filter((s) => s.classId === "heavy").length,
    10,
  );
});
test("the optional fork and acquired command fit the actual Raid12SP and remain separate purchases", () => {
  for (const fork of [ids.compact, ids.frontal]) {
    const f = fixture([fork, ids.command]);
    assert.equal(f.initial, 12);
    assert.equal(remaining(f.g, f.p), 4);
    assert.equal(f.p.skills.length, 4);
    assert.equal(
      f.p.skills.reduce((n, id) => n + f.g.skillCost(id), 0),
      8,
    );
  }
  const g = new Game({ mode: "short" }),
    p = g.addPlayer("solo", "Hux", "heavy");
  buy(g, p.id, "heavy-ordnance-1");
  buy(g, p.id, ids.entry);
  for (const item of [ids.compact, ids.frontal, ids.command])
    assert.equal(
      g.transact(p.id, { id: "early-" + item, kind: "skill", item }).ok,
      false,
    );
});
test("burst fittings exclude each other without spending and Manual Fuze does not require either fitting", () => {
  for (const [a, b] of [
    [ids.compact, ids.frontal],
    [ids.frontal, ids.compact],
  ]) {
    const f = fixture([a]);
    f.g.phase = "shop";
    const before = remaining(f.g, f.p),
      result = f.g.transact(f.p.id, {
        id: "fork-" + b,
        kind: "skill",
        item: b,
      });
    assert(!result.ok);
    assert.equal(result.reason, "incompatibleItem");
    assert.equal(remaining(f.g, f.p), before);
    assert(!f.p.skills.includes(b));
  }
  const f = fixture([ids.command]);
  assert.equal(remaining(f.g, f.p), 6);
  assert(
    !f.p.skills.includes(ids.compact) && !f.p.skills.includes(ids.frontal),
  );
});
test("actual C launch consumes one round, admits one physical zero-damage shot and blocks only same-frame primary", () => {
  const f = fixture(),
    ammo = f.p.ammo,
    health = f.g.boss.health;
  f.step({ technique1: true, fire: true });
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.flights().length, 1);
  const shell = f.flights()[0];
  assert.equal(shell.damage, 0);
  assert.equal(shell.radius, r.radius);
  assert.equal(shell.x, 600 + r.speed / HZ);
  assert.equal(
    f.g.kitStatus(f.p.id).technique1At,
    1 + Math.ceil(r.cooldown * HZ * f.g.stats(f.p).cooldown),
  );
  assert.equal(f.g.kitStatus(f.p.id).heavyFlakShotAt, 1);
  assert.equal(f.g.boss.health, health);
  f.step({ fire: true });
  assert.equal(f.p.ammo, ammo - 2);
  assert.equal(f.flights().length, 1);
  assert.equal(f.g.kitStatus(f.p.id).heavyPrimaryAt, 2);
});
for (const input of ["reload", "dodge", "ultimate"] as const)
  test(
    "fresh " + input + " rejects C without a flak payment or recovery",
    () => {
      const f = fixture(),
        ammo = f.p.ammo;
      f.step({ technique1: true, [input]: true });
      assert.equal(f.flights().length, 0);
      assert.equal(f.g.kitStatus(f.p.id).technique1At, 0);
      assert(
        !f.g
          .drainEvents()
          .some((e) => e.type === "sound" && e.id === "heavy-flak-shot"),
      );
      if (input !== "ultimate") assert.equal(f.p.ammo, ammo);
      else assert(f.p.overdriveUntil > f.g.combatTick);
    },
  );
for (const field of [
  "reloadAt",
  "dashUntil",
  "channelUntil",
  "overdriveUntil",
] as const)
  test(field + " rejects C without spending its actual magazine round", () => {
    const f = fixture();
    f.p[field] = 100;
    const ammo = f.p.ammo;
    f.step({ technique1: true });
    assert.equal(f.flights().length, 0);
    assert.equal(f.p.ammo, ammo);
    assert.equal(f.g.kitStatus(f.p.id).technique1At, 0);
  });
test("empty or full actual projectile pools reject C without recovery; a failed emitter also spends nothing", () => {
  const empty = fixture();
  empty.p.ammo = 0;
  empty.step({ technique1: true });
  assert.equal(empty.flights().length, 0);
  assert.equal(empty.g.kitStatus(empty.p.id).technique1At, 0);
  const full = fixture();
  for (let n = 0; n < 6000; n++) full.emit("dummy", 1450, 900, 0, 0, 1, 0);
  const ammo = full.p.ammo;
  full.step({ technique1: true });
  assert.equal(full.p.ammo, ammo);
  assert.equal(full.g.kitStatus(full.p.id).technique1At, 0);
  assert.equal(full.flights().length, 0);
  const failed = fixture(),
    original = (failed.g as any).emitShot;
  (failed.g as any).emitShot = (...args: any[]) =>
    args[0] === failed.p.id ? undefined : original.apply(failed.g, args);
  const before = failed.p.ammo;
  failed.step({ technique1: true });
  assert.equal(failed.p.ammo, before);
  assert.equal(failed.g.kitStatus(failed.p.id).technique1At, 0);
});
test("issued Q and E retain their operations alongside C and overdrive remains the competing mode", () => {
  const f = fixture();
  f.step({ q: true, e: true, technique1: true });
  assert(f.p.qAt > f.g.combatTick && f.p.braceUntil > f.g.combatTick);
  assert.equal(f.flights().length, 1);
  assert.equal(
    [...f.g.shots.values()].filter(
      (s) => s.owner === f.p.id && s.visual !== "flak",
    ).length,
    14,
  );
  const over = fixture();
  over.step({ ultimate: true });
  const ammo = over.p.ammo;
  for (let n = 0; n < 8; n++) over.step({ fire: true, technique1: true });
  assert.equal(over.p.ammo, ammo);
  assert.equal(over.flights().length, 0);
  assert.equal(over.g.kitStatus(over.p.id).technique1At, 0);
});
test("a shell uses its finite physical travel and bursts once at the original fuse; B on the expiry frame cannot claim a manual command", () => {
  const f = fixture([ids.command]);
  f.step({ technique1: true });
  const shell = f.flights()[0],
    until = shell.expires,
    born = f.g.combatTick,
    ammo = f.p.ammo;
  while (f.g.combatTick < until - 1) {
    f.step();
    assert.equal(f.bursts().length, 0);
  }
  assert.equal(shell.x, 600 + ((until - born) * r.speed) / HZ);
  f.g.drainEvents();
  f.step({ technique2: true });
  assert.equal(f.flights().length, 0);
  assert.equal(f.bursts().length, 1);
  assert.equal(f.bursts()[0].x, shell.x);
  const events = f.g.drainEvents();
  assert(
    !events.some((e) => e.type === "sound" && e.id === "heavy-flak-command"),
  );
  assert.equal(
    events.filter((e) => e.type === "sound" && e.id === "heavy-flak-burst")
      .length,
    1,
  );
  f.step();
  assert.equal(f.bursts().length, 1);
  assert.equal(f.p.ammo, ammo);
});
test("same-frame C/B cannot detonate and acquired B consumes the one actual flight without extra payment or recovery", () => {
  const f = fixture([ids.command]);
  const ammo = f.p.ammo;
  f.step({ technique1: true, technique2: true });
  assert.equal(f.flights().length, 1);
  assert.equal(f.bursts().length, 0);
  const recovery = f.g.kitStatus(f.p.id).technique1At;
  f.step({ technique2: true });
  assert.equal(f.flights().length, 0);
  assert.equal(f.bursts().length, 1);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.g.kitStatus(f.p.id).technique1At, recovery);
  f.step({ technique2: true });
  assert.equal(f.bursts().length, 1);
  assert.equal(f.p.ammo, ammo - 1);
});
test("burst selection removes only three actual small hostile circles in stable closest-contact/id order", () => {
  const f = fixture([ids.command]);
  f.step({ technique1: true });
  const a = f.emit("hostile", 635, 600),
    b = f.emit("hostile", 635, 600),
    c = f.emit("hostile", 640, 600),
    far = f.emit("hostile", 645, 600),
    friendly = f.emit(f.ally.id, 635, 600),
    large = f.emit("hostile", 635, 600, 0, 0, 7),
    field = {
      id: 9999,
      owner: f.ally.id,
      kind: "barrier" as const,
      x: 900,
      y: 900,
      radius: 10,
      until: 999,
      potency: 1,
    };
  f.g.fields.push(field);
  const count = (f.g as any).hostileShots;
  f.step({ technique2: true });
  for (const s of [a, b, c]) assert(!f.g.shots.has(s.id));
  for (const s of [far, friendly, large]) assert(f.g.shots.has(s.id));
  assert.equal((f.g as any).hostileShots, count - 3);
  assert.deepEqual(f.bursts()[0].contacts, [
    { x: 635, y: 600 },
    { x: 635, y: 600 },
    { x: 640, y: 600 },
  ]);
  assert(f.g.fields.includes(field));
  assert.equal(f.g.boss.health, 1e6);
});
test("ordinary shot advancement precedes burst sampling and an already landed hit remains damage", () => {
  const f = fixture([ids.command]);
  f.step({ technique1: true });
  f.p.invulnerableUntil = 0;
  f.p.shield = 0;
  const outward = f.emit("hostile", 635, 600, 1800, 0),
    inward = f.emit("hostile", 695, 600, 1800, Math.PI),
    hit = f.emit("hostile", 600, 600, 0, 0, 3, 9),
    health = f.p.health;
  f.step({ technique2: true });
  assert(f.g.shots.has(outward.id));
  assert.equal(outward.x, 695);
  assert(!f.g.shots.has(inward.id));
  assert(!f.g.shots.has(hit.id));
  assert(f.p.health < health);
  assert.equal(f.bursts().length, 1);
});
test("actual Game projectile-pool reuse cannot move the captured pending burst", () => {
  const f = fixture([ids.command]);
  f.step({ technique1: true });
  const shell = f.flights()[0],
    at = { x: shell.x, y: shell.y },
    target = f.emit("hostile", 635, 600),
    original = (f.g as any).stepShots;
  let reused: Shot | undefined;
  (f.g as any).stepShots = function () {
    original.call(this);
    reused = (this as any).emitShot("dummy", 1400, 850, 0, 0, 0, 3, 0, 10);
  };
  f.step({ technique2: true });
  assert.equal(reused, shell);
  assert.equal(shell.x, 1400);
  assert.equal(f.bursts()[0].x, at.x);
  assert.equal(f.bursts()[0].y, at.y);
  assert(!f.g.shots.has(target.id));
});
test("real cover stops the shell at the padded contact and blocks interception behind that cover", () => {
  const f = fixture();
  f.g.arena.obstacles.push({ x: 610, y: 550, width: 20, height: 100 });
  const front = f.emit("hostile", 607, 630),
    behind = f.emit("hostile", 650, 600);
  f.step({ technique1: true });
  assert.equal(f.flights().length, 0);
  assert.equal(f.bursts().length, 1);
  assert.equal(f.bursts()[0].x, 607);
  assert(!f.g.shots.has(front.id));
  assert(f.g.shots.has(behind.id));
});
test("a real enemy body consumes the zero-damage shell at physical contact, rather than passing through", () => {
  const f = fixture();
  f.g.boss.x = 700;
  f.g.boss.y = 600;
  const health = f.g.boss.health,
    radius = data.bosses.find((b) => b.id === "constable")!.radius;
  f.step({ technique1: true });
  for (let n = 0; n < 10 && f.flights().length; n++) f.step();
  assert.equal(f.flights().length, 0);
  assert.equal(f.bursts().length, 1);
  assert.equal(f.bursts()[0].x, 700 - radius - r.radius);
  assert.equal(f.g.boss.health, health);
});
test("bounds consume the actual shell without producing an off-board burst", () => {
  const f = fixture();
  f.p.x = f.p.oldX = f.g.arena.bounds.x + f.g.arena.bounds.width - 12;
  f.step({ technique1: true });
  assert.equal(f.flights().length, 0);
  assert.equal(f.bursts().length, 0);
  assert.equal(f.p.ammo, f.g.stats(f.p).magazine - 1);
});
for (const fork of [ids.compact, ids.frontal])
  test(
    fork + " captures its real fuse and geometry, with an actual rear tradeoff",
    () => {
      const f = fixture([fork, ids.command]);
      f.step({ technique1: true });
      const shell = f.flights()[0];
      assert.equal(
        shell.expires,
        1 +
          Math.ceil(
            (fork === ids.compact
              ? r.compactFuseSeconds
              : r.frontalFuseSeconds) * HZ,
          ),
      );
      const rear = f.emit("hostile", 565, 630),
        forward = f.emit("hostile", 695, 600);
      f.step({ technique2: true });
      const cue = f.bursts()[0];
      assert.equal(
        cue.radius,
        fork === ids.compact ? r.compactRadius : r.frontalReach,
      );
      assert.equal(cue.arc, fork === ids.compact ? Math.PI * 2 : r.frontalArc);
      assert.equal(f.g.shots.has(rear.id), fork === ids.frontal);
      assert.equal(f.g.shots.has(forward.id), fork === ids.compact);
    },
  );
test("manual aim captured at launch retains the forward fan bearing after the owner turns", () => {
  const f = fixture([ids.frontal, ids.command]);
  f.step({ technique1: true });
  const forward = f.emit("hostile", 680, 600),
    up = f.emit("hostile", 615, 530);
  f.step({ technique2: true, aim: -Math.PI / 2 });
  assert.equal(f.bursts()[0].aim, 0);
  assert(!f.g.shots.has(forward.id));
  assert(f.g.shots.has(up.id));
});
test("post-launch movement, actual nonlethal damage and reloading do not refund or delete a live shell", () => {
  const f = fixture([ids.command]);
  f.step({ technique1: true });
  const shell = f.flights()[0],
    until = shell.expires,
    ammo = f.p.ammo;
  f.step({ moveY: 1 });
  assert(f.g.shots.has(shell.id));
  const health = f.p.health;
  f.p.invulnerableUntil = 0;
  f.g.damage(f.p, 5, false, true);
  assert(f.p.health < health);
  f.step({ reload: true, technique2: true });
  assert(f.g.shots.has(shell.id));
  assert.equal(shell.expires, until);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.bursts().length, 0);
});
for (const loss of ["disconnect", "weapon", "entry", "pattern", "death"])
  test(
    loss + " removes unfinished flight while rostered spent recovery remains",
    () => {
      const f = fixture([ids.compact, ids.command]);
      f.step({ technique1: true });
      const shell = f.flights()[0],
        recovery = f.g.kitStatus(f.p.id).technique1At,
        ammo = f.p.ammo;
      if (loss === "disconnect") f.g.setConnected(f.p.id, false);
      if (loss === "weapon") f.p.weapon = "heavy-1";
      if (loss === "entry")
        f.p.skills = f.p.skills.filter((id) => id !== ids.entry);
      if (loss === "pattern")
        f.p.skills = f.p.skills.filter((id) => id !== ids.compact);
      if (loss === "death") f.p.health = 0;
      if (loss === "disconnect") f.g.step();
      else f.step();
      assert(!f.g.shots.has(shell.id));
      assert.equal(f.bursts().length, 0);
      assert.equal(f.g.flak.status(f.p, f.g.combatTick).technique1At, recovery);
      assert.equal(f.p.ammo, ammo);
    },
  );
test("host end removes actual flight, pending work and finite burst cues without another emission", () => {
  const f = fixture([ids.command]);
  f.step({ technique1: true });
  const id = f.flights()[0].id;
  f.g.endByHost();
  assert(!f.g.shots.has(id));
  assert.equal(
    f.g.classCues().filter((c) => c.kind === "heavy-flak-burst").length,
    0,
  );
  const ammo = f.p.ammo;
  f.step({ technique1: true, technique2: true });
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.flights().length, 0);
});
test("shared kit/cue data omit friendly trajectory and raw queue/payment internals", () => {
  const f = fixture([ids.command]);
  f.step({ technique1: true });
  const visible = viewOf(f.g, f.ally.id),
    owner = visible.players.find((p) => p.id === f.p.id)!;
  assert.equal(owner.kit.heavyFlakShotAt, 1);
  assert(
    !Object.hasOwn(owner.kit, "heavyFlakX") &&
      !Object.hasOwn(owner.kit, "heavyFlakY"),
  );
  assert(
    !Object.hasOwn(owner.kit, "flights") &&
      !Object.hasOwn(owner.kit, "pending"),
  );
  f.step({ technique2: true });
  const cue = f.bursts()[0];
  assert.deepEqual(Object.keys(cue).sort(), [
    "aim",
    "arc",
    "at",
    "contacts",
    "id",
    "kind",
    "owner",
    "radius",
    "until",
    "x",
    "y",
  ]);
  assert(cue.until > cue.at);
});

for (const [prefix, slot] of [
  ["heavy-suppression-", "e"],
  ["heavy-suppression-path-1-", "ultimate"],
  ["heavy-suppression-path-2-", "q"],
] as const)
  test(
    prefix +
      " issued General transformation retains its clock and physical shot schedule alongside Flak Round",
    () => {
      const skills = [
          ...Array.from({ length: 3 }, (_, i) => prefix + (i + 1)),
          ids.command,
        ],
        control = fixture(skills),
        flak = fixture(skills),
        oldShots = (events: ReturnType<Game["drainEvents"]>) =>
          events
            .flatMap((e) => (e.type === "shots" ? e.shots : []))
            .filter((s) => s.owner === "solo" && s.visual !== "flak")
            .map(({ id, ...s }) => s),
        controlShots: unknown[] = [],
        flakShots: unknown[] = [];
      assert.equal(control.p.totalSp, 12);
      assert.equal(flak.p.totalSp, 12);
      assert.deepEqual(control.p.skills, flak.p.skills);
      for (let frame = 0; frame < 12; frame++) {
        const action: Partial<InputFrame> =
          frame === 0
            ? { [slot]: true }
            : frame === 4
              ? { technique2: true }
              : {};
        control.step(action);
        flak.step({ ...action, ...(frame === 0 ? { technique1: true } : {}) });
        controlShots.push(...oldShots(control.g.drainEvents()));
        flakShots.push(...oldShots(flak.g.drainEvents()));
        for (const key of [
          "qAt",
          "eAt",
          "ultimateAt",
          "braceUntil",
          "overdriveUntil",
        ] as const)
          assert.equal(
            flak.p[key],
            control.p[key],
            prefix + ":" + key + ":" + frame,
          );
      }
      assert.deepEqual(flakShots, controlShots);
      assert.equal(flak.p.ammo, control.p.ammo - (slot === "ultimate" ? 0 : 1));
      assert.equal(flak.g.boss.health, control.g.boss.health);
      assert.equal(flak.p.health, control.p.health);
      if (slot === "ultimate")
        assert.equal(flak.g.kitStatus(flak.p.id).technique1At, 0);
      else
        assert(flak.g.kitStatus(flak.p.id).technique1At! > flak.g.combatTick);
    },
  );

test("actual hostile downing cancels the real flak shell in that same tick and retains rostered recovery", () => {
  const f = fixture([ids.command]);
  f.step({ technique1: true });
  const shell = f.flights()[0],
    recovery = f.g.kitStatus(f.p.id).technique1At,
    ammo = f.p.ammo;
  f.p.invulnerableUntil = 0;
  f.p.shield = 0;
  f.emit("hostile", f.p.x, f.p.y, 0, 0, 3, f.p.maxHealth * 10);
  f.g.drainEvents();
  f.step();
  assert.equal(f.p.status, "downed");
  assert.equal(f.g.combatTick, 2);
  assert.equal(f.g.phase, "combat");
  assert(
    !f.g.shots.has(shell.id),
    "Actual owner downing must remove the flight immediately, before another Game.step.",
  );
  assert.equal(f.g.flak.status(f.p, f.g.combatTick).technique1At, recovery);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.bursts().length, 0);
  assert(
    f.g
      .drainEvents()
      .some((e) => e.type === "remove" && e.ids.includes(shell.id)),
  );
});
