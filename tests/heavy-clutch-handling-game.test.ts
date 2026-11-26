import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  traverseIds as ids,
  clutchId,
  keyedId,
  openId,
  heavyTraverseRules as r,
} from "../src/shared/heavy-traverse.ts";
import { handlingGameFixture as fixture } from "./helpers/heavy-clutch-handling-game-fixture.ts";
const near = (a: number, b: number) =>
  assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function check(name: string, fn: () => unknown) {
  test("Clutch handling: " + name, () => {
    fn();
  });
}

check(
  "Keyed decouples a real original-slot C emission from an oppositely aimed real Q without adding a round or Q cast",
  () => {
    const rows = [];
    for (const mode of ["loose", "spade", "floating"] as const)
      for (const handling of [undefined, keyedId]) {
        const f = fixture(mode, handling),
          east = f.target(900, 600),
          west = f.target(400, 600);
        f.step({ technique1: true });
        f.step({ technique2: true });
        f.step({ technique2: true });
        for (let t = 4; t <= 60; t++)
          f.step({ aim: t >= 11 ? Math.PI : 0, q: t === 11 });
        const row = {
          mode,
          handling: handling ?? "standard",
          Cslots: f.special().map((s) => s.at),
          eastDamage: 1000 - east.health,
          westDamage: 1000 - west.health,
          actualPaidRounds: 45 - f.p.ammo,
          qRecovery: f.p.qAt,
          CRecovery: f.status().technique1At,
        };
        assert.deepEqual(row.Cslots, [1, 11, 21, 31]);
        assert.equal(row.actualPaidRounds, 4);
        assert(row.westDamage > 0);
        if (handling === keyedId || mode === "floating")
          assert(Math.abs(row.eastDamage - 194.4) < 1e-6);
        else assert(Math.abs(row.eastDamage - 48.6) < 1e-6);
        rows.push(row);
      }
    return rows;
  },
);
check(
  "Keyed gives up real later manual retargeting that standard Loose and Spade retain",
  () => {
    const rows = [];
    for (const mode of ["loose", "spade"] as const)
      for (const handling of [undefined, keyedId]) {
        const f = fixture(mode, handling),
          east = f.target(900, 600),
          north = f.target(900, 600 + Math.tan(0.6) * 300);
        f.step({ technique1: true });
        f.step({ technique2: true });
        f.step({ technique2: true });
        for (let t = 4; t <= 60; t++) f.step({ aim: 0.6 });
        const damage = 1000 - north.health;
        if (handling === keyedId) assert.equal(damage, 0);
        else assert(Math.abs(damage - 145.8) < 1e-6);
        rows.push({
          mode,
          handling: handling ?? "standard",
          laterTargetDamage: damage,
          firstLaneDamage: 1000 - east.health,
          rounds: 45 - f.p.ammo,
        });
      }
    return rows;
  },
);
check(
  "Floating Keyed uses a real bounded calibration window, losing an original slot to redirect two later actual rounds",
  () => {
    const rows = [];
    for (const handling of [undefined, keyedId]) {
      const f = fixture("floating", handling),
        east = f.target(900, 600),
        north = f.target(900, 600 + Math.tan(0.6) * 300);
      f.step({ technique1: true });
      f.step({ technique2: true });
      for (let t = 3; t <= 11; t++) f.step({ aim: 0.6 });
      f.step({ technique2: true, aim: 0.6 });
      for (let t = 13; t <= 60; t++) f.step({ aim: -0.6 });
      const damage = 1000 - north.health;
      assert.deepEqual(
        f.special().map((s) => s.at),
        [1, 21, 31],
      );
      if (handling === keyedId) assert(Math.abs(damage - 97.2) < 1e-6);
      else assert.equal(damage, 0);
      rows.push({
        handling: handling ?? "standard",
        newLaneDamage: damage,
        firstLaneDamage: 1000 - east.health,
        paidRounds: 45 - f.p.ammo,
        Cslots: f.special().map((s) => s.at),
      });
    }
    return rows;
  },
);
check(
  "Open converts one actual paid primary round into the earliest future C opportunity, preserving the original remaining slots on all carriages",
  () => {
    const rows = [];
    for (const mode of ["loose", "spade", "floating"] as const) {
      const f = fixture(mode, openId),
        target = f.target(900, 600);
      f.step({ technique1: true });
      f.step({ technique2: true, fire: true });
      assert.equal(f.status().heavyClutchConverted, 1);
      assert.equal(f.status().heavyTraverseNextAt, 21);
      assert.equal(f.p.ammo, 43);
      f.step({ technique2: true });
      for (let t = 4; t <= 60; t++) f.step();
      assert.deepEqual(
        f.special().map((s) => s.at),
        [1, 21, 31],
      );
      const primary = f.shots.filter(
        (s) => !f.special().some((c) => c.id === s.id),
      );
      assert.equal(primary.length, 1);
      assert.equal(primary[0].at, 2);
      assert.equal(f.conversions.length, 1);
      assert.equal(45 - f.p.ammo, 4);
      assert(
        Math.abs(
          1000 - target.health - f.shots.reduce((n, s) => n + s.damage, 0),
        ) < 1e-6,
      );
      assert(1000 - target.health < 194.4);
      rows.push({
        mode,
        actualCslots: [1, 21, 31],
        actualPrimaryAt: 2,
        actualTargetDamage: 1000 - target.health,
        actualPaidRounds: 4,
        conversions: f.conversions,
        originalRecovery: f.status().technique1At,
      });
    }
    return rows;
  },
);
check(
  "Open preflights the complete actual primary volley; a rejected full or partial capacity spends no ammo/cadence/slot, and three pellets convert once",
  () => {
    const f = fixture("spade", openId);
    f.step({ technique1: true });
    const original = f.g.stats.bind(f.g);
    f.g.stats = (p: any) => ({
      ...original(p),
      ...(p.id === f.p.id ? { extraShots: 2 } : {}),
    });
    const fillers: any[] = [];
    while (f.g.shots.size < 6000)
      fillers.push(f.g.emitShot(f.ally.id, 1400, 900, 0, 0, 1, 1, 0, 10));
    f.step({ technique2: true, fire: true });
    assert.equal(f.p.ammo, 44);
    assert.equal(f.conversions.length, 0);
    assert.equal(f.status().heavyTraverseNextAt, 11);
    const rejectedFireAt = f.p.fireAt;
    assert.equal(rejectedFireAt, 2);
    f.g.removeShot(fillers.pop());
    f.step({ fire: true });
    assert.equal(f.p.fireAt, rejectedFireAt);
    assert.equal(f.p.ammo, 44);
    assert.equal(f.conversions.length, 0);
    f.g.removeShot(fillers.pop());
    f.g.removeShot(fillers.pop());
    f.step({ fire: true });
    const primary = f.shots.filter((s) => s.at === 4);
    assert.equal(primary.length, 3);
    assert.equal(f.p.ammo, 43);
    assert.equal(f.conversions.length, 1);
    assert.equal(f.status().heavyClutchConverted, 1);
    assert.equal(f.status().heavyTraverseNextAt, 21);
    return {
      controlledExtraPellets: 2,
      actualPellets: 3,
      actualPrimaryRounds: 1,
      remainingPool: f.g.shots.size,
      actualAmmo: 43,
      conversions: f.conversions,
    };
  },
);
check(
  "three actual Game primary rounds in one controlled held-fire debt step consume three distinct original opportunities",
  () => {
    const f = fixture("spade", openId);
    f.step({ technique1: true });
    f.p.wasFiring = true;
    f.p.fireAt = -20;
    f.step({ technique2: true, fire: true });
    const primary = f.shots.filter((s) => s.at === 2);
    assert.equal(primary.length, 3);
    assert.equal(f.conversions.length, 3);
    assert.equal(f.p.ammo, 41);
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.status().technique1At, 241);
    return {
      controlledHeldFireDebt: true,
      actualPrimaryRounds: 3,
      allAtTick: 2,
      actualAmmoSpent: 4,
      conversions: f.conversions,
    };
  },
);
check(
  "losing either used handling removes only later dependent C flight/recoil; the earlier base round keeps issued authority",
  () => {
    const rows = [];
    for (const handling of [keyedId, openId]) {
      const f = fixture("floating", handling);
      f.step({ technique1: true });
      const earlier = f.flights()[0].id;
      f.step({ technique2: true });
      f.step({ technique2: true });
      while (f.g.combatTick < 12) f.step();
      const later = f.flights().find((s) => s.id !== earlier).id;
      const paidRecoil = f.g.traverse.recoil(f.p, 13);
      assert(Math.hypot(paidRecoil.x, paidRecoil.y) > 0);
      f.p.skills = f.p.skills.filter((id: string) => id !== handling);
      near(
        Math.hypot(
          ...(Object.values(f.g.traverse.recoil(f.p, 13)) as [number, number]),
        ),
        0,
      );
      f.step();
      assert(f.g.shots.has(earlier));
      assert(!f.g.shots.has(later));
      assert.equal(f.status().heavyTraverseUntil, 0);
      assert.equal(f.status().heavyTraverseShotAt, 0);
      assert.equal(f.status().technique1At, 241);
      assert.equal(f.p.ammo, 43);
      rows.push({
        handling,
        earlierRetained: earlier,
        laterRemoved: later,
        dependentRecoilRemoved: true,
        actualPaidRounds: 2,
        recovery: 241,
      });
    }
    return rows;
  },
);
check(
  "Open loss retains the admitted ordinary primary round while cancelling dependent unpaid work",
  () => {
    const f = fixture("spade", openId);
    f.step({ technique1: true });
    f.step({ technique2: true, fire: true, aim: Math.PI });
    const primary = f.shots.find((s) => s.admittedAt === 2);
    assert(primary && f.g.shots.has(primary.id));
    assert.equal(f.conversions.length, 1);
    f.p.skills = f.p.skills.filter((id: string) => id !== openId);
    f.step();
    assert(f.g.shots.has(primary.id));
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.p.ammo, 43);
    assert.equal(f.status().technique1At, 241);
    return {
      ordinaryShotRetained: primary.id,
      paidRoundNotRefunded: true,
      conversionCount: 1,
      recovery: 241,
    };
  },
);
check(
  "real entry, fitting, weapon, owner loss and downing remove actual dependent flights; roster recovery survives reconnect",
  () => {
    const rows = [];
    for (const handling of [keyedId, openId])
      for (const loss of [
        "entry",
        "clutch",
        "fitting",
        "weapon",
        "disconnect",
        "downed",
      ]) {
        const f = fixture("floating", handling);
        f.step({ technique1: true });
        const earlier = f.flights()[0].id;
        f.step({ technique2: true });
        f.step({ technique2: true });
        while (f.g.combatTick < 12) f.step();
        const later = f.flights().find((s) => s.id !== earlier).id;
        if (["entry", "clutch", "fitting"].includes(loss)) {
          const remove =
            loss === "entry"
              ? ids.entry
              : loss === "clutch"
                ? clutchId
                : ids.floating;
          f.p.skills = f.p.skills.filter((id: string) => id !== remove);
        } else if (loss === "weapon") f.p.weapon = "heavy-1";
        else if (loss === "disconnect") f.g.setConnected(f.p.id, false);
        else {
          f.p.shield = 0;
          f.p.invulnerableUntil = 0;
          f.g.damage(f.p, 1e6);
        }
        if (loss === "disconnect") f.g.setConnected(f.p.id, true);
        f.step({ technique1: true });
        assert(!f.g.shots.has(later));
        assert.equal(f.g.shots.has(earlier), loss === "clutch");
        assert.equal(f.status().technique1At, 241);
        assert.equal(f.p.ammo, 43);
        assert.equal(f.status().heavyTraverseUntil, 0);
        rows.push({
          handling,
          loss,
          earlierRetained: loss === "clutch",
          laterRemoved: true,
          recovery: 241,
          noNewCastOnReconnect: loss === "disconnect",
        });
      }
    return rows;
  },
);
check(
  "reload, dodge, ultimate and active channel cancel lifted work on each carriage without adding or refunding a C round",
  () => {
    const rows = [];
    for (const handling of [keyedId, openId])
      for (const mode of ["loose", "spade", "floating"] as const)
        for (const action of ["reload", "dodge", "ultimate", "channel"]) {
          const f = fixture(mode, handling);
          f.step({ technique1: true });
          const paid = f.flights()[0].id;
          f.step({ technique2: true });
          if (action === "channel") f.p.channelUntil = 100;
          f.step(
            action === "channel" ? {} : { [action]: true, technique2: true },
          );
          assert.equal(f.status().heavyTraverseUntil, 0);
          assert.equal(f.status().technique1At, 241);
          assert.equal(f.p.ammo, 44);
          assert.equal(f.conversions.length, 0);
          assert(f.g.shots.has(paid));
          rows.push({
            handling,
            mode,
            action,
            actualCrounds: 1,
            recovery: 241,
          });
        }
    return rows;
  },
);
check(
  "C wins a same-frame B request; ordinary fire after cancellation keeps its issued payment and converts no abandoned slot",
  () => {
    const rows = [];
    for (const handling of [keyedId, openId]) {
      const f = fixture("spade", handling);
      f.step({ technique1: true });
      f.step({ technique2: true });
      f.step({ technique1: true, technique2: true, fire: true });
      assert.equal(f.status().heavyTraverseUntil, 0);
      assert.equal(f.conversions.length, 0);
      assert.equal(f.special().length, 1);
      assert.equal(f.shots.length, 2);
      assert.equal(f.p.ammo, 43);
      assert(
        !f.events.some(
          (e) => e.type === "sound" && e.id === "heavy-clutch-engage",
        ),
      );
      assert.equal(f.status().technique1At, 241);
      rows.push({
        handling,
        Crounds: 1,
        issuedPrimaryAt: f.shots[1].admittedAt,
        conversions: 0,
        actualPaidRounds: 2,
      });
    }
    return rows;
  },
);
check(
  "both handling choices still require a stationary Spade replant at the actual moved body; later external movement breaks that post",
  () => {
    const rows = [];
    for (const handling of [keyedId, openId]) {
      const f = fixture("spade", handling);
      f.step({ technique1: true });
      f.step({ technique2: true, moveY: 1 });
      f.step({ technique2: true, moveY: 1 });
      assert(f.status().heavyClutchLifted);
      const at = { x: f.p.x, y: f.p.y };
      f.step({ technique2: true });
      assert(!f.status().heavyClutchLifted);
      near(f.status().heavyTraversePostX, at.x);
      near(f.status().heavyTraversePostY, at.y);
      f.g.director.services.movement = () => ({ multiplier: 1, x: 30, y: 0 });
      f.step();
      assert(f.p.x > at.x);
      assert.equal(f.status().heavyTraverseUntil, 0);
      assert.equal(f.p.ammo, 44);
      assert.equal(f.status().technique1At, 241);
      rows.push({
        handling,
        actualReplant: at,
        displacedBodyX: f.p.x,
        actualCrounds: 1,
        recovery: 241,
      });
    }
    return rows;
  },
);
check(
  "a later dependent C round uses its copied emission origin for actual directional armor after the owner walks away",
  () => {
    const rows = [];
    for (const handling of [keyedId, openId]) {
      const f = fixture("floating", handling);
      Object.assign(f.g.boss, { x: 1000, y: 600 });
      const origins: any[] = [];
      f.g.director.district.bodyMultiplier = (p: any) => {
        origins.push({ x: p.x, y: p.y });
        return 0.5;
      };
      f.step({ technique1: true });
      f.step({ technique2: true });
      f.step({ technique2: true });
      while (f.g.combatTick < 11) f.step();
      const second = f.special().find((s) => s.admittedAt === 11);
      assert(second);
      f.step({ technique1: true, moveY: 1 });
      for (let i = 0; i < 18; i++) f.step({ moveY: 1 });
      assert.equal(origins.length, 2);
      near(origins[1].x, second.x);
      near(origins[1].y, second.y);
      assert(f.p.y > second.y + 100);
      near(f.p.damageDealt, r.damage * f.g.stats(f.p).damage);
      rows.push({
        handling,
        actualOrigins: origins,
        ownerAfterTravel: { x: f.p.x, y: f.p.y },
        actualArmoredDamage: f.p.damageDealt,
        laterEmission: { x: second.x, y: second.y },
      });
    }
    return rows;
  },
);
check(
  "empty Open primary admits no conversion; the actual reload interrupts remaining unpaid work with original recovery",
  () => {
    const f = fixture("spade", openId);
    f.step({ technique1: true });
    f.step({ technique2: true });
    f.p.ammo = 0; // Controlled empty-magazine rejection fixture, not a claimed earned ammunition sequence.
    f.step({ fire: true });
    assert.equal(f.conversions.length, 0);
    assert.equal(f.shots.length, 1);
    assert.equal(f.status().heavyTraverseUntil, 0);
    assert.equal(f.status().technique1At, 241);
    assert(f.p.reloadAt > f.g.combatTick);
    assert.equal(f.p.ammo, 0);
    return {
      controlledEmptyMagazine: true,
      actualReloadAt: f.p.reloadAt,
      conversions: 0,
      originalRecovery: 241,
    };
  },
);
check(
  "actual host exit removes physical handled C work, while pooled object reuse remains another owner's authority",
  () => {
    const rows = [];
    for (const handling of [keyedId, openId]) {
      const first = fixture("floating", handling);
      first.step({ technique1: true });
      first.step({ technique2: true });
      first.step({ technique2: true });
      while (first.g.combatTick < 12) first.step();
      const ids = first.flights().map((s) => s.id);
      assert.equal(ids.length, 2);
      assert(first.g.endByHost());
      assert(ids.every((id) => !first.g.shots.has(id)));
      assert.equal(first.status().heavyTraverseUntil, 0);
      const second = fixture("spade", handling);
      second.step({ technique1: true });
      second.step({ technique2: true });
      const old = second.flights()[0],
        oldId = old.id;
      second.g.removeShot(old);
      const reused = second.g.emitShot(
        second.ally.id,
        1400,
        900,
        0,
        0,
        1,
        1,
        0,
        10,
      );
      assert.equal(reused, old);
      assert.notEqual(reused.id, oldId);
      second.g.setConnected(second.p.id, false);
      assert.equal(second.g.shots.get(reused.id), reused);
      rows.push({
        handling,
        actualHostRemoved: ids,
        foreignPooledIdRetained: reused.id,
        owner: reused.owner,
      });
    }
    return rows;
  },
);
test("Open has real off-bearing primary access during the same walking escape while issued Clutch retains commitment", () => {
  const rows: any[] = [];
  for (const mode of ["loose", "spade", "floating"] as const)
    for (const handling of [undefined, openId]) {
      const f = fixture(mode, handling);
      const target = f.g.spawnMinion({
        kind: "ordinary",
        x: 400,
        y: 600 + 190 / 30,
        health: 5,
        speed: 0,
        radius: 16,
        damage: 0,
      });
      assert(target);
      f.step({ technique1: true });
      f.step({ technique2: true, fire: true, moveY: 1, aim: Math.PI });
      const emission = f.shots.find((s) => s.admittedAt === 2);
      while (f.g.combatTick < 18) f.step({ moveY: 1 });
      assert(f.p.y > 700);
      assert.deepEqual(
        f.special().map((s) => s.admittedAt),
        [1],
      );
      if (handling) {
        assert.equal(target.health, 0);
        assert.equal(f.conversions.length, 1);
        assert.equal(f.p.ammo, 43);
        assert(emission && emission.vx < 0);
        assert.equal(f.status().heavyClutchConverted, 1);
      } else {
        assert.equal(target.health, 5);
        assert.equal(f.conversions.length, 0);
        assert.equal(f.p.ammo, 44);
        assert.equal(emission, undefined);
      }
      assert.equal(f.status().technique1At, 241);
      rows.push({
        mode,
        handling: handling ?? "issued Clutch",
        actualTimeGate: 18,
        sameTriggerAt: 2,
        actualTargetRemainingHealth: target.health,
        actualOwnerY: f.p.y,
        actualAmmoSpent: 45 - f.p.ammo,
        actualConversionCount: f.conversions.length,
        actualCslots: [1],
        originalRecovery: 241,
      });
    }

  assert.equal(rows.length, 6);
});

test("13earned handling rejects actual Raid12 despite sufficient unspent points, and optional omission retains the original Clutch", () => {
  for (const handling of [keyedId, openId]) {
    const g = new Game({ mode: "raid" }),
      p = g.addPlayer("solo", "Hux", "heavy");
    for (const item of ["heavy-ordnance-1", ids.entry, clutchId])
      assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
    const before = [...p.skills];
    assert.equal(viewOf(g, p.id).players[0].sp, 6);
    const rejected = g.transact(p.id, {
      id: "reject",
      kind: "skill",
      item: handling,
    });
    assert.equal(rejected.reason, "insufficientPoints");
    assert.deepEqual(p.skills, before);
    assert.equal(viewOf(g, p.id).players[0].sp, 6);
    p.totalSp = 13;
    assert(
      g.transact(p.id, { id: "exact-threshold", kind: "skill", item: handling })
        .ok,
    );
    assert.equal(viewOf(g, p.id).players[0].sp, 4);
  }
});
test("both handling choices require actual Clutch ownership and mutually exclude each other without spending or bypassing the one-capstone budget", () => {
  for (const handling of [keyedId, openId]) {
    const f = fixture("loose");
    const before = viewOf(f.g, f.p.id).players[0].sp;
    f.g.phase = "shop";
    assert(
      f.g.transact(f.p.id, { id: "chosen", kind: "skill", item: handling }).ok,
    );
    assert.equal(viewOf(f.g, f.p.id).players[0].sp, before - 3);
    const other = handling === keyedId ? openId : keyedId;
    assert.equal(
      f.g.transact(f.p.id, { id: "other", kind: "skill", item: other }).reason,
      "incompatibleItem",
    );
    assert.equal(viewOf(f.g, f.p.id).players[0].sp, before - 3);
    const absent = new Game({ mode: "raid" }),
      p = absent.addPlayer("solo", "Hux", "heavy");
    p.totalSp = 15;
    for (const item of ["heavy-ordnance-1", ids.entry])
      assert(absent.transact(p.id, { id: item, kind: "skill", item }).ok);
    assert(
      !absent.transact(p.id, { id: "missing", kind: "skill", item: handling })
        .ok,
    );
    assert(!p.skills.includes(handling));
  }
});
test("each handling fits all three carriages through actual purchases, with distinct 9or11SP costs and no new numerical effect", () => {
  for (const handling of [keyedId, openId])
    for (const mode of ["loose", "spade", "floating"] as const) {
      const f = fixture(mode, handling),
        cost = f.p.skills.reduce(
          (n: number, id: string) => n + f.g.skillCost(id),
          0,
        );
      assert.equal(cost, mode === "loose" ? 9 : 11);
      assert.equal(viewOf(f.g, f.p.id).players[0].sp, 27 - cost);
    }
});
test("other classes and Campaign cannot purchase the new Free Play handling", () => {
  for (const item of [keyedId, openId]) {
    const g = new Game({ mode: "raid" }),
      p = g.addPlayer("medic", "Mera", "medic");
    assert(!g.transact(p.id, { id: item, kind: "skill", item }).ok);
    const story = new Game({ mode: "story" }),
      h = story.addPlayer("hux", "Hux", "heavy");
    assert.equal(
      story.transact(h.id, { id: item, kind: "skill", item }).reason,
      "storyLearningRequired",
    );
  }
});
