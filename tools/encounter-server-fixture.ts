// Local benchmark child. IPC-only fixtures never enter the production server entry point.
import { performance } from 'node:perf_hooks';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
const { server, httpServer } = createGameServer();
await server.listen(0, '127.0.0.1');
const address = httpServer.address();
if (!address || typeof address === 'string') throw Error('No address');
process.send?.({ ready: address.port });
const percentile = (values: number[], q: number) =>
  values.toSorted((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * q))] ?? 0;
process.on('message', async (raw: unknown) => {
  const request = raw as {
    id: number;
    kind: string;
    roomId: string;
    seconds: number;
    stress: boolean;
  };
  try {
    if (request.kind === 'close') {
      await server.gracefullyShutdown(false);
      process.send?.({ id: request.id, result: true });
      process.disconnect();
      return;
    }
    const room = liveRooms.get(request.roomId);
    if (!room) throw Error('No fixture room');
    const game = room.game;
    if (request.kind === 'configure') {
      for (const p of game.players.values()) p.invulnerableUntil = 1e9;
      game.boss.health = game.boss.maxHealth = 1e9;
      game.boss.deadline = 1e9;
      if (game.boss.id === 'ratcatcher')
        for (let i = 0; i < 12; i++)
          game.spawnMinion({
            kind: 'rat',
            x: 550 + i * 40,
            y: 450,
            health: 1e6,
            speed: 125,
            radius: 12,
            damage: 8,
            lifeSeconds: 60,
          });
      process.send?.({ id: request.id, result: true });
      return;
    }
    if (request.kind !== 'measure' || request.seconds < 5 || request.seconds > 60)
      throw Error('Invalid fixture measurement');
    const startIndex = room.telemetry.ticks.length,
      startBytes = room.telemetry.encodedOutboundBytes,
      start = performance.now();
    let peakHostiles = 0,
      peakMinions = 0,
      peakBossCues = 0,
      spawned = 0;
    while (performance.now() - start < request.seconds * 1000) {
      if (request.stress) {
        const emit = Reflect.get(game, 'emitShot') as (...args: unknown[]) => void;
        let count = 0;
        for (const shot of game.shots.values()) if (shot.owner === 'hostile') count++;
        for (let n = count; n < 4000; n++) {
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
      }
      let count = 0;
      for (const shot of game.shots.values()) if (shot.owner === 'hostile') count++;
      peakHostiles = Math.max(peakHostiles, count);
      peakMinions = Math.max(peakMinions, game.minions.actors.size);
      peakBossCues = Math.max(peakBossCues, game.director.cues().length);
      await new Promise((r) => setTimeout(r, 50));
    }
    const ticks = room.telemetry.ticks.slice(startIndex),
      elapsed = (performance.now() - start) / 1000;
    process.send?.({
      id: request.id,
      result: {
        scenario: request.stress ? '4000-hostile stress' : 'active combat',
        bossId: game.boss.id,
        durationSeconds: elapsed,
        samples: ticks.length,
        tickSamplesMs: ticks,
        tickP50Ms: percentile(ticks, 0.5),
        tickP99Ms: percentile(ticks, 0.99),
        tickMaxMs: Math.max(...ticks),
        overBudgetTicks: ticks.filter((t) => t > 1000 / 30).length,
        peakHostiles,
        peakMinions,
        peakBossCues,
        stressProjectilesSpawned: spawned,
        encodedOutboundBytes: room.telemetry.encodedOutboundBytes - startBytes,
        serverMemory: process.memoryUsage(),
      },
    });
  } catch (error) {
    process.send?.({ id: request.id, error: String(error) });
  }
});
