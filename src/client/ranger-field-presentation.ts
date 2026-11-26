import type Phaser from 'phaser';
import type { RangerFieldStatus } from '../shared/ranger-field.ts';

type Graphics = Pick<Phaser.GameObjects.Graphics,'lineStyle'|'lineBetween'|'strokeCircle'>;
export function drawRangerFieldGuide(g:Graphics,field:RangerFieldStatus,now:number,highContrast:boolean) {
  if (field.until>0 && now>=field.until) return;
  const color=highContrast?0xffffff:0xd3bf98;
  const anchor=field.anchor;
  if (anchor) g.lineStyle(2,color,.76).strokeCircle(anchor.x,anchor.y,6);
  const guide=field.placement;
  if (!guide) return;
  const {start,end}=guide;
  const dx=end.x-start.x, dy=end.y-start.y, span=Math.hypot(dx,dy);
  if (span<=0) return;
  g.lineStyle(1.5,color,.67).strokeCircle(end.x,end.y,5);
  for (let at=5;at<span-5;at+=14) {
    const next=Math.min(span-5,at+6);
    g.lineBetween(start.x+dx*at/span,start.y+dy*at/span,start.x+dx*next/span,start.y+dy*next/span);
  }
}
