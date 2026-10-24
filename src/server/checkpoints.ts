// Signing keys are server-only. A valid signature is not a durable restore claim.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Game } from '../shared/game.ts';
const MAX_BYTES = 1024 * 1024;
const DAY = 86400000;
type Identity = { runId: string; ownerEpoch: number; sequence: number };
export type SignedBoundary = { body: string; signature: string };
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
  if (raw.byteLength > MAX_BYTES) throw Error('checkpointTooLarge');
  return {
    body: raw.toString('base64url'),
    signature: createHmac('sha256', checkedKey(key)).update(raw).digest('base64url'),
  };
}
export function verifyBoundary(value: unknown, key: Uint8Array, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalidCheckpoint');
  const signed = value as SignedBoundary;
  if (
    Object.keys(signed).length !== 2 ||
    typeof signed.body !== 'string' ||
    signed.body.length > Math.ceil((MAX_BYTES * 4) / 3) ||
    !/^[a-zA-Z0-9_-]+$/.test(signed.body) ||
    typeof signed.signature !== 'string' ||
    !/^[a-zA-Z0-9_-]{43}$/.test(signed.signature)
  )
    throw Error('invalidCheckpoint');
  const raw = Buffer.from(signed.body, 'base64url'),
    signature = Buffer.from(signed.signature, 'base64url');
  if (
    raw.byteLength > MAX_BYTES ||
    raw.toString('base64url') !== signed.body ||
    signature.toString('base64url') !== signed.signature
  )
    throw Error('invalidCheckpoint');
  const expected = createHmac('sha256', checkedKey(key)).update(raw).digest();
  if (signature.byteLength !== expected.byteLength || !timingSafeEqual(signature, expected))
    throw Error('invalidSignature');
  const body = JSON.parse(raw.toString('utf8'));
  if (
    body.schemaVersion !== 1 ||
    !validIdentity(body) ||
    !Number.isSafeInteger(body.issuedAt) ||
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
    digest: createHash('sha256').update(raw).digest('hex'),
    game,
  };
}
