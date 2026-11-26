import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Session } from "../src/client/session.ts";
import { idleInput } from "../src/shared/protocol.ts";
import motion from "../assets/delivery/survivor-motion-v1/library.json" with { type: "json" };
import portraits from "../assets/delivery/selection-portraits-v1/library.json" with { type: "json" };
import items from "../assets/production/items/library.json" with { type: "json" };
const [audience, scope] = process.argv.slice(2);
assert(["testing", "public"].includes(audience));
assert(/^reviews\/[a-z0-9-]+$/.test(scope));
const manifest = JSON.parse(
  fs.readFileSync(scope + "/preview-" + audience + ".json", "utf8"),
);
const files = JSON.parse(fs.readFileSync(manifest.manifestPath, "utf8"))
  .members as { path: string; sha256: string }[];
const wait = async (check: () => boolean, label: string) => {
  const end = Date.now() + 10000;
  while (!check()) {
    assert(Date.now() < end, label);
    await new Promise((r) => setTimeout(r, 15));
  }
};
const sampled = [
  ...[
    "ranger-run-south",
    "ranger-attack-east",
    "ranger-attack-north",
    "ranger-downed-west",
  ].map((id) => motion.entries.find((e) => e.id === id)!.atlasSha256),
  portraits.entries.find((e) => e.classId === "ranger")!.imageSha256,
  ...["ranger-0", "ranger-arrow-bundle", "fieldcraft-path-2"].map(
    (id) => items.entries.find((e) => e.itemId === id)!.atlasSha256,
  ),
];
const a = new Session(manifest.endpoint),
  b = new Session(manifest.endpoint),
  late = new Session(manifest.endpoint),
  story = new Session(manifest.endpoint);
try {
  for (const hash of sampled) {
    const f = files.find((f) => f.sha256 === hash);
    assert(f);
    const r = await fetch(new URL(f.path, manifest.url));
    assert(r.ok);
    assert.equal(
      createHash("sha256")
        .update(Buffer.from(await r.arrayBuffer()))
        .digest("hex"),
      hash,
    );
  }
  const options = {
    name: "Nela review",
    classId: "ranger" as const,
    mode: "raid" as const,
    difficulty: "normal",
  };
  await a.connect(options);
  await b.connect(
    { ...options, name: "Ranger partner" },
    { roomId: a.room!.roomId, kind: "freeplay" },
  );
  await wait(() => b.view?.players.length === 2, "Ranger roster missing");
  assert(
    b.view!.players.every(
      (p) =>
        p.weapon === "ranger-0" &&
        p.sp === 12 &&
        p.kit.rangerQuiverCapacity === 10,
    ),
  );
  a.purchase({ kind: "skill", item: "ranger-fieldcraft-1" });
  await wait(
    () =>
      b.view?.players.some(
        (p) => p.id === a.id && p.skills.includes("ranger-fieldcraft-1"),
      ) === true,
    "Ranger owned SP purchase missing",
  );
  assert.equal(b.view!.players.find((p) => p.id === b.id)!.sp, 12);
  a.start();
  await wait(() => b.view?.phase === "combat", "Ranger combat missing");
  let sequence = 1;
  a.input({ ...idleInput(), sequence: sequence++, aim: 0, q: true });
  await wait(
    () =>
      (b.view?.players.find((p) => p.id === a.id)?.kit.rangerDrawUntil ?? 0) >
      b.view!.combatTick,
    "Committed draw missing",
  );
  const draw = b.view!.classCues.find(
    (c) => c.owner === a.id && c.kind === "ranger-draw",
  );
  assert(draw && draw.kind === "ranger-draw");
  assert.equal(draw.aim, 0);
  a.input({ ...idleInput(), sequence: sequence++, aim: Math.PI / 2 });
  await wait(
    () => b.view?.players.find((p) => p.id === a.id)?.kit.rangerDrawUntil === 0,
    "Draw did not release",
  );
  assert.equal(b.view!.players.find((p) => p.id === a.id)!.ammo, 9);
  assert.equal(b.view!.players.find((p) => p.id === b.id)!.ammo, 10);
  for (let i = 0; i < 16; i++) {
    a.input({
      ...idleInput(),
      sequence: sequence++,
      aim: -Math.PI + (i * Math.PI) / 8,
      e: true,
    });
    await new Promise((r) => setTimeout(r, 70));
    if ((b.view?.players.find((p) => p.id === a.id)?.kit.rangerTraps ?? 0) > 0)
      break;
  }
  await wait(
    () => b.view?.players.find((p) => p.id === a.id)?.kit.rangerTraps === 1,
    "Legal placed cable missing",
  );
  a.input({ ...idleInput(), sequence: sequence++, aim: 0, ultimate: true });
  await wait(
    () =>
      (b.view?.players.find((p) => p.id === a.id)?.kit.rangerSurveyCharges ??
        0) > 0,
    "Legal Survey positions missing",
  );
  const charges = b.view!.players.find((p) => p.id === a.id)!.kit
      .rangerSurveyCharges!,
    points = b.view!.classCues.filter(
      (c) => c.owner === a.id && c.kind === "ranger-survey",
    );
  assert(charges === 3 || charges === 6);
  assert.equal(points.length, charges / 3);
  assert.equal(b.view!.players.find((p) => p.id === b.id)!.kit.rangerTraps, 0);
  assert.equal(
    b.view!.players.find((p) => p.id === b.id)!.kit.rangerSurveyCharges,
    0,
  );
  a.setMatchPaused(true);
  await wait(() => b.view?.matchPaused === true, "Ranger pause missing");
  const before = JSON.stringify({
    tick: b.view!.combatTick,
    cues: b.view!.classCues,
    ammo: b.view!.players.find((p) => p.id === a.id)!.ammo,
  });
  a.input({
    ...idleInput(),
    sequence: sequence++,
    aim: 0,
    fire: true,
    q: true,
    e: true,
    ultimate: true,
  });
  await new Promise((r) => setTimeout(r, 180));
  assert.equal(
    JSON.stringify({
      tick: b.view!.combatTick,
      cues: b.view!.classCues,
      ammo: b.view!.players.find((p) => p.id === a.id)!.ammo,
    }),
    before,
  );
  await late.connect(
    { ...options, name: "Late observer", classId: "soldier" },
    { roomId: a.room!.roomId, kind: "freeplay" },
  );
  await wait(
    () => late.view?.players.length === 3 && late.view.matchPaused === true,
    "Ranger late observer missing",
  );
  assert.equal(
    late.view!.players.find((p) => p.id === a.id)!.kit.rangerSurveyCharges,
    charges,
  );
  assert(
    late.view!.classCues.some(
      (c) => c.owner === a.id && c.kind === "ranger-trap",
    ),
  );
  await a.close();
  await wait(
    () => b.view?.classCues.every((c) => c.owner !== a.id) === true,
    "Ranger disconnect ground retained",
  );
  await b.close();
  await late.close();
  await story.connect({ ...options, mode: "story" });
  await wait(() => story.view?.players.length === 1, "Ranger chapter missing");
  const p = story.view!.players[0];
  assert(story.view!.chapter);
  assert.equal(p.sp, 0);
  assert.equal(p.training?.characterId, "nela-venn");
  assert.equal(p.training?.proofs.length, 0);
  const receipt = {
    checkedAt: new Date().toISOString(),
    passed: true,
    audience,
    sourceCommit: manifest.sourceCommit,
    endpoint: manifest.endpoint,
    actualHttpArtSamples: sampled.length,
    peers: 3,
    ownerOnlySpPurchase: true,
    finiteQuiverReservation: true,
    committedDrawCue: true,
    actualOwnedCable: true,
    actualSurveyPositions: points.length,
    actualSurveyCharges: charges,
    pauseFreezesGroundDrawAndAmmo: true,
    lateObserverReceivesPreparedGround: true,
    disconnectClearsOwnership: true,
    storySpZero: true,
    storyCharacterIdentity: true,
    noFabricatedProof: true,
    probeRoomsClosed: true,
    limits: [
      "Frozen asset/entry/commitment/ground/ownership/pause/observer/cleanup checks. Actual useful damage, swept contacts, spent charges and earned ordinary proofs are separate source/Game/network checks.",
      "No rendered clients, listening, device, native-language, personal clears or final balance acceptance.",
    ],
  };
  await story.close();
  fs.writeFileSync(
    scope + "/ranger-smoke-" + audience + ".json",
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(JSON.stringify(receipt));
} finally {
  await Promise.allSettled([a.close(), b.close(), late.close(), story.close()]);
}
