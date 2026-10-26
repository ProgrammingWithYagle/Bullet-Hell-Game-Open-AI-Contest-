import catalog from '../../content/catalog.json';
import {HZ, type Vec} from './protocol.ts';
export type EchoCue = {
  kind:'brutal-echo'; id:number; x:number; y:number;
  beganAt:number; at:number; until:number; wave:number; angles:number[];
};
type Echo = EchoCue & {speed:number; damage:number; radius:number};
const rules=catalog.rules.brutal;
/** Replays locked boss trajectories only. Controlled shots and minions opt out. */
export class BrutalVolley {
  private pending:Echo[]=[];
  private projectiles=0;
  clear(){this.pending=[];this.projectiles=0;}
  capture(now:number,point:Vec,angle:number,speed:number,damage:number,radius:number,level:number,id:()=>number) {
    const waves=level>=rules.tripleWaveMinimumThreat?rules.highThreatProjectileWaves:rules.projectileWaves;
    for(let wave=1;wave<waves;wave++) {
      if(this.projectiles>=rules.maximumPendingEchoProjectiles)break;
      const at=now+Math.ceil(rules.echoDelaySeconds*HZ*wave);
      let group=this.pending.find(g=>g.beganAt===now&&g.at===at&&g.x===point.x&&g.y===point.y&&g.speed===speed&&g.damage===damage&&g.radius===radius);
      if(!group){
        if(this.pending.length>=rules.maximumPendingEchoOrigins)break;
        group={kind:'brutal-echo',id:id(),x:point.x,y:point.y,beganAt:now,at,until:at,wave:wave+1,angles:[],speed,damage,radius};
        this.pending.push(group);
      }
      if(group.angles.length>=200)continue;
      group.angles.push(angle);this.projectiles++;
    }
  }
  release(now:number,emit:(point:Vec,angle:number,speed:number,damage:number,radius:number)=>void) {
    const due=this.pending.filter(g=>g.at<=now);
    this.pending=this.pending.filter(g=>g.at>now);
    for(const g of due){
      this.projectiles-=g.angles.length;
      for(const angle of g.angles)emit(g,angle,g.speed,g.damage,g.radius);
    }
  }
  cues():EchoCue[]{return this.pending.map(({kind,id,x,y,beganAt,at,until,wave,angles})=>({kind,id,x,y,beganAt,at,until,wave,angles:[...angles]}));}
  get queuedProjectiles(){return this.projectiles;}
}
