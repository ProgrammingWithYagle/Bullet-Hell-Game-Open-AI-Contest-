import { distance, segmentRect, type Rect } from './geometry.ts';
import type { Player } from './game.ts';
import type { InputFrame, Vec } from './protocol.ts';

export const fuseSealId = 'mage-fuse-seal-1';
export const mageVolatileIds = {
  entry: fuseSealId,
  shunt: 'mage-volatile-shunt-fuse-1',
  twin: 'mage-volatile-twin-vent-1',
} as const;
export const fuseSealRules = {
  preparation: 78,
  charges: 38,
  crossed: 14,
  retry: 28,
  radius: 18,
  leash: 142,
  width: 12,
  minimumStroke: 39,
  forwardReach: 338,
  wardOffset: 210,
  wardSpan: 104,
  bindingDamage: 218,
  wardDamage: 229,
  combinedDamage: 262,
  woundCost: 8,
  woundWarning: 4,
  flash: 7,
  shuntMinimum: 52,
  shuntMaximum: 108,
  shuntCost: 6,
  shuntWarning: 8,
  twinCrossed: 27,
  twinBindingDamage: 162,
  twinWardDamage: 174,
} as const;

type Spell = 'q' | 'e';
type SingleCharge = 'binding' | 'ward';
type Charge = SingleCharge | 'crossed';
export type FuseStatus = {
  phase: 'idle' | 'prepared' | Charge;
  ready: boolean;
  until?: number;
  risk?: boolean;
  canShunt?: boolean;
  split?: boolean;
  echo?: boolean;
  guide?: Segment[];
};
type Segment = { from: Vec; to: Vec };
type FusePoint = Vec & { id: number; owner: string; at: number; until: number; radius: number };
export type FuseCue = FusePoint & (
  { kind: 'mage-fuse-point'; phase: 'prepared' | Charge; risk?: true; echo?: true } |
  { kind: 'mage-fuse-vent'; phase: Charge; segments: Segment[]; part?: 'first' | 'echo' }
);
type Seal = FusePoint & {
  damage: number;
  chargedAt?: number;
  first?: Spell;
  mixed?: true;
  risk?: true;
  shifted?: true;
  echo?: { phase: SingleCharge; touched: Set<string> };
};
type FuseEvent = 'prepare' | 'binding' | 'ward' | 'crossed' | 'vent' | 'wound' | 'break' | 'shunt' | 'split' | 'echo';
export type FuseWorld = {
  tick: number;
  bounds: Rect;
  obstacles: readonly Rect[];
  lava: readonly (Vec & { radius: number })[];
  nextId: () => number;
  recovery: (owner: Player) => number;
  hit: (owner: Player, segment: Segment, damage: number, touched: Set<string>) => void;
  note: (owner: Player, event: FuseEvent, at: Vec) => void;
};

const point = ({ x,y }:Vec) => ({ x,y });
const owns = (p:Player|undefined):p is Player=>!!p && p.connected && !p.expired && p.status==='active' && p.health>0 &&
  p.classId==='mage' && p.skills.includes(fuseSealId);
const planted = (input:InputFrame)=>Math.hypot(input.moveX,input.moveY)<=.0001;
const clearHands = (input:InputFrame)=>!input.fire&&!input.reload&&!input.q&&!input.e&&!input.ultimate&&!input.dodge&&
  !input.sprint&&!input.technique1&&!input.technique2&&!input.interact&&input.supply<0;
const readyHands = (p:Player,tick:number)=>p.reloadAt<=tick && p.dashUntil<=tick && p.channelUntil<=tick;
const spellCharge = (spell:Spell):SingleCharge=>spell==='q'?'binding':'ward';
const charge = (seal:Seal):Charge|undefined=>seal.echo?.phase??(seal.mixed?'crossed':seal.first&&spellCharge(seal.first));
const canSplit = (owner:Player,phase:Charge|undefined)=>phase==='crossed'&&owner.skills.includes(mageVolatileIds.twin);
const rayPoint = (from:Vec,angle:number,length:number):Vec=>({x:from.x+Math.cos(angle)*length,y:from.y+Math.sin(angle)*length});

function inBounds(p:Vec,bounds:Rect,pad:number){
  return p.x>=bounds.x+pad && p.x<=bounds.x+bounds.width-pad && p.y>=bounds.y+pad && p.y<=bounds.y+bounds.height-pad;
}
function footprint(p:Vec,world:FuseWorld){
  const r=fuseSealRules.radius;
  return inBounds(p,world.bounds,r) && world.obstacles.every(rect=>segmentRect(p,p,rect,r)===null) &&
    world.lava.every(pit=>distance(p,pit)>pit.radius+r);
}
function connected(owner:Player,seal:Seal,world:FuseWorld){
  return distance(owner,seal)<=fuseSealRules.leash && footprint(seal,world) &&
    world.obstacles.every(rect=>segmentRect(owner,seal,rect,1)===null);
}
function canShunt(owner:Player,seal:Seal,world:FuseWorld){
  const gap=distance(owner,seal), rules=fuseSealRules;
  return !!seal.first&&!seal.mixed&&!seal.shifted&&owner.skills.includes(mageVolatileIds.shunt)&&
    gap>=rules.shuntMinimum&&gap<=rules.shuntMaximum&&world.tick+rules.shuntCost+rules.shuntWarning<seal.until&&
    connected(owner,seal,world)&&footprint(owner,world);
}
function limitRay(from:Vec,angle:number,length:number,world:FuseWorld){
  const {bounds,obstacles}=world, pad=fuseSealRules.width;
  if(!inBounds(from,bounds,pad))return;
  const requested=rayPoint(from,angle,length), dx=requested.x-from.x, dy=requested.y-from.y;
  const across=dx>0?(bounds.x+bounds.width-pad-from.x)/dx:dx<0?(bounds.x+pad-from.x)/dx:1;
  const down=dy>0?(bounds.y+bounds.height-pad-from.y)/dy:dy<0?(bounds.y+pad-from.y)/dy:1;
  let end=Math.min(1,across,down);
  for(const rect of obstacles)end=Math.min(end,segmentRect(from,requested,rect,pad)?.t??1);
  const span=Math.max(0,end*length-.05);
  return span>=fuseSealRules.minimumStroke ? { from:point(from),to:rayPoint(from,angle,span) } : undefined;
}
function releasePattern(owner:Player,mode:Charge,world:FuseWorld){
  const rules=fuseSealRules, segments:Segment[]=[];
  if(mode==='binding'||mode==='crossed'){
    const straight=limitRay(owner,owner.aim,rules.forwardReach,world);
    if(!straight)return;
    segments.push(straight);
  }
  if(mode==='ward'||mode==='crossed'){
    const center=rayPoint(owner,owner.aim,rules.wardOffset);
    if(!inBounds(center,world.bounds,rules.width)||world.obstacles.some(rect=>segmentRect(owner,center,rect,rules.width)))return;
    const left=limitRay(center,owner.aim+Math.PI/2,rules.wardSpan,world);
    const right=limitRay(center,owner.aim-Math.PI/2,rules.wardSpan,world);
    if(!left&&!right)return;
    if(left)segments.push(left);
    if(right)segments.push(right);
  }
  return segments;
}

export class FuseSeal {
  private readonly seals=new Map<string,Seal>();
  private readonly flashes=new Map<number,FuseCue>();
  private readonly retryAt=new Map<string,number>();

  get active(){return this.seals.size>0||this.flashes.size>0;}
  prepared(id:string){return this.seals.has(id);}
  drop(id:string){
    this.seals.delete(id);
    this.retryAt.delete(id);
    for(const [cueId,flash] of this.flashes)if(flash.owner===id)this.flashes.delete(cueId);
  }
  clear(){this.seals.clear();this.flashes.clear();this.retryAt.clear();}

  status(owner:Player,world:FuseWorld,inCombat:boolean):FuseStatus{
    if(!inCombat||!owns(owner))return {phase:'idle',ready:false};
    const tick=world.tick, seal=this.seals.get(owner.id), free=planted(owner.input)&&clearHands(owner.input)&&readyHands(owner,tick);
    if(seal){
      const phase=charge(seal), split=canSplit(owner,phase);
      const aimed=split&&seal.first?spellCharge(seal.first):phase;
      const guide=aimed&&tick<seal.until&&connected(owner,seal,world)?releasePattern(owner,aimed,world):undefined;
      return {phase:phase??'prepared',until:seal.until,ready:free&&!!guide,risk:seal.risk,
        canShunt:canShunt(owner,seal,world),split,echo:!!seal.echo,guide};
    }
    const until=Math.max(owner.ultimateAt,this.retryAt.get(owner.id)??0);
    return {phase:'idle',until,ready:free&&until<=tick&&footprint(owner,world)};
  }

  command(owner:Player,input:InputFrame,world:FuseWorld,voluntary:boolean){
    if(!owns(owner))return;
    const now=world.tick, seal=this.seals.get(owner.id);
    if(seal&&input.ultimate){
      if(!seal.first&&owner.ultimateAt<=now)this.seals.delete(owner.id);
      return;
    }
    if(!input.technique3||!clearHands(input)||!readyHands(owner,now))return;
    const moved=owner.x!==owner.oldX||owner.y!==owner.oldY;
    if(seal&&voluntary&&moved&&!planted(input)&&canShunt(owner,seal,world)){
      Object.assign(seal,point(owner));
      seal.shifted=true;
      seal.until-=fuseSealRules.shuntCost;
      world.note(owner,'shunt',seal);
      return;
    }
    if(!planted(input)||moved)return;
    if(!seal){
      if(owner.ultimateAt>now||(this.retryAt.get(owner.id)??0)>now||!footprint(owner,world))return;
      const waiting:Seal={...point(owner),id:world.nextId(),owner:owner.id,radius:fuseSealRules.radius,at:now,
        until:now+fuseSealRules.preparation,damage:owner.damageTaken};
      this.seals.set(owner.id,waiting);
      world.note(owner,'prepare',waiting);
      return;
    }
    const mode=charge(seal);
    if(!mode||now>=seal.until||!connected(owner,seal,world))return;
    const split=canSplit(owner,mode)&&seal.first;
    const echo=seal.echo;
    const aimed=split?spellCharge(split):mode;
    const segments=releasePattern(owner,aimed,world);
    if(!segments)return;
    const rules=fuseSealRules;
    const damage=aimed==='binding'?(split||echo?rules.twinBindingDamage:rules.bindingDamage):
      aimed==='ward'?(split||echo?rules.twinWardDamage:rules.wardDamage):rules.combinedDamage;
    const touched=echo?.touched??new Set<string>();
    for(const segment of segments)world.hit(owner,segment,damage,touched);
    const id=echo?world.nextId():seal.id;
    this.flashes.set(id,{...point(owner),kind:'mage-fuse-vent',owner:owner.id,id,at:now,until:now+rules.flash,
      radius:rules.width,phase:aimed,segments,...(split?{part:'first'}:echo?{part:'echo'}:{})});
    if(split)seal.echo={phase:spellCharge(split==='q'?'e':'q'),touched};
    else this.seals.delete(owner.id);
    world.note(owner,split?'split':echo?'echo':'vent',owner);
  }

  infuse(owner:Player,spell:Spell,world:FuseWorld){
    const seal=this.seals.get(owner.id), now=world.tick;
    if(!seal||!owns(owner)||now>=seal.until||!connected(owner,seal,world))return;
    if(!seal.first){
      if(owner.ultimateAt>now)return;
      owner.ultimateAt=now+world.recovery(owner);
      seal.first=spell;
      seal.chargedAt=now;
      seal.at=now;
      seal.damage=owner.damageTaken;
      seal.until=Math.min(seal.until,now+fuseSealRules.charges);
      world.note(owner,spell==='q'?'binding':'ward',seal);
    }else if(seal.first!==spell&&!seal.mixed&&now>(seal.chargedAt??now)){
      seal.mixed=true;
      seal.at=now;
      const interval=owner.skills.includes(mageVolatileIds.twin)?fuseSealRules.twinCrossed:fuseSealRules.crossed;
      seal.until=Math.min(seal.until,now+interval);
      world.note(owner,'crossed',seal);
    }
  }

  advance(players:ReadonlyMap<string,Player>,world:FuseWorld){
    const now=world.tick;
    for(const [id,seal] of this.seals){
      const owner=players.get(id);
      if(!owns(owner)){this.drop(id);continue;}
      if(now>=seal.until||!connected(owner,seal,world)||!seal.first&&owner.ultimateAt>now){
        this.seals.delete(id);
        if(!seal.first)this.retryAt.set(id,now+fuseSealRules.retry);
        world.note(owner,'break',seal);
      }else if(seal.first&&owner.damageTaken>seal.damage){
        seal.damage=owner.damageTaken;
        const reduced=Math.min(seal.until,Math.max(now+fuseSealRules.woundWarning,seal.until-fuseSealRules.woundCost));
        if(reduced<seal.until){seal.until=reduced;seal.risk=true;world.note(owner,'wound',seal);}
      }
    }
    for(const [id,flash] of this.flashes)if(now>=flash.until||!owns(players.get(flash.owner)))this.flashes.delete(id);
  }

  cues():FuseCue[]{
    return [
      ...Array.from(this.seals.values(),(seal):FuseCue=>({...point(seal),kind:'mage-fuse-point',owner:seal.owner,id:seal.id,
        at:seal.at,until:seal.until,radius:seal.radius,phase:charge(seal)??'prepared',
        ...(seal.risk?{risk:true as const}:{}),...(seal.echo?{echo:true as const}:{})})),
      ...this.flashes.values(),
    ];
  }
}
