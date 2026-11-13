import catalog from '../../content/catalog.json' with { type: 'json' };
import type { Rect } from './geometry.ts';
// One fixed camera coordinate system, six genuinely different playable footprints.
// Width/height describe the traversable board, not the letterboxed 1600x1000 camera.
type Layout = {
  width: number;
  height: number;
  x: number;
  y: number;
  cover: Rect[];
  bossSpawn: { x: number; y: number };
  playerSpawn: { x: number; y: number };
  prop: number;
  theme: string;
};
const layouts: Record<string, Layout> = {
  'triage-yard': {
    width: 1600,
    height: 900,
    x: 0,
    y: 50,
    prop: 0,
    theme: 'Wide rescue promenade with staggered bed islands',
    bossSpawn: { x: 800, y: 250 },
    playerSpawn: { x: 800, y: 820 },
    cover: [
      { x: 400, y: 370, width: 170, height: 85 },
      { x: 1050, y: 430, width: 170, height: 85 },
      { x: 230, y: 660, width: 170, height: 70 },
      { x: 1200, y: 680, width: 170, height: 70 },
    ],
  },
  'ossuary-works': {
    width: 1300,
    height: 1000,
    x: 150,
    y: 0,
    prop: 1,
    theme: 'Tall industrial S corridor between offset machine islands',
    bossSpawn: { x: 800, y: 240 },
    playerSpawn: { x: 800, y: 900 },
    cover: [
      { x: 310, y: 340, width: 160, height: 140 },
      { x: 1130, y: 510, width: 160, height: 150 },
      { x: 650, y: 420, width: 200, height: 90 },
      { x: 840, y: 780, width: 180, height: 70 },
    ],
  },
  'sunken-chapel': {
    width: 1400,
    height: 920,
    x: 100,
    y: 40,
    prop: 2,
    theme: 'Central altar, side chapels and a clear nave around the water margins',
    bossSpawn: { x: 800, y: 250 },
    playerSpawn: { x: 800, y: 830 },
    cover: [
      { x: 710, y: 430, width: 180, height: 110 },
      { x: 280, y: 350, width: 120, height: 220 },
      { x: 1200, y: 350, width: 120, height: 220 },
      { x: 250, y: 730, width: 160, height: 65 },
      { x: 1190, y: 730, width: 160, height: 65 },
    ],
  },
  'bell-foundry': {
    width: 1500,
    height: 850,
    x: 50,
    y: 75,
    prop: 3,
    theme: 'Short broad forge floor with two diagonal fire corridors',
    bossSpawn: { x: 800, y: 250 },
    playerSpawn: { x: 800, y: 815 },
    cover: [
      { x: 300, y: 350, width: 180, height: 150 },
      { x: 1120, y: 350, width: 180, height: 150 },
      { x: 675, y: 425, width: 250, height: 100 },
    ],
  },
  'crown-crypt': {
    width: 1240,
    height: 880,
    x: 180,
    y: 60,
    prop: 4,
    theme: 'Compact asymmetric tomb court with a central vault and offset sarcophagi',
    bossSpawn: { x: 800, y: 250 },
    playerSpawn: { x: 800, y: 830 },
    cover: [
      { x: 320, y: 380, width: 150, height: 100 },
      { x: 1130, y: 450, width: 150, height: 100 },
      { x: 650, y: 400, width: 220, height: 95 },
      { x: 300, y: 750, width: 170, height: 65 },
      { x: 1130, y: 750, width: 170, height: 65 },
    ],
  },
};
function borders(x: number, y: number, width: number, height: number): Rect[] {
  return [
    { x: 0, y: 0, width: 1600, height: y },
    { x: 0, y: y + height, width: 1600, height: 1000 - y - height },
    { x: 0, y, width: x, height },
    { x: x + width, y, width: 1600 - x - width, height },
  ].filter((r) => r.width > 0 && r.height > 0);
}
export const runtimeArenas = catalog.arenas.map((original) => {
  const layout = layouts[original.id];
  if (!layout)
    return {
      ...original,
      bounds: { x: 0, y: 0, width: 1600, height: 1000 },
      cover: original.obstacles,
      prop: -1,
      theme: 'Walled gate courtyard with fountain cover and outer-wall lanes',
    };
  const { x, y, width, height, cover, bossSpawn, playerSpawn, prop, theme } = layout;
  return {
    ...original,
    width,
    height,
    bossSpawn,
    playerSpawn,
    bounds: { x, y, width, height },
    cover,
    obstacles: [...cover, ...borders(x, y, width, height)],
    prop,
    theme,
  };
});
export function runtimeArena(id: string) {
  const arena = runtimeArenas.find((a) => a.id === id);
  if (!arena) throw Error('Unknown arena');
  return arena;
}
