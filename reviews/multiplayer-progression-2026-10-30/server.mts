// Isolated IPC-only QA authority. Never imported by production.
import assert from 'node:assert/strict';
import { resolve, sep } from 'node:path';
import { createGameServer } from '../../src/server/service.ts';
import { TeamRecordStore } from '../../src/server/team-record-store.ts';
import { liveRooms } from '../../src/server/GraveRoom.ts';
import { capacity } from '../../src/server/capacity.ts';
const database = resolve(process.argv[2] ?? '');
assert(
  database.startsWith(
    resolve('output/multiplayer-progression-2026-10-30') + sep,
  ),
);
assert(process.send, 'IPC parent required');
const records = new TeamRecordStore(database);
const { server, httpServer } = createGameServer({
  audience: 'public',
  records,
});
await server.listen(0, '127.0.0.1');
const address = httpServer.address();
assert(address && typeof address !== 'string');
process.send({ ready: address.port, pid: process.pid });
const snapshot = (roomId: string) => {
  const room = liveRooms.get(roomId);
  assert(room, 'Expected this probe room');
  const g = room.game;
  return {
    phase: g.phase,
    tick: g.tick,
    combatTick: g.combatTick,
    phaseEnds: g.phaseEnds,
    encounter: g.encounter,
    seed: g.settings.seed,
    owner: room.state.owner,
    paused: room.state.matchPaused,
    clients: room.clients.length,
    capacity: capacity.summary(),
    arena: g.arena.id,
    boss: {
      id: g.boss.id,
      health: g.boss.health,
      maxHealth: g.boss.maxHealth,
      defeatedAt: g.boss.defeatedAt,
    },
    mutations: g.mutations,
    mutationCards: g.mutationCards,
    contractCards: g.contractCards,
    votes: [...g.votes],
    players: [...g.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      classId: p.classId,
      status: p.status,
      connected: p.connected,
      expired: p.expired,
      coins: p.coins,
      skills: p.skills,
      upgrades: p.upgrades,
      supplies: p.supplies,
      ack: p.ack,
      health: p.health,
      shield: p.shield,
      x: p.x,
      y: p.y,
      qAt: p.qAt,
      eAt: p.eAt,
    })),
    telemetry: {
      acceptedInputs: room.telemetry.acceptedInputs,
      rejectedInputs: room.telemetry.rejectedInputs,
      encodedOutboundBytes: room.telemetry.encodedOutboundBytes,
      peakProjectiles: room.telemetry.peakProjectiles,
      tickSamples: [...room.telemetry.ticks],
    },
  };
};
let closing = false;
process.on('message', async (raw: any) => {
  try {
    if (raw.kind === 'close') {
      if (!closing) {
        closing = true;
        await server.gracefullyShutdown(false);
        records.close();
      }
      process.send?.({
        id: raw.id,
        result: { capacity: capacity.summary(), rooms: liveRooms.size },
      });
      process.disconnect();
      return;
    }
    if (raw.kind === 'capacity') {
      process.send?.({ id: raw.id, result: capacity.summary() });
      return;
    }
    const room = liveRooms.get(raw.roomId);
    assert(room, 'Probe room missing');
    if (raw.kind === 'protect')
      for (const p of room.game.players.values())
        p.invulnerableUntil = room.game.combatTick + 36000;
    else if (raw.kind === 'clear') {
      assert.equal(room.game.phase, 'combat');
      for (const p of room.game.players.values())
        p.invulnerableUntil = room.game.combatTick + 36000;
      room.game.boss.health = 0;
    } else if (raw.kind === 'advance') {
      assert(
        [
          'mutationVote',
          'contractVote',
          'shop',
          'loading',
          'secretOffer',
        ].includes(room.game.phase),
      );
      assert(!room.state.matchPaused);
      room.game.phaseEnds = room.game.tick + 1;
    } else assert.equal(raw.kind, 'snapshot');
    process.send?.({ id: raw.id, result: snapshot(raw.roomId) });
  } catch (error) {
    process.send?.({
      id: raw.id,
      error: error instanceof Error ? error.stack : String(error),
    });
  }
});
