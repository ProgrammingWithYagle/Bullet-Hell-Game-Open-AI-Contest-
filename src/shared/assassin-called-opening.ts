import { distance, segmentRect, type Rect } from './geometry.ts';
import type { Player } from './game.ts';
import type { InputFrame, Vec } from './protocol.ts';
import type { RangerTarget } from './ranger-kit.ts';

export const calledOpeningId = 'assassin-called-opening-1';
export const duelistIds = {
  entry: calledOpeningId,
  passing: 'assassin-duelist-passing-cut-1',
  counter: 'assassin-duelist-counterturn-1',
} as const;
export const calledOpeningRules = {
  prepare: 65,
  retry: 27,
  minimumPickRange: 82,
  maximumPickRange: 222,
  minimumReach: 66,
  maximumReach: 241,
  aimCone: .22,
  releaseCone: .20,
  lateral: 52,
  walkBudget: 160,
  passingStride: 2.4,
  counterMeasure: 34,
  counterWarning: 8,
  pad: 2,
  hit: 112,
  flash: 8,
} as const;

export type CalledOpeningStatus = {
  phase: 'idle' | 'measuring' | 'reposition' | 'open';
  ready: boolean;
  until?: number;
  progress?: number;
  side?: -1 | 1;
  canPass?: boolean;
  canCounter?: boolean;
};
type FocusCue = Vec & {
  kind: 'assassin-duel-focus';
  id: number;
  owner: string;
  radius: number;
  at: number;
  until: number;
  opened: boolean;
  countering?: true;
};
type StrikeCue = Vec & {
  kind: 'assassin-duel-strike';
  id: number;
  owner: string;
  radius: number;
  at: number;
  until: number;
  toX: number;
  toY: number;
  landed: boolean;
  passing?: true;
  turned?: true;
};
export type CalledOpeningCue = FocusCue | StrikeCue;
type Focus = {
  id: number;
  targetKey: string;
  cue: FocusCue;
  offset: number;
  walked: number;
  tangent: number;
  counter?: { direction: -1 | 1; walked: number };
};
type DuelNote = 'focus' | 'open' | 'hit' | 'guard' | 'lost' | 'pass' | 'turn';
export type CalledOpeningWorld = {
  tick: number;
  bounds: Rect;
  obstacles: readonly Rect[];
  targets: readonly RangerTarget[];
  nextId: () => number;
  recovery: (owner: Player) => number;
  passage: (owner: Player) => boolean;
  strike: (owner: Player, target: RangerTarget, damage: number) => number;
  note: (owner: Player, event: DuelNote, position: Vec) => void;
};

const rules=calledOpeningRules;
const point=({x,y}:Vec)=>({x,y});
const owns=(owner:Player|undefined):owner is Player=>!!owner&&owner.connected&&!owner.expired&&owner.status==='active'&&
  owner.health>0&&owner.classId==='assassin'&&owner.skills.includes(calledOpeningId);
const planted=(input:InputFrame)=>Math.hypot(input.moveX,input.moveY)<=1e-4;
const freeHands=(input:InputFrame)=>!input.fire&&!input.reload&&!input.q&&!input.e&&!input.ultimate&&!input.dodge&&
  !input.sprint&&!input.technique2&&!input.technique3&&!input.interact&&input.supply<0;
const readyHands=(p:Player,now:number)=>p.reloadAt<=now&&p.dashUntil<=now&&p.channelUntil<=now;
const bearing=(a:Vec,b:Vec)=>Math.atan2(b.y-a.y,b.x-a.x);
const aimed=(p:Player,to:Vec)=>Math.abs(Math.atan2(Math.sin(bearing(p,to)-p.aim),Math.cos(bearing(p,to)-p.aim)));
const sideOf=(offset:number): -1|1|undefined=>offset>0?1:offset<0?-1:undefined;
const measured=(focus:Focus)=>focus.counter ? focus.counter.walked/rules.counterMeasure : Math.abs(focus.offset)/rules.lateral;
const canPass=(owner:Player,focus:Focus)=>owner.skills.includes(duelistIds.passing)&&
  Math.abs(focus.tangent)>=rules.passingStride&&sideOf(focus.tangent)===sideOf(focus.offset);
const canCounter=(owner:Player,focus:Focus,now:number)=>owner.skills.includes(duelistIds.counter)&&
  !focus.counter&&now+rules.counterWarning<focus.cue.until;

function visible(from:Vec,to:Vec,world:CalledOpeningWorld){
  const {x,y,width,height}=world.bounds;
  const inside=(p:Vec)=>p.x>=x&&p.y>=y&&p.x<=x+width&&p.y<=y+height;
  return inside(from)&&inside(to)&&
    world.obstacles.every(rect=>segmentRect(from,to,rect,rules.pad)===null);
}
function available(p:Player,world:CalledOpeningWorld){
  return p.eAt<=world.tick&&!world.passage(p)&&readyHands(p,world.tick);
}
function selected(owner:Player,world:CalledOpeningWorld){
  return world.targets.filter(target=>{
    const gap=distance(owner,target);
    return target.health>0&&gap>=rules.minimumPickRange&&gap<=rules.maximumPickRange&&
      aimed(owner,target)<=rules.aimCone&&visible(owner,target,world);
  }).sort((a,b)=>aimed(owner,a)-aimed(owner,b)||distance(owner,a)-distance(owner,b)||a.key.localeCompare(b.key))[0];
}
function stillInDuel(owner:Player,target:RangerTarget|undefined,world:CalledOpeningWorld):target is RangerTarget{
  if(!target||target.health<=0)return false;
  const gap=distance(owner,target);
  return gap>=rules.minimumReach&&gap<=rules.maximumReach&&visible(owner,target,world);
}

export class CalledOpening {
  private readonly focuses=new Map<string,Focus>();
  private readonly cuts=new Map<string,StrikeCue>();
  private readonly retryAt=new Map<string,number>();

  get active(){return this.focuses.size>0||this.cuts.size>0;}
  has(owner:string){return this.focuses.has(owner);}
  clear(){this.focuses.clear();this.cuts.clear();this.retryAt.clear();}
  drop(owner:string){this.focuses.delete(owner);this.cuts.delete(owner);this.retryAt.delete(owner);}

  status(owner:Player,world:CalledOpeningWorld,combat:boolean):CalledOpeningStatus{
    if(!combat||!owns(owner))return {phase:'idle',ready:false};
    const focus=this.focuses.get(owner.id), now=world.tick;
    const hands=freeHands(owner.input)&&available(owner,world), still=planted(owner.input);
    if(focus){
      const target=world.targets.find(row=>row.key===focus.targetKey), progress=measured(focus), open=progress>=1;
      const passing=open&&canPass(owner,focus);
      return {phase:open?'open':focus.counter?'reposition':'measuring',
        ready:open&&hands&&(still||passing)&&now<focus.cue.until&&stillInDuel(owner,target,world)&&aimed(owner,target)<=rules.releaseCone,
        until:focus.cue.until,progress:Math.min(1,progress),side:focus.counter?.direction??sideOf(focus.offset),
        canPass:passing,canCounter:open&&canCounter(owner,focus,now)};
    }
    const until=Math.max(owner.eAt,this.retryAt.get(owner.id)??0);
    return {phase:'idle',until,ready:hands&&still&&until<=now&&!!selected(owner,world)};
  }

  private abandon(owner:Player,focus:Focus,world:CalledOpeningWorld){
    this.focuses.delete(owner.id);
    this.retryAt.set(owner.id,world.tick+rules.retry);
    world.note(owner,'lost',focus.cue);
  }

  move(owner:Player,input:InputFrame,world:CalledOpeningWorld,voluntary:boolean){
    if(!owns(owner))return;
    const focus=this.focuses.get(owner.id), now=world.tick;
    const move={x:owner.x-owner.oldX,y:owner.y-owner.oldY};
    const walked=Math.hypot(move.x,move.y);
    const hands=input.technique1&&freeHands(input)&&available(owner,world);
    const stationary=planted(input)&&walked<=1e-6;
    if(!focus){
      if(!hands||!stationary||(this.retryAt.get(owner.id)??0)>now)return;
      const target=selected(owner,world);
      if(!target)return;
      const cue:FocusCue={...point(target),kind:'assassin-duel-focus',id:world.nextId(),owner:owner.id,
        radius:target.radius+9,at:now,until:now+rules.prepare,opened:false};
      this.focuses.set(owner.id,{id:cue.id,targetKey:target.key,cue,offset:0,walked:0,tangent:0});
      world.note(owner,'focus',target);
      return;
    }
    const target=world.targets.find(row=>row.key===focus.targetKey);
    if(now>=focus.cue.until||world.passage(owner)||input.ultimate||input.e||input.dodge||input.sprint||
       walked>1e-6&&!voluntary||!stillInDuel(owner,target,world)){
      this.abandon(owner,focus,world);
      return;
    }
    const wasOpen=focus.cue.opened, oldSide=sideOf(focus.offset);
    focus.tangent=0;
    if(voluntary&&walked>1e-6){
      const dx=target.x-owner.oldX,dy=target.y-owner.oldY,gap=Math.hypot(dx,dy);
      if(gap>1e-6)focus.tangent=(dx*move.y-dy*move.x)/gap;
      focus.offset+=focus.tangent;
      if(focus.counter)focus.counter.walked=Math.max(0,focus.counter.walked+focus.tangent*focus.counter.direction);
      focus.walked+=walked;
      if(focus.walked>rules.walkBudget){ this.abandon(owner,focus,world); return; }
    }
    const direction=sideOf(focus.tangent);
    if(hands&&!stationary&&wasOpen&&direction&&direction!==oldSide&&Math.abs(focus.tangent)>=rules.passingStride&&
       canCounter(owner,focus,now)&&aimed(owner,target)<=rules.aimCone){
      focus.counter={direction,walked:Math.abs(focus.tangent)};
      focus.cue.countering=true;
      world.note(owner,'turn',target);
    }
    const opened=measured(focus)>=1;
    if(opened&&!wasOpen)world.note(owner,'open',target);
    Object.assign(focus.cue,point(target),{opened});
    const passing=!stationary&&wasOpen&&canPass(owner,focus);
    if(!hands||!opened||(!stationary&&!passing)||aimed(owner,target)>rules.releaseCone)return;
    owner.eAt=now+world.recovery(owner);
    const landed=world.strike(owner,target,rules.hit)>0;
    this.focuses.delete(owner.id);
    this.cuts.set(owner.id,{...point(owner),kind:'assassin-duel-strike',id:focus.id,owner:owner.id,radius:4,
      at:now,until:now+rules.flash,toX:target.x,toY:target.y,landed,
      ...(passing?{passing:true as const}:{}),...(focus.counter?{turned:true as const}:{})});
    if(passing)world.note(owner,'pass',target);
    world.note(owner,landed?'hit':'guard',target);
  }

  advance(players:ReadonlyMap<string,Player>,world:CalledOpeningWorld){
    for(const [id,focus] of this.focuses){
      const owner=players.get(id);
      if(!owns(owner)){ this.drop(id); continue; }
      const target=world.targets.find(row=>row.key===focus.targetKey);
      if(world.tick>=focus.cue.until||!stillInDuel(owner,target,world))this.abandon(owner,focus,world);
      else Object.assign(focus.cue,point(target));
    }
    for(const [id,cut] of this.cuts)if(world.tick>=cut.until||!owns(players.get(id)))this.cuts.delete(id);
  }

  cues():CalledOpeningCue[]{
    return [...Array.from(this.focuses.values(),row=>({...row.cue})),...this.cuts.values()];
  }
}
