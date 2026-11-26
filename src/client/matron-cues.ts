import Phaser from "phaser";
import type { MatronCue } from "../shared/matron-ward.ts";
type Owned = Exclude<MatronCue, { kind: "service-prop" }>;
/** Read-only shapes from authority. Warnings remain visible under reduced effects/motion. */
export function drawMatronCue(
  h: Phaser.GameObjects.Graphics,
  f: Phaser.GameObjects.Graphics,
  q: Owned,
  now: number,
  cues: MatronCue[],
) {
  const active = now >= q.at,
    color = active ? 0xf1a47e : 0xe2cf9a;
  if (q.kind === "matron-walk") {
    h.lineStyle(2, 0xbacbd0, active ? 0.35 : 0.7);
    for (let i = Math.max(1, q.index); i < q.path.length; i++)
      h.lineBetween(q.path[i - 1].x, q.path[i - 1].y, q.path[i].x, q.path[i].y);
    const end = q.path.at(-1)!;
    h.strokeCircle(end.x, end.y, 13);
    h.lineBetween(end.x - 8, end.y, end.x + 8, end.y).lineBetween(
      end.x,
      end.y - 8,
      end.x,
      end.y + 8,
    );
    return;
  }
  if (q.kind === "matron-brood") {
    h.lineStyle(3, color, 0.9).strokeCircle(q.x, q.y, 42);
    const progress = Math.max(
      0,
      Math.min(1, (now - q.beganAt) / Math.max(1, q.at - q.beganAt)),
    );
    h.lineStyle(4, color, 0.9).lineBetween(
      q.x - 24,
      q.y + 49,
      q.x - 24 + 48 * progress,
      q.y + 49,
    );
    for (let i = 0; i < q.count; i++)
      h.lineStyle(2, color, 0.9).strokeCircle(
        q.x + (i - (q.count - 1) / 2) * 12,
        q.y - 51,
        4,
      );
    return;
  }
  if (q.kind === "matron-pulse") {
    const radius = active ? q.radius : 80,
      points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = q.gapAngle + q.gap / 2 + ((Math.PI * 2 - q.gap) * i) / 64;
      points.push(
        new Phaser.Math.Vector2(
          q.x + Math.cos(angle) * radius,
          q.y + Math.sin(angle) * radius,
        ),
      );
    }
    h.lineStyle(active ? q.width : 3, color, active ? 0.7 : 0.85).strokePoints(
      points,
      false,
    );
    for (const side of [-1, 1]) {
      const a = q.gapAngle + (side * q.gap) / 2;
      h.lineStyle(3, 0xb4dcc6, 0.95).lineBetween(
        q.x + Math.cos(a) * Math.max(22, radius - 15),
        q.y + Math.sin(a) * Math.max(22, radius - 15),
        q.x + Math.cos(a) * (radius + 15),
        q.y + Math.sin(a) * (radius + 15),
      );
    }
    if (!active) {
      for (let i = 0; i <= q.index; i++)
        f.lineStyle(3, color, 0.9).lineBetween(
          q.x + (i - q.index / 2) * 11,
          q.y - 8,
          q.x + (i - q.index / 2) * 11,
          q.y + 8,
        );
    }
    return;
  }
  // Draw every distinct future ray once from its actual alternating port. Remaining marks express repeats.
  const groups = cues.filter(
      (p): p is Extract<MatronCue, { kind: "matron-needles" }> =>
        p.kind === "matron-needles" &&
        p.sourceId === q.sourceId &&
        p.until > now,
    ),
    seen = new Set<string>();
  for (const group of groups)
    for (const angle of group.angles) {
      const key = group.x + ":" + group.y + ":" + angle.toFixed(5);
      if (seen.has(key)) continue;
      seen.add(key);
      const c = group.crossing ? 0xc3a2e4 : 0xe2cf9a;
      h.lineStyle(1.5, c, 0.6).lineBetween(
        group.x + Math.cos(angle) * 27,
        group.y + Math.sin(angle) * 27,
        group.x + Math.cos(angle) * 108,
        group.y + Math.sin(angle) * 108,
      );
    }
  const remaining = groups.filter((g) => g.at > now).length;
  for (let i = 0; i < remaining; i++)
    f.lineStyle(2, 0xd9c9ea, 0.8).lineBetween(
      q.x - 28 + i * 4,
      q.y + 62,
      q.x - 28 + i * 4,
      q.y + 68,
    );
}
