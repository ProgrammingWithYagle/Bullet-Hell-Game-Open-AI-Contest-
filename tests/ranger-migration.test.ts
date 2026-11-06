import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { CONTENT_REVISION, PROTOCOL } from "../src/shared/protocol.ts";
import {
  freshProfile,
  parseProfile,
  summary,
  type RunReceipt,
} from "../src/client/profile.ts";
import {
  practiceRecords,
  type PracticeCampaignRecord,
} from "../src/client/progress.ts";
const issued =
  "f099f438f83d4f79da2fd18bc8cd680e3e8616e5febb50d7b78609b47d09bb32";
test("The exact issued ten-class local chapter keeps its Summoner identity and empty proof state, while a new class or authoritative import stays strict", () => {
  const g = new Game({ mode: "story" });
  g.addPlayer("p", "Joss", "summoner");
  const saved = g.offlineCheckpoint()!;
  saved.protocolVersion = 48;
  saved.contentRevision = issued;
  const restored = Game.restoreOffline(structuredClone(saved));
  assert.equal(restored.players.get("solo")!.classId, "summoner");
  assert.deepEqual(restored.trainingFor("solo"), g.trainingFor("p"));
  assert.equal(restored.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
  assert.equal(PROTOCOL,66);
  const forged = structuredClone(saved);
  forged.player.classId = "ranger";
  assert.throws(() => Game.restoreOffline(forged));
  const unknown = structuredClone(saved);
  unknown.contentRevision = "f".repeat(64);
  assert.throws(() => Game.restoreOffline(unknown));
  assert.throws(() =>
    Game.restoreAuthoritative({
      ...g.authoritativeCheckpoint(),
      contentRevision: issued,
    }),
  );
});
test("Issued Summoner profile receipts survive without gaining Ranger clears, and their historical revision cannot carry a newly invented class", () => {
  const p = freshProfile();
  p.contentRevision = issued;
  const receipt: RunReceipt = {
    runId: "joss",
    playerId: "p",
    mode: "endless",
    difficulty: "normal",
    classId: "summoner",
    clears: 1,
    rescues: 0,
    firstEncounter: 0,
    campaignClears: 0,
    bossIds: ["constable"],
    teamClears: 1,
    combatTicks: 900,
    fullCampaign: false,
    memorial: false,
  };
  p.runs = [receipt];
  const migrated = parseProfile(JSON.stringify(p));
  assert.deepEqual(migrated.runs, [receipt]);
  assert.equal(summary(migrated).classes.summoner.clears, 1);
  assert.equal(summary(migrated).classes.ranger.clears, 0);
  const forged = structuredClone(p);
  forged.runs[0].classId = "ranger";
  assert.throws(() => parseProfile(JSON.stringify(forged)));
});
test("Retained protocol48 clear records use their issued ten-class roster and original bytes, while current Ranger clears use the new revision", () => {
  const current: PracticeCampaignRecord = {
    schemaVersion: 1,
    id: "new-ranger",
    practiceOnly: true,
    verified: false,
    contentRevision: CONTENT_REVISION,
    protocol: PROTOCOL,
    mode: "short",
    difficulty: "normal",
    classId: "ranger",
    completedEncounters: 5,
    accords: 0,
    combatTicks: 5000,
    secret: "locked",
    memorial: false,
  };
  const old = {
    ...current,
    id: "old-summoner",
    protocol:48,
    contentRevision: issued,
    classId: "summoner" as const,
  };
  const raw = JSON.stringify([
    old,
    current,
    { ...old, id: "invented", classId: "ranger" },
    { ...old, id: "wrong-protocol", protocol: 47 },
  ]);
  const rows = practiceRecords({
    getItem: () => raw,
    setItem: () => assert.fail("Read must not rewrite historical evidence"),
  });
  assert.deepEqual(
    rows.map((r) => r.id),
    ["old-summoner", "new-ranger"],
  );
  assert.equal(rows[0].contentRevision, issued);
  assert.equal(rows[0].protocol, 48);
});
