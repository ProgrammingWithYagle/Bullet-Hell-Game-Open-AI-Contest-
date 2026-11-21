import { segmentCircle, segmentRect, type Rect } from './geometry.ts';
import type { Vec } from './protocol.ts';

export const bastionIds = {
  entry: 'tank-gate-signal-1',
  split: 'tank-gate-signal-split-1',
  corner: 'tank-gate-signal-corner-1',
  countermarch: 'tank-gate-signal-countermarch-1',
  relief: 'tank-gate-signal-relief-1',
} as const;

export const bastionRules = { lead: 42, halfSpan: 54, approachDepth: 28, minimumCrossingDot: 0.5 } as const;
export type BastionStatus = { bastionCanPlant: boolean; bastionAdjustment?: 'turn' | 'relief' };
export type BastionWorld = {
  tick: number;
  playerRadius: number;
  bounds: Rect;
  obstacles: readonly Rect[];
  lavaPits: readonly (Vec & { radius: number })[];
};
type Actor = Vec & {
  id: string; classId: string; connected: boolean; status: string;
  skills: readonly string[]; aim: number; ultimateAt: number;
};
type Guard = { shield: number; armor: number; until: number };
type Walk = { id: string; from: Vec; to: Vec; input: Vec };
type Half = 'whole' | 'left' | 'right';
type Entrance = { normal: Vec; half: Half; reserve: number };
type Layout = { center: Vec; entrances: Entrance[]; remaining: boolean[] };
type Adjustment = { index: number; kind: 'turn' | 'relief' };
type Station = Layout & { id: number; owner: string; at: number; guard: Guard; adjustment?: Adjustment; adjusted?: true };
type Candidate = { station: Station; target: string; index: number; reserve: number; fraction: number };
export type BastionCue = {
  kind: 'tank-gate-signal';
  id: number;
  owner: string;
  x: number;
  y: number;
  at: number;
  until: number;
  radius: number;
  entrances: { aim: number; half: Half; open: boolean }[];
};

const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const relative = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const tangent = (n: Vec): Vec => ({ x: -n.y, y: n.x });
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const active = (actor: Actor) => actor.connected && actor.status === 'active';

function inside(world: BastionWorld, center: Vec, x: number, y: number) {
  const b = world.bounds;
  return center.x >= b.x + x && center.x <= b.x + b.width - x &&
    center.y >= b.y + y && center.y <= b.y + b.height - y;
}

function walkClear(world: BastionWorld, from: Vec, to: Vec) {
  const pad = world.playerRadius + 2;
  return inside(world, from, pad, pad) && inside(world, to, pad, pad) &&
    world.obstacles.every(wall => segmentRect(from, to, wall, pad) === null) &&
    world.lavaPits.every(pit => segmentCircle(from, to, pit, pit.radius + pad) === null);
}

function entranceClear(world: BastionWorld, center: Vec, n: Vec) {
  const { halfSpan: span, approachDepth: depth } = bastionRules;
  const side = tangent(n), pad = world.playerRadius + 2;
  const halfX = Math.abs(n.x) * depth + Math.abs(side.x) * span;
  const halfY = Math.abs(n.y) * depth + Math.abs(side.y) * span;
  if (!inside(world, center, halfX + pad, halfY + pad)) return false;
  // The four separating axes cover the entire approach rectangle, including its interior.
  const wallOverlaps = world.obstacles.some(wall => {
    const delta = relative({ x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 }, center);
    const x = wall.width / 2 + pad, y = wall.height / 2 + pad;
    return Math.abs(delta.x) <= halfX + x && Math.abs(delta.y) <= halfY + y &&
      Math.abs(dot(delta, n)) <= depth + Math.abs(n.x) * x + Math.abs(n.y) * y &&
      Math.abs(dot(delta, side)) <= span + Math.abs(side.x) * x + Math.abs(side.y) * y;
  });
  if (wallOverlaps) return false;
  return world.lavaPits.every(pit => {
    const delta = relative(pit, center);
    const x = Math.max(0, Math.abs(dot(delta, n)) - depth), y = Math.max(0, Math.abs(dot(delta, side)) - span);
    return Math.hypot(x, y) > pit.radius + pad;
  });
}

function onMarkedSpan(half: Half, across: number, radius: number) {
  if (Math.abs(across) > bastionRules.halfSpan - radius) return false;
  if (half === 'left') return across < -radius;
  if (half === 'right') return across > radius;
  return true;
}

function inShelter(position: Vec, { normal, half }: Entrance, radius: number) {
  const depth = dot(position, normal);
  return depth >= -bastionRules.approachDepth && depth <= -radius &&
    onMarkedSpan(half, dot(position, tangent(normal)), radius);
}

export class TankBastion {
  private readonly stations = new Map<string, Station>();
  private readonly walks: Walk[] = [];

  constructor(private readonly nextId: () => number) {}

  get hasStations() {
    return this.stations.size > 0;
  }

  private layout(actor: Actor, world: BastionWorld): Layout | undefined {
    if (actor.classId !== 'tank' || !active(actor) || !actor.skills.includes(bastionIds.entry) ||
        world.tick < actor.ultimateAt || this.stations.has(actor.id)) return;
    const split = actor.skills.includes(bastionIds.split), corner = actor.skills.includes(bastionIds.corner);
    if (split && corner) return;
    const normal = { x: Math.cos(actor.aim), y: Math.sin(actor.aim) };
    const center = { x: actor.x - normal.x * bastionRules.lead, y: actor.y - normal.y * bastionRules.lead };
    if (!walkClear(world, actor, center) || !entranceClear(world, center, normal)) return;
    const entrances: Entrance[] = split
      ? [{ normal, half: 'left', reserve: 0 }, { normal, half: 'right', reserve: 1 }]
      : [{ normal, half: 'whole', reserve: 0 }];
    if (corner) {
      const other = tangent(normal);
      if (!entranceClear(world, center, other)) return;
      entrances.push({ normal: other, half: 'whole', reserve: 0 });
    }
    return { center, entrances, remaining: split ? [true, true] : [true] };
  }

  canPlant(actor: Actor, world: BastionWorld) {
    return !!this.layout(actor, world);
  }

  plant(actor: Actor, guard: Guard, recovery: number, world: BastionWorld) {
    const layout = this.layout(actor, world);
    if (!layout || !Number.isSafeInteger(guard.until) || guard.until <= world.tick ||
        ![guard.shield, guard.armor].every(Number.isFinite) || guard.shield < 0 || guard.armor < 0 ||
        guard.shield + guard.armor <= 0) return;
    this.stations.set(actor.id, { ...layout, id: this.nextId(), owner: actor.id, at: world.tick, guard });
    actor.ultimateAt = world.tick + recovery;
    return layout.center;
  }

  private adjustmentFor(actor: Actor, world: BastionWorld) {
    if (actor.classId !== 'tank' || !active(actor)) return;
    const station = this.stations.get(actor.id);
    if (!station || station.adjusted || station.adjustment ||
        world.tick <= station.at || world.tick >= station.guard.until) return;

    let kind: Adjustment['kind'];
    if (actor.skills.includes(bastionIds.corner) && actor.skills.includes(bastionIds.countermarch)) {
      kind = 'turn';
    } else if (actor.skills.includes(bastionIds.split) && actor.skills.includes(bastionIds.relief)) {
      if (station.remaining.length !== 2 || station.remaining.filter(Boolean).length !== 1) return;
      kind = 'relief';
    } else return;

    const position = relative(actor, station.center);
    const aim = { x: Math.cos(actor.aim), y: Math.sin(actor.aim) };
    const towardOriginalThreat = kind === 'relief' ? 1 : -1;
    const index = station.entrances.findIndex(face =>
      station.remaining[face.reserve] === (kind === 'turn') &&
      dot(aim, face.normal) * towardOriginalThreat >= Math.cos(Math.PI / 8) &&
      inShelter(position, face, world.playerRadius) && entranceClear(world, station.center, face.normal));
    if (index >= 0) return { station, adjustment: { index, kind } };
  }

  readyAdjustment(actor: Actor, world: BastionWorld) {
    return this.adjustmentFor(actor, world)?.adjustment.kind;
  }

  requestAdjustment(actor: Actor, world: BastionWorld) {
    const request = this.adjustmentFor(actor, world);
    if (!request) return false;
    request.station.adjustment = request.adjustment;
    return true;
  }

  remove(owner: string) {
    this.stations.delete(owner);
  }

  clear() {
    this.stations.clear();
    this.walks.length = 0;
  }

  record(walk: Walk) {
    this.walks.push(walk);
  }

  resolve(world: BastionWorld, players: readonly Actor[], accept: (target: string, guard: Guard) => boolean, adjusted?: (owner: string, center: Vec) => void) {
    const present = new Set(players.filter(active).map(p => p.id));
    const candidates: Candidate[] = [];
    for (const [owner, station] of this.stations) {
      if (!present.has(owner) || world.tick >= station.guard.until) {
        this.stations.delete(owner);
        continue;
      }
      if (world.tick <= station.at) continue;
      for (const { id, from, to, input } of this.walks) {
        if (!present.has(id)) continue;
        const effort = Math.hypot(input.x, input.y);
        if (effort === 0) continue;
        const a = relative(from, station.center), b = relative(to, station.center);
        for (const [index, { normal, half, reserve }] of station.entrances.entries()) {
          if (!station.remaining[reserve] || dot(input, normal) > -bastionRules.minimumCrossingDot * effort) continue;
          const before = dot(a, normal), after = dot(b, normal);
          if (before <= 0 || after > 0) continue;
          const fraction = before / (before - after), side = tangent(normal);
          const across = dot(a, side) + fraction * (dot(b, side) - dot(a, side));
          const radius = world.playerRadius;
          if (!onMarkedSpan(half, across, radius) || !walkClear(world, from, to)) continue;
          candidates.push({ station, target: id, index, reserve, fraction });
        }
      }
    }
    this.walks.length = 0;

    // Resolve the walked segments across every station before spending any reserve.
    candidates.sort((a, b) => a.fraction - b.fraction || compare(a.target, b.target) ||
      compare(a.station.owner, b.station.owner) || a.index - b.index);
    const claimed = new Set<string>();
    for (const { station, target, reserve } of candidates) {
      if (claimed.has(target) || !station.remaining[reserve]) continue;
      const share = 1 / station.remaining.length;
      const { shield, armor, until } = station.guard;
      if (!accept(target, { shield: shield * share, armor: armor * share, until })) continue;
      station.remaining[reserve] = false;
      claimed.add(target);
      if (!station.remaining.includes(true)) this.stations.delete(station.owner);
    }

    // Commands change the next crossing. Every crossing in this interval used the earlier marks.
    for (const station of this.stations.values()) {
      const request = station.adjustment;
      if (!request) continue;
      delete station.adjustment;
      const face = station.entrances[request.index];
      if (request.kind === 'turn') {
        if (!station.remaining[face.reserve]) continue;
        const { x, y } = face.normal;
        face.normal = { x: -x, y: -y };
      } else {
        const other = station.entrances[1 - request.index];
        if (!other || station.remaining[face.reserve] || !station.remaining[other.reserve]) continue;
        const previous = face.reserve;
        face.reserve = other.reserve;
        other.reserve = previous;
      }
      station.adjusted = true;
      adjusted?.(station.owner, station.center);
    }
  }

  cues(tick: number): BastionCue[] {
    return [...this.stations.values()].filter(station => tick < station.guard.until).map(station => ({
      kind: 'tank-gate-signal', id: station.id, owner: station.owner, x: station.center.x, y: station.center.y,
      at: station.at, until: station.guard.until, radius: bastionRules.halfSpan,
      entrances: station.entrances.map(({ normal, half, reserve }) => ({
        aim: Math.atan2(normal.y, normal.x), half, open: station.remaining[reserve],
      })),
    }));
  }
}
