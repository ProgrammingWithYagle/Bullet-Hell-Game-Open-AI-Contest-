import {segmentRect,type Rect} from './geometry.ts';
import {phaseBreakCandidates} from './phase-break-layout.ts';
type Arena={bounds:Rect;width:number;height:number;obstacles:Rect[];bossSpawn:{x:number;y:number};playerSpawn:{x:number;y:number}};
// Reject placements that choke a large boss's existing engagement route.
function bossCanEngage(arena:Arena,obstacles:Rect[]){
 const radius=58,queue=[{x:Math.round(arena.bossSpawn.x/20)*20,y:Math.round(arena.bossSpawn.y/20)*20}],seen=new Set<string>();
 for(let i=0;i<queue.length;i++){
  const p=queue[i],key=p.x+':'+p.y;
  if(seen.has(key)||p.x<arena.bounds.x+radius||p.y<arena.bounds.y+radius||p.x>arena.bounds.x+arena.width-radius||p.y>arena.bounds.y+arena.height-radius||obstacles.some(o=>segmentRect(p,p,o,radius)))continue;
  seen.add(key);if(Math.hypot(p.x-arena.playerSpawn.x,p.y-arena.playerSpawn.y)<=67)return true;
  queue.push({x:p.x+20,y:p.y},{x:p.x-20,y:p.y},{x:p.x,y:p.y+20},{x:p.x,y:p.y-20});
 }return false;
}
export function additionalBabyCover(arena:Arena,count=2):Rect[]{
 const candidates=[[.125,.65],[.875,.65],[.25,.65],[.75,.4],[.3,.2],[.65,.8],[.55,.2],[.18,.5]].map(([x,y])=>({x:arena.bounds.x+arena.width*x,y:arena.bounds.y+arena.height*y}));
 for(let y=arena.bounds.y+180;y<arena.bounds.y+arena.height-100;y+=100)
  for(let x=arena.bounds.x+160;x<arena.bounds.x+arena.width-120;x+=120)candidates.push({x,y});
 const cover:Rect[]=[];
 for(const center of candidates){
  const r={x:center.x-50,y:center.y-32.5,width:100,height:65};
  if(r.x<arena.bounds.x+30||r.y<arena.bounds.y+30||r.x+r.width>arena.bounds.x+arena.width-30||r.y+r.height>arena.bounds.y+arena.height-30)continue;
  if(Math.hypot(center.x-arena.bossSpawn.x,center.y-arena.bossSpawn.y)<170||Math.hypot(center.x-arena.playerSpawn.x,center.y-arena.playerSpawn.y)<210)continue;
  if(phaseBreakCandidates.some(p=>segmentRect(p,p,r,25)))continue;
  if([...arena.obstacles,...cover].some(o=>r.x<o.x+o.width+45&&r.x+r.width>o.x-45&&r.y<o.y+o.height+45&&r.y+r.height>o.y-45))continue;
  if(!bossCanEngage(arena,[...arena.obstacles,...cover,r]))continue;
  cover.push(r);if(cover.length===count)return cover;
 }
 throw Error('Arena cannot fit Baby cover without blocking deployment');
}
