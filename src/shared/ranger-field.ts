import type { Vec } from './protocol.ts';
import type { RangerOwner } from './ranger-kit.ts';
import tripline from './ranger-rules.json';

export const rangerFieldIds = {
  entry:'ranger-re-stake-1',
  pivot:'ranger-pivot-stake-1',
  short:'ranger-short-lash-1',
} as const;
export type FieldFitting = 'pivot' | 'short';
export function rangerFieldFitting(skills: readonly string[]): FieldFitting | undefined {
  if (skills.includes(rangerFieldIds.pivot)) return 'pivot';
  if (skills.includes(rangerFieldIds.short)) return 'short';
}

export const fieldRules = {
  liftRadius:58,
  carryTicks:100,
  recoveryTicks:294,
  shortArm:11,
  shortReach:95,
  movement:0.76,
} as const;
export type RangerCable = Vec & {
  id: number;
  owner: string;
  x2: number;
  y2: number;
  placedAt: number;
  at: number;
  until: number;
  remaining: number;
  damage: number;
  touched: Set<string>;
};
export type RangerFieldStatus = {
  stage:'busy' | 'recovering' | 'find' | 'empty' | 'ready' | 'carrying' | 'place';
  fitting?: FieldFitting;
  recoveryAt:number;
  until:number;
  anchor?:Vec;
  placement?:{start:Vec;end:Vec};
};
type Handler = RangerOwner & { sprinting?:boolean };
type Placement = { start:Vec; end:Vec };
export type FieldContext = {
  tick:number;
  combat:boolean;
  paused:boolean;
  owners:readonly Handler[];
  normalPlacement(owner:Handler, reach:number):Placement | undefined;
  validSegment(from:Vec, to:Vec):boolean;
  sound(id:string,owner:Handler):void;
};
type Lift = {
  cable:RangerCable;
  anchor:Vec;
  fitting?:FieldFitting;
  until:number;
};

const distance = (a:Vec,b:Vec) => Math.hypot(b.x-a.x,b.y-a.y);
const live = (owner:Handler | undefined): owner is Handler =>
  !!owner && owner.classId==='ranger' && owner.connected && owner.status==='active';
const handlingAllowed = (owner:Handler,c:FieldContext) =>
  c.combat && !c.paused && live(owner) && owner.dashUntil<=c.tick && !owner.sprinting;
const armTicks = (fitting:FieldFitting | undefined) => fitting==='short' ? fieldRules.shortArm : tripline.trapArmingTicks;

export class RangerFieldController {
  private readonly lifts = new Map<string,Lift>();
  private readonly recovery = new Map<string,number>();

  constructor(private readonly cables: Map<number,RangerCable>) {}

  carries(owner:string) { return this.lifts.has(owner); }
  lifted(cable:RangerCable) { return this.lifts.get(cable.owner)?.cable===cable; }
  get hasWork() { return this.lifts.size>0 || this.recovery.size>0; }

  clear() {
    this.lifts.clear();
    this.recovery.clear();
  }
  drop(id:string) {
    const lift=this.lifts.get(id);
    if (lift && this.cables.get(lift.cable.id)===lift.cable) this.cables.delete(lift.cable.id);
    this.lifts.delete(id);
  }

  private nearest(owner:Handler,c:FieldContext,fitting?:FieldFitting) {
    let candidate: {cable:RangerCable;anchor:Vec;range:number} | undefined;
    for (const cable of this.cables.values()) {
      if (cable.owner!==owner.id || cable.remaining<1 || c.tick+armTicks(fitting)>=cable.until) continue;
      const ends=[{x:cable.x,y:cable.y},{x:cable.x2,y:cable.y2}];
      for (const anchor of ends) {
        const range=distance(owner,anchor);
        if (range>fieldRules.liftRadius || candidate && (range>candidate.range || range===candidate.range && cable.id>=candidate.cable.id) ||
          !c.validSegment(owner,anchor)) continue;
        candidate={cable,anchor,range};
      }
    }
    return candidate;
  }

  private position(owner:Handler,c:FieldContext,lift:Lift) {
    const armAt=c.tick+armTicks(lift.fitting);
    if (c.tick>=lift.until || armAt>=lift.cable.until || this.cables.get(lift.cable.id)!==lift.cable || lift.cable.remaining<1) return;
    const reach=lift.fitting==='short'?fieldRules.shortReach:tripline.trapReach;
    const placement=lift.fitting==='pivot' ? {start:lift.anchor,end:{x:owner.x,y:owner.y}} : c.normalPlacement(owner,reach);
    if (!placement) return;
    const span=distance(placement.start,placement.end);
    if (span<tripline.trapMinimumLength || span>reach || !c.validSegment(placement.start,placement.end)) return;
    return {placement,armAt};
  }

  status(owner:Handler,c:FieldContext,fitting:FieldFitting | undefined,canLift:boolean,arrows:boolean):RangerFieldStatus {
    const recoveryAt=this.recovery.get(owner.id)??0;
    const base={fitting,recoveryAt,until:0};
    if (!handlingAllowed(owner,c)) return {...base,stage:'busy'};
    const lift=this.lifts.get(owner.id);
    if (lift && c.tick<lift.until) {
      const destination=this.position(owner,c,lift);
      return {...base,stage:destination?'place':'carrying',until:lift.until,placement:destination?.placement,
        anchor:lift.fitting==='pivot'?{...lift.anchor}:undefined};
    }
    if (c.tick<recoveryAt) return {...base,stage:'recovering'};
    if (!canLift) return {...base,stage:'busy'};
    const nearest=this.nearest(owner,c,fitting);
    if (!nearest) return {...base,stage:'find'};
    return {...base,stage:arrows?'ready':'empty',anchor:{...nearest.anchor}};
  }

  command(owner:Handler,c:FieldContext,fitting:FieldFitting | undefined,canLift:boolean,reserveArrow:()=>boolean) {
    if (!handlingAllowed(owner,c)) return;
    const lift=this.lifts.get(owner.id);
    if (lift) {
      const destination=this.position(owner,c,lift);
      if (!destination) return;
      const {start,end}=destination.placement;
      Object.assign(lift.cable,{x:start.x,y:start.y,x2:end.x,y2:end.y,at:destination.armAt});
      this.lifts.delete(owner.id);
      c.sound('ranger-cable-set',owner);
      return 'replant';
    }
    if (!canLift || c.tick<(this.recovery.get(owner.id)??0)) return;
    const nearest=this.nearest(owner,c,fitting);
    if (!nearest || !reserveArrow()) return;
    this.lifts.set(owner.id,{cable:nearest.cable,anchor:nearest.anchor,fitting,until:Math.min(nearest.cable.until,c.tick+fieldRules.carryTicks)});
    this.recovery.set(owner.id,c.tick+fieldRules.recoveryTicks);
    c.sound('ranger-cable-lift',owner);
    return 'lift';
  }

  step(c:FieldContext) {
    if (!c.combat) { this.clear(); return; }
    if (c.paused || !this.hasWork) return;
    if (this.lifts.size) {
      const owners=new Map(c.owners.map(owner=>[owner.id,owner]));
      for (const [id,lift] of this.lifts) {
        const owner=owners.get(id);
        if (!live(owner) || owner.dashUntil>c.tick || owner.sprinting || c.tick>=lift.until ||
          this.cables.get(lift.cable.id)!==lift.cable) this.drop(id);
      }
    }
    for (const [id,until] of this.recovery) if (c.tick>=until) this.recovery.delete(id);
  }
}
