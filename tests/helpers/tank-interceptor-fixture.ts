import assert from 'node:assert/strict';
import {Game,data,type Player} from '../../src/shared/game.ts';
import {idleInput,type InputFrame} from '../../src/shared/protocol.ts';
import {interceptorIds} from '../../src/shared/tank-interceptor.ts';
import {distance} from '../../src/shared/geometry.ts';
export type InterceptChoice='forward'|'crossing'|'standfast';
type TestAccess={damage:(p:Player,amount:number)=>void;emitShot:(owner:string,x:number,y:number,aim:number,speed:number,damage:number,radius:number)=>{id:number}|undefined;director:{services:{movement:()=>{multiplier:number;x:number;y:number}}}};
type Options={choice?:InterceptChoice;owned?:boolean;ally?:boolean;talent?:string;difficulty?:'baby'|'hellish';clearTerrain?:boolean;extra?:string[]};
const nodes=new Map<string,{id:string;prerequisite?:string|null}>([...data.skills,...data.generalSkills,...data.specializationSkills].map(s=>[s.id,s]));
export const point=({x,y}:{x:number;y:number})=>({x,y});
export const wrap=(angle:number)=>Math.atan2(Math.sin(angle),Math.cos(angle));
/** Controlled27SP actual transactions and combat. Cleared terrain isolates physics; untouched maps use separate geometry/native runs. */
export function interceptionFixture({choice='forward',owned=true,ally=false,talent,difficulty='baby',clearTerrain=true,extra=[]}:Options={}){
 const g=new Game({mode:'endless',difficulty,seed:41,maxPlayers:ally?2:1,openingArenaId:'gatehouse',arenaSelection:'fixed'});g.encounter=9;const p=g.addPlayer('tank','Controlled interception','tank'),peer=ally?g.addPlayer('ally','Healthy ally','soldier'):undefined,access=g as unknown as TestAccess;
 let transaction=0;const buy=(id:string):void=>{if(p.skills.includes(id))return;const node=nodes.get(id);assert(node,id);if(node.prerequisite)buy(node.prerequisite);const reply=g.transact(p.id,{kind:'skill',id:'test-'+ ++transaction,item:id});assert(reply.ok,JSON.stringify({id,reply}));};
 buy('tank-bastion-1');if(owned)buy(interceptorIds.entry);if(choice!=='forward')buy(interceptorIds[choice]);if(talent)buy(talent);for(const id of extra)buy(id);
 assert(g.start());g.boss.staggerUntil=1_000_000;const arena=structuredClone(g.arena);if(clearTerrain){arena.obstacles=[];arena.lavaPits=[];arena.bounds={x:p.x-600,y:p.y-600,width:1200,height:1200};}Object.defineProperty(g,'arena',{get:()=>arena});
 let sequence=0;const step=(input:Partial<InputFrame>={})=>{assert(g.submitInput(p.id,{...idleInput(),sequence:++sequence,clientTick:g.combatTick,aim:0,...input}));g.step();return g.drainEvents();};while(g.combatTick<=p.invulnerableUntil)step();
 const status=()=>g.interceptor.stateSnapshot(p.id);
 function arm(aim=0){aim=wrap(aim);step({technique3:true,aim});assert.equal(status()?.phase,'winding');for(let n=0;status()?.phase==='winding';n++){assert(n<8,'six-interval preparation');step({aim});}assert.equal(status()?.phase,'ready');}
 function launch(aim=0,side=choice==='crossing'?1:0){arm(aim);const a=wrap(aim),normal={x:Math.cos(a),y:Math.sin(a)},origin=point(p),invulnerableUntil=p.invulnerableUntil;step({technique3:true,aim:wrap(a+1.7),moveX:-normal.y*side,moveY:normal.x*side});const state=status();assert(state?.phase==='screen');assert.equal(p.invulnerableUntil,invulnerableUntil);assert(distance(origin,p)<.01);return state;}
 function shot(from:{x:number;y:number},aim:number,speed=2400,owner='hostile'){const round=access.emitShot(owner,from.x,from.y,wrap(aim),speed,25,3);assert(round);return round;}
 return {g,p,peer,access,arena,step,status,arm,launch,shot,buy};
}
