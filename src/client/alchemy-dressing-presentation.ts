import type { AlchemyDressingStatus } from '../shared/alchemist-restorative.ts';

type Graphics = {
  lineStyle(width: number, color: number, alpha: number): void;
  strokeCircle(x: number, y: number, radius: number): void;
  lineBetween(x1: number, y1: number, x2: number, y2: number): void;
};

export function drawAlchemyDressingGuide(graphics: Graphics, state: AlchemyDressingStatus, highContrast: boolean) {
  if (state.stage !== 'ready' || !state.targets?.length) return;
  const color = highContrast ? 0xffffff : 0xa7d0a9;
  for (const {x,y,radius} of state.targets) {
    graphics.lineStyle(1.4,color,.66);
    graphics.strokeCircle(x,y,radius);
    graphics.lineStyle(2,color,.88);
    graphics.lineBetween(x-8,y,x+8,y);
    graphics.lineBetween(x,y-8,x,y+8);
  }
}
