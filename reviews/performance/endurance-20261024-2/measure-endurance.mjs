// tools/measure-endurance.ts
import { fork } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { cpus, platform } from "node:os";
import assert from "node:assert/strict";
import { Client } from "@colyseus/sdk";

// src/shared/network-state.ts
import { schema, t } from "@colyseus/schema";
var PlayerState = schema(
  {
    id: t.string().default(""),
    name: t.string().default(""),
    classId: t.string().default("soldier"),
    x: t.int16().default(0),
    y: t.int16().default(0),
    aim: t.int16().default(0),
    health: t.float32().default(0),
    maxHealth: t.uint16().default(0),
    shield: t.uint16().default(0),
    status: t.string().default("waiting"),
    connected: t.boolean().default(true),
    ack: t.uint32().default(0),
    ammo: t.uint16().default(0),
    coins: t.uint32().default(0),
    sp: t.uint8().default(3),
    qAt: t.uint32().default(0),
    eAt: t.uint32().default(0),
    ultimateAt: t.uint32().default(0),
    dodgeAt: t.uint32().default(0),
    reloadAt: t.uint32().default(0),
    supplyAt: t.uint32().default(0),
    braceUntil: t.uint32().default(0),
    overdriveUntil: t.uint32().default(0),
    downUntil: t.uint32().default(0),
    reviveProgress: t.uint8().default(0),
    reviveTarget: t.string().default(""),
    build: t.string().default("{}"),
    speed: t.float32().default(225),
    dashUntil: t.uint32().default(0),
    dashX: t.float32().default(0),
    dashY: t.float32().default(-1),
    slowUntil: t.uint32().default(0),
    dodgeCooldown: t.float32().default(1)
  },
  "GravePlayer"
);
var ActorState = schema(
  {
    id: t.uint32().default(0),
    kind: t.string().default("rat"),
    x: t.float32().default(0),
    y: t.float32().default(0),
    oldX: t.float32().default(0),
    oldY: t.float32().default(0),
    health: t.float32().default(0),
    maxHealth: t.float32().default(0),
    speed: t.float32().default(0),
    radius: t.uint8().default(12),
    damage: t.float32().default(0),
    expires: t.uint32().default(0),
    attackAt: t.uint32().default(0),
    slowUntil: t.uint32().default(0),
    slowMultiplier: t.float64().default(1),
    goalX: t.float32().default(-1),
    goalY: t.float32().default(-1)
  },
  "GraveActor"
);
var WorldState = schema(
  {
    tick: t.uint32().default(0),
    combatTick: t.uint32().default(0),
    phase: t.string().default("lobby"),
    phaseEnds: t.uint32().default(0),
    encounter: t.uint32().default(0),
    owner: t.string().default(""),
    bossId: t.string().default("constable"),
    bossX: t.int16().default(800),
    bossY: t.int16().default(250),
    bossHurtAt: t.int32().default(-100),
    bossDefeatedAt: t.uint32().default(0),
    bossCastAt: t.uint32().default(0),
    bossCastReleaseAt: t.uint32().default(0),
    bossCastEndsAt: t.uint32().default(0),
    bossVulnerableUntil: t.uint32().default(0),
    bossHealth: t.float32().default(1),
    bossMaxHealth: t.float32().default(1),
    bossPhase: t.uint8().default(0),
    bossVariant: t.string().default("normal"),
    threat: t.uint8().default(1),
    deadline: t.uint32().default(0),
    staggerUntil: t.uint32().default(0),
    players: t.map(PlayerState),
    actors: t.map(ActorState),
    hazards: t.string().default("{}"),
    intermission: t.string().default("{}"),
    accord: t.string().default("null")
  },
  "GraveWorld"
);

// content/revision.json
var revision_default = {
  version: "0.3.0",
  sha256: "b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241",
  authoredDate: "2026-10-23"
};

// src/shared/protocol.ts
var PROTOCOL = 13;
var CONTENT_REVISION = revision_default.sha256;
var HZ = 30;
var DT = 1 / HZ;
var implementedClassIds = [
  "soldier",
  "medic",
  "heavy",
  "tank",
  "mage",
  "engineer",
  "assassin"
];
var idleInput = () => ({
  sequence: 0,
  clientTick: 0,
  moveX: 0,
  moveY: 0,
  aim: -Math.PI / 2,
  fire: false,
  reload: false,
  dodge: false,
  q: false,
  e: false,
  ultimate: false,
  interact: false,
  supply: -1
});
var inputKeys = new Set(Object.keys(idleInput()));

// tools/measure-endurance.ts
var seconds = Number(process.argv[2]);
var output = process.argv[3];
assert(Number.isInteger(seconds) && seconds >= 10 && seconds <= 3600);
assert(/^reviews\/performance\/[a-z0-9-]+\.json$/.test(output ?? "") && !existsSync(output));
var root = dirname(fileURLToPath(import.meta.url));
var freeze = JSON.parse(readFileSync(join(root, "freeze.json"), "utf8"));
var sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
var checkBundles = () => freeze.bundles.every((b) => sha(join(root, b.name)) === b.sha256);
assert(checkBundles(), "Frozen bundles changed");
var child = fork(join(root, "endurance-server-fixture.mjs"), {
  execArgv: [],
  stdio: ["ignore", "pipe", "pipe", "ipc"]
});
var clients = [];
var nextId = 0;
var inputTimer;
var pending = /* @__PURE__ */ new Map();
var progress = [];
var errors = "";
var receivedMessages = 0;
child.stderr?.on("data", (d) => {
  errors = (errors + String(d)).slice(-16e3);
});
child.stdout?.on("data", () => {
});
var ready = new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => {
    const error = Error("Endurance child exited " + code);
    reject(error);
    for (const item of pending.values()) item.reject(error);
  });
  child.on("message", (message) => {
    if (message.ready) resolve(message.ready);
    else if (message.progress) {
      const sample = { ...message.progress, clientMemory: process.memoryUsage(), receivedMessages };
      progress.push(sample);
      writeFileSync(
        output + ".progress.json",
        JSON.stringify(
          { freezeCreatedAt: freeze.createdAt, requestedSeconds: seconds, samples: progress },
          null,
          2
        ) + "\n"
      );
      console.log(
        JSON.stringify({
          elapsedSeconds: Math.round(sample.elapsedSeconds),
          clients: sample.clients,
          serverHeapMiB: Math.round(sample.heapUsed / 1048576),
          clientHeapMiB: Math.round(sample.clientMemory.heapUsed / 1048576)
        })
      );
    } else {
      const item = pending.get(message.id);
      if (item) {
        pending.delete(message.id);
        message.error ? item.reject(Error(message.error)) : item.resolve(message.result);
      }
    }
  });
});
var ask = (kind, roomId = "") => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  child.send({ id, kind, roomId, seconds });
});
var until = async (check) => {
  const end = Date.now() + 1e4;
  while (!check()) {
    if (Date.now() > end) throw Error("Endurance setup timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
};
try {
  const port = await ready, client = new Client("http://127.0.0.1:" + port);
  const settings = {
    openingBossId: "choir-of-moths",
    mode: "endless",
    difficulty: "normal",
    visibility: "public",
    createKey: randomUUID(),
    protocolVersion: PROTOCOL,
    contentRevision: CONTENT_REVISION
  };
  for (let i = 0; i < 50; i++) {
    const options = {
      ...settings,
      name: "Endurance " + i,
      classId: implementedClassIds[i % implementedClassIds.length]
    };
    const room = i === 0 ? await client.create("grave", options, WorldState) : await client.joinById(clients[0].roomId, options, WorldState);
    room.reconnection.enabled = false;
    room.onMessage("*", () => {
      receivedMessages++;
    });
    clients.push(room);
  }
  clients[0].send("start");
  await until(() => clients.every((r) => r.state.phase === "combat"));
  let sequence = 0;
  inputTimer = setInterval(() => {
    sequence++;
    for (const [i, room] of clients.entries()) {
      const p = room.state.players.get(room.sessionId);
      if (!p || room.state.phase !== "combat") continue;
      const angle = sequence * 0.04 + i * 0.15;
      room.send("input", {
        ...idleInput(),
        sequence,
        moveX: Math.cos(angle),
        moveY: Math.sin(angle),
        aim: Math.atan2(room.state.bossY - p.y / 4, room.state.bossX - p.x / 4),
        fire: true,
        q: sequence % 180 === i % 180,
        e: sequence % 240 === i % 240,
        dodge: sequence % 200 === i % 200,
        ultimate: sequence === i + 1
      });
    }
  }, 1e3 / 30);
  const measured = await ask("measure", clients[0].roomId);
  assert(checkBundles(), "Frozen bundle bytes changed during measurement");
  const criteria = {
    duration: measured.durationSeconds >= seconds,
    clients: measured.lowestClients === 50 && measured.lowestActivePlayers === 50,
    sampling: measured.samples >= seconds * 30 * 0.9,
    projectiles: measured.peakHostiles === 4e3,
    tickP99: measured.tickP99Ms < 25
  };
  const report = {
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    passed: Object.values(criteria).every(Boolean),
    scope: seconds === 3600 ? "One-hour active localhost throughput and memory observation" : "Short setup check; not one-hour endurance",
    criteria,
    freeze,
    bundlesUnchanged: true,
    protocolVersion: PROTOCOL,
    contentRevision: CONTENT_REVISION,
    reference: { cpu: cpus()[0].model, platform: platform(), node: process.version },
    scriptedClients: 50,
    renderedClients: 0,
    processIsolation: "Server child and SDK parent use separate OS processes/heaps on one computer.",
    classRoster: Object.fromEntries(
      implementedClassIds.map((c) => [
        c,
        [...clients[0].state.players.values()].filter((p) => p.classId === c).length
      ])
    ),
    measurement: measured,
    clientProgress: progress,
    clientFinalMemory: process.memoryUsage(),
    receivedMessages,
    limits: [
      "Fifty scripted localhost clients; zero rendered clients. This is not the 49-scripted-plus-one-rendered gate, a hosted/WAN/phone result, or human acceptance.",
      "Players are invulnerable, the single Moths boss has 1e9 HP/deadline and 4,000 hostile projectiles are replenished. This isolates continuous combat load; it does not measure authored difficulty, votes/shop/deaths/reconnect or a normal full run.",
      "Memory is sampled without forced GC. Report the observed trend and minima; throughput pass does not independently certify a universal memory bound.",
      "Exact frozen runtime and tool bundles remain unchanged even when the working tree advances. External installed dependencies and lockfile identities are recorded at freeze time."
    ]
  };
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      passed: report.passed,
      seconds: measured.durationSeconds,
      samples: measured.samples,
      tickP99Ms: measured.tickP99Ms,
      tickMaxMs: measured.tickMaxMs,
      renderedClients: 0
    })
  );
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  writeFileSync(
    output + ".failure.json",
    JSON.stringify(
      {
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        error: String(error),
        freeze,
        progress,
        stderr: errors
      },
      null,
      2
    ) + "\n"
  );
  throw error;
} finally {
  if (inputTimer) clearInterval(inputTimer);
  await Promise.allSettled(
    clients.map((r) => r.connection.isOpen ? r.leave() : Promise.resolve())
  );
  if (child.connected) await ask("close").catch(() => {
  });
  if (child.exitCode === null) child.kill();
  if (errors) process.stderr.write(errors);
}
