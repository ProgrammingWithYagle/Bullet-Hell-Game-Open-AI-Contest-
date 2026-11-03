import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, data, type Player } from "../src/shared/game.ts";
import { ClassKits, type KitContext } from "../src/shared/class-kits.ts";
import { machineryIds as ids } from "../src/shared/engineer-machinery.ts";
import {
  engineerRules as r,
  specializationSpRequired,
} from "../src/shared/engineer-pathways.ts";
import {
  idleInput,
  validInput,
  PROTOCOL,
  CONTENT_REVISION,
  HZ,
} from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import { engineerActions } from "../src/client/engineer-actions.ts";
import {
  defaultControls,
  migrateMobilityControls,
  validControls,
} from "../src/client/input-bindings.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import {
  practiceRecords,
  PRACTICE_RECORDS_KEY,
} from "../src/client/progress.ts";
import {
  specializationMapLayout,
  specializationFocus,
} from "../src/client/ui/specialization-map.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
const foundation = "engineer-constructs-1",
  machinery = "engineer-machinery-1",
  issued = "a6a17f1935ebd8e91d8d5916a7c8ee920190e13bc42a07e09dec98723e94390f";
function fixture(skills: string[] = [], pair = false) {
  const g = new Game({ mode: "endless", seed: 41, maxPlayers: 2 });
  g.encounter = 9;
  const p = g.addPlayer("p", "Tamsin", "engineer");
  for (const id of [foundation, machinery, ...skills])
    assert(g.transact(p.id, { id, kind: "skill", item: id }).ok, id);
  if (pair)
    p.skills.push(
      data.skills.find(
        (s) => "transform" in s && s.transform === "crossfire-pair",
      )!.id,
    );
  g.start();
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.x = 1250;
  g.boss.y = 200;
  g.boss.health = g.boss.maxHealth = 1e6;
  p.x = p.oldX = 800;
  p.y = p.oldY = 700;
  p.aim = 0;
  p.invulnerableUntil = 1e9;
  g.obstacles.splice(0);
  return { g, p };
}
function ctx(g: Game): KitContext {
  return { ...(g as unknown as { kitContext(): KitContext }).kitContext() };
}
function input(
  g: Game,
  p: Player,
  values: Partial<ReturnType<typeof idleInput>>,
) {
  assert(
    g.submitInput(p.id, {
      ...idleInput(),
      sequence: p.ack + 1,
      aim: p.aim,
      ...values,
    }),
  );
  g.step();
}
function advance(g: Game, n: number) {
  for (let i = 0; i < n; i++) g.step();
}
function isolated(skills: string[], pair = false) {
  const { g, p } = fixture(skills, pair),
    c = ctx(g),
    kits = new ClassKits();
  c.obstacles = [];
  c.targets = [];
  kits.cast(p, "q", c);
  p.qAt = c.tick + 18 * HZ;
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      c.tick++;
      kits.step(c);
    }
  };
  return { g, p, c, kits, step };
}

test("Machinery grows from three starter actions to four and five while earned-SP gates protect late abilities", () => {
  assert.equal(data.specializationSkills.length, 8);
  assert.equal(data.skills.length, 648);
  for (const [id, gate] of [
    [ids.anchor, 5],
    [ids.survey, 5],
    [ids.coil, 11],
    [ids.prism, 17],
    [ids.salvage, 21],
    [ids.convergence, 27],
  ] as const) {
    assert.equal(specializationSpRequired(id), gate);
    const { g, p } = fixture([
      ...(id === ids.prism || id === ids.salvage || id === ids.convergence
        ? [ids.coil]
        : []),
      ...(id === ids.convergence ? [ids.prism] : []),
    ]);
    g.phase = "shop";
    p.skills = p.skills.filter((s) => s !== id);
    p.totalSp = gate - 1;
    assert.equal(
      g.transact(p.id, { id: "too-early", kind: "skill", item: id }).ok,
      false,
    );
    // No SP is minted, and rejected spending never changes ownership.
    assert(!p.skills.includes(id));
    assert.equal(p.totalSp, gate - 1);
    p.totalSp = gate;
    assert(g.transact(p.id, { id: "at-gate", kind: "skill", item: id }).ok, id);
  }
  const { g, p } = fixture();
  let v = viewOf(g, p.id).players[0];
  assert.equal(engineerActions(v, [], 0).extras.length, 0);
  p.skills.push(ids.coil);
  v = viewOf(g, p.id).players[0];
  assert.deepEqual(
    engineerActions(v, [], 0).extras.map((a) => a.key),
    ["technique1"],
  );
  p.skills.push(ids.salvage);
  v = viewOf(g, p.id).players[0];
  assert.deepEqual(
    engineerActions(v, [], 0).extras.map((a) => a.key),
    ["technique1", "technique2"],
  );
  const story = new Game({ mode: "story" }),
    s = story.addPlayer("s", "Tamsin", "engineer");
  for (const id of Object.values(ids))
    assert.equal(
      story.transact(s.id, { id, kind: "skill", item: id }).reason,
      "storyLearningRequired",
    );
  assert.equal(s.totalSp, 0);
});

test("Anchor is a reversible owned command, preserves deployment cooldown and resets bracing rather than banking fire", () => {
  const { p, c, kits, step } = isolated([ids.anchor], true);
  step(HZ);
  const machines = kits.constructs().filter((t) => t.machinery),
    start = machines.map((t) => ({ x: t.x, y: t.y })),
    qAt = p.qAt;
  assert(kits.commandEngineer(p, c));
  assert(machines.every((t) => t.order === "anchor"));
  assert.equal(p.qAt, qAt);
  assert(!kits.commandEngineer(p, c));
  p.x += 100;
  p.aim = 2;
  step(HZ);
  assert.deepEqual(
    machines.map((t) => ({ x: t.x, y: t.y })),
    start,
  );
  assert(kits.commandEngineer(p, c));
  assert(machines.every((t) => t.order === "follow"));
  assert.equal(p.qAt, qAt);
  step(10);
  assert(
    machines.every(
      (t, i) =>
        t.x > start[i].x &&
        t.x - start[i].x <= (r.machineSpeed / HZ) * 10 + 0.001,
    ),
  );
  assert(machines.every((t) => t.braceUntil! > c.tick));
});

test("Survey captures a fixed legal waypoint, keeps paired formation, rejects all blocked/lava/edge orders without charging recovery", () => {
  const { p, c, kits, step } = isolated([ids.survey], true);
  step(HZ);
  assert(kits.commandEngineer(p, c));
  const machines = kits.constructs().filter((t) => t.machinery),
    goals = machines.map((t) => ({ ...t.goal! })),
    qAt = p.qAt;
  assert.equal(goals[0].x, 1020);
  assert.equal(Math.abs(goals[0].y - goals[1].y), 110);
  p.aim = Math.PI;
  p.x += 30;
  step(2 * HZ);
  assert.deepEqual(
    machines.map((t) => t.goal),
    goals,
  );
  assert.deepEqual(
    machines.map((t) => ({ x: t.x, y: t.y })),
    goals,
  );
  p.aim = 0;
  c.obstacles = [{ x: 1040, y: 500, width: 20, height: 400 }];
  const ready = machines.map((t) => t.commandAt);
  assert(!kits.commandEngineer(p, c));
  assert.deepEqual(
    machines.map((t) => t.goal),
    goals,
  );
  assert.deepEqual(
    machines.map((t) => t.commandAt),
    ready,
  );
  assert.equal(p.qAt, qAt);
  c.obstacles = [];
  c.terrain = {
    bounds: { x: 0, y: 0, width: 2000, height: 1400 },
    lava: [{ x: 1050, y: 700, radius: 80 }],
  };
  assert(!kits.commandEngineer(p, c));
  assert.deepEqual(
    machines.map((t) => t.goal),
    goals,
  );
  c.terrain.lava = [];
  p.x = 1900;
  assert(!kits.commandEngineer(p, c));
  step();
  assert(kits.cues().some((c) => c.kind === "engineer-order" && c.rejected));
});

test("A ready Q still deploys, and controls cannot alter another owner’s machinery, siege engines or legacy turrets", () => {
  const { g, p } = fixture([ids.anchor]);
  input(g, p, { q: true });
  advance(g, HZ);
  input(g, p, { q: true });
  assert(
    g.classKits
      .constructs()
      .filter((t) => t.machinery)
      .every((t) => t.order === "anchor"),
  );
  p.qAt = g.combatTick;
  input(g, p, { q: true });
  assert(
    g.classKits
      .constructs()
      .filter((t) => t.machinery)
      .every((t) => t.order === "follow"),
  );
  assert(p.qAt > g.combatTick);
  const other = g.addPlayer("other", "Another engineer", "engineer");
  other.x = 800;
  other.y = 850;
  other.skills = [foundation, machinery, ids.anchor];
  other.qAt = 1000;
  assert(!g.classKits.commandEngineer(other, ctx(g)));
  assert(
    g.classKits
      .constructs()
      .filter((t) => t.owner === p.id)
      .every((t) => t.order === "follow"),
  );
});

test("Coil Lance commits a machine and a fixed aim, fires only after charge, then resumes normal work with a finite cooldown", () => {
  const { p, c, kits, step } = isolated([ids.coil]),
    hits: { at: number; from: any; to: any; damage: number }[] = [];
  c.sweep = (_p, from, to, _radius, damage) =>
    hits.push({ at: c.tick, from: { ...from }, to: { ...to }, damage });
  let normal = 0;
  c.shoot = () => normal++;
  assert(kits.castEngineer(p, "technique1", c));
  const before = kits.constructs()[0],
    start = { x: before.x, y: before.y };
  assert.equal(
    kits.status(p.id, c.tick).technique1At,
    Math.ceil(12 * HZ * c.stats(p).cooldown),
  );
  p.x += 100;
  p.aim = Math.PI;
  step(Math.ceil(r.coilChargeSeconds * HZ) - 1);
  assert.equal(hits.length, 0);
  assert.equal(normal, 0);
  assert.deepEqual({ x: before.x, y: before.y }, start);
  assert(kits.cues().some((c) => c.kind === "engineer-coil"));
  step();
  assert.equal(hits.length, 1);
  assert.equal(
    hits[0].damage,
    r.coilDamage *
      c.stats(p).ability *
      (1 + (c.stats(p).effects.turretDamage ?? 0)),
  );
  assert(hits[0].to.x > hits[0].from.x);
  assert(!kits.castEngineer(p, "technique1", c));
  step(HZ);
  assert(before.x > start.x);
});

test("Prism changes firing geometry and sequence; Rail Convergence changes coordination and warned impact at SS+", () => {
  const prism = isolated([ids.coil, ids.prism]),
    rays: any[] = [];
  prism.c.sweep = (_p, from, to, _rad, damage) =>
    rays.push({
      at: prism.c.tick,
      aim: Math.atan2(to.y - from.y, to.x - from.x),
      damage,
    });
  assert(prism.kits.castEngineer(prism.p, "technique1", prism.c));
  prism.step(2 * HZ);
  assert.equal(rays.length, 3);
  assert.deepEqual(
    rays.map((x) => Number(x.aim.toFixed(2))),
    [-r.prismArc, 0, r.prismArc],
  );
  assert(rays[0].at < rays[1].at && rays[1].at < rays[2].at);
  assert(rays.reduce((s, r) => s + r.damage, 0) > r.coilDamage);
  const rail = isolated([ids.coil, ids.prism, ids.convergence], true),
    beams: any[] = [],
    areas: any[] = [];
  rail.c.sweep = (_p, from, to, _rad, damage) =>
    beams.push({ from: { ...from }, to: { ...to }, damage });
  rail.c.area = (_p, point, radius, damage) =>
    areas.push({ at: rail.c.tick, point: { ...point }, radius, damage });
  assert(rail.kits.castEngineer(rail.p, "technique1", rail.c));
  rail.step(Math.ceil(r.coilChargeSeconds * HZ));
  assert.equal(beams.length, 2);
  assert.notDeepEqual(beams[0].from, beams[1].from);
  assert.deepEqual(beams[0].to, beams[1].to);
  assert.equal(areas.length, 0);
  assert(rail.kits.cues().some((c) => c.kind === "engineer-collapse"));
  rail.step(Math.ceil(r.collapseSeconds * HZ) - 1);
  assert.equal(areas.length, 0);
  rail.step();
  assert.equal(areas.length, 1);
  assert.equal(
    areas[0].damage,
    r.collapseDamage *
      rail.c.stats(rail.p).ability *
      (1 + (rail.c.stats(rail.p).effects.turretDamage ?? 0)),
  );
  assert.equal(areas[0].radius, r.collapseRadius);
  assert.equal(
    rail.kits.status(rail.p.id, rail.c.tick).technique1At,
    Math.ceil(r.convergenceCooldown * HZ * rail.c.stats(rail.p).cooldown),
  );
});

test("Coil cover clipping and real ordinary/boss damage use owned simulation credit; no boss clocks are slowed", () => {
  const { g, p } = fixture([ids.coil]);
  g.boss.x = 1120;
  g.boss.y = 700;
  const deadline = g.boss.deadline,
    health = g.boss.health;
  const body = g.minions.spawn(
    999001,
    {
      kind: "ordinary",
      x: 1000,
      y: 700,
      health: 1000,
      speed: 0,
      radius: 15,
      damage: 0,
    },
    g.combatTick,
  )!;
  input(g, p, { q: true });
  input(g, p, { technique1: true });
  advance(g, Math.ceil(r.coilChargeSeconds * HZ));
  assert(body.health < 1000);
  assert(g.boss.health < health);
  assert(p.damageDealt >= r.coilDamage);
  assert.equal(g.boss.deadline, deadline);
  const blocked = isolated([ids.coil]),
    ends: any[] = [];
  blocked.c.obstacles = [{ x: 950, y: 500, width: 30, height: 400 }];
  blocked.c.sweep = (_p, _from, to) => ends.push({ ...to });
  assert(blocked.kits.castEngineer(blocked.p, "technique1", blocked.c));
  blocked.step(HZ);
  assert(ends[0].x < 950 - r.beamRadius);
});

test("Destroyed or expired machines, owner death/disconnect and intermission cancel channels and their collapse", () => {
  for (const why of ["destroy", "expire", "disconnect", "death"] as const) {
    const f = isolated([ids.coil, ids.prism, ids.convergence]);
    let damage = 0;
    f.c.sweep = () => damage++;
    f.c.area = () => damage++;
    assert(f.kits.castEngineer(f.p, "technique1", f.c));
    const t = f.kits.constructs()[0];
    if (why === "destroy") t.health = 0;
    if (why === "expire") t.until = f.c.tick + 1;
    if (why === "disconnect") f.p.connected = false;
    if (why === "death") f.p.status = "downed";
    f.step(2 * HZ);
    assert.equal(damage, 0, why);
    assert(
      !f.kits
        .cues()
        .some((c) => ["engineer-coil", "engineer-collapse"].includes(c.kind)),
    );
  }
  const { g, p } = fixture([ids.coil]);
  input(g, p, { q: true });
  input(g, p, { technique1: true });
  advance(g, 24);
  assert(g.classCues().some((c) => c.kind === "engineer-beam"));
  g.boss.health = 0;
  g.step();
  assert(
    !g
      .classCues()
      .some(
        (c) => c.kind.startsWith("engineer-") && c.kind !== "engineer-charge",
      ),
  );
});

test("Salvage is a fifth owned utility action: consumes nearby idle carriages once, recovers bounded deployment time, grants no resources", () => {
  const { p, c, kits, step } = isolated([ids.coil, ids.salvage], true);
  step(HZ);
  const before = {
    qAt: p.qAt,
    health: p.health,
    coins: p.coins,
    totalSp: p.totalSp,
    damage: p.damageDealt,
  };
  assert(kits.castEngineer(p, "technique2", c));
  assert.equal(kits.constructs().filter((t) => t.machinery).length, 0);
  assert.equal(p.qAt, before.qAt - 6 * HZ);
  assert.equal(p.health, before.health);
  assert.equal(p.coins, before.coins);
  assert.equal(p.totalSp, before.totalSp);
  assert.equal(p.damageDealt, before.damage);
  assert.equal(
    kits.status(p.id, c.tick).technique2At,
    c.tick + Math.ceil(24 * HZ * c.stats(p).cooldown),
  );
  assert(!kits.castEngineer(p, "technique2", c));
  const busy = isolated([ids.coil, ids.salvage]);
  assert(busy.kits.castEngineer(busy.p, "technique1", busy.c));
  assert(!busy.kits.castEngineer(busy.p, "technique2", busy.c));
  assert.equal(busy.kits.status(busy.p.id, 0).technique2At, 0);
  const far = isolated([ids.coil, ids.salvage]);
  far.p.x -= 300;
  assert(!far.kits.castEngineer(far.p, "technique2", far.c));
  assert.equal(far.kits.status(far.p.id, 0).technique2At, 0);
});

test("Extra inputs are strict pulses, ignore unowned/other-class use and are consumed once by the authoritative tick", () => {
  assert(validInput({ ...idleInput(), technique1: true, technique2: true }));
  for (const key of ["technique1", "technique2"] as const) {
    const bad: any = idleInput();
    delete bad[key];
    assert(!validInput(bad));
    assert(!validInput({ ...idleInput(), [key]: "true" }));
  }
  const { g, p } = fixture();
  input(g, p, { technique1: true, technique2: true });
  assert.equal(g.classKits.status(p.id, g.combatTick).technique1At, 0);
  assert.equal(g.classKits.status(p.id, g.combatTick).technique2At, 0);
  p.skills.push(ids.coil);
  input(g, p, { q: true });
  const frame = { ...idleInput(), sequence: p.ack + 1, technique1: true };
  assert(g.submitInput(p.id, frame));
  assert(g.submitInput(p.id, { ...idleInput(), sequence: p.ack + 2 }));
  g.step();
  assert(g.classKits.status(p.id, g.combatTick).technique1At! > g.combatTick);
  assert.equal(p.input.technique1, false);
});

test("Exact protocol-49/50 boundaries preserve twelve identities and old choices; invented new nodes and online old revisions are rejected", () => {
  for (const protocol of [49, 50]) {
    const g = new Game(),
      p = g.addPlayer("p", "Tamsin", "engineer");
    for (const item of [foundation, machinery])
      assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
    p.coins = 44;
    const save = g.offlineCheckpoint()!;
    save.contentRevision = issued;
    save.protocolVersion = protocol;
    const copy = Game.restoreOffline(structuredClone(save));
    assert.deepEqual(copy.offlineCheckpoint()!.player, {
      ...save.player,
      id: "solo",
    });
    assert.equal(copy.offlineCheckpoint()!.protocolVersion, PROTOCOL);
    const bad = structuredClone(save);
    bad.player.skills.push(ids.anchor);
    assert.throws(() => Game.restoreOffline(bad));
    const online = g.authoritativeCheckpoint()!;
    online.contentRevision = issued;
    online.protocolVersion = protocol;
    assert.throws(() => Game.restoreAuthoritative(online));
  }
  const profile = freshProfile();
  profile.contentRevision = issued;
  const old: any = profile.controls;
  delete old.bindings.technique1;
  delete old.bindings.technique2;
  delete old.gamepad.technique1;
  delete old.gamepad.technique2;
  old.bindings.q = ["KeyC"];
  old.gamepad.q = 6;
  old.bindings.e = ["KeyB"];
  old.gamepad.e = 11;
  const copy = parseProfile(JSON.stringify(profile));
  assert(validControls(copy.controls));
  for (const [a, b] of Object.entries(old.bindings))
    assert.deepEqual(
      copy.controls.bindings[a as keyof typeof copy.controls.bindings],
      b,
    );
  assert.notEqual(copy.controls.gamepad.technique1, 6);
  assert.notEqual(copy.controls.gamepad.technique2, 11);
  assert.deepEqual(old.bindings.technique1, undefined);
  const malformed = freshProfile() as any;
  delete malformed.controls.bindings.technique1;
  assert.throws(() => parseProfile(JSON.stringify(malformed)));
  assert.equal(migrateMobilityControls(malformed.controls), malformed.controls);
});

test("Issued A6 practice records retain their original revision and protocol without granting proof or deleting protocol-49 history", () => {
  const records = [49, 50, 47].map((protocol) => ({
    schemaVersion: 1,
    id: "issued-" + protocol,
    practiceOnly: true,
    verified: false,
    contentRevision: issued,
    protocol,
    mode: "short",
    difficulty: "normal",
    classId: "alchemist",
    completedEncounters: 5,
    accords: 0,
    combatTicks: 30,
    secret: "locked",
    memorial: false,
  }));
  const found = practiceRecords({
    getItem: (key) =>
      key === PRACTICE_RECORDS_KEY ? JSON.stringify(records) : null,
    setItem() {
      throw Error("read only");
    },
  });
  assert.deepEqual(found, records.slice(0, 2));
});

test("The authored tree exposes every real technique once, follows direct parents, and provides a reading view with guarded purchases", async (t) => {
  const env = menuEnvironment(t),
    messages = JSON.parse(readFileSync("locales/en.json", "utf8")).messages;
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (s: string) => s },
  });
  t.after(() => {
    css
      ? Object.defineProperty(globalThis, "CSS", css)
      : Reflect.deleteProperty(globalThis, "CSS");
  });
  const shop = await menuBundle(t, "src/client/ui/shop.ts", {
    "assets.ts":
      'export const assets={items:{},upgrades:{},specializationIcons:{"engineer-machinery-coil-1":"/coil.png"}};',
    "i18n.ts":
      "const messages=" +
      JSON.stringify(messages) +
      ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),messages[k]??k);',
  });
  const g = new Game(),
    p = g.addPlayer("p", "Tamsin", "engineer"),
    v = viewOf(g, p.id).players[0],
    requests: unknown[] = [];
  env.host.innerHTML =
    '<div class="loadout-editor">' + shop.shopMarkup(v) + "</div>";
  const binding = shop.bindShop(env.host, v, (r: unknown) => requests.push(r));
  env.host.querySelector('[data-shop-tab="specializations"]')!.click();
  assert.equal(env.host.querySelectorAll("[data-inspect]").length, 8);
  assert.equal(env.host.querySelectorAll(".foundation-reference").length, 1);
  const map = specializationMapLayout("engineer")!;
  assert.equal(specializationFocus(map, ids.prism, "ArrowUp"), ids.coil);
  assert.equal(specializationFocus(map, ids.convergence, "ArrowUp"), ids.prism);
  env.host.querySelector('[data-inspect="' + ids.coil + '"]')!.click();
  assert(
    env.host.querySelector("#item-details")!.textContent.includes("11 SP"),
  );
  assert(env.host.querySelector("#buy-selected")!.disabled);
  assert(
    env.host.querySelector("#item-details")!.innerHTML.includes("/coil.png"),
  );
  assert.equal(requests.length, 0);
  env.host.querySelector('[data-specialization-mode="list"]')!.click();
  assert(env.host.querySelector(".reading-view"));
  assert.equal(env.host.querySelectorAll("[data-inspect]").length, 8);
  assert(env.host.querySelector(".pathway-parent"));
  assert(
    env.host
      .querySelectorAll("[data-graph-focus]")
      .every((b) => b.tabIndex === 0),
  );
  env.host.querySelector('[data-inspect="' + ids.convergence + '"]')!.click();
  assert(
    env.host
      .querySelector("#item-details")!
      .textContent.includes("single capstone"),
  );
  assert(env.host.querySelector("#buy-selected")!.disabled);
  binding.dispose();
});

test("Prism previews its actual pending lanes and exposes only public cue geometry", () => {
  const f = isolated([ids.coil, ids.prism]);
  assert(f.kits.castEngineer(f.p, "technique1", f.c));
  f.step();
  const cue = f.kits.cues().find((c) => c.kind === "engineer-coil")!;
  assert(cue.kind === "engineer-coil");
  assert.equal(cue.rays?.length, 3);
  assert.deepEqual(
    cue.rays!.map((to) =>
      Number(Math.atan2(to.y - cue.y, to.x - cue.x).toFixed(2)),
    ),
    [-r.prismArc, 0, r.prismArc],
  );
  f.step(Math.ceil(r.coilChargeSeconds * HZ) - 1);
  const next = f.kits.cues().find((c) => c.kind === "engineer-coil")!;
  assert(next.kind === "engineer-coil");
  assert.equal(next.rays?.length, 2);
  for (const c of f.kits.cues())
    for (const key of ["damage", "machines", "delivered"])
      assert(!Object.hasOwn(c, key));
});

test("A convergence collapse needs a rail to reach its mark; fully blocked machinery cannot produce a remote impact", () => {
  for (const partial of [false, true]) {
    const f = isolated([ids.coil, ids.prism, ids.convergence], partial);
    const machines = f.kits.constructs();
    machines[0].y = 500;
    f.c.obstacles = [{ x: 950, y: 500, width: 50, height: 100 }];
    let areas = 0;
    f.c.sweep = () => {};
    f.c.area = () => areas++;
    assert(f.kits.castEngineer(f.p, "technique1", f.c));
    f.step(2 * HZ);
    assert.equal(areas, partial ? 1 : 0);
    for (const c of f.kits.cues())
      for (const key of ["damage", "machines", "delivered"])
        assert(!Object.hasOwn(c, key));
  }
});

test("A fading carriage does not prevent a surviving one from firing; HUD availability agrees with the finite charge requirement", () => {
  const f = isolated([ids.coil, ids.prism], true),
    machines = f.kits.constructs();
  machines[0].until = 10;
  const v = viewOf(f.g, f.p.id).players[0],
    actions = engineerActions(v, f.kits.cues(), f.c.tick);
  assert.equal(actions.extras[0].blocked, false);
  assert(f.kits.castEngineer(f.p, "technique1", f.c));
  f.step();
  assert(
    f.kits
      .cues()
      .some((c) => c.kind === "engineer-coil" && c.id === machines[1].id),
  );
  const empty = isolated([ids.coil]);
  empty.kits.constructs()[0].until = 10;
  const before = empty.kits.status(empty.p.id, 0).technique1At;
  assert(
    engineerActions(
      viewOf(empty.g, empty.p.id).players[0],
      empty.kits.cues(),
      0,
    ).extras[0].blocked,
  );
  assert(!empty.kits.castEngineer(empty.p, "technique1", empty.c));
  assert.equal(empty.kits.status(empty.p.id, 0).technique1At, before);
});

test("Engineer sound events follow successful owned actions and actual finite ray releases", () => {
  const f = isolated([ids.coil, ids.prism, ids.salvage]),
    events: string[] = [];
  f.c.sound = (id, owner) => {
    assert.equal(owner.id, f.p.id);
    events.push(id);
  };
  assert(f.kits.castEngineer(f.p, "technique1", f.c));
  assert.deepEqual(events, ["engineer-charge"]);
  assert(!f.kits.castEngineer(f.p, "technique1", f.c));
  assert(!f.kits.castEngineer(f.p, "technique2", f.c));
  f.step(2 * HZ);
  assert.deepEqual(events, [
    "engineer-charge",
    "engineer-rail",
    "engineer-rail",
    "engineer-rail",
  ]);
  assert(f.kits.castEngineer(f.p, "technique2", f.c));
  assert.equal(events.at(-1), "engineer-salvage");
  f.kits.clear();
  f.step(HZ);
  assert.equal(events.length, 5);
});
