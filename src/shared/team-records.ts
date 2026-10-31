import type { ClassId, ModeId } from './protocol.ts';

export const RECORD_SEASON = 'ga-2026-01';
export const RECORD_RULES = 1;
export const squadBands = ['solo', '2-4', '5-8', '9-16', '17-50'] as const;
export type SquadBand = typeof squadBands[number];
export function squadBand(peak: number): SquadBand {
  if (!Number.isInteger(peak) || peak < 1 || peak > 50) throw Error('Invalid peak squad');
  return peak === 1 ? 'solo' : peak <= 4 ? '2-4' : peak <= 8 ? '5-8' : peak <= 16 ? '9-16' : '17-50';
}
export type RecordParticipant = {
  id: string; name: string; classId: ClassId; firstEncounter: number;
  lastEncounter: number; encounters: number; survived: boolean;
};
export type TeamRecord = {
  runId: string; mode: ModeId; difficulty: string; contentRevision: string;
  season: string; rules: number; peakPlayers: number; sizeBand: SquadBand;
  clears: number; combatTicks: number; lastClearTicks: number; deadlineTicks: number;
  damageMilli: number; healthMilli: number; lastClearDamageMilli: number; lastClearHealthMilli: number;
  survivors: number; rosterCount: number; endedAt: number; secretCleared: boolean;
};
export type RankedTeamRecord = TeamRecord & { rank: number; score: number };
export type TeamRecordStatus =
  | { status: 'saved'; record: RankedTeamRecord }
  | { status: 'unavailable' | 'ineligible' };
export type TeamBoardPage = {
  scope: 'server'; persistent: boolean; contentRevision: string; season: string; rules: number;
  mode: ModeId; difficulty: string; sizeBand: SquadBand; total: number;
  offset: number; nextOffset: number | null; rows: RankedTeamRecord[];
};
const integer = (n: number, min = 0) => {
  if (!Number.isSafeInteger(n) || n < min) throw Error('Invalid record counter');
  return BigInt(n);
};
/** One final rounding of the exact integer fractions, including half-point ties. */
export function teamScore(r: Pick<TeamRecord, 'combatTicks'|'deadlineTicks'|'survivors'|'rosterCount'|'damageMilli'|'healthMilli'>) {
  const time = integer(r.combatTicks, 1), budget = integer(r.deadlineTicks, 1);
  const survivors = integer(r.survivors, 1), roster = integer(r.rosterCount, 1);
  const damage = integer(r.damageMilli), health = integer(r.healthMilli, 1);
  if (survivors > roster || time >= budget) throw Error('Invalid qualifying clear');
  const speed = budget > time ? budget - time : 0n;
  const protectedHp = health > damage ? health - damage : 0n;
  const denominator = budget * roster * health;
  const numerator = 500000n * denominator + 250000n * speed * roster * health
    + 150000n * survivors * budget * health + 100000n * protectedHp * budget * roster;
  return Number((2n * numerator + denominator) / (2n * denominator));
}
/** Fixed-width TEXT preserves exact ordering for every pair of safe-integer ratios. */
export function damageRatioKey(damage: number, health: number) {
  return ((integer(damage) * 10n ** 33n) / integer(health, 1)).toString().padStart(49, '0');
}
