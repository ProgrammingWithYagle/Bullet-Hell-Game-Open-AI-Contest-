import references from '../../assets/production/normalized/library.json';
import motion from '../../assets/production/motion/survivor-library.json';
import legacyMotion from '../../assets/production/motion/legacy-survivor-library.json';
import { HZ } from '../shared/protocol.ts';
import type { ClassId } from '../shared/protocol.ts';
export const additionalSurvivors = ['tank', 'mage', 'engineer', 'assassin'] as const;
export const legacySurvivors = ['soldier', 'medic'] as const;
type RunClip = {
  frames: number;
  fps: number;
  id: string;
  cellSize: number;
  origin: number[];
  displayCell: number;
};
export const survivorArt = {
  references: references.entries.filter((e) => additionalSurvivors.some((id) => id === e.id)),
  entries: [
    ...(motion as { entries: RunClip[] }).entries,
    ...(legacyMotion as { entries: RunClip[] }).entries,
  ],
};
export function survivorPose(
  classId: ClassId,
  aim: number,
  moving: boolean,
  status: string,
  tick: number,
  reduced = false,
) {
  const facing =
    Math.abs(Math.sin(aim)) > Math.abs(Math.cos(aim))
      ? Math.sin(aim) < 0
        ? 'north'
        : 'south'
      : Math.cos(aim) < 0
        ? 'west'
        : 'east';
  const running = moving && status === 'active' && !reduced;
  const legacy = legacySurvivors.some((id) => id === classId);
  const run =
    running || legacy
      ? survivorArt.entries.find((e) => e.id === classId + '-run-' + facing)
      : undefined;
  const reference = survivorArt.references.find((e) => e.id === classId)!;
  const clip = run ?? reference;
  return {
    texture: run ? run.id : classId + '-reference',
    frame: run
      ? running
        ? Math.floor((Math.max(0, tick) * run.fps) / HZ) % run.frames
        : 0
      : { south: 0, east: 1, north: 2, west: 3 }[facing],
    origin: clip.origin,
    displayCell: clip.displayCell,
  };
}
