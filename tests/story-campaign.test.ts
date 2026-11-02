// Preserve issued fifteen-boss Story prototype behavior through the restore-only compatibility path.
import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  storyCampaign,
  storyArena,
  storyEnding,
  validStoryBoundary,
} from "../src/shared/story-campaign.ts";
import {
  loadProfile,
  recordProfileView,
  parseProfile,
  exportProfile,
} from "../src/client/profile.ts";
import { storyProgress } from "../src/client/story-progress.ts";
import { menuBundle, menuEnvironment } from "./helpers/menu-fixture.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
const json = (v: unknown) => JSON.parse(JSON.stringify(v));
const store = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
  };
};
function game(seed = 23, difficulty = "easy", runId = "story-fixture") {
  const g = new Game({
    mode: "story",
    seed,
    difficulty,
    maxPlayers: 1,
    runId,
    openingBossId: "uncounted",
    openingArenaId: "crown-crypt",
    arenaSelection: "randomEncounter",
  }, true);
  g.addPlayer("solo", "Mara", "soldier");
  return g;
}
function advance(g: Game) {
  if (g.phase === "storyScene") {
    for (const p of g.players.values())
      if (p.connected && p.eligible) g.vote(p.id, 1);
    for (let n = 0; g.phase === "storyScene" && n < 200; n++) g.step();
    return;
  }

  let guard = 0;
  const phase = g.phase;
  while (g.phase === phase) {
    g.phaseEnds = g.tick;
    g.step();
    assert(++guard < 200, "bounded intermission");
  }
}
function next(g: Game, choice: number) {
  if (g.phase === "storyScene") {
    for (const p of g.players.values())
      if (p.connected && p.eligible) g.vote(p.id, 1);
    while (g.phase === "storyScene") g.step();
  }
  assert.equal(g.phase, "contractVote");
  assert.equal(g.phaseEnds - g.tick, storyCampaign.choiceSeconds * 30);
  g.vote("solo", choice);
  const id = g.contractCards[choice].bossId!;
  advance(g);
  assert.equal(g.phase, "shop");
  advance(g);
  advance(g);
  assert.equal(g.phase, "combat");
  return id;
}
function finish(g: Game, choice: number, record?: ReturnType<typeof store>) {
  g.start();
  for (let i = 0; i < 15; i++) {
    if (i) next(g, choice);
    assert.equal(g.arena.id, storyArena(i, g.storyChoices));
    assert.equal(g.players.get("solo")!.totalSp, 3 + Math.floor((24 * i) / 14));
    assert.equal(
      g.players.get("solo")!.incomeGranted,
      Math.floor(
        (120 + (2280 * i) / 14) *
          data.difficulties.find((d) => d.id === g.settings.difficulty)!.coins,
      ),
    );
    g.boss.health = 0;
    g.step();
    if (record) recordProfileView(viewOf(g, "solo"), "solo", record);
  }
  return g;
}
test("Story campaign offers 15 unique fixed-grade fights and three reproducible choice paths with earned SP", () => {
  for (const choice of [0, 1, 2])
    for (const seed of [23, 71, 112]) {
      const g = finish(game(seed), choice);
      assert.equal(g.completedBossIds.size, 15);
      assert.equal(g.phase, "victory");
      assert(data.bossPools.story.finale.includes(g.boss.id));
      assert.equal(g.storyChoices.length, 14);
      assert.equal(storyEnding(g.storyChoices), choice);
      assert.equal(g.campaignBank?.encounters, 15);
      assert.equal(g.players.get("solo")!.progress.campaignClears, 15);
    }
});
test("Story canonical opening and weighted endings are stable, including latest tied choice", () => {
  const g = game();
  assert.equal(g.settings.openingBossId, "constable");
  assert.equal(g.settings.openingArenaId, "gatehouse");
  assert.equal(g.settings.arenaSelection, "route");
  assert.equal(storyEnding([0, 1, 2, 0, 1, 2]), 2);
  assert.equal(storyEnding([2, 1, 0, 2, 1, 0]), 0);
  assert.equal(storyEnding([0, 0, 1, 2]), 0);
  assert(!validStoryBoundary("short", [0], 1, "shop"));
  assert(!validStoryBoundary("story", [3], 1, "shop"));
});
test("Story save and resume keep choices, votes and arena at every deployment boundary", () => {
  let g = game();
  g.start();
  for (let i = 0; i < 14; i++) {
    g.boss.health = 0;
    g.step();
    if (g.phase === "storyScene") {
      g.vote("solo", 1);
      while (g.phase === "storyScene") g.step();
    }
    for (const phase of ["contractVote", "shop", "loading"]) {
      assert.equal(g.phase, phase);
      if (phase === "contractVote") g.vote("solo", i % 3);
      const raw = json(g.offlineCheckpoint());
      const copy = Game.restoreOffline(raw);
      assert.deepEqual(copy.storyChoices, g.storyChoices);
      assert.deepEqual(copy.contractCards, g.contractCards);
      assert.equal(copy.arena.id, g.arena.id);
      advance(g);
      advance(copy);
      assert.deepEqual(copy.storyChoices, g.storyChoices);
      assert.deepEqual(copy.contractCards, g.contractCards);
      assert.equal(copy.arena.id, g.arena.id);
      if (g.phase === "combat") assert.equal(copy.boss.id, g.boss.id);
      assert.deepEqual(
        copy.players.get("solo")!.progress,
        g.players.get("solo")!.progress,
      );
      assert.equal(
        copy.players.get("solo")!.totalSp,
        g.players.get("solo")!.totalSp,
      );
      g = copy;
    }
  }
  g.boss.health = 0;
  g.step();
  assert.equal(g.campaignBank?.encounters, 15);
});
test("Story checkpoints reject forged histories, cards, maps and pre-Story protocol data", () => {
  const g = game();
  g.start();
  g.boss.health = 0;
  g.step();
  advance(g);
  const raw = json(g.offlineCheckpoint());
  const invalid = [
    { ...raw, storyChoices: [0] },
    { ...raw, storyChoices: [-1] },
    { ...raw, storyChoices: undefined },
    { ...raw, contractCards: [null, null, null] },
    {
      ...raw,
      contractCards: raw.contractCards.map((c: object) => ({
        ...c,
        id: "watch-1-0",
      })),
    },
    { ...raw, arenaId: "crown-crypt" },
    {
      ...raw,
      protocolVersion: 45,
      contentRevision:
        "fd77a95b869f368f49ce988f613db276385c45843e0152c69c3c67e13683a97b",
    },
  ];
  for (const save of invalid) assert.throws(() => Game.restoreOffline(save));
  assert.equal(PROTOCOL, 48);
  assert.equal(raw.contentRevision, CONTENT_REVISION);
});
test("Three personal endings survive duplicate views, old branches, profile export and secret failure", () => {
  const s = store();
  for (const choice of [0, 1, 2]) {
    const g = finish(game(23, "normal", "story-ending-" + choice), choice, s);
    assert.equal(g.phase, "secretOffer");
    const view = viewOf(g, "solo");
    recordProfileView(view, "solo", s);
    recordProfileView(view, "solo", s);
    recordProfileView(
      { ...view, storyChoices: Array(14).fill((choice + 1) % 3) },
      "solo",
      s,
    );
    g.vote("solo", 1);
    g.phaseEnds = g.tick;
    while (g.phase === "secretOffer") g.step();
    assert.equal(g.phase, "loading");
    advance(g);
    assert.equal(g.boss.id, "uncounted");
    g.players.get("solo")!.status = "eliminated";
    g.step();
    recordProfileView(viewOf(g, "solo"), "solo", s);
    assert.equal(loadProfile(s).runs.length, choice + 1);
  }
  const profile = parseProfile(exportProfile(s));
  assert.deepEqual([...storyProgress(profile).endings].sort(), [0, 1, 2]);
  assert.equal(storyProgress(profile).acts, 3);
  assert(!parseProfile(exportProfile(s)).runs.some((r) => r.mode !== "story"));
  const forged = {
    ...profile,
    contentRevision:
      "fd77a95b869f368f49ce988f613db276385c45843e0152c69c3c67e13683a97b",
  };
  assert.throws(() => parseProfile(JSON.stringify(forged)));
});
test("Late Story arrivals and modified testing runs never inherit an ending", () => {
  const s = store(),
    g = game();
  g.settings.maxPlayers = 2;
  g.start();
  g.boss.health = 0;
  g.step();
  g.addPlayer("late", "Iona", "medic");
  for (let i = 1; i < 15; i++) {
    next(g, i % 3);
    g.boss.health = 0;
    g.step();
  }
  recordProfileView(viewOf(g, "solo"), "late", s);
  assert.equal(storyProgress(loadProfile(s)).endings.size, 0);
  recordProfileView(
    {
      ...viewOf(g, "solo"),
      run: { ...viewOf(g, "solo").run, testingModified: true },
    },
    "solo",
    s,
  );
  assert.equal(storyProgress(loadProfile(s)).endings.size, 0);
});
test("Story interludes are outside combat; choices conceal enemy identities and endings can be reread", async (context) => {
  const {
    storyBriefingMarkup,
    storyReportMarkup,
    storyChoiceMarkup,
    storyEndingsMarkup,
  } = await menuBundle(context, "src/client/ui/story.ts");
  const g = game();
  assert.match(storyBriefingMarkup(), /lang="en" dir="ltr"/);
  g.start();
  assert.equal(storyReportMarkup(viewOf(g, "solo")), "");
  g.boss.health = 0;
  g.step();
  advance(g);
  const view = viewOf(g, "solo"),
    html = storyChoiceMarkup(view, 0);
  assert.match(html, /Bring out the families/);
  for (const c of g.contractCards) assert(!html.includes(c.bossId!));
  assert.match(storyReportMarkup(view, true), /data-story-report open/);
  assert.match(
    storyEndingsMarkup(loadProfile(store())),
    /data-story-ending="2"/,
  );
});

test("Story home entry walks the real setup, locks the choice-driven map and waits for launch confirmation", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/setup.ts");
  let launches = 0;
  const dispose = ui.mountSetup(env.host, {
    resume() {},
    launch() {
      launches++;
    },
    profileChanged: async () => {},
    settingsHTML: () => "",
    bindSettings() {},
  });
  context.after(dispose);
  env.host.querySelector("#story-campaign")!.click();
  assert(env.host.querySelector(".story-hub"));
  assert.equal(env.host.querySelectorAll("[data-story-chapter]").length, 3);
  env.host.querySelector("[data-story-begin]")!.click();
  assert.equal(ui.setupOptions().mode, "story");
  env.host.querySelector("#setup-next")!.click();
  assert.equal(env.host.querySelectorAll("[data-mode]").length, 0);
  assert.equal(env.host.querySelectorAll("[data-map]").length, 0);
  env.host.querySelector("#setup-next")!.click();
  assert(env.host.querySelector(".story-briefing"));
  assert(env.host.querySelector("#launch"));
  assert.equal(launches, 0);
  assert.equal(ui.setupOptions().arenaSelection, "route");
  assert.equal(ui.setupOptions().openingBossId, "constable");
  assert.equal(ui.setupOptions().practiceVariant, "normal");
  env.host.querySelector("#launch")!.click();
  assert.equal(launches, 1);
});
