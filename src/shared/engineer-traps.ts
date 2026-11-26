import { HZ, type Vec } from './protocol.ts';
import { distance, segmentCircle, segmentRect } from './geometry.ts';
import { engineerRules as r, chargePoint, chargeLegal, type EngineerCharge } from './engineer-pathways.ts';
import type { Player } from './game.ts';
import type { KitContext } from './class-kits.ts';

const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export const trapIds = {
  wire: 'engineer-traps-wire-1', switch: 'engineer-traps-switch-1',
  key: 'engineer-traps-key-1', casings: 'engineer-traps-casings-1',
  haul: 'engineer-traps-haul-1', corridor: 'engineer-traps-corridor-1',
} as const;
export type TrapCue = Vec & {
  kind: 'engineer-wire' | 'engineer-jet' | 'engineer-haul' | 'engineer-corridor';
  id: number; owner: string; toX: number; toY: number; radius: number;
  at: number; until: number; impact?: boolean;
};
type Haul = { from: Vec; to: Vec; at: number; until: number };
type Plate = EngineerCharge & { damage: number; aim: number; haul?: Haul; jetTo?: Vec; jetDamage?: number };
type Control = { technique1At: number; technique2At: number; trapCommandAt: number; trapHeld: boolean };
type Corridor = TrapCue & { plates: number[]; delivered: Set<number>; damage: number };
const live = (p: Player | undefined): p is Player => !!p && p.classId === 'engineer' && p.connected && p.status === 'active' && p.health > 0;
const cross = (a: Vec, b: Vec) => a.x * b.y - a.y * b.x;

/** Segment intersection and endpoint caps cover the whole swept round body. */
function crossesWire(a: Vec, b: Vec, t: NonNullable<KitContext['targets']>[number]) {
  const from = { x: t.oldX, y: t.oldY }, u = { x: b.x-a.x, y: b.y-a.y },
    v = { x: t.x-from.x, y: t.y-from.y }, delta = { x: from.x-a.x, y: from.y-a.y }, den = cross(u,v);
  const s = den ? cross(delta,v)/den : -1, k = den ? cross(delta,u)/den : -1;
  return (s >= 0 && s <= 1 && k >= 0 && k <= 1) || [
    segmentCircle(a,b,t,t.radius+r.wireRadius), segmentCircle(a,b,from,t.radius+r.wireRadius),
    segmentCircle(from,t,a,t.radius+r.wireRadius), segmentCircle(from,t,b,t.radius+r.wireRadius),
  ].some(n => n !== null);
}
function nearest(a: Vec, b: Vec, p: Vec): Vec {
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return {x:a.x+t*dx,y:a.y+t*dy};
}

/** Finite owned equipment. Damage and warning geometry are committed by authority. */
export class EngineerTraps {
  private plates: Plate[] = [];
  private controls = new Map<string, Control>();
  private flashes: TrapCue[] = [];
  private corridors: Corridor[] = [];
  private wires: TrapCue[] = [];
  private jets: TrapCue[] = [];
  clear() { this.plates=[]; this.controls.clear(); this.flashes=[]; this.corridors=[]; this.wires=[]; this.jets=[]; }
  status(id: string) { return this.controls.get(id); }
  private state(id: string): Control { return this.controls.get(id) ?? {technique1At:0,technique2At:0,trapCommandAt:0,trapHeld:false}; }
  private owned(p: Player, c: KitContext) { return this.plates.filter(m => m.owner===p.id && m.state!=='spent' && c.tick<m.until); }
  canDeploy(p: Player, c: KitContext) {
    return live(p) && p.skills.includes('engineer-traps-1') && chargeLegal(chargePoint(p),p,c) && this.owned(p,c).length<r.chargeCapacity;
  }
  deploy(p: Player, c: KitContext) {
    if (!this.canDeploy(p,c)) return false;
    const s=c.stats(p);
    this.plates.push({kind:'engineer-charge',id:c.id(),owner:p.id,...chargePoint(p),radius:r.triggerRadius,at:c.tick,
      armedAt:c.tick+ticks(r.armSeconds),detonateAt:0,until:c.tick+ticks(r.chargeSeconds),state:'arming',
      damage:r.chargeDamage*s.ability*(1+(s.effects.turretDamage??0)),aim:p.aim});
    return true;
  }
  command(p: Player, c: KitContext) {
    if (!live(p) || !p.skills.includes('engineer-traps-1') || !p.skills.includes(trapIds.switch)) return false;
    const owned=this.owned(p,c),idle=owned.filter(m=>m.state!=='fuse');
    if (!idle.length || (c.tick>=p.qAt && owned.length<r.chargeCapacity)) return false;
    const state=this.state(p.id);
    if (c.tick<state.trapCommandAt) return false;
    this.controls.set(p.id,{...state,trapHeld:!state.trapHeld,trapCommandAt:c.tick+ticks(r.trapCommandSeconds)});
    c.sound?.('engineer-order',p);
    return true;
  }
  private commit(p: Player, m: Plate, c: KitContext) {
    m.state='fuse'; m.detonateAt=c.tick+ticks(r.fuseSeconds);
    if (p.skills.includes(trapIds.casings)) {
      m.jetTo=this.jetEnd(m,c);
      const s=c.stats(p); m.jetDamage=r.jetDamage*s.ability*(1+(s.effects.turretDamage??0));
    }
    c.sound?.('engineer-fuse',p);
  }
  private link(a: Plate, b: Plate, c: KitContext, radius=r.wireRadius) {
    return distance(a,b)>r.chargeBodyRadius*2 && distance(a,b)<=r.wireReach && chargeLegal(a,a,c,radius) && chargeLegal(b,a,c,radius);
  }
  cast(p: Player, slot: 'technique1'|'technique2', c: KitContext) {
    if (!live(p) || !p.skills.includes('engineer-traps-1')) return false;
    const state=this.state(p.id),s=c.stats(p),ready=this.owned(p,c).filter(m=>m.state==='ready');
    if (slot==='technique2') {
      if (!p.skills.includes(trapIds.haul) || c.tick<state.technique2At) return false;
      const m=ready.filter(m=>distance(p,m)<=r.haulReach && m.until>c.tick+ticks(r.haulSeconds+r.armSeconds))
        .sort((a,b)=>distance(a,p)-distance(b,p)||a.id-b.id)[0],to=chargePoint(p);
      if (!m || distance(m,to)<1 || !chargeLegal(to,m,c) || this.owned(p,c).some(other=>other!==m && distance(other,to)<r.chargeBodyRadius*2)) return false;
      m.haul={from:{x:m.x,y:m.y},to,at:c.tick,until:c.tick+ticks(r.haulSeconds)};
      m.state='hauling'; m.at=c.tick; m.armedAt=m.haul.until+ticks(r.armSeconds); m.aim=p.aim;
      this.controls.set(p.id,{...state,technique2At:c.tick+ticks(r.haulCooldown*s.cooldown)});
      c.sound?.('engineer-haul',p);
      this.refreshWarnings(c);
      return true;
    }
    if (!p.skills.includes(trapIds.key) || c.tick<state.technique1At) return false;
    const selected=ready.filter(m=>m.until>c.tick+ticks(r.fuseSeconds)).sort((a,b)=>a.id-b.id);
    if (!selected.length) return false;
    const corridor=p.skills.includes(trapIds.corridor) && selected.length===2 && this.link(selected[0],selected[1],c,r.corridorRadius);
    if (corridor) {
      const [a,b]=selected;
      this.corridors.push({kind:'engineer-corridor',id:c.id(),owner:p.id,x:a.x,y:a.y,toX:b.x,toY:b.y,radius:r.corridorRadius,
        at:c.tick,until:c.tick+ticks(r.fuseSeconds)+ticks(r.corridorSeconds),plates:[a.id,b.id],delivered:new Set(),
        damage:r.corridorDamage*s.ability*(1+(s.effects.turretDamage??0))});
    }
    for (const m of selected) this.commit(p,m,c);
    this.controls.set(p.id,{...state,technique1At:c.tick+ticks((corridor?r.corridorCooldown:r.remoteCooldown)*s.cooldown)});
    this.refreshWarnings(c);
    return true;
  }
  private jetEnd(m: Plate, c: KitContext): Vec {
    const end=m.jetTo ?? {x:m.x+Math.cos(m.aim)*r.jetRange,y:m.y+Math.sin(m.aim)*r.jetRange};
    let t=1;
    if (c.terrain) {
      const b=c.terrain.bounds,dx=end.x-m.x,dy=end.y-m.y,pad=r.jetRadius;
      if (dx>0) t=Math.min(t,(b.x+b.width-pad-m.x)/dx); else if(dx<0) t=Math.min(t,(b.x+pad-m.x)/dx);
      if (dy>0) t=Math.min(t,(b.y+b.height-pad-m.y)/dy); else if(dy<0) t=Math.min(t,(b.y+pad-m.y)/dy);
      t=Math.max(0,t);
    }
    for (const wall of c.obstacles) { const hit=segmentRect(m,end,wall,r.jetRadius); if(hit) t=Math.min(t,Math.max(0,hit.t-.0001)); }
    return {x:m.x+(end.x-m.x)*t,y:m.y+(end.y-m.y)*t};
  }
  private refreshWarnings(c: KitContext) {
    this.jets=this.plates.filter(m=>m.state==='fuse' && !!m.jetTo && c.tick<m.detonateAt && c.tick<m.until)
      .map(m=>({kind:'engineer-jet',id:m.id,owner:m.owner,x:m.x,y:m.y,toX:m.jetTo!.x,toY:m.jetTo!.y,
        radius:r.jetRadius,at:m.detonateAt-ticks(r.fuseSeconds),until:m.detonateAt}));
    this.wires=[];
    for (const p of c.players) {
      if (!live(p) || !p.skills.includes(trapIds.wire) || this.state(p.id).trapHeld) continue;
      const ready=this.owned(p,c).filter(m=>m.state==='ready' && m.until>c.tick+ticks(r.fuseSeconds));
      if (ready.length===2 && this.link(ready[0],ready[1],c)) {
        const [a,b]=ready;
        this.wires.push({kind:'engineer-wire',id:a.id,owner:p.id,x:a.x,y:a.y,toX:b.x,toY:b.y,radius:r.wireRadius,
          at:Math.max(a.armedAt,b.armedAt),until:Math.min(a.until,b.until)});
      }
    }
  }
  step(c: KitContext) {
    const owner=(id:string)=>c.players.find(p=>p.id===id && live(p));
    this.plates=this.plates.filter(m=>!!owner(m.owner) && c.tick<m.until);
    this.flashes=this.flashes.filter(f=>c.tick<f.until && !!owner(f.owner));
    for (const m of this.plates) {
      const p=owner(m.owner)!;
      if (m.state==='spent') continue;
      if (m.haul) {
        const haul=m.haul,u=Math.max(0,Math.min(1,(c.tick-haul.at)/(haul.until-haul.at))),
          next={x:haul.from.x+(haul.to.x-haul.from.x)*u,y:haul.from.y+(haul.to.y-haul.from.y)*u};
        if (!chargeLegal(next,m,c) || this.owned(p,c).some(other=>other!==m && distance(other,next)<r.chargeBodyRadius*2)) {
          m.haul=undefined; m.state='arming'; m.at=c.tick; m.armedAt=c.tick+ticks(r.armSeconds);
          if (!chargeLegal(m,m,c)) m.until=0;
          continue;
        }
        m.x=next.x; m.y=next.y;
        if (u<1) continue;
        m.haul=undefined; m.state='arming'; m.at=c.tick;
      }
      if (m.state==='fuse') {
        if (c.tick<m.detonateAt) continue;
        c.area(p,m,r.blastRadius,m.damage,r.ordinarySlow,ticks(r.slowSeconds),undefined,true);
        c.sound?.('engineer-blast',p);
        if (m.jetTo) {
          const end=this.jetEnd(m,c);
          if (distance(m,end)>1) {
            c.sweep(p,m,end,r.jetRadius,m.jetDamage!,new Set(),true);
            this.flashes.push({kind:'engineer-jet',id:c.id(),owner:p.id,x:m.x,y:m.y,toX:end.x,toY:end.y,
              radius:r.jetRadius,at:c.tick,until:c.tick+ticks(r.jetSeconds),impact:true});
          }
        }
        for (const pending of this.corridors) if(pending.plates.includes(m.id)) pending.delivered.add(m.id);
        m.state='spent'; m.at=c.tick; m.until=c.tick+ticks(r.flashSeconds);
        continue;
      }
      if (c.tick>=m.armedAt) m.state='ready';
    }
    for (const p of c.players) {
      if (!live(p) || this.state(p.id).trapHeld) continue;
      const ready=this.owned(p,c).filter(m=>m.state==='ready');
      if (p.skills.includes(trapIds.wire) && ready.length===2 && ready.every(m=>m.until>c.tick+ticks(r.fuseSeconds)) && this.link(ready[0],ready[1],c)) {
        const [a,b]=ready;
        if (c.targets?.some(t=>t.health>0 && crossesWire(a,b,t) && !c.obstacles.some(w=>segmentRect(nearest(a,b,t),t,w,0)!==null))) {
          this.commit(p,a,c); this.commit(p,b,c);
        }
      }
      for (const m of ready) if(m.state==='ready' && c.targets?.some(t=>t.health>0 && segmentCircle({x:t.oldX,y:t.oldY},t,m,r.triggerRadius+t.radius)!==null && !c.obstacles.some(w=>segmentRect(m,t,w,0)!==null))) this.commit(p,m,c);
    }
    for (const pending of this.corridors) {
      const p=owner(pending.owner),end={x:pending.toX,y:pending.toY};
      const legal=chargeLegal(pending,pending,c,r.corridorRadius) && chargeLegal(end,pending,c,r.corridorRadius);
      if (!p || !legal || pending.plates.some(id=>!pending.delivered.has(id) && !this.plates.some(m=>m.id===id && m.state==='fuse'))) { pending.until=0; continue; }
      if (c.tick<pending.until) continue;
      if (pending.delivered.size===2) {
        c.sweep(p,pending,end,pending.radius,pending.damage,new Set(),true); c.sound?.('engineer-demolition',p);
        const {plates:_p,delivered:_d,damage:_damage,...cue}=pending;
        this.flashes.push({...cue,at:c.tick,until:c.tick+ticks(r.corridorFlashSeconds),impact:true});
      }
      pending.until=0;
    }
    this.corridors=this.corridors.filter(f=>f.until>c.tick);
    this.plates=this.plates.filter(m=>c.tick<m.until);
    for (const [id,state] of this.controls) {
      const p=c.players.find(p=>p.id===id);
      if (!p) this.controls.delete(id);
      else if(!live(p) && state.trapHeld) this.controls.set(id,{...state,trapHeld:false});
    }
    this.refreshWarnings(c);
  }
  cues(): (EngineerCharge|TrapCue)[] {
    return [
      ...this.plates.map(({damage:_damage,haul:_haul,jetTo:_jetTo,jetDamage:_jetDamage,...cue})=>({...cue,held:this.state(cue.owner).trapHeld})),
      ...this.plates.filter(m=>m.haul).map(m=>({kind:'engineer-haul' as const,id:m.id,owner:m.owner,...m.haul!.from,
        toX:m.haul!.to.x,toY:m.haul!.to.y,radius:r.chargeBodyRadius,at:m.haul!.at,until:m.haul!.until})),
      ...this.wires, ...this.jets,
      ...this.corridors.map(({plates:_plates,delivered:_delivered,damage:_damage,...cue})=>({...cue})),
      ...this.flashes,
    ];
  }
}
