import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TollkeeperReturn,
  tollkeeperRay,
  type TollkeeperWheel,
} from "../src/shared/tollkeeper-return.ts";
import type { BossCue, SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { Game, data } from "../src/shared/game.ts";
import {
  HZ,
  PROTOCOL,
  CONTENT_REVISION,
  type BossVariant,
} from "../src/shared/protocol.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import {
  tollkeeperHelp,
  tollkeeperPhaseName,
  tollkeeperPhaseHint,
} from "../src/client/tollkeeper-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { encounterFrame } from "../src/client/encounter-presentation.ts";
import { viewOf } from "../src/shared/view.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
const wheels = (d: TollkeeperReturn) =>
  d.cues().filter((c): c is TollkeeperWheel => c.kind === "wheel");
function fixture(phase = 0, advanced = false) {
  let id = 0;
  const d = new TollkeeperReturn(),
    p = { id: "p", x: 800, y: 750, oldX: 800, oldY: 750 },
    hits: number[] = [],
    shots: { tick: number; x: number; y: number; angle: number }[] = [];
  const c: SignatureContext = {
    tick: 1,
    bossId: "tollkeeper",
    boss: { x: 800, y: 300 },
    radius: 58,
    targets: [p],
    obstacles: [],
    damageScale: 1,
    brutal: advanced,
    phase,
    id: () => ++id,
    damage: (_id, n) => hits.push(n),
    spawnRat: () => {},
    emitHostile: (point, angle) =>
      shots.push({ tick: c.tick, x: point.x, y: point.y, angle }),
  };
  const step = () => {
    c.tick++;
    d.step(c);
  };
  d.step(c);
  const until = (check: () => boolean) => {
    let guard = 0;
    while (!check()) {
      step();
      assert(++guard < 2500);
    }
  };
  return { d, c, p, hits, shots, step, until };
}
function game(form: BossVariant = "normal", phase = 0, difficulty = "normal") {
  const g = createPracticeGame(
    { openingBossId: "tollkeeper", mode: "endless", difficulty, seed: 17 },
    "Mara",
    "soldier",
    form,
  );
  g.start();
  g.players.get("solo")!.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  if (phase) {
    g.boss.health = g.boss.maxHealth * 0.49;
    g.step();
  }
  return g;
}
const untilGame = (g: Game, check: () => boolean) => {
  for (let n = 0; n < 3000 && !check(); n++) g.step();
  assert(check());
};

test("Tollkeeper body rays use supplied board bounds and reflect from actual masonry", () => {
  const f = fixture();
  f.c.bounds = { x: 200, y: 100, width: 1000, height: 700 };
  const r = tollkeeperRay(f.c, { x: 800, y: 300 }, { x: 1, y: 0 });
  assert(Math.abs(r.point.x - 1158) < 0.1);
  assert.deepEqual(r.normal, { x: -1, y: 0 });
  f.c.obstacles.push({ x: 950, y: 180, width: 40, height: 300 });
  const hit = tollkeeperRay(f.c, { x: 800, y: 300 }, { x: 1, y: 0 });
  assert(Math.abs(hit.point.x - 908) < 0.1);
});
test("Standard opening retains its fixed complete reflection and cue vertices contain geometry only", () => {
  const f = fixture(),
    w = wheels(f.d)[0],
    locked = structuredClone(w.path);
  assert.equal(w.path.length, 3);
  assert.equal(w.at - f.c.tick, 36);
  assert.equal(w.banked, false);
  for (const p of w.path) assert.deepEqual(Object.keys(p).sort(), ["x", "y"]);
  w.path[0].x = 123;
  assert.equal(wheels(f.d)[0].path[0].x, 800);
  f.p.x = 200;
  f.p.y = 200;
  while (f.c.tick < w.at) {
    f.step();
    assert.deepEqual(wheels(f.d)[0].path, locked);
  }
  assert.equal(f.hits.length, 0);
});
test("late booth movement stops at new cover then gives a complete warning from its actual stop", () => {
  const f = fixture(1),
    patrol = f.d.cues().find((c) => c.kind === "tollkeeper-patrol");
  assert(patrol?.kind === "tollkeeper-patrol");
  f.c.obstacles.push({ x: 700, y: 210, width: 20, height: 180 });
  f.until(() => wheels(f.d).length > 0);
  const w = wheels(f.d)[0];
  assert(distance(f.c.boss, { x: 800, y: 300 }) > 1);
  assert(distance(f.c.boss, { x: patrol.x2, y: patrol.y2 }) > 50);
  assert.equal(w.at - f.c.tick, 36);
  assert.deepEqual(w.path[0], f.c.boss);
  assert(!f.c.obstacles.some((o) => segmentRect(f.c.boss, f.c.boss, o, 58)));
});
test("late wheel halts at a bank and locks a fresh target heading for the whole return tell", () => {
  const f = fixture(1);
  f.until(() => wheels(f.d).length > 0);
  const first = wheels(f.d)[0];
  f.p.x = f.p.oldX = 300;
  f.p.y = f.p.oldY = 200;
  f.until(() => wheels(f.d)[0]?.banked === true);
  const second = wheels(f.d)[0],
    path = structuredClone(second.path),
    start = f.c.tick;
  assert.notEqual(first.id, second.id);
  assert.equal(second.leg, 2);
  assert.equal(second.path.length, 2);
  assert.equal(second.at - start, 36);
  const a = Math.atan2(
      second.path[1].y - second.y,
      second.path[1].x - second.x,
    ),
    aim = Math.atan2(f.p.y - second.y, f.p.x - second.x);
  assert(Math.cos(a - aim) > 0.999);
  f.p.x = f.p.oldX = 1200;
  f.p.y = f.p.oldY = 800;
  while (f.c.tick < second.at - 1) {
    f.step();
    const w = wheels(f.d)[0];
    assert.equal(w.x, second.x);
    assert.equal(w.y, second.y);
    assert.deepEqual(w.path, path);
  }
});
test("advanced banks warn fixed gapped side sprays and add a third late wheel leg", () => {
  for (const phase of [0, 1]) {
    const f = fixture(phase, true),
      ids = new Set<number>(),
      banks = new Map<number, number>();
    let peak = 0;
    while (f.d.busy) {
      const cues = f.d.cues();
      peak = Math.max(peak, wheels(f.d).length);
      for (const c of cues) {
        if (c.kind === "wheel") ids.add(c.id);
        if (c.kind === "tollkeeper-bank") {
          assert.equal(c.at - c.beganAt, 36);
          assert.equal(c.angles.length, phase ? 12 : 8);
          assert(
            c.angles.every(
              (a) =>
                Math.abs(
                  Math.atan2(Math.sin(a - c.aim), Math.cos(a - c.aim)),
                ) >=
                c.halfGap - 1e-8,
            ),
          );
          banks.set(c.id, c.angles.length);
        }
      }
      f.step();
      assert(f.c.tick < 2500);
    }
    assert.equal(peak, 1);
    assert.equal(ids.size, phase ? 3 : 2);
    assert.equal(banks.size, phase ? 2 : 1);
    assert.equal(f.shots.length, phase ? 24 : 8);
    assert.equal(f.d.nextAt - f.c.tick, 45);
  }
});
test("a banked wheel is harmless during its entire tell and hits when its next leg releases", () => {
  const f = fixture(1);
  f.until(() => wheels(f.d)[0]?.banked === true);
  const w = wheels(f.d)[0];
  f.p.x = f.p.oldX = w.x;
  f.p.y = f.p.oldY = w.y;
  const before = f.hits.length;
  while (f.c.tick < w.at - 1) {
    f.step();
    assert.equal(f.hits.length, before);
  }
  f.step();
  assert.equal(f.hits.length, before + 1);
  assert.equal(f.hits.at(-1), 15);
});
test("newly inserted masonry cancels a live wheel at the actual collision instead of tunneling", () => {
  const f = fixture(),
    w = wheels(f.d)[0];
  f.until(() => f.c.tick >= w.at + 3);
  const at = wheels(f.d)[0];
  f.c.obstacles.push({ x: at.x - 70, y: at.y + 55, width: 140, height: 10 });
  f.until(() => !wheels(f.d).length);
  assert(f.c.tick < w.until - 50);
  assert(!f.d.cues().some((c) => c.kind === "tollkeeper-bank"));
});
test("actual retained auxiliary attacks cast between routes and never overlap an active Tollkeeper tell", () => {
  const g = game("brutal", 1);
  let auxiliary = false,
    bank = false,
    patrol = false;
  for (let n = 0; n < 2300; n++) {
    g.step();
    const busy = g.director.civic.tollkeeper.busy;
    auxiliary ||= g.warnings.length > 0;
    bank ||= g.director.cues().some((c) => c.kind === "tollkeeper-bank");
    patrol ||= g.director.cues().some((c) => c.kind === "tollkeeper-patrol");
    if (busy) assert.equal(g.warnings.length, 0);
  }
  assert(auxiliary && bank && patrol);
});
test("real bank spray emissions retain exact20Brutal and60Crazed projectile budgets", () => {
  for (const form of ["brutal", "crazed"] as const) {
    const g = game(form);
    untilGame(g, () =>
      g.director.cues().some((c) => c.kind === "tollkeeper-bank"),
    );
    const bank = g.director.cues().find((c) => c.kind === "tollkeeper-bank");
    assert(bank?.kind === "tollkeeper-bank");
    g.drainEvents();
    let count = 0;
    while (g.combatTick <= bank.at + Math.ceil(3.4 * HZ)) {
      g.step();
      for (const e of g.drainEvents())
        if (e.type === "shots")
          count += e.shots.filter(
            (s) => s.owner === "hostile" && s.x === bank.x && s.y === bank.y,
          ).length;
    }
    assert.equal(count, form === "brutal" ? 20 : 60);
  }
});
test("phase retains Tollkeeper wheels and banks; stagger and encounter exit clear owned work", () => {
  for (const end of ["phase", "stagger", "victory", "timeout", "wipe"]) {
    const g = game("crazed");
    untilGame(g, () =>
      g.director.cues().some((c) => c.kind === "tollkeeper-bank"),
    );
    const committed = g.director.cues().filter(q => !("until" in q) || q.until > g.combatTick + 1).map(q => q.id);
    if (end === "phase") g.boss.health = g.boss.maxHealth * 0.49;
    if (end === "stagger") g.boss.staggerUntil = g.combatTick + 120;
    if (end === "victory") g.boss.health = 0;
    if (end === "timeout") g.boss.deadline = g.combatTick + 1;
    if (end === "wipe") g.players.get("solo")!.status = "eliminated";
    g.step();
    if(end === "phase") {
      assert(committed.length);
      assert(committed.every(id => g.director.cues().some(q => q.id === id)));
      continue;
    }
    assert.equal(g.director.cues().length, 0, end);
    assert(!g.bossCues().some((c) => c.kind === "brutal-echo"), end);
  }
});
test("Baby assistance pauses wheel routes while Normal and advanced forms retain their intrinsic bank mechanic", () => {
  const baby = game("normal", 1, "baby");
  assert(baby.accord);
  for (let n = 0; n < 20; n++) baby.step();
  assert(!baby.director.cues().length);
  for (const form of ["normal", "brutal", "crazed"] as const) {
    const g = game(form, 1);
    assert(!g.accord);
    untilGame(g, () =>
      g.director.cues().some((c) => c.kind === "tollkeeper-bank"),
    );
  }
});
test("Tollkeeper fifteen-locale help and retained casting poses follow actual wheel and bank clocks", () => {
  const g = game("brutal");
  untilGame(g, () => g.director.cues().some((c) => c.kind === "wheel"));
  const wheel = g.director.cues().find((c) => c.kind === "wheel");
  assert(wheel?.kind === "wheel");
  assert.equal(encounterFrame(g.boss, wheel.at - 2, g.director.cues()), 2);
  assert(encounterFrame(g.boss, wheel.at, g.director.cues()) >= 4);
  assert.equal(encounterFrame(g.boss, wheel.at, g.director.cues(), true), 0);
  for (const l of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + l.id + ".json", "utf8"),
    ).messages;
    assert.equal(tollkeeperPhaseName(1, l.id), m["boss.tollkeeper.phase.1"]);
    assert.equal(
      tollkeeperPhaseHint(0, "normal", l.id),
      m["boss.tollkeeper.phaseHint.0"],
    );
    assert.equal(
      signatureHelp(viewOf(g, "solo"), l.id),
      tollkeeperHelp("brutal", l.id),
    );
  }
});
test("known protocol25 local Practice and profile history migrates exactly while unknown or signed state stays strict", () => {
  const g = game("crazed");
  g.boss.health = 0;
  g.step();
  const save = g.offlineCheckpoint()!,
    old = structuredClone(save),
    rev = "a36ec57bba4b76a595d42ac812c69bbda0ab2305ea22cf131b1770e03a57d9d2";
  old.protocolVersion = 25;
  old.contentRevision = rev;
  const restored = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 43);
  assert.equal(restored.contentRevision, CONTENT_REVISION);
  assert.deepEqual(restored.player, save.player);
  assert.deepEqual(restored.completedBossForms, save.completedBossForms);
  for (const bad of [
    { ...old, contentRevision: "f".repeat(64) },
    { ...old, serverOnly: true },
    { ...old, practiceOnly: false },
    { ...old, players: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad));
  const p = freshProfile();
  p.contentRevision = rev;
  assert.deepEqual(
    { ...parseProfile(JSON.stringify(p)), contentRevision: rev },
    p,
  );
});
test(
  "real owner and observer receive a Tollkeeper bank, stopped wheel, fixed side sprays and phase sound",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const a = httpServer.address();
    assert(a && typeof a === "object");
    const host = new Session("http://127.0.0.1:" + a.port),
      guest = new Session("http://127.0.0.1:" + a.port),
      sounds = [0, 0];
    for (const [i, s] of [host, guest].entries())
      s.onEvents = (es) => {
        sounds[i] += es.filter(
          (e) => e.type === "sound" && e.id === "boss-phase",
        ).length;
      };
    const until = async (check: () => boolean) => {
      const end = Date.now() + 6500;
      while (!check()) {
        if (Date.now() > end) throw Error("Tollkeeper cue did not replicate");
        await new Promise((r) => setTimeout(r, 15));
      }
    };
    try {
      const options = {
        name: "Host",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "tollkeeper" as const,
        openingArenaId: "crown-crypt",
      };
      await host.connect(options);
      await guest.connect(
        { ...options, name: "Observer" },
        { roomId: host.room!.roomId },
      );
      await until(() => host.view?.players.length === 2);
      host.start();
      await until(() => guest.view?.phase === "combat");
      const g = liveRooms.get(host.room!.roomId)!.game;
      g.boss.deadline = 1e9;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      g.boss.health = g.boss.maxHealth * 0.49;
      untilGame(g, () =>
        g.director.cues().some((c) => c.kind === "tollkeeper-bank"),
      );
      const bank = g.director.cues().find((c) => c.kind === "tollkeeper-bank"),
        wheel = g.director.cues().find((c) => c.kind === "wheel");
      assert(bank?.kind === "tollkeeper-bank" && wheel?.kind === "wheel");
      await until(() =>
        [host, guest].every(
          (s) =>
            s.view?.bossCues.some((c) => c.id === bank.id) &&
            sounds.every((n) => n === 2),
        ),
      );
      for (const s of [host, guest]) {
        assert.deepEqual(
          s.view!.bossCues.find((c) => c.id === bank.id),
          bank,
        );
        const observed: BossCue | undefined = s.view!.bossCues.find((c) => c.id === wheel.id);
        assert(observed?.kind === "wheel");
        assert(observed.banked);
        assert.deepEqual(observed.path, wheel.path);
      }
      g.boss.health = 0;
      await until(() => guest.view?.phase !== "combat");
      assert(!guest.view!.bossCues.length);
    } finally {
      await Promise.allSettled([host.close(), guest.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);
