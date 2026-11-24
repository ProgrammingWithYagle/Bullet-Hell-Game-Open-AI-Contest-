import { distance, segmentCircle, segmentRect } from './geometry.ts';
import type { Vec } from './protocol.ts';
import type { SummonEntity, SummonerContext, SummonerOwner } from './summoner-kit.ts';

export const formationIds = {
  entry: 'summoner-set-the-line-1',
  walking: 'summoner-walking-rank-1',
  turn: 'summoner-quarter-turn-1',
} as const;

export type FormationFitting = 'walking' | 'turn';
export const formationFitting = (skills: readonly string[]): FormationFitting | undefined => {
  if (skills.includes(formationIds.walking)) return 'walking';
  if (skills.includes(formationIds.turn)) return 'turn';
};

export const formationRules = {
  focus: 2, lead: 76, halfWidth: 48, walkingHalfWidth: 35,
  range: 220, walkingRange: 155, drift: 7, arrival: 7,
  duration: 165, recovery: 257, marchSpeed: 1.24,
} as const;

type Pair<T> = [T, T];
type Block = 'busy' | 'gathering' | 'cohort' | 'returning';
type Stage = Block | 'company' | 'ground' | 'focus' | 'recovering' | 'setting' | 'set' | 'ready';
export type FormationStatus = {
  stage: Stage;
  fitting?: FormationFitting;
  canCommand: boolean;
  catches: number;
  recoveryAt: number;
  until: number;
};
export type FormationCue = Vec & {
  kind: 'summoner-formation';
  state: 'seeking' | 'holding';
  id: number;
  owner: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  aim: number;
  radius: number;
  at: number;
  until: number;
};

type Posts = { center: Vec; aim: number; points: Pair<Vec> };
type Company = { posts: Posts; members: Pair<number> };
type Formation = Company & {
  origin: Vec;
  id: number;
  at: number;
  until: number;
  fitting?: FormationFitting;
  spent: Set<number>;
  holding: boolean;
  turned: boolean;
};
export type FormationContact = { owner: string; id: number; unit: number; t: number };

const clear = (from: Vec, to: Vec, c: SummonerContext, padding = 0) =>
  !c.obstacles.some(wall => segmentRect(from, to, wall, padding) !== null);

function legal(point: Vec, radius: number, c: SummonerContext) {
  const bounds = c.bounds;
  return point.x >= bounds.x + radius && point.x <= bounds.x + bounds.width - radius &&
    point.y >= bounds.y + radius && point.y <= bounds.y + bounds.height - radius &&
    clear(point, point, c, radius) && c.lava.every(pit => distance(point, pit) > pit.radius + radius);
}

function centerAhead(owner: SummonerOwner, aim: number) {
  return { x: owner.x + Math.cos(aim) * formationRules.lead, y: owner.y + Math.sin(aim) * formationRules.lead };
}

function posts(owner: SummonerOwner, center: Vec, aim: number, fitting: FormationFitting | undefined,
  bodies: Pair<SummonEntity>, c: SummonerContext): Posts | undefined {
  const width = fitting === 'walking' ? formationRules.walkingHalfWidth : formationRules.halfWidth;
  const side = { x: -Math.sin(aim) * width, y: Math.cos(aim) * width };
  const points: Pair<Vec> = [{ x: center.x - side.x, y: center.y - side.y }, { x: center.x + side.x, y: center.y + side.y }];
  if (!clear(owner, center, c) || !clear(...points, c, 2) ||
    !points.every((point, i) => legal(point, bodies[i].radius, c)) ||
    c.lava.some(pit => segmentCircle(...points, pit, pit.radius + 2) !== null)) return;
  return { center, aim, points };
}

function eligible(unit: SummonEntity, owner: SummonerOwner) {
  return unit.owner === owner.id && !unit.temporary && unit.health > 0 && distance(unit, owner) <= formationRules.range;
}

function company(owner: SummonerOwner, units: readonly SummonEntity[], fitting: FormationFitting | undefined, c: SummonerContext) {
  const [first, second] = units.filter(unit => eligible(unit, owner)).sort((a, b) => a.slot - b.slot);
  if (!first || !second) return { stage: 'company' as const };
  const center = centerAhead(owner, owner.aim);
  const forward = posts(owner, center, owner.aim, fitting, [first, second], c);
  const reverse = posts(owner, center, owner.aim, fitting, [second, first], c);
  if (reverse && (!forward || distance(second, reverse.points[0]) + distance(first, reverse.points[1]) <
    distance(first, forward.points[0]) + distance(second, forward.points[1]))) {
    return { stage: 'ready' as const, plan: { posts: reverse, members: [second.id, first.id] } satisfies Company };
  }
  if (forward) return { stage: 'ready' as const, plan: { posts: forward, members: [first.id, second.id] } satisfies Company };
  return { stage: 'ground' as const };
}

const seated = (unit: SummonEntity, point: Vec) => distance(unit, point) <= formationRules.arrival &&
  Math.hypot(unit.x - unit.oldX, unit.y - unit.oldY) < 0.2;

export class FormationKeeper {
  private readonly lines = new Map<string, Formation>();
  private readonly recoveries = new Map<string, number>();

  engaged(owner: string) {
    return this.lines.has(owner);
  }

  cancel(owner: string) {
    this.lines.delete(owner);
  }

  lose(unit: SummonEntity) {
    if (this.lines.get(unit.owner)?.members.includes(unit.id)) this.cancel(unit.owner);
  }

  clear() {
    this.lines.clear();
    this.recoveries.clear();
  }

  status(owner: SummonerOwner, units: ReadonlyMap<number, SummonEntity>, fitting: FormationFitting | undefined,
    block: Block | undefined, canPay: boolean, c: SummonerContext): FormationStatus {
    const line = this.lines.get(owner.id);
    const recoveryAt = this.recoveries.get(owner.id) ?? 0;
    const result = { fitting, recoveryAt, catches: 0, until: 0, canCommand: false };
    if (line && c.tick < line.until) return { ...result, stage: line.holding ? 'set' : 'setting',
      catches: line.spent.size, until: line.until, canCommand: !block && !!this.pivot(owner, line, units, c) };
    if (block) return { ...result, stage: block };
    if (c.tick < recoveryAt) return { ...result, stage: 'recovering' };
    const { stage } = company(owner, [...units.values()], fitting, c);
    if (stage === 'ready' && !canPay) return { ...result, stage: 'focus' };
    return { ...result, stage, canCommand: stage === 'ready' };
  }

  command(owner: SummonerOwner, units: ReadonlyMap<number, SummonEntity>, fitting: FormationFitting | undefined,
    block: Block | undefined, canPay: boolean, c: SummonerContext) {
    if (block) return;
    const line = this.lines.get(owner.id);
    if (line) {
      const next = this.pivot(owner, line, units, c);
      if (!next) return;
      line.posts = next;
      line.holding = false;
      line.turned = true;
      c.sound('summoner-formation-turn', owner);
      return { spentFocus: false };
    }
    if (!canPay || c.tick < (this.recoveries.get(owner.id) ?? 0)) return;
    const { plan } = company(owner, [...units.values()], fitting, c);
    if (!plan) return;
    this.lines.set(owner.id, { ...plan, fitting, origin: { x: owner.x, y: owner.y }, id: c.id(), at: c.tick,
      until: c.tick + formationRules.duration, spent: new Set(), holding: false, turned: false });
    this.recoveries.set(owner.id, c.tick + formationRules.recovery);
    c.sound('summoner-formation-order', owner);
    return { spentFocus: true };
  }

  private pivot(owner: SummonerOwner, line: Formation, units: ReadonlyMap<number, SummonEntity>, c: SummonerContext) {
    if (line.fitting !== 'turn' || line.turned || !line.holding || c.tick >= line.until ||
      distance(owner, line.posts.center) > formationRules.range) return;
    const [a, b] = line.members.map(id => units.get(id));
    if (!a || !b) return;
    const side = Math.sin(owner.aim - line.posts.aim) < 0 ? -1 : 1;
    return posts(owner, line.posts.center, line.posts.aim + side * Math.PI / 2, line.fitting, [a, b], c);
  }

  advance(c: SummonerContext, owners: ReadonlyMap<string, SummonerOwner>, units: ReadonlyMap<number, SummonEntity>) {
    for (const [id, line] of this.lines) {
      const owner = owners.get(id);
      const [a, b] = line.members.map(member => units.get(member));
      if (!owner || !a || !b || c.tick >= line.until || distance(owner, line.posts.center) > formationRules.range ||
        line.fitting === 'walking' && distance(owner, line.origin) > formationRules.walkingRange) {
        this.cancel(id);
        continue;
      }
      const center = line.fitting === 'walking' ? centerAhead(owner, line.posts.aim) : line.posts.center;
      if (distance(center, line.posts.center) > formationRules.drift) {
        const next = posts(owner, center, line.posts.aim, line.fitting, [a, b], c);
        if (!next) { this.cancel(id); continue; }
        line.posts = next;
        line.holding = false;
      }
    }
    for (const [id, at] of this.recoveries) if (at <= c.tick) this.recoveries.delete(id);
  }

  settle(c: SummonerContext, owners: ReadonlyMap<string, SummonerOwner>, units: ReadonlyMap<number, SummonEntity>) {
    for (const [id, line] of this.lines) {
      const owner = owners.get(id);
      const [a, b] = line.members.map(member => units.get(member));
      if (!owner || !a || !b) { this.cancel(id); continue; }
      const [left, right] = line.posts.points;
      if (!legal(left, a.radius, c) || !legal(right, b.radius, c) || !clear(left, right, c, 2)) {
        this.cancel(id);
        continue;
      }
      const holding = seated(a, left) && seated(b, right) && clear(a, b, c, 2) &&
        c.lava.every(pit => segmentCircle(a, b, pit, pit.radius + 2) === null);
      if (!line.holding && holding) c.sound('summoner-formation-set', owner);
      if (holding) a.aim = b.aim = line.posts.aim;
      line.holding = holding;
    }
  }

  assigned(unit: SummonEntity) {
    const line = this.lines.get(unit.owner);
    const spot = line?.members.indexOf(unit.id) ?? -1;
    if (line && spot >= 0) return line.posts.points[spot];
  }

  contact(from: Vec, to: Vec, limit: number, now: number, units: ReadonlyMap<number, SummonEntity>) {
    let best: FormationContact | undefined;
    for (const [owner, line] of this.lines) {
      if (!line.holding || now >= line.until) continue;
      const [a, b] = line.members.map(id => units.get(id));
      if (!a || !b || a.health <= 0 || b.health <= 0) continue;
      const sx = b.x - a.x, sy = b.y - a.y, lengthSquared = sx * sx + sy * sy;
      if (lengthSquared < 1) continue;
      const near = (from.x - a.x) * sy - (from.y - a.y) * sx;
      const far = (to.x - a.x) * sy - (to.y - a.y) * sx;
      if (near < 0 || far > 0 || near === far) continue;
      const t = near / (near - far);
      if (t >= limit || best && (t > best.t || t === best.t && line.id >= best.id)) continue;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const span = ((x - a.x) * sx + (y - a.y) * sy) / lengthSquared;
      if (span < 0 || span > 1) continue;
      const lead = span <= 0.5 ? a : b;
      const other = lead === a ? b : a;
      const unit = line.spent.has(lead.id) ? other : lead;
      if (!line.spent.has(unit.id)) best = { t, owner, id: line.id, unit: unit.id };
    }
    return best;
  }

  claim(contact: FormationContact) {
    const line = this.lines.get(contact.owner);
    if (!line || line.id !== contact.id || !line.holding || !line.members.includes(contact.unit) || line.spent.has(contact.unit)) return false;
    line.spent.add(contact.unit);
    if (line.spent.size === 2) this.cancel(contact.owner);
    return true;
  }

  cues(now: number, units: ReadonlyMap<number, SummonEntity>): FormationCue[] {
    const result: FormationCue[] = [];
    for (const [owner, line] of this.lines) {
      if (now >= line.until) continue;
      const [a, b] = line.holding ? line.members.map(id => units.get(id)) : line.posts.points;
      if (!a || !b) continue;
      result.push({ ...line.posts.center, id: line.id, owner, kind: 'summoner-formation', state: line.holding ? 'holding' : 'seeking',
        ax: a.x, ay: a.y, bx: b.x, by: b.y, aim: line.posts.aim, at: line.at, until: line.until, radius: formationRules.arrival });
    }
    return result;
  }
}
