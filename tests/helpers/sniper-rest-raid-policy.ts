import {runtimeArena}from '../../src/shared/arena-layouts.ts';import {moveBody,segmentRect}from '../../src/shared/geometry.ts';import {HZ,type Shot,type InputFrame}from '../../src/shared/protocol.ts';import type{View,PlayerView}from '../../src/shared/view.ts';
export type ObservedRestShot=Shot&{seenAt:number};
/** Test-only visible-state control policy. It changes no game rules, clocks or resources. */
export function restRaidInput(view:View,p:PlayerView,shots:readonly ObservedRestShot[]):Partial<InputFrame>{
 const now=view.combatTick,arena=runtimeArena(view.arenaId,view.run.difficulty),boss=view.boss,dx=boss.x-p.x,dy=boss.y-p.y,dist=Math.hypot(dx,dy)||1,tangent={x:-dy/dist,y:dx/dist},owners=new Set(view.players.map(p=>p.id));
 const hostile=shots.filter(s=>!owners.has(s.owner)&&s.expires>now).map(s=>({...s,x:s.x+s.vx*Math.max(0,now-s.seenAt)/HZ,y:s.y+s.vy*Math.max(0,now-s.seenAt)/HZ})).filter(s=>Math.hypot(s.x-p.x,s.y-p.y)<550);
 const choice=[{x:0,y:0},...Array.from({length:16},(_,i)=>({x:Math.cos(i*Math.PI/8),y:Math.sin(i*Math.PI/8)}))].map(move=>{
  const point=moveBody(p,{x:move.x*p.speed*.3,y:move.y*p.speed*.3},18,arena.obstacles),vx=(point.x-p.x)/.3,vy=(point.y-p.y)/.3;let danger=0;
  for(const s of hostile){const rx=s.x-p.x,ry=s.y-p.y,ux=s.vx-vx,uy=s.vy-vy,t=Math.max(0,Math.min(.45,-(rx*ux+ry*uy)/(ux*ux+uy*uy||1))),near=Math.hypot(rx+ux*t,ry+uy*t)-s.radius-18;danger+=near<0?600:near<65?150/(near+4):0;}
  for(const w of view.warnings)if(w.kind==='zone'&&w.until-now<HZ&&Math.hypot(point.x-w.x,point.y-w.y)<w.radius+24)danger+=350;
  for(const field of view.fields)if(field.kind==='zone'&&field.owner!=='solo'&&!owners.has(field.owner)&&Math.hypot(point.x-field.x,point.y-field.y)<field.radius+24)danger+=350;
  for(const lava of arena.lavaPits)if(Math.hypot(point.x-lava.x,point.y-lava.y)<lava.radius+24)danger+=800;
  const b=arena.bounds;if(point.x<b.x+18||point.y<b.y+18||point.x>b.x+b.width-18||point.y>b.y+b.height-18)danger+=1000;
  const range=Math.hypot(point.x-boss.x,point.y-boss.y),blocked=arena.obstacles.some(w=>segmentRect(point,boss,w,3)!==null),moving=move.x!==0||move.y!==0;
  return{x:move.x,y:move.y,danger,score:danger+Math.abs(range-240)*.04+(range<95?180:0)+(blocked?24:0)+(moving?-.7*(move.x*tangent.x+move.y*tangent.y):Math.abs(dist-240)<55?-1.5:1)};
 }).sort((a,b)=>a.score-b.score)[0];
 return{clientTick:now,moveX:choice.x,moveY:choice.y,aim:Math.atan2(dy,dx),fire:true,q:p.qAt<=now,e:p.eAt<=now,ultimate:p.ultimateAt<=now,dodge:now%15===0&&choice.danger>180,supply:p.health<p.maxHealth-35?p.supplies.findIndex(s=>s.id==='medkit'&&s.count>0):-1,interact:p.status==='downed'};
}
