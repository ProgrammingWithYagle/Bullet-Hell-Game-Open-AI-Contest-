import type { CounterstrokeCue } from '../shared/swordsman-counterstroke.ts';
import type { SwordGraphics } from './sword-presentation.ts';

export function drawCounterstroke(g:SwordGraphics,cue:CounterstrokeCue,now:number,reduced:boolean) {
  if (now>=cue.until) return;
  const color=cue.state==='back'?0xe2b482:0xc2d2ce;
  if (cue.state==='guard') {
    g.fillStyle(color,0.72).fillCircle(cue.x+Math.cos(cue.aim)*cue.radius,cue.y+Math.sin(cue.aim)*cue.radius,3);
    return;
  }
  if (cue.state==='needle'||cue.state==='return') {
    const released=cue.state==='return';
    g.lineStyle(released?3:2,color,released?0.53*(cue.until-now)/7:0.42).lineBetween(cue.x,cue.y,
      cue.x+Math.cos(cue.aim)*cue.radius,cue.y+Math.sin(cue.aim)*cue.radius);
    return;
  }
  const cut=cue.state==='cut', segments=reduced?4:9;
  const start=cue.aim-cue.arc/2;
  g.lineStyle(cut?4:2,color,cut?0.75*(cue.until-now)/7:0.48);
  for (let index=0;index<segments;index++) {
    const first=start+cue.arc*index/segments, next=start+cue.arc*(index+1)/segments;
    g.lineBetween(cue.x+Math.cos(first)*cue.radius,cue.y+Math.sin(first)*cue.radius,
      cue.x+Math.cos(next)*cue.radius,cue.y+Math.sin(next)*cue.radius);
  }
}
