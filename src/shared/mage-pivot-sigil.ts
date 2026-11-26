import { distance, segmentRect, type Rect } from './geometry.ts';
import type { Player } from './game.ts';
import type { InputFrame, Vec } from './protocol.ts';

export const pivotSigilId = 'mage-pivot-sigil-1';
export const mageBindingIds = {
  entry: pivotSigilId,
  fixed: 'mage-binding-fixed-angle-1',
  reverse: 'mage-binding-reverse-face-1',
} as const;
export const pivotSigilRules = {
  markReach: 102,
  markRadius: 16,
  maintainReach: 158,
  planTicks: 66,
  retryTicks: 30,
  strokeTicks: 21,
  reach: 148,
  halfWidth: 9,
  shortestStroke: 38,
  turnRate: .14,
  maximumTurn: Math.PI * .67,
  damage: 32,
  ordinarySlow: .53,
  slowTicks: 40,
  fixedTurn: .40,
  reverseTurn: .63,
  reverseHeadingTolerance: Math.PI / 8,
} as const;

export type PivotStatus = {
  phase: 'idle' | 'marked' | 'sweeping' | 'fixed';
  ready: boolean;
  until?: number;
  steeringLeft?: number;
  canFix?: boolean;
  reverseArmed?: boolean;
  canReverse?: boolean;
};
export type PivotCue = {
  kind: 'mage-pivot-mark' | 'mage-pivot-stroke';
  id: number;
  owner: string;
  x: number;
  y: number;
  toX: number;
  toY: number;
  radius: number;
  at: number;
  until: number;
  fixed?: true;
  reversed?: true;
};
type Mark = Vec & { id: number; at: number; until: number };
type Stroke = Mark & { angle: number; turned: number; end: Vec; touched: Set<string>; fixed?: true; reversed?: true };

export type PivotWorld = {
  tick: number;
  players: ReadonlyMap<string, Player>;
  bounds: Rect;
  obstacles: readonly Rect[];
  lava: readonly (Vec & { radius: number })[];
  nextId: () => number;
  recovery: (owner: Player) => number;
  stroke: (owner: Player, from: Vec, to: Vec, touched: Set<string>) => number;
  note: (owner: Player, event: 'mark' | 'stroke' | 'contact' | 'fixed' | 'reverse', at: Vec) => void;
};

const owns = (owner: Player | undefined): owner is Player => !!owner && owner.connected &&
  !owner.expired && owner.status === 'active' && owner.health > 0 && owner.classId === 'mage' && owner.skills.includes(pivotSigilId);
const still = (i: InputFrame) => Math.hypot(i.moveX,i.moveY) < 1e-6;
const handsClear = (i: InputFrame) => !i.fire && !i.reload && !i.q && !i.e && !i.ultimate &&
  !i.dodge && !i.sprint && !i.technique2 && !i.technique3 && !i.interact && i.supply < 0;
const readyHands = (p: Player, now: number) => Math.max(p.reloadAt,p.dashUntil,p.channelUntil) <= now;
const pointAt = (p: Vec, angle: number, reach: number): Vec => ({ x:p.x + Math.cos(angle)*reach, y:p.y + Math.sin(angle)*reach });

function floorFits(p: Vec, world: PivotWorld) {
  const { x,y,width,height } = world.bounds, pad = pivotSigilRules.markRadius;
  return p.x >= x+pad && p.x <= x+width-pad && p.y >= y+pad && p.y <= y+height-pad &&
    world.obstacles.every(wall => segmentRect(p,p,wall,pad) === null) &&
    world.lava.every(lava => distance(p,lava) > lava.radius + pad);
}
function linkClear(owner: Player, mark: Mark, world: PivotWorld) {
  return floorFits(mark, world) && distance(owner,mark) <= pivotSigilRules.maintainReach &&
    world.obstacles.every(wall => segmentRect(owner,mark,wall,1) === null);
}
function candidateMark(owner: Player, world: PivotWorld) {
  const point = pointAt(owner, owner.aim, pivotSigilRules.markReach);
  return floorFits(point,world) && world.obstacles.every(wall => segmentRect(owner,point,wall,2) === null) ? point : undefined;
}
function strokeEnd(mark: Vec, angle: number, world: PivotWorld) {
  const config = pivotSigilRules, pad = config.halfWidth;
  const origin = pointAt(mark,angle,config.reach);
  const bounds = world.bounds;
  const from = { x:mark.x,y:mark.y }, dx = origin.x - from.x, dy = origin.y - from.y;
  const horizontal = dx > 0 ? (bounds.x+bounds.width-pad-from.x)/dx : dx < 0 ? (bounds.x+pad-from.x)/dx : 1;
  const vertical = dy > 0 ? (bounds.y+bounds.height-pad-from.y)/dy : dy < 0 ? (bounds.y+pad-from.y)/dy : 1;
  let limit = Math.min(1,horizontal,vertical);
  for (const wall of world.obstacles) limit = Math.min(limit,segmentRect(mark,origin,wall,pad)?.t ?? 1);
  const span = Math.max(0,limit*config.reach-.05);
  return { point:pointAt(mark,angle,span), span };
}
function angleDelta(wanted: number, current: number) {
  return Math.atan2(Math.sin(wanted-current),Math.cos(wanted-current));
}
function fittingReady(owner: Player, stroke: Stroke, world: PivotWorld) {
  return world.tick < stroke.until && linkClear(owner,stroke,world) &&
    still(owner.input) && handsClear(owner.input) && readyHands(owner,world.tick);
}
function canFix(owner: Player, stroke: Stroke) {
  return owner.skills.includes(mageBindingIds.fixed) && stroke.turned >= pivotSigilRules.fixedTurn;
}
function reverseArmed(owner: Player, stroke: Stroke) {
  return owner.skills.includes(mageBindingIds.reverse) && !stroke.reversed && stroke.turned >= pivotSigilRules.reverseTurn;
}
function canReverse(owner: Player, stroke: Stroke, world: PivotWorld) {
  const rules = pivotSigilRules, opposite = stroke.angle + Math.PI;
  return reverseArmed(owner,stroke) &&
    Math.abs(angleDelta(owner.aim,opposite)) <= rules.reverseHeadingTolerance &&
    strokeEnd(stroke,opposite,world).span >= rules.shortestStroke;
}

export class PivotSigil {
  private readonly marks = new Map<string,Mark>();
  private readonly strokes = new Map<string,Stroke>();
  private readonly rearm = new Map<string,number>();

  get active() { return this.marks.size > 0 || this.strokes.size > 0; }
  clear() { this.marks.clear(); this.strokes.clear(); this.rearm.clear(); }
  drop(owner: string) { this.marks.delete(owner); this.strokes.delete(owner); }

  private reserveAt(owner: Player) {
    return Math.max(owner.qAt,this.rearm.get(owner.id) ?? 0);
  }
  status(owner: Player, world: PivotWorld, inCombat: boolean): PivotStatus {
    if (!inCombat || !owns(owner)) return { phase:'idle',ready:false };
    const stroke = this.strokes.get(owner.id);
    if (stroke) {
      if (stroke.fixed) return { phase:'fixed',ready:false,until:stroke.until };
      const fix = canFix(owner,stroke), reverse = canReverse(owner,stroke,world);
      return { phase:'sweeping',ready:(fix || reverse) && fittingReady(owner,stroke,world),until:stroke.until,
        steeringLeft:Math.max(0,pivotSigilRules.maximumTurn-stroke.turned),canFix:fix,
        reverseArmed:reverseArmed(owner,stroke),canReverse:reverse };
    }
    const mark = this.marks.get(owner.id), until = this.reserveAt(owner);
    const planted = still(owner.input) && handsClear(owner.input) && readyHands(owner,world.tick);
    if (mark) return { phase:'marked',until:mark.until,ready:planted && owner.qAt <= world.tick &&
      linkClear(owner,mark,world) && strokeEnd(mark,owner.aim,world).span >= pivotSigilRules.shortestStroke };
    return { phase:'idle',until,ready:planted && until <= world.tick && !!candidateMark(owner,world) };
  }
  command(owner: Player, input: InputFrame, world: PivotWorld) {
    const now = world.tick;
    if (!owns(owner)) return;
    const stroke = this.strokes.get(owner.id);
    if (stroke) {
      if (stroke.fixed) return;
      if (!handsClear(input)) {
        this.strokes.delete(owner.id);
        return;
      }
      if (!input.technique1 || !fittingReady(owner,stroke,world) || owner.x !== owner.oldX || owner.y !== owner.oldY) return;
      if (canFix(owner,stroke)) {
        stroke.fixed = true;
        world.note(owner,'fixed',stroke);
      } else if (canReverse(owner,stroke,world)) {
        stroke.angle += Math.PI;
        stroke.reversed = true;
        world.note(owner,'reverse',stroke);
      }
      return;
    }
    if (!input.technique1 || !handsClear(input) || !still(input) || !readyHands(owner,now) ||
        owner.x !== owner.oldX || owner.y !== owner.oldY || owner.qAt > now) return;
    const mark = this.marks.get(owner.id);
    if (!mark) {
      if (this.reserveAt(owner) > now) return;
      const point = candidateMark(owner,world);
      if (!point) return;
      const until = now+pivotSigilRules.planTicks;
      this.marks.set(owner.id,{ ...point,id:world.nextId(),at:now,until });
      this.rearm.set(owner.id,until+pivotSigilRules.retryTicks);
      world.note(owner,'mark',point);
      return;
    }
    if (now >= mark.until || !linkClear(owner,mark,world)) return;
    const finished = strokeEnd(mark,owner.aim,world);
    if (finished.span < pivotSigilRules.shortestStroke) return;
    this.marks.delete(owner.id);
    owner.qAt = now + world.recovery(owner);
    this.strokes.set(owner.id,{ ...mark,at:now,until:now+pivotSigilRules.strokeTicks,angle:owner.aim,
      turned:0,end:finished.point,touched:new Set() });
    world.note(owner,'stroke',mark);
  }
  advance(world: PivotWorld) {
    const now = world.tick, rules = pivotSigilRules;
    for (const [id,mark] of this.marks) {
      const owner = world.players.get(id);
      if (!owns(owner) || now >= mark.until || owner.qAt > now || !linkClear(owner,mark,world)) this.marks.delete(id);
    }
    for (const [id,stroke] of this.strokes) {
      const owner = world.players.get(id);
      if (!owns(owner) || now >= stroke.until || !(stroke.fixed ? floorFits(stroke,world) : linkClear(owner,stroke,world))) {
        this.strokes.delete(id);
        continue;
      }
      const room = stroke.fixed ? 0 : Math.min(rules.turnRate,rules.maximumTurn-stroke.turned);
      const delta = Math.max(-room,Math.min(room,angleDelta(owner.aim,stroke.angle)));
      const start = stroke.angle;
      let contact: Vec | undefined;
      for (const fraction of delta === 0 ? [1] : [.5,1]) {
        const ray = strokeEnd(stroke,start+delta*fraction,world);
        if (ray.span >= rules.halfWidth && world.stroke(owner,stroke,ray.point,stroke.touched) > 0) contact = ray.point;
        stroke.end = ray.point;
      }
      if (contact) world.note(owner,'contact',contact);
      stroke.angle += delta;
      stroke.turned = Math.min(rules.maximumTurn,stroke.turned+Math.abs(delta));
    }
  }
  cues(): PivotCue[] {
    const cues: PivotCue[] = [];
    for (const [owner,mark] of this.marks) cues.push({ kind:'mage-pivot-mark',owner,id:mark.id,x:mark.x,y:mark.y,
      toX:mark.x,toY:mark.y,radius:pivotSigilRules.markRadius,at:mark.at,until:mark.until });
    for (const [owner,stroke] of this.strokes) cues.push({ kind:'mage-pivot-stroke',owner,id:stroke.id,x:stroke.x,y:stroke.y,
      toX:stroke.end.x,toY:stroke.end.y,radius:pivotSigilRules.halfWidth,at:stroke.at,until:stroke.until,
      ...(stroke.fixed ? { fixed:true } : {}), ...(stroke.reversed ? { reversed:true } : {}) });
    return cues;
  }
}
