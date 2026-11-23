import type { PursuitCue } from '../shared/swordsman-pursuit.ts';
import type { SwordGraphics } from './sword-presentation.ts';

export function drawPursuit(g: SwordGraphics, cue: PursuitCue, now: number, reduced: boolean) {
  if (now >= cue.until) return;
  const cross = cue.state === 'cross' || cue.state === 'open-cross';
  const opening = cue.state === 'open-cross' || cue.state === 'open-through';
  const color = cross ? 0xe3c693 : cue.state === 'passing' ? 0xdce5dc : 0xafd5ce;
  if (opening) {
    const sides = cross ? [-Math.PI / 2, Math.PI / 2] : [0];
    g.lineStyle(2, color, 0.57);
    for (const side of sides) {
      const heading = cue.aim + side, dx = Math.cos(heading), dy = Math.sin(heading);
      g.lineBetween(cue.x + dx * 18, cue.y + dy * 18, cue.x + dx * cue.radius, cue.y + dy * cue.radius);
    }
    return;
  }
  const start = cue.aim - cue.arc / 2;
  const segments = reduced ? 4 : 8;
  g.lineStyle(3, color, 0.71 * (cue.until - now) / 7);
  for (let i = 0; i < segments; i++) {
    const from = start + cue.arc * i / segments, to = start + cue.arc * (i + 1) / segments;
    g.lineBetween(cue.x + Math.cos(from) * cue.radius, cue.y + Math.sin(from) * cue.radius,
      cue.x + Math.cos(to) * cue.radius, cue.y + Math.sin(to) * cue.radius);
  }
}
