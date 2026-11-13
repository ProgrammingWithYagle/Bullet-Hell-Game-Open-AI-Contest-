import test from "node:test";
import assert from "node:assert/strict";
import {
  practiceRecords,
  PRACTICE_RECORDS_KEY,
  type PracticeCampaignRecord,
} from "../src/client/progress.ts";
import { CONTENT_REVISION, PROTOCOL } from "../src/shared/protocol.ts";

test("Issued local clears retain their exact version and original roster; a past envelope cannot invent a new class or Campaign proof", () => {
  const current: PracticeCampaignRecord = {
    schemaVersion: 1,
    id: "current",
    practiceOnly: true,
    verified: false,
    contentRevision: CONTENT_REVISION,
    protocol: PROTOCOL,
    mode: "short",
    difficulty: "normal",
    classId: "summoner",
    completedEncounters: 5,
    accords: 0,
    combatTicks: 5000,
    secret: "locked",
    memorial: false,
  };
  const sword = {
    ...current,
    id: "sword-issued",
    protocol: 47,
    contentRevision:
      "e74efafe14d4694ef9afd8ea6df038c3fd0e697e4b6d5039f9a6d70173c8b6bd",
    classId: "swordsman" as const,
  };
  const bard = {
    ...sword,
    id: "bard-issued",
    contentRevision:
      "85c266d3bbb2457910b5237bbab3769bd1ada06014d39ded5eefe5854e5392cb",
    classId: "bard" as const,
  };
  const opening = {
    ...sword,
    id: "opening-issued",
    contentRevision:
      "5b8c858463c86d7e5d2fb70a547dd95ddcb5c38e20be547c39c4f1707e31e779",
    classId: "soldier" as const,
  };
  const rows = [
    current,
    sword,
    bard,
    opening,
    { ...sword, id: "invented-summoner", classId: "summoner" },
    { ...bard, id: "invented-sword", classId: "swordsman" },
    { ...opening, id: "invented-bard", classId: "bard" },
    { ...sword, id: "wrong-pair", protocol: 48 },
    { ...current, id: "wrong-current", protocol: 47 },
    { ...current, id: "unknown", contentRevision: "f".repeat(64) },
  ];
  const raw = JSON.stringify(rows),
    store = {
      getItem: (key: string) => (key === PRACTICE_RECORDS_KEY ? raw : null),
      setItem: () => assert.fail("Reading must not mutate historical records"),
    };
  assert.deepEqual(
    practiceRecords(store).map((r) => r.id),
    ["current", "sword-issued", "bard-issued", "opening-issued"],
  );
  assert.equal(practiceRecords(store)[1].protocol, 47);
  assert(
    practiceRecords(store).every((r) => r.verified === false && r.practiceOnly),
  );
  assert(!JSON.stringify(practiceRecords(store)).includes("training"));
});
