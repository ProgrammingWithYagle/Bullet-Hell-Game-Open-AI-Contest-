import { distance, segmentRect, type Rect } from './geometry.ts';
import type { Player } from './game.ts';
import type { InputFrame, Vec } from './protocol.ts';

export const slipRouteId = 'assassin-slip-route-1';
export const infiltratorIds = {
  entry: slipRouteId,
  relay: 'assassin-infiltrator-footstep-relay-1',
  threshold: 'assassin-infiltrator-threshold-echo-1',
} as const;
export const slipRouteRules = {
  screenReach: 118,
  screenAim: .94,
  threatReach: 480,
  leaveDistance: 84,
  walkBudget: 226,
  searchTicks: 92,
  echoHealth: 34,
  echoTicks: 45,
  retainedVeilTicks: 24,
  minimumExchangeTicks: 32,
  thresholdRadius: 96,
  thresholdTicks: 27,
  thresholdLeash: 244,
  relayStartTicks: 19,
  relayTravel: 104,
  relayStride: 14,
  trailSample: 8,
} as const;

export type SlipRouteStatus = {
  phase: 'idle' | 'walk' | 'exit' | 'watch' | 'relay' | 'relaying';
  ready: boolean;
  until?: number;
  progress?: number;
  ground?: Vec;
  cover?: Vec;
  bentAt?: Vec;
  relayTo?: Vec;
};

type SlipRouteNote = 'mark' | 'break' | 'exchange' | 'lost' | 'arm' | 'threshold' | 'relay' | 'arrive';
type CoverChoice = { screen: Rect; corner: Vec };
type Route = CoverChoice & {
  origin: Vec;
  until: number;
  paidVeil: number;
  walked: number;
  bend?: Vec;
  trail?: Vec[];
  watch?: { at: number; until: number };
};
type Threat = Vec & { oldX: number; oldY: number };
export type SlipEcho = Vec & { id: number; until: number };
type Relay = { id: number; until: number; points: Vec[]; active: boolean; index: number };

export type SlipRouteWorld = {
  tick: number;
  cover: readonly Rect[];
  obstacles: readonly Rect[];
  threats: readonly Threat[];
  floor: (point: Vec) => boolean;
  passage: (owner: Player) => boolean;
  veilUntil: (owner: Player) => number;
  startVeil: (owner: Player) => number;
  canExchange: (owner: Player, origin: Vec, bend: Vec) => boolean;
  exchange: (owner: Player, origin: Vec, bend: Vec) => SlipEcho | undefined;
  echo: (owner: Player, id: number) => SlipEcho | undefined;
  shiftEcho: (owner: Player, id: number, point: Vec) => boolean;
  note: (owner: Player, event: SlipRouteNote, at: Vec) => void;
};

const rules = slipRouteRules;

function point({ x, y }: Vec): Vec {
  return { x, y };
}

function eligible(owner: Player): boolean {
  return owner.classId === 'assassin' && owner.connected && !owner.expired && owner.status === 'active' &&
    owner.health > 0 && owner.skills.includes(slipRouteId);
}

function freeHands(input: InputFrame): boolean {
  return !input.q && !input.e && !input.ultimate && !input.dodge && !input.sprint && !input.fire &&
    !input.reload && !input.technique1 && !input.technique3 && !input.interact && input.supply < 0;
}

function readyHands(owner: Player, world: SlipRouteWorld): boolean {
  return freeHands(owner.input) && owner.dashUntil <= world.tick && owner.reloadAt <= world.tick &&
    owner.channelUntil <= world.tick && !world.passage(owner);
}

function stationary(input: InputFrame): boolean {
  return Math.hypot(input.moveX, input.moveY) <= 1e-4;
}

function bearingDifference(left: number, right: number): number {
  return Math.abs(Math.atan2(Math.sin(left - right), Math.cos(left - right)));
}

function closestCoverPoint(origin: Vec, cover: Rect): Vec {
  return { x: Math.max(cover.x, Math.min(cover.x + cover.width, origin.x)),
    y: Math.max(cover.y, Math.min(cover.y + cover.height, origin.y)) };
}

function inReach(threat: Vec, owner: Vec): boolean {
  return distance(threat, owner) <= rules.threatReach;
}

function blocked(from: Vec, to: Vec, screen: Rect): boolean {
  const collision = segmentRect(from, to, screen);
  return !!collision && collision.t > 0 && collision.t < .999;
}

function chooseCover(owner: Player, world: SlipRouteWorld): CoverChoice | undefined {
  if (!world.floor(owner) || !world.threats.some(threat => inReach(threat, owner) &&
      !world.obstacles.some(screen => blocked(threat, owner, screen)))) return undefined;
  let closest: CoverChoice | undefined;
  let gap: number = rules.screenReach;
  for (const screen of world.cover) {
    const corner = closestCoverPoint(owner, screen);
    const distanceToCover = distance(owner, corner);
    if (distanceToCover > gap || bearingDifference(owner.aim, Math.atan2(corner.y - owner.y, corner.x - owner.x)) > rules.screenAim) continue;
    closest = { screen, corner };
    gap = distanceToCover;
  }
  return closest;
}

function crossedScreen(from: Vec, to: Vec, screen: Rect, world: SlipRouteWorld): boolean {
  return world.threats.some(threat => inReach(threat, to) && blocked(threat, to, screen) &&
    !world.obstacles.some(obstacle => blocked(threat, from, obstacle)));
}

function stillScreened(owner: Vec, screen: Rect, world: SlipRouteWorld): boolean {
  return world.threats.some(threat => inReach(threat, owner) && blocked(threat, owner, screen));
}

function entersThreshold(origin: Vec, world: SlipRouteWorld): boolean {
  return world.threats.some(threat => distance({ x: threat.oldX, y: threat.oldY }, origin) > rules.thresholdRadius &&
    distance(threat, origin) <= rules.thresholdRadius && !world.obstacles.some(rect => blocked(threat, origin, rect)));
}

function remember(trail: Vec[], position: Vec, force = false): void {
  const last = trail.at(-1)!;
  if (distance(last, position) >= (force ? 1e-6 : rules.trailSample)) trail.push(point(position));
}

function relayTrail(trail: Vec[], echo: SlipEcho): Vec[] {
  const start = trail.findIndex(sample => distance(echo, sample) <= 1e-6);
  if (start < 0) return [];
  const forward = trail.slice(start + 1), returning = trail.slice(0, start).reverse();
  for (const candidates of [forward, returning]) {
    const path: Vec[] = [];
    let origin: Vec = echo, walked = 0;
    for (const next of candidates) {
      const leg = distance(origin, next);
      if (walked + leg >= rules.relayTravel) {
        const ratio = (rules.relayTravel - walked) / leg;
        path.push({ x: origin.x + (next.x - origin.x) * ratio, y: origin.y + (next.y - origin.y) * ratio });
        return path;
      }
      path.push(next);
      origin = next;
      walked += leg;
    }
    if (walked >= 38) return path;
  }
  return [];
}

export class SlipRoute {
  private readonly routes = new Map<string, Route>();
  private readonly relays = new Map<string, Relay>();

  get active(): boolean { return this.routes.size > 0 || this.relays.size > 0; }
  has(owner: string): boolean { return this.routes.has(owner) || this.relays.has(owner); }
  clear(): void { this.routes.clear(); this.relays.clear(); }
  drop(owner: string): void { this.routes.delete(owner); this.relays.delete(owner); }

  private prepared(owner: Player, route: Route, world: SlipRouteWorld): boolean {
    return !!route.bend && route.walked >= rules.leaveDistance && distance(owner, route.origin) >= rules.leaveDistance &&
      stillScreened(owner, route.screen, world) && world.floor(owner) && world.canExchange(owner, route.origin, route.bend);
  }

  status(owner: Player, world: SlipRouteWorld, combat: boolean): SlipRouteStatus {
    const idle: SlipRouteStatus = { phase: 'idle', ready: false, until: owner.qAt };
    if (!combat || !eligible(owner)) return idle;
    const hands = readyHands(owner, world) && stationary(owner.input);
    const relay = this.relays.get(owner.id);
    if (relay) {
      const echo = world.echo(owner, relay.id);
      if (echo) return { phase: relay.active ? 'relaying' : 'relay', ready: !relay.active && hands &&
        world.tick < relay.until && distance(owner, echo) <= rules.thresholdLeash,
        until: relay.until, ground: point(echo), relayTo: relay.points.at(-1) };
    }
    const route = this.routes.get(owner.id);
    if (!route) return { ...idle, ready: hands && owner.qAt <= world.tick && !!chooseCover(owner, world) };
    if (route.watch) return { phase: 'watch', ready: hands && world.tick < route.watch.until &&
      distance(owner, route.origin) <= rules.thresholdLeash && world.canExchange(owner, route.origin, route.bend!),
      until: route.watch.until, ground: route.origin, cover: route.corner, bentAt: route.bend, progress: 1 };
    const prepared = this.prepared(owner, route, world);
    return {
      phase: prepared ? 'exit' : 'walk',
      ready: prepared && hands && world.tick < route.until,
      until: route.until,
      progress: Math.min(1, route.walked / rules.leaveDistance),
      ground: route.origin,
      cover: route.corner,
      bentAt: route.bend,
    };
  }

  move(owner: Player, input: InputFrame, world: SlipRouteWorld, walking: boolean): void {
    if (!eligible(owner)) return;
    const route = this.routes.get(owner.id);
    const now = world.tick;
    const from = { x: owner.oldX, y: owner.oldY };
    const stride = distance(owner, from);
    const standing = stationary(input) && stride <= 1e-6;
    const command = input.technique2 && freeHands(input) && readyHands(owner, world);
    const relay = this.relays.get(owner.id);
    if (relay) {
      const echo = world.echo(owner, relay.id);
      if (command && standing && !relay.active && now < relay.until && echo && distance(owner, echo) <= rules.thresholdLeash) {
        relay.active = true;
        relay.until = echo.until;
        world.note(owner, 'relay', echo);
      }
      return;
    }
    if (!route) {
      if (!command || !standing || owner.qAt > now) return;
      const choice = chooseCover(owner, world);
      if (!choice) return;
      const veilUntil = world.startVeil(owner);
      if (veilUntil <= now + rules.minimumExchangeTicks) return;
      const origin = point(owner);
      this.routes.set(owner.id, { ...choice, origin, until: Math.min(now + rules.searchTicks, veilUntil), paidVeil: veilUntil, walked: 0,
        trail: owner.skills.includes(infiltratorIds.relay) ? [origin] : undefined });
      world.note(owner, 'mark', owner);
      return;
    }
    if (now >= route.until || world.veilUntil(owner) !== route.paidVeil || world.veilUntil(owner) <= now || (input.q && owner.qAt <= now)) {
      this.abandon(owner, route, world);
      return;
    }
    if (route.watch) {
      if (now >= route.watch.until || distance(owner, route.origin) > rules.thresholdLeash) this.abandon(owner, route, world);
      else if (command && standing && now > route.watch.at) this.complete(owner, route, world);
      return;
    }
    if (world.passage(owner) ||
        (input.e && owner.eAt <= now) || input.ultimate || owner.dashUntil > now || owner.sprinting || stride > 1e-6 && !walking) {
      this.abandon(owner, route, world);
      return;
    }
    if (walking && stride > 1e-6) {
      route.walked += stride;
      if (route.walked > rules.walkBudget) {
        this.abandon(owner, route, world);
        return;
      }
      if (!route.bend && world.floor(owner) && crossedScreen(from, owner, route.screen, world)) {
        route.bend = point(owner);
        if (route.trail) remember(route.trail, owner, true);
        world.note(owner, 'break', owner);
      }
      if (route.trail) remember(route.trail, owner);
    }
    if (!command || !standing || !this.prepared(owner, route, world)) return;
    if (owner.skills.includes(infiltratorIds.threshold)) {
      route.watch = { at: now, until: Math.min(now + rules.thresholdTicks, route.until) };
      world.note(owner, 'arm', route.origin);
    } else this.complete(owner, route, world);
  }

  private complete(owner: Player, route: Route, world: SlipRouteWorld, threshold = false): void {
    const echo = world.exchange(owner, route.origin, route.bend!);
    if (!echo) return;
    this.routes.delete(owner.id);
    if (route.trail) {
      remember(route.trail, owner, true);
      const points = relayTrail(route.trail, echo);
      if (points.length) this.relays.set(owner.id, { id: echo.id, until: Math.min(world.tick + rules.relayStartTicks, echo.until),
        points, active: false, index: 0 });
    }
    if (threshold) world.note(owner, 'threshold', echo);
    world.note(owner, 'exchange', echo);
  }

  private relayStep(owner: Player, relay: Relay, world: SlipRouteWorld): void {
    let budget: number = rules.relayStride;
    const echo = world.echo(owner, relay.id);
    if (!echo || world.tick >= relay.until) {
      this.relays.delete(owner.id);
      return;
    }
    if (!relay.active) return;
    let at = point(echo);
    while (budget > 1e-6 && relay.index < relay.points.length) {
      const goal = relay.points[relay.index], gap = distance(at, goal);
      const share = gap > budget ? budget / gap : 1;
      const next: Vec = { x: at.x + (goal.x - at.x) * share, y: at.y + (goal.y - at.y) * share };
      if (gap > 1e-6 && !world.shiftEcho(owner, relay.id, next)) {
        this.relays.delete(owner.id);
        return;
      }
      if (share === 1) relay.index++;
      budget -= Math.min(gap, budget);
      at = next;
    }
    if (relay.index === relay.points.length) {
      this.relays.delete(owner.id);
      world.note(owner, 'arrive', at);
    }
  }

  advance(players: ReadonlyMap<string, Player>, world: SlipRouteWorld): void {
    for (const [id, route] of this.routes) {
      const owner = players.get(id);
      if (!owner || !eligible(owner)) this.drop(id);
      else if (world.tick >= route.until || world.veilUntil(owner) !== route.paidVeil || world.veilUntil(owner) <= world.tick ||
          route.watch && (world.tick >= route.watch.until || distance(owner, route.origin) > rules.thresholdLeash)) this.abandon(owner, route, world);
      else if (route.watch && world.tick > route.watch.at && entersThreshold(route.origin, world)) this.complete(owner, route, world, true);
    }
    for (const [id, relay] of this.relays) {
      const owner = players.get(id);
      if (!owner || !eligible(owner)) this.relays.delete(id);
      else this.relayStep(owner, relay, world);
    }
  }

  private abandon(owner: Player, route: Route, world: SlipRouteWorld): void {
    this.drop(owner.id);
    world.note(owner, 'lost', route.origin);
  }
}
