import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fork, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { Game } from '../src/shared/game.ts';
import { RunJournal, type RunTransport } from '../src/server/run-journal.ts';
import { RunStore } from '../src/server/run-store.ts';
import { RunServiceClient } from '../src/server/run-client.ts';
import { openLedger } from './helpers/sqlite-ledger.ts';

function setup() {
  let now = Date.now();
  const ledger = openLedger(':memory:'),
    key = randomBytes(32);
  const store = new RunStore(ledger.db, key);
  const transport: RunTransport = {
    register: (input) => store.register(input, now),
    apply: (event) => store.apply(event, now),
    lookup: (id) => store.get(id),
  };
  const game = new Game({ mode: 'endless', maxPlayers: 2 });
  game.addPlayer('mara', 'Mara', 'soldier');
  game.addPlayer('iona', 'Iona', 'medic');
  return {
    ledger,
    key,
    store,
    transport,
    game,
    now: () => now,
    advance: (ms: number) => (now += ms),
  };
}
test('journal acknowledges combat before the caller starts it, refreshes every thirty seconds and preserves response-lost event IDs', async () => {
  const s = setup();
  try {
    const attempts: string[] = [];
    let lost = false;
    const journal = RunJournal.create(
      {
        ...s.transport,
        apply: async (event) => {
          attempts.push(event.eventId);
          const result = await s.transport.apply(event);
          if (event.kind === 'combat-start' && !lost) {
            lost = true;
            throw new TypeError('simulated response loss after commit');
          }
          return result;
        },
      },
      s.key,
      'instance-a',
      s.now,
    );
    assert.equal(s.game.phase, 'lobby');
    assert.equal(await journal.beforeCombat(s.game), true);
    assert.equal(s.game.phase, 'lobby');
    assert.equal((await s.store.get(journal.runId))!.state, 'combat');
    assert.equal(attempts.length, 2);
    assert.equal(attempts[0], attempts[1]);
    s.game.start();
    s.advance(29999);
    assert.equal(await journal.refreshLease(), true);
    assert.equal(attempts.length, 2);
    s.advance(1);
    assert.equal(await journal.refreshLease(), true);
    assert.equal(attempts.length, 3);
    assert.equal((await s.store.get(journal.runId))!.lease_until, s.now() + 90000);
    s.advance(90000);
    assert.equal(await journal.refreshLease(), false);
    assert.equal(journal.status, 'unavailable');
    assert.equal(attempts.length, 3);
  } finally {
    s.ledger.sqlite.close();
  }
});
test('initial outages, invalid acknowledgements and later failures cannot silently re-enable a journal', async () => {
  const s = setup();
  try {
    let calls = 0;
    const unavailable = RunJournal.create(
      {
        ...s.transport,
        register: async () => {
          calls++;
          throw new TypeError('offline');
        },
      },
      s.key,
      'instance-a',
      s.now,
    );
    assert.equal(await unavailable.beforeCombat(s.game), false);
    assert.equal(calls, 2);
    assert.equal(unavailable.status, 'unavailable');
    assert.equal(await unavailable.checkpoint(s.game), false);
    assert.equal(calls, 2);
    const invalid = RunJournal.create(
      {
        ...s.transport,
        register: async () => ({
          sequence: 0,
          ownerEpoch: 2,
          state: 'intermission',
          ranked: false,
        }),
      },
      s.key,
      'instance-b',
      s.now,
    );
    assert.equal(await invalid.checkpoint(s.game), false);
    const good = RunJournal.create(s.transport, s.key, 'instance-c', s.now);
    assert.equal(await good.checkpoint(s.game), true);
    s.ledger.sqlite.close();
    assert.equal(await good.beforeCombat(s.game), false);
    assert.equal(good.status, 'unavailable');
  } finally {
    try {
      s.ledger.sqlite.close();
    } catch {}
  }
});

async function launch(path: string, key: Uint8Array, writerKey: Uint8Array, now: number) {
  const child = fork('tests/helpers/ledger-process.ts', [], {
    execArgv: ['--import', 'tsx'],
    env: {
      ...process.env,
      GRAVE_TEST_DB: path,
      GRAVE_TEST_WRITE_KEY: Buffer.from(writerKey).toString('hex'),
      GRAVE_TEST_BOUNDARY_KEY: Buffer.from(key).toString('hex'),
      GRAVE_TEST_NOW: String(now),
    },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  let errorText = '';
  child.stderr!.on('data', (bytes) => {
    errorText = (errorText + String(bytes)).slice(-3000);
  });
  const port = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(Error('Ledger fixture did not start'));
    }, 8000);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(Error('Ledger fixture exited ' + code + ': ' + errorText));
    });
    child.once('message', (message) => {
      clearTimeout(timer);
      if (
        message &&
        typeof message === 'object' &&
        'port' in message &&
        typeof message.port === 'number'
      )
        resolve(message.port);
      else reject(Error('Missing test port'));
    });
  });
  return { child, client: new RunServiceClient('http://127.0.0.1:' + port, 'test', writerKey) };
}
async function stop(child: ChildProcess) {
  if (child.exitCode !== null) return;
  const exit = once(child, 'exit');
  child.kill('SIGTERM');
  await exit;
}
function removeTestDirectory(directory: string) {
  const target = resolve(directory),
    parent = resolve(tmpdir()) + sep;
  if (!target.startsWith(parent) || !/^grave-ledger-(restart|combat)-/.test(basename(target)))
    throw Error('Refusing test cleanup outside the created temporary directory');
  rmSync(target, { recursive: true, force: true });
}
test(
  'actual HTTP process restart preserves file-backed boundaries and only one competing owner can claim them',
  { timeout: 30000 },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), 'grave-ledger-restart-'));
    const path = join(directory, 'run.sqlite'),
      key = randomBytes(32),
      writerKey = randomBytes(32);
    let now = Date.now(),
      active: Awaited<ReturnType<typeof launch>> | undefined;
    try {
      active = await launch(path, key, writerKey, now);
      const journal = RunJournal.create(active.client, key, 'instance-a', () => now);
      const game = new Game({ mode: 'endless', maxPlayers: 2 });
      const p = game.addPlayer('mara', 'Mara', 'soldier');
      game.addPlayer('iona', 'Iona', 'medic');
      assert(game.transact(p.id, { id: 'medkit-purchase', kind: 'supply', item: 'medkit' }).ok);
      assert.equal(await journal.beforeCombat(game), true);
      game.start();
      game.boss.health = 0;
      game.step(); // synthetic victory, not human play
      assert(game.vote(p.id, 2));
      assert.equal(await journal.checkpoint(game), true);
      const cards = [...game.mutationCards],
        rng = game.rng.state,
        coins = p.coins;
      const old = await active.client.lookup(journal.runId);
      await stop(active.child);
      active = undefined;
      now += 90001;
      active = await launch(path, key, writerKey, now);
      const contenders = await Promise.allSettled(
        ['instance-b', 'instance-c'].map((owner) =>
          RunJournal.claim(active!.client, key, owner, journal.runId, false, () => now),
        ),
      );
      assert.equal(contenders.filter((r) => r.status === 'fulfilled').length, 1);
      const winner = contenders.find((r) => r.status === 'fulfilled');
      assert(winner?.status === 'fulfilled');
      const restored = winner.value;
      assert.equal(restored.interruptedCombat, false);
      assert.equal(restored.game.players.size, 2);
      // Checkpoints canonicalize the same 32 RNG bits as unsigned JSON.
      assert.equal(restored.game.rng.state >>> 0, rng >>> 0);
      assert.equal(restored.game.rng.next(), game.rng.next());
      assert.deepEqual(restored.game.mutationCards, cards);
      assert.equal(restored.game.votes.get(p.id), 2);
      assert([...restored.game.players.values()].every((player) => !player.connected));
      const survivor = restored.game.players.get(p.id)!;
      restored.game.setConnected(p.id, true);
      assert.equal(survivor.coins, coins);
      assert.equal(survivor.supplies[0].count, 1);
      assert(
        restored.game.transact(p.id, { id: 'medkit-purchase', kind: 'supply', item: 'medkit' }).ok,
      );
      assert.equal(survivor.coins, coins);
      assert.equal(survivor.supplies[0].count, 1);
      await assert.rejects(
        active.client.apply({
          runId: journal.runId,
          eventId: 'stale-owner',
          ownerId: 'instance-a',
          ownerEpoch: 1,
          expectedSequence: old.sequence,
          previousDigest: old.digest,
          kind: 'combat-start',
        }),
        /runConflict/,
      );
      assert.equal(await restored.journal.checkpoint(restored.game), true);
      assert.equal(await restored.journal.finalize(), true);
      const final = await active.client.lookup(journal.runId);
      assert.equal(final.state, 'finalized');
      assert.equal(final.owner_epoch, 2);
      now += 90001;
      await assert.rejects(
        RunJournal.claim(active.client, key, 'instance-d', journal.runId, true, () => now),
        /runNotRecoverable/,
      );
    } finally {
      if (active) await stop(active.child);
      removeTestDirectory(directory);
    }
  },
);
test(
  'combat interrupted by a process restart can restore only as Recovery Practice',
  { timeout: 30000 },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), 'grave-ledger-combat-'));
    const key = randomBytes(32),
      writerKey = randomBytes(32),
      path = join(directory, 'run.sqlite');
    let now = Date.now(),
      active: Awaited<ReturnType<typeof launch>> | undefined;
    try {
      active = await launch(path, key, writerKey, now);
      const journal = RunJournal.create(active.client, key, 'instance-a', () => now);
      const game = new Game({ maxPlayers: 1 });
      game.addPlayer('mara', 'Mara', 'soldier');
      assert.equal(await journal.beforeCombat(game), true);
      game.start();
      await stop(active.child);
      active = undefined;
      now += 90001;
      active = await launch(path, key, writerKey, now);
      await assert.rejects(
        RunJournal.claim(active.client, key, 'instance-b', journal.runId, false, () => now),
        /runNotRecoverable/,
      );
      const restored = await RunJournal.claim(
        active.client,
        key,
        'instance-b',
        journal.runId,
        true,
        () => now,
      );
      assert.equal(restored.interruptedCombat, true);
      assert.equal(restored.game.phase, 'lobby');
      assert.equal((await active.client.lookup(journal.runId)).ranked, 0);
      assert.equal(await restored.journal.checkpoint(restored.game), true);
      assert.equal((await active.client.lookup(journal.runId)).ranked, 0);
    } finally {
      if (active) await stop(active.child);
      removeTestDirectory(directory);
    }
  },
);
