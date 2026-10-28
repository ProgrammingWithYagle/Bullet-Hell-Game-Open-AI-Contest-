import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MarshalChains,
  marshalRules as r,
  marshalEnvelopeLength,
  type MarshalChain,
} from "../src/shared/marshal-chains.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { Game, data } from "../src/shared/game.ts";
import { runtimeArena, runtimeArenas } from "../src/shared/arena-layouts.ts";
import { distance, segmentRect, type Rect } from "../src/shared/geometry.ts";
import {
  PROTOCOL,
  CONTENT_REVISION,
  type BossVariant,
} from "../src/shared/protocol.ts";
import {
  marshalHelp,
  marshalPhaseName,
  marshalPhaseHint,
} from "../src/client/marshal-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { viewOf } from "../src/shared/view.ts";
import { encounterFrame } from "../src/client/encounter-presentation.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
const chains = (d: MarshalChains) =>
  d.cues().filter((c): c is MarshalChain => c.kind === "chain");
function fixture(
  form: BossVariant = "normal",
  phase = 0,
  obstacles: Rect[] = [],
) {
  const d = new MarshalChains(),
    p = { id: "p", x: 800, y: 750, oldX: 800, oldY: 750 },
    hits: { tick: number; amount: number }[] = [],
    shots: { tick: number; x: number; y: number; angle: number }[] = [];
  let serial = 0;
  const c: SignatureContext = {
    tick: 1,
    bossId: "chain-marshal",
    boss: { x: 800, y: 300 },
    radius: 58,
    targets: [p],
    aimTargets: [p],
    bounds: { x: 128, y: 80, width: 1344, height: 840 },
    obstacles,
    variant: form,
    brutal: form !== "normal",
    phase,
    damageScale: 1,
    id: () => ++serial,
    damage: (_id, amount) => hits.push({ tick: c.tick, amount }),
    spawnRat: () => {},
    emitControlled: (point, angle) => {
      shots.push({ tick: c.tick, x: point.x, y: point.y, angle });
      return ++serial;
    },
  };
  const step = () => {
    c.tick++;
    d.step(c);
  };
  d.step(c);
  return { d, c, p, hits, shots, step };
}
function ready(
  form: BossVariant = "normal",
  phase = 0,
  obstacles: Rect[] = [],
) {
  const f = fixture(form, phase, obstacles);
  for (let n = 0; n < 300 && !chains(f.d).length; n++) f.step();
  assert.equal(chains(f.d).length, 2);
  return f;
}
function game(form: BossVariant = "normal", phase = 0, difficulty = "normal") {
  const g = createPracticeGame(
    {
      openingBossId: "chain-marshal",
      openingArenaId: "gatehouse",
      mode: "endless",
      difficulty,
      seed: 491,
    },
    "Mara",
    "soldier",
    form,
  );
  g.start();
  g.boss.deadline = 1e9;
  g.players.get("solo")!.invulnerableUntil = 1e9;
  if (phase) g.boss.health = g.boss.maxHealth * 0.49;
  return g;
}
const untilGame = (g: Game, check: () => boolean, max = 1200) => {
  for (let n = 0; n < max && !check(); n++) g.step();
  assert(check());
};
const point = (q: MarshalChain, angle: number, length: number) => ({
  x: q.x + Math.cos(angle) * length,
  y: q.y + Math.sin(angle) * length,
});

test("Held Line keeps the body planted, gives two opposite locked80degree sweeps and preserves90/180anchor health", () => {
  for (const form of ["normal", "brutal", "crazed"] as const) {
    const f = ready(form),
      q = chains(f.d);
    assert.equal(q[0].at - f.c.tick, 42);
    assert.equal(q[1].at, q[0].at);
    assert.equal(q[0].legs, 1);
    assert.equal(q[1].legs, 1);
    assert.equal(q[0].sweep, -q[1].sweep);
    assert.equal(q[0].health, form === "normal" ? 90 : 180);
    assert.equal(q[0].width, 18);
    assert.equal(q[0].endsAt - q[0].at, 75);
    f.p.x = 1300;
    const locked = JSON.stringify(
      q.map((q) => ({
        edge: q.edge,
        start: q.startAngle,
        sweep: q.sweep,
        at: q.at,
      })),
    );
    while (f.c.tick < q[0].at - 1) f.step();
    assert.deepEqual(f.c.boss, { x: 800, y: 300 });
    assert.equal(f.hits.length, 0);
    assert.equal(
      JSON.stringify(
        chains(f.d).map((q) => ({
          edge: q.edge,
          start: q.startAngle,
          sweep: q.sweep,
          at: q.at,
        })),
      ),
      locked,
    );
  }
});
test("late Writ marks a collision-resolved body move, then staggers two fresh complete warnings and return legs", () => {
  const f = fixture("normal", 1),
    patrol = f.d.cues().find((c) => c.kind === "marshal-patrol");
  assert(patrol?.kind === "marshal-patrol");
  assert.equal(chains(f.d).length, 0);
  assert.equal(patrol.moveAt - f.c.tick, 21);
  while (f.c.tick < patrol.moveAt - 1) {
    f.step();
    assert.deepEqual(f.c.boss, { x: 800, y: 300 });
  }
  while (!chains(f.d).length) f.step();
  const q = chains(f.d);
  assert(distance(f.c.boss, { x: 800, y: 300 }) > 160);
  assert.equal(q[0].at - f.c.tick, 42);
  assert.equal(q[1].at - q[0].at, 17);
  assert(q.every((q) => q.legs === 2));
});
test("inserted cover stops the marked move early but the subsequent anchor field still receives a full new warning", () => {
  const f = fixture("normal", 1),
    p = f.d.cues().find((c) => c.kind === "marshal-patrol");
  assert(p?.kind === "marshal-patrol");
  f.c.obstacles.push({
    x: Math.min(p.x1, p.x2) + 65,
    y: p.y1 - 70,
    width: 25,
    height: 140,
  });
  while (!chains(f.d).length && f.c.tick < 300) f.step();
  assert.equal(chains(f.d).length, 2);
  assert(chains(f.d).every((q) => q.at - f.c.tick >= 42));
  assert(distance(f.c.boss, { x: p.x2, y: p.y2 }) > 10);
});
test("surviving late anchors aim a reversed return only when a fresh warning starts and never track within that warning", () => {
  const f = ready("brutal", 1),
    first = chains(f.d),
    q = first[0];
  f.p.x = 1100;
  f.p.y = 700;
  while (chains(f.d).find((a) => a.id === q.id)!.leg === 1) f.step();
  const ret = chains(f.d).find((a) => a.id === q.id)!;
  assert.equal(ret.leg, 2);
  assert.equal(ret.at - f.c.tick, 42);
  assert.equal(ret.sweep, -q.sweep);
  assert.notEqual(ret.startAngle, q.startAngle);
  const locked = JSON.stringify({
    edge: ret.edge,
    start: ret.startAngle,
    at: ret.at,
  });
  f.p.x = 400;
  f.p.y = 200;
  while (f.c.tick < ret.at - 1) f.step();
  const after = chains(f.d).find((a) => a.id === q.id)!;
  assert.equal(
    JSON.stringify({ edge: after.edge, start: after.startAngle, at: after.at }),
    locked,
  );
  const modified = chains(f.d);
  modified[0].edge[0].x = 999999;
  assert.notEqual(chains(f.d)[0].edge[0].x, 999999);
});
test("cutting an anchor cancels only its own future sweep and owned barb repeats while the surviving anchor continues", () => {
  const f = ready("crazed", 1),
    q = chains(f.d),
    one = q[0],
    other = q[1];
  assert.equal(f.d.hit(one.id, 1000), 180);
  assert.equal(f.d.hit(one.id, 1000), 0);
  assert(
    !f.d
      .cues()
      .some((c) => c.kind === "marshal-barbs" && c.anchorId === one.id),
  );
  assert(
    f.d
      .cues()
      .some((c) => c.kind === "marshal-barbs" && c.anchorId === other.id),
  );
  let returned = false;
  for (let n = 0; n < 600 && f.d.busy; n++) {
    f.step();
    returned ||= chains(f.d).some((c) => c.id === other.id && c.leg === 2);
    assert(
      !f.d
        .cues()
        .some((c) => c.kind === "marshal-barbs" && c.anchorId === one.id),
    );
  }
  assert(returned);
  assert(f.shots.length > 0);
  assert(f.shots.every((s) => s.x === other.x && s.y === other.y));
  assert.deepEqual(f.d.cues(), []);
});
test("advanced opening barbs emit exactly40Brutal/120Crazed controlled shots with full separate warnings and extra crossing trajectories", () => {
  for (const form of ["brutal", "crazed"] as const) {
    const f = ready(form),
      barbs = f.d.cues().filter((c) => c.kind === "marshal-barbs");
    assert(barbs.every((b) => b.at - b.beganAt === 36));
    assert(barbs.every((b) => b.angles.length <= 8));
    assert.equal(
      barbs.filter((b) => b.crossing).length,
      form === "crazed" ? 10 : 0,
    );
    const total = barbs.reduce((n, b) => n + b.angles.length, 0);
    assert.equal(total, form === "brutal" ? 40 : 120);
    for (let n = 0; n < 600 && f.d.busy; n++) f.step();
    assert.equal(f.shots.length, total);
    assert(
      f.shots.every((s) =>
        barbs.some(
          (b) =>
            b.at === s.tick &&
            b.x === s.x &&
            b.y === s.y &&
            b.angles.includes(s.angle),
        ),
      ),
    );
  }
});
test("actual Game emits the owned advanced barb budget once without recapturing it into the global echo queue", () => {
  for (const form of ["brutal", "crazed"] as const) {
    const g = game(form);
    g.step();
    Reflect.set(g, "attackAt", Array(20).fill(1e9));
    Reflect.get(g, "variantPressure").reset(1e9);
    const cues = g.director.civic.marshal
        .cues()
        .filter((c) => c.kind === "marshal-barbs"),
      last = Math.max(...cues.map((c) => c.at));
    let count = 0;
    const emit = Reflect.get(g, "emitShot").bind(g);
    Reflect.set(g, "emitShot", (...args: any[]) => {
      const value = emit(...args);
      if (value && args[0] === "hostile") count++;
      return value;
    });
    while (g.combatTick <= last) g.step();
    assert.equal(count, form === "brutal" ? 40 : 120);
    assert.equal(g.brutalVolley.queuedProjectiles, 0);
  }
});
test("real sweep contact includes fast whole-body crossings, is harmless before activation and shares one half-second budget across both arms", () => {
  const f = ready(),
    q = chains(f.d)[0];
  f.d.hit(chains(f.d)[1].id, 1000);
  const angle = q.startAngle + q.sweep * 0.3,
    center = point(q, angle, 180),
    perp = { x: -Math.sin(angle), y: Math.cos(angle) };
  f.c.tick = q.at + Math.round(75 * 0.3);
  f.p.oldX = center.x - perp.x * 200;
  f.p.oldY = center.y - perp.y * 200;
  f.p.x = center.x + perp.x * 200;
  f.p.y = center.y + perp.y * 200;
  f.d.step(f.c);
  assert.equal(f.hits.length, 1);
  assert.equal(f.hits[0].amount, 9);
  f.d.step(f.c);
  assert.equal(f.hits.length, 1);
  const both = ready();
  const qs = chains(both.d);
  both.c.tick = qs[0].at + 38;
  both.d.step(both.c);
  assert.equal(both.hits.length, 1);
  assert.equal(both.hits[0].amount, 9);
});
test("new masonry clips the live arm immediately and the painted locked envelope prevents growth after original cover is removed", () => {
  const first = ready(),
    q = chains(first.d)[0],
    center = point(q, q.startAngle, 300),
    wall = { x: center.x - 20, y: center.y - 20, width: 40, height: 40 },
    f = ready("normal", 0, [wall]),
    a = chains(f.d)[0];
  assert.equal(a.x, q.x);
  assert.equal(a.y, q.y);
  f.d.hit(chains(f.d)[1].id, 1000);
  const locked = marshalEnvelopeLength(a, a.startAngle);
  assert(locked < 300);
  f.c.obstacles.length = 0;
  const far = point(a, a.startAngle, locked + 60);
  f.p.x = f.p.oldX = far.x;
  f.p.y = f.p.oldY = far.y;
  f.c.tick = a.at;
  f.d.step(f.c);
  assert.equal(f.hits.length, 0);
  assert(chains(f.d)[0].length <= locked + 0.001);
  const live = ready(),
    b = chains(live.d)[0];
  live.d.hit(chains(live.d)[1].id, 1000);
  const stop = point(b, b.startAngle, 80),
    exposed = point(b, b.startAngle, 200);
  live.c.obstacles.push({
    x: stop.x - 20,
    y: stop.y - 20,
    width: 40,
    height: 40,
  });
  live.p.x = live.p.oldX = exposed.x;
  live.p.y = live.p.oldY = exposed.y;
  live.c.tick = b.at;
  live.d.step(live.c);
  assert.equal(live.hits.length, 0);
  assert(chains(live.d)[0].length < 80);
});
test("every actual map/difficulty provides clear separated anchors, bounded plain-geometry warning vertices and no buried socket", () => {
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties) {
      const a = runtimeArena(map.id, difficulty.id),
        f = fixture();
      f.d.reset();
      f.c.obstacles = a.obstacles;
      f.c.bounds = a.bounds;
      f.c.hazardCircles = a.lavaPits;
      f.c.boss = { ...a.bossSpawn };
      f.p.x = f.p.oldX = a.playerSpawn.x;
      f.p.y = f.p.oldY = a.playerSpawn.y;
      f.d.step(f.c);
      const q = chains(f.d);
      assert.equal(q.length, 2, map.id + ":" + difficulty.id);
      assert(distance(q[0], q[1]) > 224);
      for (const arm of q) {
        assert(!a.obstacles.some((o) => segmentRect(arm, arm, o, 37)));
        assert(a.lavaPits.every((p) => distance(p, arm) > p.radius + 37));
        assert.equal(arm.edge.length, 76);
        for (const p of arm.edge)
          assert.deepEqual(Object.keys(p).sort(), ["x", "y"]);
      }
    }
});
test("a full signature recovers explicitly, permits auxiliary casts only between sequences and reset/paused state cancels every owned future cue", () => {
  const f = ready("crazed", 1);
  let seenEmpty = false;
  for (let n = 0; n < 800 && f.d.busy; n++) {
    f.step();
    seenEmpty ||= f.d.busy && !f.d.cues().length;
  }
  assert(!f.d.busy);
  assert(seenEmpty);
  assert(f.d.nextSignatureAt > f.c.tick);
  f.c.tick = f.d.nextSignatureAt;
  f.c.auxiliaryBusy = true;
  f.d.step(f.c);
  assert(!f.d.busy);
  f.c.auxiliaryBusy = false;
  f.d.step(f.c);
  assert(f.d.busy);
  f.c.paused = true;
  f.step();
  assert.deepEqual(f.d.cues(), []);
  assert(!f.d.busy);
});
test("phase stagger victory timeout and wipe clear real Marshal paths, anchors, owned repeats and pending global echoes", () => {
  for (const end of ["phase", "stagger", "victory", "timeout", "wipe"]) {
    const g = game("crazed");
    g.step();
    assert(g.director.civic.marshal.cues().length);
    if (end === "phase") g.boss.health = g.boss.maxHealth * 0.49;
    if (end === "stagger") g.boss.staggerUntil = g.combatTick + 90;
    if (end === "victory") g.boss.health = 0;
    if (end === "timeout") g.boss.deadline = g.combatTick + 1;
    if (end === "wipe") g.players.get("solo")!.status = "eliminated";
    g.step();
    assert.equal(g.director.civic.marshal.cues().length, 0, end);
    assert(!g.bossCues().some((c) => c.kind === "brutal-echo"), end);
  }
  const baby = game("normal", 1, "baby");
  baby.step();
  assert(baby.accord);
  assert.equal(baby.director.civic.marshal.cues().length, 0);
});
test("existing casting poses and fifteen authored phase guides follow the new warning/return clocks without claiming new walking art", () => {
  const g = game("brutal");
  g.step();
  const q = chains(g.director.civic.marshal)[0];
  assert.equal(encounterFrame(g.boss, q.at - 2, g.director.cues()), 3);
  assert(encounterFrame(g.boss, q.at, g.director.cues()) >= 4);
  assert.equal(encounterFrame(g.boss, q.at, g.director.cues(), true), 0);
  for (const l of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + l.id + ".json", "utf8"),
    ).messages;
    assert.equal(marshalPhaseName(1, l.id), m["boss.chain-marshal.phase.1"]);
    assert.equal(
      marshalPhaseHint(0, "normal", l.id),
      m["boss.chain-marshal.phaseHint.0"],
    );
    assert.equal(
      signatureHelp(viewOf(g, "solo"), l.id),
      marshalHelp("brutal", l.id),
    );
    assert.notEqual(marshalHelp("crazed", l.id), marshalHelp("brutal", l.id));
  }
});
test("only known protocol27 local Practice/profile state migrates while exact forms/build history remains and online/signed state stays strict", () => {
  const g = game("crazed");
  g.boss.health = 0;
  g.step();
  const save = g.offlineCheckpoint()!,
    old = structuredClone(save),
    revision =
      "b6d1eca2e4cc89073c4e45a5007b4e39ff98bc30ba98337782777170210a0438";
  old.protocolVersion = 27;
  old.contentRevision = revision;
  const after = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 35);
  assert.equal(after.contentRevision, CONTENT_REVISION);
  assert.deepEqual(after.player, save.player);
  assert.deepEqual(after.completedBossForms, save.completedBossForms);
  for (const bad of [
    { ...old, contentRevision: "0".repeat(64) },
    { ...old, serverOnly: true },
    { ...old, practiceOnly: false },
    { ...old, players: [] },
    { ...old, transactions: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad));
  const profile = freshProfile();
  profile.contentRevision = revision;
  assert.deepEqual(
    { ...parseProfile(JSON.stringify(profile)), contentRevision: revision },
    profile,
  );
});
test(
  "real owner and observer receive phase movement, clipped locked return geometry, source-specific cuts and cleanup",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port,
      owner = new Session(endpoint),
      guest = new Session(endpoint);
    const until = async (check: () => boolean) => {
      const end = Date.now() + 6000;
      while (!check()) {
        if (Date.now() > end) throw Error("Marshal state did not replicate");
        await new Promise((r) => setTimeout(r, 15));
      }
    };
    try {
      const opts = {
        name: "Host",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "chain-marshal" as const,
        openingArenaId: "crown-crypt",
      };
      await owner.connect(opts);
      await guest.connect(
        { ...opts, name: "Observer" },
        { roomId: owner.room!.roomId },
      );
      await until(() => owner.view?.players.length === 2);
      owner.start();
      await until(() => guest.view?.phase === "combat");
      const g = liveRooms.get(owner.room!.roomId)!.game;
      g.boss.deadline = 1e9;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      g.boss.health = g.boss.maxHealth * 0.49;
      g.step();
      untilGame(g, () =>
        g.director.civic.marshal
          .cues()
          .some((c) => c.kind === "marshal-patrol"),
      );
      const patrol = g.director.civic.marshal
        .cues()
        .find((c) => c.kind === "marshal-patrol")!;
      await until(
        () => guest.view?.bossCues.some((c) => c.id === patrol.id) === true,
      );
      untilGame(g, () =>
        chains(g.director.civic.marshal).some((c) => c.leg === 2),
      );
      const q = chains(g.director.civic.marshal).find((c) => c.leg === 2)!;
      await until(() =>
        [owner, guest].every((s) =>
          s.view?.bossCues.some(
            (c) => c.kind === "chain" && c.id === q.id && c.leg === 2,
          ),
        ),
      );
      for (const s of [owner, guest]) {
        const found = s.view!.bossCues.find((c) => c.id === q.id);
        assert(found?.kind === "chain");
        assert.deepEqual(found.edge, q.edge);
        assert.equal(found.at, q.at);
      }
      assert.equal(g.director.hitWeakPoint(180, g.combatTick, q.id), 180);
      await until(
        () =>
          guest.view?.bossCues.some(
            (c) => c.kind === "chain" && c.id === q.id && c.health === 0,
          ) === true,
      );
      assert(
        !guest.view!.bossCues.some(
          (c) => c.kind === "marshal-barbs" && c.anchorId === q.id,
        ),
      );
      g.boss.health = 0;
      await until(() => guest.view?.phase !== "combat");
      assert.equal(guest.view!.bossCues.length, 0);
    } finally {
      await Promise.allSettled([owner.close(), guest.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);
