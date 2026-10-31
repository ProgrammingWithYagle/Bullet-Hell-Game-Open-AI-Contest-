import catalog from '../../content/catalog.json';
import { Random } from './random.ts';
import type { ModeId } from './protocol.ts';

export const arenaSelections = ['fixed', 'randomRun', 'randomEncounter', 'route'] as const;
export type ArenaSelection = typeof arenaSelections[number];
export function selectedArenaId(settings: {
  seed: number; mode: ModeId; openingArenaId: string; arenaSelection: ArenaSelection;
}, encounter: number, secret = false) {
  if (settings.arenaSelection === 'fixed') return settings.openingArenaId;
  if (settings.arenaSelection === 'randomRun' || settings.arenaSelection === 'randomEncounter') {
    const index = settings.arenaSelection === 'randomRun' ? 0 : encounter;
    const random = new Random((settings.seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0);
    return catalog.arenas[Math.floor(random.next() * catalog.arenas.length)].id;
  }
  if (secret) return 'crown-crypt';
  if (!encounter) return settings.openingArenaId;
  const mode = catalog.modes.find(m => m.id === settings.mode)!;
  return mode.arenas[settings.mode === 'endless' ? encounter % mode.arenas.length : Math.min(encounter, mode.arenas.length - 1)];
}
