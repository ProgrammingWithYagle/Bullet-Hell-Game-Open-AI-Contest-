import test from "node:test";
import assert from "node:assert/strict";
import {
  SummonerKit,
  baseSummonerOptions,
  validRetinueOrder,
  type SummonerContext,
  type SummonerOwner,
  type SummonTarget,
} from "../src/shared/summoner-kit.ts";
import rules from "../src/shared/summoner-rules.json";
import { distance, segmentRect, type Rect } from "../src/shared/geometry.ts";
function fixture() {
  const kit = new SummonerKit(),
    owner: SummonerOwner = {
      id: "joss",
      classId: "summoner",
      x: 200,
      y: 200,
      aim: 0,
      health: 100,
      status: "active",
      connected: true,
    },
    owners = [owner],
    enemies = new Map<string, SummonTarget>(),
    strikes: {
      owner: string;
      unit: number;
      target: string;
      damage: number;
      marked: boolean;
    }[] = [],
    shots: {
      owner: string;
      unit: number;
      target: string;
      damage: number;
      speed: number;
    }[] = [],
    sounds: string[] = [];
  let serial = 0;
  const c: SummonerContext = {
    tick: 0,
    combat: true,
    paused: false,
    owners,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    lava: [],
    enemies: [],
    target: (key) => enemies.get(key),
    id: () => ++serial,
    strike(p, e, t, damage, marked) {
      const actual = Math.min(t.health, damage);
      t.health -= actual;
      strikes.push({
        owner: p.id,
        unit: e.id,
        target: t.key,
        damage: actual,
        marked,
      });
      return actual;
    },
    shoot(p, e, t, damage, speed) {
      shots.push({ owner: p.id, unit: e.id, target: t.key, damage, speed });
    },
    sound: (id) => sounds.push(id),
  };
  const add = (key: string, x: number, y: number) => {
    const target: SummonTarget = {
      key,
      x,
      y,
      health: 1e6,
      radius: 18,
      kind: "ordinary",
    };
    enemies.set(key, target);
    c.enemies = [...enemies.values()];
    return target;
  };
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      c.tick++;
      kit.step(c);
    }
  };
  return {
    kit,
    owner,
    owners,
    c,
    strikes,
    shots,
    sounds,
    add,
    step,
    enemies,
    options: baseSummonerOptions(),
  };
}
test("Call Retinue creates two distinct legal owned bodies, fills a finite capacity and cannot heal survivors by calling again", () => {
  const f = fixture();
  assert(f.kit.cast(f.owner, "q", f.c, f.options));
  assert.deepEqual(
    f.kit.owned(f.owner.id).map((e) => e.kind),
    ["hound", "wing"],
  );
  const old = f.kit.owned(f.owner.id)[0];
  assert.equal(f.kit.hit(old.id, 20, 0), 20);
  const health = old.health;
  assert(f.kit.cast(f.owner, "q", f.c, f.options));
  assert.equal(f.kit.owned(f.owner.id).length, 4);
  assert.equal(old.health, health);
  assert(!f.kit.cast(f.owner, "q", f.c, f.options));
  assert.equal(f.kit.status(f.owner, 0).retinuePermanent, 4);
  const blocked = fixture();
  blocked.c.obstacles = [{ x: 0, y: 0, width: 1600, height: 1000 }];
  assert(!blocked.kit.canCast(blocked.owner, "q", blocked.c, blocked.options));
  assert(!blocked.kit.cast(blocked.owner, "q", blocked.c, blocked.options));
  assert.equal(blocked.kit.entities.size, 0);
});
test("All fifty possible Summoners can each reach eight entities without exceeding the four-hundred room budget", () => {
  const f = fixture();
  f.owners.length = 0;
  f.options.capacityBonus = 2;
  for (let i = 0; i < 50; i++) {
    const p = { ...f.owner, id: "owner-" + i };
    f.owners.push(p);
    for (let n = 0; n < 3; n++) assert(f.kit.cast(p, "q", f.c, f.options));
    assert(f.kit.cast(p, "ultimate", f.c, f.options));
    assert.equal(f.kit.owned(p.id).length, 8);
  }
  assert.equal(f.kit.entities.size, 400);
  assert.equal(
    new Set([...f.kit.entities.values()].map((e) => e.id)).size,
    400,
  );
  const extra = { ...f.owner, id: "extra" };
  f.owners.push(extra);
  assert(!f.kit.cast(extra, "q", f.c, f.options));
  assert.equal(f.kit.entities.size, rules.maximumRoomEntities);
});
test("Melee and ranged entities navigate around actual cover and never issue an attack through it", () => {
  const f = fixture(),
    wall: Rect = { x: 280, y: 80, width: 40, height: 240 };
  f.c.obstacles = [wall];
  f.add("ordinary:1", 440, 200);
  assert(f.kit.cast(f.owner, "q", f.c, f.options));
  for (let n = 0; n < 240; n++) {
    const before = f.strikes.length + f.shots.length;
    f.step();
    for (const e of f.kit.entities.values())
      assert.equal(
        segmentRect(e, e, wall, e.radius),
        null,
        "A physical body crossed cover",
      );
    if (f.strikes.length + f.shots.length > before) {
      const last = f.strikes.at(-1) ?? f.shots.at(-1)!;
      assert.equal(last.owner, f.owner.id);
      const e = f.kit.entities.get(last.unit)!;
      assert.equal(segmentRect(e, f.enemies.get(last.target)!, wall), null);
    }
  }
  assert(f.strikes.length > 0);
  assert(f.shots.length > 0);
  assert(f.shots.every((s) => s.speed === 520));
});
test("Only positive primary damage can mark; explicit Focus chooses that target and a later mark replaces it without copying ownership", () => {
  const f = fixture(),
    a = f.add("ordinary:1", 430, 200),
    b = f.add("ordinary:2", 320, 200);
  f.kit.cast(f.owner, "q", f.c, f.options);
  assert(!f.kit.order(f.owner, "focus", f.c));
  assert(!f.kit.mark(f.owner, a.key, 0, f.c));
  assert(!f.kit.mark(f.owner, "missing", 10, f.c));
  assert(f.kit.mark(f.owner, a.key, 1, f.c));
  assert(f.kit.order(f.owner, "focus", f.c));
  f.step();
  assert(f.kit.owned(f.owner.id).every((e) => e.target === a.key));
  assert(f.kit.mark(f.owner, b.key, 1, f.c));
  f.step();
  assert(f.kit.owned(f.owner.id).every((e) => e.target === b.key));
  f.step(60);
  assert(f.strikes.some((s) => s.marked && s.target === b.key));
  assert(f.strikes.every((s) => s.owner === f.owner.id));
  f.enemies.delete(b.key);
  f.c.enemies = [a];
  f.step();
  assert.equal(f.kit.status(f.owner, f.c.tick).retinueOrder, "escort");
  assert.equal(f.kit.status(f.owner, f.c.tick).retinueMarkUntil, 0);
});
test("Hold finds a reachable point before cover, rate limits commands and does not silently become an owner-follow order", () => {
  const f = fixture();
  f.c.obstacles = [{ x: 280, y: 0, width: 40, height: 400 }];
  f.kit.cast(f.owner, "q", f.c, f.options);
  assert(f.kit.order(f.owner, "hold", f.c));
  assert(!f.kit.order(f.owner, "escort", f.c));
  f.owner.x = 800;
  f.owner.y = 700;
  f.step(120);
  assert(f.kit.owned(f.owner.id).every((e) => e.x < 400));
  assert.equal(f.kit.status(f.owner, f.c.tick).retinueOrder, "hold");
  assert(!validRetinueOrder({ order: "escort" }));
  assert(!f.kit.order(f.owner, "teleport", f.c));
  f.c.paused = true;
  const before = f.kit.snapshot();
  assert(!f.kit.order(f.owner, "escort", f.c));
  f.kit.step(f.c);
  assert.deepEqual(f.kit.snapshot(), before);
});
test("Gather returns bodies physically and grants each existing survivor at most one arrival repair, without resurrection", () => {
  const f = fixture();
  f.kit.cast(f.owner, "q", f.c, f.options);
  const units = f.kit.owned(f.owner.id);
  for (const e of units) {
    f.kit.hit(e.id, 20, 0);
    e.x = 1000;
    e.y = 500;
  }
  f.c.tick = 10;
  assert(f.kit.cast(f.owner, "e", f.c, f.options));
  const before = units.map((e) => ({ ...e }));
  f.step();
  for (let i = 0; i < units.length; i++) {
    assert(distance(units[i], before[i]) < 14);
    assert.equal(units[i].health, before[i].health);
  }
  f.step(110);
  for (const e of units) {
    assert(distance(e, f.owner) <= rules.gatherArrivalRange + 80);
    assert.equal(e.health, e.maxHealth - 8);
  }
  const e = units[0];
  f.kit.hit(e.id, 5, f.c.tick);
  f.step(20);
  assert.equal(
    e.health,
    e.maxHealth - 13,
    "Repeated arrival cannot heal again",
  );
  f.kit.hit(e.id, 1000, f.c.tick);
  f.step();
  assert(!f.kit.entities.has(e.id));
  assert.equal(f.kit.owned(f.owner.id).length, 1);
});
test("The actual running-pack, closed-ranks and patient-company options trade formation, repair and burst behavior", () => {
  const pack = fixture();
  pack.options.talents.runningPack = true;
  pack.kit.cast(pack.owner, "q", pack.c, pack.options);
  assert(
    pack.kit
      .owned(pack.owner.id)
      .every((e) => e.kind === "hound" && e.maxHealth === 44 && e.speed > 280),
  );
  const ranks = fixture();
  ranks.kit.cast(ranks.owner, "q", ranks.c, ranks.options);
  const unit = ranks.kit.owned(ranks.owner.id)[0];
  ranks.kit.hit(unit.id, 20, 0);
  ranks.c.tick = 10;
  unit.x = ranks.owner.x;
  unit.y = ranks.owner.y;
  ranks.options.talents.closedRanks = true;
  ranks.kit.cast(ranks.owner, "e", ranks.c, ranks.options);
  ranks.step();
  assert.equal(unit.health, unit.maxHealth - 20);
  assert.equal(ranks.kit.hit(unit.id, 10, ranks.c.tick), 5.5);
  const patient = fixture();
  patient.options.talents.patientCompany = true;
  patient.kit.cast(patient.owner, "ultimate", patient.c, patient.options);
  assert(patient.kit.owned(patient.owner.id).every((e) => e.expires === 720));
});
test("Ultimate potency changes real Warder health and damage even when Patient Company gives up the retinue boost", () => {
  const strong = fixture();
  strong.options.ultimatePotencyBonus = 1;
  strong.add("ordinary:1", 200, 225);
  strong.kit.cast(strong.owner, "ultimate", strong.c, strong.options);
  assert(
    strong.kit
      .owned(strong.owner.id)
      .every((e) => e.maxHealth === 190 && e.damage === 30),
  );
  strong.step(6);
  assert(strong.strikes.some((s) => s.damage === 45));
  const patient = fixture();
  patient.options.ultimatePotencyBonus = 1;
  patient.options.talents.patientCompany = true;
  patient.add("ordinary:1", 200, 225);
  patient.kit.cast(patient.owner, "ultimate", patient.c, patient.options);
  patient.step(6);
  assert(
    patient.kit
      .owned(patient.owner.id)
      .every(
        (e) => e.maxHealth === 190 && e.damage === 30 && e.expires === 720,
      ),
  );
  assert(patient.strikes.some((s) => s.damage === 30));
});

test("A temporary muster expires without removing permanent companions; incapacitation, disconnect and encounter exit clear all live and fallen ownership", () => {
  const f = fixture();
  f.kit.cast(f.owner, "q", f.c, f.options);
  f.kit.cast(f.owner, "ultimate", f.c, f.options);
  assert.equal(f.kit.owned(f.owner.id).length, 4);
  assert(!f.kit.cast(f.owner, "ultimate", f.c, f.options));
  f.step(480);
  assert.equal(f.kit.owned(f.owner.id).length, 2);
  assert(f.kit.owned(f.owner.id).every((e) => !e.temporary));
  const e = f.kit.owned(f.owner.id)[0];
  f.kit.hit(e.id, 1000, f.c.tick);
  assert(f.kit.snapshot().some((e) => e.action === "downed"));
  const copy = f.kit.snapshot();
  copy[0].health = -100;
  assert(f.kit.snapshot().every((e) => e.health >= 0));
  f.owner.connected = false;
  f.step();
  assert.equal(f.kit.entities.size, 0);
  assert.equal(f.kit.snapshot().length, 0);
  assert(!f.kit.cast(f.owner, "q", f.c, f.options));
  f.owner.connected = true;
  f.kit.cast(f.owner, "q", f.c, f.options);
  f.owner.status = "downed";
  f.step();
  assert.equal(f.kit.snapshot().length, 0);
  f.owner.status = "active";
  f.kit.cast(f.owner, "q", f.c, f.options);
  f.c.combat = false;
  f.kit.step(f.c);
  assert.equal(f.kit.snapshot().length, 0);
});
