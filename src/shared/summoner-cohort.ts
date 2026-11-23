import { distance, segmentRect } from './geometry.ts';
import type { Vec } from './protocol.ts';
import type { SummonEntity, SummonerContext, SummonerOwner, SummonTarget } from './summoner-kit.ts';

export const cohortIds = {
  entry: 'summoner-cohort-drive-1',
  cross: 'summoner-cohort-cross-orders-1',
  relay: 'summoner-cohort-relay-orders-1',
} as const;

export const cohortRules = {
  duration: 105,
  relayWindow: 59,
  relayDuration: 90,
  recovery: 232,
  ownerReach: 500,
  unitReach: 440,
  maximumLeg: 490,
  arrival: 10,
  marchSpeed: 1.38,
  frontAngle: Math.PI / 6,
  crossAngle: 1.79,
} as const;

export type CohortFitting = 'cross' | 'relay';
export const cohortFitting = (skills: readonly string[]): CohortFitting | undefined => {
  if (skills.includes(cohortIds.cross)) return 'cross';
  if (skills.includes(cohortIds.relay)) return 'relay';
};
export type CohortCue = Vec & {
  kind: 'summoner-cohort';
  state: 'march' | 'relay';
  id: number;
  owner: string;
  unit: number;
  radius: number;
  at: number;
  until: number;
};

type Assignment = {
  cue: CohortCue;
  arrived: boolean;
};

type Order = {
  target: string;
  moves: Assignment[];
  until: number;
  follower?: number;
  waitingShot?: number;
  follow?: CohortCue;
};

type Destination = { unit: SummonEntity; point: Vec };
type Plan = { target: string; marches: Destination[]; follower?: number; second: boolean };

const inLine = (from: Vec, to: Vec, c: SummonerContext, radius = 0) =>
  !c.obstacles.some(rect => segmentRect(from, to, rect, radius) !== null);

function legal(point: Vec, unit: SummonEntity, c: SummonerContext) {
  const bounds = c.bounds;
  const radius = unit.radius;
  return point.x >= bounds.x + radius && point.x <= bounds.x + bounds.width - radius &&
    point.y >= bounds.y + radius && point.y <= bounds.y + bounds.height - radius &&
    inLine(point, point, c, radius) && c.lava.every(pit => distance(point, pit) > pit.radius + radius);
}

function destination(owner: SummonerOwner, unit: SummonEntity, target: SummonTarget, offset: number, c: SummonerContext) {
  const baseline = distance(owner, target) > 0.001 ? Math.atan2(owner.y - target.y, owner.x - target.x) : owner.aim + Math.PI;
  const reach = target.radius + Math.min(94, Math.max(unit.radius + 4, unit.range * 0.65));
  for (const adjustment of [0, 0.17, -0.17, 0.31, -0.31]) {
    const aim = baseline + offset + adjustment;
    const point = { x: target.x + Math.cos(aim) * reach, y: target.y + Math.sin(aim) * reach };
    if (distance(unit, point) <= cohortRules.maximumLeg && legal(point, unit, c) && inLine(point, target, c)) {
      return { unit, point };
    }
  }
}

function eligible(owner: SummonerOwner, unit: SummonEntity) {
  return unit.owner === owner.id && unit.health > 0 && !unit.temporary && distance(owner, unit) <= cohortRules.unitReach;
}

export class CohortDrive {
  private readonly orders = new Map<string, Order>();
  private readonly recovery = new Map<string, number>();

  cancel(owner: string) {
    this.orders.delete(owner);
  }

  clear() {
    this.orders.clear();
    this.recovery.clear();
  }

  private plan(owner: SummonerOwner, units: readonly SummonEntity[], mark: string, fitting: CohortFitting | undefined,
    gathering: boolean, c: SummonerContext): Plan | undefined {
    if (gathering || !mark || !c.combat || c.paused) return;
    const target = c.target(mark);
    if (!target || target.health <= 0 || distance(owner, target) > cohortRules.ownerReach) return;
    const order = this.orders.get(owner.id);
    const companions = units.filter(unit => eligible(owner, unit)).sort((a, b) => a.slot - b.slot);
    if (order) {
      if (!order.follow || c.tick >= order.follow.until || fitting !== 'relay') return;
      const follower = companions.find(unit => unit.id === order.follower);
      const march = follower && destination(owner, follower, target, 0, c);
      if (march) return { target: mark, marches: [march], second: true };
      return;
    }
    if (companions.length < 2 || c.tick < (this.recovery.get(owner.id) ?? 0)) return;
    const spread = fitting === 'cross' ? cohortRules.crossAngle : cohortRules.frontAngle;
    for (const unit of companions) {
      const first = destination(owner, unit, target, spread, c);
      if (!first) continue;
      for (const other of companions) {
        if (other.id === unit.id) continue;
        if (fitting === 'relay') return { target: mark, marches: [first], follower: other.id, second: false };
        const second = destination(owner, other, target, -spread, c);
        if (second && distance(first.point, second.point) > unit.radius + other.radius + 4) {
          return { target: mark, marches: [first, second], second: false };
        }
      }
    }
  }

  status(owner: SummonerOwner, units: readonly SummonEntity[], mark: string, fitting: CohortFitting | undefined,
    gathering: boolean, c: SummonerContext, canPay: boolean) {
    const order = this.orders.get(owner.id);
    const now = c.tick;
    const relay = order?.follow && order.follow.until > now;
    return {
      members: units.filter(unit => eligible(owner, unit)).length,
      targeted: !!mark,
      canSend: (canPay || !!relay) && !!this.plan(owner, units, mark, fitting, gathering, c),
      stage: relay ? 'relay' as const : order && order.until > now ? 'march' as const : 'ready' as const,
      until: relay ? order.follow!.until : order?.until ?? 0,
      recoveryAt: this.recovery.get(owner.id) ?? 0,
      fitting,
    };
  }

  command(owner: SummonerOwner, units: readonly SummonEntity[], mark: string, fitting: CohortFitting | undefined,
    gathering: boolean, c: SummonerContext, canPay: boolean) {
    const plan = this.plan(owner, units, mark, fitting, gathering, c);
    if (!plan || (!plan.second && !canPay)) return;
    const until = c.tick + (plan.second ? cohortRules.relayDuration : cohortRules.duration);
    const moves = plan.marches.map(({ unit, point }) => {
      unit.target = '';
      unit.decisionAt = 0;
      return { arrived: false, cue: { ...point, kind: 'summoner-cohort', state: 'march', id: c.id(), owner: owner.id,
        unit: unit.id, radius: cohortRules.arrival, at: c.tick, until } } satisfies Assignment;
    });
    this.orders.set(owner.id, { target: plan.target, moves, until, follower: plan.follower });
    if (!plan.second) this.recovery.set(owner.id, c.tick + cohortRules.recovery);
    c.sound(plan.second ? 'summoner-cohort-relay' : 'summoner-cohort-drive', owner);
    return { spentFocus: !plan.second };
  }

  advance(c: SummonerContext, units: ReadonlyMap<number, SummonEntity>) {
    for (const [owner, order] of this.orders) {
      if (c.tick >= order.until || order.follow && c.tick >= order.follow.until ||
        (!order.follow && !c.target(order.target))) {
        this.cancel(owner);
        continue;
      }
      order.moves = order.moves.filter(move => units.has(move.cue.unit));
      if (order.follower && !units.has(order.follower)) order.follower = undefined;
      if (!order.moves.length && !(order.follower && (order.follow || order.waitingShot))) this.cancel(owner);
    }
    for (const [owner, at] of this.recovery) if (at <= c.tick) this.recovery.delete(owner);
  }

  assigned(unit: SummonEntity, c: SummonerContext) {
    const order = this.orders.get(unit.owner);
    const move = order?.moves.find(candidate => candidate.cue.unit === unit.id);
    const target = order && move ? c.target(order.target) : undefined;
    if (!move || !target || target.health <= 0) return;
    if (!move.arrived && distance(unit, move.cue) <= cohortRules.arrival && inLine(unit, move.cue, c, unit.radius)) {
      move.arrived = true;
    }
    return { destination: move.cue, target: move.arrived ? target : undefined };
  }

  release(unit: SummonEntity, damage: number, shot: number | void, c: SummonerContext, units: ReadonlyMap<number, SummonEntity>) {
    const order = this.orders.get(unit.owner);
    if (!order || !order.moves.some(move => move.cue.unit === unit.id)) return;
    order.moves = order.moves.filter(move => move.cue.unit !== unit.id);
    if (order.follower) {
      if (damage > 0) this.openRelay(unit.owner, order, c, units);
      else if (shot) order.waitingShot = shot;
    }
    if (!order.moves.length && !order.waitingShot && !order.follow) this.cancel(unit.owner);
  }

  projectileHit(owner: string, shot: number, target: string, c: SummonerContext, units: ReadonlyMap<number, SummonEntity>) {
    const order = this.orders.get(owner);
    if (!order || order.waitingShot !== shot || order.target !== target || c.tick >= order.until) return;
    this.openRelay(owner, order, c, units);
  }

  private openRelay(owner: string, order: Order, c: SummonerContext, units: ReadonlyMap<number, SummonEntity>) {
    const unit = order.follower && units.get(order.follower);
    const player = c.owners.find(p => p.id === owner);
    if (!unit || !player || !eligible(player, unit)) return;
    const until = c.tick + cohortRules.relayWindow;
    order.follow = { kind: 'summoner-cohort', state: 'relay', id: c.id(), owner, unit: unit.id, radius: 14,
      at: c.tick, until, x: unit.x, y: unit.y };
    order.until = until;
    order.waitingShot = undefined;
    c.sound('summoner-cohort-open', player);
  }

  cues(now: number, units: ReadonlyMap<number, SummonEntity>) {
    const cues: CohortCue[] = [];
    for (const order of this.orders.values()) {
      if (order.until <= now) continue;
      for (const move of order.moves) if (units.has(move.cue.unit)) cues.push(move.cue);
      const relay = order.follow;
      const follower = relay && units.get(relay.unit);
      if (relay && follower && relay.until > now) cues.push({ ...relay, x: follower.x, y: follower.y });
    }
    return cues;
  }
}

export type CohortStatus = ReturnType<CohortDrive['status']>;
