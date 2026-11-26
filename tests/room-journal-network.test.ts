import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { RunJournal, type RunTransport } from '../src/server/run-journal.ts';
import { RunStore } from '../src/server/run-store.ts';
import { verifyBoundary } from '../src/server/checkpoints.ts';
import { Session } from '../src/client/session.ts';
import type { CheckpointStatus } from '../src/shared/protocol.ts';
import { openLedger } from './helpers/sqlite-ledger.ts';

const until = async (check: () => boolean) => {
  const limit = Date.now() + 5000;
  while (!check()) {
    if (Date.now() >= limit) throw Error('Timed out waiting for journal/network state');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};
const opts = {
  name: 'Mara',
  classId: 'soldier' as const,
  mode: 'short' as const,
  difficulty: 'normal',
};

test(
  'real room clients observe checkpoint waits, cannot alter frozen builds and join after the barrier',
  { timeout: 15000 },
  async () => {
    const ledger = openLedger(':memory:'),
      key = randomBytes(32),
      store = new RunStore(ledger.db, key);
    let release!: () => void,
      registering = false,
      journal!: RunJournal;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const transport: RunTransport = {
      register: async (input) => {
        registering = true;
        await gate;
        return store.register(input);
      },
      apply: (event) => store.apply(event),
      lookup: (id) => store.get(id),
    };
    const { server, httpServer } = createGameServer({
      createRunJournal: () => (journal = RunJournal.create(transport, key, 'websocket-instance')),
    });
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port,
      owner = new Session(endpoint),
      guest = new Session(endpoint),
      statuses: CheckpointStatus[] = [];
    owner.onCheckpointStatus = (status) => statuses.push(status);
    try {
      await owner.connect(opts);
      await until(() => registering && owner.view?.players.length === 1);
      const room = liveRooms.get(owner.room!.roomId)!,
        tick = room.game.tick,
        coins = room.game.players.get(owner.id)!.coins;
      owner.start();
      const purchase = new Promise<{ ok: boolean; reason?: string }>(
        (resolve) => (owner.onPurchase = resolve),
      );
      owner.purchase({ kind: 'supply', item: 'medkit' });
      const rejected = await purchase;
      assert.equal(rejected.ok, false);
      assert.equal(rejected.reason, 'checkpointPending');
      assert.equal(room.game.players.get(owner.id)!.coins, coins);
      const joined = guest.connect(
        { ...opts, name: 'Iona', classId: 'medic' },
        { roomId: room.roomId },
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(room.game.phase, 'lobby');
      assert.equal(room.game.tick, tick);
      assert.equal(room.game.players.size, 1);
      assert(statuses.includes('pending'));
      release();
      await joined;
      await until(() => owner.view?.phase === 'combat' && owner.view.players.length === 2);
      const row = (await store.get(journal.runId))!;
      assert.equal(row.state, 'combat');
      assert.equal(row.ranked, 0);
      const checkpoint = verifyBoundary(JSON.parse(row.checkpoint), key).game;
      assert.equal(checkpoint.players.size, 2);
      assert.equal(checkpoint.players.get(owner.id)!.supplies[0].count, 0);
      assert(statuses.includes('acknowledged'));
      assert.equal(owner.checkpointStatus, 'acknowledged');
    } finally {
      release();
      await Promise.allSettled([guest.close(), owner.close()]);
      await server.gracefullyShutdown(false);
      ledger.sqlite.close();
    }
  },
);

test(
  'real clients see a latched checkpoint outage while the Practice encounter continues',
  { timeout: 15000 },
  async () => {
    const key = randomBytes(32);
    let calls = 0;
    const { server, httpServer } = createGameServer({
      createRunJournal: () =>
        RunJournal.create(
          {
            register: async () => {
              calls++;
              throw new TypeError('synthetic checkpoint outage');
            },
            apply: async () => {
              throw Error('unexpected lifecycle write');
            },
            lookup: async () => {
              throw Error('unexpected lookup');
            },
          },
          key,
          'unavailable-instance',
        ),
    });
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const owner = new Session('http://127.0.0.1:' + address.port);
    try {
      await owner.connect(opts);
      await until(() => owner.checkpointStatus === 'unavailable');
      owner.start();
      await until(() => owner.view?.phase === 'combat');
      const tick = owner.view!.combatTick;
      await until(() => owner.view!.combatTick > tick + 2);
      assert.equal(owner.checkpointStatus, 'unavailable');
      assert.equal(calls, 2);
    } finally {
      await owner.close();
      await server.gracefullyShutdown(false);
    }
  },
);
