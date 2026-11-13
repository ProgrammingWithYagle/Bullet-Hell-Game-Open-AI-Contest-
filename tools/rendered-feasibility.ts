// Explicit local fixture: 49 real SDK clients + one browser, never part of the deployed server.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { Client, type Room } from '@colyseus/sdk';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { WorldState } from '../src/shared/network-state.ts';
import { CONTENT_REVISION, PROTOCOL, idleInput } from '../src/shared/protocol.ts';
import { arena } from '../src/shared/game.ts';
import { segmentRect } from '../src/shared/geometry.ts';
const { server } = createGameServer();
const output =
  process.argv[2] ??
  'reviews/performance/local-49-plus-rendered-server-protocol4-' + Date.now() + '.json';
if (!/^reviews\/performance\/[a-z0-9-]+\.json$/.test(output) || existsSync(output))
  throw Error('Choose a new JSON filename under reviews/performance; preserve earlier evidence.');
const walk = (dir: string): string[] =>
  readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const file = path.join(dir, name);
      return statSync(file).isDirectory() ? walk(file) : [file];
    });
const snapshot = createHash('sha256');
for (const file of [...walk('src'), 'package.json', 'pnpm-lock.yaml', 'vite.config.ts'].sort()) {
  snapshot.update(file.replaceAll('\\', '/') + '\0');
  snapshot.update(readFileSync(file));
}
const sourceSnapshotSha256 = snapshot.digest('hex');
const runtimeAssets = [
  ...readFileSync('src/client/assets.ts', 'utf8').matchAll(/import \w+ from '([^']+)\?url'/g),
]
  .map((m) => path.resolve('src/client', m[1]))
  .map((file) => ({
    path: path.relative('.', file).replaceAll('\\', '/'),
    sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
  }));
const rooms: Room<WorldState>[] = [];
mkdirSync('tmp', { recursive: true });
writeFileSync('tmp/rendered-command.txt', '');
const command = async (expected: string) => {
  await wait(() => {
    try {
      return (
        existsSync('tmp/rendered-command.txt') &&
        readFileSync('tmp/rendered-command.txt', 'utf8').trim() === expected
      );
    } catch (error) {
      if (!['EBUSY', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      return false;
    }
  }, 240000);
};
const delay = monitorEventLoopDelay({ resolution: 10 });
let timer: ReturnType<typeof setInterval> | undefined;
const wait = async (check: () => boolean, ms = 10000) => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw Error('Local fixture timed out');
    await new Promise((r) => setTimeout(r, 25));
  }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const percentile = (ns: number[], q: number) =>
  ns.toSorted((a, b) => a - b)[Math.min(ns.length - 1, Math.floor(ns.length * q))] ?? 0;
const metrics: Record<string, unknown> = {};
try {
  await server.listen(2567, '127.0.0.1');
  const client = new Client('http://127.0.0.1:2567');
  const opts = {
    mode: 'endless',
    difficulty: 'normal',
    visibility: 'public',
    createKey: randomUUID(),
    protocolVersion: PROTOCOL,
    contentRevision: CONTENT_REVISION,
    classId: 'soldier',
    name: 'Fixture 00',
  };
  const register = (room: Room<WorldState>) => {
    room.reconnection.enabled = false;
    room.onMessage('*', () => {});
    return room;
  };
  rooms.push(register(await client.create<WorldState>('grave', opts, WorldState)));
  for (let i = 1; i < 49; i++)
    rooms.push(
      register(
        await client.joinById<WorldState>(
          rooms[0].roomId,
          {
            ...opts,
            classId: i % 4 === 1 ? 'medic' : 'soldier',
            name: 'Fixture ' + String(i).padStart(2, '0'),
          },
          WorldState,
        ),
      ),
    );
  const live = liveRooms.get(rooms[0].roomId)!;
  let sequence = 0,
    votes = 0,
    purchaseReplies = 0,
    helper = '',
    victim = '';
  const actions = new Map<string, string>();
  let lifecycleDamage = false;
  const originalDamage = live.game.damage.bind(live.game);
  live.game.damage = (player, amount) => {
    if (lifecycleDamage && player.id === victim) originalDamage(player, amount);
  };
  for (const r of rooms)
    r.onMessage('purchaseResult', (m: { ok: boolean }) => {
      if (m.ok) purchaseReplies++;
    });
  timer = setInterval(() => {
    sequence++;
    for (const [i, r] of rooms.entries()) {
      const p = live.game.players.get(r.sessionId);
      if (!p || !r.connection.isOpen) continue;
      if (live.game.phase === 'combat') {
        const angle = sequence * 0.04 + i * 0.15;
        r.send('input', {
          ...idleInput(),
          sequence,
          moveX: r.sessionId === helper ? 0 : Math.cos(angle),
          moveY: r.sessionId === helper ? 0 : Math.sin(angle),
          aim: Math.atan2(live.game.boss.y - p.y, live.game.boss.x - p.x),
          fire: true,
          interact: r.sessionId === helper,
          q: sequence % 180 === i % 180,
          e: sequence % 240 === i % 240,
          ultimate: !victim && sequence % 250 === i % 250,
          dodge: r.sessionId !== helper && sequence % 200 === i % 200,
        });
      } else if (['mutationVote', 'contractVote'].includes(live.game.phase)) {
        const key = live.game.encounter + live.game.phase;
        if (actions.get(p.id) !== key) {
          actions.set(p.id, key);
          r.send('vote', i % 3);
          votes++;
        }
      } else if (live.game.phase === 'shop') {
        const key = live.game.encounter + 'shop';
        if (actions.get(p.id) !== key) {
          actions.set(p.id, key);
          const cmd = { id: 'fixture-' + live.game.encounter, kind: 'upgrade', item: 'damage' };
          r.send('purchase', cmd);
          r.send('purchase', cmd);
        }
      }
    }
  }, 1000 / 30);
  console.log(
    JSON.stringify({
      ready: true,
      scriptedClients: 49,
      roomId: live.roomId,
      port: 2567,
      awaiting:
        'Join this public Endless room from the browser; use F8 for development render metrics.',
    }),
  );
  await wait(() => live.clients.length === 50, 180000);
  console.log('Browser joined. Type baseline to measure 20 seconds of active combat.');
  await command('baseline');
  rooms[0].send('start');
  await wait(() => live.game.phase === 'combat');
  const fixture = () => {
    for (const p of live.game.players.values()) p.invulnerableUntil = 1e9;
    live.game.boss.health = live.game.boss.maxHealth = 1e9;
    live.game.boss.deadline = 1e9;
  };
  fixture();
  async function measure(stress: boolean, seconds: number) {
    const start = performance.now(),
      startTick = live.telemetry.ticks.length,
      startBytes = live.telemetry.encodedOutboundBytes;
    delay.reset();
    delay.enable();
    let peak = 0,
      minimum = Infinity,
      minimumActive = Infinity,
      minimumConnections = Infinity;
    console.log(
      JSON.stringify({
        measuring: stress ? 'stress' : 'baseline',
        seconds,
        startedAt: new Date().toISOString(),
      }),
    );
    while (performance.now() - start < seconds * 1000) {
      const hostiles = [...live.game.shots.values()].filter((s) => s.owner === 'hostile').length;
      peak = Math.max(peak, hostiles);
      minimum = Math.min(minimum, hostiles);
      minimumActive = Math.min(
        minimumActive,
        [...live.game.players.values()].filter((p) => p.connected && p.status === 'active').length,
      );
      minimumConnections = Math.min(minimumConnections, live.clients.length);
      await sleep(50);
    }
    delay.disable();
    const ns = live.telemetry.ticks.slice(startTick),
      elapsed = (performance.now() - start) / 1000,
      bytes = live.telemetry.encodedOutboundBytes - startBytes;
    const result = {
      durationSeconds: elapsed,
      samples: ns.length,
      tickP50Ms: percentile(ns, 0.5),
      tickP99Ms: percentile(ns, 0.99),
      tickMaxMs: Math.max(...ns),
      eventLoopP99Ms: delay.percentile(99) / 1e6,
      peakHostiles: peak,
      minimumHostiles: minimum,
      minimumActivePlayers: minimumActive,
      minimumConnections,
      encodedOutboundBytes: bytes,
      meanOutboundBytesPerSecondPerClient: bytes / elapsed / 50,
      combinedServerAndBotMemory: process.memoryUsage(),
    };
    console.log(JSON.stringify({ measured: stress ? 'stress' : 'baseline', ...result }));
    return result;
  }
  await sleep(3000);
  metrics.baseline = await measure(false, 20);
  console.log(
    'Type cycle to exercise downing, a two-second revive, elimination, reconnect and the full production intermission timers.',
  );
  await command('cycle');
  const a = live.game.players.get(rooms[2].sessionId)!,
    b = live.game.players.get(rooms[3].sessionId)!;
  victim = a.id;
  lifecycleDamage = true;
  helper = b.id;
  a.x = 500;
  a.y = 800;
  b.x = 520;
  b.y = 800;
  a.invulnerableUntil = 0;
  live.game.damage(a, a.maxHealth * 100);
  await wait(() => a.status === 'active');
  metrics.channelReviveObserved = true;
  helper = '';
  a.invulnerableUntil = 0;
  a.x = 800;
  a.y = 920;
  live.game.damage(a, a.maxHealth * 100);
  const token = rooms[4].reconnectionToken,
    oldId = rooms[4].sessionId;
  rooms[4].connection.close(4001, 'explicit local reconnect fixture');
  await wait(() => !live.game.players.get(oldId)!.connected);
  rooms[4] = register(await client.reconnect<WorldState>(token, WorldState));
  await wait(() => live.game.players.get(oldId)!.connected);
  metrics.reconnectPreservedIdentity = rooms[4].sessionId === oldId;
  await wait(() => a.status === 'eliminated', 25000);
  metrics.eliminationObserved = true;
  live.game.boss.health = 0;
  await wait(() => live.game.phase === 'mutationVote');
  console.log('Mutation vote: 15 seconds. The browser can vote now.');
  await wait(() => live.game.phase === 'contractVote', 20000);
  console.log('Contract vote: 15 seconds. The browser can vote now.');
  await wait(() => live.game.phase === 'shop', 20000);
  console.log('Shop: 25 seconds. Scripted clients purchase with duplicate request IDs.');
  await wait(() => live.game.phase === 'combat', 40000);
  metrics.eliminatedPlayerReturned = a.status === 'active';
  lifecycleDamage = false;
  fixture();
  metrics.voteMessages = votes;
  metrics.successfulPurchaseReplies = purchaseReplies;
  console.log(
    'Type stress to hold 4,000 moving hostile projectiles for 90 seconds; capture a bounded 20-second browser window.',
  );
  await command('stress');
  // Refill after EVERY authoritative tick, before the ordinary event drain. These
  // are real colliding hostiles; fixture placement skips masonry. No HTTP cheats.
  const originalStep = live.game.step.bind(live.game);
  let fixtureShots = 0;
  live.game.step = () => {
    originalStep();
    const emit = Reflect.get(live.game, 'emitShot') as (...args: unknown[]) => void;
    let count = [...live.game.shots.values()].filter((s) => s.owner === 'hostile').length;
    while (count < 4000) {
      const n = fixtureShots++;
      const x = 220 + (n % 58) * 20,
        y = 210 + (Math.floor(n / 58) % 58) * 10;
      if (arena.obstacles.some((rect) => segmentRect({ x, y }, { x: x + 1, y: y + 1 }, rect, 5)))
        continue;
      emit.call(live.game, 'hostile', x, y, ((n % 16) * Math.PI) / 8, 25, 5, 4, 0, 180);
      count++;
    }
  };
  await sleep(3000);
  metrics.stress = await measure(true, 90);
  metrics.stressFixtureShots = fixtureShots;
  live.game.step = originalStep;
  metrics.acceptedInputs = live.telemetry.acceptedInputs;
  metrics.rejectedInputs = live.telemetry.rejectedInputs;
  mkdirSync('reviews/performance', { recursive: true });
  writeFileSync(
    output,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        contentRevision: CONTENT_REVISION,
        protocolVersion: PROTOCOL,
        sourceSnapshotSha256,
        fixtureSha256: createHash('sha256')
          .update(readFileSync(import.meta.filename))
          .digest('hex'),
        runtimeAssets,
        scriptedClients: 49,
        renderedConnectionsObserved: live.clients.length - rooms.length,
        reference: {
          cpu: cpus()[0].model,
          logicalCpus: cpus().length,
          memoryGiB: totalmem() / 1024 ** 3,
          node: process.version,
        },
        metrics,
        firstPlayableGate:
          'incomplete until rendered samples, free-host capacity and device gates are assessed',
        limitations: [
          'Localhost; server and 49 bots share a process. Browser memory is separate and not measured here.',
          'Explicit fixture: damage suppressed except the lifecycle victim, extended boss health/deadline, real moving/colliding stress bullets refilled every tick, forced damage and positions for lifecycle exercise. Production intermission clocks remain unchanged.',
          'No phone, WAN, free-host, 60-minute endurance or human playtest claim.',
        ],
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    'Server evidence saved. Capture the browser evidence, then type done to close the fixture.',
  );
  await command('done');
} finally {
  if (timer) clearInterval(timer);
  delay.disable();

  await Promise.allSettled(rooms.filter((r) => r.connection.isOpen).map((r) => r.leave()));
  await server.gracefullyShutdown(false);
}
