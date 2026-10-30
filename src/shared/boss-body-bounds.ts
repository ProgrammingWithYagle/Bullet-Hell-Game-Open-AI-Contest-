import footprints from './boss-body-bounds.json';
import {clamp,segmentRect,type Rect} from './geometry.ts';
import type {Vec} from './protocol.ts';
const entries=new Map(footprints.entries.map(entry=>[entry.bossId,entry]));

/** Bounds for the ground anchor, including full poses, loading references and drawn lifts. */
export function bossMovementBounds(id:string,bounds:Rect,radius:number):Rect {
  const entry=entries.get(id);if(!entry)throw Error('Missing boss body footprint: '+id);
  const margin=(amount:number)=>Math.max(radius+footprints.padding,Math.ceil(amount)+footprints.padding);
  const left=margin(entry.extents.left),right=margin(entry.extents.right),top=margin(entry.extents.top),bottom=margin(entry.extents.bottom);
  if(bounds.width<=left+right||bounds.height<=top+bottom)throw Error('Arena too small for complete boss body: '+id);
  return {x:bounds.x+left,y:bounds.y+top,width:bounds.width-left-right,height:bounds.height-top-bottom};
}

/** Boss-route constraints; players and ordinary projectile collisions keep the real arena walls. */
export function bossBorderObstacles(id:string,bounds:Rect,radius:number):Rect[] {
  const b=bossMovementBounds(id,bounds,radius);
  return [
    {x:bounds.x-radius,y:bounds.y-radius,width:b.x-bounds.x,height:bounds.height+radius*2},
    {x:b.x+b.width+radius,y:bounds.y-radius,width:bounds.x+bounds.width-b.x-b.width,height:bounds.height+radius*2},
    {x:bounds.x-radius,y:bounds.y-radius,width:bounds.width+radius*2,height:b.y-bounds.y},
    {x:bounds.x-radius,y:b.y+b.height+radius,width:bounds.width+radius*2,height:bounds.y+bounds.height-b.y-b.height},
  ];
}

export function bossFloorPosition(id:string,wanted:Vec,radius:number,bounds:Rect,obstacles:Rect[],reachableFrom?:Vec):Vec {
  const b=bossMovementBounds(id,bounds,radius);
  const fit=(p:Vec)=>({x:clamp(p.x,b.x+1,b.x+b.width-1),y:clamp(p.y,b.y+1,b.y+b.height-1)});
  const clear=(p:Vec)=>!obstacles.some(o=>segmentRect(p,p,o,radius+1)!==null);
  if(reachableFrom) {
    // Full artwork can remove a narrow edge passage. Deploy in the component
    // reached from the survivors, rather than stranding the boss behind cover.
    const anchor=bossFloorPosition(id,reachableFrom,radius,bounds,obstacles),step=32;
    const nx=Math.ceil((b.width-2)/step)+1,ny=Math.ceil((b.height-2)/step)+1;
    const nodes=Array.from({length:nx*ny},(_,i)=>({x:b.x+1+(i%nx)*(b.width-2)/(nx-1),y:b.y+1+Math.floor(i/nx)*(b.height-2)/(ny-1)}));
    const valid=nodes.map(clear),seen=new Uint8Array(nodes.length),queue:number[]=[];
    const connected=(a:Vec,z:Vec)=>!obstacles.some(o=>segmentRect(a,z,o,radius+1)!==null);
    for(let i=0;i<nodes.length;i++)if(valid[i]&&Math.hypot(nodes[i].x-anchor.x,nodes[i].y-anchor.y)<=step*1.5&&connected(anchor,nodes[i])){seen[i]=1;queue.push(i);}
    for(let head=0;head<queue.length;head++){
      const i=queue[head],x=i%nx,y=Math.floor(i/nx);
      for(const j of [x?i-1:-1,x<nx-1?i+1:-1,y?i-nx:-1,y<ny-1?i+nx:-1])
        if(j>=0&&!seen[j]&&valid[j]&&connected(nodes[i],nodes[j])){seen[j]=1;queue.push(j);}
    }
    if(!queue.length)throw Error('No reachable boss floor component: '+id);
    const preferred=fit(wanted);
    if(clear(preferred)&&queue.some(i=>Math.hypot(nodes[i].x-preferred.x,nodes[i].y-preferred.y)<=step*1.5&&connected(preferred,nodes[i])))return preferred;
    return nodes[queue.reduce((best,i)=>Math.hypot(nodes[i].x-wanted.x,nodes[i].y-wanted.y)<Math.hypot(nodes[best].x-wanted.x,nodes[best].y-wanted.y)?i:best,queue[0])];
  }
  for(const offset of [0,32,64,96,160,240,320])for(let side=0;side<8;side++){
    const p=fit({x:wanted.x+Math.cos(side*Math.PI/4)*offset,y:wanted.y+Math.sin(side*Math.PI/4)*offset});
    if(clear(p))return p;
  }
  for(let row=0;row<=8;row++)for(let col=0;col<=10;col++){
    const p=fit({x:b.x+b.width*col/10,y:b.y+b.height*row/8});if(clear(p))return p;
  }
  throw Error('No clear boss deployment inside painted floor: '+id);
}
