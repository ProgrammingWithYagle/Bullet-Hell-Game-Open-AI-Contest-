import type Phaser from "phaser";
import { clamp } from "../shared/geometry.ts";
import { aerosolPosition, type MoldStillCue } from "../shared/mold-still.ts";

export function drawMoldStillCue(
  h: Phaser.GameObjects.Graphics,
  q: MoldStillCue,
  now: number,
) {
  if (q.kind === "mold-still") {
    const cold = q.state === "cooled",
      color = cold ? 0xc9eee8 : q.state === "spent" ? 0x8e849a : 0xc197e6;
    h.fillStyle(0x272832, 0.9).fillTriangle(
      q.x,
      q.y - 35,
      q.x - 26,
      q.y + 22,
      q.x + 26,
      q.y + 22,
    );
    h.lineStyle(2.5, color, 0.95).strokeTriangle(
      q.x,
      q.y - 35,
      q.x - 26,
      q.y + 22,
      q.x + 26,
      q.y + 22,
    );
    h.fillStyle(color, 0.35).fillTriangle(
      q.x,
      q.y - 8,
      q.x - 20,
      q.y + 18,
      q.x + 20,
      q.y + 18,
    );
    h.lineStyle(3, color, 0.9)
      .lineBetween(q.x - 5, q.y - 33, q.x - 5, q.y - 50)
      .lineBetween(q.x + 5, q.y - 33, q.x + 5, q.y - 50)
      .lineBetween(q.x - 5, q.y - 50, q.x + 19, q.y - 50)
      .lineBetween(q.x + 5, q.y - 44, q.x + 19, q.y - 44)
      .lineBetween(q.x + 19, q.y - 50, q.x + 19, q.y - 37);
    const first = q.released === 0,
      start = first ? q.beganAt : q.nextAt - 90,
      span = Math.max(1, q.nextAt - start),
      heat =
        cold || q.state === "spent" ? 0 : clamp((now - start) / span, 0, 1);
    for (let n = 0; n < 4; n++)
      h.fillStyle(n < Math.ceil(heat * 4) ? color : 0x66676d, 0.85).fillRect(
        q.x - 12 + n * 7,
        q.y + 29,
        5,
        5,
      );
    if (cold) {
      h.lineStyle(2.5, color, 0.95)
        .strokeCircle(q.x - 5, q.y - 5, 8)
        .strokeCircle(q.x + 5, q.y - 5, 8)
        .lineBetween(q.x - 5, q.y - 13, q.x, q.y - 21)
        .lineBetween(q.x + 5, q.y - 13, q.x, q.y - 21);
    } else {
      h.lineStyle(2, color, 0.7)
        .strokeCircle(q.x, q.y - 3, 7)
        .lineBetween(q.x - 12, q.y - 8, q.x - 12, q.y + 10)
        .lineBetween(q.x + 12, q.y - 8, q.x + 12, q.y + 10);
      const pulses = Math.min(q.releases, q.released);
      for (let n = 0; n < q.releases; n++)
        h.fillStyle(color, n < pulses ? 0.85 : 0.2).fillCircle(
          q.x - ((q.releases - 1) * 9) / 2 + n * 9,
          q.y + 43,
          2.5,
        );
    }
    return;
  }
  const p = aerosolPosition(q, now),
    warning = q.state === "warning" && now < q.at,
    color = q.state === "quenched" ? 0xc9eee8 : q.reflux ? 0xe1a5df : 0xb49ae0;
  if (warning) {
    const length = Math.hypot(q.endX - q.fromX, q.endY - q.fromY),
      ux = length ? (q.endX - q.fromX) / length : 1,
      uy = length ? (q.endY - q.fromY) / length : 0;
    h.lineStyle(2, color, 0.65);
    for (let d = 0; d < length; d += 25) {
      const e = Math.min(length, d + 13);
      for (const side of [-1, 1])
        h.lineBetween(
          q.fromX + ux * d - uy * q.radius * side,
          q.fromY + uy * d + ux * q.radius * side,
          q.fromX + ux * e - uy * q.radius * side,
          q.fromY + uy * e + ux * q.radius * side,
        );
    }
    h.strokeCircle(q.fromX, q.fromY, q.radius).strokeCircle(
      q.endX,
      q.endY,
      q.radius,
    );
    for (let n = 1; n <= 3; n++) {
      const d = (length * n) / 4,
        x = q.fromX + ux * d,
        y = q.fromY + uy * d;
      h.lineBetween(
        x - ux * 10 - uy * 7,
        y - uy * 10 + ux * 7,
        x,
        y,
      ).lineBetween(x - ux * 10 + uy * 7, y - uy * 10 - ux * 7, x, y);
    }
    const f = clamp((now - q.beganAt) / Math.max(1, q.at - q.beganAt), 0, 1);
    h.lineStyle(2.5, color, 0.85).strokeCircle(
      q.fromX,
      q.fromY,
      Math.max(3, q.radius * (1 - f)),
    );
    h.fillStyle(color, 0.035).fillCircle(q.fromX, q.fromY, q.radius);
    return;
  }
  const fade = q.state === "quenched" ? clamp((q.until - now) / 18, 0, 1) : 1;
  h.fillStyle(color, 0.16 * fade).fillCircle(p.x, p.y, q.radius);
  h.lineStyle(2.5, color, 0.8 * fade).strokeCircle(p.x, p.y, q.radius);
  for (let n = 0; n < 6; n++) {
    const a = (n * Math.PI) / 3,
      x = p.x + Math.cos(a) * q.radius * 0.55,
      y = p.y + Math.sin(a) * q.radius * 0.55;
    h.lineStyle(1.5, color, 0.5 * fade).strokeCircle(x, y, 9);
  }
  if (q.state === "quenched")
    h.lineStyle(2, color, 0.9 * fade)
      .lineBetween(p.x - 12, p.y, p.x - 3, p.y + 9)
      .lineBetween(p.x - 3, p.y + 9, p.x + 16, p.y - 11);
  else
    h.lineStyle(2, color, 0.8)
      .strokeCircle(p.x - 8, p.y - 5, 6)
      .strokeCircle(p.x + 8, p.y - 5, 6)
      .lineBetween(p.x - 9, p.y + 12, p.x + 9, p.y + 12);
}
