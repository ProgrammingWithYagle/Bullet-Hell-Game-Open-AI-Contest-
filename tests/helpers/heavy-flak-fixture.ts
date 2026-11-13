import assert from 'node:assert/strict';
import { Game } from '../../src/shared/game.ts';
import { idleInput, type InputFrame, type Shot } from '../../src/shared/protocol.ts';
import { flakIds } from '../../src/shared/heavy-flak.ts';
let serial=0;
/** Controlled authority/physics fixture. Its earned SP, bodies, boss and cover are explicit test setup, never ordinary-run or online proof. */
export function heavyFlakFixture(options:{handling?:'running'|'hanging';pattern?:'compact'|'frontal';earned?:number}={}){
 const g=new Game({mode:'raid',difficulty:'normal',seed:41,maxPlayers:2,arenaSelection:'fixed',openingArenaId:'gatehouse'}),p=g.addPlayer('solo','Hux','heavy'),ally=g.addPlayer('ally','Medic','medic');
 p.totalSp=options.earned??20;
 const buy=(item:string)=>{const result=g.transact(p.id,{id:'flak-fixture-'+ ++serial,kind:'skill',item});assert(result.ok,item+':'+result.reason);};
 for(const item of ['heavy-ordnance-1',flakIds.entry,...(options.pattern?[flakIds[options.pattern]]:[]),flakIds.command,...(options.handling?[flakIds[options.handling]]:[])])buy(item);
 assert(g.start());g.boss.id='constable';(g as any).director.reset('constable');g.boss.x=1200;g.boss.y=200;g.boss.health=g.boss.maxHealth=1e6;g.boss.staggerUntil=g.boss.deadline=1e9;
 Object.defineProperty(g,'arena',{value:structuredClone(g.arena)});g.arena.obstacles.length=g.arena.lavaPits.length=0;p.x=p.oldX=600;p.y=p.oldY=600;ally.x=ally.oldX=1400;ally.y=ally.oldY=900;g.drainEvents();let sequence=0;
 const step=(input:Partial<InputFrame>={})=>{assert(g.submitInput(p.id,{...idleInput(),sequence:++sequence,aim:0,...input}));g.step();};
 const emit=(x:number,y:number,options:{owner?:string;speed?:number;angle?:number;radius?:number;damage?:number}={})=>{const shot=(g as any).emitShot(options.owner??'hostile',x,y,options.angle??0,options.speed??0,options.damage??0,options.radius??3,0,10)as Shot|undefined;assert(shot);return shot;};
 const flights=()=>[...g.shots.values()].filter(s=>s.owner===p.id&&s.visual==='flak'),bursts=()=>g.classCues().filter(c=>c.kind==='heavy-flak-burst');
 return{g,p,ally,buy,step,emit,flights,bursts};
}
