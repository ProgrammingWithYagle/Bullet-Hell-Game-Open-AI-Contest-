import { measuredRules, type MeasuredStanceCue } from '../shared/swordsman-measured.ts';
import type { SwordGraphics } from './sword-presentation.ts';

export function drawMeasuredStance(g: SwordGraphics, cue: MeasuredStanceCue, now: number, reduced: boolean) {
  if (now >= cue.until) return;
  const stroke = cue.state === 'ready' || cue.state === 'cut' ? 0xf5c386 : 0xa8bdc4;
  const opacity = cue.state === 'cut' ? (cue.until - now) / 7 * 0.88 : cue.state === 'ready' ? 0.55 : 0.34;
  const line = (a: number, from: number, b: number, to: number) => {
    g.lineBetween(cue.x + Math.cos(a)*from,cue.y + Math.sin(a)*from,
      cue.x + Math.cos(b)*to,cue.y + Math.sin(b)*to);
  };
  const arc = (start: number,end: number,radius: number) => {
    const segments = Math.max(2,Math.ceil((end-start)/(reduced ? Math.PI/7 : Math.PI/14)));
    for (let index = 0; index < segments; index++) {
      const from = start + (end-start)*index/segments;
      const to = start + (end-start)*(index+1)/segments;
      line(from,radius,to,radius);
    }
  };
  g.lineStyle(cue.state === 'cut' ? 4 : 2,stroke,opacity);
  if (cue.state === 'following') {
    arc(cue.aim + measuredRules.releaseAngle,cue.aim + measuredRules.maximumFollow,32);
    arc(cue.aim - measuredRules.maximumFollow,cue.aim - measuredRules.releaseAngle,32);
    return;
  }
  const left = cue.aim-cue.arc/2, right = cue.aim+cue.arc/2;
  arc(left,right,cue.radius);
  if (cue.state === 'cut') return;
  line(left,21,left,cue.radius);
  line(right,21,right,cue.radius);
  line(cue.aim,13,cue.aim,29);
}
