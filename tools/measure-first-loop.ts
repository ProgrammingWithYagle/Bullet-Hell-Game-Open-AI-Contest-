// Local synthetic pilot; this does not establish rendered FPS or free-host capacity.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { cpus, totalmem, platform } from 'node:os';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { Client, type Room } from '@colyseus/sdk';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { implementedBossIds } from '../src/shared/game.ts';
import type { BossId } from '../src/shared/protocol.ts';
import { WorldState } from '../src/shared/network-state.ts';
import {
  CONTENT_REVISION,
  PROTOCOL,
  idleInput,
  implementedClassIds,
} from '../src/shared/protocol.ts';
const players = Number(process.argv[2] ?? 50),
  seconds = Number(process.argv[3] ?? 10);
const output =
  process.argv[4] ?? 'reviews/performance/local-' + players + '-pilot-' + Date.now() + '.json';
if (!/^reviews\/performance\/[a-z0-9-]+\.json$/.test(output) || existsSync(output))
  throw Error('Choose a new JSON filename under reviews/performance; prior evidence is preserved.');
if (![8, 16, 50].includes(players) || seconds < 5 || seconds > 120)
  throw Error('Use 8, 16 or 50 players and 5-120 seconds per measured phase');
const openingBossId = process.argv[5] as BossId | undefined;
if (openingBossId && !implementedBossIds.includes(openingBossId)) throw Error('Unknown pilot boss');
const { server, httpServer } = createGameServer(),
  rooms: Room<WorldState>[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
const wait = async (check: () => boolean, timeout = 6000) => {
  const end = Date.now() + timeout;
  while (!check()) {
    if (Date.now() > end) throw Error('Pilot timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};
const percentile = (values: number[], q: number) =>
  values.toSorted((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * q))] ?? 0;
const delay = monitorEventLoopDelay({ resolution: 10 });
try {
  await server.listen(0, '127.0.0.1');
  const address = httpServer.address();
  if (!address || typeof address === 'string') throw Error('No server address');
  const client = new Client('http://127.0.0.1:' + address.port);
  const settings = {
    openingBossId: openingBossId ?? 'constable',
    mode: 'endless',
    difficulty: 'normal',
    visibility: 'public',
    createKey: randomUUID(),
    protocolVersion: PROTOCOL,
    contentRevision: CONTENT_REVISION,
    classId: 'soldier',
    name: 'Pilot 0',
  };
  const first = await client.create<WorldState>('grave', settings, WorldState);
  first.onMessage('*', () => {});
  first.reconnection.enabled = false;
  rooms.push(first);
  for (let i = 1; i < players; i++) {
    const room = await client.joinById<WorldState>(
      first.roomId,
      {
        ...settings,
        classId: implementedClassIds[i % implementedClassIds.length],
        name: 'Pilot ' + i,
      },
      WorldState,
    );
    room.onMessage('*', () => {});
    room.reconnection.enabled = false;
    rooms.push(room);
  }
  const live = liveRooms.get(first.roomId)!;
  first.send('start');
  await wait(() => live.game.phase === 'combat');
  let sequence = 0;
  const actions = new Map<string, string>();
  let purchases = 0,
    votes = 0;
  for (const room of rooms)
    room.onMessage('purchaseResult', (r: { ok: boolean }) => {
      if (r.ok) purchases++;
    });
  timer = setInterval(() => {
    sequence++;
    for (const [i, room] of rooms.entries()) {
      const p = live.game.players.get(room.sessionId);
      if (!p || !room.connection.isOpen) continue;
      if (live.game.phase === 'combat') {
        const phase = sequence * 0.04 + i * 0.15;
        room.send('input', {
          ...idleInput(),
          sequence,
          moveX: Math.cos(phase),
          moveY: Math.sin(phase),
          aim: Math.atan2(250 - p.y, 800 - p.x),
          fire: true,
          q: sequence % 180 === i % 180,
          e: sequence % 240 === i % 240,
          dodge: sequence % 200 === i % 200,
          ultimate: sequence === i + 1,
        });
      } else if (['mutationVote', 'contractVote'].includes(live.game.phase)) {
        const key = live.game.encounter + live.game.phase;
        if (actions.get(p.id) !== key) {
          actions.set(p.id, key);
          room.send('vote', i % 3);
          votes++;
        }
      } else if (live.game.phase === 'shop') {
        const key = live.game.encounter + 'shop';
        if (actions.get(p.id) !== key) {
          actions.set(p.id, key);
          const request = {
            id: 'pilot-' + live.game.encounter,
            kind: 'upgrade',
            item: 'damage',
          };
          room.send('purchase', request);
          room.send('purchase', request);
        }
      }
    }
  }, 1000 / 30);
  // Invulnerability and large boss health isolate throughput from a short practice fight.
  const fixture = () => {
    for (const p of live.game.players.values()) p.invulnerableUntil = 1e9;
    live.game.boss.health = live.game.boss.maxHealth = 1e9;
    if (openingBossId === 'ratcatcher' && live.game.boss.id === 'ratcatcher') {
      for (let i = 0; i < 12; i++)
        live.game.spawnMinion({
          kind: 'rat',
          x: 550 + i * 40,
          y: 450,
          health: 1e6,
          speed: 125,
          radius: 12,
          damage: 8,
          lifeSeconds: 60,
        });
    }
  };
  fixture();
  async function measure(stress: boolean) {
    const startTick = live.telemetry.ticks.length,
      startBytes = live.telemetry.encodedOutboundBytes,
      start = performance.now();
    delay.reset();
    delay.enable();
    let peakMinions = 0,
      peakBossCues = 0;
    let peak = 0,
      spawned = 0;
    while (performance.now() - start < seconds * 1000) {
      if (stress) {
        const emit = Reflect.get(live.game, 'emitShot') as (...args: unknown[]) => void;
        const count = [...live.game.shots.values()].filter((s) => s.owner === 'hostile').length;
        for (let n = count; n < 4000; n++) {
          const x = 80 + (n % 60) * 24,
            y = 100 + Math.floor(n / 60) * 10;
          emit.call(live.game, 'hostile', x, y, ((n % 16) * Math.PI) / 8, 25, 5, 4);
          spawned++;
        }
        peak = Math.max(
          peak,
          [...live.game.shots.values()].filter((s) => s.owner === 'hostile').length,
        );
      }
      peakMinions = Math.max(peakMinions, live.game.minions.actors.size);
      peakBossCues = Math.max(peakBossCues, live.game.director.cues().length);
      await new Promise((r) => setTimeout(r, 50));
    }
    delay.disable();
    const ticks = live.telemetry.ticks.slice(startTick),
      elapsed = (performance.now() - start) / 1000;
    return {
      scenario: stress ? '4000-hostile stress' : 'active combat',
      peakMinions,
      peakBossCues,
      bossId: live.game.boss.id,
      durationSeconds: elapsed,
      samples: ticks.length,
      tickSamplesMs: ticks,
      overBudgetTicks: ticks.filter((tick) => tick > 1000 / 30).length,
      tickP50Ms: percentile(ticks, 0.5),
      tickP99Ms: percentile(ticks, 0.99),
      tickMaxMs: Math.max(...ticks),
      eventLoopP99Ms: delay.percentile(99) / 1e6,
      encodedOutboundBytes: live.telemetry.encodedOutboundBytes - startBytes,
      meanOutboundBytesPerSecondPerClient:
        (live.telemetry.encodedOutboundBytes - startBytes) / elapsed / players,
      peakHostiles: peak,
      stressProjectilesSpawned: spawned,
      processMemory: process.memoryUsage(),
    };
  }
  const baseline = await measure(false);
  // An explicit boss pilot measures the same live encounter before intermission.
  const requestedBossStress = openingBossId ? await measure(true) : undefined;
  live.game.boss.health = 0;
  await wait(() => live.game.phase === 'mutationVote');
  // Shorten intermission clocks only in the imported pilot fixture; production clocks stay unchanged.
  for (const phase of ['mutationVote', 'contractVote', 'shop', 'loading']) {
    await wait(() => live.game.phase === phase);
    live.game.phaseEnds = live.game.tick + 30;
    await wait(() => live.game.phase !== phase);
  }
  await wait(() => live.game.phase === 'combat');
  fixture();
  const stress = requestedBossStress ?? (await measure(true));
  const report = {
    createdAt: new Date().toISOString(),
    contentRevision: CONTENT_REVISION,
    protocolVersion: PROTOCOL,
    classRoster: Object.fromEntries(
      implementedClassIds.map((id) => [
        id,
        [...live.game.players.values()].filter((player) => player.classId === id).length,
      ]),
    ),
    players,
    renderedClients: 0,
    scriptedClients: players,
    firstPlayableGate: 'incomplete',
    reference: {
      cpu: cpus()[0]?.model,
      logicalCpus: cpus().length,
      memoryGiB: totalmem() / 1024 ** 3,
      platform: platform(),
      node: process.version,
    },
    baseline,
    stress,
    actions: {
      acceptedInputs: live.telemetry.acceptedInputs,
      rejectedInputs: live.telemetry.rejectedInputs,
      successfulPurchaseReplies: purchases,
      votes,
    },
    limitations: [
      'All clients are scripted; no rendered-client FPS measurement.',
      'Signatures and phase changes may retire hostile shots; 4000 is a measured peak, not a continuous-every-frame guarantee.',
      'Server and bot clients share this process; memory is combined.',
      ...(openingBossId === 'ratcatcher'
        ? [
            'Explicit Ratcatcher fixture adds twelve 1e6-HP rats to keep ordinary actors alive throughout both phases; natural 12-HP summons and sack interruption have separate rules/network tests.',
          ]
        : []),
      'Invulnerability and extended boss health isolate throughput; stress projectiles and short intermissions are test fixtures.',
      'Localhost pilot does not establish WAN performance, free-host capacity, device performance, reconnection endurance or human play quality.',
    ],
  };
  mkdirSync('reviews/performance', { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      players,
      baselineP99Ms: baseline.tickP99Ms,
      stressP99Ms: stress.tickP99Ms,
      peakHostiles: stress.peakHostiles,
      purchases,
      votes,
      renderedClients: 0,
    }),
  );
} finally {
  if (timer) clearInterval(timer);
  await Promise.allSettled(rooms.filter((r) => r.connection.isOpen).map((r) => r.leave()));
  await server.gracefullyShutdown(false);
}
