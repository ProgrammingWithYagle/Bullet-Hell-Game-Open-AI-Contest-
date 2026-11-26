import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { HeavyFlak, flakIds as ids } from "../src/shared/heavy-flak.ts";
import {
  seamId,
  validSeamPrivateEvent,
  type SeamPrivateEvent,
} from "../src/shared/heavy-seam.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import { encodeEvents, decodeEvents } from "../src/shared/wire-events.ts";
const eq: (a: unknown, b: unknown) => void = assert.deepEqual,
  ok = (v: unknown, message?: string) => assert(v, message);
let serial = 0;
// Actual production Game/controller/drain/codec. Boss, resources and physical fixtures are controlled.
function fixture(
  options: {
    handling?: "running" | "hanging";
    pattern?: "compact" | "frontal";
    seam?: boolean;
  } = {},
) {
  const g = new Game({
      mode: "raid",
      difficulty: "normal",
      seed: 41,
      maxPlayers: 2,
      arenaSelection: "fixed",
      openingArenaId: "gatehouse",
    }),
    p = g.addPlayer("solo", "Hux", "heavy"),
    ally = g.addPlayer("ally", "Medic", "medic");
  p.totalSp = 27;
  const buy = (item: string) => {
    const r = g.transact(p.id, {
      id: "seam-proto-" + ++serial,
      kind: "skill",
      item,
    });
    assert(r.ok, item + ":" + r.reason);
  };
  for (const item of [
    "heavy-ordnance-1",
    ids.entry,
    ...(options.pattern ? [ids[options.pattern]] : []),
    ids.command,
    ...(options.handling ? [ids[options.handling]] : []),
    ...(options.seam === false ? [] : [seamId]),
  ])
    buy(item);
  assert(g.start());
  const authority = (g as unknown as { flak: HeavyFlak }).flak;
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
  const events: any[] = [],
    batches: any[][] = [];
  const collect = () => {
      const next = structuredClone(g.drainEvents()) as any[];
      events.push(...next);
      batches.push(next);
      return next;
    },
    step = (input: any = {}) => {
      assert(
        g.submitInput(p.id, {
          ...idleInput(),
          sequence: ++sequence,
          aim: 0,
          ...input,
        }),
      );
      g.step();
      return collect();
    },
    emit = (
      x: number,
      y: number,
      extra: {
        damage?: number;
        speed?: number;
        angle?: number;
        owner?: string;
        radius?: number;
      } = {},
    ) => {
      const s = (g as any).emitShot(
        extra.owner ?? "hostile",
        x,
        y,
        extra.angle ?? 0,
        extra.speed ?? 0,
        extra.damage ?? 0,
        extra.radius ?? 3,
        0,
        10,
      );
      assert(s);
      return s;
    },
    flights = () =>
      [...g.shots.values()].filter(
        (s) => s.owner === p.id && s.visual === "flak",
      ),
    privateEvents = () =>
      events.filter(
        (e) => e.type === "private-class-cues",
      ) as SeamPrivateEvent[],
    contacts = () =>
      (g.classCues() as any[]).filter(
        (c) => c.kind === "heavy-flak-seam-contacts",
      );
  return {
    g,
    p,
    ally,
    authority,
    buy,
    events,
    batches,
    collect,
    step,
    emit,
    flights,
    privateEvents,
    contacts,
  };
}
test("actual catalog exact19earned gate rejects18without spending; this is controlled threshold isolation", () => {
  const g = new Game({ mode: "raid" }),
    p = g.addPlayer("hux", "Hux", "heavy");
  p.totalSp = 18;
  for (const id of ["heavy-ordnance-1", ids.entry, ids.command])
    ok(
      g.transact(p.id, { id: "gate-" + ++serial, kind: "skill", item: id }).ok,
    );
  const before = viewOf(g, p.id).players[0].sp;
  const reject = g.transact(p.id, {
    id: "gate-" + ++serial,
    kind: "skill",
    item: seamId,
  });
  eq(reject.reason, "insufficientPoints");
  eq(viewOf(g, p.id).players[0].sp, before);
  p.totalSp = 19;
  ok(
    g.transact(p.id, { id: "gate-" + ++serial, kind: "skill", item: seamId })
      .ok,
  );
  eq(viewOf(g, p.id).players[0].sp, 9);
});
test("actual Game records actual travel, pays once and emits contact-only public cues", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const shell = f.flights()[0],
    recovery = f.authority.status(f.p, 1).technique1At,
    until = shell.expires;
  for (let i = 0; i < 9; i++) f.step();
  eq(shell.x, 750);
  f.emit(615, 600);
  f.emit(750, 635);
  f.step({ technique1: true });
  eq(f.flights().length, 0);
  eq(f.p.ammo, ammo - 1);
  eq(f.authority.status(f.p, f.g.combatTick).technique1At, recovery);
  eq(f.contacts()[0].contacts, [{ x: 615, y: 600 }]);
  const evt = f.privateEvents().at(-1)!;
  ok(validSeamPrivateEvent(evt));
  eq(evt.cues[0].stage, "cut");
  eq(evt.cues[0].points[0], { x: 600, y: 600 });
  eq(evt.cues[0].points.at(-1), { x: 750, y: 600 });
  eq(until, 19);
  for (const viewer of ["solo", "ally", "late", "spectator", ""]) {
    const cues = (viewOf(f.g, viewer).classCues as any[]).filter(
      (c) => c.kind === "heavy-flak-seam-contacts",
    );
    eq(cues, f.contacts());
    for (const c of cues)
      for (const key of ["points", "path", "quota", "token"])
        ok(!Object.hasOwn(c, key));
  }
});
test("actual running pulse plus cut conserves1+2removals and the original recovery", () => {
  const f = fixture({ handling: "running" }),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const recovery = f.authority.status(f.p, 1).technique1At;
  f.emit(635, 600);
  f.step({ technique2: true });
  const early = structuredClone(
    (f.g.classCues() as any[]).find((c) => c.kind === "heavy-flak-burst"),
  );
  eq(early.contacts.length, 1);
  while (f.g.combatTick < 10) f.step();
  const a = f.emit(745, 600),
    b = f.emit(690, 600),
    c = f.emit(615, 600);
  f.step({ technique1: true });
  eq(f.contacts()[0].contacts, [
    { x: 745, y: 600 },
    { x: 690, y: 600 },
  ]);
  ok(!f.g.shots.has(a.id) && !f.g.shots.has(b.id) && f.g.shots.has(c.id));
  eq(early.contacts.length + f.contacts()[0].contacts.length, 3);
  eq(f.p.ammo, ammo - 1);
  eq(f.authority.status(f.p, f.g.combatTick).technique1At, recovery);
});
test("actual arrest keeps same-id stop/private trace and C chooses the narrow old ground", () => {
  const f = fixture({ handling: "hanging" }),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const shell = f.flights()[0],
    until = shell.expires;
  while (f.g.combatTick < 6) f.step();
  f.step({ technique2: true });
  eq(shell.vx, 0);
  eq(shell.vy, 0);
  const before = f.authority.ownerCues(f.p.id, 7)[0].points;
  f.step();
  eq(f.authority.ownerCues(f.p.id, 8)[0].points, before);
  f.emit(615, 600);
  const wide = f.emit(690, 635);
  f.step({ technique1: true });
  eq(f.contacts()[0].contacts, [{ x: 615, y: 600 }]);
  ok(f.g.shots.has(wide.id));
  eq(f.p.ammo, ammo - 1);
  eq(f.g.kitStatus(f.p.id).heavyFlakShotAt, 1);
  eq((f.authority.status(f.p, 9) as any).heavyFlakSeamAt, 9);
  eq(until, 19);
});
test("actual current cover behind the shell permanently breaks only the seam option", () => {
  const f = fixture();
  f.step({ technique1: true });
  while (f.g.combatTick < 10) f.step();
  f.g.arena.obstacles.push({ x: 650, y: 550, width: 10, height: 100 });
  f.step();
  eq((f.authority.status(f.p, 11) as any).heavyFlakSeamBroken, true);
  f.g.arena.obstacles.length = 0;
  f.step({ technique1: true });
  eq(f.flights().length, 1);
  eq((f.authority.status(f.p, 12) as any).heavyFlakSeamBroken, true);
  f.step({ technique2: true });
  eq(f.flights().length, 0);
  eq(f.contacts().length, 0);
  ok((f.g.classCues() as any[]).some((c) => c.kind === "heavy-flak-burst"));
  eq(f.privateEvents().at(-1)!.cues, []);
});
test("actual Game pool reuse cannot relocate a queued copied seam", () => {
  const f = fixture();
  f.step({ technique1: true });
  const originalShell = f.flights()[0];
  while (f.g.combatTick < 10) f.step();
  f.emit(615, 600);
  const stepShots = (f.g as any).stepShots;
  let recycled: any;
  (f.g as any).stepShots = function () {
    stepShots.call(this);
    recycled = this.emitShot("dummy", 1400, 850, 0, 0, 0, 3, 0, 10);
  };
  f.step({ technique1: true });
  eq(recycled, originalShell);
  eq(originalShell.x, 1400);
  eq(f.contacts()[0].contacts, [{ x: 615, y: 600 }]);
  eq(f.privateEvents().at(-1)!.cues[0].points.at(-1), { x: 750, y: 600 });
});
test("actual hostile downing cancels queued cut and emits private clear without refund", () => {
  const f = fixture();
  f.step({ technique1: true });
  const ammo = f.p.ammo,
    recovery = f.authority.status(f.p, 1).technique1At;
  f.p.invulnerableUntil = 0;
  f.p.shield = 0;
  f.emit(f.p.x, f.p.y, { damage: f.p.maxHealth * 10 });
  f.step({ technique1: true });
  eq(f.p.status, "downed");
  eq(f.flights().length, 0);
  eq(f.contacts().length, 0);
  eq(f.privateEvents().at(-1)!.cues, []);
  eq(f.p.ammo, ammo);
  eq(f.authority.status(f.p, f.g.combatTick).technique1At, recovery);
});
test("actual disconnect and host end clear private channel exactly once", () => {
  for (const hostEnd of [false, true]) {
    const f = fixture();
    f.step({ technique1: true });
    const recovery = f.authority.status(f.p, 1).technique1At;
    if (hostEnd) ok(f.g.endByHost());
    else f.g.setConnected(f.p.id, false);
    const next = f.collect().filter((e) => e.type === "private-class-cues");
    eq(next.length, 1);
    eq(next[0].cues, []);
    eq(
      f.collect().filter((e) => e.type === "private-class-cues"),
      [],
    );
    eq(f.flights().length, 0);
    if (!hostEnd) eq(f.authority.status(f.p, 1).technique1At, recovery);
  }
});
test("no extra private transport is emitted when Seam is absent", () => {
  const f = fixture({ seam: false });
  f.step({ technique1: true });
  f.step({ technique2: true });
  eq(f.privateEvents(), []);
  eq(f.authority.privateUpdates(f.g.combatTick), []);
});
test("private frame deduplication and phase-clear cache do not retain a stale path", () => {
  const f = fixture();
  f.step({ technique1: true });
  eq(f.authority.privateUpdates(1), []);
  const packet = f.privateEvents()[0];
  packet.cues[0].points[0].x = 999;
  f.step();
  eq(f.privateEvents().at(-1)!.cues[0].points[0], { x: 600, y: 600 });
  f.g.endByHost();
  const empty = f.collect().find((e) => e.type === "private-class-cues");
  eq(empty.cues, []);
  eq(f.authority.ownerCues("solo", f.g.combatTick), []);
  eq(f.authority.ownerCues("late", f.g.combatTick), []);
});
test("bounded wire codec roundtrips explicit private path and empty clear", () => {
  const f = fixture();
  f.step({ technique1: true });
  const packet = f.privateEvents()[0];
  ok(validSeamPrivateEvent(packet));
  eq(decodeEvents(encodeEvents([packet])), [packet]);
  const empty = {
    type: "private-class-cues" as const,
    owner: "solo",
    at: 2,
    run: f.g.settings.runId,
    encounter: 0,
    cues: [],
  };
  ok(validSeamPrivateEvent(empty));
  eq(decodeEvents(encodeEvents([empty])), [empty]);
});
const f = fixture();
f.step({ technique1: true });
const valid = structuredClone(f.privateEvents()[0]);
for (const [name, change] of [
  ["missing run", (v: any) => delete v.run],
  ["invalid run", (v: any) => (v.run = "bad run")],
  ["wrong outer owner", (v: any) => (v.owner = "foreign")],
  [
    "bad owner spelling",
    (v: any) => {
      v.owner = "bad owner";
      v.cues[0].owner = "bad owner";
    },
  ],
  ["negative tick", (v: any) => (v.at = -1)],
  ["fractional encounter", (v: any) => (v.encounter = 0.5)],
  ["too many cues", (v: any) => (v.cues = [v.cues[0], v.cues[0], v.cues[0]])],
  ["extra private quota", (v: any) => (v.quota = 3)],
  ["wrong cue kind", (v: any) => (v.cues[0].kind = "heavy-flak-burst")],
  ["zero cue id", (v: any) => (v.cues[0].id = 0)],
  ["future cue birth", (v: any) => (v.cues[0].at = v.at + 1)],
  ["expired cue", (v: any) => (v.cues[0].until = v.at)],
  ["extra cue token", (v: any) => (v.cues[0].token = 5)],
  ["nonboolean broken", (v: any) => (v.cues[0].broken = 1)],
  ["unknown stage", (v: any) => (v.cues[0].stage = "pending")],
  ["empty point list", (v: any) => (v.cues[0].points = [])],
  [
    "too many points",
    (v: any) =>
      (v.cues[0].points = Array.from({ length: 26 }, () => ({ x: 0, y: 0 }))),
  ],
  ["nonfinite point", (v: any) => (v.cues[0].points[0].x = Infinity)],
  ["NaN point", (v: any) => (v.cues[0].points[0].y = NaN)],
  ["outside world bound", (v: any) => (v.cues[0].points[0].x = 100001)],
  ["extra point field", (v: any) => (v.cues[0].points[0].future = true)],
  ["null cue", (v: any) => (v.cues = [null])],
] as [string, (v: any) => void][])
  test("malformed private wire " + name + " rejects", () => {
    const value = structuredClone(valid);
    change(value);
    eq(validSeamPrivateEvent(value), false);
    assert.throws(() => decodeEvents([value] as any));
  });
