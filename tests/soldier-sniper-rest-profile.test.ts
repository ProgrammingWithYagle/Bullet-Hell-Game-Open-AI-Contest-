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
  "dc74b9f4d60656db95f0ccaac4b73cda247cc9834370ddbc21df222fcd76e8b9";
const records = (): PracticeCampaignRecord[] =>
  implementedClassIds.map((classId) => ({
    schemaVersion: 1,
    id: "issued64-" + classId,
    practiceOnly: true,
    verified: false,
    contentRevision: previous,
    protocol: 64,
    mode: "short",
    difficulty: "normal",
    classId,
    completedEncounters: 5,
    accords: 0,
    combatTicks: 6000,
    secret: "locked",
    memorial: false,
  }));

test("issued64profiles preserve all twelve disciplines, both HUD layouts, remapped controls and historical local records", () => {
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
      runId: "issued64-run-" + classId,
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

test("issued64records retain exact historical identity while wrong editions and verified claims remain excluded", () => {
  const kept = records(),
    raw = JSON.stringify([
      ...kept,
      ...[62, 63, 65].map((protocol) => ({
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
        r.protocol === 64 &&
        r.contentRevision === previous &&
        r.verified === false &&
        r.practiceOnly,
    ),
  );
});
