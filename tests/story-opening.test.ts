import type { ClassId } from "../src/shared/protocol.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  openingNarrative,
  openingNarrativeLanguages,
  openingSceneBindings,
  validOpeningEdition,
} from "../src/client/story-opening.ts";
import { storyScene } from "../src/client/story-scenes.ts";
import en from "../src/client/story/opening/en.json";
import es from "../src/client/story/opening/es.json";
import ar from "../src/client/story/opening/ar.json";
import { Game, data } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { bossThreat, threatCode } from "../src/shared/boss-threat.ts";
import { buildGrade, rateBuild } from "../src/shared/build-rating.ts";
import { publicRunSettings } from "../src/shared/public-run.ts";
import { menuBundle, menuEnvironment } from "./helpers/menu-fixture.ts";
import { PROFILE_KEY, freshProfile } from "../src/client/profile.ts";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
test("Three complete opening editions share fixed scene bindings and reject command-bearing, incomplete and malformed prose packages", () => {
  assert.deepEqual(openingNarrativeLanguages, ["en", "es", "ar"]);
  for (const [language, edition] of Object.entries({ en, es, ar })) {
    assert(validOpeningEdition(edition, language));
    assert.deepEqual(
      edition.scenes.map((s) => s.id),
      ["gate-cart", "first-return"],
    );
    assert(
      edition.scenes.every((s) => s.pages.length >= 10 && s.pages.length <= 40),
    );
    assert(!JSON.stringify(edition).includes("arenaId"));
    for (const bad of [
      { ...edition, arenaId: "crown-crypt" },
      { ...edition, language: "wrong" },
      { ...edition, schemaVersion: 2 },
      { ...edition, scenes: edition.scenes.slice(1) },
      { ...edition, scenes: [...edition.scenes].reverse() },
      {
        ...edition,
        scenes: edition.scenes.map((s, i) => (i ? s : { ...s, rewards: 100 })),
      },
      {
        ...edition,
        scenes: edition.scenes.map((s, i) =>
          i ? s : { ...s, pages: [{ focus: "mage", text: "" }] },
        ),
      },
      {
        ...edition,
        scenes: edition.scenes.map((s, i) =>
          i ? s : { ...s, pages: [{ focus: "god", text: "Text" }] },
        ),
      },
      {
        ...edition,
        scenes: edition.scenes.map((s, i) =>
          i ? s : { ...s, pages: [{ focus: "mage", text: "x".repeat(1201) }] },
        ),
      },
    ])
      assert(!validOpeningEdition(bad, language));
  }
});
test("The longer scenes replace the correct reading positions and retain fallback, ending isolation and independent returned objects", () => {
  for (const language of openingNarrativeLanguages) {
    const before = storyScene({ kind: "prologue", index: 0 }, language),
      after = storyScene({ kind: "report", index: 0 }, language);
    assert.equal(before.narrativeId, "gate-cart");
    assert.equal(after.narrativeId, "first-return");
    assert.equal(before.arenaId, "gatehouse");
    assert.equal(after.arenaId, "gatehouse");
    assert.equal(before.id, "prologue");
    assert.equal(after.id, "report-0-");
    assert.equal(after.chapter, 1);
    const original = before.lines[0].text;
    before.lines[0].text = "A caller cannot rewrite the edition";
    assert.equal(
      storyScene({ kind: "prologue", index: 0 }, language).lines[0].text,
      original,
    );
    assert.equal(
      storyScene({ kind: "report", index: 1 }, language).narrativeId,
      undefined,
    );
    assert.equal(
      storyScene({ kind: "report", index: 14, ending: 2 }, language).lines
        .length,
      6,
    );
  }
  assert.equal(storyScene({ kind: "prologue", index: 0 }, "ja").language, "en");
  assert.equal(
    openingNarrative({ kind: "chapter", index: 0 }, "en"),
    undefined,
  );
  assert.equal(
    openingNarrative({ kind: "report", index: 0, ending: 0 }, "en"),
    undefined,
  );
  const text = storyScene({ kind: "report", index: 0 }, "en")
    .lines.map((p) => p.text)
    .join("\n");
  for (const consequence of [
    "Watch freight passed through",
    "five marks",
    "ONE PLACE LEFT",
    "Evi Pell",
    "Jorren Saye",
    "separate pocket",
    "before you add where I was going",
  ])
    assert(text.toLowerCase().includes(consequence.toLowerCase()), consequence);
});
test("The opening's boss and location execute under shared Story and Free Play rules for every existing class", () => {
  for (const cl of data.classes) {
    const story = new Game({
      mode: "story",
      difficulty: "normal",
      maxPlayers: 1,
    });
    story.addPlayer("solo", "Reader", cl.id as ClassId);
    story.start();
    const free = new Game(
      publicRunSettings({
        mode: "short",
        difficulty: "normal",
        maxPlayers: 1,
        freePlay: { openingBossId: "constable", variant: "normal" },
        openingArenaId: "gatehouse",
        arenaSelection: "fixed",
      }),
    );
    free.addPlayer("solo", "Rematch", cl.id as ClassId);
    free.start();
    for (const binding of openingSceneBindings) {
      assert.equal(story.boss.id, binding.bossId);
      assert.equal(story.arena.id, binding.arenaId);
      assert.equal(free.boss.id, binding.bossId);
      assert.equal(free.arena.id, binding.arenaId);
    }
    assert.equal(free.boss.threat, story.boss.threat);
    assert.equal(
      rateBuild(story.players.get("solo")!),
      rateBuild(free.players.get("solo")!),
    );
    assert(free.customized);
    assert(!story.customized);
  }
});
test("The aftermath reference uses the actual fixed boss/form and owned build grade without disclosing a future contract", async (context) => {
  const ui = await menuBundle(context, "src/client/ui/story-encounter.ts");
  for (const difficulty of ["normal", "insane", "hellish"])
    for (const cl of data.classes) {
      const g = new Game({ mode: "story", difficulty, maxPlayers: 1 });
      g.addPlayer("solo", "Reader", cl.id as ClassId);
      g.start();
      assert.equal(ui.storyEncounterMarkup(viewOf(g, "solo")), "");
      g.boss.health = 0;
      g.step();
      assert.equal(g.phase, "storyScene");
      const saved = JSON.stringify(g.snapshot()),
        view = viewOf(g, "solo"),
        p = g.players.get("solo")!,
        profile = bossThreat(g.boss.id);
      const markup = ui.storyEncounterMarkup(view);
      assert(markup.includes('data-story-encounter="constable"'));
      assert(
        markup.includes(
          threatCode(profile.level, profile.subtier, g.boss.variant),
        ),
      );
      assert(
        markup.includes(
          "data-story-build>" + buildGrade(rateBuild(p)) + "</bdi>",
        ),
      );
      assert.equal(JSON.stringify(g.snapshot()), saved);
      const absent = clone(view);
      absent.players = [];
      assert(!ui.storyEncounterMarkup(absent).includes("data-story-build"));
      for (const phase of [
        "combat",
        "contractVote",
        "shop",
        "loading",
        "victory",
      ] as const)
        assert.equal(ui.storyEncounterMarkup({ ...view, phase }), "");
      assert.equal(
        ui.storyEncounterMarkup({
          ...view,
          run: { ...view.run, mode: "short" },
        }),
        "",
      );
    }
});
test("Actual novel navigation reads every English, Spanish and Arabic page, persists its place and cannot Ready the party or change earned progress", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/story-reader.ts");
  env.saved.set(PROFILE_KEY, JSON.stringify(freshProfile()));
  const profile = env.saved.get(PROFILE_KEY);
  const g = new Game({ mode: "story", maxPlayers: 2 });
  g.addPlayer("a", "Mara", "soldier");
  g.addPlayer("b", "Iona", "medic");
  g.start();
  g.boss.health = 0;
  g.step();
  const before = JSON.stringify(g.snapshot());
  for (const language of ["en", "es", "ar"])
    for (const kind of ["prologue", "report"] as const) {
      env.host.innerHTML = ui.storyReaderMarkup(
        { kind, index: 0 },
        language,
        "reader-only",
      );
      const dispose = ui.bindStoryReaders(env.host);
      env.host.querySelector("[data-vn-open]")!.click();
      assert(env.host.querySelector("dialog")!.open);
      assert(
        env.host.querySelector(".story-reader")!.dataset.vnNarrative ===
          (kind === "prologue" ? "gate-cart" : "first-return"),
      );
      assert(
        env.host.innerHTML.includes(
          language === "ar" ? 'dir="rtl"' : 'dir="ltr"',
        ),
      );
      const scene = storyScene({ kind, index: 0 }, language);
      for (let n = 0; n < scene.lines.length; n++) {
        assert.equal(
          env.host.querySelector("[data-vn-line]")!.textContent,
          scene.lines[n].text,
        );
        if (n < scene.lines.length - 1)
          env.host.querySelector('[data-vn-step="1"]')!.click();
      }
      assert(env.host.querySelector('[data-vn-step="1"]')!.disabled);
      dispose();
      env.host.innerHTML = ui.storyReaderMarkup(
        { kind, index: 0 },
        language,
        "another-room",
      );
      assert.equal(
        env.host.querySelector("[data-vn-line]")!.textContent,
        scene.lines.at(-1)!.text,
      );
    }
  assert.equal(env.saved.get(PROFILE_KEY), profile);
  assert.equal(JSON.stringify(g.snapshot()), before);
  assert.equal(g.votes.size, 0);
  for (let n = 0; n < 3000; n++) g.step();
  assert.equal(g.phase, "storyScene");
  g.vote("a", 1);
  g.step();
  assert.equal(g.phase, "storyScene");
  g.vote("b", 1);
  g.step();
  assert.equal(g.phase, "contractVote");
});
test("Chapter selection rechecks earned eligibility and ignores stale or tampered chapter controls", async (context) => {
  const env = menuEnvironment(context),
    hub = await menuBundle(context, "src/client/ui/story-hub.ts");
  const dispose = hub.bindStoryHub(
    env.host,
    () => assert.fail("No launch"),
    () => {},
  );
  context.after(dispose);
  env.host.querySelector("[data-story-prologue]")!.click();
  const future = env.host.querySelector('[data-story-chapter="1"]')!;
  assert(future.disabled);
  future.disabled = false;
  future.click();
  assert.equal(
    env.host.querySelector(".story-reader")!.dataset.vnKind,
    "prologue",
  );
  future.dataset.storyChapter = "-1";
  future.click();
  assert.equal(
    env.host.querySelector(".story-reader")!.dataset.vnKind,
    "prologue",
  );
});
