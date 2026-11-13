import test from "node:test";
import assert from "node:assert/strict";
import { Game, data, type Player } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { Prediction } from "../src/client/prediction.ts";
import {
  dodgeIntent,
  resetMobility,
  type Mobility,
} from "../src/shared/mobility.ts";
import {
  idleInput,
  PROTOCOL,
  CONTENT_REVISION,
  type InputFrame,
  implementedClassIds,
} from "../src/shared/protocol.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import {
  practiceRecords,
  PRACTICE_RECORDS_KEY,
} from "../src/client/progress.ts";
const brake = "general-brake-step",
  course = "general-course-correction",
  issued = "9b4db7927068a0b75ba0d915094354eb66102090eeed913b8d013e3c9459233f";
const buy = (g: Game, p: Player, id: string) =>
  g.transact(p.id, { id: "buy-" + id, kind: "skill", item: id });
function fixture(
  classId: Player["classId"] = "engineer",
  skills = [brake, "general-sprint", course],
) {
  const g = new Game({ mode: "endless", seed: 41 }),
    p = g.addPlayer("p", "Runner", classId);
  p.totalSp = 11;
  for (const id of skills) assert(buy(g, p, id).ok, id);
  g.start();
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.x = 1250;
  g.boss.y = 200;
  return { g, p };
}
function action(g: Game, p: Player, values: Partial<InputFrame>) {
  const input = {
    ...idleInput(),
    sequence: p.ack + 1,
    clientTick: g.combatTick,
    ...values,
  };
  assert(g.submitInput(p.id, input));
  g.step();
  return input;
}
function earnAtShop(g: Game, p: Player, total: number) {
  g.start();
  while (p.totalSp < total) {
    p.invulnerableUntil = 1e9;
    g.boss.health = 0;
    g.step();
    let transitions = 0;
    while (String(g.phase) !== "shop") {
      assert(++transitions < 400);
      g.phaseEnds = g.tick;
      g.step();
    }
    if (p.totalSp >= total) return;
    transitions = 0;
    while (String(g.phase) !== "combat") {
      assert(++transitions < 400);
      g.phaseEnds = g.tick;
      g.step();
    }
  }
}
test("Two shared techniques add control choices for every discipline without changing the issued purchases or SP budget", () => {
  assert.equal(data.skills.length, 648);
  assert.equal(data.generalSkills.length, 4);
  assert.equal(
    data.generalSkills.find((s) => s.id === "general-sprint")!.cost,
    3,
  );
  assert.equal(
    data.generalSkills.find((s) => s.id === "general-double-dash")!.cost,
    6,
  );
  for (const id of implementedClassIds) {
    const g = new Game(),
      p = g.addPlayer("p", "Entrant", id);
    assert.equal(buy(g, p, course).reason, "prerequisite");
    assert(buy(g, p, brake).ok);
    assert.equal(viewOf(g, p.id).players[0].sp, 1);
    assert.equal(p.totalSp, 3);
  }
  const story = new Game({ mode: "story" }),
    p = story.addPlayer("p", "Entrant", "engineer");
  for (const id of [brake, course])
    assert.equal(buy(story, p, id).reason, "storyLearningRequired");
  assert.equal(p.totalSp, 0);
});
test("Brake Step uses a second press, stops movement once and never spends a second charge, changes protection or refunds recharge", () => {
  const { g, p } = fixture("engineer", [brake, "general-double-dash"]);
  action(g, p, { dodge: true, moveX: 1 });
  const at = p.dodgeAt,
    protectedUntil = p.invulnerableUntil,
    until = p.dashUntil;
  action(g, p, { dodge: true, moveX: 1 });
  assert.equal(p.dashUntil, until);
  assert.equal(
    p.dodgeCharges,
    1,
    "A held button is not a brake or a second dodge",
  );
  action(g, p, {});
  const before = { x: p.x, y: p.y };
  action(g, p, { dodge: true });
  assert.equal(p.dashUntil, g.combatTick);
  assert.deepEqual({ x: p.x, y: p.y }, before);
  assert.equal(p.invulnerableUntil, protectedUntil);
  assert.equal(p.dodgeAt, at);
  assert.equal(p.dodgeCharges, 1);
  action(g, p, { dodge: true });
  assert.equal(
    p.dodgeCharges,
    1,
    "Holding after a brake cannot start another dodge",
  );
  action(g, p, {});
  action(g, p, { dodge: true, moveY: 1 });
  assert.equal(p.dodgeCharges, 0);
  assert.equal(p.dodgeAt, at);
});
test("Course Correction bends one ordinary dodge using real stamina, retaining its speed, duration, protection and cooldown", () => {
  const { g, p } = fixture("engineer", ["general-sprint", course]);
  action(g, p, { dodge: true, moveX: 1, sprint: true });
  const until = p.dashUntil,
    protectedUntil = p.invulnerableUntil,
    at = p.dodgeAt;
  action(g, p, { moveY: 1, sprint: true });
  assert(Math.abs(p.dashX) < 1e-9);
  assert(Math.abs(p.dashY - 1) < 1e-9);
  assert.equal(p.sprintStamina, 80);
  assert(p.dodgeSteered);
  const position = { x: p.x, y: p.y };
  action(g, p, { moveX: -1, sprint: true });
  assert(Math.abs(p.x - position.x) < 1e-6);
  assert(p.y > position.y);
  assert.equal(p.sprintStamina, 80);
  assert.equal(p.dashUntil, until);
  assert.equal(p.invulnerableUntil, protectedUntil);
  assert.equal(p.dodgeAt, at);
});
test("Unowned, exhausted, small or unaffordable turns do nothing; a reverse request is bounded to a quarter turn and class rushes are excluded", () => {
  const make = (): Mobility & { dashX: number; dashY: number } => ({
    dodgeCharges: 0,
    dodgeMaximum: 1,
    dodgeAt: 80,
    sprintStamina: 100,
    sprintRecoveryAt: 0,
    sprintExhausted: false,
    sprinting: false,
    dashUntil: 9,
    dashX: 1,
    dashY: 0,
    dodgeControlUntil: 9,
    dodgeSteered: false,
  });
  const move = { ...idleInput(), sprint: true, moveY: 1 };
  for (const why of [
    "unowned",
    "exhausted",
    "cost",
    "small",
    "rush",
  ] as const) {
    const p = make();
    if (why === "exhausted") p.sprintExhausted = true;
    if (why === "cost") p.sprintStamina = 19;
    if (why === "rush") p.dashUntil = 12;
    const input = why === "small" ? { ...move, moveX: 1, moveY: 0.1 } : move;
    dodgeIntent(
      p,
      input,
      2,
      why === "unowned" ? ["general-sprint"] : ["general-sprint", course],
    );
    assert.equal(p.dashX, 1, why);
    assert.equal(p.dashY, 0, why);
    assert(!p.dodgeSteered, why);
  }
  const reverse = make();
  dodgeIntent(reverse, { ...move, moveX: -1, moveY: 0 }, 2, [
    "general-sprint",
    course,
  ]);
  assert(Math.abs(reverse.dashX) < 1e-9);
  assert(Math.abs(reverse.dashY - 1) < 1e-9);
  assert.equal(reverse.sprintStamina, 80);
  const rush = make();
  rush.dashUntil = 12;
  assert.notEqual(
    dodgeIntent(rush, { ...idleInput(), dodge: true }, 2, [brake]),
    "brake",
  );
  assert.equal(rush.dashUntil, 12);
  resetMobility(reverse, [course, "general-sprint"]);
  assert.equal(reverse.dodgeSteered, false);
  assert.equal(reverse.dodgeControlUntil, 0);
  assert.equal(reverse.sprintStamina, 100);
});
test("Actual authority and prediction agree on turning, release/press braking and held input for all twelve classes", () => {
  for (const classId of implementedClassIds) {
    const { g, p } = fixture(classId),
      prediction = new Prediction();
    prediction.acknowledge(viewOf(g, p.id), p.id);
    for (const values of [
      { dodge: true, moveX: 1, sprint: true },
      { moveY: 1, sprint: true },
      { dodge: true },
      { dodge: true },
      { moveX: -1 },
      { dodge: true, moveY: -1 },
    ]) {
      const view = viewOf(g, p.id),
        input = {
          ...idleInput(),
          sequence: p.ack + 1,
          clientTick: g.combatTick,
          ...values,
        };
      prediction.submit(input, view);
      assert(g.submitInput(p.id, input));
      g.step();
      for (const k of [
        "x",
        "y",
        "dashX",
        "dashY",
        "sprintStamina",
        "dodgeCharges",
        "dodgeAt",
        "dashUntil",
        "dodgeControlUntil",
      ] as const)
        assert(
          Math.abs(Number(prediction.player![k]) - Number(p[k])) < 1e-6,
          classId + " " + k,
        );
      for (const k of ["dodgeInputDown", "dodgeSteered"] as const)
        assert.equal(prediction.player![k], p[k], classId + " " + k);
    }
  }
});
test("Current safe boundaries retain real shared ownership and reject missing prerequisites and Campaign injection", () => {
  const g = new Game({ mode: "endless", seed: 41 }),
    p = g.addPlayer("p", "Runner", "engineer");
  earnAtShop(g, p, 11);
  for (const id of [brake, "general-sprint", course]) assert(buy(g, p, id).ok);
  const save = g.offlineCheckpoint()!;
  assert(save);
  const restored = Game.restoreOffline(structuredClone(save));
  assert.deepEqual(restored.players.get("solo")!.skills, p.skills);
  assert.equal(restored.players.get("solo")!.dodgeControlUntil, 0);
  const forged = structuredClone(save);
  forged.player.skills = forged.player.skills.filter(
    (s) => s !== "general-sprint",
  );
  assert.throws(() => Game.restoreOffline(forged));
  const campaign = new Game({ mode: "story" });
  campaign.addPlayer("p", "Entrant", "engineer");
  const chapter = campaign.offlineCheckpoint()!;
  chapter.player.skills.push(brake);
  assert.throws(() => Game.restoreOffline(chapter));
});
test("The issued protocol51 Machinery edition migrates all identities and full old builds but cannot invent the new shared techniques", () => {
  for (const classId of implementedClassIds) {
    const g = new Game({ mode: "story" });
    g.addPlayer("p", "Entrant", classId);
    const save = g.offlineCheckpoint()!;
    save.contentRevision = issued;
    save.protocolVersion = 51;
    const copy = Game.restoreOffline(structuredClone(save));
    assert.equal(copy.players.get("solo")!.classId, classId);
    assert.deepEqual(copy.trainingFor("solo"), g.trainingFor("p"));
    assert.equal(copy.offlineCheckpoint()!.protocolVersion, PROTOCOL);
    const bad = structuredClone(save);
    bad.player.skills.push(brake);
    assert.throws(() => Game.restoreOffline(bad));
  }
  const g = new Game({ mode: "endless", seed: 41 }),
    p = g.addPlayer("p", "Tamsin", "engineer");
  earnAtShop(g, p, 27);
  for (const id of [
    "engineer-constructs-1",
    "engineer-machinery-1",
    "engineer-machinery-survey-1",
    "engineer-machinery-coil-1",
    "engineer-machinery-prism-1",
    "engineer-machinery-salvage-1",
    "engineer-machinery-convergence-1",
  ])
    assert(buy(g, p, id).ok);
  const save = g.offlineCheckpoint()!;
  save.protocolVersion = 51;
  save.contentRevision = issued;
  const copy = Game.restoreOffline(structuredClone(save));
  assert.deepEqual(copy.players.get("solo")!.skills, p.skills);
  assert.equal(copy.players.get("solo")!.coins, p.coins);
  assert.throws(() =>
    Game.restoreAuthoritative({
      ...g.authoritativeCheckpoint(),
      protocolVersion: 51,
      contentRevision: issued,
    }),
  );
  const bad = structuredClone(save);
  bad.player.skills.push(brake);
  assert.throws(() => Game.restoreOffline(bad));
  const profile = freshProfile();
  profile.contentRevision = issued;
  const parsed = parseProfile(JSON.stringify(profile));
  assert.equal(parsed.contentRevision, CONTENT_REVISION);
  assert.deepEqual(parsed.controls, profile.controls);
});
test("Historical protocol51 clear records retain their twelve-class labels and never acquire current online authority", () => {
  const record = {
    schemaVersion: 1,
    id: "old51",
    practiceOnly: true,
    verified: false,
    contentRevision: issued,
    protocol: 51,
    mode: "short",
    difficulty: "normal",
    classId: "alchemist",
    completedEncounters: data.modes.find((m) => m.id === "short")!.encounters,
    accords: 0,
    combatTicks: 100,
    secret: "locked",
    memorial: false,
  };
  const store = {
    getItem: (key: string) =>
      key === PRACTICE_RECORDS_KEY
        ? JSON.stringify([record, { ...record, id: "bad", protocol: 47 }])
        : null,
    setItem() {},
  };
  assert.deepEqual(
    practiceRecords(store).map((r) => r.id),
    ["old51"],
  );
});
