import type { Rect } from "./geometry.ts";
import type { Vec } from "./protocol.ts";
// Uniform world transforms retain every painted/colliding prop and the map's distinct topology.
export const arenaScales: Record<string, number> = {
  gatehouse: 0.84,
  "triage-yard": 0.86,
  "ossuary-works": 1,
  "sunken-chapel": 0.9,
  "bell-foundry": 0.9,
  "crown-crypt": 1,
};
export function compactArena<
  T extends {
    id: string;
    width: number;
    height: number;
    bounds: Rect;
    cover: Rect[];
    obstacles: Rect[];
    bossSpawn: Vec;
    playerSpawn: Vec;
  },
>(a: T): T {
  const scale = arenaScales[a.id] ?? 1;
  if (scale === 1) return a;
  const cx = a.bounds.x + a.bounds.width / 2,
    cy = a.bounds.y + a.bounds.height / 2;
  const point = (p: Vec) => ({
    x: cx + (p.x - cx) * scale,
    y: cy + (p.y - cy) * scale,
  });
  const rect = (r: Rect) => ({
    ...point(r),
    width: r.width * scale,
    height: r.height * scale,
  });
  const bounds = rect(a.bounds),
    cover = a.cover.map(rect);
  const walls = a.obstacles.filter((r) => !a.cover.includes(r)).map(rect);
  const outer = [
    { x: 0, y: 0, width: 1600, height: bounds.y },
    {
      x: 0,
      y: bounds.y + bounds.height,
      width: 1600,
      height: 1000 - bounds.y - bounds.height,
    },
    { x: 0, y: bounds.y, width: bounds.x, height: bounds.height },
    {
      x: bounds.x + bounds.width,
      y: bounds.y,
      width: 1600 - bounds.x - bounds.width,
      height: bounds.height,
    },
  ].filter((r) => r.width > 0 && r.height > 0);
  return {
    ...a,
    width: bounds.width,
    height: bounds.height,
    bounds,
    cover,
    obstacles: [...cover, ...walls, ...outer],
    bossSpawn: point(a.bossSpawn),
    playerSpawn: point(a.playerSpawn),
  };
}
