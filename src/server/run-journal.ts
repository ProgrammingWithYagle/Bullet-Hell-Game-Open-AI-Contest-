// Official-server lifecycle client. Practice-only until room identity, durable
// participant history and the hosted D1 deployment are integrated.
import { randomUUID } from 'node:crypto';
import { Game } from '../shared/game.ts';
import { signBoundary, verifyBoundary } from './checkpoints.ts';
import { RunRequestError } from './run-auth.ts';
import type { LifecycleEvent, RunAck, RunRecord, RunStore } from './run-store.ts';

export type RunTransport = {
  register(input: Parameters<RunStore['register']>[0]): Promise<unknown>;
  apply(event: LifecycleEvent): Promise<unknown>;
  lookup(runId: string): Promise<unknown>;
};
function checkedAck(value: unknown, expected: RunAck): RunAck {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== 4 ||
    Object.entries(expected).some(([key, v]) => (value as Record<string, unknown>)[key] !== v)
  )
    throw Error('invalidRunAcknowledgement');
  return expected;
}
function checkedRecord(value: unknown, runId: string): RunRecord {
  const row = value as RunRecord;
  if (
    !row ||
    typeof row !== 'object' ||
    Array.isArray(row) ||
    row.run_id !== runId ||
    typeof row.owner_id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(row.owner_id) ||
    !Number.isSafeInteger(row.owner_epoch) ||
    row.owner_epoch < 1 ||
    !Number.isSafeInteger(row.sequence) ||
    row.sequence < 0 ||
    !Number.isSafeInteger(row.lease_until) ||
    row.lease_until < 0 ||
    !['intermission', 'combat', 'finalized'].includes(row.state) ||
    typeof row.digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(row.digest) ||
    typeof row.checkpoint !== 'string' ||
    ![0, 1].includes(row.ranked)
  )
    throw Error('invalidRunRecord');
  return row;
}
const retryable = (error: unknown) =>
  error instanceof RunRequestError
    ? error.status >= 500 && error.status <= 599
    : error instanceof TypeError ||
      (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name));

export class RunJournal {
  readonly runId: string;
  status: 'new' | 'ready' | 'unavailable' | 'finalized' = 'new';
  private ownerEpoch = 1;
  private sequence = 0;
  private digest = '';
  private state: RunAck['state'] = 'intermission';
  private lastAckAt = 0;
  private leaseUntil = 0;
  private busy = false;
  private registered = false;
  private constructor(
    private transport: RunTransport,
    private signingKey: Uint8Array,
    readonly ownerId: string,
    private now: () => number,
    runId: string,
  ) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(ownerId) || signingKey.byteLength < 32)
      throw Error('invalidJournalConfiguration');
    this.runId = runId;
  }
  static create(transport: RunTransport, signingKey: Uint8Array, ownerId: string, now = Date.now) {
    return new RunJournal(transport, signingKey, ownerId, now, randomUUID());
  }
  // Each retry sends the identical lifecycle payload/event ID. The HTTP adapter
  // creates a fresh transport nonce. There is at most one in-flight operation.
  private async request<T>(send: () => Promise<T>): Promise<T> {
    try {
      return await send();
    } catch (error) {
      if (!retryable(error)) throw error;
      return send();
    }
  }
  private async write(action: () => Promise<void>) {
    if (this.busy) throw Error('journalBusy');
    if (this.status === 'unavailable' || this.status === 'finalized') return false;
    this.busy = true;
    try {
      await action();
      this.status = this.state === 'finalized' ? 'finalized' : 'ready';
      return true;
    } catch {
      this.status = 'unavailable';
      return false;
    } finally {
      this.busy = false;
    }
  }
  private event(kind: LifecycleEvent['kind'], extra: Partial<LifecycleEvent> = {}): LifecycleEvent {
    return {
      runId: this.runId,
      ownerId: this.ownerId,
      ownerEpoch: this.ownerEpoch,
      expectedSequence: this.sequence,
      previousDigest: this.digest,
      eventId: randomUUID(),
      kind,
      ...extra,
    };
  }
  private acknowledge(value: unknown, expected: RunAck, startedAt: number) {
    const ack = checkedAck(value, expected);
    this.ownerEpoch = ack.ownerEpoch;
    this.sequence = ack.sequence;
    this.state = ack.state;
    // Request start is conservative: a slow response must not grant a fresh
    // ninety seconds after a lease that the service has already begun.
    this.lastAckAt = startedAt;
    this.leaseUntil = startedAt + 90000;
  }
  private async save(game: Game) {
    const started = this.now();
    if (this.registered && started >= this.leaseUntil) throw Error('ownerLeaseExpired');
    const sequence = this.registered ? this.sequence + 1 : 0;
    const checkpoint = signBoundary(
      game,
      { runId: this.runId, ownerEpoch: this.ownerEpoch, sequence },
      this.signingKey,
      started,
    );
    const digest = verifyBoundary(checkpoint, this.signingKey, started).digest;
    const expected: RunAck = {
      sequence,
      ownerEpoch: this.ownerEpoch,
      state: 'intermission',
      ranked: false,
    };
    if (this.registered) {
      const event = this.event('boundary', { checkpoint });
      this.acknowledge(await this.request(() => this.transport.apply(event)), expected, started);
    } else {
      const input = { runId: this.runId, ownerId: this.ownerId, checkpoint, ranked: false };
      this.acknowledge(await this.request(() => this.transport.register(input)), expected, started);
      this.registered = true;
    }
    this.digest = digest;
  }
  checkpoint(game: Game) {
    return this.write(() => this.save(game));
  }
  beforeCombat(game: Game) {
    return this.write(async () => {
      await this.save(game);
      const started = this.now(),
        event = this.event('combat-start');
      if (started >= this.leaseUntil) throw Error('ownerLeaseExpired');
      this.acknowledge(
        await this.request(() => this.transport.apply(event)),
        { sequence: this.sequence, ownerEpoch: this.ownerEpoch, state: 'combat', ranked: false },
        started,
      );
    });
  }
  refreshLease() {
    if (this.busy) return Promise.resolve(false);
    if (!this.registered || this.now() - this.lastAckAt < 30000)
      return Promise.resolve(this.status === 'ready');
    return this.write(async () => {
      const started = this.now();
      if (started >= this.leaseUntil) throw Error('ownerLeaseExpired');
      const event = this.event('lease-refresh');
      this.acknowledge(
        await this.request(() => this.transport.apply(event)),
        { sequence: this.sequence, ownerEpoch: this.ownerEpoch, state: this.state, ranked: false },
        started,
      );
    });
  }
  // Closes recovery. This does not submit a score or create a global rank.
  finalize() {
    return this.write(async () => {
      const started = this.now();
      if (!this.registered || started >= this.leaseUntil) throw Error('ownerLeaseExpired');
      const event = this.event('finalize');
      this.acknowledge(
        await this.request(() => this.transport.apply(event)),
        { sequence: this.sequence, ownerEpoch: this.ownerEpoch, state: 'finalized', ranked: false },
        started,
      );
    });
  }
  static async claim(
    transport: RunTransport,
    signingKey: Uint8Array,
    ownerId: string,
    runId: string,
    allowRecoveryPractice: boolean,
    now = Date.now,
  ) {
    const journal = new RunJournal(transport, signingKey, ownerId, now, runId);
    const row = checkedRecord(await transport.lookup(runId), runId),
      started = now();
    if (
      row.ranked !== 0 ||
      row.state === 'finalized' ||
      started < row.lease_until ||
      (row.state === 'combat' && !allowRecoveryPractice)
    )
      throw Error('runNotRecoverable');
    const verified = verifyBoundary(JSON.parse(row.checkpoint), signingKey, started);
    if (
      verified.runId !== runId ||
      verified.digest !== row.digest ||
      verified.sequence !== row.sequence ||
      verified.ownerEpoch > row.owner_epoch
    )
      throw Error('checkpointIdentityMismatch');
    journal.ownerEpoch = row.owner_epoch;
    journal.sequence = row.sequence;
    journal.digest = row.digest;
    const event = journal.event('restore-claim', { allowRecoveryPractice });
    journal.acknowledge(
      await journal.request(() => transport.apply(event)),
      {
        ownerEpoch: row.owner_epoch + 1,
        sequence: row.sequence,
        state: 'intermission',
        ranked: false,
      },
      started,
    );
    journal.registered = true;
    journal.status = 'ready';
    return { journal, game: verified.game, interruptedCombat: row.state === 'combat' };
  }
}
