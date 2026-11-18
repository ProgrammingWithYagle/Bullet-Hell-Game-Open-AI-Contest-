import type Phaser from 'phaser';
import { bastionRules, type BastionCue } from '../shared/tank-bastion.ts';

export function drawTankGate(
  graphics: Phaser.GameObjects.Graphics,
  gate: BastionCue,
  now: number,
  bodyRadius: number,
  highContrast: boolean,
) {
  if (now >= gate.until) return;
  const color = highContrast ? 0xffffff : 0xaed8c5;
  const post = highContrast ? 0xffe6a6 : 0xd8b371;
  const span = bastionRules.halfSpan;
  for (const face of gate.entrances) {
    const dx = Math.cos(face.aim), dy = Math.sin(face.aim);
    const start = face.half === 'right' ? bodyRadius : -span;
    const end = face.half === 'left' ? -bodyRadius : span;
    const middle = (start + end) / 2;
    const point = (depth: number, across: number) =>
      [gate.x + dx * depth - dy * across, gate.y + dy * depth + dx * across] as const;
    graphics.lineStyle(face.open ? 3 : 1, color, face.open ? 0.9 : 0.36)
      .lineBetween(...point(0, start), ...point(0, end));
    if (!face.open) continue;
    graphics.fillStyle(post, 0.95).fillCircle(...point(0, start), 3).fillCircle(...point(0, end), 3);
    graphics.lineStyle(3, color, 0.95)
      .lineBetween(...point(20, middle), ...point(-10, middle))
      .lineBetween(...point(-10, middle), ...point(-1, middle - 7))
      .lineBetween(...point(-10, middle), ...point(-1, middle + 7));
  }
  const remaining = Math.min(1, (gate.until - now) / (gate.until - gate.at));
  graphics.lineStyle(2, post, 0.82).beginPath()
    .arc(gate.x, gate.y, 12, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2).strokePath();
}
