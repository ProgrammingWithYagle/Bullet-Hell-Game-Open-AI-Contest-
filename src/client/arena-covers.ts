import { runtimeArena } from '../shared/arena-layouts.ts';
export function arenaCoverPlan(id: string,difficulty='normal') {
  const arena = runtimeArena(id,difficulty);
  if (id === 'gatehouse') return [];
  if (
    !arena.props.length ||
    arena.props.some((prop) => !Number.isInteger(prop) || prop < 1 || prop > 7)
  )
    throw new Error('Secondary arena cover requires a non-bed prop: ' + id);
  return arena.cover.map((rect, index) => ({
    ...rect,
    texture: 'environment-' + arena.props[index % arena.props.length],
  }));
}
