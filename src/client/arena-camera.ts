import {retinueArt} from './retinue-presentation.ts';
import summonRules from '../shared/summoner-rules.json';
import catalog from '../../content/catalog.json';
import footprints from '../shared/boss-body-bounds.json';
import {survivorArt} from './survivor-presentation.ts';
import {survivorActionArt} from './survivor-action-presentation.ts';
import {heavyArt} from './heavy-presentation.ts';
import type {Vec} from '../shared/protocol.ts';

// Stable framing for each map: tall art has space beyond its ground anchor,
// without taking walkable passages away from players or moving bosses.
const margins={left:16,right:16,top:16,bottom:16};
for(const entry of footprints.entries){
  const radius=catalog.bosses.find(b=>b.id===entry.bossId)!.radius;
  for(const side of ['left','right','top','bottom'] as const)margins[side]=Math.max(margins[side],Math.ceil(entry.extents[side]-radius)+16);
}
export const survivorCameraClips=[...survivorArt.entries,...survivorArt.references,...survivorActionArt.entries,...heavyArt.entries];
for(const clip of survivorCameraClips){
  const extents={left:clip.displayCell*clip.origin[0],right:clip.displayCell*(1-clip.origin[0]),top:clip.displayCell*clip.origin[1],bottom:clip.displayCell*(1-clip.origin[1])};
  for(const side of ['left','right','top','bottom'] as const)margins[side]=Math.max(margins[side],Math.ceil(extents[side]-catalog.rules.playerRadius)+16);
}
export const retinueCameraClips=retinueArt;
for(const clip of retinueCameraClips){
 const radius=summonRules.kinds[clip.entityKind as keyof typeof summonRules.kinds].radius;
 const extents={left:clip.displayCell*clip.origin[0],right:clip.displayCell*(1-clip.origin[0]),top:clip.displayCell*clip.origin[1],bottom:clip.displayCell*(1-clip.origin[1])};
 for(const side of ['left','right','top','bottom'] as const)margins[side]=Math.max(margins[side],Math.ceil(extents[side]-radius)+16);
}
export const arenaCamera={
  x:-margins.left,y:-margins.top,width:1600+margins.left+margins.right,height:1000+margins.top+margins.bottom,
};
export const arenaCameraZoom=Math.min(1600/arenaCamera.width,1000/arenaCamera.height);
export type ArenaFrame = typeof arenaCamera;
export function arenaCameraForBounds(bounds:ArenaFrame):ArenaFrame {
  // Keep the painted rim, then remove only the unused space outside this map.
  // Intersect with the previous full frame so this can never make the map smaller.
  const x=Math.max(arenaCamera.x,bounds.x-Math.max(96,margins.left));
  const y=Math.max(arenaCamera.y,bounds.y-Math.max(96,margins.top));
  const right=Math.min(arenaCamera.x+arenaCamera.width,bounds.x+bounds.width+Math.max(96,margins.right));
  const bottom=Math.min(arenaCamera.y+arenaCamera.height,bounds.y+bounds.height+Math.max(96,margins.bottom));
  return {x,y,width:right-x,height:bottom-y};
}
export type ArenaViewport = {width:number;height:number};
const defaultViewport={width:1600,height:1000};
export function arenaProjection(viewport:ArenaViewport=defaultViewport,frame:ArenaFrame=arenaCamera) {
  const width=Number.isFinite(viewport.width)&&viewport.width>0?viewport.width:defaultViewport.width;
  const height=Number.isFinite(viewport.height)&&viewport.height>0?viewport.height:defaultViewport.height;
  return {width,height,zoom:Math.min(width/frame.width,height/frame.height),center:{x:frame.x+frame.width/2,y:frame.y+frame.height/2}};
}
export function arenaCanvasToWorld(point:Vec,viewport:ArenaViewport=defaultViewport,frame:ArenaFrame=arenaCamera):Vec {
  const {width,height,zoom,center}=arenaProjection(viewport,frame);
  return {x:center.x+(point.x-width/2)/zoom,y:center.y+(point.y-height/2)/zoom};
}
export function arenaWorldToCanvas(point:Vec,viewport:ArenaViewport=defaultViewport,frame:ArenaFrame=arenaCamera):Vec {
  const {width,height,zoom,center}=arenaProjection(viewport,frame);
  return {x:width/2+(point.x-center.x)*zoom,y:height/2+(point.y-center.y)*zoom};
}
export function applyArenaCamera(camera:{setZoom(value:number):unknown;centerOn(x:number,y:number):unknown;setViewport?(x:number,y:number,width:number,height:number):unknown},viewport:ArenaViewport=defaultViewport,frame:ArenaFrame=arenaCamera) {
  const {width,height,zoom,center}=arenaProjection(viewport,frame);
  camera.setViewport?.(0,0,width,height);
  camera.setZoom(zoom);camera.centerOn(center.x,center.y);
}
export function trackArenaViewport(camera:Parameters<typeof applyArenaCamera>[0],scale:{gameSize:ArenaViewport;on(event:'resize',listener:()=>void):unknown;off(event:'resize',listener:()=>void):unknown},frame=()=>arenaCamera) {
  const fit=()=>applyArenaCamera(camera,scale.gameSize,frame());
  fit();scale.on('resize',fit);
  return ()=>scale.off('resize',fit);
}
