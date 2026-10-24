import type { BossId } from '../shared/protocol.ts';
export const bossThemes = {
  constable: 'hollow-muster',
  'lantern-warden': 'last-light',
  courier: 'undelivered',
  ratcatcher: 'crooked-procession',
  'quarantine-clerk': 'final-entry',
  tollkeeper: 'copper-debt',
  'chain-marshal': 'iron-jurisdiction',
  'gate-widow': 'third-latch',
  'black-ambulance': 'last-carriage',
} satisfies Record<BossId, string>;
export function musicIdentity(combat: boolean, boss: BossId = 'constable') {
  return combat ? bossThemes[boss] : 'city-wake';
}
