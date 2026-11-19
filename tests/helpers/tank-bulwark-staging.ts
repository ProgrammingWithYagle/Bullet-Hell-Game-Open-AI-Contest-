import {data} from '../../src/shared/game.ts';
import {runtimeArena} from '../../src/shared/arena-layouts.ts';
import {gateObstacles} from '../../src/shared/civic-director.ts';
import {endlessSolids} from '../../src/shared/endless-director.ts';
import {distance,moveBody,segmentCircle} from '../../src/shared/geometry.ts';
import type {Vec} from '../../src/shared/protocol.ts';
import {wallFootprintClear,type BulwarkWorld} from '../../src/shared/tank-bulwark.ts';
import type {View} from '../../src/shared/view.ts';

export const stagingBearings=[-Math.PI/2,0,Math.PI,Math.PI/2,-Math.PI/4,Math.PI/4] as const;
export function bulwarkTrialWorld(view:View):BulwarkWorld{
 const arena=runtimeArena(view.arenaId,view.run.difficulty);
 return {...arena,tick:view.combatTick,obstacles:[...arena.obstacles,...gateObstacles(view.bossCues,view.combatTick),...endlessSolids(view.bossCues,view.combatTick)]};
}
const inside=(world:BulwarkWorld,p:Vec,pad:number)=>p.x>=world.bounds.x+pad&&p.y>=world.bounds.y+pad&&p.x<=world.bounds.x+world.bounds.width-pad&&p.y<=world.bounds.y+world.bounds.height-pad;
export function clearTrialWalk(world:BulwarkWorld,from:Vec,to:Vec){
 const radius=data.rules.playerRadius;
 if(!inside(world,to,radius+2)||!inside(world,from,radius-.18))return false;
 if(world.obstacles.some(wall=>to.x>=wall.x-radius-2&&to.x<=wall.x+wall.width+radius+2&&to.y>=wall.y-radius-2&&to.y<=wall.y+wall.height+radius+2))return false;
 // Sweep back from the clear destination. Public coordinates can touch the inclusive
 // masonry boundary even when the real body is just outside it. This previews an
 // outward command without treating the rounded origin as an immovable interior.
 // Only the last observation allows sub-pixel uncertainty; actual movement still
 // has to arrive through ordinary acknowledged inputs.
 const steps=Math.max(1,Math.ceil(distance(from,to)/3));let previous=to;
 for(let step=1;step<=steps;step++){
  const next={x:to.x+(from.x-to.x)*step/steps,y:to.y+(from.y-to.y)*step/steps};
  if(distance(moveBody(previous,{x:next.x-previous.x,y:next.y-previous.y},radius,[...world.obstacles]),next)>(step===steps?.18:.1))return false;
  previous=next;
 }
 return !world.lavaPits.some(pit=>segmentCircle(from,to,pit,pit.radius+radius+2)!==null);
}
/** Preview only. The actual issued Q must still execute and provide its own original panel. */
export function trialCastClear(world:BulwarkWorld,from:Vec,aim:number){
 const normal={x:Math.cos(aim),y:Math.sin(aim)},end={x:from.x+normal.x*100,y:from.y+normal.y*100};
 // ClassKits.point uses a20px body sweep; an unobstructed distant footprint alone is insufficient.
 if(distance(moveBody(from,{x:normal.x*100,y:normal.y*100},22,[...world.obstacles]),end)>.1)return false;
 const conservative={...world,bounds:{x:world.bounds.x+2,y:world.bounds.y+2,width:world.bounds.width-4,height:world.bounds.height-4},obstacles:world.obstacles.map(wall=>({x:wall.x-2,y:wall.y-2,width:wall.width+4,height:wall.height+4}))};
 if(![50,65,80,100].every(length=>wallFootprintClear(conservative,{x:from.x+normal.x*length,y:from.y+normal.y*length},normal,112)))return false;
 return clearTrialWalk(world,from,{x:end.x-normal.x*32,y:end.y-normal.y*32});
}
export type StagingRoute={aim:number;points:Vec[];searched:number;from:Vec;goal:Vec};
/** Require a real compact-only destination reachable with the carried panel. */
export function compactSetdownTarget(world:BulwarkWorld,rear:Vec,aim:number){
 const normal={x:Math.cos(aim),y:Math.sin(aim)}, side={x:-normal.y,y:normal.x};
 const along=(body:Vec,n:number)=>({x:body.x+n*side.x,y:body.y+n*side.y});
 const fit=(body:Vec,span:number)=>wallFootprintClear(world,
  {x:body.x+32*normal.x,y:body.y+32*normal.y},normal,span);
 for(const sign of [-1,1])for(let distance=24;distance<=104;distance+=4){
  const n=sign*distance,target=along(rear,n);
  // Leave extra room around the predicted compact footprint and choose a
  // target deep enough into the full setdown obstruction for net rounding.
  if(fit(target,104)||!clearTrialWalk(world,rear,target))continue;
  if(!Array.from({length:distance/4+1},(_,i)=>along(rear,sign*4*i)).every(at=>fit(at,58)))continue;
  return target;
 }
}
/** Harness-only manual staging on acknowledged geometry. Never moves a player or modifies terrain. */
export function planBulwarkStaging(world:BulwarkWorld,start:Vec,threats:readonly Vec[]=[],
  choose:(body:Vec,aim:number)=>boolean=()=>true):StagingRoute|undefined{
 const step=32,queue:{p:Vec;x:number;y:number;parent:number}[]=[{p:{x:start.x,y:start.y},x:0,y:0,parent:-1}],seen=new Set(['0:0']);
 for(let at=0;at<queue.length&&at<640;at++){
  const node=queue[at],safe=!threats.length||threats.every(threat=>distance(node.p,threat)>=320);
  if(safe){
   const aim=stagingBearings.filter(aim=>trialCastClear(world,node.p,aim)&&choose(node.p,aim)).sort((a,b)=>{
    const clearance=(angle:number)=>Math.min(...threats.map(threat=>distance(threat,{x:node.p.x+Math.cos(angle)*100,y:node.p.y+Math.sin(angle)*100})),10000);
    return clearance(b)-clearance(a);
   })[0];
   if(aim!==undefined){const points:Vec[]=[];for(let index=at;queue[index].parent>=0;index=queue[index].parent)points.unshift(queue[index].p);
    return {aim,points,searched:at+1,from:{x:start.x,y:start.y},goal:node.p};}
  }
  for(const [dx,dy]of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=node.x+dx,y=node.y+dy,key=x+':'+y;if(seen.has(key))continue;seen.add(key);
   const p={x:start.x+x*step,y:start.y+y*step};if(!clearTrialWalk(world,node.p,p))continue;
   queue.push({p,x,y,parent:at});
  }
 }
}
