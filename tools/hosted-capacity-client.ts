// Bounded official playtest load. Uses ordinary client commands only; no server fixtures.
import { writeFileSync, existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { Session } from '../src/client/session.ts';
import { CONTENT_REVISION, PROTOCOL, idleInput } from '../src/shared/protocol.ts';
const endpoint = 'https://grave-accord-playtest.onrender.com';
const count = Number(process.argv[2] ?? 8);
const expectedCommit = process.argv[3];
const output = process.argv[4];
if (
  ![8, 16, 50].includes(count) ||
  !/^[a-f0-9]{40}$/.test(expectedCommit ?? '') ||
  !/^reviews\/performance\/hosted-[a-z0-9-]+\.json$/.test(output ?? '') ||
  existsSync(output)
)
  throw Error('Supply 8/16/50, the exact deployed commit and a new hosted JSON evidence path.');
const clients: Session[] = [];
const samples: Record<string, unknown>[] = [];
const phases = new Set<string>();
const actions = new Set<string>();
let timer: ReturnType<typeof setInterval> | undefined;
let completed = false,
  stopReason = '',
  failure = '';
let startBytes = 0,
  elapsed = 0,
  combatPolls = 0,
  peakP99Ms = 0,
  peakTickMs = 0;
let minimumActive = Infinity,
  peakHostiles = 0,
  peakRss = 0,
  latestBytes = 0;
let healthBefore: unknown, healthAfter: unknown;
async function get(route: string) {
  const response = await fetch(endpoint + route, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('Service response ' + response.status);
  return response.json();
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (check: () => boolean) => {
  const end = Date.now() + 15000;
  while (!check()) {
    if (Date.now() > end) throw Error('Client state timeout');
    await sleep(50);
  }
};
try {
  const health = await get('/api/health');
  healthBefore = health;
  if (
    health.protocolVersion !== PROTOCOL ||
    health.contentRevision !== CONTENT_REVISION ||
    health.sourceCommit !== expectedCommit ||
    !health.practiceOnly
  )
    throw Error('Unexpected deployed version or ranked state');
  if (
    health.capacity.rooms ||
    health.capacity.reservedSlots ||
    health.capacity.instanceLimit < count
  )
    throw Error('Service must be idle with enough explicitly configured slots');
  for (let i = 0; i < count; i++) {
    const session = new Session(endpoint);
    clients.push(session);
    await session.connect(
      {
        name: 'Capacity client ' + (i + 1),
        classId: i % 4 === 1 ? 'medic' : 'soldier',
        mode: 'endless',
        difficulty: 'baby',
      },
      i ? { roomId: clients[0].room!.roomId, code: clients[0].code } : undefined,
      'private',
    );
    await until(() => Boolean(session.view?.players.some((p) => p.id === session.id)));
    if (!i) await until(() => Boolean(session.code));
  }
  clients[0].start();
  await until(() => clients[0].view?.phase === 'combat');
  let sequence = 0;
  timer = setInterval(() => {
    sequence++;
    for (const [i, session] of clients.entries()) {
      const v = session.view,
        p = v?.players.find((p) => p.id === session.id);
      if (!v || !p || !session.room?.connection.isOpen) continue;
      phases.add(v.phase);
      if (v.phase === 'combat') {
        const t = sequence / 30;
        let x = 800 + Math.sin(t * 0.45 + i) * 280 - p.x,
          y = 670 + Math.cos(t * 0.4 + i) * 95 - p.y;
        const downed = v.players.find((a) => a.connected && a.status === 'downed');
        if (downed) {
          x = downed.x - p.x;
          y = downed.y - p.y;
        }
        for (const w of v.warnings)
          if (w.kind === 'zone' && Math.hypot(w.x - p.x, w.y - p.y) < w.radius + 55) {
            x = p.x - w.x;
            y = p.y - w.y;
          }
        const length = Math.max(1, Math.hypot(x, y));
        session.input({
          ...idleInput(),
          sequence,
          clientTick: v.tick,
          moveX: Math.abs(x) < 3 ? 0 : x / length,
          moveY: Math.abs(y) < 3 ? 0 : y / length,
          aim: Math.atan2(v.boss.y - p.y, v.boss.x - p.x),
          fire: p.status === 'active',
          interact: Boolean(downed),
          q: sequence % 180 === i,
          e: sequence % 240 === i,
          ultimate: sequence % 300 === i,
          dodge: sequence % 170 === i,
        });
      } else {
        const key = i + ':' + v.encounter + ':' + v.phase;
        if (actions.has(key)) continue;
        actions.add(key);
        if (v.phase === 'mutationVote' || v.phase === 'contractVote') session.vote(i % 3);
        if (v.phase === 'shop') session.purchase({ kind: 'upgrade', item: 'damage' });
      }
    }
  }, 1000 / 30);
  const first = await get('/api/metrics');
  startBytes = first.encodedOutboundBytes;
  const start = performance.now();
  while (performance.now() - start < 60000) {
    const m = await get('/api/metrics');
    if (m.sourceCommit !== expectedCommit || m.protocolVersion !== PROTOCOL)
      throw Error('Deployment changed during measurement');
    const phase = clients[0].view?.phase;
    if (phase === 'combat') {
      combatPolls++;
      minimumActive = Math.min(minimumActive, m.activePlayers);
    }
    peakP99Ms = Math.max(peakP99Ms, m.tickWindow.p99Ms);
    peakTickMs = Math.max(peakTickMs, m.tickWindow.maxMs);
    peakHostiles = Math.max(peakHostiles, m.hostiles);
    peakRss = Math.max(peakRss, m.processMemory.rss);
    latestBytes = m.encodedOutboundBytes;
    samples.push({ ...m, phase });
    elapsed = (performance.now() - start) / 1000;
    if (latestBytes - startBytes >= 27 * 1024 * 1024) {
      stopReason = 'Stopped before the 30 MiB encoded traffic budget';
      break;
    }
    if (phase === 'defeat' || phase === 'victory') {
      stopReason = 'Actual game ended';
      break;
    }
    if (m.connections !== count) throw Error('Connection count changed');
    await sleep(2000);
  }
  elapsed = (performance.now() - start) / 1000;
  completed = true;
  stopReason ||= 'Sixty-second bounded measurement completed';
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
} finally {
  if (timer) clearInterval(timer);
  await Promise.allSettled(clients.map((c) => c.close()));
  await sleep(1500);
  try {
    healthAfter = await get('/api/health');
  } catch {
    /* report preserved */
  }
  writeFileSync(
    output,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        endpoint,
        expectedCommit,
        protocolVersion: PROTOCOL,
        contentRevision: CONTENT_REVISION,
        scriptedClients: count,
        renderedClients: 0,
        completed,
        failure,
        stopReason,
        durationSeconds: elapsed,
        phasesObserved: [...phases],
        combatPolls,
        minimumActivePlayersDuringCombatPolls: Number.isFinite(minimumActive)
          ? minimumActive
          : null,
        peakHostiles,
        peakRollingWindowP99Ms: peakP99Ms,
        peakRollingWindowMaxMs: peakTickMs,
        peakServerOnlyRssBytes: peakRss,
        encodedOutboundBytes: latestBytes - startBytes,
        encodedBudgetBytes: 30 * 1024 * 1024,
        healthBefore,
        healthAfter,
        samples,
        limits: [
          'Actual Render Free process, ordinary private-room client inputs, Baby difficulty; no invulnerability, boss health, timing or projectile injection.',
          'Server-only memory excludes local SDK clients. Rolling tick windows overlap and are at most 600 samples per room; peak of their p99 values is not a global percentile.',
          'Natural combat/intermission workload, not the 4,000-hostile stress or 60-minute endurance gate. No rendered FPS, physical device or human evidence.',
        ],
      },
      null,
      2,
    ) + '\n',
  );
}
console.log(
  JSON.stringify({
    completed,
    failure,
    stopReason,
    output,
    peakP99Ms,
    peakTickMs,
    peakHostiles,
    peakRss,
    elapsed,
  }),
);
if (failure) process.exitCode = 1;
