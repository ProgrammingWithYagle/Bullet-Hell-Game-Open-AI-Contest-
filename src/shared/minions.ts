// Server-owned ordinary actors. Bosses deliberately do not use this slow state.
import catalog from '../../content/catalog.json' with { type: 'json' };
import { DT, HZ, type Vec } from './protocol.ts';
import { distance, moveBody, segmentCircle, type Rect } from './geometry.ts';

export type Minion = {
  id: number;
  kind: 'rat' | 'ordinary';
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  health: number;
  maxHealth: number;
  speed: number;
  radius: number;
  damage: number;
  goalX?: number;
  goalY?: number;
  expires: number;
  attackAt: number;
  slowUntil: number;
  slowMultiplier: number;
};
export type MinionSpawn = {
  kind: Minion['kind'];
  x: number;
  y: number;
  health: number;
  speed: number;
  radius: number;
  damage: number;
  lifeSeconds?: number;
  goalX?: number;
  goalY?: number;
};
type Target = Vec & { id: string; oldX?: number; oldY?: number };

export class Minions {
  readonly actors = new Map<number, Minion>();
  spawn(id: number, definition: MinionSpawn, tick: number): Minion | null {
    const lifetime = definition.lifeSeconds ?? 60;
    if (
      (definition.goalX === undefined) !== (definition.goalY === undefined) ||
      (definition.goalX !== undefined &&
        (!Number.isFinite(definition.goalX) ||
          !Number.isFinite(definition.goalY) ||
          definition.goalX < 0 ||
          definition.goalX > 1600 ||
          definition.goalY! < 0 ||
          definition.goalY! > 1000))
    )
      throw Error('Invalid ordinary enemy goal');
    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      this.actors.has(id) ||
      !Number.isSafeInteger(tick) ||
      tick < 0 ||
      !['rat', 'ordinary'].includes(definition.kind) ||
      ![
        definition.x,
        definition.y,
        definition.health,
        definition.speed,
        definition.radius,
        definition.damage,
        lifetime,
      ].every(Number.isFinite) ||
      definition.radius < 2 ||
      definition.radius > 48 ||
      definition.health <= 0 ||
      definition.health > 1e6 ||
      definition.speed < 0 ||
      definition.speed > 600 ||
      definition.damage < 0 ||
      definition.damage > 1000 ||
      lifetime <= 0 ||
      lifetime > 1200 ||
      definition.x < definition.radius ||
      definition.x > 1600 - definition.radius ||
      definition.y < definition.radius ||
      definition.y > 1000 - definition.radius
    )
      throw Error('Invalid ordinary enemy');
    if (this.actors.size >= catalog.rules.maximumMinions) return null;
    const actor: Minion = {
      ...definition,
      id,
      oldX: definition.x,
      oldY: definition.y,
      maxHealth: definition.health,
      expires: tick + Math.ceil(lifetime * HZ),
      attackAt: tick,
      slowUntil: 0,
      slowMultiplier: 1,
    };
    this.actors.set(id, actor);
    return actor;
  }
  hit(id: number, damage: number, tick: number, slowTicks = 0, slowMultiplier = 1) {
    if (
      ![damage, slowMultiplier].every(Number.isFinite) ||
      damage < 0 ||
      !Number.isSafeInteger(tick) ||
      tick < 0 ||
      !Number.isSafeInteger(slowTicks) ||
      slowTicks < 0 ||
      slowMultiplier <= 0 ||
      slowMultiplier > 1
    )
      throw Error('Invalid ordinary enemy hit');
    const actor = this.actors.get(id);
    if (!actor) return 0;
    const actual = Math.min(actor.health, Math.max(0, damage));
    actor.health -= actual;
    if (slowTicks > 0) {
      const wasSlowed = tick < actor.slowUntil;
      actor.slowUntil = Math.max(actor.slowUntil, tick + slowTicks);
      actor.slowMultiplier = wasSlowed
        ? Math.min(actor.slowMultiplier, slowMultiplier)
        : slowMultiplier;
    }
    if (actor.health <= 0) this.actors.delete(id);
    return actual;
  }
  step(
    tick: number,
    targets: Target[],
    obstacles: Rect[],
    contact: (target: Target, damage: number) => void,
    aimTargets: Target[] = targets,
  ) {
    for (const actor of this.actors.values()) {
      if (actor.expires <= tick) {
        this.actors.delete(actor.id);
        continue;
      }
      actor.oldX = actor.x;
      actor.oldY = actor.y;
      if (tick >= actor.slowUntil) actor.slowMultiplier = 1;
      const target = aimTargets.reduce<Target | undefined>(
        (nearest, candidate) =>
          !nearest || distance(actor, candidate) < distance(actor, nearest) ? candidate : nearest,
        undefined,
      );
      if (actor.goalX !== undefined && distance(actor, { x: actor.goalX, y: actor.goalY! }) < 24) {
        actor.goalX = actor.goalY = undefined;
      }
      const destination =
        actor.goalX === undefined ? (target ?? actor) : { x: actor.goalX, y: actor.goalY! };
      const dx = destination.x - actor.x,
        dy = destination.y - actor.y,
        length = Math.hypot(dx, dy);
      const speed = actor.speed * actor.slowMultiplier;
      const travel = Math.min(
        speed * DT,
        Math.max(
          0,
          length - (actor.goalX === undefined ? actor.radius + catalog.rules.playerRadius : 0),
        ),
      );
      const next = moveBody(
        actor,
        {
          x: length ? (dx / length) * travel : 0,
          y: length ? (dy / length) * travel : 0,
        },
        actor.radius,
        obstacles,
      );
      if (actor.goalX !== undefined && distance(actor, next) < 0.01)
        actor.goalX = actor.goalY = undefined;
      actor.x = next.x;
      actor.y = next.y;
      if (tick >= actor.attackAt) {
        let victim: Target | undefined,
          first = Infinity;
        for (const candidate of targets) {
          const time = segmentCircle(
            {
              x: actor.oldX - (candidate.oldX ?? candidate.x),
              y: actor.oldY - (candidate.oldY ?? candidate.y),
            },
            { x: actor.x - candidate.x, y: actor.y - candidate.y },
            { x: 0, y: 0 },
            actor.radius + catalog.rules.playerRadius + 0.1,
          );
          if (time !== null && time < first) {
            first = time;
            victim = candidate;
          }
        }
        if (victim) {
          contact(victim, actor.damage);
          actor.attackAt = tick + Math.ceil(0.5 * HZ);
        }
      }
    }
  }
  snapshot() {
    return [...this.actors.values()].map((actor) => ({ ...actor }));
  }
  clear() {
    this.actors.clear();
  }
}
