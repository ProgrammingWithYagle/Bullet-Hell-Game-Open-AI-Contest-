import motion from '../../assets/production/motion/heavy-library.json' with { type: 'json' };

export const heavyArt = motion;
export type HeavyFacing = 'North' | 'South' | 'East' | 'West';
export function heavyPose(
  aim: number,
  moving: boolean,
  status: string,
  combatTick: number,
  reduceMotion = false,
) {
  const vertical = Math.abs(Math.sin(aim)) > Math.abs(Math.cos(aim));
  const facing: HeavyFacing = vertical
    ? Math.sin(aim) < 0
      ? 'North'
      : 'South'
    : Math.cos(aim) < 0
      ? 'West'
      : 'East';
  const walking = moving && status === 'active' && !reduceMotion;
  const art = walking
    ? heavyArt.entries.find((entry) => entry.id === 'heavy-run-' + facing.toLowerCase())!
    : heavyArt.reference;
  return {
    facing,
    texture: walking ? 'heavy-run-' + facing : 'heavy-reference',
    frame: walking
      ? Math.floor(combatTick / 3) % 8
      : { South: 0, East: 1, North: 2, West: 3 }[facing],
    origin: art.origin,
    displayCell: art.displayCell,
  };
}
