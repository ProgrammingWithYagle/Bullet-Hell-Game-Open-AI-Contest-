import test from "node:test";
import assert from "node:assert/strict";
import { Game, data, type Player } from "../src/shared/game.ts";
import {
  ClassKits,
  constructHit,
  type Construct,
  type KitContext,
} from "../src/shared/class-kits.ts";
import {
  builderIds as ids,
  builderPoseLegal,
} from "../src/shared/engineer-builder.ts";
import { engineerRules as r } from "../src/shared/engineer-pathways.ts";
import { idleInput, HZ, type Shot } from "../src/shared/protocol.ts";
import { conflictingSkill } from "../src/shared/skill-conflicts.ts";
import { engineerActions } from "../src/client/engineer-actions.ts";
import { viewOf } from "../src/shared/view.ts";
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
const foundation = "engineer-constructs-1";
const full = [
  ids.longspan,
  ids.hinge,
  ids.repair,
  ids.linked,
  ids.survey,
  ids.redoubt,
];
function fixture(skills: string[] = []) {
  const g = new Game({ mode: "endless", seed: 41, maxPlayers: 8 });
  g.encounter = 9;
  const p = g.addPlayer("p", "Tamsin", "engineer");
  for (const item of [foundation, ids.entry, ...skills])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
  g.start();
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.x = 1250;
  g.boss.y = 200;
  p.x = p.oldX = 680;
  p.y = p.oldY = 600;
  p.aim = 0;
  p.invulnerableUntil = 1e9;
  g.obstacles.splice(0);
  return { g, p };
}
function isolated(skills: string[] = []) {
  const { g, p } = fixture(skills),
    c = { ...(g as unknown as { kitContext(): KitContext }).kitContext() },
    kits = new ClassKits();
  c.terrain = { bounds: { x: 0, y: 0, width: 1800, height: 1200 }, lava: [] };
  c.obstacles = [];
  c.targets = [];
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      c.tick++;
      kits.step(c);
    }
  };
  const place = (x = 800, y = 600, aim = 0) => {
    p.x = p.oldX = x - Math.cos(aim) * r.builderReach;
    p.y = p.oldY = y - Math.sin(aim) * r.builderReach;
    p.aim = aim;
    assert(kits.canCast(p, "q", c));
    kits.cast(p, "q", c);
  };
  const walls = () =>
    kits.cues().filter((c): c is Construct => c.kind === "wall");
  return { g, p, c, kits, step, place, walls };
}
function press(
  g: Game,
  p: Player,
  action: Partial<ReturnType<typeof idleInput>>,
) {
  assert(
    g.submitInput(p.id, {
      ...idleInput(),
      sequence: p.ack + 1,
      aim: p.aim,
      ...action,
    }),
  );
  g.step();
}
let serial = 900000;
function hostile(g: Game, definition: Partial<Shot> = {}) {
  const s: Shot = {
    id: serial++,
    owner: "hostile",
    x: 1000,
    y: 600,
    vx: -9000,
    vy: 0,
    radius: 3,
    damage: 40,
    expires: g.combatTick + 10 * HZ,
    pierce: 0,
    ...definition,
  };
  g.shots.set(s.id, s);
  return s;
}

test("Builder acquires a useful early identity and six further choices in a legal 22-SP route with five General SP left", () => {
  const { g, p } = fixture(full),
    cost = p.skills.reduce(
      (n, id) =>
        n +
        (data.skills.find((s) => s.id === id)?.cost ??
          data.specializationSkills.find((s) => s.id === id)!.cost),
      0,
    );
  assert.equal(cost, 22);
  assert.equal(p.totalSp, 27);
  assert.equal(viewOf(g, p.id).players[0].sp, 5);
  g.phase = "shop";
  for (const item of ["general-sprint", "general-brake-step"])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
  assert.equal(viewOf(g, p.id).players[0].sp, 0);
  assert.equal(
    p.skills.filter(
      (id) => data.specializationSkills.find((s) => s.id === id)?.capstone,
    ).length,
    1,
  );
  const second = data.skills.find(
    (s) => s.classId === "engineer" && s.capstone,
  )!;
  assert(
    !g.transact(p.id, { id: "second-capstone", kind: "skill", item: second.id })
      .ok,
  );
  assert.deepEqual(
    data.specializationSkills
      .filter((s) => s.subbranchId === ids.entry)
      .map((s) => s.id),
    Object.values(ids),
  );
  for (const a of ["engineer-machinery-1", "engineer-traps-1"]) {
    assert.equal(conflictingSkill([a], ids.entry), a);
    assert.equal(conflictingSkill([ids.entry], a), ids.entry);
  }
  assert.equal(conflictingSkill([ids.wings], ids.longspan), ids.wings);
  assert.equal(conflictingSkill([ids.longspan], ids.wings), ids.longspan);
});

test("Every Builder upgrade enforces its actual run-earned threshold as well as prerequisites", () => {
  const requirements: Record<string, string[]> = {
    [ids.longspan]: [],
    [ids.wings]: [],
    [ids.hinge]: [],
    [ids.repair]: [],
    [ids.linked]: [ids.repair],
    [ids.survey]: [ids.hinge],
    [ids.redoubt]: [ids.repair, ids.linked],
  };
  for (const [id, prior] of Object.entries(requirements)) {
    const { g, p } = fixture(prior);
    g.phase = "shop";
    const gate = data.specializationSkills.find(
      (s) => s.id === id,
    )!.freePlaySpRequired!;
    p.totalSp = gate - 1;
    assert(!g.transact(p.id, { id: "early", kind: "skill", item: id }).ok, id);
    p.totalSp = gate;
    assert(
      g.transact(p.id, { id: "eligible", kind: "skill", item: id }).ok,
      id,
    );
  }
});

test("A new screen is a visible half-second assembly before it becomes finite physical cover", () => {
  const f = isolated();
  f.place();
  const wall = f.walls()[0];
  assert.equal(wall.health, 100 * f.g.stats(f.p).ability);
  assert.equal(wall.halfSpan, 110);
  assert.equal(f.kits.constructs().length, 0);
  assert.equal(wall.buildingUntil, ticks(0.5));
  assert.equal(wall.until, ticks(30));
  f.step(ticks(0.5) - 1);
  assert.equal(f.kits.constructs().length, 0);
  f.step();
  assert.equal(f.kits.constructs().length, 1);
  f.kits.hitConstruct(wall.id, 40);
  assert.equal(f.walls()[0].health, wall.maxHealth - 40);
  f.kits.hitConstruct(wall.id, 1e6);
  assert.equal(f.kits.constructs().length, 0);
  f.step();
  assert.equal(f.kits.status(f.p.id, f.c.tick).builderGroups, 0);
});

test("Longspan and Return Wings change cover geometry with one unchanged health budget", () => {
  for (const skill of [ids.longspan, ids.wings]) {
    const f = isolated([skill]);
    f.place();
    f.step(ticks(0.5));
    const walls = f.kits.constructs();
    assert.equal(walls.length, skill === ids.wings ? 2 : 1);
    assert.equal(
      walls.reduce((n, w) => n + w.maxHealth, 0),
      100 * f.g.stats(f.p).ability,
    );
    if (skill === ids.longspan) {
      assert.equal(walls[0].halfSpan, 190);
      assert.notEqual(
        constructHit({ x: 1000, y: 780 }, { x: 600, y: 780 }, walls[0], 3),
        null,
      );
    } else {
      assert.equal(
        constructHit({ x: 1000, y: 600 }, { x: 600, y: 600 }, walls[0], 3),
        null,
      );
      assert.equal(
        constructHit({ x: 1000, y: 600 }, { x: 600, y: 600 }, walls[1], 3),
        null,
      );
      assert(walls.every((w) => w.halfSpan === 75));
    }
  }
});

test("The complete rotated footprint rejects bounds, small off-centre cover and lava without spending real Q cooldown", () => {
  const empty = {
    obstacles: [],
    terrain: {
      bounds: { x: 0, y: 0, width: 1800, height: 1200 },
      lava: [] as { x: number; y: number; radius: number }[],
    },
  };
  assert(
    builderPoseLegal(
      { x: 800, y: 600, aim: Math.PI / 4, halfSpan: 190 },
      empty,
    ),
  );
  assert(
    !builderPoseLegal(
      { x: 80, y: 600, aim: Math.PI / 4, halfSpan: 190 },
      empty,
    ),
  );
  assert(
    !builderPoseLegal(
      { x: 800, y: 600, aim: 0, halfSpan: 190 },
      { ...empty, obstacles: [{ x: 795, y: 770, width: 10, height: 10 }] },
    ),
  );
  assert(
    !builderPoseLegal(
      { x: 800, y: 600, aim: 0, halfSpan: 190 },
      {
        ...empty,
        terrain: { ...empty.terrain, lava: [{ x: 810, y: 780, radius: 2 }] },
      },
    ),
  );
  assert(!builderPoseLegal({ x: NaN, y: 600, aim: 0, halfSpan: 190 }, empty));
  const { g, p } = fixture([ids.longspan]);
  g.obstacles.push({ x: 795, y: 770, width: 10, height: 10 });
  press(g, p, { q: true });
  assert.equal(p.qAt, 0);
  assert(!g.classCues().some((c) => c.kind === "wall"));
});

test("Full Q group capacity rejects a cast without replacing a healthy wall or spending cooldown; E remains independent", () => {
  const { g, p } = fixture();
  press(g, p, { q: true });
  const first = g.classCues().find((c) => c.kind === "wall")!;
  p.qAt = 0;
  press(g, p, { q: true });
  assert.equal(p.qAt, 0);
  assert.equal(g.classCues().filter((c) => c.kind === "wall").length, 1);
  assert.equal(g.classCues().find((c) => c.kind === "wall")!.id, first.id);
  press(g, p, { e: true });
  assert.equal(g.classCues().filter((c) => c.kind === "wall").length, 2);
});

test("Assembly does not intercept actual bullets; an assembled Longspan intercepts far-end shots through the eight-construct broadphase", () => {
  const { g, p } = fixture([ids.longspan]);
  press(g, p, { q: true });
  const wall = g.classCues().find((c) => c.kind === "wall")! as Construct;
  const early = hostile(g, { x: 900, y: 780 });
  g.step();
  assert(g.shots.has(early.id));
  assert.equal(
    (g.classCues().find((c) => c.id === wall.id) as Construct).health,
    wall.health,
  );
  g.shots.clear();
  for (let i = 0; i < ticks(0.5); i++) g.step();
  for (let i = 0; i < 7; i++) {
    const ally = g.addPlayer("ally-" + i, "Builder ally", "engineer");
    ally.status = "active";
    ally.x = 300;
    ally.y = 250 + i * 50;
    ally.aim = 0;
    const c = (g as unknown as { kitContext(): KitContext }).kitContext();
    g.classKits.cast(ally, "e", c);
  }
  assert(g.classKits.constructs().length >= 8);
  const shot = hostile(g, { x: 900, y: 780 });
  g.step();
  assert(!g.shots.has(shot.id));
  assert.equal(
    (g.classCues().find((c) => c.id === wall.id) as Construct).health,
    wall.health - 40,
  );
});

test("Owned screens allow friendly movement and maintain the player health and shield rules", () => {
  const { g, p } = fixture();
  press(g, p, { q: true });
  for (let i = 0; i < ticks(0.5); i++) g.step();
  const original = p.health,
    shield = p.shield;
  for (let i = 0; i < 45; i++) press(g, p, { moveX: 1 });
  assert(p.x > 812);
  assert.equal(p.health, original);
  assert.equal(p.shield, shield);
});

test("Hinged Assembly folds without protection, commits its heading and preserves health and expiry", () => {
  const f = isolated([ids.hinge]);
  f.place();
  f.step(ticks(0.5));
  const initial = f.walls()[0];
  f.kits.hitConstruct(initial.id, 35);
  f.p.aim = Math.PI / 2;
  assert(f.kits.castEngineer(f.p, "technique1", f.c));
  assert(!f.kits.castEngineer(f.p, "technique1", f.c));
  assert.equal(f.kits.constructs().length, 0);
  assert(f.kits.cues().some((c) => c.kind === "engineer-builder-plan"));
  f.p.aim = -Math.PI / 2;
  f.step(ticks(0.5));
  const moved = f.walls()[0];
  assert.equal(moved.aim, Math.PI / 2);
  assert.equal(moved.health, initial.maxHealth - 35);
  assert.equal(moved.until, initial.until);
  assert.equal(moved.x, 800);
  assert.equal(moved.y, 600);
  assert.equal(f.kits.constructs().length, 1);
});

test("A pivot checks the whole rotation sweep and refuses to rotate a wall through a small obstacle", () => {
  const f = isolated([ids.hinge, ids.longspan]);
  f.place();
  f.step(ticks(0.5));
  f.p.aim = Math.PI / 2;
  f.c.obstacles.push({ x: 660, y: 720, width: 10, height: 10 });
  assert(!f.kits.castEngineer(f.p, "technique1", f.c));
  assert.equal(f.kits.status(f.p.id, f.c.tick).technique1At, 0);
  assert.equal(f.walls()[0].aim, 0);
});

test("Survey Frame shifts by at most 120 pixels toward its fixed work point and preserves a surviving wing identity", () => {
  const f = isolated([ids.wings, ids.hinge, ids.survey]);
  f.place();
  f.step(ticks(0.5));
  const before = f.walls();
  f.kits.hitConstruct(before[0].id, 1e6);
  f.step();
  const survivor = f.walls()[0];
  const old = {
    x: survivor.x,
    y: survivor.y,
    aim: survivor.aim,
    until: survivor.until,
    health: survivor.health,
  };
  f.p.x += 120;
  assert(f.kits.castEngineer(f.p, "technique1", f.c));
  f.p.x -= 400;
  f.p.aim = Math.PI;
  f.step(ticks(0.8));
  const moved = f.walls()[0];
  assert.equal(moved.id, survivor.id);
  assert.equal(moved.x, old.x + 120);
  assert.equal(moved.y, old.y);
  assert.equal(moved.aim, old.aim);
  assert.equal(moved.health, old.health);
  assert.equal(moved.until, old.until);
});

test("A newly blocked relocation stops on its last legal frame without granting health or lifetime", () => {
  const f = isolated([ids.hinge, ids.survey]);
  f.place();
  f.step(ticks(0.5));
  const initial = f.walls()[0];
  f.p.x += 120;
  assert(f.kits.castEngineer(f.p, "technique1", f.c));
  f.step(3);
  const before = { x: f.walls()[0].x, y: f.walls()[0].y };
  f.c.obstacles.push({ x: before.x + 14, y: 590, width: 4, height: 20 });
  f.step(12);
  const remaining = f.walls()[0];
  assert(remaining && remaining.x < before.x + 14);
  assert.equal(remaining.until, initial.until);
  assert.equal(remaining.health, initial.health);
  assert(!f.kits.cues().some((c) => c.kind === "engineer-builder-plan"));
});

test("Field Maintenance completes one stationary finite repair with a real cooldown and no player healing, lifetime or currency gain", () => {
  const f = isolated([ids.repair]);
  f.place();
  f.step(ticks(0.5));
  const wall = f.walls()[0];
  f.kits.hitConstruct(wall.id, 70);
  const before = {
    health: f.p.health,
    shield: f.p.shield,
    totalSp: f.p.totalSp,
    coins: f.p.coins,
    until: wall.until,
  };
  assert(f.kits.castEngineer(f.p, "technique2", f.c));
  assert(!f.kits.castEngineer(f.p, "technique2", f.c));
  const cue = f.kits.cues().find((c) => c.kind === "engineer-builder-work")!;
  assert(cue.kind === "engineer-builder-work");
  assert.equal(cue.toX, wall.x);
  f.step(ticks(0.8) - 1);
  assert.equal(f.walls()[0].health, wall.maxHealth - 70);
  f.step();
  assert.equal(
    f.walls()[0].health,
    Math.min(wall.maxHealth, wall.maxHealth - 70 + 45 * f.g.stats(f.p).ability),
  );
  assert.deepEqual(
    {
      health: f.p.health,
      shield: f.p.shield,
      totalSp: f.p.totalSp,
      coins: f.p.coins,
      until: f.walls()[0].until,
    },
    before,
  );
  assert.equal(f.kits.status(f.p.id, f.c.tick).builderRepairUntil, 0);
  assert(f.kits.status(f.p.id, f.c.tick).technique2At! > f.c.tick);
});

for (const interruption of [
  "move",
  "fold",
  "death",
  "cover",
  "target-death",
  "expiry",
] as const)
  test(
    "Field Maintenance cancels on " +
      interruption +
      " and cannot resurrect or overfill cover",
    () => {
      const f = isolated([ids.hinge, ids.repair]);
      f.place();
      f.step(ticks(0.5));
      const wall = f.walls()[0];
      f.kits.hitConstruct(wall.id, 70);
      assert(f.kits.castEngineer(f.p, "technique2", f.c));
      if (interruption === "move") f.p.x += 9;
      if (interruption === "fold") {
        f.p.aim = Math.PI / 2;
        assert(f.kits.castEngineer(f.p, "technique1", f.c));
      }
      if (interruption === "death") f.p.health = 0;
      if (interruption === "cover")
        f.c.obstacles.push({ x: 730, y: 590, width: 10, height: 20 });
      if (interruption === "target-death") f.kits.hitConstruct(wall.id, 1e6);
      if (interruption === "expiry") {
        f.c.tick = wall.until - 1;
      }
      f.step(ticks(0.8));
      const remaining = f.walls().find((w) => w.id === wall.id);
      if (remaining) assert.equal(remaining.health, wall.maxHealth - 70);
      assert.equal(f.kits.status(f.p.id, f.c.tick).builderRepairUntil, 0);
      assert(!f.kits.cues().some((c) => c.kind === "engineer-builder-work"));
    },
  );

test("Maintenance refuses healthy, foreign, obscured, distant or expiring walls without spending its cooldown", () => {
  for (const invalid of [
    "healthy",
    "foreign",
    "obscured",
    "distant",
    "expiring",
  ]) {
    const f = isolated([ids.repair]);
    f.place();
    f.step(ticks(0.5));
    const wall = f.walls()[0];
    if (invalid !== "healthy") f.kits.hitConstruct(wall.id, 70);
    if (invalid === "foreign") f.p.id = "other";
    if (invalid === "obscured")
      f.c.obstacles.push({ x: 730, y: 590, width: 10, height: 20 });
    if (invalid === "distant") f.p.x -= 200;
    if (invalid === "expiring") f.c.tick = wall.until - ticks(0.8);
    assert(!f.kits.castEngineer(f.p, "technique2", f.c), invalid);
    assert.equal(f.kits.status(f.p.id, f.c.tick).technique2At ?? 0, 0);
  }
});

test("Linked Foundations tracks two independent Q groups, not two wing panels; owner loss and phase clear remove them", () => {
  const f = isolated([ids.wings, ids.repair, ids.linked]);
  f.place();
  f.place(1100);
  assert.equal(f.walls().length, 4);
  assert.equal(f.kits.status(f.p.id, f.c.tick).builderGroups, 2);
  assert(!f.kits.canCast(f.p, "q", f.c));
  f.kits.hitConstruct(f.walls()[0].id, 1e6);
  f.step();
  assert.equal(f.kits.status(f.p.id, f.c.tick).builderGroups, 2);
  f.kits.hitConstruct(f.walls()[0].id, 1e6);
  f.step();
  assert.equal(f.kits.status(f.p.id, f.c.tick).builderGroups, 1);
  f.p.connected = false;
  f.step();
  assert.equal(f.walls().length, 0);
  f.kits.clear();
  assert.equal(f.kits.cues().length, 0);
  assert.equal(f.kits.status(f.p.id, f.c.tick).builderGroups, undefined);
});

test("Keystone Redoubt retains the original siege and adds three delayed finite panels outside Q capacity", () => {
  const f = isolated([ids.repair, ids.linked, ids.redoubt]);
  f.place();
  f.kits.cast(f.p, "ultimate", f.c);
  const siege = f.kits.cues().find((c) => c.kind === "siege")! as Construct,
    fort = f.walls().filter((w) => w.linkedSiege === siege.id);
  assert.equal(fort.length, 3);
  assert.equal(
    siege.health,
    200 * (1 + (f.g.stats(f.p).effects.ultimatePotency ?? 0)),
  );
  assert.equal(siege.until, ticks(14));
  assert.equal(f.kits.status(f.p.id, f.c.tick).builderGroups, 1);
  assert(
    fort.every(
      (w) =>
        w.maxHealth ===
          90 *
            f.g.stats(f.p).ability *
            (1 + (f.g.stats(f.p).effects.ultimatePotency ?? 0)) &&
        w.until === ticks(12),
    ),
  );
  f.step(ticks(0.8) - 1);
  assert(!f.kits.constructs().some((w) => w.linkedSiege === siege.id));
  f.step();
  assert.equal(
    f.kits.constructs().filter((w) => w.linkedSiege === siege.id).length,
    3,
  );
  f.kits.hitConstruct(siege.id, 1e6);
  f.step();
  assert(!f.walls().some((w) => w.linkedSiege === siege.id));
  assert.equal(f.walls().length, 1);
});

test("Obstructed redoubt ground keeps the original siege but never creates hidden panels through masonry", () => {
  const f = isolated([ids.repair, ids.linked, ids.redoubt]);
  f.c.obstacles.push({ x: 850, y: 590, width: 10, height: 20 });
  f.kits.cast(f.p, "ultimate", f.c);
  assert.equal(f.kits.cues().filter((c) => c.kind === "siege").length, 1);
  assert.equal(f.walls().length, 0);
  assert(
    f.kits.cues().some((c) => c.kind === "engineer-builder-plan" && c.rejected),
  );
});

test("Public cues and action availability expose construction commitments without private controller bookkeeping", () => {
  const { g, p } = fixture(full);
  press(g, p, { q: true });
  let v = viewOf(g, p.id),
    pv = v.players.find((x) => x.id === p.id)!;
  assert(!engineerActions(pv, v.classCues, v.combatTick).qBlocked);
  assert.equal(pv.kit.builderGroupCapacity, 2);
  assert(
    engineerActions(pv, v.classCues, v.combatTick).extras.every(
      (x) => x.blocked,
    ),
  );
  for (let i = 0; i < ticks(0.5); i++) g.step();
  v = viewOf(g, p.id);
  pv = v.players.find((x) => x.id === p.id)!;
  assert(
    !engineerActions(pv, v.classCues, v.combatTick).extras.find(
      (x) => x.key === "technique1",
    )!.blocked,
  );
  for (const cue of g.classCues())
    for (const privateKey of [
      "damage",
      "fireAt",
      "interval",
      "members",
      "groups",
      "repairs",
      "states",
    ])
      assert(!Object.hasOwn(cue, privateKey), privateKey);
});

test("A legal Foundry Relay and Builder capstone build keeps the moving siege behavior while its redoubt stays on the original ground", () => {
  const f = isolated([ids.repair, ids.linked, ids.redoubt]);
  f.g.phase = "shop";
  const talent = data.skills.find(
    (s) => "transform" in s && s.transform === "foundry-relay",
  )!;
  assert(talent);
  const purchase = (id: string) => {
    const node = data.skills.find((s) => s.id === id)!;
    if (node.prerequisite && !f.p.skills.includes(node.prerequisite))
      purchase(node.prerequisite);
    if (!f.p.skills.includes(id))
      assert(f.g.transact(f.p.id, { id, kind: "skill", item: id }).ok, id);
  };
  purchase(talent.id);
  assert(f.p.skills.reduce((n, id) => n + f.g.skillCost(id), 0) <= 27);
  f.g.phase = "combat";
  f.kits.cast(f.p, "ultimate", f.c);
  const siege = f.kits.cues().find((c) => c.kind === "siege")! as Construct;
  assert(siege.mobile);
  assert.equal(
    siege.maxHealth,
    160 * (1 + (f.g.stats(f.p).effects.ultimatePotency ?? 0)),
  );
  const original = f
    .walls()
    .map((w) => ({ id: w.id, x: w.x, y: w.y, until: w.until }));
  assert.equal(original.length, 3);
  f.p.x += 100;
  f.step(ticks(1));
  const moved = f.kits.cues().find((c) => c.id === siege.id)!;
  assert(moved.x !== siege.x);
  assert.deepEqual(
    f.walls().map((w) => ({ id: w.id, x: w.x, y: w.y, until: w.until })),
    original,
  );
});

test("Builder placement uses every map’s actual bounds and lava at each difficulty, including the complete angled wing footprints", () => {
  let admitted = 0,
    rejected = 0;
  for (const arena of data.arenas)
    for (const difficulty of data.difficulties)
      for (const shape of [ids.longspan, ids.wings]) {
        const g = new Game({
          mode: "short",
          seed: 41,
          openingArenaId: arena.id,
          arenaSelection: "fixed",
          difficulty: difficulty.id,
        });
        g.encounter = 9;
        const p = g.addPlayer("p", "Tamsin", "engineer");
        for (const item of [foundation, ids.entry, shape])
          assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
        g.start();
        const c = {
          ...(g as unknown as { kitContext(): KitContext }).kitContext(),
        };
        for (const aim of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          p.aim = aim;
          const kits = new ClassKits();
          if (kits.canCast(p, "q", c)) {
            kits.cast(p, "q", c);
            const walls = kits
              .cues()
              .filter((w): w is Construct => w.kind === "wall");
            assert.equal(walls.length, shape === ids.wings ? 2 : 1);
            for (const wall of walls)
              assert(
                builderPoseLegal({ ...wall, halfSpan: wall.halfSpan! }, c),
              );
            admitted++;
          } else {
            kits.cast(p, "q", c);
            assert.equal(kits.cues().length, 0);
            rejected++;
          }
        }
      }
  assert(admitted > 0 && rejected > 0);
});
