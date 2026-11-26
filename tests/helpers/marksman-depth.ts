import assert from "node:assert/strict";
import {Game} from "../../src/shared/game.ts";
import {idleInput,type InputFrame} from "../../src/shared/protocol.ts";
import {marksmanId} from "../../src/shared/soldier-marksman.ts";
let serial=0;
export const buy=(g:Game,owner:string,item:string)=>{
  const r=g.transact(owner,{id:"marksman-depth-"+ ++serial,kind:"skill",item});
  assert(r.ok,item+": "+r.reason);
};
/** Explicit controlled physics fixture, never natural progression or online acceptance. */
export function fixture(extra:string[]=[]){
  const g=new Game({mode:"raid",difficulty:"normal",seed:41,maxPlayers:2,arenaSelection:"fixed",openingArenaId:"gatehouse"});
  const p=g.addPlayer("marksman","Mara","soldier"),ally=g.addPlayer("ally","Partner","medic");
  for(const id of ["soldier-ballistics-1",marksmanId,...extra])buy(g,p.id,id);
  assert(g.start());g.boss.id="constable";(g as any).director.reset("constable");
  g.boss.health=g.boss.maxHealth=1e6;g.boss.deadline=g.boss.staggerUntil=1e9;g.boss.x=1200;g.boss.y=200;
  Object.defineProperty(g,"arena",{value:structuredClone(g.arena)});g.arena.obstacles.length=0;
  p.x=p.oldX=600;p.y=p.oldY=600;ally.x=ally.oldX=1400;ally.y=ally.oldY=900;
  p.invulnerableUntil=p.shield=p.supplyShield=0;p.aim=0;g.drainEvents();let sequence=0;
  const step=(input:Partial<InputFrame>={})=>{assert(g.submitInput(p.id,{...idleInput(),aim:0,sequence:++sequence,clientTick:g.combatTick,...input}));g.step();};
  const until=(at:number)=>{while(g.combatTick<at)step();};
  const shots=()=>[...g.shots.values()].filter(s=>g.marksman.has(s.id));
  return {g,p,ally,step,until,shots};
}
export const near=(a:number,b:number,e=1e-6)=>assert(Math.abs(a-b)<=e,a+" vs "+b);
