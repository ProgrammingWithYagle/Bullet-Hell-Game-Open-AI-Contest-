import {
  RunConflict,
  RunStore,
  RunUnavailable,
  type DurableDB,
  type LifecycleEvent,
} from './run-store.ts';
import {
  authenticateRunRequest,
  readRunBody,
  RunRequestError,
  type WriterKeys,
} from './run-auth.ts';
import type { SignedBoundary } from './checkpoints.ts';
import { CONTENT_REVISION, PROTOCOL } from '../shared/protocol.ts';
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
export function runService(db: DurableDB, boundaryKey: Uint8Array, writers: WriterKeys) {
  const store = new RunStore(db, boundaryKey);
  return async (request: Request, now = Date.now()) => {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health' && !url.search)
      return json({
        status: 'ok',
        service: 'grave-run-ledger',
        protocolVersion: PROTOCOL,
        contentRevision: CONTENT_REVISION,
      });
    try {
      const bytes = await readRunBody(request);
      await authenticateRunRequest(request, bytes, writers, db, now);
      let input: unknown;
      try {
        input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      } catch {
        throw new RunRequestError(400, 'invalidJson');
      }
      if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new RunRequestError(400, 'invalidRequest');
      const record = input as Record<string, unknown>;
      const exact = (required: string[], optional: string[] = []) => {
        if (
          required.some((name) => !Object.hasOwn(record, name)) ||
          Object.keys(record).some((name) => !required.includes(name) && !optional.includes(name))
        )
          throw new RunRequestError(400, 'invalidRequest');
      };
      if (url.pathname === '/v1/runs/register') {
        exact(['runId', 'ownerId', 'checkpoint', 'ranked']);
        const value = input as {
          runId: string;
          ownerId: string;
          checkpoint: SignedBoundary;
          ranked: boolean;
        };
        // The first-loop runtime has no verified ranking finalizer yet.
        if (value.ranked !== false) throw new RunRequestError(400, 'practiceOnly');
        return json(await store.register(value, now));
      }
      if (url.pathname === '/v1/runs/event') {
        exact(
          [
            'runId',
            'eventId',
            'ownerId',
            'ownerEpoch',
            'expectedSequence',
            'previousDigest',
            'kind',
          ],
          record.kind === 'boundary'
            ? ['checkpoint']
            : record.kind === 'restore-claim'
              ? ['allowRecoveryPractice']
              : [],
        );
        if (
          Object.hasOwn(record, 'allowRecoveryPractice') &&
          typeof record.allowRecoveryPractice !== 'boolean'
        )
          throw new RunRequestError(400, 'invalidRequest');
        return json(await store.apply(input as LifecycleEvent, now));
      }
      if (url.pathname === '/v1/runs/lookup') {
        exact(['runId']);
        const runId = (input as { runId: unknown }).runId;
        if (
          typeof runId !== 'string' ||
          !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(runId)
        )
          throw new RunRequestError(400, 'invalidRunId');
        const run = await store.get(runId);
        return run ? json(run) : json({ error: 'runNotFound' }, 404);
      }
      return json({ error: 'notFound' }, 404);
    } catch (error) {
      if (error instanceof RunRequestError) return json({ error: error.message }, error.status);
      if (error instanceof RunConflict) return json({ error: 'runConflict' }, 409);
      if (error instanceof RunUnavailable) return json({ error: 'runUnavailable' }, 503);
      // Invalid signed boundaries/builds and malformed lifecycle payloads never
      // disclose private database or participant details in error responses.
      return json({ error: 'invalidRunRequest' }, 400);
    }
  };
}
