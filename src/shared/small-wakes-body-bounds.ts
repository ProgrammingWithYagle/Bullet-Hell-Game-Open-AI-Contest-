import footprints from './small-wakes-body-bounds.json';
import {clamp,segmentRect,type Rect} from './geometry.ts';
import type {Vec} from './protocol.ts';

export function smallWakesMovementBounds(id:string,bounds:Rect,radius:number):Rect|null{
  const entry=footprints.entries.find(e=>e.bossId===id);if(!entry)return null;
  const margin=(amount:number)=>Math.max(radius+footprints.padding,Math.ceil(amount)+footprints.padding);
  const left=margin(entry.extents.left),right=margin(entry.extents.right),top=margin(entry.extents.top),bottom=margin(entry.extents.bottom);
  if(bounds.width<=left+right||bounds.height<=top+bottom)throw Error('Arena too small for visible Small Wakes body');
  return {x:bounds.x+left,y:bounds.y+top,width:bounds.width-left-right,height:bounds.height-top-bottom};
}
export function smallWakesBorderObstacles(id:string,bounds:Rect,radius:number):Rect[]{
  const b=smallWakesMovementBounds(id,bounds,radius);if(!b)return [];
  return [
    {x:bounds.x-radius,y:bounds.y-radius,width:b.x-bounds.x,height:bounds.height+radius*2},
    {x:b.x+b.width+radius,y:bounds.y-radius,width:bounds.x+bounds.width-b.x-b.width,height:bounds.height+radius*2},
    {x:bounds.x-radius,y:bounds.y-radius,width:bounds.width+radius*2,height:b.y-bounds.y},
    {x:bounds.x-radius,y:b.y+b.height+radius,width:bounds.width+radius*2,height:bounds.y+bounds.height-b.y-b.height},
  ];
}
export function smallWakesSpawn(id:string,wanted:Vec,radius:number,bounds:Rect,obstacles:Rect[]):Vec{
  const b=smallWakesMovementBounds(id,bounds,radius);if(!b)return wanted;
  const fit=(p:Vec)=>({x:clamp(p.x,b.x+1,b.x+b.width-1),y:clamp(p.y,b.y+1,b.y+b.height-1)});
  const clear=(p:Vec)=>!obstacles.some(o=>segmentRect(p,p,o,radius+1)!==null);
  for(const offset of [0,32,64,96,160,240,320])for(let side=0;side<8;side++){
    const p=fit({x:wanted.x+Math.cos(side*Math.PI/4)*offset,y:wanted.y+Math.sin(side*Math.PI/4)*offset});
    if(clear(p))return p;
  }
  for(let row=0;row<=8;row++)for(let col=0;col<=10;col++){
    const p=fit({x:b.x+b.width*col/10,y:b.y+b.height*row/8});if(clear(p))return p;
  }
  throw Error('No clear Small Wakes deployment inside painted floor');
}
