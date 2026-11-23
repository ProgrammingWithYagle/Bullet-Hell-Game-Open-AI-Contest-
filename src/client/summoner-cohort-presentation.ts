import type { CohortCue } from '../shared/summoner-cohort.ts';
import type { SwordGraphics } from './sword-presentation.ts';

export function drawCohortCue(graphics: SwordGraphics, cue: CohortCue, now: number, own: boolean, highContrast: boolean) {
  if (cue.until <= now) return;
  const { x, y, radius } = cue;
  const alpha = own ? 0.84 : 0.53;
  if (cue.state === 'relay') {
    graphics.lineStyle(2, highContrast ? 0xffffff : 0xebc88d, alpha);
    graphics.lineBetween(x - radius, y - 23, x, y - 32).lineBetween(x, y - 32, x + radius, y - 23);
    graphics.lineBetween(x - 10, y - 17, x, y - 24).lineBetween(x, y - 24, x + 10, y - 17);
    return;
  }
  graphics.lineStyle(2, highContrast ? 0xffffff : 0x9adecc, alpha);
  graphics.lineBetween(x - radius, y, x, y - 6).lineBetween(x, y - 6, x + radius, y);
  graphics.lineBetween(x + radius, y, x, y + 6).lineBetween(x, y + 6, x - radius, y);
  graphics.lineBetween(x, y - 6, x, y - 20).lineBetween(x, y - 20, x + 11, y - 15).lineBetween(x + 11, y - 15, x, y - 11);
}
