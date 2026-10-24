import type { BossId } from '../shared/protocol.ts';
export const bossThemes = {
  constable: 'hollow-muster',
  'lantern-warden': 'last-light',
  courier: 'undelivered',
  ratcatcher: 'crooked-procession',
  'quarantine-clerk': 'final-entry',
} satisfies Record<BossId, string>;
export function musicIdentity(combat: boolean, boss: BossId = 'constable') {
  return combat ? bossThemes[boss] : 'city-wake';
}
