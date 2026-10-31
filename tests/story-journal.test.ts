import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fieldJournal, journalPlan } from "../src/client/field-journal.ts";
import { freshProfile, type RunReceipt } from "../src/client/profile.ts";
import { journalText } from "../src/client/field-journal-text.ts";
import catalog from "../content/catalog.json";
import { menuBundle, menuEnvironment } from "./helpers/menu-fixture.ts";
function receipt(
  id: string,
  clears = 15,
  stance = 0,
  extra: Partial<RunReceipt> = {},
): RunReceipt {
  return {
    runId: id,
    playerId: "solo",
    mode: "story",
    difficulty: "normal",
    classId: "soldier",
    clears,
    rescues: 0,
    firstEncounter: 0,
    campaignClears: clears === 15 ? 15 : 0,
    bossIds: ["constable"],
    teamClears: clears,
    combatTicks: 3000,
    fullCampaign: clears === 15,
    memorial: false,
    storyChoices: Array(Math.min(14, Math.max(0, clears - 1))).fill(stance),
    ...extra,
  };
}
const progress = (profile: ReturnType<typeof freshProfile>, id: string) =>
  fieldJournal(profile).goals.find((g) => g.id === id)!.progress;
test("Story journal milestones use the best personally started run, not summed fragments or late team completion", () => {
  const p = freshProfile();
  p.runs = [receipt("four", 4)];
  assert.equal(progress(p, "story-acts"), 0);
  p.runs.push(receipt("five", 5));
  assert.equal(progress(p, "story-acts"), 1);
  p.runs.push(receipt("ten", 10));
  assert.equal(progress(p, "story-acts"), 2);
  assert.equal(progress(p, "route-story"), 0);
  const late = freshProfile();
  late.runs = [
    receipt("late", 10, 0, {
      firstEncounter: 5,
      teamClears: 15,
      campaignClears: 10,
      fullCampaign: false,
      storyChoices: Array(14).fill(0),
    }),
  ];
  assert.equal(progress(late, "story-acts"), 0);
  assert.equal(progress(late, "story-endings"), 0);
  assert.equal(progress(late, "route-story"), 0);
  p.runs.push(receipt("full"));
  assert.equal(progress(p, "story-acts"), 3);
  assert.equal(progress(p, "route-story"), 1);
  assert.equal(progress(p, "story-endings"), 1);
});
test("First banked Story endings stay deduplicated through raw old views and branch rewinds; three separate endings earn three stamps", () => {
  const p = freshProfile();
  p.runs = [receipt("same", 5), receipt("same", 15, 0), receipt("same", 15, 2)];
  const before = JSON.stringify(p);
  assert.equal(progress(p, "route-story"), 1);
  assert.equal(progress(p, "story-endings"), 1);
  assert.equal(progress(p, "story-acts"), 3);
  assert.equal(JSON.stringify(p), before);
  p.runs.push(receipt("second", 15, 1), receipt("third", 15, 2));
  assert.equal(progress(p, "story-endings"), 3);
  const model = fieldJournal(p);
  assert.equal(model.maximumStamps, 66);
  assert.equal(model.goals.find((g) => g.id === "story-endings")!.tier, 3);
  const legacy = freshProfile();
  legacy.legacyCampaigns = [
    {
      schemaVersion: 1,
      id: "legacy-story",
      practiceOnly: true,
      verified: false,
      contentRevision: p.contentRevision,
      protocol: 46,
      mode: "story",
      difficulty: "normal",
      classId: "soldier",
      completedEncounters: 15,
      accords: 0,
      combatTicks: 3000,
      secret: "declined",
      memorial: false,
    },
  ];
  assert.equal(progress(legacy, "story-endings"), 0);
});
test("Native Story journal preparation preserves profile bytes, canonical route and original-English briefing until launch", async (context) => {
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
  const before = JSON.stringify([...env.saved]);
  env.host.querySelector("#field-journal")!.click();
  assert(env.host.querySelector('[data-journal-goal="story-acts"]'));
  assert(env.host.querySelector('[data-journal-goal="story-endings"]'));
  env.host.querySelector('[data-journal-prepare="story-endings"]')!.click();
  assert.equal(ui.setupOptions().mode, "story");
  assert.equal(ui.setupOptions().arenaSelection, "route");
  assert.equal(ui.setupOptions().openingBossId, "constable");
  assert(env.host.querySelector(".story-briefing"));
  assert.equal(launches, 0);
  assert.equal(JSON.stringify([...env.saved]), before);
  const plan = journalPlan(freshProfile(), "story-acts");
  assert.equal(plan.mode, "story");
  assert.equal(plan.team, false);
  assert.equal(plan.difficulty, "baby");
});
test("Story journal guidance is source-backed in all fifteen languages with separate personal-act and ending instructions", () => {
  for (const language of catalog.locales) {
    const messages = JSON.parse(
      readFileSync("locales/" + language.id + ".json", "utf8"),
    ).messages;
    for (const key of [
      "storyActsTitle",
      "storyActsHelp",
      "storyEndingsTitle",
      "storyEndingsHelp",
    ]) {
      const value = journalText(language.id, key);
      assert(value.length > 5);
      assert.equal(value, messages["journal." + key]);
    }
    assert.notEqual(
      journalText(language.id, "storyActsHelp"),
      journalText(language.id, "storyEndingsHelp"),
    );
  }
});
