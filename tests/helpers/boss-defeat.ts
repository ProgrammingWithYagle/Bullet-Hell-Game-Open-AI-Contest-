import type { Game } from '../../src/shared/game.ts';
import { bossDefeatRemaining } from '../../src/shared/boss-defeat-flow.ts';

// Persistence and reward fixtures may shorten menus, but still finish the real fall first.
export function finishBossDefeat(game: Game) {
  const remaining = bossDefeatRemaining(game.boss, game.tick);
  for (let tick = 0; tick < remaining; tick++) game.step();
}
