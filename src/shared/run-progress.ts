import catalog from '../../content/catalog.json';
import type { BossId } from './protocol.ts';
export type RunProgress = {
  clears: number;
  rescues: number;
  firstEncounter: number;
  campaignClears: number;
  clearedBossIds: BossId[];
};
export const freshProgress = (): RunProgress => ({
  clears: 0,
  rescues: 0,
  firstEncounter: -1,
  campaignClears: 0,
  clearedBossIds: [],
});
export function validProgress(value: unknown, encounter = 1000000): value is RunProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as RunProgress;
  const integer = (n: unknown, min: number, max: number): n is number =>
    typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
  return (
    Object.keys(p).length === 5 &&
    integer(p.clears, 0, encounter) &&
    integer(p.rescues, 0, 1000000) &&
    integer(p.firstEncounter, -1, encounter) &&
    integer(p.campaignClears, 0, Math.min(p.clears, 16)) &&
    (p.firstEncounter >= 0 || (p.clears === 0 && p.rescues === 0)) &&
    (p.firstEncounter < 0 || p.clears <= encounter - p.firstEncounter) &&
    Array.isArray(p.clearedBossIds) &&
    p.clearedBossIds.length <= Math.min(p.clears, catalog.bosses.length) &&
    new Set(p.clearedBossIds).size === p.clearedBossIds.length &&
    p.clearedBossIds.every((id) => catalog.bosses.some((b) => b.id === id))
  );
}
