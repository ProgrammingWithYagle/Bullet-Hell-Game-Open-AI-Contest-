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
  matron: 'cradle-ledger',
  alchemist: 'glasshouse-rot',
  bellringer: 'late-warning',
  stitchwright: 'needle-debt',
  'glass-surgeon': 'aperture',
  'ash-baker': 'oven-at-dawn',
  'sluice-keeper': 'watermark',
  stationmaster: 'last-departure',
  lamplighter: 'unlit-wick',
  anatomist: 'lecture-in-bone',
  'plague-gardener': 'green-afterlife',
  choir: 'three-names',
  'red-abbess': 'scarlet-vespers',
  'vesper-judge': 'open-half',
} satisfies Record<BossId, string>;
export function musicIdentity(combat: boolean, boss: BossId = 'constable') {
  return combat ? bossThemes[boss] : 'city-wake';
}
