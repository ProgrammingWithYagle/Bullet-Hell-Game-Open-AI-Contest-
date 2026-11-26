import type { BondCue } from '../shared/summoner-bond.ts';
import type { SwordGraphics } from './sword-presentation.ts';

type BondGraphics = SwordGraphics & { strokeCircle(x: number, y: number, radius: number): unknown };

export function drawBondCue(graphics: BondGraphics, cue: BondCue, now: number, own: boolean, highContrast: boolean) {
  if (cue.until <= now) return;
  const { x, y, ownerX, ownerY, radius } = cue;
  const color = highContrast ? 0xffffff : cue.state === 'return' ? 0xe9bd86 : 0x9ce6cf;
  graphics.lineStyle(1.5, color, own ? 0.56 : 0.28);
  graphics.lineBetween(ownerX, ownerY, x, y);
  graphics.lineStyle(2, color, own ? 0.95 : 0.65);
  graphics.strokeCircle(x, y, radius);
  if (cue.state === 'return') {
    graphics.lineBetween(x - 5, y - radius - 3, x, y - radius - 8);
    graphics.lineBetween(x, y - radius - 8, x + 5, y - radius - 3);
  } else if (cue.state === 'close') {
    graphics.lineBetween(x - 4, y - radius - 6, x + 4, y - radius - 6);
  }
}
