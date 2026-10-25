import { Game, type Settings } from './game.ts';
import type { ClassId } from './protocol.ts';
import { classifiedContract } from './boss-threat.ts';

// Local Practice only. The online constructor and contract-selection rules stay authoritative.
export function createPracticeGame(
  settings: Partial<Settings>,
  name: string,
  classId: ClassId,
  variant: unknown = 'normal',
) {
  if (variant !== 'normal' && variant !== 'brutal') throw Error('Invalid Practice boss form');
  const game = new Game({ ...settings, maxPlayers: 1 });
  game.addPlayer('solo', name, classId);
  if (variant === 'normal') return game;
  const boundary = game.offlineCheckpoint()!;
  Object.assign(
    boundary.selectedContract,
    classifiedContract(game.settings.openingBossId, 'brutal'),
  );
  return Game.restoreOffline(boundary);
}
