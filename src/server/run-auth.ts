import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { DurableDB } from './run-store.ts';
export const RUN_BODY_LIMIT = 64 * 1024;
export type WriterKeys = Record<string, { key: Uint8Array; serverIds: readonly string[] }>;
const routes = new Set(['/v1/runs/register', '/v1/runs/event', '/v1/runs/lookup']);
export class RunRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
function signingMessage(
  method: string,
  path: string,
  time: string,
  nonce: string,
  body: Uint8Array,
) {
  return (
    method +
    '\n' +
    path +
    '\n' +
    time +
    '\n' +
    nonce +
    '\n' +
    createHash('sha256').update(body).digest('hex')
  );
}
export function signedRunHeaders(
  path: string,
  body: Uint8Array,
  serverId: string,
  key: Uint8Array,
  now = Date.now(),
  nonce = randomBytes(16).toString('hex'),
  keyId = serverId,
) {
  if (
    !routes.has(path) ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(serverId) ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(keyId) ||
    !/^[a-f0-9]{32}$/.test(nonce) ||
    body.byteLength > RUN_BODY_LIMIT ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    key.byteLength < 32 ||
    key.byteLength > 64
  )
    throw Error('invalidWriterRequest');
  const time = String(Math.floor(now / 1000));
  return {
    'Content-Type': 'application/json',
    'X-Grave-Key-Id': keyId,
    'X-Grave-Server-Id': serverId,
    'X-Grave-Time': time,
    'X-Grave-Nonce': nonce,
    'X-Grave-Signature': createHmac('sha256', key)
      .update(signingMessage('POST', path, time, nonce, body))
      .digest('base64url'),
  };
}
export async function readRunBody(request: Request): Promise<Uint8Array> {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > RUN_BODY_LIMIT))
    throw new RunRequestError(413, 'bodyTooLarge');
  if (!request.body) throw new RunRequestError(400, 'missingBody');
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > RUN_BODY_LIMIT) {
        await reader.cancel();
        throw new RunRequestError(413, 'bodyTooLarge');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
export async function authenticateRunRequest(
  request: Request,
  body: Uint8Array,
  keys: WriterKeys,
  db: DurableDB,
  now = Date.now(),
) {
  const url = new URL(request.url),
    keyId = request.headers.get('X-Grave-Key-Id') ?? '',
    serverId = request.headers.get('X-Grave-Server-Id') ?? '',
    time = request.headers.get('X-Grave-Time') ?? '',
    nonce = request.headers.get('X-Grave-Nonce') ?? '',
    supplied = request.headers.get('X-Grave-Signature') ?? '';
  const writer = Object.hasOwn(keys, keyId) ? keys[keyId] : undefined,
    key = writer?.key;
  if (
    request.method !== 'POST' ||
    url.search ||
    !routes.has(url.pathname) ||
    body.byteLength > RUN_BODY_LIMIT ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(keyId) ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(serverId) ||
    !writer?.serverIds.includes(serverId) ||
    !(key instanceof Uint8Array) ||
    key.byteLength < 32 ||
    key.byteLength > 64 ||
    !/^(0|[1-9]\d{0,12})$/.test(time) ||
    !Number.isSafeInteger(Number(time)) ||
    Math.abs(Math.floor(now / 1000) - Number(time)) > 300 ||
    !/^[a-f0-9]{32}$/.test(nonce) ||
    !/^[a-zA-Z0-9_-]{43}$/.test(supplied)
  )
    throw new RunRequestError(401, 'writerUnauthorized');
  const bytes = Buffer.from(supplied, 'base64url');
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  if (
    bytes.toString('base64url') !== supplied ||
    !(await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      Uint8Array.from(bytes),
      new TextEncoder().encode(signingMessage(request.method, url.pathname, time, nonce, body)),
    ))
  )
    throw new RunRequestError(401, 'writerUnauthorized');
  try {
    // The UNIQUE insert and cleanup share a transaction. Replayed valid bodies
    // still require a fresh nonce; run/event idempotence is handled separately.
    await db.batch([
      db
        .prepare('INSERT INTO writer_nonces(key_id,server_id,nonce,expires_at) VALUES(?,?,?,?)')
        .bind(keyId, serverId, nonce, now + 600000),
      db
        .prepare(
          'DELETE FROM writer_nonces WHERE key_id=? AND server_id=? AND nonce IN (SELECT nonce FROM writer_nonces WHERE key_id=? AND server_id=? AND expires_at<=? LIMIT 128)',
        )
        .bind(keyId, serverId, keyId, serverId, now),
    ]);
  } catch (error) {
    if (error instanceof Error && /constraint/i.test(error.message))
      throw new RunRequestError(401, 'writerReplay');
    throw new RunRequestError(503, 'authenticationUnavailable');
  }
  return { keyId, serverId };
}
