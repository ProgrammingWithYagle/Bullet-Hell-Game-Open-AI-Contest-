import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import { HZ, DT, idleInput, type InputFrame } from "../src/shared/protocol.ts";
import {
  sniperIds as ids,
  sniperRules as r,
  sniperBoreRules as br,
  sniperRestRules as rr,
  sniperWithdrawalRules as wr,
} from "../src/shared/soldier-sniper.ts";
import { viewOf } from "../src/shared/view.ts";
let serial = 0;
const buy = (g: Game, p: string, item: string) => {
  const out = g.transact(p, {
    id: "withdrawal-" + ++serial,
    kind: "skill",
    item,
  });
  assert(out.ok, item + ":" + out.reason);
};
const near = (a: number, b: number) =>
  assert(Math.abs(a - b) < 1e-6, a + " vs " + b);
// Controlled legal27SP authority fixtures, with isolated bodies/time. These are not natural runs or online proof.
function fixture(handling?: "carry" | "clear", breach = false) {
  const g = new Game({
    mode: "endless",
    difficulty: "normal",
    seed: 41,
    maxPlayers: 2,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier"),
    ally = g.addPlayer("ally", "Perrin", "medic");
  assert.equal(p.totalSp, 27);
  for (const item of [
    "soldier-ballistics-1",
    ids.entry,
    ids.bore,
    ids.rest,
    ...(handling ? [ids[handling]] : []),
    ids.withdrawal,
    ...(breach
      ? ["soldier-command-1", "soldier-command-2", "soldier-command-3"]
      : []),
  ])
    buy(g, p.id, item);
  assert(g.start());
  g.boss.id = "constable";
  (g as any).director.reset("constable");
  g.boss.x = 1200;
  g.boss.y = 200;
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  g.arena.obstacles.length = 0;
  g.arena.lavaPits.length = 0;
  p.x = p.oldX = 600;
  p.y = p.oldY = 600;
  p.invulnerableUntil = 0;
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
    },
    kit = () => g.kitStatus(p.id),
    rests = () =>
      g
        .classCues()
        .filter((c) => c.kind === "soldier-rest")
        .filter((c) => c.owner === p.id),
    shots = () => [...g.shots.values()].filter((s) => g.sniper.has(s.id)),
    until = (at: number, aim = 0) => {
      let count = 0;
      while (g.combatTick < at) {
        assert(++count < 900);
        step({ aim });
      }
    },
    walk = (target: { x: number; y: number }, aim = 0) => {
      let count = 0;
      while (Math.hypot(p.x - target.x, p.y - target.y) > 0.45) {
        assert(++count < 100);
        const d = Math.hypot(p.x - target.x, p.y - target.y),
          scale = Math.min(1, d / 12);
        step({
          moveX: ((target.x - p.x) / d) * scale,
          moveY: ((target.y - p.y) / d) * scale,
          aim,
        });
      }
      step({ aim });
      step({ aim });
    },
    plant = () => {
      step({ technique2: true });
      const point = rests().find((q) => q.readyAt > g.combatTick);
      assert(point);
      until(point.readyAt);
      assert(rests().some((q) => q.id === point.id));
      return { ...rests().find((q) => q.id === point.id)! };
    },
    pair = () => {
      const a = plant();
      walk({ x: a.x + 112, y: a.y });
      assert(kit().sniperRestCanSecond);
      const b = plant();
      assert.equal(rests().length, 2);
      assert(Math.hypot(a.x - b.x, a.y - b.y) >= wr.minimumDistance);
      return { a, b };
    };
  return { g, p, ally, step, kit, rests, shots, until, walk, plant, pair };
}
const first = (
  f: ReturnType<typeof fixture>,
  kind: "technique1" | "technique2" = "technique2",
) => {
  const sites = f.pair(),
    ammo = f.p.ammo;
  f.walk(sites.a);
  f.step({ technique1: true, technique2: true });
  assert(f.kit().sniperPrepared);
  assert.equal(f.kit().sniperReadyAt, f.g.combatTick);
  assert.equal(f.shots().length, 0);
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
  const recovery = f.kit().sniperRecoveryAt!,
    origin = { x: f.p.x, y: f.p.y };
  f.step({ [kind]: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.kit().sniperWithdrawalUntil, sites.b.until);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.shots().length, 1);
  const shot = f.shots()[0];
  near(shot.x, origin.x + Math.cos(0) * r.speed * DT);
  near(shot.y, origin.y);
  assert.equal(
    f.g.boss.health,
    f.g.boss.maxHealth,
    "a hit is not invented or required to earn a prepared return",
  );
  return { ...sites, ammo, recovery, shotId: shot.id };
};
test("Prepared Withdrawal is an actual27earned6SP one-capstone operation after Field Rest", () => {
  const node = data.specializationSkills.find((s) => s.id === ids.withdrawal)!;
  assert.equal(node.grade, "SS+");
  assert.equal(node.cost, 6);
  assert.equal(node.freePlaySpRequired, 27);
  assert(node.capstone);
  assert.equal(node.prerequisite, ids.rest);
  const g = new Game({ mode: "endless" });
  g.encounter = 8;
  const p = g.addPlayer("p", "Mara", "soldier");
  assert.equal(p.totalSp, 24);
  for (const item of ["soldier-ballistics-1", ids.entry, ids.bore, ids.rest])
    buy(g, p.id, item);
  assert.equal(
    g.transact(p.id, { id: "early", kind: "skill", item: ids.withdrawal })
      .reason,
    "insufficientPoints",
  );
});
test("both empty positions settle independently, retain their original clocks and create no ammunition, recovery, cover or shield", () => {
  const f = fixture(),
    ammo = f.p.ammo,
    { a, b } = f.pair();
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.kit().sniperRecoveryAt, 0);
  assert.equal(f.kit().sniperShotAt, 0);
  assert.equal(f.shots().length, 0);
  for (const site of [a, b]) {
    assert.equal(site.until - site.at, rr.seconds * HZ);
    assert.equal(site.readyAt - site.at, r.settleSeconds * HZ);
  }
  assert.notEqual(a.id, b.id);
  assert.equal(f.g.obstacles.length, 0);
  assert.equal(f.kit().sniperRestCount, 2);
  assert(!f.kit().sniperRestCanSecond);
});
test("a nearer B retains issued recall behavior instead of granting a second site", () => {
  const f = fixture(),
    a = f.plant(),
    ammo = f.p.ammo;
  f.walk({ x: a.x + 70, y: a.y });
  assert(!f.kit().sniperRestCanSecond);
  f.step({ technique2: true });
  assert.equal(f.rests().length, 0);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.kit().sniperRecoveryAt, 0);
});
test("B with two sites recalls the whole plan and spends no round/recovery", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.pair();
  f.step({ technique2: true });
  assert.equal(f.rests().length, 0);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
  assert.equal(f.kit().sniperRecoveryAt, 0);
});
for (const kind of ["technique1", "technique2"] as const)
  test(
    "only an actual separate " +
      kind +
      " release arms the other original position",
    () => {
      const f = fixture(),
        out = first(f, kind);
      assert.equal(
        f.shots()[0].damage,
        (kind === "technique1" ? r.damage : br.damage) * f.g.stats(f.p).ability,
      );
      assert.equal(f.rests().length, 1);
      assert.equal(f.rests()[0].id, out.b.id);
      assert.equal(f.rests()[0].until, out.b.until);
      assert(
        !f.kit().sniperWithdrawalReady,
        "no remote origin from the first site",
      );
    },
  );
test("actual walking back and one paid return extends spent C recovery, then requires another manual release with its real firing origin", () => {
  const f = fixture(),
    out = first(f);
  f.walk(out.b);
  assert(f.kit().sniperWithdrawalReady);
  assert(f.g.combatTick < out.recovery);
  const shots = f.shots().length;
  f.step({ technique1: true, technique2: true });
  const preparedAt = f.g.combatTick;
  assert(f.kit().sniperPrepared);
  assert.equal(f.kit().sniperReadyAt, preparedAt);
  assert.equal(f.kit().sniperUntil, preparedAt + r.preparationSeconds * HZ);
  assert.equal(
    f.kit().sniperRecoveryAt,
    out.recovery + Math.ceil(r.cooldown * f.g.stats(f.p).cooldown * HZ),
  );
  assert.equal(f.p.ammo, out.ammo - 2);
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
  assert.equal(f.rests().length, 0);
  assert.equal(f.shots().length, shots, "C/B claim tick cannot emit");
  const origin = { x: f.p.x, y: f.p.y };
  f.step({ technique1: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, out.ammo - 2);
  const second = f.shots().find((s) => s.id !== out.shotId)!;
  assert(second);
  near(second.x, origin.x + r.speed * DT);
  near(second.y, origin.y);
  assert.equal(second.damage, r.damage * f.g.stats(f.p).ability);
  f.step({ technique1: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, out.ammo - 2);
});
test("second empty setup must finish before first claim; a later completion cannot retroactively earn a pair", () => {
  const f = fixture(),
    a = f.plant();
  f.walk({ x: a.x + 112, y: a.y });
  f.step({ technique2: true });
  assert(f.rests().some((q) => q.readyAt > f.g.combatTick));
  f.step({ technique1: true });
  assert(f.kit().sniperPrepared);
  assert(f.kit().sniperReadyAt! > f.g.combatTick);
  assert.equal(f.rests().length, 1);
  f.until(f.kit().sniperReadyAt!);
  f.step({ technique1: true });
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
});
test("ordinary offsite C uses its original settling and cannot earn a return from an unclaimed pair", () => {
  const f = fixture(),
    { b } = f.pair();
  f.walk({ x: b.x + 40, y: b.y });
  f.step({ technique1: true });
  assert.equal(f.kit().sniperReadyAt, f.g.combatTick + r.settleSeconds * HZ);
  assert.equal(f.rests().length, 2);
  f.until(f.kit().sniperReadyAt!);
  f.step({ technique1: true });
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
});
test("an unreleased first paid opportunity expires without earning or refreshing the other site", () => {
  const f = fixture(),
    { a, b } = f.pair(),
    ammo = f.p.ammo;
  f.walk(a);
  f.step({ technique1: true });
  const recovery = f.kit().sniperRecoveryAt!;
  f.until(f.kit().sniperUntil!);
  assert(!f.kit().sniperPrepared);
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
  assert.equal(f.rests()[0].id, b.id);
  assert.equal(f.rests()[0].until, b.until);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.kit().sniperRecoveryAt, recovery);
});
for (const why of [
  "primary",
  "damage",
  "reload",
  "dodge",
  "e",
  "ultimate",
] as const)
  test(
    "first paid " +
      why +
      " cancellation earns no fallback and never refunds its round/recovery",
    () => {
      const f = fixture(),
        { a, b } = f.pair();
      f.walk(a);
      f.step({ technique1: true });
      const recovery = f.kit().sniperRecoveryAt!,
        ammo = f.p.ammo;
      if (why === "damage") {
        f.p.shield = 0;
        f.g.damage(f.p, 1, false);
      } else
        f.step(
          why === "primary"
            ? { fire: true }
            : why === "reload"
              ? { reload: true }
              : why === "dodge"
                ? { dodge: true }
                : why === "e"
                  ? { e: true }
                  : { ultimate: true },
        );
      assert(!f.kit().sniperPrepared);
      assert.equal(f.kit().sniperWithdrawalUntil, 0);
      assert.equal(f.kit().sniperRecoveryAt, recovery);
      if (why === "ultimate") {
        assert.equal(
          f.p.ammo,
          f.g.stats(f.p).magazine,
          "issued Soldier ultimate fills its magazine independently",
        );
        assert(f.p.ultimateAt > f.g.combatTick);
        assert(
          f.g.fields.some(
            (field) =>
              field.owner === f.p.id &&
              field.kind === "rally" &&
              field.until > f.g.combatTick,
          ),
        );
      } else
        assert(
          f.p.ammo <= ammo,
          "ordinary primary/E may spend their issued ammunition, but cancelled C never refunds",
        );
      assert(f.rests().some((q) => q.id === b.id && q.until === b.until));
    },
  );
test("Clear on first claim returns the one actual reserved round, consumes R and earns no fallback", () => {
  const f = fixture("clear"),
    { a, b } = f.pair(),
    ammo = f.p.ammo;
  f.walk(a);
  f.step({ technique1: true });
  const recovery = f.kit().sniperRecoveryAt!;
  f.step({ reload: true, technique2: true });
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.p.reloadAt, 0);
  assert.equal(f.kit().sniperRecoveryAt, recovery);
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
  assert.equal(f.shots().length, 0);
  assert.equal(f.rests()[0].id, b.id);
});
test("Clear on the actual paid return keeps the extended recovery debt and never restores a site or right", () => {
  const f = fixture("clear"),
    out = first(f);
  f.walk(out.b);
  f.step({ technique1: true });
  const recovery = f.kit().sniperRecoveryAt!;
  assert(recovery > out.recovery);
  f.step({ reload: true, technique2: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, out.ammo - 1);
  assert.equal(f.p.reloadAt, 0);
  assert.equal(f.kit().sniperRecoveryAt, recovery);
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
  assert.equal(f.rests().length, 0);
});
test("Carry moves the paid return only with full new settling inside its original paid deadline", () => {
  const f = fixture("carry"),
    out = first(f);
  f.walk(out.b);
  f.step({ technique1: true });
  const until = f.kit().sniperUntil!,
    recovery = f.kit().sniperRecoveryAt!,
    ammo = f.p.ammo;
  f.step({ moveX: 1 });
  assert(f.kit().sniperPrepared);
  assert.equal(f.kit().sniperReadyAt, f.g.combatTick + r.settleSeconds * HZ);
  assert.equal(f.kit().sniperUntil, until);
  assert.equal(f.kit().sniperRecoveryAt, recovery);
  f.step({ technique2: true });
  assert(f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo);
});
for (const rejection of [
  "empty",
  "pool",
  "reload",
  "channel",
  "overdrive",
] as const)
  test(
    "armed return " +
      rejection +
      " rejection keeps its original finite site/right and spends nothing",
    () => {
      const f = fixture(),
        out = first(f);
      f.walk(out.b);
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
      assert.equal(f.p.ammo, ammo);
      assert.equal(f.kit().sniperRecoveryAt, out.recovery);
      assert.equal(f.kit().sniperWithdrawalUntil, out.b.until);
      assert.equal(f.rests()[0].id, out.b.id);
    },
  );
test("a failed first manual emission retains its paid opportunity but cannot arm before an actual accepted shot", () => {
  const f = fixture(),
    { a, b } = f.pair();
  f.walk(a);
  f.step({ technique1: true });
  while (f.g.shots.size < 6000)
    (f.g as any).emitShot(f.ally.id, 1400, 900, 0, 0, 1, 1, 0, 20);
  const ammo = f.p.ammo,
    k = f.kit();
  f.step({ technique2: true });
  assert(f.kit().sniperPrepared);
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
  assert.equal(f.kit().sniperUntil, k.sniperUntil);
  assert.equal(f.kit().sniperRecoveryAt, k.sniperRecoveryAt);
  assert.equal(f.p.ammo, ammo);
  const ordinary = [...f.g.shots.values()].find((s) => s.owner === f.ally.id)!;
  (f.g as any).removeShot(ordinary);
  f.step({ technique2: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.kit().sniperWithdrawalUntil, b.until);
  assert.equal(f.p.ammo, ammo);
});
test("later damage or ordinary primary does not erase an already earned settled return position", () => {
  const f = fixture(),
    out = first(f);
  f.p.shield = 0;
  const health = f.p.health;
  f.g.damage(f.p, 1, false);
  assert(f.p.health < health);
  assert.equal(f.kit().sniperWithdrawalUntil, out.b.until);
  f.step({ fire: true });
  assert.equal(f.kit().sniperWithdrawalUntil, out.b.until);
  assert.equal(f.rests()[0].id, out.b.id);
});
test("armed B recalls instead of planting another partner, preventing a recursive plan chain", () => {
  const f = fixture(),
    out = first(f),
    ammo = f.p.ammo;
  assert(Math.hypot(f.p.x - out.b.x, f.p.y - out.b.y) >= 96);
  assert(!f.kit().sniperRestCanSecond);
  f.step({ technique2: true });
  assert.equal(f.rests().length, 0);
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.kit().sniperRecoveryAt, out.recovery);
});
test("a spent return cannot arm another, and genuinely new sites still require normally available C", () => {
  const f = fixture(),
    out = first(f);
  f.walk(out.b);
  f.step({ technique1: true });
  f.step({ technique2: true });
  const recovery = f.kit().sniperRecoveryAt!,
    ammo = f.p.ammo;
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
  assert.equal(f.rests().length, 0);
  f.pair();
  assert(f.g.combatTick < recovery);
  f.step({ technique1: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.kit().sniperRecoveryAt, recovery);
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
});
test("expiry removes the old return right without re-timing its site or shooting automatically", () => {
  const f = fixture(),
    out = first(f),
    ammo = f.p.ammo;
  f.until(out.b.until);
  assert.equal(f.kit().sniperWithdrawalUntil, 0);
  assert.equal(f.rests().length, 0);
  assert.equal(f.p.ammo, ammo);
  f.step({ technique1: true });
  assert(!f.kit().sniperPrepared);
});
test("capstone loss keeps one issued base Field Rest but cancels paid during-recovery preparation without refund", () => {
  for (const claimed of [false, true]) {
    const f = fixture(),
      out = first(f);
    f.walk(out.b);
    if (claimed) f.step({ technique1: true });
    const ammo = f.p.ammo,
      recovery = f.kit().sniperRecoveryAt;
    f.p.skills = f.p.skills.filter((id) => id !== ids.withdrawal);
    f.step();
    assert.equal(f.kit().sniperWithdrawalUntil, 0);
    assert(!f.kit().sniperPrepared);
    assert.equal(f.p.ammo, ammo);
    assert.equal(f.kit().sniperRecoveryAt, recovery);
    assert.equal(f.rests().length, claimed ? 0 : 1);
  }
});
test("capstone loss from an unspent pair drops only the extra point and keeps the original base point exact", () => {
  const f = fixture(),
    { a } = f.pair();
  f.p.skills = f.p.skills.filter((id) => id !== ids.withdrawal);
  f.step();
  assert.equal(f.rests().length, 1);
  assert.deepEqual(f.rests()[0], a);
});
for (const loss of ["rest", "weapon", "disconnect"] as const)
  test(
    loss +
      " loss removes actual positions/unfinished rights while retaining rostered spent recovery",
    () => {
      const f = fixture(),
        out = first(f),
        ammo = f.p.ammo;
      if (loss === "rest")
        f.p.skills = f.p.skills.filter((id) => id !== ids.rest);
      if (loss === "weapon")
        f.p.weapon = data.weapons.find(
          (w) => w.classId === "soldier" && w.id !== f.p.weapon,
        )!.id;
      if (loss === "disconnect") {
        f.g.setConnected(f.p.id, false);
        f.g.step();
      } else f.step();
      assert.equal(f.rests().length, 0);
      assert.equal(f.kit().sniperWithdrawalUntil, 0);
      assert.equal(f.kit().sniperRecoveryAt, out.recovery);
      assert.equal(f.p.ammo, ammo);
    },
  );
test("shared empty positions expose only geometry/finite setup clocks, not pending/payment/return proof", () => {
  const f = fixture(),
    out = first(f),
    cue = viewOf(f.g, f.ally.id)
      .classCues.filter((c) => c.kind === "soldier-rest")
      .find((c) => c.owner === f.p.id)!;
  assert.equal(cue.id, out.b.id);
  for (const key of [
    "pending",
    "armed",
    "fallback",
    "preparation",
    "weapon",
    "ammo",
    "damage",
    "health",
    "recovery",
    "receipt",
  ])
    assert(!Object.hasOwn(cue, key));
});
test("the issued three-shot Breach Cadence commitment finishes before a fresh empty setup can start", () => {
  const f = fixture(undefined, true),
    ammo = f.p.ammo;
  f.step({ e: true, technique2: true });
  assert.equal(f.rests().length, 0);
  assert.equal(f.kit().sniperRecoveryAt, 0);
  const eAt = f.p.eAt;
  for (let n = 0; n < 7; n++) f.step({ technique2: true });
  assert.equal(f.rests().length, 0);
  assert.equal(f.p.eAt, eAt);
  f.step({ technique2: true });
  assert.equal(
    f.g.shots.size,
    3,
    "all three issued Cadence shots really emitted",
  );
  assert(f.rests().length === 1);
  assert.equal(f.p.ammo, ammo);
});
test("full legal route budgets remain15/17SP and leave purposeful General alternatives within27SP", () => {
  for (const handling of [undefined, "carry", "clear"] as const) {
    const f = fixture(handling),
      spent = f.p.skills.reduce((n, id) => n + f.g.skillCost(id), 0);
    assert.equal(spent, handling ? 17 : 15);
    assert.equal(viewOf(f.g, f.p.id).players[0].sp, handling ? 10 : 12);
    assert.equal(
      f.p.skills.filter(
        (id) =>
          data.specializationSkills.some((s) => s.id === id && s.capstone) ||
          data.skills.some((s) => s.id === id && s.capstone),
      ).length,
      1,
    );
  }
});
