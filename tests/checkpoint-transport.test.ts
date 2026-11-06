import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { Game } from '../src/shared/game.ts';
import {
  CHECKPOINT_RAW_LIMIT,
  CHECKPOINT_COMPRESSED_LIMIT,
  signBoundary,
  verifyBoundary,
} from '../src/server/checkpoints.ts';
import { RunJournal } from '../src/server/run-journal.ts';
import { RUN_BODY_LIMIT } from '../src/server/run-auth.ts';
import { recoveryBuild } from './helpers/recovery-build.ts';
const now = 1792880000000;
function packed(payload: Buffer, key: Uint8Array) {
  return {
    body: payload.toString('base64url'),
    signature: createHmac('sha256', key)
      .update('grave-boundary:deflate-raw-v1\0')
      .update(payload)
      .digest('base64url'),
    encoding: 'deflate-raw-v1' as const,
  };
}

test('fifty developed builds fit the unchanged writer limit and preserve their exact raw identity in both envelope formats', (t) => {
  const { game } = recoveryBuild();
  const key = randomBytes(32);
  const id = { runId: randomUUID(), ownerEpoch: 1, sequence: 0 };
  const signed = signBoundary(game, id, key, now);
  assert.equal(signed.encoding, 'deflate-raw-v1');
  const raw = inflateRawSync(Buffer.from(signed.body, 'base64url'));
  const registrationBytes = Buffer.byteLength(
    JSON.stringify({ runId: id.runId, checkpoint: signed, ranked: false, ownerId: 'instance-a' }),
  );
  assert(raw.length > RUN_BODY_LIMIT);
  assert(raw.length < CHECKPOINT_RAW_LIMIT);
  assert(registrationBytes < RUN_BODY_LIMIT);
  const legacy = {
    body: raw.toString('base64url'),
    signature: createHmac('sha256', key).update(raw).digest('base64url'),
  };
  assert(Buffer.byteLength(JSON.stringify(legacy)) > RUN_BODY_LIMIT);
  const restored = verifyBoundary(signed, key, now);
  assert.equal(restored.digest, createHash('sha256').update(raw).digest('hex'));
  assert.equal(restored.digest, verifyBoundary(legacy, key, now).digest);
  assert.equal(restored.game.players.size, 50);
  assert.deepEqual(
    restored.game.authoritativeCheckpoint()!.transactions,
    game.authoritativeCheckpoint()!.transactions,
  );
  t.diagnostic(
    JSON.stringify({
      participants: 50,
      rawBytes: raw.length,
      compressedBytes: Buffer.from(signed.body, 'base64url').length,
      registrationBytes,
      bodyLimit: RUN_BODY_LIMIT,
      classes: new Set([...game.players.values()].map((p) => p.classId)).size,
    }),
  );
});

test('packed signatures authenticate before inflation and bind the encoding without downgrading legacy checkpoints', () => {
  const key = randomBytes(32),
    payload = deflateRawSync(Buffer.from('{"invalid":true}'));
  const valid = packed(payload, key);
  assert.throws(
    () => verifyBoundary({ ...valid, signature: randomBytes(32).toString('base64url') }, key, now),
    /invalidSignature/,
  );
  const { encoding: omitted, ...stripped } = valid;
  assert.throws(() => verifyBoundary(stripped, key, now), /invalidSignature/);
  assert.throws(
    () => verifyBoundary({ ...valid, encoding: 'gzip' }, key, now),
    /invalidCheckpoint/,
  );
  assert.throws(
    () => verifyBoundary({ ...valid, encoding: undefined }, key, now),
    /invalidCheckpoint/,
  );
  assert.throws(() => verifyBoundary({ ...valid, extra: 1 }, key, now), /invalidCheckpoint/);
  assert.throws(
    () => verifyBoundary({ ...valid, body: valid.body + '=' }, key, now),
    /invalidCheckpoint/,
  );
  // A bad stream with a wrong signature must fail authentication, not inflation.
  assert.throws(
    () => verifyBoundary({ ...valid, body: Buffer.from([255]).toString('base64url') }, key, now),
    /invalidSignature/,
  );
  assert.throws(
    () => verifyBoundary(packed(Buffer.from([255]), key), key, now),
    /invalidCheckpoint/,
  );
  assert.throws(
    () => verifyBoundary(packed(Buffer.alloc(CHECKPOINT_COMPRESSED_LIMIT + 1), key), key, now),
    /invalidCheckpoint/,
  );
});

test('authenticated expansion beyond one MiB, truncated streams and trailing compressed data are rejected', () => {
  const key = randomBytes(32);
  const bomb = deflateRawSync(Buffer.alloc(CHECKPOINT_RAW_LIMIT + 1, 32));
  assert(bomb.length < CHECKPOINT_COMPRESSED_LIMIT);
  assert.throws(() => verifyBoundary(packed(bomb, key), key, now), /invalidCheckpoint/);
  const game = new Game({ maxPlayers: 1 });
  game.addPlayer('a', 'Mara', 'soldier');
  const signed = signBoundary(game, { runId: randomUUID(), ownerEpoch: 1, sequence: 0 }, key, now);
  const raw = Buffer.from(signed.body, 'base64url'),
    stream = deflateRawSync(raw);
  assert.equal(verifyBoundary(packed(stream, key), key, now).game.players.size, 1);
  assert.throws(
    () => verifyBoundary(packed(stream.subarray(0, stream.length - 1), key), key, now),
    /invalidCheckpoint/,
  );
  assert.throws(
    () => verifyBoundary(packed(Buffer.concat([stream, Buffer.from('trailing')]), key), key, now),
    /invalidCheckpoint/,
  );
  assert.throws(
    () => verifyBoundary(packed(Buffer.concat([stream, stream]), key), key, now),
    /invalidCheckpoint/,
  );
});

test('legacy envelope compatibility retains strict UTF-8, metadata, clock and expiry checks', () => {
  const key = randomBytes(32),
    game = new Game({ maxPlayers: 1 });
  game.addPlayer('a', 'Mara', 'soldier');
  const signed = signBoundary(game, { runId: randomUUID(), ownerEpoch: 1, sequence: 0 }, key, now);
  assert.equal(signed.encoding, undefined);
  assert.equal(Object.keys(signed).length, 2);
  const original = JSON.parse(Buffer.from(signed.body, 'base64url').toString('utf8'));
  for (const body of [
    { ...original, extra: 1 },
    { ...original, issuedAt: -1, expiresAt: 86400000 - 1 },
  ]) {
    const raw = Buffer.from(JSON.stringify(body));
    assert.throws(() =>
      verifyBoundary(
        {
          body: raw.toString('base64url'),
          signature: createHmac('sha256', key).update(raw).digest('base64url'),
        },
        key,
        now,
      ),
    );
  }
  const raw = Buffer.from('{"invalid":"\xff"}', 'latin1');
  assert.throws(
    () =>
      verifyBoundary(
        {
          body: raw.toString('base64url'),
          signature: createHmac('sha256', key).update(raw).digest('base64url'),
        },
        key,
        now,
      ),
    /invalidCheckpoint/,
  );
  for (const clock of [-1, NaN, Infinity, 1.5])
    assert.throws(() => verifyBoundary(signed, key, clock), /invalidCheckpoint/);
  assert.throws(() => verifyBoundary(signed, key, now + 86400000), /expiredCheckpoint/);
});

test('an incompressible legal roster fails closed without dropping receipts or raising the transport limit', async () => {
  const game = new Game({ mode: 'endless', maxPlayers: 50 });
  for (let n = 0; n < 50; n++) {
    const p = game.addPlayer('p-' + n, 'Fixture ' + n, 'soldier');
    for (let j = 0; j < 30; j++)
      game.transact(p.id, {
        id: randomBytes(32).toString('hex'),
        kind: 'weapon',
        item: randomBytes(32).toString('hex'),
      });
  }
  const state = game.authoritativeCheckpoint()!;
  assert(Buffer.byteLength(JSON.stringify(state)) < CHECKPOINT_RAW_LIMIT);
  assert.equal(Game.restoreAuthoritative(state).players.size, 50);
  assert(state.transactions.every((t) => t.history.length === 30));
  const key = randomBytes(32),
    id = { runId: randomUUID(), ownerEpoch: 1, sequence: 0 };
  assert.throws(() => signBoundary(game, id, key, now), /checkpointTransferTooLarge/);
  let requests = 0;
  const journal = RunJournal.create(
    {
      register: async () => {
        requests++;
        return {};
      },
      apply: async () => {
        requests++;
        return {};
      },
      lookup: async () => {
        requests++;
        return {};
      },
    },
    key,
    'instance-a',
    () => now,
  );
  assert.equal(await journal.checkpoint(game), false);
  assert.equal(journal.status, 'unavailable');
  assert.equal(requests, 0);
  assert.deepEqual(game.authoritativeCheckpoint()!.transactions, state.transactions);
  assert.equal(RUN_BODY_LIMIT, 65536);
});

test('the maximum packed envelope leaves HTTP headroom for every permitted lifecycle and lookup field', () => {
  const checkpoint = {
    body: Buffer.alloc(CHECKPOINT_COMPRESSED_LIMIT).toString('base64url'),
    signature: 'a'.repeat(43),
    encoding: 'deflate-raw-v1',
  };
  const runId = randomUUID(),
    ownerId = 'a'.repeat(64),
    digest = 'b'.repeat(64),
    integer = Number.MAX_SAFE_INTEGER;
  const registration = { runId, ownerId, checkpoint, ranked: false };
  const event = {
    runId,
    ownerId,
    eventId: 'c'.repeat(64),
    ownerEpoch: integer,
    expectedSequence: integer,
    previousDigest: digest,
    kind: 'boundary',
    checkpoint,
  };
  const lookup = {
    run_id: runId,
    registration_hash: digest,
    owner_id: ownerId,
    owner_epoch: integer,
    sequence: integer,
    state: 'intermission',
    lease_until: integer,
    digest,
    checkpoint: JSON.stringify(checkpoint),
    ranked: 1,
  };
  for (const input of [registration, event, lookup])
    assert(Buffer.byteLength(JSON.stringify(input)) < RUN_BODY_LIMIT);
});
