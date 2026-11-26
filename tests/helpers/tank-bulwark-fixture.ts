import assert from 'node:assert/strict';
import {Game,data,type Player} from '../../src/shared/game.ts';
import {idleInput,HZ,type InputFrame} from '../../src/shared/protocol.ts';
import {distance,type Rect} from '../../src/shared/geometry.ts';
import type {ClassKits,Construct} from '../../src/shared/class-kits.ts';
import {bulwarkIds} from '../../src/shared/tank-bulwark.ts';

type TestAccess={
  classKits:ClassKits;
  director:{services:{movement:(...args:unknown[])=>{multiplier:number;x:number;y:number}};civic:{solids:(...args:unknown[])=>Rect[]}};
  damage(player:Player,amount:number):void;
  emitShot(owner:string,x:number,y:number,aim:number,speed:number,damage:number,radius:number):{id:number}|undefined;
};
type Options={aim?:number;handling?:'none'|'port'|'pivot';talent?:string;weapon?:string;beforeStart?:(g:Game,p:Player,buy:(id:string)=>void)=>void};
export const definitions={definition:data.specializationSkills.find(s=>s.id===bulwarkIds.entry)!,
  pivotDefinition:data.specializationSkills.find(s=>s.id===bulwarkIds.pivot)!,portDefinition:data.specializationSkills.find(s=>s.id===bulwarkIds.port)!};
const nodes=new Map<string,{id:string;prerequisite?:string|null}>([...data.skills,...data.specializationSkills].map(node=>[node.id,node]));
export const point=({x,y}:{x:number;y:number})=>({x,y});
export const wrap=(angle:number)=>Math.atan2(Math.sin(angle),Math.cos(angle));

/** Controlled27SP lobby; actual transactions, inputs and original Q geometry. Selected hostile rounds/terrain isolate boundaries. */
export function fixture({handling='port',talent,weapon,beforeStart,aim:givenAim}:Options={}){
  const g=new Game({mode:'endless',difficulty:'baby',seed:41,openingArenaId:'gatehouse',arenaSelection:'fixed'});g.encounter=9;
  const access=g as unknown as TestAccess;
  const p=g.addPlayer('tank','Controlled physical firing port','tank');g.addPlayer('ally','Present ally','soldier');
  const purchases:string[]=[];
  function buy(id:string){if(p.skills.includes(id))return;const node=nodes.get(id);assert(node);if(node.prerequisite)buy(node.prerequisite);
    assert(g.transact(p.id,{kind:'skill',id,item:id}).ok,'purchase '+id);purchases.push(id);}
  buy(handling==='port'?bulwarkIds.port:handling==='pivot'?bulwarkIds.pivot:bulwarkIds.entry);
  if(talent){const node=data.skills.find(node=>node.classId==='tank'&&'transform'in node&&node.transform===talent);assert(node);buy(node.id);}
  if(weapon&&p.weapon!==weapon)assert(g.transact(p.id,{kind:'weapon',id:'weapon',item:weapon}).ok);
  beforeStart?.(g,p,buy);assert(g.start());g.boss.staggerUntil=500;
  const arena=structuredClone(g.arena);Object.defineProperty(g,'arena',{get:()=>arena});
  const aim=givenAim??Math.atan2(g.boss.y-p.y,g.boss.x-p.x),normal={x:Math.cos(aim),y:Math.sin(aim)},side={x:-normal.y,y:normal.x};
  let sequence=0;
  const panels=()=>access.classKits.cues().filter((cue):cue is Construct=>cue.kind==='wall'&&cue.owner===p.id);
  const status=()=>access.classKits.tankPortStatus(p.id),carried=()=>access.classKits.tankWallCarried(p.id,g.combatTick);
  function step(input:Partial<InputFrame>={}){assert(g.submitInput(p.id,{...idleInput(),sequence:++sequence,clientTick:g.combatTick,aim,...input}));g.step();return g.drainEvents();}
  if(givenAim!==undefined)for(let n=0;n<30;n++)step({moveY:-.7});
  step({q:true});const initial=panels(),qAt=p.qAt;assert(initial.length);
  const center={x:initial.reduce((sum,w)=>sum+w.x,0)/initial.length,y:initial.reduce((sum,w)=>sum+w.y,0)/initial.length};
  const target={x:center.x-normal.x*32,y:center.y-normal.y*32};
  for(let n=0;n<40&&distance(p,target)>.4;n++){const length=Math.max(distance(p,target),g.movementSpeed(p)/HZ);step({moveX:(target.x-p.x)/length,moveY:(target.y-p.y)/length});}
  assert(distance(p,target)<=.4);step({technique1:true});assert(carried());
  function begin(){const events=step({technique2:true});assert.equal(status().phase,'opening');assert(events.some(event=>event.type==='sound'&&event.id==='tank-wall-port-open'));return status().until;}
  function settle(){for(let n=0;['opening','closing'].includes(status().phase)&&n<8;n++)step();assert(!['opening','closing'].includes(status().phase));}
  function open(){begin();settle();assert.equal(status().phase,'open');}
  function hostile({along=0,radius=3,damage=25}:{along?:number;radius?:number;damage?:number}={}){
    while(g.combatTick<p.invulnerableUntil)step();
    const from={x:p.x+normal.x*100+side.x*along,y:p.y+normal.y*100+side.y*along},health=p.health,shield=p.shield,previous=panels();
    const shot=access.emitShot('hostile',from.x,from.y,wrap(aim+Math.PI),900,damage,radius);assert(shot);
    for(let n=0;n<8&&g.shots.has(shot.id);n++)step();assert(!g.shots.has(shot.id));
    const wallLoss=previous.reduce((sum,wall)=>sum+wall.health-(panels().find(w=>w.id===wall.id)?.health??0),0);
    return {wallLoss,actorLoss:health-p.health,shieldLoss:shield-p.shield,shot:shot.id};
  }
  return {g,access,p,aim,normal,side,panels,initial,qAt,status,carried,step,begin,settle,open,hostile,purchases};
}
