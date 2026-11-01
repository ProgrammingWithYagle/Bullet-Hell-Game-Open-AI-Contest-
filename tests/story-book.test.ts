import development from "../src/shared/development-progress.json";
import test from "node:test";
import assert from "node:assert/strict";
import {
  storyBook,
  validStoryBook,
  storyNarrativeLanguages,
} from "../src/client/story-book.ts";
import { storyCampaign } from "../src/shared/story-campaign.ts";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { freshProfile, type RunReceipt } from "../src/client/profile.ts";
import { menuBundle } from "./helpers/menu-fixture.ts";
test("Spanish narrative covers every act, scene, choice and ending without carrying gameplay commands", () => {
  const book = storyBook("es");
  assert(validStoryBook(book, "es"));
  assert.deepEqual(storyNarrativeLanguages, ["en", "es", "ar"]);
  const coverage = development.items.find(
    (i) => i.id === "story-narrative-languages",
  )!;
  assert.deepEqual(coverage.completedIds, storyNarrativeLanguages);
  assert.equal(coverage.implemented, storyNarrativeLanguages.length);
  assert.equal(book.title, "El registro abierto");
  assert.equal(book.beats.length, 15);
  assert.equal(book.acts.length, 3);
  assert.equal(book.endings.length, 3);
  assert.equal(
    book.beats.reduce((n, b) => n + b.choices.length, 0),
    42,
  );
  assert(!JSON.stringify(book).includes("arenaId"));
  assert.equal(book.beats[0].speaker, storyCampaign.beats[0].speaker);
  for (const language of ["ur", "ja", "fr", "unknown"])
    assert.equal(storyBook(language), storyCampaign);
});
test("Incomplete, reordered-speaker and command-bearing translations are rejected rather than changing routes", () => {
  const book = storyBook("es");
  for (const changed of [
    { ...book, language: "en" },
    { ...book, arenaSelection: "fixed" },
    { ...book, beats: book.beats.slice(1) },
    {
      ...book,
      acts: book.acts.map((a, i) =>
        i ? a : { ...a, speaker: "Other speaker" },
      ),
    },
    {
      ...book,
      beats: book.beats.map((b, i) =>
        i ? b : { ...b, choices: b.choices.slice(1) },
      ),
    },
    {
      ...book,
      beats: book.beats.map((b, i) =>
        i
          ? b
          : {
              ...b,
              choices: b.choices.map((c, n) =>
                n ? c : { ...c, arenaId: "crown-crypt" },
              ),
            },
      ),
    },
  ])
    assert(!validStoryBook(changed, "es"));
});
test("Native Spanish story reading covers setup, aftermath, route choices and recovered endings while English fallback keeps explicit direction", async (context) => {
  const ui = await menuBundle(context, "src/client/ui/story.ts", {
    "i18n.ts":
      "export const locale='es',languages=[['en','English'],['es','Español']];export const number=String,t=key=>key;",
  });
  const briefing = ui.storyBriefingMarkup();
  assert.match(briefing, /El registro abierto/);
  assert.match(briefing, /lang="es" dir="ltr"/);
  assert(!briefing.includes(storyCampaign.intro));
  const g = new Game({ mode: "story", maxPlayers: 1, difficulty: "easy" });
  g.addPlayer("solo", "Reader", "medic");
  g.start();
  g.boss.health = 0;
  g.step();
  const before = JSON.stringify(g.snapshot());
  assert.match(ui.storyReportMarkup(viewOf(g, "solo"), true), /La bisagra/);
  assert.equal(JSON.stringify(g.snapshot()), before);
  while (g.phase === "mutationVote"||g.phase==='storyScene') {
 if(g.phase==='storyScene')g.vote('solo',1);
    g.phaseEnds = g.tick;
    g.step();
  }
  const view = viewOf(g, "solo"),
    html = ui.storyChoiceMarkup(view, 0);
  assert.match(html, /Sacar a las familias/);
  assert.match(html, /arena.triage-yard.name/);
  assert(!html.includes("Bring out the families"));
  const p = freshProfile();
  p.runs = [
    {
      runId: "spanish-reading",
      playerId: "solo",
      mode: "story",
      difficulty: "easy",
      classId: "medic",
      clears: 15,
      rescues: 0,
      firstEncounter: 0,
      campaignClears: 15,
      bossIds: ["constable"],
      teamClears: 15,
      combatTicks: 3000,
      fullCampaign: true,
      memorial: false,
      storyChoices: Array(14).fill(0),
    } satisfies RunReceipt,
  ];
  const saved = JSON.stringify(p),
    ending = ui.storyEndingsMarkup(p);
  assert.match(ending, /Un camino sigue abierto/);
  assert.match(ending, /lang="es" dir="ltr"/);
  assert.equal(JSON.stringify(p), saved);
  const fallback = ui.storyBriefingMarkup("ur");
  assert.match(fallback, /lang="en" dir="ltr"/);
  assert.match(fallback, /ui.storyOriginal/);
  assert.match(fallback, /The Open Ledger/);
});

test("Complete Arabic scenes and choices use right-to-left prose with canonical speakers and unchanged gameplay state", async (context) => {
  const book = storyBook("ar");
  assert(validStoryBook(book, "ar"));
  assert.equal(book.beats.length, 15);
  assert.equal(
    book.beats.reduce((n, b) => n + b.choices.length, 0),
    42,
  );
  assert.equal(book.endings.length, 3);
  const ui = await menuBundle(context, "src/client/ui/story.ts", {
    "i18n.ts":
      "export const locale='ar',languages=[['en','English'],['ar','العربية']];export const number=String,t=key=>key;",
  });
  const html = ui.storyBriefingMarkup();
  assert.match(html, /السجل المفتوح/);
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.match(html, /العربية/);
  const g = new Game({ mode: "story", maxPlayers: 1, difficulty: "easy" });
  g.addPlayer("solo", "Reader", "soldier");
  g.start();
  g.boss.health = 0;
  g.step();
  while (g.phase === "mutationVote"||g.phase==='storyScene') {
 if(g.phase==='storyScene')g.vote('solo',1);
    g.phaseEnds = g.tick;
    g.step();
  }
  const before = JSON.stringify(g.offlineCheckpoint()),
    choice = ui.storyChoiceMarkup(viewOf(g, "solo"), 0);
  assert.match(choice, /إخراج العائلات/);
  assert.match(choice, /lang="ar" dir="rtl"/);
  assert.match(choice, /arena.triage-yard.name/);
  assert.equal(JSON.stringify(g.offlineCheckpoint()), before);
  assert.equal(book.acts[0].speaker, storyCampaign.acts[0].speaker);
  assert(!JSON.stringify(book).includes("arenaId"));
});
