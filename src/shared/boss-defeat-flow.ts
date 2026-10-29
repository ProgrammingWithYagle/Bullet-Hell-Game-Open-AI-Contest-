import { HZ } from './protocol.ts';
// The longest currently authored fall is one second. Leave another second at rest.
export const BOSS_DEFEAT_TICKS = 2 * HZ;
type DefeatedBoss = { health: number; defeatedAt: number };
export function bossDefeatRemaining(boss: DefeatedBoss, tick: number) {
  if (boss.health > 0 || boss.defeatedAt <= 0 || tick < boss.defeatedAt) return 0;
  return Math.max(0, boss.defeatedAt + BOSS_DEFEAT_TICKS - tick);
}
export const showingBossDefeat = (boss: DefeatedBoss, tick: number) => bossDefeatRemaining(boss, tick) > 0;
