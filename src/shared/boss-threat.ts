import profiles from './boss-threats.json';
import catalog from '../../content/catalog.json';
import type { BossId } from './protocol.ts';
import type { Random } from './random.ts';

export type ThreatSubtier = -2 | -1 | 0 | 1 | 2;
export type BossThreat = { bossId: BossId; level: number; subtier: ThreatSubtier };
export const bossThreatProfiles = profiles;
const byBoss = new Map(profiles.entries.map((profile) => [profile.bossId, profile]));
const route = new Map(catalog.bosses.map((boss) => [boss.id, boss.route]));
export function bossThreat(id: string): BossThreat {
  const profile = byBoss.get(id);
  if (!profile) throw new Error('Unknown boss classification: ' + id);
  return profile as BossThreat;
}
export const subtierSuffix = (subtier: number) => ['--', '-', '', '+', '++'][subtier + 2] ?? '';
export function threatCode(
  level: number,
  subtier: number,
  variant: string = 'normal',
  format: (n: number) => string = String,
) {
  return (
    (level > 10 ? '>10' : format(level) + subtierSuffix(subtier)) +
    (variant === 'brutal' ? ' B' : '')
  );
}
export const subtierNameKey = (subtier: number) =>
  'ui.tier' + ['Bottom', 'Low', 'Mid', 'High', 'Top'][subtier + 2];
export function threatScore(level: number, subtier: number) {
  return (level - 1) * 5 + subtier + 2;
}
export function threatHealth(id: string) {
  const profile = bossThreat(id);
  return (
    catalog.rules.bossHealthThreatGrowth ** (Math.min(10, profile.level) - 1) *
    (1 + profile.subtier * 0.08)
  );
}
export function threatPressure(id: string) {
  const { level, subtier } = bossThreat(id),
    step = Math.min(10, level) - 1;
  return {
    count: 1 + step * 0.04 + subtier * 0.04,
    speed: 1 + step * 0.015 + subtier * 0.02,
    damage: 1 + step * 0.025 + subtier * 0.025,
  };
}
export function threatBounty(id: string, variant: string = 'normal') {
  const { level, subtier } = bossThreat(id);
  if (level > 10) return 1;
  const base = 1 + (level - 1) * 0.06 + (subtier + 2) * 0.04;
  return (
    Math.round(base * (variant === 'brutal' ? catalog.rules.brutal.bountyMultiplier : 1) * 10000) /
    10000
  );
}
export function classifiedContract(id: BossId, variant: 'normal' | 'brutal' = 'normal') {
  const { level, subtier } = bossThreat(id);
  return {
    bossId: id,
    threat: level,
    subtier,
    risk: 0,
    bounty: threatBounty(id, variant),
    variant,
  };
}
/** Primary route is an affinity; actual offer difficulty comes from the fixed profile. */
export function rankedThreatCandidates(
  ids: readonly BossId[],
  targetLevel: number,
  rng: Random,
  affinity?: string,
): BossId[] {
  const target = threatScore(Math.min(10, targetLevel), 0);
  const sorted = rng.shuffle(ids).toSorted((a, b) => {
    const score = (id: BossId) => {
      const p = bossThreat(id);
      return (
        Math.abs(threatScore(p.level, p.subtier) - target) * 10 +
        (affinity && route.get(id) !== affinity ? 1 : 0)
      );
    };
    return score(a) - score(b);
  });
  const grades = new Set<string>(),
    chosen: BossId[] = [];
  for (const id of sorted) {
    const p = bossThreat(id),
      key = p.level + '/' + p.subtier;
    if (grades.has(key)) continue;
    chosen.push(id);
    grades.add(key);
    if (chosen.length === 3) break;
  }
  for (const id of sorted) {
    if (chosen.length === 3) break;
    if (!chosen.includes(id)) chosen.push(id);
  }
  return chosen;
}
