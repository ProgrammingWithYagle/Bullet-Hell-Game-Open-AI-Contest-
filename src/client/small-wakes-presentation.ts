import library from "../../assets/production/motion/small-wakes-library.json";
import {
  smallClampPanels,
  type SmallWakesCue,
} from "../shared/small-wakes-director.ts";
import type { Boss } from "../shared/game.ts";
import type { BossCue } from "../shared/boss-director.ts";
import { HZ } from "../shared/protocol.ts";
export const smallWakesArt = library.entries;
export function smallWakesPose(
  boss: Boss,
  worldTick: number,
  now: number,
  cues: BossCue[],
  reduced = false,
  drawingTick = worldTick,
) {
  const art = smallWakesArt.find((e) => e.bossId === boss.id);
  if (!art) return null;
  const clock = Number.isFinite(drawingTick)
    ? Math.max(worldTick, drawingTick)
    : worldTick;
  if (boss.health <= 0)
    return {
      frame:
        art.defeatStartFrame +
        (reduced
          ? art.defeatFrames - 1
          : Math.min(
              art.defeatFrames - 1,
              Math.floor(
                (Math.max(0, clock - boss.defeatedAt) * art.defeatFps) / HZ,
              ),
            )),
    };
  if (reduced || now < boss.staggerUntil) return { frame: 0 };
  const shapes = cues.filter(
    (c): c is Extract<SmallWakesCue, { kind: "small-lane" | "small-clamp" }> =>
      (c.kind === "small-lane" || c.kind === "small-clamp") &&
      !c.cancelled &&
      now < c.until,
  );
  const active = shapes
    .filter((c) => now >= c.at)
    .sort((a, b) => b.at - a.at)[0];
  if (active) return { frame: now - active.at < 12 ? 6 : 7 };
  const next = shapes.sort((a, b) => a.at - b.at)[0];
  if (next) return { frame: next.at - now > 10 ? 4 : 5 };
  return { frame: Math.floor((clock * art.fps) / HZ) % 4 };
}
function panel(
  g: any,
  p: {
    x: number;
    y: number;
    aim: number;
    halfLength: number;
    halfWidth: number;
  },
  fill: boolean,
) {
  const ux = Math.cos(p.aim),
    uy = Math.sin(p.aim),
    px = -uy,
    py = ux;
  const points = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => ({
    x: p.x + ux * p.halfLength * a + px * p.halfWidth * b,
    y: p.y + uy * p.halfLength * a + py * p.halfWidth * b,
  }));
  g.beginPath().moveTo(points[0].x, points[0].y);
  for (const q of points.slice(1)) g.lineTo(q.x, q.y);
  g.closePath();
  if (fill) g.fillPath();
  else g.strokePath();
}
function arrow(g: any, x: number, y: number, aim: number, size = 12) {
  const ux = Math.cos(aim),
    uy = Math.sin(aim);
  g.beginPath()
    .moveTo(x - ux * size - uy * 7, y - uy * size + ux * 7)
    .lineTo(x, y)
    .lineTo(x - ux * size + uy * 7, y - uy * size - ux * 7)
    .strokePath();
}
/** Warning geometry and dangerous geometry use the same authoritative coordinates. */
export function drawSmallWakes(h: any, f: any, cues: BossCue[], now: number) {
  for (const c of cues) {
    if (c.kind === "small-prop") {
      const alive = c.health > 0;
      f.lineStyle(
        alive ? 2.5 : 1,
        alive ? 0xe8d194 : 0x89918e,
        alive ? 1 : 0.35,
      );
      if (c.role === "anchor") {
        f.strokeRect(c.x - 19, c.y - 19, 38, 38);
        f.beginPath()
          .moveTo(c.x - 12, c.y - 10)
          .lineTo(c.x + 10, c.y + 12)
          .moveTo(c.x + 12, c.y - 10)
          .lineTo(c.x - 10, c.y + 12)
          .strokePath();
      } else {
        f.strokeCircle(c.x, c.y, 20);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          f.beginPath()
            .moveTo(c.x, c.y)
            .lineTo(c.x + Math.cos(a) * 16, c.y + Math.sin(a) * 16)
            .strokePath();
        }
      }
      if (alive)
        f.fillStyle(0xead6a3, 0.95).fillRect(
          c.x - 22,
          c.y + 28,
          (44 * c.health) / c.maxHealth,
          4,
        );
    } else if (c.kind === "small-lane" && !c.cancelled) {
      const aim = Math.atan2(c.y2 - c.y1, c.x2 - c.x1),
        length = Math.hypot(c.x2 - c.x1, c.y2 - c.y1),
        shape = {
          x: (c.x1 + c.x2) / 2,
          y: (c.y1 + c.y2) / 2,
          aim,
          halfLength: length / 2,
          halfWidth: c.width / 2,
        };
      const warning = now < c.at,
        color = c.role === "wax" ? 0xe5b56e : 0xa0d8df;
      h.fillStyle(color, warning ? 0.07 : 0.24);
      panel(h, shape, true);
      f.lineStyle(warning ? 2 : 3, color, warning ? 0.8 : 1);
      panel(f, shape, false);
      // Round end caps are part of the damaging capsule, including its exact visible extent.
      for (const q of [
        { x: c.x1, y: c.y1 },
        { x: c.x2, y: c.y2 },
      ]) {
        h.fillCircle(q.x, q.y, c.width / 2);
        f.strokeCircle(q.x, q.y, c.width / 2);
      }
      if (warning)
        for (const fraction of [0.25, 0.5, 0.75])
          arrow(
            f,
            c.x1 + (c.x2 - c.x1) * fraction,
            c.y1 + (c.y2 - c.y1) * fraction,
            aim,
          );
    } else if (c.kind === "small-clamp" && !c.cancelled) {
      const warning = now < c.at,
        panels = smallClampPanels(c, now);
      h.fillStyle(warning ? 0xd1bb83 : 0xe99873, warning ? 0.06 : 0.26);
      f.lineStyle(warning ? 2 : 3, warning ? 0xe2cf92 : 0xffbd91, 0.95);
      for (const p of panels) {
        panel(h, p, true);
        panel(f, p, false);
      }
      if (warning) {
        f.lineStyle(1, 0xe2cf92, 0.55);
        for (const p of smallClampPanels(c, c.closeAt)) panel(f, p, false);
        for (const side of [-1, 1]) {
          const across = c.axis + Math.PI / 2;
          arrow(
            f,
            c.x + Math.cos(across) * 100 * side,
            c.y + Math.sin(across) * 100 * side,
            across + (side === 1 ? Math.PI : 0),
            18,
          );
        }
      }
    } else if (c.kind === "small-volley" && !c.cancelled && now < c.at) {
      f.lineStyle(1.5, 0xe9c98e, 0.75);
      for (const edge of [-0.5, 0, 0.5]) {
        const a = c.aim + c.arc * edge;
        f.beginPath()
          .moveTo(c.x, c.y)
          .lineTo(c.x + Math.cos(a) * 280, c.y + Math.sin(a) * 280)
          .strokePath();
      }
    }
  }
  // A thin link identifies the finite object that cancels each marked hazard.
  for (const c of cues) {
    if (
      (c.kind !== "small-clamp" && c.kind !== "small-lane") ||
      c.cancelled ||
      !c.sourceId
    )
      continue;
    const p = cues.find(
      (q) => q.kind === "small-prop" && q.id === c.sourceId && q.health > 0,
    );
    if (p?.kind !== "small-prop") continue;
    const x = c.kind === "small-lane" ? c.x1 : c.x,
      y = c.kind === "small-lane" ? c.y1 : c.y;
    f.lineStyle(1, 0xd9c58b, 0.28)
      .beginPath()
      .moveTo(p.x, p.y)
      .lineTo(x, y)
      .strokePath();
  }
}
