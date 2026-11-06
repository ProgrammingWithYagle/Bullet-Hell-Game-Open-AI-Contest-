import fs from "node:fs";
import assert from "node:assert/strict";
import { Session } from "../src/client/session.ts";
import { idleInput } from "../src/shared/protocol.ts";
import survivors from "../assets/delivery/survivor-motion-v1/library.json" with { type: "json" };
import retinue from "../assets/delivery/retinue-motion-v1/library.json" with { type: "json" };
import portraits from "../assets/delivery/selection-portraits-v1/library.json" with { type: "json" };
import { createHash } from "node:crypto";

const [audience, scope] = process.argv.slice(2);
assert(["testing", "public"].includes(audience));
assert(/^reviews\/[a-z0-9-]+$/.test(scope));
const manifest = JSON.parse(
  fs.readFileSync(scope + "/preview-" + audience + ".json", "utf8"),
);
const files = JSON.parse(fs.readFileSync(manifest.manifestPath, "utf8"))
  .members as { path: string; sha256: string }[];
const a = new Session(manifest.endpoint),
  b = new Session(manifest.endpoint),
  late = new Session(manifest.endpoint),
  story = new Session(manifest.endpoint);
const wait = async (check: () => boolean, label: string) => {
  const end = Date.now() + 10000;
  while (!check()) {
    assert(Date.now() < end, label);
    await new Promise((r) => setTimeout(r, 15));
  }
};
try {
  const sampled = [
    ...survivors.entries.filter(
      (e) => e.id === "summoner-run-south" || e.id === "summoner-attack-east",
    ),
    ...retinue.entries.filter(
      (e) =>
        e.id === "retinue-hound-run-south" ||
        e.id === "retinue-wing-attack-east" ||
        e.id === "retinue-ward-downed-north",
    ),
  ].map((e) => e.atlasSha256);
  sampled.push(
    portraits.entries.find((e) => e.classId === "summoner")!.imageSha256,
  );
  for (const hash of sampled) {
    const file = files.find((f) => f.sha256 === hash);
    assert(file);
    const response = await fetch(new URL(file.path, manifest.url));
    assert(response.ok);
    const body = Buffer.from(await response.arrayBuffer());
    assert.equal(createHash("sha256").update(body).digest("hex"), hash);
  }
  const options = {
    name: "Joss review",
    classId: "summoner" as const,
    mode: "raid" as const,
    difficulty: "normal",
  };
  await a.connect(options);
  await b.connect(
    { ...options, name: "Retinue partner" },
    { roomId: a.room!.roomId, kind: "freeplay" },
  );
  await wait(() => b.view?.players.length === 2, "Summoner roster missing");
  assert(
    b.view!.players.every((p) => p.weapon === "summoner-0" && p.sp === 12),
  );
  a.purchase({ kind: "skill", item: "summoner-bonds-1" });
  await wait(
    () =>
      b.view?.players.some(
        (p) => p.id === a.id && p.skills.includes("summoner-bonds-1"),
      ) === true,
    "Owned SP purchase missing",
  );
  assert.equal(b.view!.players.find((p) => p.id === b.id)!.sp, 12);
  a.start();
  await wait(() => b.view?.phase === "combat", "Summoner combat missing");
  a.input({ ...idleInput(), sequence: 1, aim: 0, q: true, ultimate: true });
  await wait(
    () =>
      b.view?.retinue?.filter((e) => e.owner === a.id && e.health > 0)
        .length === 4,
    "Actual typed retinue missing",
  );
  assert.equal(b.view!.players.length, 2);
  assert.equal(b.view!.players.find((p) => p.id === b.id)!.kit.retinueCount, 0);
  assert.deepEqual(b.view!.retinue!.map((e) => e.kind).sort(), [
    "hound",
    "ward",
    "ward",
    "wing",
  ]);
  assert(
    b.view!.retinue!.every(
      (e) =>
        e.maxHealth > 0 && Number.isFinite(e.x) && Number.isFinite(e.actionAim),
    ),
  );
  a.orderRetinue("hold");
  await wait(
    () =>
      b.view?.players.find((p) => p.id === a.id)?.kit.retinueOrder === "hold",
    "Owned Hold missing",
  );
  assert.equal(
    b.view!.players.find((p) => p.id === b.id)!.kit.retinueOrder,
    "escort",
  );
  a.setMatchPaused(true);
  await wait(() => b.view?.matchPaused === true, "Pause missing");
  const tick = b.view!.combatTick,
    body = JSON.stringify(b.view!.retinue);
  a.orderRetinue("escort");
  await new Promise((r) => setTimeout(r, 180));
  assert.equal(b.view!.combatTick, tick);
  assert.equal(JSON.stringify(b.view!.retinue), body);
  assert.equal(
    b.view!.players.find((p) => p.id === a.id)!.kit.retinueOrder,
    "hold",
  );
  await late.connect(
    { ...options, name: "Late observer", classId: "soldier" },
    { roomId: a.room!.roomId, kind: "freeplay" },
  );
  await wait(
    () => late.view?.retinue?.length === 4,
    "Late retinue state missing",
  );
  assert(late.view!.retinue!.every((e) => e.owner === a.id));
  a.setMatchPaused(false);
  await wait(() => b.view?.matchPaused === false, "Resume missing");
  a.input({ ...idleInput(), sequence: 2, aim: 0, e: true });
  await wait(
    () =>
      (b.view?.players.find((p) => p.id === a.id)?.kit.retinueGatherUntil ??
        0) > b.view!.combatTick,
    "Gather clock missing",
  );
  await a.close();
  await wait(
    () => b.view?.retinue?.length === 0,
    "Disconnected ownership not cleared",
  );
  await b.close();
  await late.close();
  await story.connect({ ...options, mode: "story" });
  await wait(
    () => story.view?.players.length === 1,
    "Summoner chapter missing",
  );
  const p = story.view!.players[0];
  assert.equal(p.sp, 0);
  assert.equal(p.training?.characterId, "joss-merrow");
  assert.equal(p.training?.proofs.length, 0);
  assert(story.view!.chapter);
  await story.close();
  const receipt = {
    checkedAt: new Date().toISOString(),
    passed: true,
    audience,
    sourceCommit: manifest.sourceCommit,
    endpoint: manifest.endpoint,
    peers: 3,
    actualHttpArtSamples: sampled.length,
    ownedFreePlaySpPurchase: true,
    typedRetinueBodies: 4,
    actualForms: ["hound", "wing", "ward"],
    ownerOnlyOrders: true,
    pauseRejectsOrdersAndFreezesBodies: true,
    lateObserverReceivesBodies: true,
    gatherClockReplicated: true,
    disconnectClearsAllOwnership: true,
    storyCharacterIdentity: true,
    storySpZero: true,
    noFabricatedProof: true,
    probeRoomsClosed: true,
    limits: [
      "Frozen entry/art-byte/order/pause/Gather-clock/late-observer/cleanup probe. Actual attack credit, incoming hazards, arrival repair and earned ordinary proofs are covered by separate shared-authority/source-network tests.",
      "No rendered, listening, device, native-language, human-clear or final balance acceptance.",
    ],
  };
  fs.writeFileSync(
    scope + "/summoner-smoke-" + audience + ".json",
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(JSON.stringify(receipt));
} finally {
  await Promise.allSettled([a.close(), b.close(), late.close(), story.close()]);
}
