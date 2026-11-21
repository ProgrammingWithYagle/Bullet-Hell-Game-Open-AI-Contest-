import { distance, segmentCircle, segmentRect, type Rect } from './geometry.ts';
import type { Player } from './game.ts';
import type { InputFrame, Vec } from './protocol.ts';

export const waymarkReturnId = 'mage-waymark-return-1';
export const mageSpatialIds = {
  entry: waymarkReturnId,
  hold: 'mage-spatial-hold-trace-1',
  side: 'mage-spatial-side-landing-1',
} as const;
export const waymarkRules = {
  markRadius: 16,
  planTicks: 108,
  retryTicks: 26,
  minimumWalk: 94,
  minimumDisplacement: 60,
  maximumWalk: 218,
  returnTicks: 27,
  returnStride: 16,
  fittingTravel: 46,
  holdTicks: 8,
  sideMinimum: 39,
  sideMaximum: 52,
} as const;

export type WaymarkStatus = {
  phase: 'idle' | 'marked' | 'returning' | 'resting';
  ready: boolean;
  until?: number;
  walked?: number;
  traveled?: number;
  canHold?: boolean;
  sideWindow?: boolean;
  canSide?: boolean;
};
export type WaymarkCue = Vec & {
  kind: 'mage-waymark';
  id: number;
  owner: string;
  at: number;
  until: number;
  returning: boolean;
  radius: number;
  resting?: true;
  exit?: Vec;
};
export type WaymarkWorld = {
  tick: number;
  bounds: Rect;
  obstacles: readonly Rect[];
  lava: readonly (Vec & { radius: number })[];
  radius: number;
  nextId: () => number;
  recovery: (owner: Player) => number;
  note: (owner: Player, event: 'mark' | 'return' | 'arrive' | 'break' | 'hold' | 'resume' | 'side', at: Vec) => void;
};
type Trail = {
  id: number;
  anchor: Vec;
  at: number;
  until: number;
  points: Vec[];
  walked: number;
  traveled: number;
  returning: boolean;
  held?: true;
  restUntil?: number;
  exit?: Vec;
};
type Motion = { ordinary: Vec; voluntary: boolean; forced: boolean; strideScale: number };

const epsilon = .0001;
const point = ({ x,y }: Vec) => ({ x,y });
const owns = (p: Player) => p.connected && !p.expired && p.status==='active' && p.health>0 && p.classId==='mage' &&
  p.skills.includes(waymarkReturnId);
const planted = (i: InputFrame) => Math.hypot(i.moveX,i.moveY) <= epsilon;
const freeHands = (i: InputFrame) => !i.fire && !i.reload && !i.q && !i.e && !i.ultimate && !i.dodge &&
  !i.sprint && !i.technique1 && !i.technique3 && !i.interact && i.supply < 0;
const readyHands = (p: Player, tick: number) => p.reloadAt<=tick && p.dashUntil<=tick && p.channelUntil<=tick;

function clearLeg(from: Vec, to: Vec, world: WaymarkWorld) {
  const { x,y,width,height } = world.bounds, r = world.radius;
  const inside = (p: Vec) => p.x>=x+r && p.y>=y+r && p.x<=x+width-r && p.y<=y+height-r;
  return inside(from) && inside(to) && world.obstacles.every(wall=>segmentRect(from,to,wall,r)===null) &&
    world.lava.every(pit=>segmentCircle(from,to,pit,pit.radius+r)===null);
}
function mature(trail: Trail) {
  return trail.walked >= waymarkRules.minimumWalk && distance(trail.anchor,trail.points[trail.points.length-1]) >= waymarkRules.minimumDisplacement;
}
function traceClear(trail: Trail, world: WaymarkWorld) {
  return trail.points.every((at,index)=>index===0 || clearLeg(trail.points[index-1],at,world));
}

function canHold(owner: Player, trail: Trail, tick: number) {
  return owner.skills.includes(mageSpatialIds.hold) && !trail.held && trail.traveled>=waymarkRules.fittingTravel && tick+5<trail.until;
}
function sideLength(owner: Player, trail: Trail, tick: number) {
  if (!owner.skills.includes(mageSpatialIds.side) || trail.exit || trail.traveled<waymarkRules.fittingTravel || tick+4>=trail.until) return 0;
  const remaining=trail.points.reduce((sum,at,index)=>index===0 ? sum : sum+distance(at,trail.points[index-1]),0);
  return remaining>=waymarkRules.sideMinimum && remaining<=86 ? Math.min(waymarkRules.sideMaximum,remaining) : 0;
}
function sideDestination(owner: Player, trail: Trail, length: number, world: WaymarkWorld) {
  if (!length) return undefined;
  const next=trail.points[trail.points.length-2];
  const delta=owner.aim-Math.atan2(next.y-owner.y,next.x-owner.x);
  const direction=Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)));
  if (direction<Math.PI/3 || direction>Math.PI*2/3) return undefined;
  const candidate={ x:owner.x+Math.cos(owner.aim)*length,y:owner.y+Math.sin(owner.aim)*length };
  return clearLeg(owner,candidate,world) ? candidate : undefined;
}

function nextLeg(points: Vec[], stride: number, world: WaymarkWorld) {
  const from = points[points.length-1];
  let previous=from, remaining=stride;
  let chosen: { to: Vec; keep: number; inBetween: boolean } | undefined;
  for(let index=points.length-2;index>=0 && remaining>epsilon;index--){
    const target=points[index], gap=distance(previous,target);
    const inBetween=gap>remaining;
    const ratio=inBetween ? remaining/gap : 1;
    const to={ x:previous.x+(target.x-previous.x)*ratio,y:previous.y+(target.y-previous.y)*ratio };
    if(!clearLeg(previous,to,world) || !clearLeg(from,to,world)) break;
    chosen={ to, keep:index+1, inBetween };
    if(inBetween) break;
    previous=target;
    remaining-=gap;
  }
  return chosen;
}

export class WaymarkReturn {
  private readonly trails=new Map<string,Trail>();
  private readonly retryAt=new Map<string,number>();

  has(owner: string) { return this.trails.has(owner); }
  drop(owner: string) { this.trails.delete(owner); this.retryAt.delete(owner); }
  clear() { this.trails.clear(); this.retryAt.clear(); }

  private available(owner: Player) { return Math.max(owner.eAt,this.retryAt.get(owner.id)??0); }

  status(owner: Player, world: WaymarkWorld, inCombat: boolean): WaymarkStatus {
    if (!inCombat || !owns(owner)) return { phase:'idle',ready:false };
    const trail=this.trails.get(owner.id), time=world.tick;
    const at=this.available(owner);
    const prepared=planted(owner.input) && freeHands(owner.input) && readyHands(owner,time);
    if (trail?.returning) {
      if (trail.restUntil) return { phase:'resting',ready:prepared && time<trail.restUntil,until:trail.restUntil,traveled:trail.traveled };
      const hold=canHold(owner,trail,time), length=sideLength(owner,trail,time), side=!!sideDestination(owner,trail,length,world);
      return { phase:'returning',ready:prepared && (hold || side),until:trail.until,traveled:trail.traveled,
        canHold:hold,sideWindow:length>0,canSide:side };
    }
    if (trail) return { phase:'marked',ready:prepared && owner.eAt<=time && time<trail.until && mature(trail),
      until:trail.until,walked:trail.walked };
    return { phase:'idle',ready:prepared && at<=time && clearLeg(owner,owner,world),until:at };
  }

  private stop(owner: Player, trail: Trail, world: WaymarkWorld, event: 'arrive'|'break', at: Vec) {
    this.trails.delete(owner.id);
    if (!trail.returning) this.retryAt.set(owner.id,world.tick+waymarkRules.retryTicks);
    world.note(owner,event,at);
  }

  private advance(owner: Player, trail: Trail, world: WaymarkWorld, strideScale: number) {
    const step=nextLeg(trail.points,waymarkRules.returnStride*strideScale,world);
    if (!step || distance(owner,step.to)<=epsilon) {
      this.stop(owner,trail,world,'break',owner);
      return undefined;
    }
    trail.traveled+=distance(owner,step.to);
    trail.points.length=step.keep;
    if (step.inBetween) trail.points.push(step.to);
    if (trail.points.length===1) this.stop(owner,trail,world,'arrive',step.to);
    return step.to;
  }

  move(owner: Player, input: InputFrame, motion: Motion, world: WaymarkWorld): Vec | undefined {
    if (!owns(owner)) { this.drop(owner.id); return; }
    const trail=this.trails.get(owner.id), tick=world.tick;
    const committed=planted(input) && freeHands(input) && readyHands(owner,tick) && !motion.forced;
    if (trail) {
      if (tick>=trail.until || distance(owner,trail.points[trail.points.length-1])>epsilon || motion.forced ||
          input.e || input.dodge || input.sprint || !trail.returning && owner.eAt>tick) {
        this.stop(owner,trail,world,'break',owner);
        return;
      }
      if (trail.returning) {
        if (trail.restUntil) {
          if (tick>=trail.restUntil || !planted(input)) this.stop(owner,trail,world,'break',owner);
          else if (input.technique2 && committed) {
            trail.restUntil=undefined;
            world.note(owner,'resume',owner);
            return this.advance(owner,trail,world,motion.strideScale);
          }
          return;
        }
        if (!committed) { this.stop(owner,trail,world,'break',owner); return; }
        if (input.technique2 && canHold(owner,trail,tick)) {
          trail.held=true;
          trail.restUntil=Math.min(trail.until,tick+waymarkRules.holdTicks);
          world.note(owner,'hold',owner);
          return;
        }
        const exit=input.technique2 ? sideDestination(owner,trail,sideLength(owner,trail,tick),world) : undefined;
        if (exit) {
          trail.exit=exit;
          trail.points=[exit,point(owner)];
          world.note(owner,'side',exit);
        }
        return this.advance(owner,trail,world,motion.strideScale);
      }
      if (input.technique2 && committed && mature(trail) && traceClear(trail,world)) {
        owner.eAt=tick+world.recovery(owner);
        trail.returning=true;
        trail.at=tick;
        trail.until=tick+waymarkRules.returnTicks;
        world.note(owner,'return',owner);
        return this.advance(owner,trail,world,motion.strideScale);
      }
      const walked=distance(owner,motion.ordinary);
      if (!motion.voluntary || walked<=epsilon) return;
      if (trail.walked+walked>waymarkRules.maximumWalk || !clearLeg(owner,motion.ordinary,world)) {
        this.stop(owner,trail,world,'break',owner);
        return;
      }
      trail.walked+=walked;
      trail.points.push(point(motion.ordinary));
      return;
    }
    if (input.technique2 && committed && this.available(owner)<=tick && clearLeg(owner,owner,world)) {
      const anchor=point(owner);
      this.trails.set(owner.id,{ id:world.nextId(),anchor,at:tick,until:tick+waymarkRules.planTicks,
        points:[anchor],walked:0,traveled:0,returning:false });
      world.note(owner,'mark',anchor);
    }
  }

  cues(): WaymarkCue[] {
    return [...this.trails].map(([owner,trail])=>({ kind:'mage-waymark',owner,id:trail.id,x:trail.anchor.x,y:trail.anchor.y,
      at:trail.at,until:trail.until,returning:trail.returning,radius:waymarkRules.markRadius,
      ...(trail.restUntil ? { resting:true } : {}),...(trail.exit ? { exit:point(trail.exit) } : {}) }));
  }
}
