import library from '../../assets/production/motion/courier-library.json';
import type { Boss } from '../shared/game.ts';
import type { BossCue } from '../shared/boss-director.ts';
import { HZ } from '../shared/protocol.ts';
import { bossDefeatFrame } from './boss-defeat-presentation.ts';
import { encounterFrame } from './encounter-presentation.ts';

export const courierArt = library.entries[0];
type DrawingTime = { tick: number; combatTick: number };

export function courierCombatFrame(
  boss: Boss,
  worldTick: number,
  combatTick: number,
  cues: BossCue[],
  reducedMotion = false,
  drawing: DrawingTime = { tick: worldTick, combatTick },
): number | null {
  if (boss.id !== 'courier') return null;
  const defeat = bossDefeatFrame(boss, worldTick, reducedMotion, drawing.tick);
  if (defeat !== null) return defeat;
  if (boss.health <= 0) return courierArt.idleStartFrame;
  const combat = Number.isFinite(drawing.combatTick)
    ? Math.max(combatTick, drawing.combatTick)
    : combatTick;
  if (combatTick < boss.staggerUntil) {
    if (reducedMotion) return courierArt.staggerStartFrame + 1;
    // A successful Accord authoritatively starts a four-second stagger in Game.stepBoss.
    // Play the upright entry once, then repeat only the three stooped poses until its end.
    const age = Math.max(0, combat - (boss.staggerUntil - 4 * HZ));
    const step = Math.floor((age * courierArt.staggerFps) / HZ);
    return courierArt.staggerStartFrame + (step === 0 ? 0 : 1 + ((step - 1) % 3));
  }
  const validCues = cues.filter(
    (cue) => cue.kind !== 'charge' || (!cue.interrupted && cue.until > combatTick),
  );
  if (validCues.some((cue) => cue.kind === 'charge')) {
    // Charge release stays on the authoritative cue tick; drawing lead never releases early.
    return encounterFrame(boss, combatTick, validCues, reducedMotion);
  }
  if (
    boss.hurtAt >= 0 &&
    combatTick >= boss.hurtAt &&
    combatTick - boss.hurtAt < (courierArt.hurtFrames * HZ) / courierArt.hurtFps
  ) {
    const step = Math.floor((Math.max(0, combat - boss.hurtAt) * courierArt.hurtFps) / HZ);
    return (
      courierArt.hurtStartFrame + (reducedMotion ? 2 : Math.min(courierArt.hurtFrames - 1, step))
    );
  }
  const step = Math.floor((Math.max(0, combat) * courierArt.idleFps) / HZ);
  return courierArt.idleStartFrame + (reducedMotion ? 0 : step % courierArt.idleFrames);
}
