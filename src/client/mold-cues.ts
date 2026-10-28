import Phaser from "phaser";
import type { MoldCue } from "../shared/mold-mixing.ts";
export function drawMoldCue(
  h: Phaser.GameObjects.Graphics,
  f: Phaser.GameObjects.Graphics,
  q: MoldCue,
  now: number,
  cues: MoldCue[],
) {
  const active = now >= q.at,
    color = active ? 0xe6a080 : 0xe3d2a0;
  if (q.kind === "mold-walk") {
    h.lineStyle(2, 0xbccacc, 0.6);
    for (let i = Math.max(1, q.index); i < q.path.length; i++)
      h.lineBetween(q.path[i - 1].x, q.path[i - 1].y, q.path[i].x, q.path[i].y);
    const end = q.path.at(-1)!;
    h.strokeCircle(end.x, end.y, 12);
    return;
  }
  if (q.kind === "mold-pool") {
    const drained = q.drainedAt > 0,
      c = drained ? 0xb3dfd1 : color;
    h.fillStyle(c, drained ? 0.08 : active ? 0.2 : 0.055).fillCircle(
      q.x,
      q.y,
      q.radius,
    );
    h.lineStyle(drained ? 2 : 3, c, 0.9).strokeCircle(q.x, q.y, q.radius);
    // A flask silhouette and fill level distinguish culture from a safe emptied vessel.
    h.lineStyle(2, c, 0.95).strokePoints(
      [
        [-8, -15],
        [8, -15],
        [8, -3],
        [20, 17],
        [-20, 17],
        [-8, -3],
      ].map(([x, y]) => new Phaser.Math.Vector2(q.x + x, q.y + y)),
      true,
    );
    if (!drained) h.lineBetween(q.x - 14, q.y + 9, q.x + 14, q.y + 9);
    else
      h.lineBetween(q.x - 10, q.y, q.x + 10, q.y + 14).lineBetween(
        q.x - 10,
        q.y + 14,
        q.x + 10,
        q.y,
      );
    for (let n = 0; n <= q.index; n++)
      f.lineStyle(3, c, 0.95).lineBetween(
        q.x - 8 + 8 * n,
        q.y - 30,
        q.x - 8 + 8 * n,
        q.y - 22,
      );
    return;
  }
  if (q.kind === "mold-front") {
    const c = q.draining ? 0x9bd5d0 : color;
    h.lineStyle(active ? 2 : 3, c, active ? 0.35 : 0.85);
    for (let i = 1; i < q.path.length; i++)
      h.lineBetween(q.path[i - 1].x, q.path[i - 1].y, q.path[i].x, q.path[i].y);
    if (!active) {
      h.lineStyle(q.radius * 2, c, 0.08);
      for (let i = 1; i < q.path.length; i++)
        h.lineBetween(
          q.path[i - 1].x,
          q.path[i - 1].y,
          q.path[i].x,
          q.path[i].y,
        );
    }
    h.fillStyle(c, active ? 0.45 : 0.08).fillCircle(q.x, q.y, q.radius);
    h.lineStyle(3, c, 1).strokeCircle(q.x, q.y, q.radius);
    const next = q.path[Math.min(q.index, q.path.length - 1)],
      angle = Math.atan2(next.y - q.y, next.x - q.x);
    for (const turn of [-0.6, 0.6])
      h.lineBetween(
        q.x + Math.cos(angle) * 18,
        q.y + Math.sin(angle) * 18,
        q.x + Math.cos(angle + Math.PI + turn) * 5,
        q.y + Math.sin(angle + Math.PI + turn) * 5,
      );
    for (let n = 0; n < q.legs; n++)
      f.lineStyle(n < q.leg ? 3 : 1.5, c, 0.9).strokeCircle(
        q.x + (n - (q.legs - 1) / 2) * 11,
        q.y - q.radius - 10,
        3,
      );
    return;
  }
  const sprays = cues.filter(
      (p): p is Extract<MoldCue, { kind: "mold-spray" }> =>
        p.kind === "mold-spray" && p.until > now,
    ),
    seen = new Set<string>();
  for (const p of sprays)
    for (const angle of p.angles) {
      const k = angle.toFixed(5);
      if (seen.has(k)) continue;
      seen.add(k);
      h.lineStyle(1.5, p.crossing ? 0xc1a1e3 : 0xe3d2a0, 0.7).lineBetween(
        p.x + Math.cos(angle) * 28,
        p.y + Math.sin(angle) * 28,
        p.x + Math.cos(angle) * 120,
        p.y + Math.sin(angle) * 120,
      );
    }
  const left = sprays.filter((p) => p.at > now).length;
  for (let n = 0; n < left; n++)
    f.lineStyle(2, 0xd8c4e4, 0.9).lineBetween(
      q.x - 30 + 4 * n,
      q.y + 43,
      q.x - 30 + 4 * n,
      q.y + 49,
    );
}
