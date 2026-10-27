import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ClerkAppeal,
  clerkAppealRules as r,
  type ClerkStamp,
} from "../src/shared/clerk-appeal.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { Game, data, type Player } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import {
  PROTOCOL,
  CONTENT_REVISION,
  idleInput,
  type BossVariant,
} from "../src/shared/protocol.ts";
import { Random } from "../src/shared/random.ts";
import { viewOf } from "../src/shared/view.ts";
import { Prediction } from "../src/client/prediction.ts";
import { clerkHelp, clerkPhaseHint } from "../src/client/clerk-text.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
const stamps = (d: ClerkAppeal) =>
  d.cues().filter((c): c is ClerkStamp => c.kind === "stamp");
const close = (a: number, b: number) =>
  assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const steps = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
function fixture(
  form: BossVariant,
  phase = 0,
  seed = 11,
  random?: () => number,
) {
  const d = new ClerkAppeal(),
    rng = new Random(seed),
    p = { id: "p", x: 800, y: 750, oldX: 800, oldY: 750 };
  let serial = 0;
  const c: SignatureContext = {
    tick: 0,
    bossId: "quarantine-clerk",
    boss: { x: 800, y: 300 },
    radius: 58,
    targets: [p],
    obstacles: [],
    bounds: { x: 128, y: 80, width: 1344, height: 840 },
    damageScale: 1,
    brutal: form !== "normal",
    variant: form,
    phase,
    random: random ?? (() => rng.next()),
    id: () => ++serial,
    damage: () => {},
    spawnRat: () => {},
  };
  d.cast(c, p, { speed: 0, damage: 10, telegraph: 1.3 });
  while (!stamps(d).length) {
    c.tick++;
    d.step(c);
    assert(c.tick < 300);
  }
  return { d, c, p };
}
function game(form: BossVariant = "brutal", seed = 981, phase = 0) {
  const g = createPracticeGame(
    {
      openingBossId: "quarantine-clerk",
      mode: "endless",
      difficulty: "normal",
      seed,
    },
    "Mara",
    "soldier",
    form,
  );
  g.start();
  g.boss.deadline = 1e9;
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  if (phase) g.boss.health = g.boss.maxHealth * 0.49;
  for (let n = 0; n < 1500 && !stamps(g.director.clerk).length; n++) g.step();
  assert(stamps(g.director.clerk).length);
  Reflect.get(g, "variantPressure").reset(1e9);
  Reflect.set(g, "attackAt", Array(20).fill(1e9));
  return { g, p };
}
function quiet(g: Game) {
  g.director.clerk.reset();
  Reflect.get(g, "brutalVolley").clear();
  Reflect.get(g, "clearShots").call(g);
  Reflect.get(g, "variantPressure").reset(1e9);
  Reflect.set(g, "attackAt", Array(20).fill(1e9));
}
function apply(g: Game, p: Player, amount = 0, first = true) {
  return (Reflect.get(g, "signatureContext").call(g) as SignatureContext)
    .purpleStamp!(p.id, amount, first);
}
function purple(form: BossVariant = "brutal") {
  const { g, p } = game(form),
    s = stamps(g.director.clerk).find(
      (s) => s.severity === "purple" && !s.safeAt,
    )!;
  while (g.combatTick < s.at - 1) g.step();
  p.x = p.oldX = s.x;
  p.y = p.oldY = s.y;
  p.health = 100;
  p.shield = 2000;
  p.braceUntil = 1e9;
  p.invulnerableUntil = 0;
  for (let n = 0; n < 20 && !p.poisonUntil; n++) g.step();
  assert(p.poisonUntil);
  return { g, p, s };
}

test("Standard preserves I then III, Brutal randomizes only phase two, and both Crazed phases can choose every numbered seal", () => {
  for (const form of ["normal", "brutal", "crazed"] as const)
    for (const phase of [0, 1]) {
      const seen = new Set<number>();
      for (let seed = 0; seed < 120; seed++) {
        const f = fixture(form, phase, seed),
          safe = stamps(f.d).find((s) => s.safeAt > 0)!;
        seen.add(safe.index);
        const identical = fixture(form, phase, seed);
        assert.deepEqual(identical.d.cues(), f.d.cues());
      }
      const randomized =
        form === "crazed" || (form === "brutal" && phase === 1);
      if (randomized)
        assert.deepEqual(
          [...seen].sort((a, b) => a - b),
          Array.from({ length: r.stampCounts[form] }, (_, i) => i + 1),
        );
      else assert.deepEqual([...seen], [phase ? 3 : 1]);
    }
});
test("the randomly chosen shelter is locked before the first strike and each fresh late appeal chooses independently", () => {
  let draws = 0;
  const f = fixture("crazed", 1, 11, () => (++draws === 1 ? 0.12 : 0.92)),
    first = stamps(f.d),
    ids = new Set(first.map((s) => s.id));
  assert.equal(first.find((s) => s.safeAt > 0)!.index, 2);
  assert(first.every((s) => s.at > f.c.tick));
  const before = JSON.stringify(first);
  f.p.x = 1300;
  f.p.y = 700;
  while (f.c.tick < first[0].at - 1) {
    f.c.tick++;
    f.d.step(f.c);
    assert.equal(JSON.stringify(stamps(f.d)), before);
  }
  let second: ClerkStamp[] = [];
  for (let n = 0; n < 1000; n++) {
    f.c.tick++;
    f.d.step(f.c);
    const now = stamps(f.d);
    assert(now.length <= 10);
    if (now.length && now.every((s) => !ids.has(s.id))) {
      second = now;
      break;
    }
  }
  assert.equal(second.length, 10);
  assert.equal(second.find((s) => s.safeAt > 0)!.index, 10);
  assert(f.c.tick > Math.max(...first.map((s) => s.until)));
  assert.equal(draws, 2);
});
test("every possible random shelter covers its last possible fan echo arrival plus a half-second exit margin", () => {
  for (const form of ["brutal", "crazed"] as const)
    for (const phase of [0, 1])
      for (let index = 0; index < r.stampCounts[form]; index++) {
        const f = fixture(
            form,
            phase,
            11,
            () => (index + 0.5) / r.stampCounts[form],
          ),
          safe = stamps(f.d).find((s) => s.safeAt > 0)!;
        const fans = f.d.cues().filter((c) => c.kind === "clerk-volley");
        assert(
          safe.until - safe.safeAt >= Math.ceil(r.shelterSeconds[form] * 30),
        );
        const mult =
          form === "crazed"
            ? data.rules.crazed.projectileMultiplier
            : data.rules.brutal.projectileMultiplier;
        const delay = Math.ceil(
          (data.rules.brutal.echoDelaySeconds +
            data.rules.brutal.echoWaveSpacingSeconds * (Math.ceil(mult) - 2)) *
            30,
        );
        for (const w of fans) {
          const arrival =
            w.at +
            delay +
            Math.ceil(
              (Math.max(
                0,
                Math.hypot(w.x - safe.x, w.y - safe.y) -
                  safe.radius -
                  r.volleyRadius,
              ) /
                w.speed) *
                30,
            );
          assert(safe.until - arrival >= 15);
        }
        for (const s of stamps(f.d))
          if (!s.safeAt) assert.equal(s.until - safe.safeAt, 75);
      }
});
test("actual Crazed green shelter absorbs late repeated shots after the former2.5second window and protects its occupant", () => {
  const { g, p } = game("crazed"),
    safe = stamps(g.director.clerk).find((s) => s.safeAt > 0)!;
  while (g.combatTick < safe.safeAt) g.step();
  p.x = p.oldX = safe.x;
  p.y = p.oldY = safe.y;
  p.health = 100;
  p.invulnerableUntil = 0;
  let lateBlocks = 0;
  while (g.combatTick < safe.until - 1) {
    g.step();
    assert.equal(p.health, 100);
    assert(g.director.clerk.isSafe(p, g.combatTick));
    lateBlocks += g.director.clerk
      .cues()
      .filter(
        (c) => c.kind === "clerk-block" && c.at > safe.safeAt + 75,
      ).length;
  }
  assert(lateBlocks > 0);
  assert(safe.until - safe.safeAt >= 150);
});
test("real purple contact in both advanced forms removes15percent current health through armor and shield capacity and applies poison", () => {
  for (const form of ["brutal", "crazed"] as const) {
    const { g, p } = purple(form);
    assert.equal(p.health, 85);
    assert(p.shield < 2000);
    assert.equal(p.poisonUntil - g.combatTick, 90);
    assert.equal(p.poisonNextAt - g.combatTick, 15);
    assert.equal(p.poisonDamage, 2 * Reflect.get(g, "bossDamageScale").call(g));
    assert.equal(p.damageTaken, 15);
  }
});
test("reentering the same purple seal cannot take another percentage hit or refresh poison, while another purple seal can", () => {
  const { g, p, s } = purple("crazed"),
    firstUntil = p.poisonUntil,
    other = stamps(g.director.clerk).find(
      (a) => a.severity === "purple" && !a.safeAt && a.id !== s.id,
    )!;
  p.x = p.oldX = g.arena.bounds.x + 20;
  p.y = p.oldY = g.arena.bounds.y + 20;
  steps(g, 16);
  p.x = p.oldX = s.x;
  p.y = p.oldY = s.y;
  p.invulnerableUntil = 0;
  g.step();
  assert.equal(p.health, 85);
  assert.equal(p.poisonUntil, firstUntil);
  p.x = p.oldX = g.arena.bounds.x + 20;
  p.y = p.oldY = g.arena.bounds.y + 20;
  while (g.combatTick < other.at) g.step();
  steps(g, 15);
  p.x = p.oldX = other.x;
  p.y = p.oldY = other.y;
  p.invulnerableUntil = 0;
  g.step();
  close(p.health, 72.25);
  assert(p.poisonUntil > firstUntil);
  assert.equal(p.poisonDamage, 4);
});
test("invulnerability prevents purple affliction without consuming the once-per-seal budget", () => {
  const { g, p } = game(),
    s = stamps(g.director.clerk).find(
      (s) => s.severity === "purple" && !s.safeAt,
    )!;
  while (g.combatTick < s.at) g.step();
  p.x = p.oldX = s.x;
  p.y = p.oldY = s.y;
  p.health = 100;
  p.shield = 2000;
  p.invulnerableUntil = g.combatTick + 12;
  steps(g, 10);
  assert.equal(p.health, 100);
  assert.equal(p.poisonUntil, 0);
  for (let n = 0; n < 10 && !p.poisonUntil; n++) g.step();
  assert.equal(p.health, 85);
  assert(p.poisonUntil);
});
test("poison deals exactly six half-second ticks, expires after three seconds and grants no fresh damage invulnerability", () => {
  const { g, p } = game();
  quiet(g);
  p.invulnerableUntil = 0;
  p.shield = 0;
  p.health = 100;
  assert(apply(g, p));
  const start = g.combatTick,
    armor = g.stats(p).armor;
  assert.equal(p.health, 85);
  for (let n = 1; n <= 90; n++) {
    g.step();
    close(p.health, 85 - Math.floor(n / 15) * 4 * (1 - armor));
    if (n >= 15) assert(p.invulnerableUntil <= g.combatTick);
  }
  assert.equal(g.combatTick, start + 90);
  assert.equal(p.poisonUntil, 0);
  assert.equal(p.poisonNextAt, 0);
  assert.equal(p.poisonDamage, 0);
  const hp = p.health;
  steps(g, 20);
  assert.equal(p.health, hp);
});
test("fresh poison refreshes duration without stacking tick potency or postponing the next pending tick", () => {
  const { g, p } = game();
  quiet(g);
  p.invulnerableUntil = 0;
  p.shield = 2000;
  p.health = 100;
  apply(g, p);
  steps(g, 7);
  const next = p.poisonNextAt,
    damage = p.poisonDamage;
  assert(apply(g, p));
  assert.equal(p.poisonNextAt, next);
  assert.equal(p.poisonDamage, damage);
  assert.equal(p.poisonUntil, g.combatTick + 90);
});
test("green shelter prevents new purple affliction and ongoing poison ticks; invulnerable skipped ticks never accumulate", () => {
  const { g, p } = game("crazed"),
    safe = stamps(g.director.clerk).find((s) => s.safeAt > 0)!;
  while (g.combatTick < safe.safeAt) g.step();
  p.x = p.oldX = g.arena.bounds.x + 20;
  p.y = p.oldY = g.arena.bounds.y + 20;
  p.invulnerableUntil = 0;
  p.health = 100;
  assert(apply(g, p));
  p.x = p.oldX = safe.x;
  p.y = p.oldY = safe.y;
  const hp = p.health;
  assert.equal(apply(g, p), false);
  steps(g, 90);
  assert.equal(p.health, hp);
  assert.equal(p.poisonUntil, 0);
  quiet(g);
  p.x = p.oldX = g.arena.bounds.x + 20;
  p.y = p.oldY = g.arena.bounds.y + 20;
  p.invulnerableUntil = 0;
  apply(g, p);
  p.invulnerableUntil = 1e9;
  const before = p.health;
  steps(g, 90);
  assert.equal(p.health, before);
  assert.equal(p.poisonUntil, 0);
  p.invulnerableUntil = 0;
  steps(g, 20);
  assert.equal(p.health, before);
});
test("authoritative and predicted walking slow match at35percent, dash keeps full speed and poison expiry restores movement", () => {
  const { g, p } = game();
  quiet(g);
  p.x = p.oldX = 800;
  p.y = p.oldY = 750;
  p.invulnerableUntil = 0;
  apply(g, p);
  const predicted = new Prediction();
  predicted.acknowledge(viewOf(g, "solo"), "solo");
  const input = { ...idleInput(), sequence: p.ack + 1, moveX: 1 };
  const x = p.x;
  predicted.submit(input, viewOf(g, "solo"));
  g.submitInput(p.id, input);
  g.step();
  close(p.x - x, (g.movementSpeed(p) * 0.65) / 30);
  close(predicted.player!.x, p.x);
  const dash = { ...input, sequence: p.ack + 1, dodge: true };
  const old = p.x;
  predicted.submit(dash, viewOf(g, "solo"));
  g.submitInput(p.id, dash);
  g.step();
  close(p.x - old, data.rules.dodgeSpeed / 30);
  close(predicted.player!.x, p.x);
  p.invulnerableUntil = 1e9;
  steps(g, 90);
  assert.equal(p.poisonUntil, 0);
  const start = p.x;
  g.submitInput(p.id, { ...input, sequence: p.ack + 1 });
  g.step();
  close(p.x - start, g.movementSpeed(p) / 30);
});
test("an antidote consumes at full health to cleanse poison and slow; ordinary Medic cleanse removes it from nearby allies", () => {
  const g = new Game({
      openingBossId: "quarantine-clerk",
      mode: "endless",
      difficulty: "normal",
      maxPlayers: 2,
      seed: 41,
    }),
    p = g.addPlayer("p", "Mara", "soldier"),
    medic = g.addPlayer("m", "Iona", "medic");
  p.coins = 1000;
  assert(
    g.transact(p.id, { id: "antidote", kind: "supply", item: "antidote" }).ok,
  );
  g.start();
  quiet(g);
  g.boss.deadline = 1e9;
  p.invulnerableUntil = 0;
  apply(g, p);
  p.health = p.maxHealth;
  p.slowUntil = g.combatTick + 90;
  g.submitInput(p.id, { ...idleInput(), sequence: p.ack + 1, supply: 0 });
  g.step();
  assert.equal(p.poisonUntil, 0);
  assert.equal(p.slowUntil, 0);
  assert.equal(p.supplies[0].count, 0);
  steps(g, 7);
  p.invulnerableUntil = 0;
  apply(g, p);
  p.slowUntil = g.combatTick + 90;
  g.submitInput(medic.id, { ...idleInput(), sequence: medic.ack + 1, e: true });
  g.step();
  assert.equal(p.poisonUntil, 0);
  assert.equal(p.poisonNextAt, 0);
  assert.equal(p.poisonDamage, 0);
  assert.equal(p.slowUntil, 0);
});
test("downing victory timeout and wipe clear all poison timers before revival or another encounter", () => {
  for (const end of ["down", "victory", "timeout", "wipe"]) {
    const { g, p } = game();
    quiet(g);
    p.invulnerableUntil = 0;
    apply(g, p);
    assert(p.poisonUntil);
    if (end === "down") {
      p.invulnerableUntil = 0;
      g.damage(p, 10000);
    }
    if (end === "victory") g.boss.health = 0;
    if (end === "timeout") g.boss.deadline = g.combatTick + 1;
    if (end === "wipe") p.status = "eliminated";
    g.step();
    assert.equal(p.poisonUntil, 0, end);
    assert.equal(p.poisonNextAt, 0, end);
    assert.equal(p.poisonDamage, 0, end);
  }
});
test("all fifteen source catalogs agree with runtime help on randomized shelter,15percent first hit and35percent slow", () => {
  for (const l of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + l.id + ".json", "utf8"),
    ).messages;
    for (const form of ["brutal", "crazed"]) {
      const text = clerkHelp(form, l.id);
      assert(text.includes("15%"));
      assert(text.includes("35%"));
      assert(text.includes(m["boss.quarantine-clerk." + form + "Help"]));
      assert(
        clerkPhaseHint(1, form, l.id).includes(
          m["boss.quarantine-clerk.advancedPhaseHint.1"],
        ),
      );
    }
    assert(clerkHelp("crazed", l.id).includes("75%"));
  }
  assert(clerkHelp("normal", "en").includes("stamp III"));
  assert(!clerkHelp("normal", "en").includes("poison"));
});
test("only known protocol26 local Practice and profile state migrates, preserving exact forms and build history", () => {
  const { g } = game("crazed");
  g.boss.health = 0;
  g.step();
  const save = g.offlineCheckpoint()!,
    old = structuredClone(save),
    revision =
      "cc48fbf30b18e546d600b05f4c4648330cfd012631c53fd7a4fe57b734b7a97b";
  old.protocolVersion = 26;
  old.contentRevision = revision;
  const after = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 28);
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
  "real owner and observer receive identical random shelter, poison deadline,15percent loss and subsequent antidote cleanse",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port,
      owner = new Session(endpoint),
      observer = new Session(endpoint);
    const until = async (check: () => boolean) => {
      const end = Date.now() + 6000;
      while (!check()) {
        if (Date.now() > end) throw Error("Clerk affliction did not replicate");
        await new Promise((r) => setTimeout(r, 15));
      }
    };
    try {
      const opts = {
        name: "Host",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "quarantine-clerk" as const,
        openingArenaId: "crown-crypt",
      };
      await owner.connect(opts);
      await observer.connect(
        { ...opts, name: "Observer" },
        { roomId: owner.room!.roomId },
      );
      await until(() => owner.view?.players.length === 2);
      owner.start();
      await until(() => observer.view?.phase === "combat");
      const g = liveRooms.get(owner.room!.roomId)!.game;
      g.boss.deadline = 1e9;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      for (let n = 0; n < 1000 && !stamps(g.director.clerk).length; n++)
        g.step();
      const field = stamps(g.director.clerk),
        safe = field.find((s) => s.safeAt > 0)!,
        s = field.find((s) => s.severity === "purple" && !s.safeAt)!;
      assert(safe);
      Reflect.get(g, "variantPressure").reset(1e9);
      Reflect.set(g, "attackAt", Array(20).fill(1e9));
      while (g.combatTick < s.at - 1) g.step();
      const p = g.players.get(owner.id)!;
      p.x = p.oldX = s.x;
      p.y = p.oldY = s.y;
      p.health = 100;
      p.shield = 2000;
      p.invulnerableUntil = 0;
      for (let n = 0; n < 20 && !p.poisonUntil; n++) g.step();
      assert.equal(p.health, 85);
      const deadline = p.poisonUntil;
      p.invulnerableUntil = 1e9;
      await until(() =>
        [owner, observer].every(
          (client) =>
            client.view?.players.find((v) => v.id === owner.id)?.poisonUntil ===
            deadline,
        ),
      );
      for (const client of [owner, observer]) {
        const v = client.view!.players.find((v) => v.id === owner.id)!;
        assert.equal(v.health, 85);
        assert.deepEqual(
          client.view!.bossCues.find((c) => c.id === safe.id),
          safe,
        );
      }
      p.supplies[0] = { id: "antidote", count: 1 };
      owner.input({ ...idleInput(), sequence: p.ack + 1, supply: 0 });
      await until(() =>
        [owner, observer].every(
          (client) =>
            client.view?.players.find((v) => v.id === owner.id)?.poisonUntil ===
            0,
        ),
      );
      assert.equal(p.supplies[0].count, 0);
    } finally {
      await Promise.allSettled([owner.close(), observer.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);
