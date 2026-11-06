// The server chooses state boundaries; the bounded drawing clock only advances frames within them.
import contract from '../../assets/production/motion/constable-library.json';
import shuffle from '../../assets/production/motion/constable-shuffle-library.json';
import type { Boss } from '../shared/game.ts';
import { HZ } from '../shared/protocol.ts';

export const constableArt = {
  ...contract,
  clips: { ...contract.clips, ...shuffle.clips },
  entries: [...contract.entries, ...shuffle.entries],
};
export type ConstableClipId = keyof typeof constableArt.clips;
type DrawingTime = { tick: number; combatTick: number };

function frameAt(elapsedTicks: number, fps: number, frames: number, loop = false) {
  const n = Math.floor((Math.max(0, elapsedTicks) * fps) / HZ);
  return loop ? n % frames : Math.min(frames - 1, n);
}

export function constableCombatPose(
  boss: Boss,
  worldTick: number,
  combatTick: number,
  reducedMotion = false,
  drawing: DrawingTime = { tick: worldTick, combatTick },
  moving = false,
): { clip: ConstableClipId; frame: number } {
  const world = Number.isFinite(drawing.tick) ? Math.max(worldTick, drawing.tick) : worldTick;
  const combat = Number.isFinite(drawing.combatTick)
    ? Math.max(combatTick, drawing.combatTick)
    : combatTick;
  if (boss.health <= 0 && boss.defeatedAt > 0) {
    const clip = contract.clips.defeat;
    return {
      clip: 'defeat',
      frame: reducedMotion
        ? clip.frames - 1
        : frameAt(world - boss.defeatedAt, clip.fps, clip.frames),
    };
  }
  if (combatTick < boss.staggerUntil) {
    const clip = contract.clips.stagger;
    return {
      clip: 'stagger',
      frame: reducedMotion ? 0 : frameAt(combat, clip.fps, clip.frames, true),
    };
  }
  if (
    boss.castReleaseAt > boss.castAt &&
    combatTick >= boss.castAt &&
    combatTick < boss.castEndsAt
  ) {
    if (combatTick < boss.castReleaseAt) {
      // Drawing lead may complete anticipation, but cannot show release before a server tick authorizes it.
      const progress = Math.min(
        1,
        Math.max(0, (combat - boss.castAt) / (boss.castReleaseAt - boss.castAt)),
      );
      return {
        clip: 'attack',
        frame: reducedMotion ? 3 : 1 + Math.min(2, Math.floor(progress * 3)),
      };
    }
    return {
      clip: 'attack',
      frame: reducedMotion
        ? 4
        : 4 + frameAt(combat - boss.castReleaseAt, contract.clips.attack.fps, 4),
    };
  }
  if (moving) {
    const clip = shuffle.clips.shuffle;
    return {
      clip: 'shuffle',
      frame: reducedMotion ? 0 : frameAt(combat, clip.fps, clip.frames, true),
    };
  }
  const hurt = contract.clips.hurt;
  if (
    boss.hurtAt >= 0 &&
    combatTick >= boss.hurtAt &&
    combatTick - boss.hurtAt < (hurt.frames * HZ) / hurt.fps
  ) {
    return {
      clip: 'hurt',
      frame: reducedMotion ? 0 : frameAt(combat - boss.hurtAt, hurt.fps, hurt.frames),
    };
  }
  const idle = contract.clips.idle;
  return { clip: 'idle', frame: reducedMotion ? 0 : frameAt(combat, idle.fps, idle.frames, true) };
}
