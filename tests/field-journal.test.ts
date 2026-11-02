import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import catalog from "../content/catalog.json";
import { fieldJournal, journalPlan } from "../src/client/field-journal.ts";
import {
  freshProfile,
  parseProfile,
  recordProfileView,
  loadProfile,
  type RunReceipt,
} from "../src/client/profile.ts";
import {
  implementedClassIds,
  CONTENT_REVISION,
  PROTOCOL,
  type ClassId,
} from "../src/shared/protocol.ts";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { journalText } from "../src/client/field-journal-text.ts";
import letters from "../src/client/survivor-letters.json";
import { menuBundle, menuEnvironment } from "./helpers/menu-fixture.ts";

function receipt(id: string, extra: Partial<RunReceipt> = {}): RunReceipt {
  return {
    runId: id,
    playerId: "solo",
    mode: "short",
    difficulty: "normal",
    classId: "soldier",
    clears: 5,
    rescues: 0,
    firstEncounter: 0,
    campaignClears: 5,
    bossIds: ["constable"],
    teamClears: 5,
    combatTicks: 500,
    fullCampaign: true,
    memorial: false,
    ...extra,
  };
}
test("new profiles have twenty-six attainable goals, 78 stamps, eleven locked letters and no automatic launch or power", () => {
  const p = freshProfile(),
    m = fieldJournal(p);
  assert.equal(m.goals.length, 26);
  assert.equal(new Set(m.goals.map((g) => g.id)).size, 26);
  assert.equal(m.maximumStamps, 78);
  assert.equal(m.stamps, 0);
  assert.equal(m.letters.length, 0);
  for (const g of m.goals) {
    assert.equal(g.progress, 0);
    assert.equal(g.thresholds.length, 3);
    assert(
      g.thresholds.every((n, i) => n > 0 && (!i || n > g.thresholds[i - 1])),
    );
  }
  assert.deepEqual(journalPlan(p, m.next.id), {
    classId: "soldier",
    mode: "short",
    difficulty: "baby",
    team: false,
    goalId: "class-soldier",
  });
  assert.throws(() => journalPlan(p, "invented-goal"));
  assert.deepEqual(p, freshProfile());
});
test("class stamps bank completed clears on a losing run, unlock only its letter and survive exact profile round trips", () => {
  const p = freshProfile();
  p.runs = [
    receipt("lost", { clears: 5, fullCampaign: false, campaignClears: 0 }),
    receipt("next", {
      clears: 10,
      campaignClears: 0,
      teamClears: 10,
      mode: "endless",
      fullCampaign: false,
    }),
  ];
  const parsed = parseProfile(JSON.stringify(p)),
    m = fieldJournal(parsed),
    g = m.goals.find((g) => g.id === "class-soldier")!;
  assert.equal(g.progress, 15);
  assert.equal(g.tier, 2);
  assert.equal(g.target, 30);
  assert.deepEqual(m.letters, ["soldier"]);
  assert.equal(m.goals.find((g) => g.id === "route-short")!.progress, 0);
  assert.deepEqual(parsed, p);
  assert.equal(parsed.contentRevision, CONTENT_REVISION);
});
test("legacy campaign claims and late team clears do not inflate full-route, class, collection or endless goals", () => {
  const p = freshProfile();
  p.legacyCampaigns = [
    {
      schemaVersion: 1,
      id: "legacy",
      practiceOnly: true,
      verified: false,
      contentRevision: CONTENT_REVISION,
      protocol: PROTOCOL,
      mode: "short",
      difficulty: "hard",
      classId: "soldier",
      completedEncounters: 5,
      accords: 3,
      combatTicks: 100,
      secret: "locked",
      memorial: false,
    },
  ];
  p.runs = [
    receipt("late", {
      mode: "endless",
      clears: 4,
      firstEncounter: 40,
      teamClears: 44,
      campaignClears: 0,
      fullCampaign: false,
      bossIds: ["constable", "courier"],
    }),
    receipt("partial", {
      classId: "medic",
      firstEncounter: 3,
      clears: 2,
      teamClears: 5,
      campaignClears: 2,
      fullCampaign: false,
      rescues: 2,
      bossIds: ["constable"],
    }),
  ];
  const m = fieldJournal(parseProfile(JSON.stringify(p)));
  assert.equal(m.goals.find((g) => g.id === "endless")!.progress, 4);
  assert.equal(m.goals.find((g) => g.id === "route-short")!.progress, 0);
  assert.equal(m.goals.find((g) => g.id === "ensemble")!.progress, 0);
  assert.equal(m.goals.find((g) => g.id === "rescues")!.progress, 2);
  assert.equal(m.goals.find((g) => g.id === "collection-short")!.progress, 2);
  assert.equal(m.stamps, 0);
});
test("repeated snapshots and reconnect receipts never duplicate stamps and the reader does not mutate profiles", () => {
  const p = freshProfile();
  p.runs = [
    receipt("same", { clears: 1, campaignClears: 1, fullCampaign: false }),
    receipt("same"),
    receipt("same"),
  ];
  const raw = JSON.stringify(p),
    m = fieldJournal(p);
  assert.equal(m.goals.find((g) => g.id === "class-soldier")!.progress, 5);
  assert.equal(m.goals.find((g) => g.id === "route-short")!.progress, 1);
  assert.equal(JSON.stringify(p), raw);
});
test("real authority progress plus repeated and stale profile views earn one letter; testing-modified runs remove it", () => {
  const saved = new Map<string, string>(),
    store = {
      getItem: (k: string) => saved.get(k) ?? null,
      setItem: (k: string, v: string) => {
        saved.set(k, v);
      },
    };
  const g = new Game({ mode: "endless", seed: 401 });
  g.addPlayer("solo", "Mara", "soldier");
  g.start();
  const p = g.players.get("solo")!;
  p.progress = {
    clears: 5,
    rescues: 0,
    firstEncounter: 0,
    campaignClears: 0,
    clearedBossIds: ["constable"],
  };
  g.encounter = 5;
  const v = viewOf(g, "solo");
  recordProfileView(v, "solo", store);
  recordProfileView(v, "solo", store);
  const stale = structuredClone(v);
  stale.players[0].progress.clears = 1;
  stale.players[0].progress.clearedBossIds = [];
  stale.encounter = 1;
  recordProfileView(stale, "solo", store);
  assert.deepEqual(fieldJournal(loadProfile(store)).letters, ["soldier"]);
  assert.equal(
    fieldJournal(loadProfile(store)).goals.find(
      (g) => g.id === "class-soldier",
    )!.progress,
    5,
  );
  const changed = structuredClone(v);
  changed.run.testingModified = true;
  recordProfileView(changed, "solo", store);
  assert.deepEqual(fieldJournal(loadProfile(store)).letters, []);
});
test("all class letters, three-stamp route goals and ordinary discoveries can complete without secret spoilers or permanent power", () => {
  const p = freshProfile();
  p.runs = implementedClassIds.map((classId, i) =>
    receipt("class" + i, {
      classId,
      mode: "endless",
      clears: 40,
      teamClears: 40,
      campaignClears: 0,
      fullCampaign: false,
      rescues: i === 0 ? 50 : 0,
      bossIds: catalog.bosses
        .filter((b) => !b.secret)
        .slice(i * 10, i * 10 + 10)
        .map((b) => b.id as never),
    }),
  );
  for (const mode of ["short", "standard", "long", "raid"] as const)
    for (let i = 0; i < implementedClassIds.length; i++)
      p.runs.push(
        receipt(mode + i, {
          mode,
          classId: implementedClassIds[i],
          clears: catalog.modes.find((m) => m.id === mode)!.encounters!,
          teamClears: catalog.modes.find((m) => m.id === mode)!.encounters!,
          campaignClears: catalog.modes.find((m) => m.id === mode)!.encounters!,
        }),
      );
  for(let i=0;i<7;i++)p.runs.push(receipt('story-journal-full-'+i,{mode:'story',clears:15,teamClears:15,campaignClears:15,storyChoices:Array(14).fill(i%3)}));
  const before = JSON.stringify(p),
    m = fieldJournal(parseProfile(before));
  assert.equal(m.stamps, 78);
  assert.equal(m.letters.length, 11);
  assert(m.goals.every((g) => g.complete));
  assert.equal(JSON.stringify(p), before);
  assert(!JSON.stringify(m).includes("uncounted"));
  for (const classId of implementedClassIds) {
    assert(letters[classId].body.length > 250);
    assert(letters[classId].title.length > 5);
  }
});
test("preparing goals diversifies classes and routes while rescue goals explicitly need a team", () => {
  const p = freshProfile();
  p.runs = [
    receipt("veteran", {
      clears: 30,
      teamClears: 30,
      classId: "soldier",
      mode: "endless",
      fullCampaign: false,
      campaignClears: 0,
    }),
  ];
  assert.equal(journalPlan(p, "route-raid").classId, "medic");
  assert.equal(journalPlan(p, "route-raid").mode, "raid");
  assert.equal(journalPlan(p, "route-raid").difficulty, "normal");
  assert.equal(journalPlan(p, "class-assassin").classId, "assassin");
  assert.equal(journalPlan(p, "collection-long").mode, "long");
  assert.equal(journalPlan(p, "rescues").team, true);
  assert.equal(journalPlan(p, "rescues").classId, "medic");
});
test("journal controller filters without writes, keeps focus, hides locked letters and disposes detached actions", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/field-journal.ts"),
    plans: unknown[] = [];
  let backs = 0;
  const dispose = ui.mountFieldJournal(
    env.host,
    () => backs++,
    (p: unknown) => plans.push(p),
  );
  context.after(dispose);
  assert.equal(env.host.querySelectorAll("[data-journal-goal]").length, 26);
  assert.equal(env.host.querySelectorAll(".journal-letter").length, 0);
  const classes = env.host.querySelector('[data-journal-filter="classes"]')!;
  classes.click();
  assert.equal(env.host.querySelectorAll("[data-journal-goal]").length, 11);
  assert.equal(
    env.document.activeElement,
    env.host.querySelector('[data-journal-filter="classes"]'),
  );
  const old = env.host.querySelector('[data-journal-prepare="class-medic"]')!;
  old.click();
  assert.equal(plans.length, 1);
  assert.equal(env.saved.size, 0);
  dispose();
  old.click();
  assert.equal(plans.length, 1);
  env.host.querySelector("[data-journal-back]")!.click();
  assert.equal(backs, 0);
});
test("real home journal prepares an explicit run review and team rescue room without starting or changing a saved profile", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/setup.ts");
  let launches = 0;
  const before = JSON.stringify([...env.saved]);
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
  env.host.querySelector("#field-journal")!.click();
  assert(env.host.querySelector(".field-journal"));
  env.host.querySelector('[data-journal-prepare="class-assassin"]')!.click();
  assert(env.host.querySelector("#launch"));
  assert.equal(ui.setupOptions().classId, "assassin");
  assert.equal(ui.setupOptions().arenaSelection, "randomEncounter");
  assert.equal(launches, 0);
  assert.equal(JSON.stringify([...env.saved]), before);
  assert(env.host.querySelector(".journal-plan-notice"));
  env.host.querySelector("#brand-home")!.click();
  env.host.querySelector("#field-journal")!.click();
  env.host.querySelector('[data-journal-prepare="rescues"]')!.click();
  assert.equal(
    env.host
      .querySelector('[data-visibility="private"]')!
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(launches, 0);
});
test("all fifteen runtime labels match catalogs, preserve placeholders and disclose English original letters", () => {
  for (const l of catalog.locales) {
    const words = JSON.parse(
      readFileSync("locales/" + l.id + ".json", "utf8"),
    ).messages;
    assert.equal(journalText(l.id, "title"), words["journal.title"]);
    assert.equal(
      journalText(l.id, "classTitle", { name: "<Mara>" }),
      words["journal.classTitle"].replace("{name}", "<Mara>"),
    );
    assert(
      !/[{}]/.test(
        journalText(l.id, "totals", { count: 1, total: 69, letters: 1, totalLetters: 8 }),
      ),
    );
    if (l.id !== "en")
      assert.notEqual(journalText(l.id, "notice"), journalText("en", "notice"));
    assert.equal(journalText(l.id, "editorial"), words["journal.editorial"]);
    assert(journalText(l.id, "editorial").trim());
  }
  assert.throws(() => journalText("en", "injected"));
  assert.equal(journalText("unknown", "title"), journalText("en", "title"));
});

test("earned letters render only for their survivor, remain collapsed, and keep English direction inside an Arabic journal", async (context) => {
  const env = menuEnvironment(context),
    p = freshProfile();
  p.runs = [receipt("earned-letter")];
  env.saved.set("ga-profile-v1", JSON.stringify(p));
  const before = JSON.stringify([...env.saved]);
  const ui = await menuBundle(context, "src/client/ui/field-journal.ts", {
    "i18n.ts": "export const locale='ar',number=String,t=key=>key;",
  });
  context.after(
    ui.mountFieldJournal(
      env.host,
      () => {},
      () => {},
    ),
  );
  const found = env.host.querySelectorAll(".journal-letter");
  assert.equal(found.length, 1);
  assert.equal(found[0].open, false);
  assert(found[0].textContent.includes("Mara Rook"));
  assert(found[0].textContent.includes(letters.soldier.body));
  assert(!env.host.textContent.includes(letters.medic.body));
  const original = found[0].querySelector('[lang="en"]')!;
  assert(original);
  assert.equal(original.getAttribute("dir"), "ltr");
  assert.equal(JSON.stringify([...env.saved]), before);
});

test("unreadable profiles keep exact bytes and offer Profile recovery without granting empty replacement progress", async (context) => {
  const env = menuEnvironment(context);
  env.saved.set("ga-profile-v1", "{broken");
  const before = JSON.stringify([...env.saved]);
  const ui = await menuBundle(context, "src/client/ui/field-journal.ts");
  let backs = 0,
    recoveries = 0,
    plans = 0;
  context.after(
    ui.mountFieldJournal(
      env.host,
      () => backs++,
      () => plans++,
      () => recoveries++,
    ),
  );
  assert(env.host.querySelector('[role="alert"]'));
  assert.equal(env.host.querySelectorAll("[data-journal-goal]").length, 0);
  env.host.querySelector("[data-journal-profile]")!.click();
  assert.equal(recoveries, 1);
  env.host.querySelector("[data-journal-back]")!.click();
  assert.equal(backs, 1);
  assert.equal(plans, 0);
  assert.equal(JSON.stringify([...env.saved]), before);
});
test("detached filter actions cannot prepare a run, and a profile changed to invalid data during a journal visit has a recovery path", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/field-journal.ts");
  let plans = 0;
  context.after(
    ui.mountFieldJournal(
      env.host,
      () => {},
      () => plans++,
    ),
  );
  const old = env.host.querySelector('[data-journal-prepare="class-medic"]')!;
  env.host.querySelector('[data-journal-filter="routes"]')!.click();
  old.click();
  assert.equal(plans, 0);
  const active = env.host.querySelector(
    '[data-journal-prepare="route-short"]',
  )!;
  env.saved.set("ga-profile-v1", '{"unknown":true}');
  active.click();
  assert.equal(plans, 0);
  assert(env.host.querySelector('[role="alert"]'));
  assert.equal(env.saved.get("ga-profile-v1"), '{"unknown":true}');
});
