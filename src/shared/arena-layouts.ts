import {compactArena} from './arena-footprint.ts';
import {additionalBabyCover} from './baby-cover.ts';
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
  props: number[];
  theme: string;
};
const layouts: Record<string, Layout> = {
  'triage-yard': {
    width: 1600,
    height: 900,
    x: 0,
    y: 50,
    prop: 1,
    props: [1],
    theme: 'Diagonal rescue promenade: long crate screens and broad open flanks',
    bossSpawn: {
      x: 350,
      y: 230,
    },
    playerSpawn: {
      x: 1270,
      y: 820,
    },
    cover: [
      {
        x: 160,
        y: 390,
        width: 420,
        height: 90,
      },
      {
        x: 980,
        y: 265,
        width: 330,
        height: 85,
      },
      {
        x: 1120,
        y: 615,
        width: 270,
        height: 100,
      },
      {
        x: 275,
        y: 760,
        width: 200,
        height: 80,
      },
    ],
  },
  'ossuary-works': {
    width: 1300,
    height: 1000,
    x: 150,
    y: 0,
    prop: 6,
    props: [6, 1, 6, 1],
    theme: 'Alternating factory chicanes with upper-right and lower-left passages',
    bossSpawn: {
      x: 390,
      y: 195,
    },
    playerSpawn: {
      x: 1210,
      y: 880,
    },
    cover: [
      {
        x: 150,
        y: 300,
        width: 760,
        height: 115,
      },
      {
        x: 720,
        y: 805,
        width: 730,
        height: 60,
      },
      {
        x: 1000,
        y: 395,
        width: 300,
        height: 90,
      },
      {
        x: 310,
        y: 580,
        width: 150,
        height: 180,
      },
    ],
  },
  'sunken-chapel': {
    width: 1400,
    height: 920,
    x: 100,
    y: 40,
    prop: 2,
    props: [2, 2, 7, 7, 7, 7],
    theme: 'Open cruciform nave: horizontal encounter axis between paired shrine piers',
    bossSpawn: {
      x: 1230,
      y: 500,
    },
    playerSpawn: {
      x: 350,
      y: 500,
    },
    cover: [
      {
        x: 660,
        y: 150,
        width: 280,
        height: 150,
      },
      {
        x: 680,
        y: 790,
        width: 240,
        height: 100,
      },
      {
        x: 360,
        y: 285,
        width: 100,
        height: 100,
      },
      {
        x: 1140,
        y: 285,
        width: 100,
        height: 100,
      },
      {
        x: 340,
        y: 620,
        width: 100,
        height: 100,
      },
      {
        x: 1160,
        y: 640,
        width: 100,
        height: 100,
      },
    ],
  },
  'bell-foundry': {
    width: 1500,
    height: 850,
    x: 50,
    y: 75,
    prop: 3,
    props: [3, 3, 6, 6],
    theme: 'Twin furnace loops: wide side circuits joined by a central cross aisle',
    bossSpawn: {
      x: 1260,
      y: 230,
    },
    playerSpawn: {
      x: 360,
      y: 810,
    },
    cover: [
      {
        x: 680,
        y: 245,
        width: 260,
        height: 130,
      },
      {
        x: 680,
        y: 750,
        width: 260,
        height: 115,
      },
      {
        x: 235,
        y: 470,
        width: 190,
        height: 175,
      },
      {
        x: 1190,
        y: 480,
        width: 160,
        height: 140,
      },
    ],
  },
  'crown-crypt': {
    width: 1240,
    height: 880,
    x: 180,
    y: 60,
    prop: 4,
    props: [4, 7, 4, 4, 7],
    theme: 'Hooked vault court: L-shaped central monument and offset outer routes',
    bossSpawn: {
      x: 1210,
      y: 270,
    },
    playerSpawn: {
      x: 360,
      y: 820,
    },
    cover: [
      {
        x: 700,
        y: 345,
        width: 205,
        height: 150,
      },
      {
        x: 875,
        y: 345,
        width: 80,
        height: 220,
      },
      {
        x: 220,
        y: 240,
        width: 260,
        height: 85,
      },
      {
        x: 1175,
        y: 625,
        width: 180,
        height: 145,
      },
      {
        x: 710,
        y: 805,
        width: 280,
        height: 80,
      },
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
export const authoredArenas = catalog.arenas.map((original) => {
  const layout = layouts[original.id];
  if (!layout)
    return {
      ...original,
      bounds: { x: 0, y: 0, width: 1600, height: 1000 },
      cover: original.id==='gatehouse' ? original.obstacles.slice(0,2) : original.obstacles,
      prop: -1,
      props: [] as number[],
      theme: 'Walled gate courtyard with fountain cover and outer-wall lanes',
    };
  const { x, y, width, height, cover, bossSpawn, playerSpawn, prop, props, theme } = layout;
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
    props,
    theme,
  };
});
export const runtimeArenas=authoredArenas.map(compactArena);
function baseArena(id: string) {
  const arena = runtimeArenas.find((a) => a.id === id);
  if (!arena) throw Error('Unknown arena');
  return arena;
}

export type ArenaLavaCue = {kind:'arena-lava';id:number;x:number;y:number;radius:number;at:number;until:number};
type RuntimeArena = (typeof runtimeArenas)[number] & {lavaPits:{x:number;y:number;radius:number}[]};
const difficultyArenas = new Map<string,RuntimeArena>();
export function runtimeArena(id:string,difficulty='normal'):RuntimeArena {
  const key=id+':'+difficulty, cached=difficultyArenas.get(key);
  if(cached)return cached;
  const arena=baseArena(id),rules=catalog.rules.arenaDifficulty;
  const cover=difficulty==='baby'?[...arena.cover,...additionalBabyCover(arena,rules.babyAdditionalCover)]:rules.noCoverDifficulties.includes(difficulty)?[]:difficulty==='hard'
    ?arena.cover.filter((_,i)=>i%2===0).slice(0,Math.floor(arena.cover.length*rules.hardCoverFraction))
    :arena.cover;
  const walls=arena.obstacles.filter(rect=>!arena.cover.includes(rect));
  const lavaPits = difficulty===rules.lavaDifficulty ? [[.34,.38],[.66,.38],[.34,.67],[.66,.67]].map(([x,y])=>({
    x:arena.bounds.x+arena.width*x,y:arena.bounds.y+arena.height*y,radius:Math.min(arena.width,arena.height)*.065,
  })).filter(pit=>[arena.playerSpawn,arena.bossSpawn].every(spawn=>Math.hypot(spawn.x-pit.x,spawn.y-pit.y)>pit.radius+150)) : [];
  const value={...arena,cover,obstacles:[...walls,...cover],lavaPits};
  difficultyArenas.set(key,value);return value;
}
