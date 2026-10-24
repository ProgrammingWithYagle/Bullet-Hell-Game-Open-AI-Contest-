// Room transitions use the journal only when the server supplies one. This does
// not enable participant restoration or ranked results.
import { Game } from '../shared/game.ts';
import type { CheckpointStatus } from '../shared/protocol.ts';
import { RunJournal } from './run-journal.ts';

export class RoomJournal {
  private work?: Promise<void>;
  private frozen = false;
  private closed = false;
  private startRequested = false;
  private savedPhase = '';
  private nextLeaseAt = 0;
  status: CheckpointStatus;

  constructor(
    private game: Game,
    private journal?: RunJournal,
    private notify: (status: CheckpointStatus) => void = () => {},
    private now = Date.now,
  ) {
    this.status = journal ? 'pending' : 'disabled';
  }
  get blocked() {
    return this.closed || this.frozen;
  }
  async writable() {
    while (!this.closed && this.frozen && this.work) await this.work;
    return !this.closed;
  }
  private publish(status: CheckpointStatus) {
    if (this.closed || status === this.status) return;
    this.status = status;
    this.notify(status);
  }
  private get usable() {
    return (
      this.status !== 'unavailable' &&
      this.journal &&
      !['unavailable', 'finalized'].includes(this.journal.status)
    );
  }
  private boundaryKey() {
    return this.game.phase + ':' + this.game.encounter;
  }
  private write(send: () => Promise<boolean>, freeze: boolean, after = () => {}) {
    if (this.work || this.closed) return;
    this.frozen = freeze;
    if (freeze) this.publish('pending');
    // Schedule after assigning work: even a synchronously failing adapter must
    // leave a barrier that join/drop callbacks can await.
    this.work = Promise.resolve()
      .then(send)
      .catch(() => false)
      .then((ok) => {
        if (this.closed) return;
        this.publish(
          !ok || this.journal?.status === 'unavailable'
            ? 'unavailable'
            : this.journal?.status === 'finalized'
              ? 'finalized'
              : 'acknowledged',
        );
        this.nextLeaseAt = this.now() + 30000;
        // A failed journal latches unavailable. The room may continue as
        // Practice, with no claim that its next encounter can be restored.
        after();
      })
      .finally(() => {
        this.work = undefined;
        this.frozen = false;
      });
  }
  start() {
    if (this.closed || this.game.phase !== 'lobby' || !this.game.players.size) return;
    if (!this.journal) {
      this.game.start();
      return;
    }
    this.startRequested = true;
    this.advance();
  }
  private advance() {
    const game = this.game;
    const deploy = game.phase === 'loading' && game.tick + 1 >= game.phaseEnds;
    if (this.startRequested || deploy) {
      if (this.work) return;
      const begin = () => {
        this.startRequested = false;
        if (game.phase === 'lobby') game.start();
        else if (game.phase === 'loading') game.step();
      };
      if (this.usable) this.write(() => this.journal!.beforeCombat(game), true, begin);
      else begin();
      return;
    }
    if (!this.usable || this.work || !game.players.size) return;
    if (game.phase === 'victory' || game.phase === 'defeat') {
      this.write(() => this.journal!.finalize(), true);
    } else if (game.phase !== 'combat' && this.savedPhase !== this.boundaryKey()) {
      const key = this.boundaryKey();
      this.write(
        () => this.journal!.checkpoint(game),
        true,
        () => {
          this.savedPhase = key;
        },
      );
    } else if (this.now() >= this.nextLeaseAt) {
      this.write(() => this.journal!.refreshLease(), false);
    }
  }
  step() {
    if (this.closed || this.frozen) return;
    if (!this.journal) {
      this.game.step();
      return;
    }
    // A pending lease can run alongside combat. If combat ends during that
    // request, wait at the new safe phase before starting its checkpoint.
    if (this.work && this.game.phase !== 'combat') return;
    const before = this.game.phase;
    this.advance();
    if (this.frozen || this.startRequested || this.game.phase !== before) return;
    this.game.step();
    if (this.game.phase !== before) this.advance();
  }
  dispose() {
    // Do not turn a shutdown into a victory/finalize. The last acknowledged
    // boundary remains subject to its lease and one-owner claim rules.
    this.closed = true;
  }
}
