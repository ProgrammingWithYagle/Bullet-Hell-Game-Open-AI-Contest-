import library from '../../assets/production/motion/encounter-library.json';
import type { Boss } from '../shared/game.ts';
import type { BossCue } from '../shared/boss-director.ts';
export const encounterArt = library.entries;
export function encounterFrame(boss: Boss, now: number, cues: BossCue[], reduced = false) {
  if (reduced || now < boss.staggerUntil) return boss.id === 'courier' ? 7 : 0;
  if (boss.id === 'courier') {
    const lane = cues.find((cue) => cue.kind === 'charge');
    if (lane && lane.kind === 'charge') {
      if (now < lane.at) return now < lane.at - 12 ? 1 : 2;
      return 3 + (Math.floor((now - lane.at) / 4) % 3);
    }
    return 7;
  }
  if (boss.id === 'ratcatcher') {
    const lane = cues.find((cue) => cue.kind === 'scent');
    if (lane && lane.kind === 'scent') {
      if (lane.interrupted) return 0;
      if (now < lane.at) return Math.min(3, 1 + Math.floor(Math.max(0, now - lane.at + 36) / 12));
      return Math.min(7, 4 + Math.floor((now - lane.at) / 5));
    }
    return 0;
  }
  if (boss.id === 'quarantine-clerk') {
    const stamps = cues.filter(
      (cue): cue is Extract<BossCue, { kind: 'stamp' }> => cue.kind === 'stamp',
    );
    const strike = stamps
      .filter((s) => now >= s.at && now - s.at < 7)
      .sort((a, b) => b.at - a.at)[0];
    if (strike) return now - strike.at < 4 ? 4 : 5;
    const next = stamps.filter((s) => s.at > now).sort((a, b) => a.at - b.at)[0];
    if (next) return next.at - now > 20 ? 1 : next.at - now > 10 ? 2 : 3;
  }
  return 0;
}
