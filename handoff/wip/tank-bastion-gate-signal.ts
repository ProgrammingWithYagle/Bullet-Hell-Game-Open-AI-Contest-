type Point = {x: number; y: number};
export type GateFitting = 'plain' | 'split' | 'corner';
export type Guard = {shield: number; armor: number; until: number};
export type Step = {id: string; from: Point; to: Point; input: Point; voluntary: boolean};
type Entrance = {normal: Point; half: 'whole' | 'left' | 'right'; reserve: number};
type Station = {
  owner: string;
  at: number;
  until: number;
  center: Point;
  guard: Guard;
  entrances: Entrance[];
  remaining: boolean[];
};
type Candidate = { station: Station; target: string; index: number; reserve: number; fraction: number };
export type GateWorld = {
  tick: number;
  active: ReadonlySet<string>;
  bodyRadius: number;
  clear: (from: Point, to: Point) => boolean;
};
export const gateSignalRules = {halfSpan: 54, approachDepth: 28, minimumCrossingDot: 0.5} as const;

function dot(a: Point, b: Point) {
  return a.x * b.x + a.y * b.y;
}

function offset(center: Point, normal: Point, along: number, across: number): Point {
  return {x: center.x + normal.x * along - normal.y * across, y: center.y + normal.y * along + normal.x * across};
}

function relative(a: Point, b: Point): Point {
  return {x: a.x - b.x, y: a.y - b.y};
}

export class GateSignal {
  private readonly stations = new Map<string, Station>();

  plant(owner: string, center: Point, aim: number, fitting: GateFitting, guard: Guard, world: GateWorld): boolean {
    if (!world.active.has(owner) || this.stations.has(owner) || !Number.isSafeInteger(guard.until) || world.tick >= guard.until ||
        ![center.x, center.y, aim, guard.shield, guard.armor].every(Number.isFinite) ||
        guard.shield < 0 || guard.armor < 0 || guard.shield + guard.armor === 0) return false;
    const normal = {x: Math.cos(aim), y: Math.sin(aim)};
    const {halfSpan, approachDepth} = gateSignalRules;
    const entrances: Entrance[] = fitting === 'split'
      ? [{normal, half: 'left', reserve: 0}, {normal, half: 'right', reserve: 1}]
      : [{normal, half: 'whole', reserve: 0}];
    if (fitting === 'corner') entrances.push({normal: {x: -normal.y, y: normal.x}, half: 'whole', reserve: 0});
    for (const {normal: face} of entrances) {
      // Both lips, corners and the middle must have space for a real walking body.
      for (const across of [-halfSpan, 0, halfSpan]) {
        if (!world.clear(offset(center, face, approachDepth, across), offset(center, face, -approachDepth, across))) return false;
      }
      for (const along of [-approachDepth, 0, approachDepth]) {
        if (!world.clear(offset(center, face, along, -halfSpan), offset(center, face, along, halfSpan))) return false;
      }
    }
    this.stations.set(owner, {
      owner, at: world.tick, until: guard.until, center: {...center}, guard: {...guard}, entrances,
      remaining: fitting === 'split' ? [true, true] : [true],
    });
    return true;
  }

  get hasStation() {
    return this.stations.size > 0;
  }

  remove(owner: string) {
    this.stations.delete(owner);
  }

  snapshot(owner: string) {
    const station = this.stations.get(owner);
    return station && structuredClone(station);
  }

  clear() {
    this.stations.clear();
  }

  step(world: GateWorld, steps: readonly Step[], accept: (target: string, guard: Guard) => boolean) {
    const claims: {owner: string; target: string; entrance: number; guard: Guard}[] = [];
    const candidates: Candidate[] = [];
    for (const [owner, station] of this.stations) {
      if (!world.active.has(owner) || world.tick >= station.until) {
        this.stations.delete(owner);
        continue;
      }
      candidates.push(...steps.flatMap(step => station.entrances.flatMap((entrance, index) => {
        if (!step.voluntary || !world.active.has(step.id) || !station.remaining[entrance.reserve] ||
            world.tick <= station.at || ![step.input.x, step.input.y, step.from.x, step.from.y, step.to.x, step.to.y].every(Number.isFinite)) return [];
        const movement = Math.hypot(step.input.x, step.input.y);
        if (movement <= 0 || dot(step.input, entrance.normal) > -gateSignalRules.minimumCrossingDot * movement) return [];
        const from = relative(step.from, station.center), to = relative(step.to, station.center);
        const depthBefore = dot(from, entrance.normal), depthAfter = dot(to, entrance.normal);
        if (depthBefore <= 0 || depthAfter > 0) return [];
        const fraction = depthBefore / (depthBefore - depthAfter);
        const tangent = {x: -entrance.normal.y, y: entrance.normal.x};
        const across = dot(from, tangent) + fraction * dot(relative(to, from), tangent);
        if (Math.abs(across) > gateSignalRules.halfSpan - world.bodyRadius) return [];
        if (entrance.half === 'left' && across >= -world.bodyRadius) return [];
        if (entrance.half === 'right' && across <= world.bodyRadius) return [];
        if (!world.clear(step.from, step.to)) return [];
        return [{station, target: step.id, index, reserve: entrance.reserve, fraction}];
      })));
    }

    // One step can cross both Corner faces or gates from different Tanks.
    // Use the position along the walked segment before breaking exact ties by ID.
    const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
    candidates.sort((a, b) => a.fraction - b.fraction ||
      compare(a.target, b.target) || compare(a.station.owner, b.station.owner) || a.index - b.index);
    const claimed = new Set<string>();
    for (const {station, target, reserve, index} of candidates) {
      if (claimed.has(target) || !station.remaining[reserve]) continue;
      const share = 1 / station.remaining.length;
      const guard = {shield: station.guard.shield * share, armor: station.guard.armor * share, until: station.until};
      if (!accept(target, guard)) continue;
      station.remaining[reserve] = false;
      claimed.add(target);
      claims.push({owner: station.owner, target, entrance: index, guard});
      if (!station.remaining.includes(true)) this.stations.delete(station.owner);
    }
    return claims;
  }
}
