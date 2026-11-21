import test from "node:test";
import assert from "node:assert/strict";
import {
  AlchemistKit,
  baseAlchemyOptions,
  type AlchemyContext,
  type AlchemyArea,
  type AlchemyOwner,
} from "../src/shared/alchemist-kit.ts";
import rules from "../src/shared/alchemy-rules.json";
function fixture() {
  const kit = new AlchemistKit(),
    p: AlchemyOwner = {
      id: "p",
      classId: "alchemist",
      x: 300,
      y: 300,
      aim: 0,
      connected: true,
      status: "active",
      dashUntil: 0,
    };
  let id = 0;
  const effects: AlchemyArea[] = [],
    sounds: string[] = [];
  const c: AlchemyContext = {
    tick: 0,
    combat: true,
    paused: false,
    owners: [p],
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    id: () => ++id,
    area: (effect) => {
      effects.push(structuredClone(effect));
      return { damage: effect.damage, healing: effect.healing };
    },
    sound: (id) => sounds.push(id),
  };
  const step = (ticks = 1) => {
    for (let i = 0; i < ticks; i++) {
      c.tick++;
      kit.step(c);
    }
  };
  const brew = () => {
    assert(kit.cast(p, "q", c));
    step(rules.brewTicks);
  };
  const toss = () => {
    assert(kit.cast(p, "e", c));
    step(rules.flightTicks);
  };
  return { kit, p, c, effects, sounds, step, brew, toss };
}
test("Brew reserves exact recipe ingredients immediately, completes only on the fixed combat clock and keeps its committed recipe after selection changes", () => {
  const f = fixture();
  assert(f.kit.cast(f.p, "q", f.c));
  let state = f.kit.status("p", 0);
  assert.deepEqual(
    [state.alchemyCinder, state.alchemyChalk, state.alchemySap],
    [2, 2, 3],
  );
  assert.equal(state.alchemyPrepared.length, 0);
  assert.equal(f.kit.movement("p", 0), 0.8);
  assert(f.kit.select(f.p, "binding", f.c));
  assert(!f.kit.select(f.p, "mending", f.c));
  assert(!f.kit.canPrimary(f.p, f.c));
  assert(!f.kit.cast(f.p, "e", f.c));
  f.step(11);
  assert.equal(f.kit.status("p", 11).alchemyPrepared.length, 0);
  f.step();
  state = f.kit.status("p", 12);
  assert.deepEqual(state.alchemyPrepared, ["flare"]);
  assert.equal(state.alchemyRecipe, "binding");
  assert.equal(f.kit.movement("p", 12), 1);
  assert.equal(f.effects.length, 0);
});
test("Dodge cancels brewing without an ingredient refund and an inactive, foreign or paused owner cannot brew, select or recover", () => {
  const f = fixture();
  assert(f.kit.cast(f.p, "q", f.c));
  f.p.dashUntil = 8;
  f.step();
  assert.equal(f.kit.status("p", 1).alchemyBrewUntil, 0);
  assert.equal(f.kit.status("p", 1).alchemyCinder, 2);
  f.step(12);
  assert.equal(f.kit.status("p", 13).alchemyPrepared.length, 0);
  f.c.paused = true;
  const before = f.kit.status("p", f.c.tick);
  assert(!f.kit.select(f.p, "binding", f.c));
  assert(!f.kit.primaryHit(f.p, 50, f.c));
  f.kit.step(f.c);
  assert.deepEqual(f.kit.status("p", f.c.tick), before);
  f.c.paused = false;
  assert(!f.kit.cast({ ...f.p, id: "forged" }, "q", f.c));
  assert(!f.kit.cast({ ...f.p, classId: "mage" }, "ultimate", f.c));
  f.p.status = "downed";
  assert(!f.kit.cast(f.p, "q", f.c));
});
test("Prepared capacity rejects an extra reservation, throws use FIFO recipe snapshots and a flask cannot hit before its locked landing time", () => {
  const f = fixture();
  f.brew();
  assert(f.kit.select(f.p, "mending", f.c));
  f.brew();
  const before = f.kit.status("p", f.c.tick);
  assert.deepEqual(before.alchemyPrepared, ["flare", "mending"]);
  assert(!f.kit.cast(f.p, "q", f.c));
  assert.deepEqual(f.kit.status("p", f.c.tick), before);
  assert(f.kit.cast(f.p, "e", f.c));
  const cue = f.kit.cues(f.c).find((c) => c.kind === "alchemy-flask")!;
  assert.equal(cue.recipe, "flare");
  assert.equal(cue.x2, 600);
  f.p.aim = Math.PI;
  f.p.x = 200;
  f.step(14);
  assert.equal(f.effects.length, 0);
  f.step();
  assert.equal(f.effects[0].recipe, "flare");
  assert.equal(f.effects[0].x, 600);
  assert.equal(f.effects[0].damage, 55);
  assert.equal(f.effects[0].healing, 0);
  assert.deepEqual(f.kit.status("p", f.c.tick).alchemyPrepared, ["mending"]);
  f.toss();
  assert(
    f.effects.some(
      (e) => e.recipe === "mending" && e.healing === 18 && e.damage === 0,
    ),
  );
});
test("A selected close target can be reached, distant targets clamp to range and intentional self-placement makes Mending useful without moving its landing later", () => {
  const f = fixture();
  f.c.aimPoint = () => ({ x: 300, y: 395 });
  f.brew();
  assert(f.kit.cast(f.p, "e", f.c));
  let cue = f.kit.cues(f.c).find((c) => c.kind === "alchemy-flask")!;
  assert.equal(cue.x2, 300);
  assert.equal(cue.y2, 395);
  f.c.aimPoint = () => ({ x: 1400, y: 300 });
  f.step(15);
  assert.equal(f.effects[0].y, 395);
  f.brew();
  assert(f.kit.cast(f.p, "e", f.c));
  cue = f.kit.cues(f.c).find((c) => c.kind === "alchemy-flask")!;
  assert.equal(cue.x2, 600);
  assert.equal(cue.y2, 300);
  const m = fixture();
  assert(m.kit.select(m.p, "mending", m.c));
  m.c.aimPoint = () => ({ x: m.p.x, y: m.p.y });
  m.brew();
  assert(m.kit.cast(m.p, "e", m.c));
  m.p.x = 320;
  m.step(15);
  assert.equal(m.effects[0].x, 300);
  assert.equal(m.effects[0].y, 300);
  assert.equal(m.effects[0].healing, 18);
});
test("Flask placement shortens before real cover, rejects blocked ground without consuming a vial and fizzles if the landing becomes obstructed", () => {
  const f = fixture();
  f.brew();
  f.c.obstacles = [{ x: 450, y: 200, width: 20, height: 200 }];
  assert(f.kit.cast(f.p, "e", f.c));
  const landing = f.kit.cues(f.c).find((c) => c.kind === "alchemy-flask")!;
  assert(landing.x2 < 442 && landing.x2 > 348);
  f.c.obstacles = [
    { x: landing.x2 - 10, y: landing.y2 - 10, width: 20, height: 20 },
  ];
  f.step(15);
  assert.equal(f.effects.length, 0);
  assert.equal(f.kit.status("p", f.c.tick).alchemyPrepared.length, 0);
  f.c.obstacles = [];
  f.brew();
  f.c.obstacles = [{ x: 310, y: 250, width: 320, height: 100 }];
  const before = f.kit.status("p", f.c.tick);
  assert(!f.kit.cast(f.p, "e", f.c));
  assert.deepEqual(f.kit.status("p", f.c.tick), before);
});
test("Only real positive primary effects recover a bounded ingredient at a bounded rate; passive combat recovery is finite and inactive owners lose stock", () => {
  const f = fixture();
  assert(!f.kit.primaryHit(f.p, 0, f.c));
  assert(!f.kit.primaryHit(f.p, NaN, f.c));
  assert(f.kit.primaryHit(f.p, 10, f.c));
  assert(!f.kit.primaryHit(f.p, 10, f.c));
  f.step(29);
  assert(!f.kit.primaryHit(f.p, 10, f.c));
  f.step();
  assert(f.kit.primaryHit(f.p, 10, f.c));
  for (let i = 0; i < 20; i++) {
    f.step(30);
    f.kit.primaryHit(f.p, 10, f.c);
  }
  let state = f.kit.status("p", f.c.tick);
  assert.deepEqual(
    [state.alchemyCinder, state.alchemyChalk, state.alchemySap],
    [6, 6, 6],
  );
  assert(!f.kit.primaryHit(f.p, 10, f.c));
  f.p.connected = false;
  f.kit.step(f.c);
  state = f.kit.status("p", f.c.tick);
  assert.equal(state.alchemyCinder, 3);
  assert.equal(f.kit.cues(f.c).length, 0);
});
test("An owned binding pool reacts with one later Flare, while another owner's pool cannot be consumed and Mending trades away remaining owned fire", () => {
  const f = fixture();
  assert(f.kit.select(f.p, "binding", f.c));
  f.brew();
  f.toss();
  assert(
    f.kit
      .cues(f.c)
      .some((c) => c.kind === "alchemy-pool" && c.recipe === "binding"),
  );
  assert(f.kit.select(f.p, "flare", f.c));
  f.brew();
  f.toss();
  const flare = f.effects.find((e) => e.recipe === "flare" && e.damage > 0)!;
  assert.equal(flare.damage, 85);
  assert(
    !f.kit
      .cues(f.c)
      .some((c) => c.kind === "alchemy-pool" && c.recipe === "binding"),
  );
  assert(f.kit.cues(f.c).some((c) => c.kind === "alchemy-combination"));
  assert(f.kit.select(f.p, "mending", f.c));
  f.brew();
  f.toss();
  assert(
    !f.kit
      .cues(f.c)
      .some((c) => c.kind === "alchemy-pool" && c.recipe === "flare"),
  );
  const other = fixture(),
    ally = { ...other.p, id: "ally" };
  other.c.owners = [other.p, ally];
  assert(other.kit.select(ally, "binding", other.c));
  assert(other.kit.cast(ally, "q", other.c));
  other.step(12);
  assert(other.kit.cast(ally, "e", other.c));
  other.step(15);
  other.brew();
  other.toss();
  assert(
    other.kit
      .cues(other.c)
      .some((c) => c.kind === "alchemy-pool" && c.owner === "ally"),
  );
  assert.equal(
    other.effects.find((e) => e.owner === "p" && e.recipe === "flare")!.damage,
    55,
  );
});
test("Standard Batch adds only bounded stock and empowered throw charges; casting alone does not deal damage and a missed throw still spends its charge", () => {
  const f = fixture(),
    o = baseAlchemyOptions();
  o.ultimateCharges = 1e6;
  o.ultimateDurationBonus = 1e6;
  o.ultimatePotency = 1e6;
  assert(f.kit.cast(f.p, "ultimate", f.c, o));
  let s = f.kit.status("p", 0);
  assert.equal(s.alchemyBatchCharges, 5);
  assert.equal(s.alchemyBatchUntil, 660);
  assert.equal(s.alchemyCinder, 4);
  assert.equal(f.effects.length, 0);
  f.brew();
  f.c.area = (e) => {
    f.effects.push(e);
    return { damage: 0, healing: 0 };
  };
  assert(f.kit.cast(f.p, "e", f.c));
  assert.equal(f.kit.status("p", f.c.tick).alchemyBatchCharges, 4);
  f.step(15);
  assert(f.effects[0].damage > 55);
  assert.equal(f.kit.status("p", f.c.tick).alchemyBatchCharges, 4);
  f.step(660);
  s = f.kit.status("p", f.c.tick);
  assert.equal(s.alchemyBatchCharges, 0);
  assert.equal(s.alchemyBatchUntil, 0);
});
test("Split Pour creates two finite smaller landing effects, a useful split can refund only one ingredient and Settled Batch uses a slower real brew", () => {
  const f = fixture(),
    o = baseAlchemyOptions();
  o.talents.splitPour = o.talents.secondExtraction = true;
  f.brew();
  const before = f.kit.status("p", f.c.tick).alchemyCinder;
  assert(f.kit.cast(f.p, "e", f.c, o));
  const flights = f.kit.cues(f.c).filter((c) => c.kind === "alchemy-flask");
  assert.equal(flights.length, 2);
  assert.equal(Math.abs(flights[0].y2 - flights[1].y2), 48);
  f.step(15);
  assert.equal(f.effects.length, 2);
  assert(f.effects.every((e) => Math.abs(e.damage - 30.25) < 1e-9));
  assert.equal(f.kit.status("p", f.c.tick).alchemyCinder, before + 1);
  const slow = fixture(),
    settled = baseAlchemyOptions();
  settled.talents.settledBatch = true;
  assert(slow.kit.cast(slow.p, "q", slow.c, settled));
  slow.step(12);
  assert.equal(slow.kit.status("p", slow.c.tick).alchemyPrepared.length, 0);
  slow.step(12);
  assert.equal(slow.kit.status("p", slow.c.tick, settled).alchemyCapacity, 3);
  assert(slow.kit.cast(slow.p, "e", slow.c));
  slow.step(15);
  assert.equal(slow.effects[0].damage, 68.75);
});
test("New split pools retire only the owner's oldest ground at the four-field cap and never extend its older lifetime", () => {
  const f = fixture(),
    o = baseAlchemyOptions();
  o.talents.splitPour = true;
  assert(f.kit.cast(f.p, "ultimate", f.c));
  let oldest: number[] = [];
  for (let i = 0; i < 3; i++) {
    f.brew();
    assert(f.kit.cast(f.p, "e", f.c, o));
    f.step(15);
    const pools = f.kit.cues(f.c).filter((c) => c.kind === "alchemy-pool");
    assert.equal(pools.length, Math.min(4, (i + 1) * 2));
    if (!i) oldest = pools.map((c) => c.id);
  }
  const pools = f.kit.cues(f.c).filter((c) => c.kind === "alchemy-pool");
  assert(pools.every((c) => !oldest.includes(c.id)));
  assert(pools.every((c) => c.until - c.at === 240));
});
test("An empty initial landing never earns an extraction refund from its later repeated pool pulses", () => {
  const f = fixture(),
    o = baseAlchemyOptions();
  o.talents.secondExtraction = true;
  f.brew();
  const before = f.kit.status("p", f.c.tick).alchemyCinder;
  let count = 0;
  f.c.area = (e) => {
    f.effects.push(e);
    return { damage: count++ ? e.damage : 0, healing: 0 };
  };
  assert(f.kit.cast(f.p, "e", f.c, o));
  f.step(60);
  assert(f.effects.length > 1);
  assert.equal(f.kit.status("p", f.c.tick).alchemyCinder, before);
});
test("Pool damage has a finite pulse count and encounter exit clears ingredients, vials, flights and ground", () => {
  const f = fixture();
  f.brew();
  f.toss();
  const impact = f.effects.length;
  f.step(240);
  assert.equal(f.effects.length - impact, 5);
  assert.equal(
    f.kit.cues(f.c).filter((c) => c.kind === "alchemy-pool").length,
    0,
  );
  f.brew();
  assert(f.kit.cast(f.p, "e", f.c));
  f.c.combat = false;
  f.kit.step(f.c);
  assert.equal(f.kit.cues(f.c).length, 0);
  assert.equal(f.kit.status("p", f.c.tick).alchemyPrepared.length, 0);
  assert.equal(f.kit.status("p", f.c.tick).alchemyCinder, 3);
});
