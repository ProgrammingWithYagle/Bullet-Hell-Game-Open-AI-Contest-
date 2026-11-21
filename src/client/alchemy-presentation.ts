import type { PlayerView, View } from '../shared/view.ts';
import type { AlchemyCue } from '../shared/alchemist-kit.ts';
import type { RangerGraphics } from './ranger-presentation.ts';
import rules from '../shared/alchemy-rules.json';

type AlchemyGesture = Omit<AlchemyCue,'kind'> & {kind:'alchemy-brew'|'alchemy-flask'};
export function alchemyActionCue(p:PlayerView,view:View,now:number){
  if(p.classId!=='alchemist'||!p.connected||p.status!=='active'||view.phase!=='combat'||now<p.dashUntil)return undefined;
  return view.classCues.filter((c):c is AlchemyGesture=>c.owner===p.id&&(c.kind==='alchemy-brew'||c.kind==='alchemy-flask')&&now>=c.at&&now<c.until).sort((a,b)=>b.id-a.id)[0];
}
/** Brewing follows the actual commitment. A committed instant throw starts at release. */
export function alchemyActionFrame(c:AlchemyGesture,now:number,frames:number,reduced=false){
  const t=Math.min(1,Math.max(0,(now-c.at)/Math.max(1,c.until-c.at)));
  if(c.kind==='alchemy-brew')return reduced?Math.min(1,frames-1):Math.min(frames-1,Math.floor(t*frames));
  const release=Math.min(2,frames-1);
  return reduced?release:Math.min(frames-1,release+Math.floor(t*(frames-release)));
}

export function alchemyCommitBlocked(p: PlayerView, slot: string, now: number) {
  if (p.classId !== 'alchemist' || !['q','e','ultimate'].includes(slot)) return false;
  if (now < p.dashUntil || now < (p.kit.alchemyBrewUntil ?? 0)) return true;
  if (slot === 'e') return !p.kit.alchemyPrepared?.length;
  if (slot !== 'q') return false;
  const cost = rules.recipes[p.kit.alchemyRecipe ?? 'flare'].cost;
  return (p.kit.alchemyPrepared?.length ?? 0) >= (p.kit.alchemyCapacity ?? 2) || (p.kit.alchemyCinder ?? 3) < cost.cinder || (p.kit.alchemyChalk ?? 3) < cost.chalk || (p.kit.alchemySap ?? 3) < cost.sap;
}
/** A received speed already includes its brew penalty. Restore it after expiry/dodge once. */
export function alchemyPredictedSpeed(p: PlayerView, now: number) {
  if (p.classId !== 'alchemist') return p.speed;
  const scale = p.kit.alchemyBrewMovement ?? 1;
  return p.speed / scale * (now < (p.kit.alchemyBrewUntil ?? 0) ? scale : 1);
}
export function cancelPredictedBrew(p: PlayerView) {
  if (p.classId !== 'alchemist') return;
  p.speed /= p.kit.alchemyBrewMovement ?? 1;
  p.kit = {...p.kit, alchemyBrewUntil: 0, alchemyBrewMovement: 1};
}
export function drawAlchemyCue(g: RangerGraphics, c: AlchemyCue, now: number, owner: string) {
  if (now < c.at || now >= c.until) return;
  const color = c.recipe === 'flare' ? 0xd58c55 : c.recipe === 'binding' ? 0xa7b4bd : 0x85b49b;
  const alpha = c.owner === owner ? .85 : .4;
  if (c.kind === 'alchemy-flask') {
    const t = Math.min(1, Math.max(0, (now - c.at) / (c.until - c.at)));
    // The landing remains visible while the small vial follows a visual arc.
    g.lineStyle(1, color, alpha * .65).strokeCircle(c.x2, c.y2, c.radius);
    g.lineStyle(1, color, alpha * .4).lineBetween(c.x, c.y, c.x2, c.y2);
    g.fillStyle(color, alpha).fillCircle(c.x + (c.x2 - c.x) * t, c.y + (c.y2 - c.y) * t - Math.sin(t * Math.PI) * 24, 4);
  } else if (c.kind === 'alchemy-brew') {
    g.lineStyle(2, color, alpha).strokeCircle(c.x, c.y, 14);
  } else {
    g.fillStyle(color, alpha * (c.kind === 'alchemy-combination' ? .2 : .09)).fillCircle(c.x, c.y, c.radius);
    g.lineStyle(c.empowered ? 2 : 1, color, alpha * .7).strokeCircle(c.x, c.y, c.radius);
    // Shapes supplement color: flare has a cross, binding two bars, mending a small circle.
    if (c.recipe === 'flare') {g.lineBetween(c.x-5,c.y,c.x+5,c.y);g.lineBetween(c.x,c.y-5,c.x,c.y+5);}
    else if (c.recipe === 'binding') {g.lineBetween(c.x-6,c.y-3,c.x+6,c.y-3);g.lineBetween(c.x-6,c.y+3,c.x+6,c.y+3);}
    else g.strokeCircle(c.x,c.y,5);
  }
}
