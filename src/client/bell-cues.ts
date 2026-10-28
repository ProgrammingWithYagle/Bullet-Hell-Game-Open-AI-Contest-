import Phaser from "phaser";
import type { BellCue, BellRing } from "../shared/bell-carillon.ts";
function arc(
  g: Phaser.GameObjects.Graphics,
  q: BellRing,
  r: number,
  color: number,
  width: number,
  alpha: number,
  dashed = false,
) {
  if (r < 2) {
    g.lineStyle(width, color, alpha).strokeCircle(q.x, q.y, 3);
    return;
  }
  const start = q.gapAngle + q.gap / 2,
    span = Math.PI * 2 - q.gap,
    steps = Math.max(16, Math.ceil((r * span) / 14));
  g.lineStyle(width, color, alpha);
  for (let n = 0; n < steps; n++) {
    if (dashed && n % 3 === 2) continue;
    const a = start + (span * n) / steps,
      b = start + (span * (n + 1)) / steps;
    g.lineBetween(
      q.x + Math.cos(a) * r,
      q.y + Math.sin(a) * r,
      q.x + Math.cos(b) * r,
      q.y + Math.sin(b) * r,
    );
  }
}
function gap(
  g: Phaser.GameObjects.Graphics,
  q: BellRing,
  r: number,
  color: number,
) {
  const near = Math.max(45, r - 28),
    far = r + 28;
  g.lineStyle(2, color, 0.85);
  for (const side of [-1, 1]) {
    const a = q.gapAngle + (side * q.gap) / 2;
    g.lineBetween(
      q.x + Math.cos(a) * near,
      q.y + Math.sin(a) * near,
      q.x + Math.cos(a) * far,
      q.y + Math.sin(a) * far,
    );
  }
  const a = q.gapAngle,
    x = q.x + Math.cos(a) * r,
    y = q.y + Math.sin(a) * r;
  g.strokeCircle(x, y, 7);
}
export function drawBellCue(
  h: Phaser.GameObjects.Graphics,
  f: Phaser.GameObjects.Graphics,
  q: BellCue,
  now: number,
) {
  if (q.kind === "bell-walk") {
    h.lineStyle(2, 0xc4bbb1, 0.55);
    for (let i = Math.max(1, q.index); i < q.path.length; i++)
      h.lineBetween(q.path[i - 1].x, q.path[i - 1].y, q.path[i].x, q.path[i].y);
    const p = q.path.at(-1)!;
    h.strokeCircle(p.x, p.y, 11);
    return;
  }
  if (q.kind === "bell-resonator") {
    const warning = now < q.at,
      c = 0xc0a4db;
    h.lineStyle(1.5, c, 0.45);
    const length = Math.hypot(q.x - q.fromX, q.y - q.fromY),
      steps = Math.ceil(length / 25);
    for (let n = 1; n < steps; n += 2)
      h.lineBetween(
        q.fromX + ((q.x - q.fromX) * n) / steps,
        q.fromY + ((q.y - q.fromY) * n) / steps,
        q.fromX + ((q.x - q.fromX) * (n + 1)) / steps,
        q.fromY + ((q.y - q.fromY) * (n + 1)) / steps,
      );
    h.lineStyle(2, c, warning ? 0.75 : 0.35).strokeCircle(q.x, q.y, q.radius);
    // Diagrammatic bell marks an echo source; it is not another boss or generated actor.
    f.fillStyle(0x33302e, 0.8).fillEllipse(q.x, q.y + 6, 30, 28);
    f.lineStyle(3, c, 0.95)
      .lineBetween(q.x - 16, q.y + 18, q.x + 16, q.y + 18)
      .lineBetween(q.x - 16, q.y + 18, q.x - 11, q.y - 7)
      .lineBetween(q.x + 16, q.y + 18, q.x + 11, q.y - 7)
      .lineBetween(q.x - 11, q.y - 7, q.x + 11, q.y - 7)
      .strokeCircle(q.x, q.y - 12, 5)
      .strokeCircle(q.x, q.y + 21, 4);
    return;
  }
  const quiet = q.state === "quiet",
    warning = q.state === "warning" || q.state === "rewarn",
    c = q.echo ? 0xc5a5df : q.returning ? 0xaebdce : 0xd8b473;
  if (quiet) {
    arc(h, q, q.radius, 0xc8c9bd, 2, 0.45, true);
    gap(f, q, q.radius, 0xc8c9bd);
    return;
  }
  if (warning) {
    const initial = q.state === "warning",
      radius = initial
        ? Math.min(q.returning ? q.reach : 115, q.radius || 115)
        : q.radius,
      until = initial ? q.at : q.resumeAt,
      began = initial ? q.beganAt : q.quietUntil,
      t = Phaser.Math.Clamp((until - now) / Math.max(1, until - began), 0, 1);
    arc(h, q, radius, c, 2, 0.65, true);
    gap(f, q, radius, c);
    h.lineStyle(2, c, 0.65).strokeCircle(q.x, q.y, 18 + 20 * t);
    if (q.returning) {
      const r = Math.min(q.reach, 160);
      for (let n = 0; n < 8; n++) {
        const a = (n * Math.PI) / 4,
          x = q.x + Math.cos(a) * r,
          y = q.y + Math.sin(a) * r;
        h.lineBetween(
          x,
          y,
          x - Math.cos(a) * 20,
          y - Math.sin(a) * 20,
        ).lineBetween(
          x - Math.cos(a) * 20,
          y - Math.sin(a) * 20,
          x - Math.cos(a + 0.4) * 13,
          y - Math.sin(a + 0.4) * 13,
        );
      }
    } else {
      const r = 80;
      for (let n = 0; n < 6; n++) {
        const a = (n * Math.PI) / 3;
        h.lineBetween(
          q.x + Math.cos(a) * r,
          q.y + Math.sin(a) * r,
          q.x + Math.cos(a) * (r + 20),
          q.y + Math.sin(a) * (r + 20),
        );
      }
    }
  } else {
    arc(h, q, q.radius, c, q.width + 2, 0.2);
    arc(h, q, q.radius, c, 3, 0.95);
    gap(f, q, q.radius, c);
  }
  for (let n = 0; n < q.strikes; n++)
    f.lineStyle(n < q.strike ? 3 : 1.5, c, 0.8).strokeCircle(
      q.x + (n - (q.strikes - 1) / 2) * 12,
      q.y - 45,
      3,
    );
}
