import test from "node:test";
import assert from "node:assert/strict";
import {
  STORY_READING_KEY,
  STORY_READING_LIMIT,
  storyReadingPosition,
  saveStoryReading,
} from "../src/client/story-reading.ts";
import { storyScene } from "../src/client/story-scenes.ts";
import { freshProfile, PROFILE_KEY } from "../src/client/profile.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
function fixture() {
  const saved = new Map<string, string>();
  const store = () => ({
    getItem: (k: string) => saved.get(k) ?? null,
    setItem: (k: string, v: string) => {
      saved.set(k, v);
    },
  });
  return { saved, store };
}
test("Reading bookmarks survive a fresh store/session, separate language editions and reset when scene text changes", () => {
  const f = fixture(),
    store = f.store(),
    en = storyScene({ kind: "prologue", index: 0 }, "en"),
    ar = storyScene({ kind: "prologue", index: 0 }, "ar");
  assert(saveStoryReading(en, 4, store));
  assert.equal(storyReadingPosition(en, f.store()).index, 4);
  assert.equal(storyReadingPosition(ar, store).index, 0);
  assert(saveStoryReading(ar, 2, store));
  assert.equal(storyReadingPosition(en, f.store()).index, 4);
  assert.equal(storyReadingPosition(ar, f.store()).index, 2);
  const revised = {
    ...en,
    lines: en.lines.map((line, i) =>
      i ? line : { ...line, text: line.text + " New material." },
    ),
  };
  assert.equal(storyReadingPosition(revised, store).index, 0);
  assert.equal(
    storyReadingPosition({ ...en, title: "A revised title" }, store).index,
    4,
  );
  assert.equal(f.saved.size, 1);
});
test("Unavailable, corrupt, future and quota-full storage preserve existing bytes and honestly keep the current session position", () => {
  const scene = storyScene({ kind: "prologue", index: 0 }, "en");
  for (const raw of [
    "{bad json",
    JSON.stringify({ schemaVersion: 2, marks: [] }),
    JSON.stringify({ schemaVersion: 1, marks: [["bad", "wrong", -2]] }),
    "x".repeat(100001),
  ]) {
    const f = fixture();
    f.saved.set(STORY_READING_KEY, raw);
    f.saved.set(PROFILE_KEY, "private profile bytes");
    const store = f.store();
    assert.equal(saveStoryReading(scene, 3, store), false);
    assert.equal(f.saved.get(STORY_READING_KEY), raw);
    assert.equal(f.saved.get(PROFILE_KEY), "private profile bytes");
    assert.deepEqual(storyReadingPosition(scene, store), {
      index: 3,
      persistent: false,
    });
  }
  const f = fixture();
  let full = false;
  const store = {
    getItem: (k: string) => f.saved.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (full) throw Error("quota");
      f.saved.set(k, v);
    },
  };
  assert(saveStoryReading(scene, 1, store));
  const bytes = f.saved.get(STORY_READING_KEY);
  full = true;
  assert.equal(saveStoryReading(scene, 5, store), false);
  assert.equal(f.saved.get(STORY_READING_KEY), bytes);
  assert.deepEqual(storyReadingPosition(scene, store), {
    index: 5,
    persistent: false,
  });
  assert.equal(storyReadingPosition(scene, f.store()).index, 1);
  const unavailable = {
    getItem() {
      throw Error("disabled");
    },
    setItem() {
      throw Error("disabled");
    },
  };
  assert.equal(saveStoryReading(scene, 2, unavailable), false);
  assert.deepEqual(storyReadingPosition(scene, unavailable), {
    index: 2,
    persistent: false,
  });
});
test("Saved cursor bounds and recency remain limited without storing room/player context or unlocking anything", () => {
  const f = fixture(),
    store = f.store(),
    base = storyScene({ kind: "prologue", index: 0 }, "en");
  f.saved.set(PROFILE_KEY, "unchanged profile");
  assert(saveStoryReading(base, 999999, store));
  assert.equal(storyReadingPosition(base, store).index, base.lines.length - 1);
  for (let n = 0; n < STORY_READING_LIMIT + 10; n++)
    assert(saveStoryReading({ ...base, id: "volume-scene-" + n }, 1, store));
  const value = JSON.parse(f.saved.get(STORY_READING_KEY)!);
  assert.equal(value.marks.length, STORY_READING_LIMIT);
  assert(f.saved.get(STORY_READING_KEY)!.length < 100000);
  assert.equal(value.marks[0][0].endsWith("volume-scene-10"), true);
  assert.equal(f.saved.get(PROFILE_KEY), "unchanged profile");
});
test("Actual reader navigation resumes after module reload across UI contexts while leaving the profile untouched", async (context) => {
  const env = menuEnvironment(context),
    reader = await menuBundle(context, "src/client/ui/story-reader.ts");
  env.saved.set(PROFILE_KEY, JSON.stringify(freshProfile()));
  const before = env.saved.get(PROFILE_KEY)!;
  env.host.innerHTML = reader.storyReaderMarkup(
    { kind: "prologue", index: 0 },
    "ar",
    "private-room-one",
  );
  const dispose = reader.bindStoryReaders(env.host);
  env.host.querySelector('[data-vn-step="1"]')!.click();
  env.host.querySelector('[data-vn-step="1"]')!.click();
  const text = env.host.querySelector("[data-vn-line]")!.textContent;
  dispose();
  const fresh = await menuBundle(context, "src/client/ui/story-reader.ts");
  env.host.innerHTML = fresh.storyReaderMarkup(
    { kind: "prologue", index: 0 },
    "ar",
    "another-room",
  );
  assert.equal(env.host.querySelector("[data-vn-line]")!.textContent, text);
  assert(env.host.innerHTML.includes('dir="rtl"'));
  assert.equal(env.saved.get(PROFILE_KEY), before);
  assert(!env.saved.get(STORY_READING_KEY)!.includes("private-room-one"));
});
test("Completed-scene archive buttons open earned reports and reject future, tampered and stale eligibility without launching a run", async (context) => {
  const env = menuEnvironment(context),
    profile = freshProfile();
  profile.runs = [
    {
      runId: "archive-earned-two",
      playerId: "solo",
      mode: "story",
      difficulty: "normal",
      classId: "medic",
      clears: 2,
      rescues: 0,
      firstEncounter: 0,
      campaignClears: 2,
      bossIds: ["constable", "matron"],
      teamClears: 2,
      combatTicks: 900,
      fullCampaign: false,
      memorial: false,
      storyChoices: [0],
    },
  ];
  env.saved.set(PROFILE_KEY, JSON.stringify(profile));
  const before = env.saved.get(PROFILE_KEY)!;
  const hub = await menuBundle(context, "src/client/ui/story-hub.ts");
  let starts = 0,
    backs = 0;
  const dispose = hub.bindStoryHub(
    env.host,
    () => starts++,
    () => backs++,
  );
  context.after(dispose);
  const first = env.host.querySelector('[data-story-scene="0"]')!,
    second = env.host.querySelector('[data-story-scene="1"]')!,
    future = env.host.querySelector('[data-story-scene="2"]')!;
  assert(!first.disabled && !second.disabled && future.disabled);
  first.click();
  let current = env.host.querySelector(".story-reader")!;
  assert.equal(current.dataset.vnKind, "report");
  assert.equal(current.dataset.vnIndex, "0");
  assert.equal(env.saved.get(PROFILE_KEY), before);
  future.disabled = false;
  future.click();
  assert.equal(env.host.querySelector(".story-reader")!.dataset.vnIndex, "0");
  first.dataset.storyScene = "999";
  first.click();
  assert.equal(env.host.querySelector(".story-reader")!.dataset.vnIndex, "0");
  env.saved.delete(PROFILE_KEY);
  second.click();
  assert.equal(env.host.querySelector(".story-reader")!.dataset.vnIndex, "0");
  dispose();
  assert.equal(starts, 0);
  assert.equal(backs, 0);
});
