// Run only the frozen bundle emitted by build-endurance-probe.mjs.
import { fork } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { cpus, platform } from 'node:os';
import assert from 'node:assert/strict';
import { Client, type Room } from '@colyseus/sdk';
import { WorldState } from '../src/shared/network-state.ts';
import {
  PROTOCOL,
  CONTENT_REVISION,
  implementedClassIds,
  idleInput,
} from '../src/shared/protocol.ts';
const seconds = Number(process.argv[2]),
  output = process.argv[3];
assert(Number.isInteger(seconds) && seconds >= 10 && seconds <= 3600);
assert(/^reviews\/performance\/[a-z0-9-]+\.json$/.test(output ?? '') && !existsSync(output));
const root = dirname(fileURLToPath(import.meta.url)),
  freeze = JSON.parse(readFileSync(join(root, 'freeze.json'), 'utf8'));
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const checkBundles = () => freeze.bundles.every((b: any) => sha(join(root, b.name)) === b.sha256);
assert(checkBundles(), 'Frozen bundles changed');
const child = fork(join(root, 'endurance-server-fixture.mjs'), {
  execArgv: [],
  stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
});
const clients: Room<WorldState>[] = [];
let nextId = 0,
  inputTimer: ReturnType<typeof setInterval> | undefined;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
const progress: any[] = [];
let errors = '',
  receivedMessages = 0;
child.stderr?.on('data', (d) => {
  errors = (errors + String(d)).slice(-16000);
});
child.stdout?.on('data', () => {});
const ready = new Promise<number>((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code) => {
    const error = Error('Endurance child exited ' + code);
    reject(error);
    for (const item of pending.values()) item.reject(error);
  });
  child.on('message', (message: any) => {
    if (message.ready) resolve(message.ready);
    else if (message.progress) {
      const sample = { ...message.progress, clientMemory: process.memoryUsage(), receivedMessages };
      progress.push(sample);
      writeFileSync(
        output + '.progress.json',
        JSON.stringify(
          { freezeCreatedAt: freeze.createdAt, requestedSeconds: seconds, samples: progress },
          null,
          2,
        ) + '\n',
      );
      console.log(
        JSON.stringify({
          elapsedSeconds: Math.round(sample.elapsedSeconds),
          clients: sample.clients,
          serverHeapMiB: Math.round(sample.heapUsed / 1048576),
          clientHeapMiB: Math.round(sample.clientMemory.heapUsed / 1048576),
        }),
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
const ask = (kind: string, roomId = '') =>
  new Promise<any>((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    child.send({ id, kind, roomId, seconds });
  });
const until = async (check: () => boolean) => {
  const end = Date.now() + 10000;
  while (!check()) {
    if (Date.now() > end) throw Error('Endurance setup timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};
try {
  const port = await ready,
    client = new Client('http://127.0.0.1:' + port);
  const settings = {
    openingBossId: 'choir-of-moths',
    mode: 'endless',
    difficulty: 'normal',
    visibility: 'public',
    createKey: randomUUID(),
    protocolVersion: PROTOCOL,
    contentRevision: CONTENT_REVISION,
  };
  for (let i = 0; i < 50; i++) {
    const options = {
      ...settings,
      name: 'Endurance ' + i,
      classId: implementedClassIds[i % implementedClassIds.length],
    };
    const room =
      i === 0
        ? await client.create<WorldState>('grave', options, WorldState)
        : await client.joinById<WorldState>(clients[0].roomId, options, WorldState);
    room.reconnection.enabled = false;
    room.onMessage('*', () => {
      receivedMessages++;
    });
    clients.push(room);
  }
  clients[0].send('start');
  await until(() => clients.every((r) => r.state.phase === 'combat'));
  let sequence = 0;
  inputTimer = setInterval(() => {
    sequence++;
    for (const [i, room] of clients.entries()) {
      const p = room.state.players.get(room.sessionId);
      if (!p || room.state.phase !== 'combat') continue;
      const angle = sequence * 0.04 + i * 0.15;
      room.send('input', {
        ...idleInput(),
        sequence,
        moveX: Math.cos(angle),
        moveY: Math.sin(angle),
        aim: Math.atan2(room.state.bossY - p.y / 4, room.state.bossX - p.x / 4),
        fire: true,
        q: sequence % 180 === i % 180,
        e: sequence % 240 === i % 240,
        dodge: sequence % 200 === i % 200,
        ultimate: sequence === i + 1,
      });
    }
  }, 1000 / 30);
  const measured = await ask('measure', clients[0].roomId);
  assert(checkBundles(), 'Frozen bundle bytes changed during measurement');
  const criteria = {
    duration: measured.durationSeconds >= seconds,
    clients: measured.lowestClients === 50 && measured.lowestActivePlayers === 50,
    sampling: measured.samples >= seconds * 30 * 0.9,
    projectiles: measured.peakHostiles === 4000,
    tickP99: measured.tickP99Ms < 25,
  };
  const report = {
    createdAt: new Date().toISOString(),
    passed: Object.values(criteria).every(Boolean),
    scope:
      seconds === 3600
        ? 'One-hour active localhost throughput and memory observation'
        : 'Short setup check; not one-hour endurance',
    criteria,
    freeze,
    bundlesUnchanged: true,
    protocolVersion: PROTOCOL,
    contentRevision: CONTENT_REVISION,
    reference: { cpu: cpus()[0].model, platform: platform(), node: process.version },
    scriptedClients: 50,
    renderedClients: 0,
    processIsolation:
      'Server child and SDK parent use separate OS processes/heaps on one computer.',
    classRoster: Object.fromEntries(
      implementedClassIds.map((c) => [
        c,
        [...clients[0].state.players.values()].filter((p) => p.classId === c).length,
      ]),
    ),
    measurement: measured,
    clientProgress: progress,
    clientFinalMemory: process.memoryUsage(),
    receivedMessages,
    limits: [
      'Fifty scripted localhost clients; zero rendered clients. This is not the 49-scripted-plus-one-rendered gate, a hosted/WAN/phone result, or human acceptance.',
      'Players are invulnerable, the single Moths boss has 1e9 HP/deadline and 4,000 hostile projectiles are replenished. This isolates continuous combat load; it does not measure authored difficulty, votes/shop/deaths/reconnect or a normal full run.',
      'Memory is sampled without forced GC. Report the observed trend and minima; throughput pass does not independently certify a universal memory bound.',
      'Exact frozen runtime and tool bundles remain unchanged even when the working tree advances. External installed dependencies and lockfile identities are recorded at freeze time.',
    ],
  };
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      passed: report.passed,
      seconds: measured.durationSeconds,
      samples: measured.samples,
      tickP99Ms: measured.tickP99Ms,
      tickMaxMs: measured.tickMaxMs,
      renderedClients: 0,
    }),
  );
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  writeFileSync(
    output + '.failure.json',
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        error: String(error),
        freeze,
        progress,
        stderr: errors,
      },
      null,
      2,
    ) + '\n',
  );
  throw error;
} finally {
  if (inputTimer) clearInterval(inputTimer);
  await Promise.allSettled(
    clients.map((r) => (r.connection.isOpen ? r.leave() : Promise.resolve())),
  );
  if (child.connected) await ask('close').catch(() => {});
  if (child.exitCode === null) child.kill();
  if (errors) process.stderr.write(errors);
}
