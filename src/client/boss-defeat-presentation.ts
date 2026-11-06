import library from '../../assets/production/motion/opening-defeats-library.json';
import type { Boss } from '../shared/game.ts';
import { HZ } from '../shared/protocol.ts';

export const openingDefeatArt = library;
export function bossDefeatFrame(
  boss: Boss,
  worldTick: number,
  reducedMotion = false,
  drawingTick = worldTick,
): number | null {
  const clip = library.entries.find((entry) => entry.bossId === boss.id);
  if (!clip || boss.health > 0 || boss.defeatedAt <= 0) return null;
  if (reducedMotion) return clip.defeatStartFrame + clip.defeatFrames - 1;
  const now = Number.isFinite(drawingTick) ? Math.max(worldTick, drawingTick) : worldTick;
  const frame = Math.floor((Math.max(0, now - boss.defeatedAt) * clip.defeatFps) / HZ);
  return clip.defeatStartFrame + Math.min(clip.defeatFrames - 1, frame);
}
