import { trackerRules, type TrackerStatus } from '../shared/ranger-tracker.ts';
import type Phaser from 'phaser';

type TrackerGraphics = Pick<Phaser.GameObjects.Graphics, 'lineStyle' | 'lineBetween' | 'strokeCircle'>;

export function drawRangerTracks(graphics: TrackerGraphics, trace: TrackerStatus, now: number, highContrast: boolean) {
  const active = trace.until > now;
  if (trace.until > 0 && !active) return;
  const plain = highContrast ? 0xffffff : 0xc5d4a0;
  const fresh = highContrast ? 0xffffff : 0xefd593;
  for (const [index, point] of trace.footprints.entries()) {
    if (now - point.at >= trackerRules.evidenceTicks) continue;
    const latest = index === trace.footprints.length - 1;
    const alpha = latest ? .82 : .44;
    graphics.lineStyle(latest ? 2 : 1, latest ? fresh : plain, alpha)
      .strokeCircle(point.x, point.y, latest ? 7 : 4);
  }
  const origin = trace.origin, angle = trace.bearing;
  if (!active || !origin || angle === undefined) return;
  const x = Math.cos(angle), y = Math.sin(angle);
  graphics.lineStyle(1.5,plain,.62).strokeCircle(origin.x,origin.y,6);
  if (trace.fitting === 'backtrack') {
    graphics.lineStyle(1.25,plain,.42).strokeCircle(origin.x,origin.y,trackerRules.returnDistance);
    return;
  }
  graphics.lineStyle(1.5,plain,.58).lineBetween(origin.x-12*x,origin.y-12*y,origin.x+40*x,origin.y+40*y);
  for (const side of [-1,1]) {
    const markerX = origin.x - y * side * trackerRules.lateralDistance;
    const markerY = origin.y + x * side * trackerRules.lateralDistance;
    graphics.lineBetween(markerX - x * 10, markerY - y * 10, markerX + x * 10, markerY + y * 10);
  }
}
