// Rendering continuity only. No movement, aim or input is written back to simulation.
import type { ClassId } from '../shared/protocol.ts';
import type { PlayerView, View } from '../shared/view.ts';
export type SurvivorFacing = 'south' | 'east' | 'north' | 'west';
export const MOVEMENT_GRACE_MS = 100;
export const FACING_HYSTERESIS = Math.PI / 18;
const centers: Record<SurvivorFacing, number> = {
  east: 0,
  south: Math.PI / 2,
  west: Math.PI,
  north: -Math.PI / 2,
};
export function cardinalFacing(aim: number): SurvivorFacing {
  return Math.abs(Math.sin(aim)) > Math.abs(Math.cos(aim))
    ? Math.sin(aim) < 0
      ? 'north'
      : 'south'
    : Math.cos(aim) < 0
      ? 'west'
      : 'east';
}
export function stableFacing(aim: number, previous?: SurvivorFacing): SurvivorFacing {
  if (!Number.isFinite(aim)) return previous ?? 'south';
  const next = cardinalFacing(aim);
  if (!previous || next === previous) return next;
  const distance = Math.abs(
    Math.atan2(Math.sin(aim - centers[previous]), Math.cos(aim - centers[previous])),
  );
  return distance <= Math.PI / 4 + FACING_HYSTERESIS ? previous : next;
}
type Memory = {
  classId: ClassId;
  x: number;
  y: number;
  movingUntil: number;
  facing: SurvivorFacing;
};
export class SurvivorVisualMotion {
  private people = new Map<string, Memory>();
  private run = '';
  private encounter = -1;
  private tick = -1;
  private phase = '';
  private time = 0;
  observe(view: Pick<View, 'run' | 'encounter' | 'tick' | 'phase' | 'players'>) {
    if (
      view.run.id !== this.run ||
      view.encounter !== this.encounter ||
      view.tick < this.tick ||
      view.phase !== this.phase
    )
      this.people.clear();
    const ids = new Set(view.players.map((p) => p.id));
    for (const id of this.people.keys()) if (!ids.has(id)) this.people.delete(id);
    this.run = view.run.id;
    this.encounter = view.encounter;
    this.tick = view.tick;
    this.phase = view.phase;
  }
  sample(
    player: Pick<PlayerView, 'id' | 'classId' | 'x' | 'y' | 'aim' | 'status'>,
    wallTimeMs: number,
  ) {
    if (Number.isFinite(wallTimeMs)) this.time = Math.max(this.time, wallTimeMs);
    let memory = this.people.get(player.id);
    if (!memory || memory.classId !== player.classId) {
      memory = {
        classId: player.classId,
        x: player.x,
        y: player.y,
        movingUntil: -Infinity,
        facing: stableFacing(player.aim),
      };
      this.people.set(player.id, memory);
    }
    if (player.status === 'active' && Math.hypot(player.x - memory.x, player.y - memory.y) > 0.02)
      memory.movingUntil = this.time + MOVEMENT_GRACE_MS;
    else if (player.status !== 'active') memory.movingUntil = -Infinity;
    memory.x = player.x;
    memory.y = player.y;
    memory.facing = stableFacing(player.aim, memory.facing);
    return {
      moving: player.status === 'active' && this.time < memory.movingUntil,
      facing: memory.facing,
    };
  }
}
