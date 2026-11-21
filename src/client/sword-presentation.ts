import type { SwordCue } from '../shared/swordsman-kit.ts';
import rules from '../shared/sword-rules.json';
export type SwordGraphics = {
  lineStyle(width: number, color: number, alpha?: number): SwordGraphics;
  lineBetween(x1: number, y1: number, x2: number, y2: number): SwordGraphics;
  fillStyle(color: number, alpha?: number): SwordGraphics;
  fillCircle(x: number, y: number, radius: number): SwordGraphics;
};
export function drawSwordCue(g: SwordGraphics, c: SwordCue, now: number, reduced = false) {
  const color = c.counter ? 0xf2c879 : c.empowered ? 0xe9e3bd : 0xbfcdd0;
  if (c.kind === 'sword-guard' || c.kind === 'sword-parry') {
    const x = c.x + Math.cos(c.aim) * rules.guardOffset,
      y = c.y + Math.sin(c.aim) * rules.guardOffset,
      dx = -Math.sin(c.aim) * rules.guardHalfSpan,
      dy = Math.cos(c.aim) * rules.guardHalfSpan,
      active = c.kind === 'sword-parry' || c.active;
    g.lineStyle(c.kind === 'sword-parry' ? 5 : 3, color, active ? 0.9 : 0.2).lineBetween(
      x - dx,
      y - dy,
      x + dx,
      y + dy,
    );
    for (let i = 0; i < (c.remaining ?? 0); i++)
      g.fillStyle(color, 0.8).fillCircle(
        x + Math.cos(c.aim) * 8 + (i - 1) * Math.sin(c.aim) * 8,
        y + Math.sin(c.aim) * 8 - (i - 1) * Math.cos(c.aim) * 8,
        2,
      );
    return;
  }
  if (c.kind === 'sword-return') return;
  const pending = c.kind === 'sword-windup',
    progress = Math.max(0, Math.min(1, (now - c.at) / Math.max(1, c.until - c.at))),
    segments = Math.max(3, Math.ceil(c.arc / (reduced ? Math.PI / 6 : Math.PI / 12))),
    alpha = pending ? 0.3 : 0.85 * (1 - progress),
    start = c.aim - c.arc / 2;
  for (let i = 0; i < segments; i++) {
    if (!pending && !reduced && i / segments < progress - 0.35) continue;
    const a = start + (c.arc * i) / segments,
      b = start + (c.arc * (i + 1)) / segments;
    g.lineStyle(pending ? 1 : 3, color, alpha).lineBetween(
      c.x + Math.cos(a) * c.radius,
      c.y + Math.sin(a) * c.radius,
      c.x + Math.cos(b) * c.radius,
      c.y + Math.sin(b) * c.radius,
    );
  }
  if (pending)
    g.lineStyle(1, color, 0.25).lineBetween(
      c.x,
      c.y,
      c.x + Math.cos(c.aim) * c.radius,
      c.y + Math.sin(c.aim) * c.radius,
    );
}
