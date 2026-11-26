import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import { idleInput, HZ, type InputFrame } from "../src/shared/protocol.ts";
import {
  sniperIds as ids,
  sniperRules as r,
  sniperRestRules as rr,
} from "../src/shared/soldier-sniper.ts";
import { viewOf } from "../src/shared/view.ts";
let serial = 0;
const buy = (g: Game, id: string, item: string) => {
  const out = g.transact(id, { id: "rest-" + ++serial, kind: "skill", item });
  assert(out.ok, item + ":" + out.reason);
};
// Controlled authority fixtures isolate state/payment contracts; these are not natural or online evidence.
function fixture(handling?: "carry" | "clear") {
  const g = new Game({
    mode: "endless",
    difficulty: "normal",
    seed: 41,
    maxPlayers: 2,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 6;
  const p = g.addPlayer("solo", "Mara", "soldier"),
    ally = g.addPlayer("ally", "Perrin", "medic");
  assert.equal(p.totalSp, 19);
  for (const id of [
    "soldier-ballistics-1",
    ids.entry,
    ids.bore,
    ...(handling ? [ids[handling]] : []),
    ids.rest,
  ])
    buy(g, p.id, id);
  assert(g.start());
  g.boss.id = "constable";
  (g as any).director.reset("constable");
  g.boss.x = 1200;
  g.boss.y = 200;
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.deadline = g.boss.staggerUntil = 1e9;
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  g.arena.obstacles.length = 0;
  g.arena.lavaPits.length = 0;
  p.x = p.oldX = 600;
  p.y = p.oldY = 600;
  p.invulnerableUntil = 0;
  ally.x = ally.oldX = 1400;
  ally.y = ally.oldY = 900;
  g.drainEvents();
  let seq = 0;
  const step = (input: Partial<InputFrame> = {}) => {
      assert(
        g.submitInput(p.id, {
          ...idleInput(),
          sequence: ++seq,
          aim: 0,
          ...input,
        }),
      );
      g.step();
    },
    kit = () => g.kitStatus(p.id),
    until = (at: number, aim = 0) => {
      let n = 0;
      while (g.combatTick < at) {
        assert(++n < 450);
        step({ aim });
      }
    },
    rest = () =>
      g.classCues().filter((c) => c.kind === "soldier-rest").find(c=>c.owner===p.id),
    shots = () => [...g.shots.values()].filter((s) => g.sniper.has(s.id)),
    plant = () => {
      step({ technique2: true });
      assert(kit().sniperRestSetting);
      const at = kit().sniperRestAt!;
      until(at);
      assert(kit().sniperRestReady);
      return { ...rest()! };
    };
  return { g, p, ally, step, kit, until, rest, shots, plant };
}
test("Field Rest is a real acquired17earned operation with Bore prerequisite, not a fresh Raid purchase", () => {
  const node = data.specializationSkills.find((s) => s.id === ids.rest)!;
  assert.equal(node.grade, "A-");
  assert.equal(node.cost, 3);
  assert.equal(node.freePlaySpRequired, 17);
  assert.equal(node.prerequisite, ids.bore);
  assert(!node.capstone);
  for (const encounter of [5, 6]) {
    const g = new Game({ mode: "endless" });
    g.encounter = encounter;
    const p = g.addPlayer("p", "Mara", "soldier");
    for (const id of ["soldier-ballistics-1", ids.entry, ids.bore])
      buy(g, p.id, id);
    assert.equal(p.totalSp, encounter === 5 ? 16 : 19);
    assert.equal(
      g.transact(p.id, { id: "gate", kind: "skill", item: ids.rest }).ok,
      encounter === 6,
    );
  }
  const g = new Game({ mode: "raid" }),
    p = g.addPlayer("p", "Mara", "soldier");
  for (const id of ["soldier-ballistics-1", ids.entry, ids.bore])
    buy(g, p.id, id);
  assert.equal(
    g.transact(p.id, { id: "raid-gate", kind: "skill", item: ids.rest }).reason,
    "insufficientPoints",
  );
});
test("empty setup spends no round/recovery and shares only finite spatial state, never a firing pose", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ technique2: true });
  const k = f.kit(),
    cue = f.rest()!;
  assert.equal(f.p.ammo, ammo);
  assert.equal(k.sniperRecoveryAt, 0);
  assert(!k.sniperPrepared);
  assert.equal(k.sniperShotAt, 0);
  assert.equal(f.shots().length, 0);
  assert.equal(cue.until - cue.at, rr.seconds * HZ);
  assert.equal(cue.readyAt - cue.at, r.settleSeconds * HZ);
  for (const key of [
    "ammo",
    "damage",
    "health",
    "fireLatch",
    "weapon",
    "recovery",
  ])
    assert(!Object.hasOwn(cue, key));
  assert(
    viewOf(f.g, f.ally.id).classCues.some((c) => c.kind === "soldier-rest"),
  );
});
test("dry setup needs its real settling; early C pays for ordinary full settling and cancels the empty setup", () => {
  const f = fixture();
  f.step({ technique2: true });
  f.step();
  const now = f.g.combatTick;
  f.step({ technique1: true });
  assert(f.kit().sniperPrepared);
  assert.equal(f.kit().sniperReadyAt, now + 1 + r.settleSeconds * HZ);
  assert(!f.rest());
  assert.equal(f.shots().length, 0);
});
test("settled same-site C claims exactly once, stays manual and keeps actual payment/deadline/recovery", () => {
  const f = fixture(),
    site = f.plant(),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const at = f.g.combatTick,
    k = f.kit();
  assert(k.sniperPrepared);
  assert.equal(k.sniperReadyAt, at);
  assert.equal(k.sniperUntil, at + r.preparationSeconds * HZ);
  assert.equal(
    k.sniperRecoveryAt,
    at + Math.ceil(r.cooldown * f.g.stats(f.p).cooldown * HZ),
  );
  assert.equal(f.p.ammo, ammo - 1);
  assert(!f.rest());
  assert.equal(f.shots().length, 0);
  f.step();
  assert.equal(f.shots().length, 0);
  f.step({ technique1: true });
  assert.equal(f.shots().length, 1);
  assert.equal(f.p.ammo, ammo - 1);
  assert(!f.kit().sniperPrepared);
  assert.equal(f.kit().sniperShotAt, f.g.combatTick);
  assert(site.until > at);
});
test("C and B on the claim tick cannot release instantly or plant another rest", () => {
  const f = fixture();
  f.plant();
  f.step({ technique1: true, technique2: true });
  assert(f.kit().sniperPrepared);
  assert.equal(f.shots().length, 0);
  assert(!f.rest());
  f.step({ technique2: true });
  assert.equal(f.shots().length, 1);
});
test("B recalls one empty rest without payment, then a later B starts a genuinely new setup", () => {
  const f = fixture(),
    site = f.plant(),
    ammo = f.p.ammo;
  f.step({ technique2: true });
  assert(!f.rest());
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.kit().sniperRecoveryAt, 0);
  f.step({ technique2: true });
  assert(f.kit().sniperRestSetting);
  assert(f.rest()!.id !== site.id);
  assert(f.rest()!.until > site.until);
});
test("leaving a settled position keeps it fixed; C elsewhere pays full settling without remotely claiming it", () => {
  const f = fixture(),
    site = f.plant();
  for (let n = 0; n < 12; n++) f.step({ moveX: 1 });
  f.step();
  assert(f.p.x > site.x + 6);
  assert.deepEqual(f.rest(), site);
  const now = f.g.combatTick;
  f.step({ technique1: true });
  assert.equal(f.kit().sniperReadyAt, now + 1 + r.settleSeconds * HZ);
  assert.deepEqual(f.rest(), site);
});
test("ordinary actual walking away and back permits the one fixed-site claim", () => {
  const f = fixture(),
    site = f.plant();
  for (let n = 0; n < 8; n++) f.step({ moveX: 1 });
  for (let n = 0; n < 8; n++) f.step({ moveX: -1 });
  f.step();
  assert(Math.hypot(f.p.x - site.x, f.p.y - site.y) <= 6);
  f.step({ technique1: true });
  assert.equal(f.kit().sniperReadyAt, f.g.combatTick);
  assert(!f.rest());
});
test("unfinished manual re-aim restarts settling inside the original rest lifetime; a settled bearing cannot rotate", () => {
  const f = fixture();
  f.step({ technique2: true });
  const until = f.rest()!.until;
  f.step({ aim: 0.4 });
  const ready = f.kit().sniperRestAt!;
  assert.equal(ready, f.g.combatTick + r.settleSeconds * HZ);
  assert.equal(f.rest()!.until, until);
  f.until(ready, 0.4);
  const site = { ...f.rest()! };
  f.step({ aim: 0 });
  assert.deepEqual(f.rest(), site);
  f.step({ technique1: true, aim: 0 });
  assert.equal(f.kit().sniperReadyAt, f.g.combatTick + r.settleSeconds * HZ);
  assert(f.rest());
});
test("last actual round can be claimed and B-released without requiring a second cartridge", () => {
  const f = fixture();
  f.p.ammo = 1;
  f.plant();
  f.step({ technique1: true });
  assert.equal(f.p.ammo, 0);
  f.step({ technique2: true });
  assert.equal(f.p.ammo, 0);
  assert.equal(f.shots().length, 1);
});
for (const rejection of [
  "empty",
  "pool",
  "reload",
  "channel",
  "overdrive",
] as const)
  test(
    "fresh C " +
      rejection +
      " rejection preserves the settled site and spends nothing",
    () => {
      const f = fixture(),
        site = f.plant();
      if (rejection === "empty") f.p.ammo = 0;
      if (rejection === "pool")
        while (f.g.shots.size < 6000)
          (f.g as any).emitShot(f.ally.id, 1400, 900, 0, 0, 1, 1, 0, 20);
      if (rejection === "reload") f.p.reloadAt = f.g.combatTick + 100;
      if (rejection === "channel") f.p.channelUntil = f.g.combatTick + 100;
      if (rejection === "overdrive") f.p.overdriveUntil = f.g.combatTick + 100;
      const ammo = f.p.ammo;
      f.step({ technique1: true });
      assert(!f.kit().sniperPrepared);
      assert.deepEqual(f.rest(), site);
      assert.equal(f.p.ammo, ammo);
      assert.equal(f.kit().sniperRecoveryAt, 0);
    },
  );
test("planting during spent C recovery never bypasses recovery; only a later normally accepted C can claim", () => {
  const f = fixture();
  f.plant();
  f.step({ technique1: true });
  f.step({ technique1: true });
  const recovery = f.kit().sniperRecoveryAt!;
  f.until(f.g.combatTick + 60);
  const site = f.plant(),
    ammo = f.p.ammo;
  assert(f.g.combatTick < recovery);
  f.step({ technique1: true });
  assert(!f.kit().sniperPrepared);
  assert.deepEqual(f.rest(), site);
  assert.equal(f.p.ammo, ammo);
  f.until(recovery);
  f.step({ technique1: true });
  assert.equal(f.kit().sniperReadyAt, f.g.combatTick);
  assert.equal(f.p.ammo, ammo - 1);
  assert(!f.rest());
});
for (const interruption of [
  "move",
  "primary",
  "reload",
  "dodge",
  "e",
  "ultimate",
  "damage",
] as const)
  test(
    "unfinished rest " +
      interruption +
      " interruption never spends a round or C recovery",
    () => {
      const f = fixture(),
        ammo = f.p.ammo;
      f.step({ technique2: true });
      if (interruption === "damage") {
        f.p.shield = 0;
        f.g.damage(f.p, 1, false);
      } else
        f.step(
          interruption === "move"
            ? { moveX: 1 }
            : interruption === "primary"
              ? { fire: true }
              : interruption === "reload"
                ? { reload: true }
                : interruption === "dodge"
                  ? { dodge: true }
                  : interruption === "e"
                    ? { e: true }
                    : { ultimate: true },
        );
      assert(!f.rest());
      assert.equal(f.kit().sniperRecoveryAt, 0);
      if (!["primary", "e", "ultimate"].includes(interruption))
        assert.equal(f.p.ammo, ammo);
    },
  );
test("absorbed damage retains empty setup but actual health loss cancels it immediately even before a later heal", () => {
  const f = fixture();
  f.step({ technique2: true });
  f.p.shield = 2;
  const health = f.p.health;
  f.g.damage(f.p, 1, false);
  assert.equal(f.p.health, health);
  assert(f.p.shield < 2);
  assert(f.rest());
  f.p.shield = 0;
  f.g.damage(f.p, 1, false);
  f.p.health = f.p.maxHealth;
  assert(!f.rest());
  assert.equal(f.kit().sniperRecoveryAt, 0);
});
test("an already settled site remains during ordinary fighting, damage and Reload", () => {
  const f = fixture(),
    site = f.plant();
  f.p.shield = 0;
  f.g.damage(f.p, 1, false);
  f.step({ fire: true });
  assert.deepEqual(f.rest(), site);
  f.p.ammo = 1;
  f.step({ reload: true });
  assert(f.p.reloadAt > f.g.combatTick);
  assert.deepEqual(f.rest(), site);
});
for (const handling of ["carry", "clear"] as const)
  test(
    "claimed rest retains issued " +
      handling +
      " handling and never recreates the consumed site",
    () => {
      const f = fixture(handling),
        ammo = f.p.ammo;
      f.plant();
      f.step({ technique1: true });
      const until = f.kit().sniperUntil!,
        recovery = f.kit().sniperRecoveryAt!;
      if (handling === "carry") {
        f.step({ moveX: 1 });
        assert(f.kit().sniperPrepared);
        assert.equal(
          f.kit().sniperReadyAt,
          f.g.combatTick + r.settleSeconds * HZ,
        );
        assert.equal(f.kit().sniperUntil, until);
        assert.equal(f.p.ammo, ammo - 1);
        f.step({ technique2: true });
        assert.equal(f.shots().length, 0);
      } else {
        f.step({ reload: true, technique2: true });
        assert(!f.kit().sniperPrepared);
        assert.equal(f.p.ammo, ammo);
        assert.equal(f.p.reloadAt, 0);
        assert.equal(f.shots().length, 0);
      }
      assert.equal(f.kit().sniperRecoveryAt, recovery);
      assert(!f.rest());
    },
  );
test("failed manual release preserves the already paid rest-assisted opportunity, not a second rest", () => {
  const f = fixture();
  f.plant();
  f.step({ technique1: true });
  const ammo = f.p.ammo,
    k = f.kit();
  while (f.g.shots.size < 6000)
    (f.g as any).emitShot(f.ally.id, 1400, 900, 0, 0, 1, 1, 0, 20);
  f.step({ technique2: true });
  assert(f.kit().sniperPrepared);
  assert.equal(f.kit().sniperUntil, k.sniperUntil);
  assert.equal(f.kit().sniperRecoveryAt, k.sniperRecoveryAt);
  assert.equal(f.p.ammo, ammo);
  assert(!f.rest());
});
for (const loss of ["technique", "weapon", "disconnect"] as const)
  test(
    "required " +
      loss +
      " loss removes the site and loses a claimed paid opportunity without refund",
    () => {
      for (const claimed of [false, true]) {
        const f = fixture();
        f.plant();
        if (claimed) f.step({ technique1: true });
        const ammo = f.p.ammo,
          recovery = f.kit().sniperRecoveryAt;
        if (loss === "technique")
          f.p.skills = f.p.skills.filter((x) => x !== ids.rest);
        if (loss === "weapon")
          f.p.weapon = data.weapons.find(
            (w) => w.classId === "soldier" && w.id !== f.p.weapon,
          )!.id;
        if (loss === "disconnect") {
          f.g.setConnected(f.p.id, false);
          f.g.step();
        } else f.step();
        assert(!f.rest());
        assert(!f.kit().sniperPrepared);
        assert.equal(f.p.ammo, ammo);
        assert.equal(f.kit().sniperRecoveryAt, recovery);
      }
    },
  );
test("original rest expiry never shoots or grants shortcut settling afterward", () => {
  const f = fixture(),
    site = f.plant(),
    ammo = f.p.ammo;
  f.until(site.until);
  assert(!f.rest());
  assert.equal(f.shots().length, 0);
  assert.equal(f.p.ammo, ammo);
  f.step({ technique1: true });
  assert.equal(f.kit().sniperReadyAt, f.g.combatTick + r.settleSeconds * HZ);
});
test("Field Rest path supports real27SP alternatives without enlarging the budget", () => {
  for (const handling of [false, true]) {
    const g = new Game({ mode: "endless" });
    g.encounter = 9;
    const p = g.addPlayer("p", "Mara", "soldier");
    for (const id of [
      "soldier-ballistics-1",
      ids.entry,
      ids.bore,
      ...(handling ? [ids.carry] : []),
      ids.rest,
      ...Array.from({ length: 5 }, (_, n) => "soldier-command-" + (n + 1)),
      ...(handling ? [] : ["general-sprint"]),
    ])
      buy(g, p.id, id);
    const spent = p.skills.reduce((n, id) => n + g.skillCost(id), 0);
    assert.equal(p.totalSp, 27);
    assert.equal(spent, handling ? 26 : 27);
    assert.equal(viewOf(g, p.id).players[0].sp, handling ? 1 : 0);
  }
});
