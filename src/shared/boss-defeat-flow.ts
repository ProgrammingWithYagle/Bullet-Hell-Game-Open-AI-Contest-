import { HZ } from './protocol.ts';
// The longest authored fall is one second. Hold the settled pose before choices.
export const BOSS_DEFEAT_TICKS = 5 * HZ;
type DefeatedBoss = { health: number; defeatedAt: number };
export function bossDefeatRemaining(boss: DefeatedBoss, tick: number) {
  if (boss.health > 0 || boss.defeatedAt <= 0 || tick < boss.defeatedAt) return 0;
  return Math.max(0, boss.defeatedAt + BOSS_DEFEAT_TICKS - tick);
}
export const showingBossDefeat = (boss: DefeatedBoss, tick: number) => bossDefeatRemaining(boss, tick) > 0;
