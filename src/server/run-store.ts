// D1-style SQL interface. The shipped local test adapter executes real SQLite
// transactions; it does not establish that a hosted D1 service was deployed.
import { createHash } from 'node:crypto';
import { verifyBoundary, type SignedBoundary } from './checkpoints.ts';
export interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T>(): Promise<T | null>;
}
export interface DurableDB {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}
export type RunRecord = {
  run_id: string;
  registration_hash: string;
  owner_id: string;
  owner_epoch: number;
  sequence: number;
  state: 'intermission' | 'combat' | 'finalized';
  lease_until: number;
  digest: string;
  checkpoint: string;
  ranked: number;
};
type Event = { payload_hash: string; response: string };
export type RunAck = {
  sequence: number;
  ownerEpoch: number;
  state: RunRecord['state'];
  ranked: boolean;
};
export type LifecycleEvent = {
  runId: string;
  eventId: string;
  ownerId: string;
  ownerEpoch: number;
  expectedSequence: number;
  previousDigest: string;
  kind: 'boundary' | 'combat-start' | 'lease-refresh' | 'restore-claim' | 'finalize';
  checkpoint?: SignedBoundary;
  allowRecoveryPractice?: boolean;
};
export class RunConflict extends Error {
  constructor() {
    super('runConflict');
  }
}
export class RunUnavailable extends Error {
  constructor() {
    super('runUnavailable');
  }
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
export class RunStore {
  constructor(
    private db: DurableDB,
    private signingKey: Uint8Array,
  ) {}
  private async read<T>(sql: string, values: (string | number | null)[]) {
    try {
      return await this.db
        .prepare(sql)
        .bind(...values)
        .first<T>();
    } catch {
      throw new RunUnavailable();
    }
  }
  async get(runId: string) {
    return this.read<RunRecord>('SELECT * FROM runs WHERE run_id=?', [runId]);
  }
  async register(
    input: { runId: string; ownerId: string; checkpoint: SignedBoundary; ranked: boolean },
    now = Date.now(),
  ): Promise<RunAck> {
    const verified = verifyBoundary(input.checkpoint, this.signingKey, now);
    if (
      typeof input.runId !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.runId) ||
      verified.runId !== input.runId ||
      verified.ownerEpoch !== 1 ||
      verified.sequence !== 0 ||
      typeof input.ownerId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(input.ownerId) ||
      typeof input.ranked !== 'boolean'
    )
      throw Error('invalidRegistration');
    const registrationHash = hash(input);
    try {
      await this.db.batch([
        this.db
          .prepare(
            "INSERT INTO runs(run_id,registration_hash,owner_id,owner_epoch,sequence,state,lease_until,digest,checkpoint,ranked) VALUES(?,?,?,1,0,'intermission',?,?,?,?)",
          )
          .bind(
            input.runId,
            registrationHash,
            input.ownerId,
            now + 90000,
            verified.digest,
            JSON.stringify(input.checkpoint),
            Number(input.ranked),
          ),
      ]);
    } catch (error) {
      const old = await this.get(input.runId);
      if (old?.registration_hash !== registrationHash) {
        if (error instanceof Error && /constraint/i.test(error.message)) throw new RunConflict();
        throw new RunUnavailable();
      }
    }
    return { sequence: 0, ownerEpoch: 1, state: 'intermission', ranked: input.ranked };
  }
  async apply(input: LifecycleEvent, now = Date.now()): Promise<RunAck> {
    if (
      typeof input.runId !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.runId) ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(input.eventId) ||
      typeof input.ownerId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(input.ownerId) ||
      !Number.isSafeInteger(input.ownerEpoch) ||
      input.ownerEpoch < 1 ||
      !Number.isSafeInteger(input.expectedSequence) ||
      input.expectedSequence < 0 ||
      !/^[a-f0-9]{64}$/.test(input.previousDigest)
    )
      throw Error('invalidLifecycleEvent');
    const payloadHash = hash(input);
    const oldEvent = await this.read<Event>(
      'SELECT payload_hash,response FROM run_events WHERE run_id=? AND event_id=?',
      [input.runId, input.eventId],
    );
    if (oldEvent) {
      if (oldEvent.payload_hash !== payloadHash) throw new RunConflict();
      return JSON.parse(oldEvent.response) as RunAck;
    }
    const run = await this.get(input.runId);
    if (!run) throw new RunConflict();
    let where = 'run_id=? AND sequence=? AND digest=? AND owner_epoch=? AND state=?';
    const guard: (string | number)[] = [
      input.runId,
      input.expectedSequence,
      input.previousDigest,
      input.ownerEpoch,
      run.state,
    ];
    let update = '',
      values: (string | number)[] = [],
      ack: RunAck = {
        sequence: input.expectedSequence,
        ownerEpoch: input.ownerEpoch,
        state: run.state,
        ranked: Boolean(run.ranked),
      };
    if (input.kind === 'restore-claim') {
      where += " AND lease_until<=? AND (state='intermission' OR (state='combat' AND ?=1))";
      guard.push(now, Number(input.allowRecoveryPractice === true));
      ack = {
        ...ack,
        ownerEpoch: input.ownerEpoch + 1,
        state: 'intermission',
        ranked: run.state === 'combat' ? false : ack.ranked,
      };
      update =
        "owner_id=?,owner_epoch=owner_epoch+1,lease_until=?,state='intermission',ranked=CASE WHEN state='combat' THEN 0 ELSE ranked END";
      values = [input.ownerId, now + 90000];
    } else {
      where += " AND owner_id=? AND lease_until>? AND state<>'finalized'";
      guard.push(input.ownerId, now);
      if (input.kind === 'boundary') {
        if (!input.checkpoint) throw Error('missingCheckpoint');
        const checkpoint = verifyBoundary(input.checkpoint, this.signingKey, now);
        if (
          checkpoint.runId !== input.runId ||
          checkpoint.ownerEpoch !== input.ownerEpoch ||
          checkpoint.sequence !== input.expectedSequence + 1
        )
          throw Error('invalidCheckpointIdentity');
        const previous = verifyBoundary(JSON.parse(run.checkpoint), this.signingKey, now).game,
          next = checkpoint.game;
        if (
          JSON.stringify(next.settings) !== JSON.stringify(previous.settings) ||
          next.combatTick < previous.combatTick ||
          next.encounter < previous.encounter ||
          next.encounter > previous.encounter + 1 ||
          (run.state === 'combat' && next.encounter !== previous.encounter + 1)
        )
          throw new RunConflict();
        for (const [id, old] of previous.players) {
          const player = next.players.get(id);
          if (
            player &&
            (player.damageTaken < old.damageTaken ||
              player.damageDealt < old.damageDealt ||
              player.healing < old.healing ||
              player.incomeGranted < old.incomeGranted ||
              player.totalSp < old.totalSp)
          )
            throw new RunConflict();
        }
        ack = { ...ack, sequence: input.expectedSequence + 1, state: 'intermission' };
        update = "sequence=sequence+1,state='intermission',digest=?,checkpoint=?,lease_until=?";
        values = [checkpoint.digest, JSON.stringify(input.checkpoint), now + 90000];
      } else if (input.kind === 'combat-start') {
        where += " AND state='intermission'";
        ack = { ...ack, state: 'combat' };
        update = "state='combat',lease_until=?";
        values = [now + 90000];
      } else if (input.kind === 'lease-refresh') {
        update = 'lease_until=?';
        values = [now + 90000];
      } else if (input.kind === 'finalize') {
        ack = { ...ack, state: 'finalized' };
        update = "state='finalized',lease_until=?";
        values = [now];
      } else throw Error('invalidLifecycleEvent');
    }
    try {
      // NULL guard_epoch violates NOT NULL and rolls back the entire D1 batch
      // if the conditional owner/sequence/state predicate matches zero rows.
      await this.db.batch([
        this.db
          .prepare(
            'INSERT INTO run_events(run_id,event_id,payload_hash,guard_epoch,response) VALUES(?,?,?,(SELECT owner_epoch FROM runs WHERE ' +
              where +
              '),?)',
          )
          .bind(input.runId, input.eventId, payloadHash, ...guard, JSON.stringify(ack)),
        this.db.prepare('UPDATE runs SET ' + update + ' WHERE ' + where).bind(...values, ...guard),
      ]);
    } catch (error) {
      const duplicate = await this.read<Event>(
        'SELECT payload_hash,response FROM run_events WHERE run_id=? AND event_id=?',
        [input.runId, input.eventId],
      );
      if (duplicate?.payload_hash === payloadHash) return JSON.parse(duplicate.response) as RunAck;
      if (error instanceof Error && /constraint/i.test(error.message)) throw new RunConflict();
      throw new RunUnavailable();
    }
    return ack;
  }
}
