// Native execution of exact HTTP-served bytes; no browser or rendered acceptance.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Worker } from "node:worker_threads";
import { Game } from "../src/shared/game.ts";
import { builderIds as ids } from "../src/shared/engineer-builder.ts";
import { idleInput, PROTOCOL } from "../src/shared/protocol.ts";
const [audience, scope] = process.argv.slice(2);
assert(["testing", "public"].includes(audience));
assert(/^reviews\/[a-z0-9-]+$/.test(scope ?? ""));
const preview = JSON.parse(
    fs.readFileSync(scope + "/preview-" + audience + ".json", "utf8"),
  ),
  manifest = JSON.parse(fs.readFileSync(preview.manifestPath, "utf8"));
assert.equal(preview.protocol, PROTOCOL);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex"),
  load = async (member: any) => {
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
  ids.entry,
  ids.redoubt,
  "data-specialization-route",
  "engineer-builder-work",
  "engineer-build",
  "engineer-hinge",
  "engineer-fortify",
])
  assert(main.includes(Buffer.from(marker)), marker);
for (const marker of [
  ".pathway-route-picker",
  ".specialization-sheet",
  ".reading-view",
])
  assert(css.includes(Buffer.from(marker)), marker);
const art = JSON.parse(
    fs.readFileSync(
      "assets/production/ui/engineer-tree-2026-11-03/provenance.json",
      "utf8",
    ),
  ),
  artRows = [];
for (const item of art.assets.filter((a: any) =>
  a.id.startsWith("engineer-builder-"),
)) {
  const member = manifest.members.find(
    (m: any) =>
      m.path.startsWith("assets/" + item.id + "-") && m.path.endsWith(".png"),
  );
  assert.equal(sha(await load(member)), item.sha256);
  artRows.push({ id: item.id, path: member.path, sha256: item.sha256 });
}
assert.equal(artRows.length, 8);
const health = await fetch(preview.endpoint + "/api/health").then((r) =>
  r.json(),
);
assert.equal(health.sourceCommit, preview.sourceCommit);
assert.equal(health.protocolVersion, PROTOCOL);
assert.equal(health.contentRevision, preview.contentRevision);
const g = new Game({
  mode: "endless",
  difficulty: "baby",
  maxPlayers: 1,
  seed: 41,
  arenaSelection: "fixed",
  openingArenaId: "gatehouse",
});
g.encounter = 9;
g.addPlayer("solo", "Tamsin", "engineer");
for (const item of ["engineer-constructs-1", ids.entry])
  assert(g.transact("solo", { id: item, kind: "skill", item }).ok);
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
  error: any,
  sequence = 0;
const purchases = new Map<string, boolean>(),
  sounds = new Set<string>();
worker.on("error", (e) => (error = e));
worker.on("message", (m) => {
  if (m.type === "ready") ready = true;
  if (m.type === "view") view = m.view;
  if (m.type === "error") error = m;
  if (m.type === "purchaseResult") purchases.set(m.id, m.ok);
  if (m.type === "events")
    for (const e of m.events) if (e.type === "sound") sounds.add(e.id);
});
const wait = async (check: () => boolean, label: string) => {
  const deadline = Date.now() + 12000;
  while (!check()) {
    assert(!error, JSON.stringify(error));
    assert(
      Date.now() < deadline,
      label + " phase=" + view?.phase + " health=" + view?.players?.[0]?.health,
    );
    await new Promise((r) => setTimeout(r, 8));
  }
};
const input = (extra: Record<string, unknown>) =>
  worker.postMessage({
    type: "input",
    input: { ...idleInput(), sequence: ++sequence, ...extra },
  });
try {
  await wait(() => ready, "worker readiness");
  worker.postMessage({ type: "resume", value: boundary });
  await wait(() => !!view, "owned boundary");
  for (const item of [
    ids.longspan,
    ids.hinge,
    ids.repair,
    ids.linked,
    ids.survey,
    ids.redoubt,
    "general-sprint",
    "general-brake-step",
  ]) {
    worker.postMessage({
      type: "purchase",
      request: { id: item, kind: "skill", item },
    });
    await wait(() => purchases.has(item), "purchase " + item);
    assert(purchases.get(item));
  }
  assert.equal(view.players[0].sp, 0);
  for (let n = 0; n < 3; n++) {
    const id = "coat-" + n;
    worker.postMessage({
      type: "purchase",
      request: { id, kind: "upgrade", item: "health" },
    });
    await wait(() => purchases.has(id), "protective coat");
    assert(purchases.get(id));
  }
  worker.postMessage({ type: "start" });
  await wait(() => view.phase === "combat", "combat");
  input({ aim: -Math.PI / 2, q: true });
  await wait(
    () => view.classCues.some((c: any) => c.kind === "wall" && c.builder),
    "visible owned assembly",
  );
  const original = view.classCues.find(
    (c: any) => c.kind === "wall" && c.builder,
  );
  assert.equal(original.halfSpan, 190);
  assert(original.buildingUntil > original.buildingAt);
  await wait(() => view.combatTick >= original.buildingUntil, "braced screen");
  input({ aim: -Math.PI / 4, technique1: true });
  await wait(
    () => view.classCues.some((c: any) => c.kind === "engineer-builder-plan"),
    "committed relocation",
  );
  worker.postMessage({ type: "pause", value: true });
  await new Promise((r) => setTimeout(r, 35));
  const paused = view.combatTick,
    ack = view.players[0].ack;
  input({ technique2: true, ultimate: true, moveX: 1 });
  await new Promise((r) => setTimeout(r, 65));
  assert.equal(view.combatTick, paused);
  worker.postMessage({ type: "pause", value: false });
  await wait(
    () =>
      view.combatTick > paused + 3 &&
      !view.classCues.some((c: any) => c.kind === "engineer-builder-plan"),
    "rebraced destination",
  );
  const moved = view.classCues.find((c: any) => c.id === original.id);
  assert(moved);
  assert.equal(moved.until, original.until);
  assert(moved.health <= original.health);
  assert(moved.x !== original.x || moved.y !== original.y);
  assert.equal(view.players[0].ack, ack);
  assert.equal(view.players[0].kit.technique2At, 0);
  assert(!view.classCues.some((c: any) => c.kind === "siege"));
  input({ aim: -Math.PI / 2, ultimate: true });
  await wait(
    () =>
      view.classCues.filter(
        (c: any) => c.kind === "wall" && c.linkedSiege !== undefined,
      ).length === 3,
    "actual redoubt",
  );
  const fort = view.classCues.filter(
    (c: any) => c.kind === "wall" && c.linkedSiege !== undefined,
  );
  assert(
    view.classCues.some(
      (c: any) => c.kind === "siege" && c.id === fort[0].linkedSiege,
    ),
  );
  await wait(
    () => view.combatTick >= fort[0].buildingUntil,
    "redoubt assembly",
  );
  assert.equal(view.players[0].kit.builderGroups, 1);
  assert.equal(view.players[0].kit.builderGroupCapacity, 2);
  assert(view.players[0].ultimateAt > view.combatTick);
  assert(
    sounds.has("engineer-build") &&
      sounds.has("engineer-hinge") &&
      sounds.has("engineer-fortify"),
  );
  for (const cue of view.classCues)
    for (const key of [
      "damage",
      "fireAt",
      "interval",
      "members",
      "repairs",
      "groups",
    ])
      assert(!Object.hasOwn(cue, key));
  const report = {
    passed: true,
    checkedAt: new Date().toISOString(),
    audience,
    sourceCommit: preview.sourceCommit,
    protocol: PROTOCOL,
    files: { worker: workerFile, main: mainFile, css: cssFile },
    builderArt: artRows,
    actualPurchases: 8,
    spentSP: 27,
    actualDelayedAssembly: true,
    actualCommittedRelocation: true,
    immutableLifetime: true,
    pausedInputDiscarded: true,
    actualLinkedRedoubt: true,
    originalSiegeRetained: true,
    groupCapacitySeparateFromPanels: true,
    sounds: [...sounds].filter((s) => s.startsWith("engineer-")),
    limits: [
      "Exact HTTP-served optimized worker, Baby with legitimately purchased protective gear; no testing command, altered worker clock or online proof.",
      "Repair completion, two-Q-group capacity, owner cleanup and pause/late-observer ownership have separate shared-controller and real-peer tests. This short served-worker probe does not claim those actions were observed here.",
      "No browser/rendered/device/human enjoyment/native-language/listening/motion/final-balance acceptance.",
    ],
  };
  fs.writeFileSync(
    scope + "/builder-smoke-" + audience + ".json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: true,
      audience,
      sourceCommit: preview.sourceCommit,
      protocol: PROTOCOL,
      actualRelocationAndRedoubt: true,
      workerSha256: workerFile.sha256,
    }),
  );
} finally {
  await worker.terminate();
}
