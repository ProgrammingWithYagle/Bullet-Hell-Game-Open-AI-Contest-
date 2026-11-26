import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { Game } from '../src/shared/game.ts';
import {
  RunStore,
  type DurableDB,
  type Statement,
  type LifecycleEvent,
} from '../src/server/run-store.ts';
import { signBoundary, verifyBoundary } from '../src/server/checkpoints.ts';
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync('services/run-ledger/migrations/0001_runs.sql', 'utf8'));
  class Query implements Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...v: (string | number | null)[]) {
      this.values = v;
      return this;
    }
    async first<T>() {
      return (sqlite.prepare(this.sql).get(...this.values) ?? null) as T | null;
    }
  }
  const db: DurableDB = {
    prepare: (sql) => new Query(sql),
    batch: async (statements) => {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        for (const statement of statements) {
          const q = statement as Query;
          sqlite.prepare(q.sql).run(...q.values);
        }
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  const key = randomBytes(32),
    g = new Game({ maxPlayers: 1 });
  g.addPlayer('solo', 'Mara', 'soldier');
  const runId = randomUUID(),
    checkpoint = signBoundary(g, { runId, ownerEpoch: 1, sequence: 0 }, key, 1000);
  const store = new RunStore(db, key),
    digest = verifyBoundary(checkpoint, key, 1000).digest;
  const input = { runId, ownerId: 'server-a', checkpoint, ranked: true };
  const event = (
    eventId: string,
    kind: LifecycleEvent['kind'],
    extra: Partial<LifecycleEvent> = {},
  ): LifecycleEvent => ({
    runId,
    eventId,
    kind,
    ownerId: 'server-a',
    ownerEpoch: 1,
    expectedSequence: 0,
    previousDigest: digest,
    ...extra,
  });
  return { sqlite, store, input, event, key, g, runId };
}
test('SQL lifecycle registration and event retry are idempotent; conflicts and finalized replay cannot change state', async () => {
  const s = setup();
  try {
    assert.deepEqual(await s.store.register(s.input, 1000), await s.store.register(s.input, 1000));
    await assert.rejects(s.store.register({ ...s.input, ownerId: 'other' }, 1000));
    const start = s.event('start', 'combat-start');
    assert.deepEqual(await s.store.apply(start, 2000), await s.store.apply(start, 3000));
    await assert.rejects(s.store.apply({ ...start, kind: 'finalize' }, 3000));
    const end = s.event('end', 'finalize');
    await s.store.apply(end, 4000);
    await assert.rejects(
      s.store.apply(s.event('restore', 'restore-claim', { ownerId: 'server-b' }), 100000),
    );
    await assert.rejects(s.store.apply(s.event('late', 'lease-refresh'), 5000));
    assert.equal((await s.store.get(s.runId))!.state, 'finalized');
  } finally {
    s.sqlite.close();
  }
});
test('two competing restore claims against the same expired lease yield exactly one owner epoch', async () => {
  const s = setup();
  try {
    await s.store.register(s.input, 1000);
    await assert.rejects(
      s.store.apply(s.event('early', 'restore-claim', { ownerId: 'server-b' }), 90000),
    );
    const results = await Promise.allSettled([
      s.store.apply(s.event('b', 'restore-claim', { ownerId: 'server-b' }), 91001),
      s.store.apply(s.event('c', 'restore-claim', { ownerId: 'server-c' }), 91001),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const row = (await s.store.get(s.runId))!;
    assert.equal(row.owner_epoch, 2);
    await assert.rejects(s.store.apply(s.event('old', 'combat-start'), 92000));
    assert.equal(
      (s.sqlite.prepare('SELECT COUNT(*) AS n FROM run_events').get() as { n: number }).n,
      1,
    );
  } finally {
    s.sqlite.close();
  }
});
test('interrupted combat can only claim recovery practice and that downgrade stays latched', async () => {
  const s = setup();
  try {
    await s.store.register(s.input, 1000);
    await s.store.apply(s.event('start', 'combat-start'), 2000);
    await assert.rejects(
      s.store.apply(s.event('ranked', 'restore-claim', { ownerId: 'b' }), 92001),
    );
    const ack = await s.store.apply(
      s.event('practice', 'restore-claim', { ownerId: 'b', allowRecoveryPractice: true }),
      92001,
    );
    assert.equal(ack.ranked, false);
    assert.equal((await s.store.get(s.runId))!.ranked, 0);
    await s.store.apply(s.event('next', 'combat-start', { ownerId: 'b', ownerEpoch: 2 }), 93000);
    assert.equal((await s.store.get(s.runId))!.ranked, 0);
  } finally {
    s.sqlite.close();
  }
});
test('stale boundary sequence fails the SQL guard and cannot insert an event or replace a checkpoint', async () => {
  const s = setup();
  try {
    await s.store.register(s.input, 1000);
    const checkpoint = signBoundary(
      s.g,
      { runId: s.runId, ownerEpoch: 1, sequence: 1 },
      s.key,
      2000,
    );
    await s.store.apply(s.event('boundary', 'boundary', { checkpoint }), 2000);
    await assert.rejects(s.store.apply(s.event('stale', 'combat-start'), 3000));
    const row = (await s.store.get(s.runId))!;
    assert.equal(row.sequence, 1);
    assert.equal(row.checkpoint, JSON.stringify(checkpoint));
    assert.equal(
      (s.sqlite.prepare('SELECT COUNT(*) AS n FROM run_events').get() as { n: number }).n,
      1,
    );
  } finally {
    s.sqlite.close();
  }
});
test('a pre-combat checkpoint cannot roll back started combat as a ranked boundary', async () => {
  const s = setup();
  try {
    await s.store.register(s.input, 1000);
    await s.store.apply(s.event('start', 'combat-start'), 2000);
    const checkpoint = signBoundary(
      s.g,
      { runId: s.runId, ownerEpoch: 1, sequence: 1 },
      s.key,
      3000,
    );
    await assert.rejects(s.store.apply(s.event('rollback', 'boundary', { checkpoint }), 3000));
    assert.equal((await s.store.get(s.runId))!.state, 'combat');
    assert.equal((await s.store.get(s.runId))!.sequence, 0);
  } finally {
    s.sqlite.close();
  }
});
