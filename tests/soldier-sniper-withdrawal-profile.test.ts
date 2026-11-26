import { Game } from "../src/shared/game.ts";
import { PROTOCOL } from "../src/shared/protocol.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  freshProfile,
  parseProfile,
  type RunReceipt,
} from "../src/client/profile.ts";
import {
  practiceRecords,
  type PracticeCampaignRecord,
} from "../src/client/progress.ts";
import {
  CONTENT_REVISION,
  implementedClassIds,
} from "../src/shared/protocol.ts";
const previous =
  "b63c012f16073da48f623c3bee255bbb42126545f831e6c9e5ce4053fabee052";
const records = (): PracticeCampaignRecord[] =>
  implementedClassIds.map((classId) => ({
    schemaVersion: 1,
    id: "issued65-" + classId,
    practiceOnly: true,
    verified: false,
    contentRevision: previous,
    protocol: 65,
    mode: "short",
    difficulty: "normal",
    classId,
    completedEncounters: 5,
    accords: 0,
    combatTicks: 6000,
    secret: "locked",
    memorial: false,
  }));

test("issued65profiles preserve all twelve disciplines, both HUD layouts, remapped controls and historical local records", () => {
  for (const layout of ["grouped", "separate"] as const) {
    const p = freshProfile();
    p.contentRevision = previous;
    p.settings.combatLayout = layout;
    p.controls.bindings.technique1 = ["KeyZ", "KeyG"];
    p.controls.bindings.technique2 = ["KeyN"];
    p.controls.bindings.reload = ["KeyT", "KeyK"];
    p.controls.gamepad.technique2 = 9;
    p.controls.gamepad.reload = 11;
    p.legacyCampaigns = records();
    p.runs = implementedClassIds.map((classId): RunReceipt => ({
      runId: "issued65-run-" + classId,
      playerId: "solo",
      mode: "short",
      difficulty: "normal",
      classId,
      clears: 1,
      rescues: 0,
      firstEncounter: 0,
      campaignClears: 0,
      bossIds: ["constable"],
      teamClears: 1,
      combatTicks: 300,
      fullCampaign: false,
      memorial: false,
    }));
    const copy = parseProfile(JSON.stringify(p));
    assert.equal(copy.contentRevision, CONTENT_REVISION);
    assert.deepEqual(copy.controls, p.controls);
    assert.deepEqual(copy.settings, p.settings);
    assert.deepEqual(copy.runs, p.runs);
    assert.deepEqual(copy.legacyCampaigns, p.legacyCampaigns);
    assert.equal(copy.practiceOnly, true);
    assert.equal(copy.verified, false);
    assert.throws(
      () => parseProfile(JSON.stringify({ ...p, verified: true })),
      /Profile/,
    );
    assert.throws(
      () =>
        parseProfile(JSON.stringify({ ...p, contentRevision: "f".repeat(64) })),
      /Profile/,
    );
  }
});

test("issued65records retain exact historical identity while wrong editions and verified claims remain excluded", () => {
  const kept = records(),
    raw = JSON.stringify([
      ...kept,
      ...[63, 64, 66].map((protocol) => ({
        ...kept[0],
        id: "wrong-edition-" + protocol,
        protocol,
      })),
      { ...kept[0], id: "online-claim", verified: true },
      { ...kept[0], id: "foreign", contentRevision: "f".repeat(64) },
    ]);
  const found = practiceRecords({
    getItem: () => raw,
    setItem: () =>
      assert.fail("Reading historical records must not rewrite them"),
  });
  assert.deepEqual(found, kept);
  assert(
    found.every(
      (r) =>
        r.protocol === 65 &&
        r.contentRevision === previous &&
        r.verified === false &&
        r.practiceOnly,
    ),
  );
});

test("exact issued65 local checkpoints preserve all twelve class identities and actual old ownership without acquiring the new capstone", () => {
  for (const classId of implementedClassIds) {
    const g = new Game({ mode: "endless" });
    g.encounter = 6;
    const p = g.addPlayer("solo", "Issued65", classId);
    if (classId === "soldier")
      for (const item of [
        "soldier-ballistics-1",
        "soldier-sniper-1",
        "soldier-sniper-carry-1",
        "soldier-sniper-bore-1",
        "soldier-sniper-rest-1",
        "general-sprint",
      ])
        assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
    const save = {
        ...g.offlineCheckpoint()!,
        protocolVersion: 65,
        contentRevision: previous,
      },
      copy = Game.restoreOffline(structuredClone(save));
    assert.deepEqual(copy.players.get("solo")!.skills, p.skills);
    assert.equal(copy.players.get("solo")!.classId, classId);
    assert.equal(copy.players.get("solo")!.ammo, p.ammo);
    assert.equal(copy.players.get("solo")!.coins, p.coins);
    assert.equal(copy.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
    assert.equal(copy.offlineCheckpoint()!.protocolVersion, PROTOCOL);
    assert(
      !copy.players.get("solo")!.skills.includes("soldier-sniper-withdrawal-1"),
    );
  }
});
test("issued65 ownership rejects the future capstone and wrong/online envelopes before ordinary current edition restoration", () => {
  const g = new Game({ mode: "endless" });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Issued65", "soldier");
  for (const item of [
    "soldier-ballistics-1",
    "soldier-sniper-1",
    "soldier-sniper-bore-1",
    "soldier-sniper-rest-1",
  ])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  const old = {
      ...g.offlineCheckpoint()!,
      protocolVersion: 65,
      contentRevision: previous,
    },
    future = structuredClone(old);
  future.player.skills.push("soldier-sniper-withdrawal-1");
  assert.throws(() => Game.restoreOffline(future), /versionMismatch/);
  for (const patch of [
    { protocolVersion: 64 },
    { protocolVersion: 66 },
    { contentRevision: "f".repeat(64) },
    { practiceOnly: false },
    { serverOnly: true },
    { players: [] },
    { transactions: [] },
  ])
    assert.throws(
      () => Game.restoreOffline({ ...old, ...patch }),
      /versionMismatch/,
    );
});
