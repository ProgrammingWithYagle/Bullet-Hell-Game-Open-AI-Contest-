import library from '../../assets/production/arena-worlds/library.json';
import {runtimeArena} from '../shared/arena-layouts.ts';
import {escape as e} from './ui/html.ts';
export const arenaWorldArt=library;
export function arenaWorldPlacement(id:string){
  if(id==='gatehouse')return null;
  const entry=library.entries.find(item=>item.id===id),arena=runtimeArena(id);
  if(!entry||(['x','y','width','height'] as const).some(key=>entry.playableBounds[key]!==arena.bounds[key]))throw Error('Arena world geometry differs');
  const [left,top,right,bottom]=entry.clearRect;
  const caps={left,right:entry.width-right,top,bottom:entry.height-bottom};
  const scale=96/Math.max(caps.left,caps.right,caps.top,caps.bottom);
  const width=arena.width/scale+caps.left+caps.right,height=arena.height/scale+caps.top+caps.bottom;
  const x=arena.bounds.x-caps.left*scale,y=arena.bounds.y-caps.top*scale;
  return {entry,caps,scale,width,height,x:x+width*scale/2,y:y+height*scale/2,
    sourceX:[0,left,right,entry.width],sourceY:[0,top,bottom,entry.height],
    targetX:[x,arena.bounds.x,arena.bounds.x+arena.width,x+width*scale],
    targetY:[y,arena.bounds.y,arena.bounds.y+arena.height,y+height*scale]};
}
export function preloadArenaWorlds(loader:{image(key:string,url:string):unknown},urls:Record<string,string>){
  for(const entry of library.entries){if(!urls[entry.id])throw Error('Missing painted arena world: '+entry.id);loader.image(entry.texture,urls[entry.id]);}
}
export function arenaWorldTiles(id:string){
  const p=arenaWorldPlacement(id);if(!p)return [];
  const count=(length:number,native:number)=>Math.max(1,2*Math.round((length/(native*p.scale)-1)/2)+1);
  const cols=count(p.targetX[2]-p.targetX[1],p.sourceX[2]-p.sourceX[1]);
  const rows=count(p.targetY[2]-p.targetY[1],p.sourceY[2]-p.sourceY[1]);
  const tiles=[];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    if(row===1&&col===1)continue;
    const nx=col===1?cols:1,ny=row===1?rows:1;
    const width=(p.targetX[col+1]-p.targetX[col])/nx,height=(p.targetY[row+1]-p.targetY[row])/ny;
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)tiles.push({frame:'world-'+row+'-'+col,
      source:{x:p.sourceX[col],y:p.sourceY[row],width:p.sourceX[col+1]-p.sourceX[col],height:p.sourceY[row+1]-p.sourceY[row]},
      x:p.targetX[col]+x*width,y:p.targetY[row]+y*height,width,height,flipX:x%2===1,flipY:y%2===1});
  }return tiles;
}
export function arenaWorldPreview(id:string,url:string){
  const p=arenaWorldPlacement(id);if(!p)return '';
  if(!url)throw Error('Missing painted arena world preview');
  return arenaWorldTiles(id).map(tile=>{
    const s=tile.source,tx=tile.flipX?s.x*2+s.width:0,ty=tile.flipY?s.y*2+s.height:0;
    return `<svg class="arena-world-painted" x="${tile.x}" y="${tile.y}" width="${tile.width}" height="${tile.height}" viewBox="${s.x} ${s.y} ${s.width} ${s.height}" preserveAspectRatio="none" overflow="hidden"><image href="${e(url)}" width="${p.entry.width}" height="${p.entry.height}" opacity=".8" transform="translate(${tx} ${ty}) scale(${tile.flipX?-1:1} ${tile.flipY?-1:1})"/></svg>`;
  }).join('');
}
