import test from "node:test";
import assert from "node:assert/strict";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { Game } from "../src/shared/game.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
const issued =
  "7266df2511e22b94f34915a97c0b4a61e2881778de5cfddff4011a41c2f29fe2";
test("exact issued35 Practice/profile state migrates to the current protocol without changing builds, form history, resources or preferences", () => {
  const g = createPracticeGame(
    { mode: "endless", openingBossId: "bellringer", seed: 829 },
    "Mara",
    "soldier",
    "crazed",
  );
  const save = g.offlineCheckpoint()!,
    old = structuredClone(save);
  old.protocolVersion = 35;
  old.contentRevision = issued;
  const restored = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 41);
  assert.notEqual(CONTENT_REVISION, issued);
  assert.equal(restored.protocolVersion, PROTOCOL);
  assert.equal(restored.contentRevision, CONTENT_REVISION);
  assert.deepEqual(restored.player, save.player);
  assert.deepEqual(restored.completedBossForms, save.completedBossForms);
  assert.deepEqual(restored.selectedContract, save.selectedContract);
  for (const bad of [
    { ...old, contentRevision: "f".repeat(64) },
    { ...old, contentRevision: CONTENT_REVISION },
    { ...old, serverOnly: true },
    { ...old, practiceOnly: false },
    { ...old, players: [] },
    { ...old, transactions: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad), /versionMismatch/);
  const p = freshProfile();
  p.contentRevision = issued;
  p.settings.showNames = false;
  p.settings.roomChat = false;
  const next = parseProfile(JSON.stringify(p));
  assert.equal(next.contentRevision, CONTENT_REVISION);
  assert.deepEqual(next.settings, p.settings);
  assert.deepEqual(next.controls, p.controls);
});
