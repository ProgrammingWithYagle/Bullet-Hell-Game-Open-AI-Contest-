import {issuedAtOrBefore73}from'./helpers/issued73-preservation.ts';
import { Game, data } from "../src/shared/game.ts";
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
let serial = 0;
const previous =
  "76410d1cca4ce1874da61acf3fefa6c359720b62452411c172b2b4f86f788de2";
const records = (): PracticeCampaignRecord[] =>
  implementedClassIds.map((classId) => ({
    schemaVersion: 1,
    id: "issued71-" + classId,
    practiceOnly: true,
    verified: false,
    contentRevision: previous,
    protocol: 71,
    mode: "short",
    difficulty: "normal",
    classId,
    completedEncounters: 5,
    accords: 0,
    combatTicks: 6000,
    secret: "locked",
    memorial: false,
  }));

test("issued71profiles preserve all twelve disciplines, both HUD layouts, remapped controls and historical local records", () => {
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
      runId: "issued71-run-" + classId,
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

test("issued71records retain exact historical identity while wrong editions and verified claims remain excluded", () => {
  const kept = records(),
    raw = JSON.stringify([
      ...kept,
      ...[47, 69, 70, 72].map((protocol) => ({
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
        r.protocol === 71 &&
        r.contentRevision === previous &&
        r.verified === false &&
        r.practiceOnly,
    ),
  );
});

test("exact issued71 local checkpoints preserve all twelve class identities and actual old ownership, including the issued Sniper capstone, without acquiring a new Heavy handling", () => {
  for (const classId of implementedClassIds) {
    const g = new Game({ mode: "endless" });
    g.encounter = 9;
    const p = g.addPlayer("solo", "Issued71", classId);
    if (classId === "soldier")
      for (const item of [
        "soldier-ballistics-1",
        "soldier-sniper-1",
        "soldier-sniper-carry-1",
        "soldier-sniper-bore-1",
        "soldier-sniper-rest-1",
        "soldier-sniper-withdrawal-1",
        "general-sprint",
        "general-brake-step",
        "general-course-correction",
      ]) {
        const result = g.transact(p.id, { id: item, kind: "skill", item });
        assert(result.ok, item + ":" + result.reason);
      }
    if (classId === "heavy")
      for (const item of [
        "heavy-ordnance-1",
        "heavy-flak-1",
        "heavy-flak-compact-1",
        "heavy-flak-command-1",
        "heavy-flak-seam-1",
        "general-sprint",
        "general-double-dash",
        "general-brake-step",
        "general-course-correction",
      ]) {
        const result = g.transact(p.id, { id: item, kind: "skill", item });
        assert(result.ok, item + ":" + result.reason);
      }
    const save = {
        ...g.offlineCheckpoint()!,
        protocolVersion: 71,
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
      !copy.players
        .get("solo")!
        .skills.some((id) =>
          ["heavy-traverse-keyed-1", "heavy-traverse-open-1"].includes(id),
        ),
    );
  }
});

test("issued71 rejects future Clutch handling ownership and wrong/online envelopes before current-edition restoration", () => {
  const g = new Game({ mode: "endless" });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Issued71", "heavy");
  for (const item of ["heavy-ordnance-1", "general-sprint"])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  const old = {
    ...g.offlineCheckpoint()!,
    protocolVersion: 71,
    contentRevision: previous,
  };
  for (const id of ["heavy-traverse-keyed-1", "heavy-traverse-open-1"]) {
    const future = structuredClone(old);
    future.player.skills.push(id);
    assert.throws(() => Game.restoreOffline(future), /versionMismatch/);
  }
  for (const patch of [
    { protocolVersion: 70 },
    { protocolVersion: 72 },
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
test("exact issued71 admits every one of the sixty-one issued techniques with its actual affordable prerequisite ownership", () => {
  const oldNodes = data.specializationSkills.filter(issuedAtOrBefore73).filter(
    (s) => !["heavy-traverse-lanyard-1","heavy-traverse-keyed-1", "heavy-traverse-open-1"].includes(s.id),
  );
  assert.equal(oldNodes.length, 61);
  const all = [
    ...data.skills,
    ...data.generalSkills,
    ...data.specializationSkills,
  ];
  for (const leaf of oldNodes) {
    const g = new Game({ mode: "endless" });
    g.encounter = 9;
    const p = g.addPlayer("solo", "Issued71", leaf.classId as any),
      chain: string[] = [];
    let next: string | null = leaf.id;
    while (next) {
      const node = all.find((s) => s.id === next)!;
      assert(node, next);
      chain.unshift(node.id);
      next = node.prerequisite;
      assert(chain.length < 30);
    }
    for (const item of chain) {
      const result = g.transact(p.id, {
        id: "issued71-" + ++serial,
        kind: "skill",
        item,
      });
      assert(result.ok, leaf.id + ":" + item + ":" + result.reason);
    }
    const old = {
        ...g.offlineCheckpoint()!,
        protocolVersion: 71,
        contentRevision: previous,
      },
      restored = Game.restoreOffline(old),
      q = restored.players.get("solo")!;
    assert.deepEqual(q.skills, p.skills, leaf.id);
    assert.equal(q.classId, p.classId);
    assert.equal(q.totalSp, p.totalSp);
    assert(
      !q.skills.some((id) =>
        ["heavy-traverse-keyed-1", "heavy-traverse-open-1"].includes(id),
      ),
    );
  }
});

test("known69and70content cannot fall through to protocol47 historical roster admission; every exact class row remains portable", () => {
  for (const [protocol, contentRevision] of [
    [69, "df1b63cc4adf21486fe0e142275b7b7634798f274f6e11de6f737ea0340feb28"],
    [70, "f28e23fd7430e62d25e262869eadc77f945e62f821c473c638a9b8faefcef589"],
    [71, "76410d1cca4ce1874da61acf3fefa6c359720b62452411c172b2b4f86f788de2"],
  ] as const) {
    const valid = records().map((r) => ({
      ...r,
      id: "history-" + protocol + "-" + r.classId,
      protocol,
      contentRevision,
    }));
    const raw = JSON.stringify([
      ...valid,
      ...valid.map((r) => ({ ...r, id: r.id + "-wrong47", protocol: 47 })),
    ]);
    const kept = practiceRecords({
      getItem: () => raw,
      setItem: () => assert.fail("Reading cannot rewrite"),
    });
    assert.deepEqual(kept, valid);
  }
});
