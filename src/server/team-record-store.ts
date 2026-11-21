import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, toNamespacedPath } from 'node:path';
import { createHash } from 'node:crypto';
import { data } from '../shared/game.ts';
import { CONTENT_REVISION, implementedClassIds, type ModeId } from '../shared/protocol.ts';
import { RECORD_RULES, RECORD_SEASON, squadBand, squadBands, teamScore, damageRatioKey,
  type RankedTeamRecord, type RecordParticipant, type TeamRecord, type TeamBoardPage, type TeamRecordStatus } from '../shared/team-records.ts';
import type { TeamRecordWriter } from './team-run.ts';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export type BoardFilter = { mode: ModeId; difficulty: string; sizeBand: string; offset?: number; limit?: number; week?: string };
export class BoardQueryError extends Error { override name = 'BoardQueryError'; }
export class TeamRecordStore implements TeamRecordWriter {
  private db: DatabaseSync;
  readonly persistent: boolean;
  constructor(filename: string) {
    this.persistent = filename !== ':memory:';
    if (this.persistent) mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(this.persistent ? toNamespacedPath(filename) : filename);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS team_records (
        run_id TEXT PRIMARY KEY, mode TEXT NOT NULL, difficulty TEXT NOT NULL, band TEXT NOT NULL,
        revision TEXT NOT NULL, season TEXT NOT NULL, rules INTEGER NOT NULL,
        score INTEGER NOT NULL, ticks INTEGER NOT NULL, clears INTEGER NOT NULL,
        last_clear_ticks INTEGER NOT NULL, damage_key TEXT NOT NULL, ended_at INTEGER NOT NULL,
        digest TEXT NOT NULL, record_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS team_board_partition ON team_records
        (mode,difficulty,band,revision,season,rules,score DESC,ticks,damage_key,ended_at,run_id);
      CREATE TABLE IF NOT EXISTS team_record_roster (
        run_id TEXT NOT NULL REFERENCES team_records(run_id), ordinal INTEGER NOT NULL,
        participant_json TEXT NOT NULL, PRIMARY KEY(run_id,ordinal)
      );`);
  }
  close() { this.db.close(); }
  private validate(r: TeamRecord, participants: RecordParticipant[]) {
    const board = data.modes.find(m => m.id === r.mode);
    if (!uuid.test(r.runId) || r.contentRevision !== CONTENT_REVISION || r.season !== RECORD_SEASON
      || r.rules !== RECORD_RULES || !board || !data.difficulties.some(d => d.id === r.difficulty)
      || !Number.isInteger(r.peakPlayers) || r.peakPlayers > board.maxPlayers
      || r.sizeBand !== squadBand(r.peakPlayers) || typeof r.secretCleared !== 'boolean') throw Error('Invalid team record');
    for (const key of ['clears','combatTicks','lastClearTicks','deadlineTicks','healthMilli','lastClearHealthMilli','rosterCount'] as const)
      if (!Number.isSafeInteger(r[key]) || r[key] <= 0) throw Error('Invalid team counter');
    for (const key of ['damageMilli','lastClearDamageMilli','survivors','endedAt'] as const)
      if (!Number.isSafeInteger(r[key]) || r[key] < 0) throw Error('Invalid team counter');
    if (r.lastClearTicks > r.combatTicks || r.lastClearTicks >= r.deadlineTicks
      || r.lastClearDamageMilli > r.damageMilli || r.lastClearHealthMilli > r.healthMilli
      || r.survivors > r.rosterCount || r.peakPlayers > r.rosterCount
      || participants.length !== r.rosterCount || new Set(participants.map(p => p.id)).size !== participants.length
      || participants.filter(p => p.survived).length !== r.survivors
      || (r.mode !== 'endless' && (r.clears !== board.encounters || r.lastClearTicks !== r.combatTicks
        || r.lastClearHealthMilli !== r.healthMilli || r.lastClearDamageMilli !== r.damageMilli))) throw Error('Invalid team totals');
    for (const p of participants) {
      if (!uuid.test(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 96
        || /[\u0000-\u001f\u007f]/u.test(p.name) || !implementedClassIds.includes(p.classId)
        || !Number.isInteger(p.firstEncounter) || p.firstEncounter < 1
        || !Number.isInteger(p.lastEncounter) || p.lastEncounter < p.firstEncounter || p.lastEncounter > r.clears + 1
        || !Number.isInteger(p.encounters) || p.encounters < 1 || p.encounters > p.lastEncounter - p.firstEncounter + 1
        || typeof p.survived !== 'boolean') throw Error('Invalid public roster');
    }
  }
  save(record: TeamRecord, participants: RecordParticipant[]): TeamRecordStatus {
    this.validate(record, participants);
    const score = record.mode === 'endless' ? 0 : teamScore(record);
    const ratio = record.mode === 'endless'
      ? damageRatioKey(record.lastClearDamageMilli, record.lastClearHealthMilli)
      : damageRatioKey(record.damageMilli, record.healthMilli);
    const digest = createHash('sha256').update(JSON.stringify({ ...record, secretCleared: false })).update(JSON.stringify(participants)).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const old = this.db.prepare('SELECT digest,record_json FROM team_records WHERE run_id=?').get(record.runId) as { digest: string; record_json: string } | undefined;
      if (old) {
        if (old.digest !== digest) throw Error('Team result is already final');
        if (record.secretCleared) this.db.prepare('UPDATE team_records SET record_json=? WHERE run_id=?').run(JSON.stringify(record), record.runId);
      } else {
        this.db.prepare('INSERT INTO team_records VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
          record.runId, record.mode, record.difficulty, record.sizeBand, record.contentRevision, record.season, record.rules,
          score, record.combatTicks, record.clears, record.lastClearTicks, ratio, record.endedAt, digest, JSON.stringify(record));
        const insert = this.db.prepare('INSERT INTO team_record_roster VALUES (?,?,?)');
        participants.forEach((p, i) => insert.run(record.runId, i, JSON.stringify(p)));
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return { status: 'saved', record: this.find(record.runId)! };
  }
  private partition(filter: BoardFilter) {
    const mode = data.modes.find(m => m.id === filter.mode);
    const maximum = mode?.maxPlayers ?? 0;
    const minimum: Record<string, number> = { solo: 1, '2-4': 2, '5-8': 5, '9-16': 9, '17-50': 17 };
    if (!mode || !data.difficulties.some(d => d.id === filter.difficulty)
      || !squadBands.includes(filter.sizeBand as typeof squadBands[number]) || minimum[filter.sizeBand] > maximum) throw new BoardQueryError('Invalid board filters');
    const values: (string | number)[] = [filter.mode, filter.difficulty, filter.sizeBand, CONTENT_REVISION, RECORD_SEASON, RECORD_RULES];
    let where = 'mode=? AND difficulty=? AND band=? AND revision=? AND season=? AND rules=?';
    if (filter.week !== undefined) {
      const start = Date.parse(filter.week + 'T00:00:00.000Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(filter.week) || !Number.isFinite(start)
        || new Date(start).toISOString().slice(0,10) !== filter.week || new Date(start).getUTCDay() !== 1) throw new BoardQueryError('Invalid week');
      where += ' AND ended_at>=? AND ended_at<?'; values.push(start, start + 7 * 86400000);
    }
    const order = filter.mode === 'endless'
      ? 'clears DESC,last_clear_ticks ASC,damage_key ASC' : 'score DESC,ticks ASC,damage_key ASC';
    return { values, where, ranked: `SELECT *,RANK() OVER (ORDER BY ${order}) AS team_rank FROM team_records WHERE ${where}` };
  }
  board(filter: BoardFilter): TeamBoardPage {
    const { offset = 0, limit = 10 } = filter;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000 || !Number.isInteger(limit) || limit < 1 || limit > 25) throw new BoardQueryError('Invalid page');
    const { where, values, ranked } = this.partition(filter);
    const count = this.db.prepare('SELECT COUNT(*) AS count FROM team_records WHERE ' + where).get(...values) as { count: number };
    const rows = this.db.prepare(`SELECT record_json,score,team_rank FROM (${ranked}) ORDER BY team_rank,ended_at,run_id LIMIT ? OFFSET ?`).all(...values, limit, offset) as { record_json: string; score: number; team_rank: number }[];
    return { scope: 'server', persistent: this.persistent, contentRevision: CONTENT_REVISION, rules: RECORD_RULES,
      season: RECORD_SEASON, mode: filter.mode, difficulty: filter.difficulty, sizeBand: filter.sizeBand as TeamBoardPage['sizeBand'],
      total: count.count, offset, nextOffset: offset + rows.length < count.count ? offset + rows.length : null,
      rows: rows.map(r => ({ ...JSON.parse(r.record_json), score: r.score, rank: r.team_rank })) };
  }
  find(runId: string): RankedTeamRecord | null {
    if (!uuid.test(runId)) throw new BoardQueryError('Invalid run');
    const row = this.db.prepare('SELECT record_json FROM team_records WHERE run_id=?').get(runId) as { record_json: string } | undefined;
    if (!row) return null;
    const r: TeamRecord = JSON.parse(row.record_json);
    if (r.contentRevision !== CONTENT_REVISION || r.season !== RECORD_SEASON || r.rules !== RECORD_RULES) return null;
    const { ranked, values } = this.partition({ mode: r.mode, difficulty: r.difficulty, sizeBand: r.sizeBand });
    const found = this.db.prepare(`SELECT score,team_rank FROM (${ranked}) WHERE run_id=?`).get(...values, runId) as { score: number; team_rank: number };
    return { ...r, score: found.score, rank: found.team_rank };
  }
  roster(runId: string, offset = 0) {
    const record = this.find(runId);
    if (!record) return null;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) throw new BoardQueryError('Invalid roster page');
    const rows = this.db.prepare('SELECT participant_json FROM team_record_roster WHERE run_id=? AND ordinal>=? ORDER BY ordinal LIMIT 50').all(runId, offset) as { participant_json: string }[];
    return { record, participants: rows.map(r => JSON.parse(r.participant_json) as RecordParticipant), offset,
      nextOffset: offset + rows.length < record.rosterCount ? offset + rows.length : null };
  }
}
