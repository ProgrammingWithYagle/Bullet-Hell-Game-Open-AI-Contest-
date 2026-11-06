import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import { HZ, idleInput, type ClassId } from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  WardSkirmish,
  skirmishSites,
  wardSkirmishRules,
} from "../src/shared/ward-skirmish.ts";
import { Minions } from "../src/shared/minions.ts";
import { runtimeArena } from "../src/shared/arena-layouts.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import { validFreePlay } from "../src/shared/free-play.ts";
import { publicRunSettings } from "../src/shared/public-run.ts";
import { loadProfile, recordProfileView } from "../src/client/profile.ts";
import {
  practiceRecords,
  recordPracticeCampaign,
} from "../src/client/progress.ts";
import { menuBundle, menuEnvironment } from "./helpers/menu-fixture.ts";

function game(classId: ClassId = "soldier", difficulty = "normal", party = 1) {
  const g = new Game({
    mode: "short",
    difficulty,
    maxPlayers: party,
    freePlay: { scenarioId: "ward-approach", seed: 731 },
  });
  for (let n = 0; n < party; n++) g.addPlayer("p" + n, "Player " + n, classId);
  return g;
}
test("Scenario settings are bounded, mutually exclusive and canonical in both public and direct simulation", () => {
  assert(validFreePlay({ scenarioId: "ward-approach" }));
  assert(validFreePlay({ scenarioId: "ward-approach", seed: 0 }));
  for (const bad of [
    { scenarioId: "unknown" },
    { scenarioId: "ward-approach", openingBossId: "constable" },
    { scenarioId: "ward-approach", variant: "normal" },
    { scenarioId: "ward-approach", coins: 999 },
  ])
    assert(!validFreePlay(bad));
  assert.throws(
    () =>
      new Game({ mode: "story", freePlay: { scenarioId: "ward-approach" } }),
  );
  assert.throws(
    () => new Game({ mode: "raid", freePlay: { scenarioId: "ward-approach" } }),
  );
  const settings = publicRunSettings({
      mode: "short",
      openingBossId: "uncounted",
      openingArenaId: "crown-crypt",
      freePlay: { scenarioId: "ward-approach" },
    }),
    g = new Game(settings);
  assert.equal(g.arena.id, "triage-yard");
  assert(g.customized);
  assert(g.objective);
  assert.equal(g.objective.status, "briefing");
  const restored = Game.restoreOffline(
    JSON.parse(JSON.stringify(game().offlineCheckpoint())),
  );
  assert.equal(restored.objective?.status, "briefing");
  assert(restored.customized);
});
test("Spawn sites and warnings stay on legal floor, clear of cover/lava and outside the initial personal danger radius on every map and difficulty", () => {
  let samples = 0;
  for (const arena of data.arenas)
    for (const difficulty of data.difficulties) {
      const a = runtimeArena(arena.id, difficulty.id),
        targets = [a.playerSpawn],
        sites = skirmishSites(a.bounds, a.obstacles, a.lavaPits, targets);
      assert(sites.length > 0, arena.id + "/" + difficulty.id);
      for (const p of sites) {
        assert(
          p.x >= a.bounds.x + 26 && p.x <= a.bounds.x + a.bounds.width - 26,
        );
        assert(
          p.y >= a.bounds.y + 26 && p.y <= a.bounds.y + a.bounds.height - 26,
        );
        assert(!a.obstacles.some((r) => segmentRect(p, p, r, 26)));
        assert(!a.lavaPits.some((pit) => distance(p, pit) < pit.radius + 26));
        assert(distance(p, a.playerSpawn) >= wardSkirmishRules.spawnDistance);
        samples++;
      }
    }
  assert(samples > 500);
});
test("Every wave has a full warning, occupied promises are cancelled rather than moved, and bounded dense parties finish only by actual actor removal", () => {
  for (const party of [1, 2, 8, 16, 50]) {
    const director = new WardSkirmish(),
      actors = new Minions(),
      spawned: number[] = [];
    let id = 1;
    const c = {
      now: 0,
      bounds: { x: 0, y: 0, width: 1600, height: 1000 },
      obstacles: [],
      lava: [],
      targets: [{ x: 800, y: 800 }],
      actors: actors.actors,
      healthScale: 1,
      damageScale: 1,
      speedScale: 1,
      spawn: (d: any) => {
        const a = actors.spawn(id++, d, c.now);
        if (a) spawned.push(a.id);
        return a;
      },
    };
    director.start(0, party);
    director.step(c);
    const promised = director.view().portals;
    assert(promised.length > 0);
    assert(promised.every((p) => p.at === 2.5 * HZ));
    c.now = 2.5 * HZ - 1;
    director.step(c);
    assert.equal(actors.actors.size, 0);
    c.now++;
    director.step(c);
    assert(actors.actors.size > 0);
    assert.equal(director.view().defeated, 0);
    assert(director.view().total <= 72);
    for (let n = 0; n < 2000 && director.view().status !== "complete"; n++) {
      for (const a of actors.actors.values()) actors.hit(a.id, 1e6, c.now);
      c.now++;
      director.step(c);
      assert(actors.actors.size <= 48);
    }
    const end = director.view();
    assert.equal(end.status, "complete");
    assert.equal(end.remaining, 0);
    assert.equal(end.defeated, end.total);
    assert.equal(new Set(spawned).size, end.total);
    assert.deepEqual(end.portals, []);
  }
  const d = new WardSkirmish(),
    m = new Minions();
  let id = 1;
  const c = {
    now: 0,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    lava: [],
    targets: [{ x: 800, y: 800 }],
    actors: m.actors,
    healthScale: 1,
    damageScale: 1,
    speedScale: 1,
    spawn: (def: any) => m.spawn(id++, def, c.now),
  };
  d.start(0, 1);
  d.step(c);
  const point = d.view().portals[0];
  c.targets = [point];
  c.now = point.at;
  d.step(c);
  assert([...m.actors.values()].every((a) => distance(a, point) >= 55));
  const newer = d.view().portals;
  assert(newer.every((p) => p.at >= c.now + 2.5 * HZ));
});
test("Actual shots from all seven base classes clear three waves without a boss, campaign reward, purchased power or borrowed mutation", () => {
  for (const cl of data.classes) {
    const g = game(cl.id as ClassId);
    g.start();
    const p = g.players.get("p0")!,
      coins = p.coins,
      sp = p.totalSp;
    let actualDamage = 0,
      guard = 0;
    p.invulnerableUntil = 1e9;
    while (g.phase === "combat" && guard++ < HZ * 180) {
      const target = [...g.minions.actors.values()].sort(
        (a, b) => distance(a, p) - distance(b, p),
      )[0];
      g.submitInput(p.id, {
        ...idleInput(),
        sequence: guard,
        fire: true,
        aim: target ? Math.atan2(target.y - p.y, target.x - p.x) : 0,
      });
      g.step();
      actualDamage = p.damageDealt;
    }
    assert.equal(g.phase, "victory", cl.id);
    assert.equal(g.objective?.status, "complete");
    assert.equal(g.objective?.defeated, 18);
    assert(actualDamage > 0);
    assert.equal(p.progress.clears, 0);
    assert.deepEqual(p.progress.clearedBossIds, []);
    assert.equal(g.completedBossIds.size, 0);
    assert.equal(g.encounter, 0);
    assert.equal(g.campaignBank, null);
    assert.equal(p.coins, coins);
    assert.equal(p.totalSp, sp);
    assert.deepEqual(g.mutations, []);
    assert.equal(g.boss.health, 0);
    assert.equal(g.minions.actors.size, 0);
    assert.equal(
      g.drainEvents().some((e: any) => e.id === "boss-defeated"),
      false,
    );
    const values = new Map<string, string>(),
      store = {
        getItem: (k: string) => values.get(k) ?? null,
        setItem: (k: string, v: string) => {
          values.set(k, v);
        },
      };
    recordProfileView(viewOf(g, p.id), p.id, store);
    assert.equal(loadProfile(store).runs.length, 0);
    recordPracticeCampaign(viewOf(g, p.id), p.id, store);
    assert.equal(practiceRecords(store).length, 0);
  }
});
test("Timeout and actual contact defeat cancel all objective ownership without manufacturing a clear", () => {
  const timeout = game();
  timeout.start();
  timeout.combatTick = timeout.objective!.deadline - 1;
  timeout.step();
  assert.equal(timeout.phase, "defeat");
  assert.equal(timeout.objective?.status, "failed");
  assert.equal(timeout.minions.actors.size, 0);
  assert.deepEqual(timeout.objective?.portals, []);
  assert.equal(timeout.completedBossIds.size, 0);
  const down = game("mage", "hellish");
  down.start();
  const p = down.players.get("p0")!;
  p.invulnerableUntil = 0;
  p.shield = 0;
  p.health = 1;
  p.selfRevives = 0;
  const actor = down.spawnMinion({
    kind: "ordinary",
    x: p.x,
    y: p.y,
    health: 100,
    speed: 0,
    radius: 12,
    damage: 100,
  });
  assert(actor);
  down.step();
  for (let n = 0; down.phase === "combat" && n < 700; n++) down.step();
  assert.equal(down.phase, "defeat");
  assert.equal(down.objective?.status, "failed");
  assert.equal(down.completedBossIds.size, 0);
});
test("The setup selects a distinct standalone scenario and Story never inherits it", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/setup.ts"),
    launches: any[] = [];
  const dispose = ui.mountSetup(env.host, {
    resume() {},
    launch: (...args: any[]) => launches.push(args),
    profileChanged: async () => {},
    settingsHTML: () => "",
    bindSettings() {},
  });
  context.after(dispose);
  env.host.querySelector("#new-run")!.click();
  for (let i = 0; i < 4; i++) env.host.querySelector("#setup-next")!.click();
  const scenario = env.host.querySelector("#freeplay-scenario")!;
  assert(scenario);
  scenario.value = "ward-approach";
  scenario.onchange!({ target: scenario });
  assert(env.host.querySelector("#freeplay-boss")!.disabled);
  assert(env.host.querySelector("#freeplay-form")!.disabled);
  assert(!env.host.querySelector("#opening-boss"));
  env.host.querySelector("#launch")!.click();
  assert.equal(launches[0][1].freePlay.scenarioId, "ward-approach");
  assert.equal(launches[0][1].mode, "short");
  env.host.querySelector("#brand-home")!.click();
  env.host.querySelector("#story-campaign")!.click();
  env.host.querySelector("[data-story-begin]")!.click();
  assert.equal(ui.setupOptions().freePlay, undefined);
});

test("The ordinary objective display, aiming and native warning drawing contain no boss identity or hidden target", async (context) => {
  const { combatAimTarget, drawSkirmishWarnings } =
      await import("../src/client/skirmish-presentation.ts"),
    g = game();
  g.start();
  g.step();
  const view = viewOf(g, "p0"),
    p = g.players.get("p0")!;
  assert.equal(combatAimTarget(view, p), undefined);
  assert.equal(combatAimTarget(view, undefined), undefined);
  const first = g.spawnMinion({
      kind: "ordinary",
      x: p.x + 90,
      y: p.y,
      health: 50,
      speed: 0,
      radius: 12,
      damage: 5,
    })!,
    near = g.spawnMinion({
      kind: "ordinary",
      x: p.x + 40,
      y: p.y,
      health: 50,
      speed: 0,
      radius: 12,
      damage: 5,
    })!;
  const updated = viewOf(g, p.id);
  assert.equal(combatAimTarget(updated, p)?.id, near.id);
  assert.equal(
    combatAimTarget({ ...updated, objective: undefined }, p)?.id,
    g.boss.id,
  );
  const calls: { method: string; args: number[] }[] = [],
    graphics: any = {};
  for (const method of ["lineStyle", "strokeCircle", "lineBetween"])
    graphics[method] = (...args: number[]) => {
      calls.push({ method, args });
      return graphics;
    };
  drawSkirmishWarnings(graphics, view.objective, "combat", g.combatTick);
  assert.equal(
    calls.filter((c) => c.method === "strokeCircle").length,
    view.objective!.portals.length,
  );
  for (const c of calls) assert(c.args.every(Number.isFinite));
  calls.length = 0;
  drawSkirmishWarnings(graphics, view.objective, "victory", g.combatTick);
  assert.equal(calls.length, 0);
  drawSkirmishWarnings(graphics, undefined, "combat", g.combatTick);
  assert.equal(calls.length, 0);
  const ui = await menuBundle(context, "src/client/ui/skirmish.ts");
  const markup = ui.skirmishHUD(view);
  assert(markup.includes("ui.skirmishRemaining"));
  assert(!markup.includes("constable"));
  assert(!markup.includes("boss"));
  assert.equal(ui.skirmishHUD({ ...view, objective: undefined }), "");
  assert(ui.skirmishResults(view).includes("ui.wardApproachHelp"));
});
test("Escaped actors, stopped objectives and forged deployment saves cannot count as an ordinary clear", () => {
  const d = new WardSkirmish(),
    m = new Minions();
  let id = 1;
  const c = {
    now: 0,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    lava: [],
    targets: [{ x: 800, y: 800 }],
    actors: m.actors,
    healthScale: 1,
    damageScale: 1,
    speedScale: 1,
    spawn: (def: any) => m.spawn(id++, { ...def, lifeSeconds: 1 / 30 }, c.now),
  };
  d.start(0, 1);
  d.step(c);
  c.now = 75;
  d.step(c);
  const actor = [...m.actors.values()][0];
  assert.equal(actor.expires, 76);
  c.now = 76;
  m.step(
    c.now,
    c.targets.map((target, index) => ({ ...target, id: "p" + index })),
    [],
    () => {},
  );
  d.step(c);
  assert.equal(d.view().status, "failed");
  assert.equal(d.view().defeated, 0);
  assert.deepEqual(d.view().portals, []);
  const g = game(),
    save = JSON.parse(JSON.stringify(g.offlineCheckpoint()));
  for (const phase of ["shop", "mutationVote", "contractVote", "loading"])
    assert.throws(() =>
      Game.restoreOffline({ ...save, phase, phaseEnds: save.tick + 300 }),
    );
  const before = d.view();
  c.now = 100;
  d.step(c);
  assert.deepEqual(d.view(), before);
});
test("All fifteen scenario editions retain the rules and placeholder contract", () => {
  for (const language of data.locales) {
    const messages = JSON.parse(
      readFileSync("locales/" + language.id + ".json", "utf8"),
    ).messages;
    for (const key of [
      "scenario",
      "bossRoute",
      "wardApproach",
      "wardApproachHelp",
      "skirmishWave",
      "skirmishRemaining",
      "skirmishDefeated",
      "skirmishComplete",
      "skirmishFailed",
    ])
      assert(messages["ui." + key]?.length > 0);
    assert(messages["ui.skirmishWave"].includes("{number}"));
    assert(messages["ui.skirmishWave"].includes("{total}"));
    assert(messages["ui.skirmishRemaining"].includes("{count}"));
    assert(messages["ui.skirmishDefeated"].includes("{count}"));
  }
});
