import type { FormationCue } from '../shared/summoner-formation.ts';
import type { SwordGraphics } from './sword-presentation.ts';

type FormationGraphics = SwordGraphics & { strokeCircle(x: number, y: number, radius: number): unknown };

export function drawFormationCue(graphics: FormationGraphics, cue: FormationCue, now: number, own: boolean, highContrast: boolean) {
  if (cue.until <= now) return;
  const { ax, ay, bx, by, aim, radius } = cue;
  const held = cue.state === 'holding';
  const color = highContrast ? 0xffffff : held ? 0x9ce6cf : 0xe3bb84;
  const alpha = own ? 0.88 : 0.57;
  graphics.lineStyle(2, color, alpha);
  graphics.strokeCircle(ax, ay, radius);
  graphics.strokeCircle(bx, by, radius);
  if (!held) return;
  graphics.lineStyle(3, color, alpha);
  graphics.lineBetween(ax, ay, bx, by);
  for (const f of [0.25, 0.5, 0.75]) {
    const x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
    graphics.lineBetween(x, y, x + Math.cos(aim) * 8, y + Math.sin(aim) * 8);
  }
}
