import { CONTENT_REVISION, implementedModeIds } from '../shared/protocol.ts';
import { squadBands, RECORD_SEASON, RECORD_RULES, type RankedTeamRecord, type TeamBoardPage, type RecordParticipant } from '../shared/team-records.ts';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function isRankedTeamRecord(value: unknown): value is RankedTeamRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as RankedTeamRecord;
  return typeof r.runId === 'string' && uuid.test(r.runId) && implementedModeIds.includes(r.mode)
    && ['baby','easy','normal','hard','insane','hellish'].includes(r.difficulty)
    && squadBands.includes(r.sizeBand) && r.contentRevision === CONTENT_REVISION
    && r.season === RECORD_SEASON && r.rules === RECORD_RULES && typeof r.secretCleared === 'boolean'
    && ['rank','clears','combatTicks','lastClearTicks','deadlineTicks','healthMilli','lastClearHealthMilli','rosterCount','peakPlayers']
      .every(key => Number.isSafeInteger(r[key as keyof RankedTeamRecord]) && Number(r[key as keyof RankedTeamRecord]) > 0)
    && ['score','damageMilli','lastClearDamageMilli','survivors','endedAt']
      .every(key => Number.isSafeInteger(r[key as keyof RankedTeamRecord]) && Number(r[key as keyof RankedTeamRecord]) >= 0)
    && r.score <= 1000000 && r.survivors <= r.rosterCount && r.peakPlayers <= 50;
}
export function isTeamBoardPage(value: unknown): value is TeamBoardPage {
  if (!value || typeof value !== 'object') return false;
  const p = value as TeamBoardPage;
  return p.scope === 'server' && typeof p.persistent === 'boolean' && p.contentRevision === CONTENT_REVISION
    && p.season === RECORD_SEASON && p.rules === RECORD_RULES && implementedModeIds.includes(p.mode)
    && ['baby','easy','normal','hard','insane','hellish'].includes(p.difficulty) && squadBands.includes(p.sizeBand)
    && Number.isSafeInteger(p.total) && p.total >= 0 && Number.isSafeInteger(p.offset) && p.offset >= 0
    && (p.nextOffset === null || Number.isSafeInteger(p.nextOffset) && p.nextOffset > p.offset)
    && Array.isArray(p.rows) && p.rows.length <= 25 && p.rows.every(r => isRankedTeamRecord(r)
      && r.mode === p.mode && r.difficulty === p.difficulty && r.sizeBand === p.sizeBand);
}
export type TeamRosterPage = { record: RankedTeamRecord; participants: RecordParticipant[]; offset: number; nextOffset: number | null };
export async function fetchBoard(endpoint: string, query: URLSearchParams, signal?: AbortSignal) {
  const response = await fetch(endpoint + '/api/leaderboards?' + query, { signal: signal ? AbortSignal.any([signal,AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('Team records unavailable');
  const page: unknown = await response.json();
  if (!isTeamBoardPage(page)) throw Error('Invalid team records');
  for (const key of ['mode','difficulty','sizeBand'] as const) if (page[key] !== query.get(key)) throw Error('Wrong team board');
  return page;
}
export async function fetchRoster(endpoint: string, runId: string, offset = 0, signal?: AbortSignal): Promise<TeamRosterPage> {
  if (!uuid.test(runId)) throw Error('Invalid run');
  const response = await fetch(endpoint + '/api/leaderboards/' + runId + '?offset=' + offset,
    { signal: signal ? AbortSignal.any([signal,AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('Team result unavailable');
  const p = await response.json() as TeamRosterPage;
  if (!isRankedTeamRecord(p.record) || p.record.runId !== runId || p.offset !== offset
    || !(p.nextOffset === null || Number.isSafeInteger(p.nextOffset) && p.nextOffset > offset)
    || !Array.isArray(p.participants) || p.participants.length > 50 || !p.participants.every(r =>
      typeof r.name === 'string' && r.name.length <= 96 && typeof r.id === 'string' && uuid.test(r.id)
      && typeof r.classId === 'string' && ['soldier','medic','heavy','tank','mage','engineer','assassin'].includes(r.classId)
      && Number.isSafeInteger(r.firstEncounter) && r.firstEncounter > 0 && Number.isSafeInteger(r.lastEncounter)
      && r.lastEncounter >= r.firstEncounter && Number.isSafeInteger(r.encounters) && r.encounters > 0 && typeof r.survived === 'boolean')) throw Error('Invalid team roster');
  return p;
}
const recentKey = 'ga-team-records-v1';
export type TeamBoardSelection = Pick<RankedTeamRecord,'mode'|'difficulty'|'sizeBand'> & { endpoint: string; runId?: string };
type RecentRecord = Pick<RankedTeamRecord,'runId'|'mode'|'difficulty'|'sizeBand'> & { endpoint: string };
export function rememberTeamRecord(endpoint: string, record: RankedTeamRecord) {
  if (!isRankedTeamRecord(record) || typeof localStorage === 'undefined') return;
  try {
    const old = recentRecords();
    localStorage.setItem(recentKey, JSON.stringify([{ endpoint, runId: record.runId, mode: record.mode,
      difficulty: record.difficulty, sizeBand: record.sizeBand }, ...old.filter(r => r.runId !== record.runId)].slice(0,20)));
  } catch { /* This optional shortcut never changes saved progression or the server result. */ }
}
export function recentRecords(): RecentRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(recentKey) ?? '[]');
    if (!Array.isArray(rows)) return [];
    return rows.slice(0,20).filter((r): r is RecentRecord => r && typeof r === 'object'
      && typeof r.endpoint === 'string' && typeof r.runId === 'string' && uuid.test(r.runId)
      && implementedModeIds.includes(r.mode) && typeof r.difficulty === 'string' && squadBands.includes(r.sizeBand));
  } catch { return []; }
}
export function mondayUTC(now = Date.now()) {
  const d = new Date(now); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0,10);
}
