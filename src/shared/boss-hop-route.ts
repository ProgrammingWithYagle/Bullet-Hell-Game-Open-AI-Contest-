import {clamp,distance,segmentRect,type Rect} from './geometry.ts';
import type {Vec} from './protocol.ts';

/** A short, straight, body-clear hop along a connected path around cover. */
export function bossHopRoute(from:Vec,target:Vec,radius:number,bounds:Rect,obstacles:Rect[],maximum=280):Vec {
  const pad=radius+10,step=32;
  const clear=(a:Vec,b:Vec)=>!obstacles.some(o=>segmentRect(a,b,o,radius+1)!==null);
  const goal={x:clamp(target.x,bounds.x+pad,bounds.x+bounds.width-pad),y:clamp(target.y,bounds.y+pad,bounds.y+bounds.height-pad)};
  const length=distance(from,goal);
  const direct=length?{x:from.x+(goal.x-from.x)*Math.min(1,maximum/length),y:from.y+(goal.y-from.y)*Math.min(1,maximum/length)}:{...from};
  // Keep taking the detour until the target itself is in clear sight. A short
  // clear step toward a target behind a wall can otherwise undo the last hop.
  if(clear(from,goal))return direct;
  const nx=Math.ceil((bounds.width-pad*2)/step)+1,ny=Math.ceil((bounds.height-pad*2)/step)+1;
  if(nx<2||ny<2||nx*ny>3000)return {...from};
  const nodes=Array.from({length:nx*ny},(_,i)=>({x:bounds.x+pad+(i%nx)*(bounds.width-pad*2)/(nx-1),y:bounds.y+pad+Math.floor(i/nx)*(bounds.height-pad*2)/(ny-1)}));
  const valid=nodes.map(p=>clear(p,p)),parent=new Int32Array(nodes.length).fill(-2),queue:number[]=[];
  for(let i=0;i<nodes.length;i++)if(valid[i]&&distance(from,nodes[i])<step*2&&clear(from,nodes[i])){parent[i]=-1;queue.push(i);}
  for(let head=0;head<queue.length;head++){
    const i=queue[head],x=i%nx,y=Math.floor(i/nx);
    for(const j of [x?i-1:-1,x<nx-1?i+1:-1,y?i-nx:-1,y<ny-1?i+nx:-1])
      if(j>=0&&parent[j]===-2&&valid[j]&&clear(nodes[i],nodes[j])){parent[j]=i;queue.push(j);}
  }
  if(!queue.length)return {...from};
  const best=queue.reduce((best,i)=>distance(nodes[i],goal)<distance(nodes[best],goal)?i:best,queue[0]);
  const path:Vec[]=[];for(let i=best;i>=0;i=parent[i])path.push(nodes[i]);path.reverse();
  let end={...from};
  for(const point of path){if(distance(from,point)>maximum||!clear(from,point))break;end={...point};}
  return end;
}
