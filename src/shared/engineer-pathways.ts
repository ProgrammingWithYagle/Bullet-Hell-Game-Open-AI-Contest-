import catalog from '../../content/catalog.json';
import {distance,segmentCircle,segmentRect,type Rect} from './geometry.ts';
import type {Vec} from './protocol.ts';
export function engineerQNameKey(p:{classId:string;skills:readonly string[]}) {return p.classId==='engineer'?['engineer-machinery-1','engineer-traps-1'].find(id=>p.skills.includes(id)):undefined;}
export const engineerRules=catalog.rules.engineerPathways;
export type EngineerCharge=Vec & {
  kind:'engineer-charge';id:number;owner:string;radius:number;at:number;until:number;
  armedAt:number;detonateAt:number;state:'arming'|'ready'|'fuse'|'spent';
};
export const chargePoint=(p:Vec & {aim:number})=>({x:p.x+Math.cos(p.aim)*engineerRules.chargeReach,y:p.y+Math.sin(p.aim)*engineerRules.chargeReach});
/** Reject blocked deployment and lava crossings; never silently move a charge. */
export function chargeLegal(point:Vec,origin:Vec,c:{obstacles:Rect[];terrain?:{bounds:Rect;lava:readonly (Vec & {radius:number})[]}},radius=engineerRules.chargeBodyRadius){
  if(!c.terrain||!Number.isFinite(point.x)||!Number.isFinite(point.y))return false;
  const {bounds:b,lava}=c.terrain;
  return point.x>=b.x+radius&&point.x<=b.x+b.width-radius&&point.y>=b.y+radius&&point.y<=b.y+b.height-radius&&
    !c.obstacles.some(w=>segmentRect(point,point,w,radius)!==null||segmentRect(origin,point,w,radius)!==null)&&
    !lava.some(l=>distance(point,l)<=l.radius+radius||segmentCircle(origin,point,l,l.radius+radius)!==null);
}
