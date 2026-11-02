import test from "node:test";
import assert from "node:assert/strict";
import { Game, data, type Player } from "../src/shared/game.ts";
import { idleInput, type InputFrame } from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
function fixture() {
  const g = new Game({ mode: "endless", maxPlayers: 2, seed: 41 }),
    p = g.addPlayer("p", "Nela", "ranger");
  g.addPlayer("ally", "Mara", "soldier");
  g.start();
  Object.defineProperty(g, "obstacles", { value: [], configurable: true });
  Object.defineProperty(g, "arena", {
    value: { ...g.arena, obstacles: [] },
    configurable: true,
  });
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.x = 1200;
  g.boss.y = 700;
  for (const a of g.players.values()) {
    a.x = a.oldX = 800;
    a.y = a.oldY = 700;
    a.invulnerableUntil = 1e9;
  }
  Reflect.get(g, "rng").next = () => 0.99;
  return { g, p };
}
function press(g: Game, p: Player, patch: Partial<InputFrame>) {
  g.submitInput(p.id, {
    ...idleInput(),
    sequence: p.ack + 1,
    aim: 0,
    ...patch,
  });
  g.step();
}
function step(g: Game, n: number) {
  for (let i = 0; i < n; i++) g.step();
}
function talent(g: Game, p: Player, lane: number) {
  const phase = g.phase;
  g.phase = "shop";
  p.totalSp = 27;
  for (const n of data.skills
    .filter(
      (n) =>
        n.classId === "ranger" &&
        n.branchId === "fieldcraft" &&
        n.lane === lane &&
        n.depth <= 3,
    )
    .sort((a, b) => a.depth - b.depth))
    assert(g.transact(p.id, { id: n.id, kind: "skill", item: n.id }).ok);
  g.phase = phase;
}
test("A real bow draw spends a ready arrow once, locks its aim, releases from the moved owner and credits the actual collision", () => {
  const { g, p } = fixture(),
    ammo = p.ammo,
    hp = g.boss.health;
  press(g, p, { fire: true });
  assert.equal(p.ammo, ammo - 1);
  assert.equal(g.shots.size, 0);
  assert.equal(
    g.ranger.status(p.id, g.combatTick).rangerDrawUntil,
    g.combatTick + 6,
  );
  press(g, p, { moveY: 1, aim: Math.PI / 2 });
  assert.equal(p.ammo, ammo - 1);
  const y = p.y;
  step(g, 5);
  const arrow = [...g.shots.values()].find((s) => s.owner === p.id)!;
  assert(arrow);
  assert.equal(arrow.vy, 0);
  assert(arrow.vx > 0);
  assert(arrow.y >= y);
  press(g, p, {});
  step(g, 25);
  assert(g.boss.health < hp);
  assert.equal(p.damageDealt, hp - g.boss.health);
});
test("Purchased bow rate keeps fractional shot spacing while every committed draw still reserves exactly one arrow", () => {
  const { g, p } = fixture();
  g.phase = "shop";
  p.totalSp = 27;
  p.coins = p.incomeGranted = 3000;
  for (const lane of [0, 1])
    for (const n of data.skills
      .filter(
        (n) =>
          n.classId === "ranger" &&
          n.branchId === "bowcraft" &&
          n.lane === lane &&
          n.depth <= (lane === 0 ? 6 : 3),
      )
      .sort((a, b) => a.depth - b.depth))
      assert(g.transact(p.id, { id: n.id, kind: "skill", item: n.id }).ok);
  assert(g.transact(p.id, { id: "bow", kind: "weapon", item: "ranger-3" }).ok);
  for (let i = 0; i < 5; i++)
    assert(
      g.transact(p.id, { id: "rate-" + i, kind: "upgrade", item: "fire-rate" })
        .ok,
    );
  g.phase = "combat";
  const commits: number[] = [];
  let previous = p.ammo;
  for (let i = 0; i < 110 && commits.length < 10; i++) {
    press(g, p, { fire: true });
    if (p.ammo < previous) {
      assert.equal(previous - p.ammo, 1);
      commits.push(g.combatTick);
    }
    previous = p.ammo;
  }
  assert.equal(commits.length, 10);
  const interval = 30 / (2 * g.stats(p).fireRate);
  assert(
    Math.abs(commits[9] - commits[0] - 9 * interval) <= 1,
    "Fractional spacing must survive the finite draw; do not round every interval up",
  );
});
test("Dodge cancels a committed primary or Drawn Line without refunding arrows or spending other blocked cooldowns", () => {
  for (const q of [false, true]) {
    const { g, p } = fixture(),
      ammo = p.ammo;
    press(g, p, q ? { q: true } : { fire: true });
    const cooldown = p.qAt;
    press(g, p, { dodge: true, e: true, ultimate: true });
    assert.equal(g.shots.size, 0);
    assert.equal(p.ammo, ammo - 1);
    assert.equal(p.qAt, cooldown);
    assert.equal(p.eAt, 0);
    assert.equal(p.ultimateAt, 0);
    step(g, 14);
    assert.equal(
      [...g.shots.values()].filter((s) => s.owner === p.id).length,
      0,
    );
  }
});
test("Drawn Line has finite covered travel and Crosswind reserves three arrows before any release", () => {
  const { g, p } = fixture();
  talent(g, p, 0);
  p.ammo = 2;
  press(g, p, { q: true });
  assert.equal(p.qAt, 0);
  assert.equal(p.ammo, 2);
  p.ammo = 10;
  press(g, p, { q: true });
  assert.equal(p.ammo, 7);
  assert(p.qAt > g.combatTick);
  assert.equal(g.shots.size, 0);
  step(g, 12);
  const arrows = [...g.shots.values()].filter((s) => s.owner === p.id);
  assert.equal(arrows.length, 3);
  assert(arrows.some((s) => s.vy < 0) && arrows.some((s) => s.vy > 0));
  const covered = fixture();
  const walls = [{ x: 850, y: 600, width: 20, height: 200 }];
  Object.defineProperty(covered.g, "obstacles", { value: walls });
  Object.defineProperty(covered.g, "arena", {
    value: { ...covered.g.arena, obstacles: walls },
  });
  press(covered.g, covered.p, { q: true });
  step(covered.g, 45);
  assert.equal(covered.g.boss.health, covered.g.boss.maxHealth);
  assert.equal(
    [...covered.g.shots.values()].filter((s) => s.owner === covered.p.id)
      .length,
    0,
  );
  const distant = fixture();
  distant.p.x = distant.p.oldX = 100;
  distant.g.boss.x = 1250;
  press(distant.g, distant.p, { q: true });
  step(distant.g, 70);
  assert.equal(distant.g.boss.health, distant.g.boss.maxHealth);
  assert.equal(distant.g.shots.size, 0);
});
test("A Tripline arms before an actual swept ordinary hit, credits damage, applies ordinary-only slow and spends its one contact", () => {
  const { g, p } = fixture();
  press(g, p, { e: true });
  const actor = g.minions.spawn(
    999999,
    {
      kind: "ordinary",
      x: 880,
      y: 600,
      health: 150,
      speed: 0,
      radius: 10,
      damage: 0,
    },
    g.combatTick,
  )!;
  actor.oldY = 650;
  actor.y = 750;
  g.ranger.step(Reflect.get(g, "rangerContext").call(g));
  assert.equal(actor.health, 150);
  actor.oldY = actor.y = 600;
  step(g, 24);
  actor.oldY = 650;
  actor.y = 750;
  const before = p.damageDealt;
  g.ranger.step(Reflect.get(g, "rangerContext").call(g));
  assert.equal(actor.health, 105);
  assert.equal(p.damageDealt - before, 45);
  assert.equal(actor.slowMultiplier, 0.6);
  assert.equal(actor.slowUntil, g.combatTick + 90);
  assert.equal(g.ranger.status(p.id, g.combatTick).rangerTraps, 0);
  const health = actor.health;
  g.ranger.step(Reflect.get(g, "rangerContext").call(g));
  assert.equal(actor.health, health);
});
test("Full and covered cable placements keep their cooldown, while Linked Stakes spends one finite quota across distinct real targets", () => {
  const { g, p } = fixture();
  talent(g, p, 1);
  press(g, p, { e: true });
  const damage = 45 * g.stats(p).ability;
  step(g, 24);
  const actors = [1, 2, 3, 4].map((i) =>
    g.minions.spawn(
      999990 + i,
      {
        kind: "ordinary",
        x: 875 + i,
        y: 750,
        health: 1000,
        speed: 0,
        radius: 10,
        damage: 0,
      },
      g.combatTick,
    )!,
  );
  for (const a of actors) a.oldY = 650;
  g.ranger.step(Reflect.get(g, "rangerContext").call(g));
  assert.equal(actors.filter((a) => a.health < 1000).length, 3);
  assert.equal(p.damageDealt, damage * 3);
  assert.equal(g.ranger.status(p.id, g.combatTick).rangerTraps, 0);
  for (let i = 0; i < 2; i++) {
    p.eAt = 0;
    press(g, p, { e: true });
  }
  p.eAt = 0;
  press(g, p, { e: true });
  assert.equal(p.eAt, 0);
  const blocked = fixture();
  Object.defineProperty(blocked.g, "obstacles", {
    value: [{ x: 815, y: 600, width: 150, height: 200 }],
  });
  press(blocked.g, blocked.p, { e: true });
  assert.equal(blocked.p.eAt, 0);
});
test("Survey positions empower only an arrow committed inside their fixed radius, consume once on cancellation and leave hostile projectiles intact", () => {
  const { g, p } = fixture();
  const hostile = Reflect.get(g, "emitShot").call(
    g,
    "hostile",
    1300,
    500,
    0,
    100,
    10,
    3,
  );
  press(g, p, { ultimate: true });
  assert(g.shots.has(hostile.id));
  let cues = viewOf(g, p.id).classCues.filter(
    (c) => c.kind === "ranger-survey",
  );
  assert.equal(cues.length, 2);
  assert.equal(g.ranger.status(p.id, g.combatTick).rangerSurveyCharges, 6);
  press(g, p, { fire: true });
  step(g, 6);
  const plain = [...g.shots.values()].find((s) => s.owner === p.id)!;
  assert.equal(plain.damage, 24);
  press(g, p, {});
  const point = cues[0];
  p.x = p.oldX = point.x;
  p.y = p.oldY = point.y;
  p.fireAt = 0;
  press(g, p, { fire: true });
  assert.equal(g.ranger.status(p.id, g.combatTick).rangerSurveyCharges, 5);
  press(g, p, { dodge: true });
  assert.equal(g.ranger.status(p.id, g.combatTick).rangerSurveyCharges, 5);
  step(g, 8);
  p.fireAt = 0;
  p.x = point.x;
  p.y = point.y;
  press(g, p, { fire: true });
  step(g, 6);
  assert(
    [...g.shots.values()].some(
      (s) => s.owner === p.id && Math.abs(s.damage - 38.4) < 1e-9,
    ),
  );
  assert.equal(g.ranger.status(p.id, g.combatTick).rangerSurveyCharges, 4);
});
test("A legal 27-SP field build can maintain four real cables and Long Survey changes the actual fixed mark", () => {
  const { g, p } = fixture();
  g.phase = "shop";
  p.totalSp = 27;
  for (const lane of [0, 2])
    for (const n of data.skills
      .filter(
        (n) =>
          n.classId === "ranger" &&
          n.branchId === "fieldcraft" &&
          n.lane === lane &&
          n.depth <= (lane === 0 ? 3 : 6),
      )
      .sort((a, b) => a.depth - b.depth))
      assert(g.transact(p.id, { id: n.id, kind: "skill", item: n.id }).ok);
  assert.equal(g.kitStatus(p.id).rangerTrapCapacity, 4);
  g.phase = "combat";
  for (let i = 0; i < 4; i++) {
    while (g.combatTick < p.eAt) g.step();
    press(g, p, { e: true });
    assert.equal(g.kitStatus(p.id).rangerTraps, i + 1);
  }
  p.eAt = 0;
  press(g, p, { e: true });
  assert.equal(p.eAt, 0);
  const invulnerability = p.invulnerableUntil;
  press(g, p, { ultimate: true });
  const marks = viewOf(g, p.id).classCues.filter(
    (c) => c.kind === "ranger-survey",
  );
  assert.equal(marks.length, 1);
  assert.equal(marks[0].until - g.combatTick, 420);
  assert.equal(g.kitStatus(p.id).rangerSurveyCharges, 3);
  assert.equal(p.invulnerableUntil, invulnerability);
});
test("Disconnect and a real down remove owned arrows, drawings and prepared ground without affecting another player's entities", () => {
  const { g, p } = fixture();
  press(g, p, { e: true, ultimate: true, fire: true });
  step(g, 6);
  assert(g.ranger.cues(Reflect.get(g, "rangerContext").call(g)).length > 0);
  assert([...g.shots.values()].some((s) => s.owner === p.id));
  g.setConnected(p.id, false);
  assert.equal(
    g.ranger.cues(Reflect.get(g, "rangerContext").call(g)).length,
    0,
  );
  assert(![...g.shots.values()].some((s) => s.owner === p.id));
  const down = fixture();
  press(down.g, down.p, { e: true, ultimate: true, fire: true });
  down.p.invulnerableUntil = 0;
  down.p.shield = 0;
  Reflect.get(down.g, "damage").call(down.g, down.p, 10000);
  assert.equal(down.p.status, "downed");
  assert.equal(
    down.g.ranger.status(down.p.id, down.g.combatTick).rangerTraps,
    0,
  );
});
