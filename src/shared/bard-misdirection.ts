import type { BardContext } from './bard-kit.ts';
import type { Player } from './game.ts';
import { distance, segmentCircle, segmentRect } from './geometry.ts';
import type { Minion } from './minions.ts';
import { HZ, type InputFrame, type Vec } from './protocol.ts';

export const misdirectionIds = {
  entry:'bard-false-entrance-1',
  wrong:'bard-misdirection-wrong-door-1',
  second:'bard-misdirection-second-entrance-1',
} as const;

const ticks = (seconds: number) => Math.ceil(seconds*HZ);
export const misdirectionRules = {
  cadence:2, reach:153, walked:52, radius:124, hearOwner:275, cueDuration:ticks(4.2),
  chaseDuration:ticks(1.3), replayWindow:ticks(.92), recovers:ticks(8.5),
  turnMinimum:49, turnMaximum:120, arrive:19, pad:10,
} as const;

export type MisdirectionStatus = {
  phase:'idle'|'walk'|'waiting'|'distracting'|'second';
  ready:boolean;
  point?:Vec;
  alternative?:Vec;
  walked?:number;
  until?:number;
  target?:number;
  repeats?:true;
};

export type MisdirectionCue = Vec & {
  kind:'bard-false-entrance';
  id:number;
  owner:string;
  at:number;
  until:number;
  radius:number;
  armed:boolean;
  target?:number;
  moved?:true;
  repeats?:true;
};

type Ruse = {
  id:number;
  origin:Vec;
  point:Vec;
  at:number;
  until:number;
  walked:number;
  target?:number;
  divertedUntil?:number;
  arrived?:number;
  secondUntil?:number;
  moved?:true;
  repeats?:true;
};

const R = misdirectionRules;
const point = ({x,y}: Vec): Vec => ({x,y});
const active = (p: Player) => p.classId==='bard' && p.connected && !p.expired && p.status==='active' &&
  p.health>0 && p.skills.includes(misdirectionIds.entry);

function clear(from: Vec, to: Vec, c: BardContext, padding: number = R.pad) {
  const t=c.terrain;
  return Boolean(t && to.x>=t.bounds.x+padding && to.y>=t.bounds.y+padding &&
    to.x<=t.bounds.x+t.bounds.width-padding && to.y<=t.bounds.y+t.bounds.height-padding &&
    !c.obstacles.some(block=>segmentRect(from,to,block,padding)!==null) &&
    !t.lava.some(pit=>segmentCircle(from,to,pit,pit.radius+padding)!==null));
}

function facing(from: Vec,to: Vec) { return Math.atan2(to.y-from.y,to.x-from.x); }
function project(origin: Vec,angle: number) { return {x:origin.x+Math.cos(angle)*R.reach,y:origin.y+Math.sin(angle)*R.reach}; }
function deviation(actor: Minion, pursue: Vec, mark: Vec) {
  const diff=facing(actor,pursue)-facing(actor,mark);
  return Math.abs(Math.atan2(Math.sin(diff),Math.cos(diff)));
}

/** Changes the desired destination of an ordinary pursuer. The marker is neither a body nor a hit target. */
export class MisdirectionKit {
  private ruses = new Map<string,Ruse>();
  private recovery = new Map<string,number>();
  private pursuers = new Map<number,string>();

  clear() { this.ruses.clear(); this.recovery.clear(); this.pursuers.clear(); }
  drop(id: string) { this.end(id); }
  ownsRuse(id: string) { return this.ruses.has(id); }
  get live() { return this.ruses.size>0; }

  status(p: Player,c:BardContext,combat:boolean,cadence:number):MisdirectionStatus {
    if(!combat||!active(p))return {phase:'idle',ready:false};
    const ruse=this.ruses.get(p.id);
    if(ruse){
      const alternative=cadence>=1?this.wrongDoor(p,ruse,c):undefined;
      const second=ruse.secondUntil!==undefined;
      return {phase:second?'second':ruse.target!==undefined?'distracting':ruse.walked<R.walked?'walk':'waiting',
        ready:!!alternative||(second&&cadence>=1&&c.tick<ruse.secondUntil!), point:point(ruse.point),alternative,
        walked:ruse.walked,until:ruse.until,target:ruse.target,repeats:ruse.repeats};
    }
    const until=this.recovery.get(p.id)??0, spot=project(p,p.aim);
    const legal=clear(p,spot,c);
    return {phase:'idle',ready:legal&&until<=c.tick&&cadence>=R.cadence&&c.tick>=p.dashUntil&&c.tick>=p.channelUntil,
      point:legal?spot:undefined,until};
  }

  command(p: Player,i:InputFrame,c:BardContext,spend:(n:number)=>boolean) {
    if(!i.technique3||i.technique1||i.technique2||i.q||i.e||i.ultimate||i.dodge||i.sprint||c.tick<p.dashUntil||
      c.tick<p.channelUntil||!active(p))return;
    const ruse=this.ruses.get(p.id);
    if(ruse){
      if(c.tick>=ruse.until)return;
      const alternative=this.wrongDoor(p,ruse,c);
      if(alternative&&spend(1)){
        ruse.point=alternative;
        ruse.moved=true;
        c.sound('bard-entrance-turn',p);
      } else if(ruse.secondUntil!==undefined&&c.tick<ruse.secondUntil&&distance(p,ruse.point)<=R.hearOwner&&spend(1)){
        ruse.repeats=true;
        ruse.secondUntil=undefined;
        c.sound('bard-entrance-second',p);
      }
      return;
    }
    if(c.tick<(this.recovery.get(p.id)??0))return;
    const spot=project(p,p.aim);
    if(!clear(p,spot,c)||!spend(R.cadence))return;
    this.ruses.set(p.id,{id:c.id(),origin:point(p),point:spot,at:c.tick,until:c.tick+R.cueDuration,walked:0});
    this.recovery.set(p.id,c.tick+R.recovers);
    c.sound('bard-entrance-set',p);
  }

  recordWalk(p: Player, from: Vec, c: BardContext) {
    const ruse=this.ruses.get(p.id);
    if(!ruse||ruse.walked>=R.walked||distance(p,ruse.origin)<2)return;
    const measured=distance(from,p);
    if(measured<.001)return;
    ruse.walked=Math.min(R.walked,ruse.walked+measured);
    if (ruse.walked>=R.walked) c.sound('bard-entrance-arm',p);
  }

  divert(actor: Minion, nearest: (Vec & {id:string})|undefined, c:BardContext):Vec|undefined {
    const claimed=this.pursuers.get(actor.id);
    if(claimed!==undefined){
      const ruse=this.ruses.get(claimed), owner=c.players.find(p=>p.id===claimed);
      if(!ruse||!owner)return;
      if(c.tick>=(ruse.divertedUntil??0)||!clear(actor,ruse.point,c,actor.radius)||actor.goalX!==undefined){
        this.end(claimed);
        return;
      }
      if(distance(actor,ruse.point)<=actor.radius+R.arrive){
        this.pursuers.delete(actor.id);
        if(owner.skills.includes(misdirectionIds.second)&&!ruse.repeats&&c.tick+3<ruse.until){
          ruse.arrived=actor.id;
          ruse.target=undefined;
          ruse.divertedUntil=undefined;
          ruse.secondUntil=Math.min(ruse.until,c.tick+R.replayWindow);
        } else this.end(claimed);
        c.sound('bard-entrance-arrive',owner);
        return;
      }
      return ruse.point;
    }
    if(!nearest||actor.kind!=='ordinary'||actor.goalX!==undefined||actor.speed<=0||actor.damage<=0||!actor.health)return;
    const ruse=this.ruses.get(nearest.id), owner=c.players.find(p=>p.id===nearest.id);
    if(!ruse||!owner||ruse.target!==undefined||ruse.secondUntil!==undefined||ruse.arrived===actor.id||ruse.walked<R.walked||
      !active(owner)||distance(owner,ruse.origin)<R.walked*.7||
      distance(actor,nearest)<=actor.radius+45||distance(actor,nearest)>R.hearOwner||
      distance(actor,ruse.point)<=actor.radius+R.arrive||distance(actor,ruse.point)>R.radius||
      deviation(actor,nearest,ruse.point)<.42||!clear(actor,ruse.point,c,actor.radius))return;
    ruse.target=actor.id;
    ruse.divertedUntil=Math.min(ruse.until,c.tick+R.chaseDuration);
    this.pursuers.set(actor.id,owner.id);
    c.sound('bard-entrance-take',owner);
    return ruse.point;
  }

  advance(c:BardContext) {
    for(const [id,ruse] of this.ruses){
      const owner=c.players.find(p=>p.id===id);
      if(!owner||!active(owner)||c.tick>=ruse.until||(ruse.secondUntil!==undefined&&c.tick>=ruse.secondUntil)||
        (ruse.target!==undefined&&(!c.minions.actors.has(ruse.target)||c.minions.actors.get(ruse.target)?.goalX!==undefined))||
        distance(owner,ruse.point)>R.hearOwner||!clear(ruse.point,ruse.point,c)) this.end(id);
    }
  }

  cues():MisdirectionCue[] {
    return [...this.ruses].map(([owner,ruse])=>({kind:'bard-false-entrance',...ruse.point,owner,id:ruse.id,at:ruse.at,radius:R.arrive,
      until:ruse.until,armed:ruse.walked>=R.walked,target:ruse.target,moved:ruse.moved,repeats:ruse.repeats}));
  }

  private wrongDoor(p: Player,m: Ruse,c: BardContext):Vec|undefined {
    if(!p.skills.includes(misdirectionIds.wrong)||m.moved||m.target===undefined||c.tick>=(m.divertedUntil??0))return;
    const actor=c.minions.actors.get(m.target), spot=project(m.origin,p.aim), delta=distance(spot,m.point);
    if(!actor||delta<R.turnMinimum||delta>R.turnMaximum||distance(spot,p)>R.hearOwner||
      !clear(p,spot,c)||!clear(actor,spot,c,actor.radius))return;
    return spot;
  }

  private end(id:string) {
    const target=this.ruses.get(id)?.target;
    if(target!==undefined)this.pursuers.delete(target);
    this.ruses.delete(id);
  }
}
