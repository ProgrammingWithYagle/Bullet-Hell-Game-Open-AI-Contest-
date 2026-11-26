import type { AlchemyReactionStatus } from '../shared/alchemist-reactive.ts';

type Graphics = {
  lineStyle(width: number, color: number, alpha: number): void;
  strokeCircle(x: number, y: number, radius: number): void;
  lineBetween(x1: number, y1: number, x2: number, y2: number): void;
};

export function drawAlchemyReactionGuide(graphics: Graphics, reaction: AlchemyReactionStatus, highContrast: boolean) {
  const target = reaction.target;
  if (reaction.stage !== 'ready' || !target) return;
  const color = highContrast ? 0xffffff : 0xe3c786;
  graphics.lineStyle(1.4, color, .66);
  graphics.strokeCircle(target.x, target.y, target.radius);
  graphics.lineStyle(2, color, .88);
  graphics.strokeCircle(target.x, target.y, 7);
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2]) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    graphics.lineBetween(target.x + dx * 9, target.y + dy * 9, target.x + dx * 14, target.y + dy * 14);
  }
}
