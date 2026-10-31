import { randomUUID } from 'node:crypto';
import { data, type Game } from '../shared/game.ts';
import { CONTENT_REVISION } from '../shared/protocol.ts';
import { RECORD_RULES, RECORD_SEASON, squadBand, type RecordParticipant, type TeamRecord, type TeamRecordStatus } from '../shared/team-records.ts';

export interface TeamRecordWriter {
  save(record: TeamRecord, participants: RecordParticipant[]): TeamRecordStatus;
}
/** This observer receives simulation events only. There is no client score submission. */
export class TeamRun {
  readonly runId = randomUUID();
  private participants = new Map<string, RecordParticipant>();
  private active = false;
  private valid = true;
  private startedAtTick = 0;
  private clears = 0;
  private peak = 0;
  private deadlineTicks = 0;
  private damageMilli = 0;
  private healthMilli = 0;
  private lastClearTicks = 0;
  private lastClearDamageMilli = 0;
  private lastClearHealthMilli = 0;
  private bank?: { record: TeamRecord; participants: RecordParticipant[] };
  private retryAt = 0;
  status?: TeamRecordStatus;
  constructor(private writer: TeamRecordWriter, private changed: (status: TeamRecordStatus) => void,
    private now = Date.now) {}
  private publishStatus(status: TeamRecordStatus) {
    this.status = status;
    this.changed(status);
  }
  private add(counter: number, value: number) {
    const sum = counter + value;
    if (!Number.isSafeInteger(sum) || sum < 0) this.valid = false;
    return sum;
  }
  start(game: Game) {
    if (this.bank || game.boss.id === 'uncounted') return;
    if (game.testingModified || this.active || game.encounter !== this.clears) this.valid = false;
    this.active = true;
    this.startedAtTick = game.combatTick;
    const roster = [...game.players.values()].filter(p => !p.expired && p.status !== 'waiting');
    this.peak = Math.max(this.peak, roster.length);
    const deadline = game.boss.deadline - game.combatTick;
    if (!Number.isSafeInteger(deadline) || deadline <= 0 || !roster.length) this.valid = false;
    this.deadlineTicks = this.add(this.deadlineTicks, deadline);
    for (const p of roster) {
      this.healthMilli = this.add(this.healthMilli, Math.round(p.maxHealth * 1000));
      const participant = this.participants.get(p.id) ?? {
        id: randomUUID(), name: p.name, classId: p.classId, firstEncounter: game.encounter + 1,
        lastEncounter: game.encounter + 1, encounters: 0, survived: false,
      };
      participant.lastEncounter = game.encounter + 1;
      participant.encounters++;
      participant.classId = p.classId;
      this.participants.set(p.id, participant);
    }
  }
  damage(_id: string, hp: number) {
    if (!this.active || this.bank) return;
    if (!Number.isFinite(hp) || hp < 0) this.valid = false;
    this.damageMilli = this.add(this.damageMilli, Math.round(hp * 1000));
  }
  clear(game: Game) {
    if (this.bank || game.boss.id === 'uncounted') return;
    if (!this.active || game.encounter !== this.clears || game.combatTick <= this.startedAtTick
      || game.combatTick >= game.boss.deadline || game.testingModified || game.timeouts) this.valid = false;
    this.active = false;
    this.clears++;
    this.lastClearTicks = game.combatTick;
    this.lastClearDamageMilli = this.damageMilli;
    this.lastClearHealthMilli = this.healthMilli;
    for (const [id, participant] of this.participants) {
      const p = game.players.get(id);
      participant.survived = Boolean(p && !p.expired && p.connected && p.status === 'active' && p.health > 0);
    }
    if (game.settings.mode !== 'endless' && ![...this.participants.values()].some(p => p.survived)) this.valid = false;
    // Freeze before victory heals/revives the roster and before the optional extra fight.
    if (game.settings.mode !== 'endless' && this.clears === data.modes.find(m => m.id === game.settings.mode)!.encounters) {
      this.bank = this.snapshot(game);
      this.save();
    }
  }
  private snapshot(game: Game) {
    const participants = [...this.participants.values()].map(p => ({ ...p }));
    return { participants, record: {
      runId: this.runId, mode: game.settings.mode, difficulty: game.settings.difficulty,
      contentRevision: CONTENT_REVISION, rules: RECORD_RULES, season: RECORD_SEASON,
      peakPlayers: this.peak, sizeBand: squadBand(this.peak), clears: this.clears,
      combatTicks: game.combatTick, lastClearTicks: this.lastClearTicks, deadlineTicks: this.deadlineTicks,
      damageMilli: this.damageMilli, healthMilli: this.healthMilli,
      lastClearDamageMilli: this.lastClearDamageMilli, lastClearHealthMilli: this.lastClearHealthMilli,
      survivors: participants.filter(p => p.survived).length, rosterCount: participants.length,
      endedAt: this.now(), secretCleared: false,
    } };
  }
  private save() {
    if (!this.valid || !this.bank) { this.publishStatus({ status: 'ineligible' }); return; }
    try { this.publishStatus(this.writer.save(this.bank.record, this.bank.participants)); }
    catch { this.retryAt = this.now() + 2000; this.publishStatus({ status: 'unavailable' }); }
  }
  observe(game: Game) {
    if (game.testingModified) this.valid = false;
    if (this.status?.status === 'unavailable' && this.now() >= this.retryAt) this.save();
    if (this.bank && game.secretStatus === 'cleared' && !this.bank.record.secretCleared) {
      this.bank.record.secretCleared = true;
      this.save();
    } else if (game.settings.mode === 'endless' && game.phase === 'defeat') this.finish(game);
  }
  finish(game: Game) {
    if (this.bank || game.settings.mode !== 'endless' || !this.clears || !this.valid || game.testingModified) return;
    this.bank = this.snapshot(game);
    this.save();
  }
}
