import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { publicRunSettings } from "../src/shared/public-run.ts";
import { validFreePlay } from "../src/shared/free-play.ts";
import { viewOf } from "../src/shared/view.ts";
import { PROTOCOL } from "../src/shared/protocol.ts";
import { recordProfileView, loadProfile } from "../src/client/profile.ts";
import {
  recordPracticeCampaign,
  practiceRecords,
} from "../src/client/progress.ts";
import { menuBundle, menuEnvironment } from "./helpers/menu-fixture.ts";
import { storyScene, storyStructure } from "../src/client/story-scenes.ts";
import dialogue from "../src/client/story/dialogue.json";
test("Free Play supports bounded custom opening/form/seed, persists it and never changes the Story route", () => {
  const config = {
      openingBossId: "glass-surgeon" as const,
      variant: "brutal" as const,
      seed: 0,
    },
    g = new Game(
      publicRunSettings({
        mode: "raid",
        maxPlayers: 1,
        seed: 55,
        freePlay: config,
      }),
    );
  g.addPlayer("solo", "Custom", "medic");
  assert.equal(g.settings.seed, 0);
  assert.equal(g.boss.id, "glass-surgeon");
  assert.equal(g.boss.variant, "normal");
  g.start();
  assert.equal(g.boss.variant, "brutal");
  assert(g.customized);
  const source = new Game({ mode: "short", maxPlayers: 1, freePlay: config });
  source.addPlayer("solo", "Custom", "soldier");
  assert.deepEqual(
    Game.restoreOffline(JSON.parse(JSON.stringify(source.offlineCheckpoint())))
      .settings.freePlay,
    config,
  );
  for (const bad of [
    { seed: -1 },
    { seed: 1.2 },
    { seed: 0x100000000 },
    { openingBossId: "uncounted" },
    { openingBossId: "unknown" },
    { variant: "god" },
    { coins: 999 },
    null,
  ])
    assert(!validFreePlay(bad));
  assert.throws(() => new Game({ mode: "story", freePlay: config }));
  assert.equal(PROTOCOL, 47);
});
test("Custom Free Play results cannot award personal mastery, stamps or campaign records", () => {
  const g = new Game({
    mode: "raid",
    difficulty: "easy",
    maxPlayers: 1,
    freePlay: { openingBossId: "constable" },
  });
  g.addPlayer("solo", "Custom", "soldier");
  g.start();
  const m = new Map<string, string>(),
    store = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => {
        m.set(k, v);
      },
    };
  for (let fight = 0; fight < 3; fight++) {
    if (fight) {
      let guard = 0;
      while (g.phase !== "combat") {
        g.phaseEnds = g.tick;
        g.step();
        assert(++guard < 200);
      }
    }
    g.boss.health = 0;
    g.step();
    recordProfileView(viewOf(g, "solo"), "solo", store);
  }
  assert(viewOf(g, "solo").run.customized);
  assert.equal(loadProfile(store).runs.length, 0);
  assert(recordPracticeCampaign(viewOf(g, "solo"), "solo", store));
  assert.equal(practiceRecords(store).length, 0);
});
test("Story has an untimed personal-reader boundary with saved party readiness and no combat tick advance", () => {
  const g = new Game({ mode: "story", maxPlayers: 2 });
  g.addPlayer("a", "Mara", "soldier");
  g.addPlayer("b", "Iona", "medic");
  g.start();
  g.boss.health = 0;
  g.step();
  assert.equal(g.phase, "storyScene");
  const combat = g.combatTick;
  for (let n = 0; n < 1900; n++) g.step();
  assert.equal(g.phase, "storyScene");
  assert.equal(g.combatTick, combat);
  assert(!g.vote("a", 0));
  assert(g.vote("a", 1));
  g.step();
  assert.equal(g.phase, "storyScene");
  const restored = Game.restoreAuthoritative(
    JSON.parse(JSON.stringify(g.authoritativeCheckpoint())),
  );
  assert.equal(restored.phase, "storyScene");
  assert.equal(restored.votes.get("a"), 1);
  assert(g.vote("b", 1));
  g.step();
  assert.equal(g.phase, "contractVote");
  assert.equal(g.phaseEnds - g.tick, 45 * 30);
  assert.equal(g.storyChoices.length, 0);
  const solo = new Game({ mode: "story", maxPlayers: 1 });
  solo.addPlayer("solo", "Reader", "medic");
  solo.start();
  solo.boss.health = 0;
  solo.step();
  for (let n = 0; n < 3000; n++) solo.step();
  const copy = Game.restoreOffline(
    JSON.parse(JSON.stringify(solo.offlineCheckpoint())),
  );
  assert.equal(copy.phase, "storyScene");
  copy.vote("solo", 1);
  copy.step();
  assert.equal(copy.phase, "contractVote");
});
test("Home Story and Free Play paths stay separate, custom fields require confirmation and Story cannot inherit them", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/setup.ts");
  const launches: unknown[][] = [];
  const dispose = ui.mountSetup(env.host, {
    resume() {},
    launch: (...args: unknown[]) => launches.push(args),
    profileChanged: async () => {},
    settingsHTML: () => "",
    bindSettings() {},
  });
  context.after(dispose);
  env.host.querySelector("#new-run")!.click();
  env.host.querySelector("#setup-next")!.click();
  assert.equal(env.host.querySelectorAll("[data-mode]").length, 5);
  assert(!env.host.querySelector('[data-mode="story"]'));
  env.host.querySelector("#setup-next")!.click();
  env.host.querySelector("#setup-next")!.click();
  env.host.querySelector("#setup-next")!.click();
  assert(env.host.querySelector("#freeplay-boss"));
  assert.equal(launches.length, 0);
  const boss = env.host.querySelector("#freeplay-boss")!;
  boss.value = "ash-baker";
  boss.onchange!({ target: boss });
  const seed = env.host.querySelector("#freeplay-seed")!;
  seed.value = "4294967296";
  seed.oninput!({ target: seed });
  env.host.querySelector("#launch")!.click();
  assert.equal(launches.length, 0);
  seed.value = "17";
  seed.oninput!({ target: seed });
  env.host.querySelector("#launch")!.click();
  assert.equal(launches.length, 1);
  assert.deepEqual((launches[0][1] as { freePlay: unknown }).freePlay, {
    openingBossId: "ash-baker",
    seed: 17,
  });
  env.host.querySelector("#brand-home")!.click();
  env.host.querySelector("#story-campaign")!.click();
  assert(env.host.querySelector(".story-hub"));
  env.host.querySelector("[data-story-begin]")!.click();
  env.host.querySelector("#setup-next")!.click();
  env.host.querySelector("#setup-next")!.click();
  assert(!env.host.querySelector("#freeplay-boss"));
  assert.equal(ui.setupOptions().freePlay, undefined);
  assert.equal(ui.setupOptions().mode, "story");
  env.host.querySelector("#brand-home")!.click();
  env.host.querySelector("#new-run")!.click();
  assert.equal(ui.setupOptions().mode, "short");
});
test("Novel chapters contain longer scenes in three languages, and reader navigation saves only reading state and never grants progress or launches combat", async (context) => {
  assert.equal(storyStructure.chapters.length, 3);
  for (const language of ["en", "es", "ar"]) {
    const d = dialogue[language as keyof typeof dialogue];
    assert.equal(d.prologue.length, 8);
    assert.equal(d.beats.length, 15);
    assert(d.beats.every((lines) => lines.length === 2));
    assert.equal(d.chapters.length, 3);
    assert.equal(d.endings.length, 3);
    assert(
      storyScene({ kind: "prologue", index: 0 }, language).lines.length > 9,
    );
    assert.equal(
      storyScene({ kind: "report", index: 14, ending: 0 }, language).lines
        .length,
      6,
    );
  }
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/story-reader.ts");
  env.host.innerHTML = ui.storyReaderMarkup(
    { kind: "prologue", index: 0 },
    "ar",
    "test-hub",
  );
  const before = JSON.stringify([...env.saved]);
  const dispose = ui.bindStoryReaders(env.host);
  env.host.querySelector("[data-vn-open]")!.click();
  assert(env.host.querySelector("dialog")!.open);
  context.after(dispose);
  assert(env.host.innerHTML.includes('dir="rtl"'));
  assert(env.host.querySelector('[data-vn-step="-1"]')!.disabled);
  env.host.querySelector('[data-vn-step="1"]')!.click();
  assert(env.host.querySelector(".vn-portrait"));
  assert.equal(
    env.host.querySelector("[data-vn-line]")!.textContent,
    storyScene({ kind: "prologue", index: 0 }, "ar").lines[1].text,
  );
  assert.deepEqual([...env.saved.keys()], ["ga-story-reading-v1"]);
  const afterReading = JSON.stringify([...env.saved]);
  const detached = env.host.querySelector('[data-vn-step="1"]')!;
  dispose();
  detached.click();
  assert.equal(JSON.stringify([...env.saved]), afterReading);
});
