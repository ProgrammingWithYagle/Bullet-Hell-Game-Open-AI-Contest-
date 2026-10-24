// Real localhost SDK clients and server use separate OS processes and heaps.
import { fork } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { cpus, platform } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { Client, type Room } from '@colyseus/sdk';
import { WorldState } from '../src/shared/network-state.ts';
import { implementedBossIds } from '../src/shared/game.ts';
import {
  PROTOCOL,
  CONTENT_REVISION,
  implementedClassIds,
  idleInput,
  type BossId,
} from '../src/shared/protocol.ts';
const bossId = process.argv[2] as BossId,
  players = Number(process.argv[3] ?? 50),
  seconds = Number(process.argv[4] ?? 5),
  output = process.argv[5];
if (
  !implementedBossIds.includes(bossId) ||
  ![8, 50].includes(players) ||
  seconds < 5 ||
  seconds > 60 ||
  !/^reviews\/performance\/[a-z0-9-]+\.json$/.test(output ?? '') ||
  existsSync(output)
)
  throw Error('Choose a boss, 8/50 clients, 5-60 seconds and a new reviews/performance JSON path.');
const child = fork('tools/encounter-server-fixture.ts', {
  execArgv: ['--import', 'tsx'],
  stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
});
let nextId = 0,
  timer: ReturnType<typeof setInterval> | undefined;
const pending = new Map<
  number,
  { resolve: (value: any) => void; reject: (error: Error) => void }
>();
const ready = new Promise<number>((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code) => {
    if (code) reject(Error('Fixture child exited ' + code));
  });
  child.on('message', (raw: any) => {
    if (raw.ready) resolve(raw.ready);
    else {
      const item = pending.get(raw.id);
      if (item) {
        pending.delete(raw.id);
        raw.error ? item.reject(Error(raw.error)) : item.resolve(raw.result);
      }
    }
  });
});
let errors = '';
child.stderr?.on('data', (chunk) => {
  errors += String(chunk);
});
child.stdout?.on('data', () => {});
const ask = (kind: string, roomId = '', stress = false) =>
  new Promise<any>((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    child.send({ id, kind, roomId, seconds, stress });
  });
const rooms: Room<WorldState>[] = [];
const until = async (check: () => boolean) => {
  const end = Date.now() + 6000;
  while (!check()) {
    if (Date.now() > end) throw Error('Isolated pilot timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};
try {
  const port = await ready,
    client = new Client('http://127.0.0.1:' + port);
  const settings = {
    openingBossId: bossId,
    mode: 'endless',
    difficulty: 'normal',
    visibility: 'public',
    createKey: randomUUID(),
    protocolVersion: PROTOCOL,
    contentRevision: CONTENT_REVISION,
  };
  const first = await client.create<WorldState>(
    'grave',
    { ...settings, name: 'Pilot 0', classId: 'soldier' },
    WorldState,
  );
  rooms.push(first);
  first.onMessage('*', () => {});
  first.reconnection.enabled = false;
  for (let i = 1; i < players; i++) {
    const room = await client.joinById<WorldState>(
      first.roomId,
      { ...settings, name: 'Pilot ' + i, classId: implementedClassIds[i % 3] },
      WorldState,
    );
    room.onMessage('*', () => {});
    room.reconnection.enabled = false;
    rooms.push(room);
  }
  first.send('start');
  await until(() => first.state.phase === 'combat');
  await ask('configure', first.roomId);
  let sequence = 0;
  timer = setInterval(() => {
    sequence++;
    for (const [i, room] of rooms.entries()) {
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
  const baseline = await ask('measure', first.roomId),
    stress = await ask('measure', first.roomId, true);
  const walk = (dir: string): string[] =>
    readdirSync(dir)
      .sort()
      .flatMap((name) => {
        const file = dir + '/' + name;
        return statSync(file).isDirectory() ? walk(file) : [file];
      });
  const runtimeHash = createHash('sha256');
  for (const file of walk('src')) {
    runtimeHash.update(file + '\0');
    runtimeHash.update(readFileSync(file));
  }
  const report = {
    runtimeSourceSha256: runtimeHash.digest('hex'),
    createdAt: new Date().toISOString(),
    protocolVersion: PROTOCOL,
    contentRevision: CONTENT_REVISION,
    bossId,
    players,
    renderedClients: 0,
    scriptedClients: players,
    processIsolation:
      'Authoritative server in child process; all SDK clients in parent process; separate heaps on one computer.',
    reference: { cpu: cpus()[0].model, platform: platform(), node: process.version },
    classRoster: Object.fromEntries(
      implementedClassIds.map((c) => [
        c,
        [...first.state.players.values()].filter((p) => p.classId === c).length,
      ]),
    ),
    baseline,
    stress,
    clientProcessMemory: process.memoryUsage(),
    verificationSourceSnapshot: JSON.parse(
      readFileSync('reviews/runtime-verification.json', 'utf8'),
    ).sourceSnapshotSha256,
    sourceSnapshotNote:
      'Full verification snapshot and the separate exact src-only runtime digest are recorded for this measurement.',
    limitations: [
      'Short localhost throughput fixture with zero rendered clients; no foreground FPS, WAN, free-host, endurance, device or human acceptance.',
      'Invulnerable players, 1e9 boss HP and replenished peak 4000 hostile projectiles isolate load. These are fixtures, not authored fight balance.',
      ...(bossId === 'ratcatcher'
        ? [
            'Twelve 1e6-HP rat fixtures remain alive; natural 12-HP summons and sack interruption have separate rule/network tests.',
          ]
        : []),
      'Different process isolation from the preserved co-process pilot; do not present them as an identical-condition before/after benchmark.',
    ],
  };
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      bossId,
      players,
      baselineP99Ms: baseline.tickP99Ms,
      stressP99Ms: stress.tickP99Ms,
      stressMaxMs: stress.tickMaxMs,
      peakMinions: stress.peakMinions,
      peakHostiles: stress.peakHostiles,
      renderedClients: 0,
    }),
  );
} finally {
  if (timer) clearInterval(timer);
  await Promise.allSettled(rooms.map((r) => (r.connection.isOpen ? r.leave() : Promise.resolve())));
  if (child.connected) await ask('close').catch(() => {});
  if (child.exitCode === null) child.kill();
  if (errors) process.stderr.write(errors);
}
