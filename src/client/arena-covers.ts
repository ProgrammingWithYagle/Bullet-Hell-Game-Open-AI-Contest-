import { runtimeArena,runtimeArenas } from '../shared/arena-layouts.ts';
import library from '../../assets/production/arena-cover-surfaces/library-v2.json';
import type { Rect } from '../shared/geometry.ts';
export const arenaCoverArt = library;
export function preloadArenaCovers(loader: {image(key:string,url:string):unknown}, urls:Record<string,string>){
  for(const surface of library.entries){
    if(!urls[surface.id])throw Error('Missing painted arena cover: '+surface.id);
    loader.image(surface.texture,urls[surface.id]);
  }
}
export function arenaCoverPlan(id: string,difficulty='normal') {
  const arena = runtimeArena(id,difficulty);
  const cover=id==='gatehouse'?arena.cover.slice(runtimeArenas.find(a=>a.id===id)!.cover.length):arena.cover;
  const surface=library.entries.find(entry=>entry.id===id);
  if(!surface)throw Error('Missing painted arena cover: '+id);
  return cover.map(rect=>({...rect,texture:surface.texture}));
}
export function arenaCoverPlacement(id:string,rect:Rect){
  const surface=library.entries.find(entry=>entry.id===id);if(!surface)throw Error('Unknown cover surface');
  const vertical=rect.height>rect.width,minor=Math.min(rect.width,rect.height),major=Math.max(rect.width,rect.height);
  const scale=minor/surface.height;
  return {x:rect.x+rect.width/2,y:rect.y+rect.height/2,texture:surface.texture,
    width:major/scale,height:surface.height,cap:surface.cap,scale,rotation:vertical?Math.PI/2:0};
}
// Three horizontal slices preserve painted end caps; the same dimensions drive Phaser.
export function arenaCoverPreview(id:string,rect:Rect,url:string){
  const surface=library.entries.find(entry=>entry.id===id);if(!surface||!url)throw Error('Missing cover preview surface: '+id);
  const p=arenaCoverPlacement(id,rect),edge=p.cap*p.scale,major=p.width*p.scale,minor=p.height*p.scale;
  const sections=[[0,p.cap,-major/2,edge],[p.cap,surface.width-2*p.cap,-major/2+edge,major-2*edge],[surface.width-p.cap,p.cap,major/2-edge,edge]];
  const safe=url.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  return `<g class="arena-cover-painted" transform="translate(${p.x} ${p.y}) rotate(${p.rotation*180/Math.PI})">${sections.map(([sx,sw,x,w])=>`<svg x="${x}" y="${-minor/2}" width="${w}" height="${minor}" viewBox="${sx} 0 ${sw} ${surface.height}" preserveAspectRatio="none" overflow="hidden"><image href="${safe}" width="${surface.width}" height="${surface.height}"/></svg>`).join('')}</g>`;
}
