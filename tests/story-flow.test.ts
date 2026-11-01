import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import { CONTENT_REVISION, type ClassId } from "../src/shared/protocol.ts";
import { validStoryBoundary } from "../src/shared/story-campaign.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { storyProgress } from "../src/client/story-progress.ts";
import {
  PRACTICE_RECORDS_KEY,
  practiceRecords,
} from "../src/client/progress.ts";
const issued =
  "e80e0f1d1bd444b1c5d16fae4c7aae322b31bcac70ac180b74964f6ba0326b48";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function ready(g: Game) {
  for (const p of g.players.values())
    if (p.connected && p.eligible) g.vote(p.id, 1);
  for (let n = 0; g.phase === "storyScene" && n < 200; n++) g.step();
  assert.equal(g.phase, "contractVote");
}
function advance(g: Game) {
  const phase = g.phase;
  for (let n = 0; g.phase === phase && n < 200; n++) {
    g.phaseEnds = g.tick;
    g.step();
  }
  assert.notEqual(g.phase, phase);
}
test("Every class traverses the whole Story route without mutations while Free Play retains its mutation vote", () => {
  for (const cl of data.classes) {
    const g = new Game({ mode: "story", maxPlayers: 1, difficulty: "easy" });
    g.addPlayer("solo", "Reader", cl.id as ClassId);
    g.start();
    for (let fight = 0; fight < 15; fight++) {
      g.boss.health = 0;
      g.step();
      assert.deepEqual(g.mutations, []);
      assert.deepEqual(g.mutationCards, []);
      if (fight === 14) break;
      assert.equal(g.phase, "storyScene");
      ready(g);
      assert.equal(g.phaseEnds - g.tick, 45 * 30);
      assert.equal(g.contractCards.length, 3);
      g.vote("solo", fight % 3);
      advance(g);
      advance(g);
      advance(g);
      assert.equal(g.phase, "combat");
    }
    assert.equal(g.storyChoices.length, 14);
    assert.equal(g.campaignBank?.encounters, 15);
  }
  const free = new Game({ mode: "short", maxPlayers: 1 });
  free.addPlayer("solo", "Free Play", "soldier");
  free.start();
  free.boss.health = 0;
  free.step();
  assert.equal(free.phase, "mutationVote");
  assert.equal(free.mutationCards.length, 3);
  free.vote("solo", 0);
  advance(free);
  assert.equal(free.phase, "contractVote");
  assert.equal(free.mutations.length, 1);
  assert(!validStoryBoundary("story", [], 1, "mutationVote"));
});
test("Known issued local Story mutation boundaries return to reading, old bonuses are removed and profile endings/records survive", () => {
  const g = new Game({ mode: "story", maxPlayers: 1 });
  g.addPlayer("solo", "Reader", "medic");
  g.start();
  g.boss.health = 0;
  g.step();
  const old = clone(g.offlineCheckpoint()!);
  old.contentRevision = issued;
  old.phase = "mutationVote";
  old.phaseEnds = old.tick + 450;
  old.mutations = [{ id: data.mutations[0].id, remaining: 3 }];
  old.mutationCards = data.mutations.slice(0, 3).map((m) => m.id);
  old.votes = { solo: 1 };
  const untouched = JSON.stringify(old);
  const recovered = Game.restoreOffline(old);
  assert.equal(JSON.stringify(old), untouched);
  assert.equal(recovered.phase, "storyScene");
  assert.equal(recovered.votes.size, 0);
  assert.deepEqual(recovered.mutations, []);
  assert.deepEqual(recovered.mutationCards, []);
  assert.equal(recovered.encounter, 1);
  assert.deepEqual(recovered.storyChoices, []);
  ready(recovered);
  const profile = freshProfile();
  profile.contentRevision = issued;
  profile.locale = "ar";
  profile.runs = [
    {
      runId: "issued-story-ending",
      playerId: "solo",
      mode: "story",
      difficulty: "normal",
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
      storyChoices: Array(14).fill(2),
    },
  ];
  const p = parseProfile(JSON.stringify(profile));
  assert.equal(p.contentRevision, CONTENT_REVISION);
  assert.equal(p.locale, "ar");
  assert.deepEqual([...storyProgress(p).endings], [2]);
  const record = {
    schemaVersion: 1,
    id: "issued-story-record",
    practiceOnly: true,
    verified: false,
    contentRevision: issued,
    protocol: 47,
    mode: "story",
    difficulty: "normal",
    classId: "medic",
    completedEncounters: 15,
    accords: 0,
    combatTicks: 3000,
    secret: "declined",
    memorial: false,
  };
  const stored = JSON.stringify([record]);
  assert.equal(
    practiceRecords({
      getItem: (key) => (key === PRACTICE_RECORDS_KEY ? stored : null),
      setItem() {
        assert.fail("Read must not rewrite storage");
      },
    }).length,
    1,
  );
  assert.throws(
    () =>
      Game.restoreAuthoritative({
        ...g.authoritativeCheckpoint(),
        contentRevision: issued,
      }),
    /versionMismatch/,
  );
});
test("Current or unknown Story snapshots cannot smuggle mutation state or reinterpret a mutation choice as Ready", () => {
  const g = new Game({ mode: "story", maxPlayers: 1 });
  g.addPlayer("solo", "Reader", "soldier");
  g.start();
  g.boss.health = 0;
  g.step();
  const save = clone(g.offlineCheckpoint()!);
  for (const tampered of [
    {
      ...save,
      phase: "mutationVote",
      phaseEnds: save.tick + 450,
      mutationCards: data.mutations.slice(0, 3).map((m) => m.id),
    },
    { ...save, mutations: [{ id: data.mutations[0].id, remaining: 3 }] },
    { ...save, mutationCards: data.mutations.slice(0, 3).map((m) => m.id) },
  ])
    assert.throws(() => Game.restoreOffline(tampered));
  assert.throws(
    () =>
      Game.restoreOffline({
        ...save,
        contentRevision: "0".repeat(64),
        phase: "mutationVote",
      }),
    /versionMismatch/,
  );
  const authority = clone(g.authoritativeCheckpoint()!);
  authority.mutations = [{ id: data.mutations[0].id, remaining: 3 }];
  assert.throws(() => Game.restoreAuthoritative(authority));
});
