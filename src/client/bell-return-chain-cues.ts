import type Phaser from "phaser";
import { clamp } from "../shared/geometry.ts";
import {
  bellChainPosition,
  bellChainStage,
  type BellChain,
} from "../shared/bell-return-chain.ts";
type Graphics = Phaser.GameObjects.Graphics;

function arrow(
  g: Graphics,
  x: number,
  y: number,
  angle: number,
  color: number,
) {
  const dx = Math.cos(angle),
    dy = Math.sin(angle),
    px = -dy,
    py = dx;
  g.lineStyle(2.5, color, 0.85)
    .lineBetween(
      x - dx * 7 + px * 6,
      y - dy * 7 + py * 6,
      x + dx * 5,
      y + dy * 5,
    )
    .lineBetween(
      x - dx * 7 - px * 6,
      y - dy * 7 - py * 6,
      x + dx * 5,
      y + dy * 5,
    );
}
function countdown(
  g: Graphics,
  x: number,
  y: number,
  began: number,
  at: number,
  now: number,
  color: number,
) {
  const progress = clamp((now - began) / Math.max(1, at - began), 0, 1);
  g.lineStyle(3, color, 0.9)
    .beginPath()
    .arc(x, y, 29, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
    .strokePath();
}

/** Hostile geometry stays visible regardless of friendly-effect reduction. */
export function drawBellChain(
  h: Graphics,
  f: Graphics,
  q: BellChain,
  now: number,
) {
  if (now >= q.until) return;
  const stage = bellChainStage(q, now),
    head = bellChainPosition(q, now),
    color = q.crazed ? 0xc5a0e0 : 0xdfa372,
    dark = 0x21191f,
    dx = q.endX - q.originX,
    dy = q.endY - q.originY,
    length = Math.hypot(dx, dy),
    ux = length ? dx / length : 0,
    uy = length ? dy / length : 1,
    px = -uy,
    py = ux,
    warning = stage === "windup" || stage === "rewarn",
    returning = stage === "rewarn" || stage === "return";
  if (stage === "broken") {
    const alpha = clamp(
      (q.until - now) / Math.max(1, q.until - q.brokenAt),
      0,
      1,
    );
    h.lineStyle(2, color, 0.5 * alpha)
      .lineBetween(q.originX, q.originY, head.x - ux * 28, head.y - uy * 28)
      .lineBetween(head.x - 12, head.y - 9, head.x + 4, head.y + 8)
      .lineBetween(head.x + 4, head.y - 10, head.x + 15, head.y + 2);
    f.fillStyle(dark, 0.7 * alpha).fillCircle(head.x, head.y, q.radius);
    return;
  }
  if (warning) {
    const r = q.radius;
    f.fillStyle(color, 0.045)
      .fillTriangle(
        q.originX + px * r,
        q.originY + py * r,
        q.endX + px * r,
        q.endY + py * r,
        q.endX - px * r,
        q.endY - py * r,
      )
      .fillTriangle(
        q.originX + px * r,
        q.originY + py * r,
        q.originX - px * r,
        q.originY - py * r,
        q.endX - px * r,
        q.endY - py * r,
      );
    const steps = Math.max(1, Math.ceil(length / 24));
    h.lineStyle(1.5, color, 0.65);
    for (let i = 0; i < steps; i += 2)
      for (const side of [-1, 1])
        h.lineBetween(
          q.originX + (dx * i) / steps + px * r * side,
          q.originY + (dy * i) / steps + py * r * side,
          q.originX + (dx * Math.min(steps, i + 1)) / steps + px * r * side,
          q.originY + (dy * Math.min(steps, i + 1)) / steps + py * r * side,
        );
    const angle = Math.atan2(dy, dx) + (returning ? Math.PI : 0);
    for (const fraction of [0.3, 0.55, 0.8])
      arrow(
        h,
        q.originX + dx * fraction,
        q.originY + dy * fraction,
        angle,
        color,
      );
    countdown(
      h,
      head.x,
      head.y,
      returning ? q.returnWarnAt : q.beganAt,
      returning ? q.returnAt : q.at,
      now,
      color,
    );
  }
  // The thin chain is a tether, not an active full-length laser.
  const tetherLength = Math.hypot(head.x - q.originX, head.y - q.originY),
    steps = Math.max(1, Math.ceil(tetherLength / 15));
  h.lineStyle(1.8, color, 0.55);
  for (let i = 0; i < steps; i++) {
    const a = i / steps,
      b = Math.min(1, (i + 0.65) / steps);
    h.lineBetween(
      q.originX + (head.x - q.originX) * a,
      q.originY + (head.y - q.originY) * a,
      q.originX + (head.x - q.originX) * b,
      q.originY + (head.y - q.originY) * b,
    );
  }
  f.fillStyle(dark, 0.95).fillCircle(head.x, head.y, q.radius + 3);
  f.fillStyle(
    color,
    stage === "outbound" || stage === "return" ? 0.9 : 0.5,
  ).fillEllipse(head.x, head.y, q.radius * 1.5, q.radius * 1.9);
  h.lineStyle(2.5, color, 0.95).strokeCircle(head.x, head.y, q.radius);
  h.lineStyle(2, 0xf0e2cb, 0.85).lineBetween(
    head.x - 7,
    head.y - 10,
    head.x + 6,
    head.y + 9,
  );
  if (stage === "rewarn") {
    // A cracked white head and its own HP bar indicate a shootable object,
    // without borrowing the green shelter language of Quarantine Clerk.
    h.lineStyle(2, 0xf2e9dc, 1)
      .lineBetween(head.x - 9, head.y - 16, head.x - 2, head.y - 6)
      .lineBetween(head.x - 2, head.y - 6, head.x - 6, head.y + 3)
      .lineBetween(head.x - 6, head.y + 3, head.x + 6, head.y + 13);
    f.fillStyle(dark, 0.95).fillRect(head.x - 25, head.y + q.radius + 8, 50, 6);
    f.fillStyle(0xf2e9dc, 1).fillRect(
      head.x - 25,
      head.y + q.radius + 8,
      50 * clamp(q.health / q.maxHealth, 0, 1),
      6,
    );
  }
}
