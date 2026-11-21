// Signing keys are server-only. A valid signature is not a durable restore claim.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { Game } from '../shared/game.ts';

export const CHECKPOINT_RAW_LIMIT = 1024 * 1024;
export const CHECKPOINT_COMPRESSED_LIMIT = 46 * 1024;
const COMPRESS_AT = 16 * 1024;
const ENCODING = 'deflate-raw-v1';
const CONTEXT = Buffer.from('grave-boundary:deflate-raw-v1\0');
const DAY = 86400000;

type Identity = { runId: string; ownerEpoch: number; sequence: number };
export type SignedBoundary = { body: string; signature: string; encoding?: typeof ENCODING };
const validIdentity = (x: Identity) =>
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(x.runId) &&
  Number.isSafeInteger(x.ownerEpoch) &&
  x.ownerEpoch >= 1 &&
  Number.isSafeInteger(x.sequence) &&
  x.sequence >= 0;
function checkedKey(key: Uint8Array) {
  if (key.byteLength < 32) throw Error('invalidSigningKey');
  return key;
}
function signature(payload: Buffer, key: Uint8Array, compressed: boolean) {
  const hmac = createHmac('sha256', checkedKey(key));
  // Bind the encoding before the compressed bytes. Removing/changing its marker
  // cannot turn a packed signature into a legacy JSON signature.
  if (compressed) hmac.update(CONTEXT);
  return hmac.update(payload).digest();
}
export function signBoundary(
  game: Game,
  identity: Identity,
  key: Uint8Array,
  now = Date.now(),
): SignedBoundary {
  if (
    !validIdentity(identity) ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(now + DAY)
  )
    throw Error('invalidCheckpointIdentity');
  const state = game.authoritativeCheckpoint();
  if (!state) throw Error('unsafeCheckpointPhase');
  const raw = Buffer.from(
    JSON.stringify({ schemaVersion: 1, ...identity, issuedAt: now, expiresAt: now + DAY, state }),
  );
  if (raw.byteLength > CHECKPOINT_RAW_LIMIT) throw Error('checkpointTooLarge');
  const compressed = raw.byteLength > COMPRESS_AT;
  let payload = raw;
  if (compressed) {
    try {
      payload = deflateRawSync(raw, { level: 6, maxOutputLength: CHECKPOINT_COMPRESSED_LIMIT });
    } catch {
      // Never silently raise the 64 KiB HTTP boundary or discard purchase replies.
      throw Error('checkpointTransferTooLarge');
    }
  }
  return {
    body: payload.toString('base64url'),
    signature: signature(payload, key, compressed).toString('base64url'),
    ...(compressed ? { encoding: ENCODING } : {}),
  };
}
export function verifyBoundary(value: unknown, key: Uint8Array, now = Date.now()) {
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  )
    throw Error('invalidCheckpoint');
  const signed = value as SignedBoundary;
  const compressed = Object.hasOwn(signed, 'encoding');
  const limit = compressed ? CHECKPOINT_COMPRESSED_LIMIT : CHECKPOINT_RAW_LIMIT;
  if (
    Object.keys(signed).length !== (compressed ? 3 : 2) ||
    (compressed && signed.encoding !== ENCODING) ||
    typeof signed.body !== 'string' ||
    signed.body.length > Math.ceil((limit * 4) / 3) ||
    !/^[a-zA-Z0-9_-]+$/.test(signed.body) ||
    typeof signed.signature !== 'string' ||
    !/^[a-zA-Z0-9_-]{43}$/.test(signed.signature)
  )
    throw Error('invalidCheckpoint');
  const payload = Buffer.from(signed.body, 'base64url');
  const received = Buffer.from(signed.signature, 'base64url');
  if (
    payload.byteLength > limit ||
    payload.toString('base64url') !== signed.body ||
    received.toString('base64url') !== signed.signature
  )
    throw Error('invalidCheckpoint');
  const expected = signature(payload, key, compressed);
  if (received.byteLength !== expected.byteLength || !timingSafeEqual(received, expected))
    throw Error('invalidSignature');
  let raw: Buffer = payload;
  if (compressed) {
    try {
      // Authenticate before inflating; cap expansion and reject trailing streams.
      // Node's declarations omit the runtime result shape of info:true.
      const result = inflateRawSync(payload, {
        maxOutputLength: CHECKPOINT_RAW_LIMIT,
        info: true,
      }) as unknown as {
        buffer: Buffer;
        engine: { bytesWritten: number };
      };
      if (!Buffer.isBuffer(result.buffer) || result.engine.bytesWritten !== payload.byteLength)
        throw Error('invalidCompressedCheckpoint');
      raw = result.buffer;
    } catch {
      throw Error('invalidCheckpoint');
    }
  }
  let body;
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  } catch {
    throw Error('invalidCheckpoint');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 7)
    throw Error('invalidCheckpoint');
  if (
    body.schemaVersion !== 1 ||
    !validIdentity(body) ||
    !Number.isSafeInteger(body.issuedAt) ||
    body.issuedAt < 0 ||
    !Number.isSafeInteger(body.expiresAt) ||
    body.issuedAt > now + 300000 ||
    body.expiresAt !== body.issuedAt + DAY ||
    now >= body.expiresAt
  )
    throw Error('expiredCheckpoint');
  const game = Game.restoreAuthoritative(body.state);
  return {
    runId: body.runId as string,
    ownerEpoch: body.ownerEpoch as number,
    sequence: body.sequence as number,
    issuedAt: body.issuedAt as number,
    expiresAt: body.expiresAt as number,
    // Both supported envelopes identify the same exact uncompressed state bytes.
    digest: createHash('sha256').update(raw).digest('hex'),
    game,
  };
}
