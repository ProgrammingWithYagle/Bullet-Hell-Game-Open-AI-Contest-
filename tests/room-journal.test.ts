import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { Game } from '../src/shared/game.ts';
import { BOSS_DEFEAT_TICKS } from '../src/shared/boss-defeat-flow.ts';
import { RunJournal, type RunTransport } from '../src/server/run-journal.ts';
import { RoomJournal } from '../src/server/room-journal.ts';
import { RunStore } from '../src/server/run-store.ts';
import { verifyBoundary } from '../src/server/checkpoints.ts';
import type { CheckpointStatus } from '../src/shared/protocol.ts';
import { openLedger } from './helpers/sqlite-ledger.ts';

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => (release = resolve));
  return { promise, release };
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function fixture(wrap: (transport: RunTransport) => RunTransport = (x) => x) {
  const ledger = openLedger(':memory:'),
    key = randomBytes(32);
  let now = Date.now();
  const store = new RunStore(ledger.db, key),
    events: string[] = [],
    statuses: CheckpointStatus[] = [];
  const transport: RunTransport = {
    register: (input) => {
      events.push('register');
      return store.register(input, now);
    },
    apply: (event) => {
      events.push(event.kind);
      return store.apply(event, now);
    },
    lookup: (id) => store.get(id),
  };
  const game = new Game({ mode: 'endless', maxPlayers: 2 });
  game.addPlayer('mara', 'Mara', 'soldier');
  const journal = RunJournal.create(wrap(transport), key, 'room-instance', () => now),
    room = new RoomJournal(
      game,
      journal,
      (status) => statuses.push(status),
      () => now,
    );
  return {
    ledger,
    key,
    store,
    game,
    journal,
    room,
    events,
    statuses,
    advance: (ms: number) => (now += ms),
  };
}

test('room freezes its exact boundary and starts combat only after both durable acknowledgements', async () => {
  const boundary = deferred(),
    combat = deferred();
  const s = fixture((transport) => ({
    ...transport,
    register: async (input) => {
      await boundary.promise;
      return transport.register(input);
    },
    apply: async (event) => {
      if (event.kind === 'combat-start') await combat.promise;
      return transport.apply(event);
    },
  }));
  try {
    assert.equal(
      s.game.transact('mara', {
        id: 'before-start',
        kind: 'supply',
        item: 'medkit',
      }).ok,
      true,
    );
    s.room.start();
    await settle();
    for (let i = 0; i < 90; i++) s.room.step();
    assert.equal(s.game.tick, 0);
    assert.equal(s.game.phase, 'lobby');
    assert.equal(s.room.blocked, true);
    let writable = false;
    const join = s.room.writable().then(() => (writable = true));
    boundary.release();
    await settle();
    assert.equal((await s.store.get(s.journal.runId))!.state, 'intermission');
    assert.equal(s.game.phase, 'lobby');
    assert.equal(writable, false);
    combat.release();
    await join;
    assert.equal(s.game.phase, 'combat');
    const row = (await s.store.get(s.journal.runId))!;
    assert.equal(row.state, 'combat');
    const saved = verifyBoundary(JSON.parse(row.checkpoint), s.key).game;
    assert.equal(saved.players.get('mara')!.supplies[0].id, 'medkit');
    assert.equal(saved.players.get('mara')!.supplies[0].count, 1);
    assert.deepEqual(s.events, ['register', 'combat-start']);
    assert.equal(s.room.status, 'acknowledged');
  } finally {
    boundary.release();
    combat.release();
    s.room.dispose();
    s.ledger.sqlite.close();
  }
});

test('room captures victory intermissions, pauses their clocks and guards automatic redeployment', async () => {
  const boundary = deferred(),
    combat = deferred();
  let delayBoundary = false,
    delayCombat = false;
  const s = fixture((transport) => ({
    ...transport,
    apply: async (event) => {
      if (event.kind === 'boundary' && delayBoundary) await boundary.promise;
      if (event.kind === 'combat-start' && delayCombat) await combat.promise;
      return transport.apply(event);
    },
  }));
  try {
    s.room.start();
    await s.room.writable();
    delayBoundary = true;
    // Synthetic victory drives the actual simulation's intermission transition.
    s.game.boss.health = 0;
    s.room.step();
    const tick = s.game.tick;
    assert.equal(s.game.phase, 'mutationVote');
    for (let i = 0; i < 100; i++) s.room.step();
    assert.equal(s.game.tick, tick);
    assert.equal(s.room.blocked, true);
    boundary.release();
    await s.room.writable();
    const row = (await s.store.get(s.journal.runId))!;
    assert.equal(row.state, 'intermission');
    assert.equal(verifyBoundary(JSON.parse(row.checkpoint), s.key).game.encounter, 1);
    delayBoundary = false;
    for (let i = 0; i < BOSS_DEFEAT_TICKS; i++) s.room.step();
    for (const next of ['contractVote', 'shop', 'loading']) {
      s.game.phaseEnds = s.game.tick + 1;
      s.room.step();
      await s.room.writable();
      assert.equal(s.game.phase, next);
    }
    delayCombat = true;
    s.game.phaseEnds = s.game.tick + 1;
    s.room.step();
    await settle();
    assert.equal(s.game.phase, 'loading');
    assert.equal((await s.store.get(s.journal.runId))!.state, 'intermission');
    combat.release();
    await s.room.writable();
    assert.equal(s.game.phase, 'combat');
    assert.equal((await s.store.get(s.journal.runId))!.state, 'combat');
  } finally {
    boundary.release();
    combat.release();
    s.room.dispose();
    s.ledger.sqlite.close();
  }
});

test('combat continues during a lease request; an outage latches Practice status and terminal runs finalize', async () => {
  const lease = deferred();
  let fail = false;
  const s = fixture((transport) => ({
    ...transport,
    apply: async (event) => {
      if (event.kind === 'lease-refresh' && fail) {
        await lease.promise;
        throw new TypeError('synthetic outage');
      }
      return transport.apply(event);
    },
  }));
  try {
    s.room.start();
    await s.room.writable();
    fail = true;
    s.advance(30000);
    const tick = s.game.combatTick;
    s.room.step();
    s.room.step();
    assert.equal(s.game.combatTick, tick + 2);
    assert.equal(s.room.blocked, false);
    lease.release();
    await settle();
    assert.equal(s.room.status, 'unavailable');
    assert.equal(s.journal.status, 'unavailable');
    fail = false;
    const requests = s.events.length;
    s.advance(60000);
    s.game.boss.health = 0;
    s.room.step();
    s.room.step();
    await settle();
    assert.equal(s.events.length, requests);
    assert.equal(s.room.status, 'unavailable');
  } finally {
    lease.release();
    s.room.dispose();
    s.ledger.sqlite.close();
  }
  const completed = fixture();
  try {
    completed.room.start();
    await completed.room.writable();
    completed.game.boss.deadline = completed.game.combatTick + 1;
    completed.room.step();
    await completed.room.writable();
    assert.equal(completed.game.phase, 'defeat');
    assert.equal(completed.room.status, 'finalized');
    assert.equal((await completed.store.get(completed.journal.runId))!.state, 'finalized');
  } finally {
    completed.room.dispose();
    completed.ledger.sqlite.close();
  }
});

test('disposing a room during a slow checkpoint cannot start combat or broadcast after disposal', async () => {
  const gate = deferred();
  const s = fixture((transport) => ({
    ...transport,
    register: async (input) => {
      await gate.promise;
      return transport.register(input);
    },
  }));
  try {
    s.room.start();
    await settle();
    s.room.dispose();
    gate.release();
    await settle();
    s.room.step();
    assert.equal(s.game.phase, 'lobby');
    assert.equal(s.game.tick, 0);
    assert.equal(await s.room.writable(), false);
    assert.equal(s.statuses.length, 0);
  } finally {
    gate.release();
    s.ledger.sqlite.close();
  }
});
