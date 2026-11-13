import { DT, type Shot, type Vec } from "./protocol.ts";
import { segmentRect, type Rect } from "./geometry.ts";
import type { MotionWindow } from "./motion-window.ts";
import { sniperCoverExit } from "./soldier-sniper-bore-geometry.ts";

export type BoreFlight = {
  available: boolean;
  passed?: Rect;
  tunnel?: { cover: Rect; entry: Vec; exit: Vec };
};
export type BoreFlightContext = {
  bounds: Rect;
  obstacles: readonly Rect[];
  maximum: number;
  impactAfterCover: number;
  hit(from: Vec, to: Vec, wall: number, window: MotionWindow): boolean;
  crossed(entry: Vec, exit: Vec): void;
};
const same = (a: Rect, b: Rect) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
function first(
  from: Vec,
  to: Vec,
  radius: number,
  c: BoreFlightContext,
  ignore?: Rect,
) {
  let fraction = 1,
    solid: Rect | undefined,
    boundary = false;
  for (const wall of c.obstacles) {
    if (ignore && same(wall, ignore)) continue;
    const hit = segmentRect(from, to, wall, radius);
    if (hit && hit.t <= fraction) {
      fraction = hit.t;
      solid = wall;
    }
  }
  for (const axis of ["x", "y"] as const) {
    const lo = c.bounds[axis] + radius,
      hi =
        c.bounds[axis] +
        (axis === "x" ? c.bounds.width : c.bounds.height) -
        radius;
    if (hi < lo || from[axis] < lo - 1e-8 || from[axis] > hi + 1e-8)
      return { fraction: 0, boundary: true, solid: undefined };
    if (to[axis] < lo || to[axis] > hi) {
      const t =
        ((to[axis] < lo ? lo : hi) - from[axis]) / (to[axis] - from[axis]);
      if (t >= 0 && t <= fraction) {
        fraction = t;
        boundary = true;
        solid = undefined;
      }
    }
  }
  return { fraction, boundary, solid };
}
/** One physical material crossing. Every leg consumes its actual fraction of this tick. */
export function advanceSniperBore(
  s: Shot,
  f: BoreFlight,
  c: BoreFlightContext,
) {
  const delta = { x: s.vx * DT, y: s.vy * DT },
    travel = Math.hypot(delta.x, delta.y);
  if (
    ![s.x, s.y, delta.x, delta.y, travel].every(Number.isFinite) ||
    travel < 1e-12
  )
    return false;
  let elapsed = 0;
  for (let leg = 0; leg < 4; leg++) {
    const from = { x: s.x, y: s.y },
      remaining = 1 - elapsed,
      to = { x: from.x + delta.x * remaining, y: from.y + delta.y * remaining };
    if (f.tunnel && !c.obstacles.some((wall) => same(wall, f.tunnel!.cover))) {
      const tunnel = f.tunnel;
      f.passed = tunnel.cover;
      f.tunnel = undefined;
      s.damage *= c.impactAfterCover;
      c.crossed(tunnel.entry, from);
    }
    if (f.tunnel) {
      const tunnel = f.tunnel,
        distance = Math.hypot(tunnel.exit.x - from.x, tunnel.exit.y - from.y),
        available = travel * remaining,
        end = Math.min(1, distance / available),
        block = first(from, to, s.radius, c, tunnel.cover);
      if ((block.solid || block.boundary) && block.fraction <= end + 1e-9) {
        s.x = from.x + (to.x - from.x) * block.fraction;
        s.y = from.y + (to.y - from.y) * block.fraction;
        return false;
      }
      if (distance > available + 1e-9) {
        s.x = to.x;
        s.y = to.y;
        return true;
      }
      s.x = tunnel.exit.x;
      s.y = tunnel.exit.y;
      elapsed = Math.min(1, elapsed + distance / travel);
      s.damage *= c.impactAfterCover;
      f.passed = tunnel.cover;
      f.tunnel = undefined;
      c.crossed(tunnel.entry, tunnel.exit);
      if (elapsed >= 1 - 1e-12) return true;
      continue;
    }
    const block = first(from, to, s.radius, c, f.passed);
    if (c.hit(from, to, block.fraction, { from: elapsed, to: 1 })) return false;
    s.x = from.x + (to.x - from.x) * block.fraction;
    s.y = from.y + (to.y - from.y) * block.fraction;
    if (!block.solid && !block.boundary) return true;
    if (block.boundary || !block.solid || !f.available) return false;
    f.available = false;
    const exit = sniperCoverExit(s, delta, block.solid, s.radius, c.maximum);
    if (!exit) return false;
    f.tunnel = {
      cover: { ...block.solid },
      entry: { x: s.x, y: s.y },
      exit: { x: exit.x, y: exit.y },
    };
    elapsed += block.fraction * (1 - elapsed);
    if (elapsed >= 1 - 1e-12) return true;
  }
  return true;
}
