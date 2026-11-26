import type Phaser from "phaser";
import type { StitchCue } from "../shared/stitchwork.ts";

export const isStitchCue = (q: { kind: string }): q is StitchCue =>
  q.kind.startsWith("stitch-");
export function drawStitchCue(
  h: Phaser.GameObjects.Graphics,
  f: Phaser.GameObjects.Graphics,
  q: StitchCue,
  now: number,
) {
  if (now < q.beganAt || now >= q.until) return;
  if (q.kind === "stitch-pin") {
    const live = q.health > 0;
    h.lineStyle(3, live ? 0xe8d4a0 : 0x7fae9c, live ? 1 : 0.4);
    h.lineBetween(q.x, q.y - 19, q.x, q.y + 18).strokeEllipse(
      q.x,
      q.y - 13,
      10,
      15,
    );
    h.lineBetween(q.x, q.y + 18, q.x - 4, q.y + 10).lineBetween(
      q.x,
      q.y + 18,
      q.x + 4,
      q.y + 10,
    );
    h.strokeCircle(q.x, q.y, q.radius);
    if (live) {
      f.fillStyle(0x16241e, 0.95).fillRect(q.x - 23, q.y - 34, 46, 6);
      f.fillStyle(0xf1d28c, 1).fillRect(
        q.x - 23,
        q.y - 34,
        (46 * q.health) / q.maxHealth,
        6,
      );
    }
  } else if (q.kind === "stitch-seam") {
    const active = now >= q.at && !q.disabled,
      color = q.disabled ? 0x82bda9 : active ? 0xf18b73 : 0xe4d19f;
    const dx = q.x2 - q.x1,
      dy = q.y2 - q.y1,
      length = Math.hypot(dx, dy),
      nx = -dy / (length || 1),
      ny = dx / (length || 1);
    h.lineStyle(
      active ? q.width : 2,
      color,
      q.disabled ? 0.28 : active ? 0.6 : 0.8,
    );
    const steps = Math.max(1, Math.ceil(length / 14));
    for (let n = 0; n < steps; n++) {
      if ((!active || q.disabled) && n % 3 === 2) continue;
      const a = n / steps,
        b = (n + 1) / steps;
      h.lineBetween(q.x1 + dx * a, q.y1 + dy * a, q.x1 + dx * b, q.y1 + dy * b);
    }
    if (!q.disabled)
      for (let n = 1; n < steps; n += 2) {
        const x = q.x1 + (dx * n) / steps,
          y = q.y1 + (dy * n) / steps;
        h.lineStyle(2, color, 0.95).lineBetween(
          x - nx * 7,
          y - ny * 7,
          x + nx * 7,
          y + ny * 7,
        );
      }
  } else if (q.kind === "stitch-gate") {
    const dx = q.endX - q.x,
      dy = q.endY - q.y,
      length = Math.hypot(dx, dy),
      nx = dx / (length || 1),
      ny = dy / (length || 1);
    h.lineStyle(3, 0x8dd7c0, 0.85);
    h.lineBetween(q.x + nx * 35, q.y + ny * 35, q.endX, q.endY);
    for (const turn of [-0.6, 0.6]) {
      const a = Math.atan2(dy, dx) + turn;
      h.lineBetween(
        q.endX,
        q.endY,
        q.endX - Math.cos(a) * 20,
        q.endY - Math.sin(a) * 20,
      );
    }
    h.strokeCircle(q.endX, q.endY, 10);
  } else {
    h.lineStyle(2, 0xb8b9a0, 0.4).lineBetween(q.x1, q.y1, q.x2, q.y2);
    h.strokeCircle(q.x2, q.y2, 8);
  }
}
