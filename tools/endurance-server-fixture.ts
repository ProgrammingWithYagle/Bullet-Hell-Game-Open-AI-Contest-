// IPC-only local measurement fixture; never imported by the production entry point.
import { performance } from 'node:perf_hooks';
import { createGameServer } from '../src/server/service.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
const { server, httpServer } = createGameServer();
if (!process.send) throw Error('This fixture requires a parent IPC channel');
await server.listen(0, '127.0.0.1');
const address = httpServer.address();
if (!address || typeof address === 'string') throw Error('No fixture address');
process.send({ ready: address.port });
let measuring = false;
process.on('message', async (raw: any) => {
  try {
    if (raw.kind === 'close') {
      await server.gracefullyShutdown(false);
      process.send?.({ id: raw.id, result: true });
      process.disconnect();
      return;
    }
    if (
      raw.kind !== 'measure' ||
      measuring ||
      !Number.isInteger(raw.seconds) ||
      raw.seconds < 10 ||
      raw.seconds > 3600
    )
      throw Error('Invalid endurance request');
    const room = liveRooms.get(raw.roomId);
    if (!room || room.clients.length !== 50 || room.game.phase !== 'combat')
      throw Error('Expected fifty active clients');
    measuring = true;
    const game = room.game;
    for (const p of game.players.values()) p.invulnerableUntil = 1e9;
    game.boss.health = game.boss.maxHealth = 1e9;
    game.boss.deadline = 1e9;
    const start = performance.now(),
      startBytes = room.telemetry.encodedOutboundBytes;
    const startAccepted = room.telemetry.acceptedInputs,
      startRejected = room.telemetry.rejectedInputs;
    const ticks: number[] = [],
      memory: any[] = [];
    let lastTick = game.tick,
      lastMemory = -Infinity,
      peakHostiles = 0,
      peakMinions = 0,
      spawned = 0;
    let lowestClients = 50,
      lowestActivePlayers = 50,
      peakConstructs = 0,
      peakCues = 0;
    const collect = () => {
      const count = game.tick - lastTick;
      if (count < 0 || count > room.telemetry.ticks.length)
        throw Error('Telemetry observation lost ticks');
      if (count) ticks.push(...room.telemetry.ticks.slice(-count));
      lastTick = game.tick;
    };
    while (performance.now() - start < raw.seconds * 1000) {
      collect();
      if (game.phase !== 'combat')
        throw Error(
          'Fixture left active combat: ' +
            JSON.stringify({
              phase: game.phase,
              tick: game.tick,
              combatTick: game.combatTick,
              bossHealth: game.boss.health,
              bossDeadline: game.boss.deadline,
              players: [...game.players.values()].map((p) => ({
                id: p.id,
                status: p.status,
                health: p.health,
                invulnerableUntil: p.invulnerableUntil,
              })),
            }),
        );
      // Dodge legitimately replaces this timer in normal play. Renew the load-only protection.
      for (const p of game.players.values())
        p.invulnerableUntil = Math.max(p.invulnerableUntil, game.combatTick + 600);
      lowestClients = Math.min(lowestClients, room.clients.length);
      lowestActivePlayers = Math.min(
        lowestActivePlayers,
        [...game.players.values()].filter((p) => p.connected && p.status === 'active').length,
      );
      let hostiles = 0;
      for (const shot of game.shots.values()) if (shot.owner === 'hostile') hostiles++;
      const emit = Reflect.get(game, 'emitShot') as (...args: unknown[]) => void;
      for (let n = hostiles; n < 4000; n++) {
        emit.call(
          game,
          'hostile',
          80 + (n % 60) * 24,
          100 + Math.floor(n / 60) * 10,
          ((n % 16) * Math.PI) / 8,
          25,
          5,
          4,
        );
        spawned++;
      }
      hostiles = 0;
      for (const shot of game.shots.values()) if (shot.owner === 'hostile') hostiles++;
      peakHostiles = Math.max(peakHostiles, hostiles);
      peakMinions = Math.max(peakMinions, game.minions.actors.size);
      peakConstructs = Math.max(peakConstructs, game.classKits.constructs().length);
      peakCues = Math.max(peakCues, game.director.cues().length);
      const elapsed = (performance.now() - start) / 1000;
      if (elapsed - lastMemory >= 15) {
        const sample = {
          elapsedSeconds: elapsed,
          ...process.memoryUsage(),
          tick: game.tick,
          clients: room.clients.length,
          shots: game.shots.size,
          minions: game.minions.actors.size,
          constructs: game.classKits.constructs().length,
          encodedOutboundBytes: room.telemetry.encodedOutboundBytes - startBytes,
        };
        memory.push(sample);
        lastMemory = elapsed;
        process.send?.({ progress: sample });
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    collect();
    const sorted = ticks.toSorted((a, b) => a - b);
    const q = (n: number) =>
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * n))] ?? 0;
    const elapsed = (performance.now() - start) / 1000;
    memory.push({
      elapsedSeconds: elapsed,
      ...process.memoryUsage(),
      tick: game.tick,
      clients: room.clients.length,
      shots: game.shots.size,
      minions: game.minions.actors.size,
      constructs: game.classKits.constructs().length,
      encodedOutboundBytes: room.telemetry.encodedOutboundBytes - startBytes,
    });
    process.send?.({
      id: raw.id,
      result: {
        bossId: game.boss.id,
        requestedSeconds: raw.seconds,
        durationSeconds: elapsed,
        samples: ticks.length,
        expectedNominalSamples: raw.seconds * 30,
        tickSamplesMs: ticks,
        tickP50Ms: q(0.5),
        tickP99Ms: q(0.99),
        tickMaxMs: sorted.at(-1) ?? 0,
        overBudgetTicks: ticks.filter((t) => t > 1000 / 30).length,
        peakHostiles,
        peakMinions,
        peakConstructs,
        peakCues,
        stressProjectilesSpawned: spawned,
        lowestClients,
        lowestActivePlayers,
        acceptedInputs: room.telemetry.acceptedInputs - startAccepted,
        rejectedInputs: room.telemetry.rejectedInputs - startRejected,
        encodedOutboundBytes: room.telemetry.encodedOutboundBytes - startBytes,
        memory,
        telemetryRetention:
          'Production retains its existing 18,000 samples. The fixture copies new tick deltas every 50 ms, never clears or expands the production ring, and rejects a missed observation.',
      },
    });
  } catch (error) {
    process.send?.({ id: raw.id, error: String(error) });
  }
});
