// Exact HTTP-served workbook and optimized Solo worker; no browser/rendered acceptance.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Worker } from "node:worker_threads";
import { Game } from "../src/shared/game.ts";
import { idleInput, PROTOCOL } from "../src/shared/protocol.ts";
const [audience, scope] = process.argv.slice(2);
assert(["testing", "public"].includes(audience));
assert(/^reviews\/[a-z0-9-]+$/.test(scope ?? ""));
const preview = JSON.parse(
    fs.readFileSync(scope + "/preview-" + audience + ".json", "utf8"),
  ),
  manifest = JSON.parse(fs.readFileSync(preview.manifestPath, "utf8"));
assert.equal(preview.protocol, PROTOCOL);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const load = async (member: any) => {
  assert(member);
  const response = await fetch(new URL(member.path, preview.url));
  assert(response.ok);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(sha(bytes), member.sha256);
  return bytes;
};
const workerFile = manifest.members.find((m: any) =>
    /offline\.worker-.*\.js$/.test(m.path),
  ),
  mainFile = manifest.members.find((m: any) => /\/index-.*\.js$/.test(m.path)),
  cssFile = manifest.members.find((m: any) => /\/index-.*\.css$/.test(m.path));
const bytes = await load(workerFile),
  main = await load(mainFile),
  css = await load(cssFile);
for (const marker of [
  "foundation-workbook",
  "data-foundation-mode",
  "general-brake-step",
  "general-course-correction",
  'data-specialization-zoom',
  'ui.treeFit',
])
  assert(main.includes(Buffer.from(marker)), marker);
for (const marker of [
  ".foundation-workbook",
  ".shared-technique",
  ".foundation-reading",
  ".specialization-sheet",
])
  assert(css.includes(Buffer.from(marker)), marker);
const health = await fetch(preview.endpoint + "/api/health").then((r) =>
  r.json(),
);
assert.equal(health.sourceCommit, preview.sourceCommit);
assert.equal(health.protocolVersion, PROTOCOL);
assert.equal(health.contentRevision, preview.contentRevision);
const g = new Game({
  mode: "endless",
  seed: 41,
  maxPlayers: 1,
  arenaSelection: "fixed",
  openingArenaId: "gatehouse",
});
g.encounter = 9;
g.addPlayer("solo", "Runner", "soldier");
const boundary = g.offlineCheckpoint()!;
assert(Game.restoreOffline(structuredClone(boundary)));
const bridge =
  "import {parentPort} from 'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
  bytes.toString("utf8") +
  "\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});";
const worker = new Worker(
  new URL(
    "data:text/javascript;base64," + Buffer.from(bridge).toString("base64"),
  ),
  { execArgv: [] },
);
let ready = false,
  view: any,
  error: any;
const purchases = new Map<string, boolean>();
worker.on("error", (e) => (error = e));
worker.on("message", (m) => {
  if (m.type === "ready") ready = true;
  if (m.type === "view") view = m.view;
  if (m.type === "error") error = m;
  if (m.type === "purchaseResult") purchases.set(m.id, m.ok);
});
const wait = async (check: () => boolean, label: string) => {
  const end = Date.now() + 10000;
  while (!check()) {
    assert(!error, String(error));
    assert(Date.now() < end, label);
    await new Promise((r) => setTimeout(r, 2));
  }
};
try {
  await wait(() => ready, "worker ready");
  worker.postMessage({ type: "resume", value: boundary });
  await wait(() => !!view, "local boundary");
  for (const item of [
    "general-sprint",
    "general-course-correction",
    "general-brake-step",
  ]) {
    worker.postMessage({
      type: "purchase",
      request: { id: item, kind: "skill", item },
    });
    await wait(() => purchases.has(item), item);
    assert.equal(purchases.get(item), true);
  }
  worker.postMessage({ type: "start" });
  await wait(() => view.phase === "combat", "combat");
  const input = (sequence: number, values: Record<string, unknown>) =>
    worker.postMessage({
      type: "input",
      input: { ...idleInput(), sequence, ...values },
    });
  input(1, { dodge: true, moveX: 1 });
  await wait(() => view.players[0].dodgeControlUntil > 0, "ordinary dodge");
  assert(view.players[0].dashUntil > view.combatTick);
  input(2, { sprint: true, moveY: 1 });
  await wait(
    () => view.players[0].dodgeSteered === true,
    "one controlled turn",
  );
  assert(view.players[0].sprintStamina < 100);
  input(3, { dodge: true });
  await wait(
    () => view.players[0].dashUntil < view.players[0].dodgeControlUntil,
    "brake",
  );
  const at = view.players[0].dodgeAt,
    controlUntil = view.players[0].dodgeControlUntil;
  worker.postMessage({ type: "pause", value: true });
  await new Promise((r) => setTimeout(r, 40));
  const tick = view.combatTick,
    x = view.players[0].x;
  input(4, { moveX: 1 });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(view.combatTick, tick);
  worker.postMessage({ type: "pause", value: false });
  await wait(() => view.combatTick > tick + 3, "resumed clock");
  assert.equal(view.players[0].ack, 3);
  assert.equal(view.players[0].x, x);
  assert.equal(view.players[0].dodgeAt, at);
  assert.equal(view.players[0].dodgeCharges, 0);
  const report = {
    passed: true,
    checkedAt: new Date().toISOString(),
    sourceCommit: preview.sourceCommit,
    protocol: PROTOCOL,
    audience,
    url: preview.url,
    actualServedWorker: workerFile.path,
    workerSha256: sha(bytes),
    mainSha256: sha(main),
    cssSha256: sha(css),
    actualOwnedPurchases: [...purchases.keys()],
    spentSP: 27 - view.players[0].sp,
    courseTurn: true,
    brakeBeforeOriginalEnd: true,
    originalDodgeDeadline: controlUntil,
    rechargeUnchanged: true,
    pausedInputDiscarded: true,
    lastAcknowledgedInput: view.players[0].ack,
    limits: [
      "Exact HTTP-served files and actual optimized worker; DOM/source/native peer evidence is separate. No browser or rendered game view.",
      "A legal late-entrant Practice boundary isolates the mechanics and budget; this is not an earned human clear or online proof.",
      "Human enjoyment, device, language, motion and final balance remain open.",
    ],
  };
  fs.writeFileSync(
    scope + "/foundation-smoke-" + audience + ".json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: true,
      sourceCommit: preview.sourceCommit,
      audience,
      sharedPurchases: purchases.size,
      turn: true,
      brake: true,
      pausedInputDiscarded: true,
    }),
  );
} finally {
  await worker.terminate();
}
