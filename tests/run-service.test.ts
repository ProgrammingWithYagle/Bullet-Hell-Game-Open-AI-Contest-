import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { Game } from '../src/shared/game.ts';
import type { DurableDB, Statement } from '../src/server/run-store.ts';
import { signBoundary, verifyBoundary } from '../src/server/checkpoints.ts';
import { runService } from '../src/server/run-service.ts';
import { RunServiceClient } from '../src/server/run-client.ts';
import { signedRunHeaders, readRunBody, RUN_BODY_LIMIT } from '../src/server/run-auth.ts';
const now = 1792770000000;
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of ['0001_runs.sql', '0002_writer_nonces.sql'])
    sqlite.exec(readFileSync('services/run-ledger/migrations/' + file, 'utf8'));
  class Query implements Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) {
      this.values = values;
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
        for (const s of statements) {
          const q = s as Query;
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
    boundaryKey = randomBytes(32),
    writer = 'official-server';
  const game = new Game({ maxPlayers: 1 });
  game.addPlayer('survivor', 'Mara', 'soldier');
  const runId = randomUUID(),
    checkpoint = signBoundary(game, { runId, sequence: 0, ownerEpoch: 1 }, boundaryKey, now);
  const registration = { runId, ownerId: 'instance-a', checkpoint, ranked: false };
  const handler = runService(db, boundaryKey, { [writer]: { key, serverIds: [writer] } });
  const request = (path: string, input: unknown, at = now, nonce?: string) => {
    const bytes = Buffer.from(typeof input === 'string' ? input : JSON.stringify(input));
    return new Request('https://ledger.invalid' + path, {
      method: 'POST',
      headers: signedRunHeaders(path, bytes, writer, key, at, nonce),
      body: bytes,
    });
  };
  return {
    sqlite,
    db,
    key,
    boundaryKey,
    writer,
    handler,
    request,
    registration,
    runId,
    checkpoint,
  };
}
test('HTTP writer authentication binds exact UTF-8 bytes, route, time and nonce; identical event retries need a new nonce', async () => {
  const s = setup();
  try {
    const nonce = 'a'.repeat(32),
      req = s.request('/v1/runs/register', s.registration, now, nonce);
    assert.equal((await s.handler(req, now)).status, 200);
    assert.equal(
      (await s.handler(s.request('/v1/runs/register', s.registration, now, nonce), now)).status,
      401,
    );
    assert.equal(
      (await s.handler(s.request('/v1/runs/register', s.registration), now)).status,
      200,
    );
    const raw = Buffer.from('{"runId":"' + s.runId + '","note":"墓地"}');
    const headers = signedRunHeaders('/v1/runs/lookup', raw, s.writer, s.key, now);
    const tampered = new Request('https://ledger.invalid/v1/runs/lookup', {
      method: 'POST',
      headers,
      body: raw.toString().replace('墓地', '墓場'),
    });
    assert.equal((await s.handler(tampered, now)).status, 401);
    const wrongPath = new Request('https://ledger.invalid/v1/runs/event', {
      method: 'POST',
      headers,
      body: raw,
    });
    assert.equal((await s.handler(wrongPath, now)).status, 401);
    const wrongMethod = new Request('https://ledger.invalid/v1/runs/lookup', {
      method: 'PUT',
      headers,
      body: raw,
    });
    assert.equal((await s.handler(wrongMethod, now)).status, 401);
    assert.equal(
      (await s.handler(s.request('/v1/runs/lookup', { runId: s.runId }, now - 301000), now)).status,
      401,
    );
    const valid = s.request('/v1/runs/lookup', { runId: s.runId });
    assert.equal((await s.handler(valid, now)).status, 200);
  } finally {
    s.sqlite.close();
  }
});

test('writer transport matches the documented seconds, body-digest and base64url HMAC contract', async () => {
  const s = setup();
  try {
    const body = Buffer.from(JSON.stringify({ runId: s.runId })),
      nonce = 'b'.repeat(32);
    const headers = signedRunHeaders('/v1/runs/lookup', body, s.writer, s.key, now, nonce);
    const expected = createHmac('sha256', s.key)
      .update(
        [
          'POST',
          '/v1/runs/lookup',
          String(now / 1000),
          nonce,
          createHash('sha256').update(body).digest('hex'),
        ].join('\n'),
      )
      .digest('base64url');
    assert.equal(headers['X-Grave-Time'], '1792770000');
    assert.equal(headers['X-Grave-Signature'], expected);
    assert.equal(headers['X-Grave-Key-Id'], s.writer);
    assert.equal(headers['X-Grave-Server-Id'], s.writer);
    assert.equal(
      (
        await s.handler(
          new Request('https://ledger.invalid/v1/runs/lookup', {
            method: 'POST',
            headers,
            body,
          }),
          now,
        )
      ).status,
      404,
    );
    const expiry = s.sqlite.prepare('SELECT expires_at FROM writer_nonces').get() as {
      expires_at: number;
    };
    assert.equal(expiry.expires_at, now + 600000);
    assert.equal(
      (await s.handler(s.request('/v1/runs/lookup', { runId: s.runId }, now - 300000), now)).status,
      404,
    );
    assert.equal(
      (await s.handler(s.request('/v1/runs/lookup', { runId: s.runId }, now + 301000), now)).status,
      401,
    );
  } finally {
    s.sqlite.close();
  }
});

test('a valid key cannot impersonate an unconfigured server or key ID, or add unsigned URL queries', async () => {
  const s = setup();
  try {
    const body = Buffer.from(JSON.stringify({ runId: s.runId }));
    for (const headers of [
      signedRunHeaders('/v1/runs/lookup', body, 'rogue-server', s.key, now, undefined, s.writer),
      signedRunHeaders('/v1/runs/lookup', body, s.writer, s.key, now, undefined, '__proto__'),
    ]) {
      assert.equal(
        (
          await s.handler(
            new Request('https://ledger.invalid/v1/runs/lookup', { method: 'POST', headers, body }),
            now,
          )
        ).status,
        401,
      );
    }
    const valid = signedRunHeaders('/v1/runs/lookup', body, s.writer, s.key, now);
    assert.equal(
      (
        await s.handler(
          new Request('https://ledger.invalid/v1/runs/lookup?extra=1', {
            method: 'POST',
            headers: valid,
            body,
          }),
          now,
        )
      ).status,
      401,
    );
    assert.equal(sqliteCount(s.sqlite, 'writer_nonces'), 0);
  } finally {
    s.sqlite.close();
  }
});

test('authenticated JSON rejects unknown fields, ill-typed restore flags and invalid IDs before changing a run', async () => {
  const s = setup();
  try {
    assert.equal(
      (
        await s.handler(
          s.request('/v1/runs/register', { ...s.registration, trustedScore: 999 }),
          now,
        )
      ).status,
      400,
    );
    assert.equal(sqliteCount(s.sqlite, 'runs'), 0);
    assert.equal(
      (await s.handler(s.request('/v1/runs/register', s.registration), now)).status,
      200,
    );
    const event = {
      runId: s.runId,
      eventId: 'claim',
      ownerId: 'instance-a',
      ownerEpoch: 1,
      expectedSequence: 0,
      previousDigest: verifyBoundary(s.checkpoint, s.boundaryKey, now).digest,
      kind: 'restore-claim',
    };
    for (const bad of [
      { ...event, allowRecoveryPractice: 'true' },
      { ...event, runId: '../private' },
      { ...event, ownerEpoch: 1.5 },
      { ...event, checkpoint: s.checkpoint },
    ])
      assert.equal((await s.handler(s.request('/v1/runs/event', bad), now)).status, 400);
    assert.equal(
      (await s.handler(s.request('/v1/runs/lookup', { runId: s.runId, includeSecrets: true }), now))
        .status,
      400,
    );
    assert.equal(sqliteCount(s.sqlite, 'run_events'), 0);
  } finally {
    s.sqlite.close();
  }
});
test('unauthenticated/oversized writes and ranked registrations are rejected without creating a run', async () => {
  const s = setup();
  try {
    const body = JSON.stringify(s.registration);
    assert.equal(
      (
        await s.handler(
          new Request('https://ledger.invalid/v1/runs/register', { method: 'POST', body }),
          now,
        )
      ).status,
      401,
    );
    assert.equal(
      (await s.handler(s.request('/v1/runs/register', { ...s.registration, ranked: true }), now))
        .status,
      400,
    );
    const oversized = new Request('https://ledger.invalid/v1/runs/register', {
      method: 'POST',
      body: Buffer.alloc(RUN_BODY_LIMIT + 1),
    });
    assert.equal((await s.handler(oversized, now)).status, 413);
    const prototypeHeaders = signedRunHeaders(
      '/v1/runs/register',
      Buffer.from(body),
      '__proto__',
      s.key,
      now,
    );
    assert.equal(
      (
        await s.handler(
          new Request('https://ledger.invalid/v1/runs/register', {
            method: 'POST',
            headers: prototypeHeaders,
            body,
          }),
          now,
        )
      ).status,
      401,
    );
    assert.equal(sqliteCount(s.sqlite, 'runs'), 0);
    const exact = Buffer.alloc(RUN_BODY_LIMIT, 32);
    assert.equal(
      (await readRunBody(new Request('https://local.invalid/', { method: 'POST', body: exact })))
        .byteLength,
      RUN_BODY_LIMIT,
    );
  } finally {
    s.sqlite.close();
  }
});
function sqliteCount(sqlite: DatabaseSync, table: string) {
  return (sqlite.prepare('SELECT COUNT(*) AS n FROM ' + table).get() as { n: number }).n;
}
test('authenticated ledger requests distinguish a stale ownership conflict from unavailable nonce/database storage', async () => {
  const s = setup();
  try {
    assert.equal(
      (await s.handler(s.request('/v1/runs/register', s.registration), now)).status,
      200,
    );
    const event = {
      runId: s.runId,
      eventId: 'combat',
      ownerId: 'wrong-owner',
      ownerEpoch: 1,
      expectedSequence: 0,
      previousDigest: verifyBoundary(s.checkpoint, s.boundaryKey, now).digest,
      kind: 'combat-start',
    };
    assert.equal((await s.handler(s.request('/v1/runs/event', event), now)).status, 409);
    s.sqlite.close();
    assert.equal(
      (await s.handler(s.request('/v1/runs/lookup', { runId: s.runId }), now)).status,
      503,
    );
  } finally {
    try {
      s.sqlite.close();
    } catch {}
  }
});
test(
  'actual local HTTP client registers, retries, reads and finalizes signed state without following redirects or leaking service access',
  { timeout: 15000 },
  async () => {
    const s = setup();
    let redirect = false,
      redirectRequests = 0;
    const server = createServer(async (req, res) => {
      if (req.url === '/redirect-destination') {
        redirectRequests++;
        res.writeHead(200);
        res.end('{}');
        return;
      }
      if (redirect) {
        res.writeHead(302, { Location: '/redirect-destination' });
        res.end('{}');
        return;
      }
      try {
        const request = new Request('http://127.0.0.1' + req.url, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: Readable.toWeb(req) as ReadableStream,
          duplex: 'half',
        } as RequestInit);
        const response = await s.handler(request, Date.now());
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch {
        res.writeHead(500);
        res.end('{}');
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      assert(address && typeof address === 'object');
      const client = new RunServiceClient('http://127.0.0.1:' + address.port, s.writer, s.key);
      const checkpoint = signBoundary(
        verifyBoundary(s.checkpoint, s.boundaryKey, now).game,
        { runId: s.runId, sequence: 0, ownerEpoch: 1 },
        s.boundaryKey,
      );
      const registration = { ...s.registration, checkpoint };
      assert.deepEqual(await client.register(registration), await client.register(registration));
      const run = await client.lookup(s.runId);
      assert.equal(run.owner_id, 'instance-a');
      const event = {
        runId: s.runId,
        eventId: 'finalize',
        ownerId: 'instance-a',
        ownerEpoch: 1,
        expectedSequence: 0,
        previousDigest: run.digest,
        kind: 'finalize' as const,
      };
      assert.deepEqual(await client.apply(event), await client.apply(event));
      assert.equal((await client.lookup(s.runId)).state, 'finalized');
      redirect = true;
      await assert.rejects(client.lookup(s.runId));
      assert.equal(redirectRequests, 0);
      assert.throws(() => new RunServiceClient('ftp://localhost', s.writer, s.key));
      assert.throws(
        () =>
          new RunServiceClient('https://other.invalid', s.writer, s.key, {
            origin: 'https://approved.invalid',
            token: 'test-only',
          }),
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      s.sqlite.close();
    }
  },
);
