import type Phaser from "phaser";
import type {
  AmbulanceCue,
  AmbulanceBurst,
} from "../shared/ambulance-route.ts";
type DrawCue = Exclude<AmbulanceCue, { kind: "driver" }>;
export function drawAmbulanceCue(
  h: Phaser.GameObjects.Graphics,
  f: Phaser.GameObjects.Graphics,
  q: DrawCue,
  now: number,
  all: readonly AmbulanceCue[],
) {
  const gold = 0xe4c88c,
    red = 0xee9879;
  if (q.kind === "ambulance-patrol") {
    h.lineStyle(2, gold, 0.65);
    for (let i = 1; i < q.path.length; i++)
      h.lineBetween(q.path[i - 1].x, q.path[i - 1].y, q.path[i].x, q.path[i].y);
    const end = q.path[q.path.length - 1];
    h.strokeCircle(end.x, end.y, 18);
    h.lineBetween(end.x - 9, end.y, end.x + 9, end.y).lineBetween(
      end.x,
      end.y - 9,
      end.x,
      end.y + 9,
    );
  } else if (q.kind === "ambulance-lane") {
    const active = now >= q.at,
      color = active ? red : gold,
      dx = q.x2 - q.x1,
      dy = q.y2 - q.y1,
      length = Math.hypot(dx, dy) || 1,
      nx = ((-dy / length) * q.width) / 2,
      ny = ((dx / length) * q.width) / 2;
    h.lineStyle(q.width, color, active ? 0.22 : 0.09).lineBetween(
      q.x1,
      q.y1,
      q.x2,
      q.y2,
    );
    h.lineStyle(active ? 4 : 2, color, 0.9)
      .lineBetween(q.x1 + nx, q.y1 + ny, q.x2 + nx, q.y2 + ny)
      .lineBetween(q.x1 - nx, q.y1 - ny, q.x2 - nx, q.y2 - ny);
    h.strokeCircle(q.x2, q.y2, q.width / 2);
    const p = 0.68,
      x = q.x1 + dx * p,
      y = q.y1 + dy * p,
      ux = dx / length,
      uy = dy / length;
    h.lineBetween(x - ux * 18, y - uy * 18, x + ux * 18, y + uy * 18)
      .lineBetween(
        x + ux * 18,
        y + uy * 18,
        x + ux * 6 - uy * 10,
        y + uy * 6 + ux * 10,
      )
      .lineBetween(
        x + ux * 18,
        y + uy * 18,
        x + ux * 6 + uy * 10,
        y + uy * 6 - ux * 10,
      );
    for (let n = 1; n <= q.legs; n++)
      f.lineStyle(2, color, n === q.leg ? 1 : 0.4).strokeRect(
        q.x1 + (n - (q.legs + 1) / 2) * 16 - 4,
        q.y1 - q.width / 2 - 28,
        8,
        8,
      );
  } else if (q.kind === "ambulance-stop") {
    h.lineStyle(2, gold, 0.75).strokeCircle(q.x, q.y, 70);
    for (let n = 1; n <= q.legs; n++)
      h.lineStyle(3, gold, n === q.leg ? 1 : 0.3).lineBetween(
        q.x + (n - (q.legs + 1) / 2) * 15,
        q.y - 80,
        q.x + (n - (q.legs + 1) / 2) * 15,
        q.y - 68,
      );
  } else {
    const group = all.filter(
      (v): v is AmbulanceBurst =>
        v.kind === "ambulance-burst" &&
        v.x === q.x &&
        v.y === q.y &&
        v.until > now,
    );
    const angles = new Set<number>();
    for (const v of group) for (const angle of v.angles) angles.add(angle);
    h.lineStyle(2, red, 0.75).strokeCircle(q.x, q.y, 12);
    for (const angle of angles)
      h.lineBetween(
        q.x,
        q.y,
        q.x + Math.cos(angle) * 110,
        q.y + Math.sin(angle) * 110,
      );
    const pending = group.filter((v) => v.at > now).length;
    for (let i = 0; i < pending; i++)
      h.lineStyle(2, red, 0.8).strokeRect(
        q.x + (i - (pending - 1) / 2) * 7 - 2,
        q.y + 23,
        4,
        4,
      );
  }
}
