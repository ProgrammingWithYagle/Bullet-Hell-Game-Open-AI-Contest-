import library from '../../assets/production/arenas/library.json';
import { runtimeArena } from '../shared/arena-layouts.ts';

export const arenaGroundArt = library;
export const ARENA_BACKDROP_DEPTH = -2;
export const ARENA_GROUND_DEPTH = -1;

export function preloadArenaGrounds(
  loader: { image(key: string, url: string): unknown },
  urls: Record<string, string>,
) {
  const files = library.entries.map((entry) => {
    const url = urls[entry.id];
    if (!url) throw new Error('Missing arena ground URL: ' + entry.id);
    return { key: entry.texture, url };
  });
  for (const file of files) loader.image(file.key, file.url);
}

export function arenaGroundPlacement(id: string) {
  const arena = runtimeArena(id);
  const art = library.entries.find((entry) => entry.id === id);
  if (
    !art ||
    (['x', 'y', 'width', 'height'] as const).some(
      (key) => art.worldBounds[key] !== arena.bounds[key],
    )
  ) {
    throw new Error('Arena ground contract does not match the playable footprint: ' + id);
  }
  return {
    texture: art.texture,
    x: arena.bounds.x + arena.bounds.width / 2,
    y: arena.bounds.y + arena.bounds.height / 2,
    width: arena.bounds.width,
    height: arena.bounds.height,
    originX: art.origin[0],
    originY: art.origin[1],
    depth: ARENA_GROUND_DEPTH,
    alpha: 0.8,
  };
}

type GroundImage = {
  setTexture(key: string): GroundImage;
  setPosition(x: number, y: number): GroundImage;
  setOrigin(x: number, y: number): GroundImage;
  setDisplaySize(width: number, height: number): GroundImage;
  setDepth(depth: number): GroundImage;
  setAlpha(alpha: number): GroundImage;
  setVisible(visible: boolean): GroundImage;
};
export function applyArenaGround(image: GroundImage, id: string) {
  const placement = arenaGroundPlacement(id);
  image
    .setTexture(placement.texture)
    .setOrigin(placement.originX, placement.originY)
    .setPosition(placement.x, placement.y)
    .setDisplaySize(placement.width, placement.height)
    .setDepth(placement.depth)
    .setAlpha(placement.alpha)
    .setVisible(true);
  return placement;
}
