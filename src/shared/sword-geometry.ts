import { segmentCircle, segmentRect, type Rect } from './geometry.ts';
import type { Vec } from './protocol.ts';

const tau = Math.PI * 2;
export function swordAngleDifference(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** A target-directed blade ray, clamped to the actual finite sector edges. */
export function swordTrace(origin: Vec, aim: number, reach: number, arc: number, target: Vec) {
  const half = Math.min(tau, Math.max(0, arc)) / 2,
    offset = swordAngleDifference(Math.atan2(target.y - origin.y, target.x - origin.x), aim),
    angle = aim + Math.max(-half, Math.min(half, offset));
  return {
    x: origin.x + Math.cos(angle) * reach,
    y: origin.y + Math.sin(angle) * reach,
  };
}

/** Disk/sector contact includes a grazing blade edge, but cannot cross intervening cover. */
export function swordCircleContact(
  origin: Vec,
  aim: number,
  reach: number,
  arc: number,
  target: Vec,
  radius: number,
  obstacles: readonly Rect[] = [],
) {
  const tip = swordTrace(origin, aim, reach, arc, target),
    time = segmentCircle(origin, tip, target, radius);
  if (time === null) return null;
  for (const wall of obstacles) {
    const block = segmentRect(origin, tip, wall);
    if (block && block.t <= time) return null;
  }
  return { time, tip };
}

/** Sweep a projectile against the moving blade's frontal guard plane. */
export function swordGuardContact(
  from: Vec,
  to: Vec,
  previous: Vec,
  current: Vec,
  aim: number,
  shotRadius: number,
  offset: number,
  halfSpan: number,
  halfDepth: number,
) {
  const cosine = Math.cos(aim),
    sine = Math.sin(aim),
    local = (point: Vec, player: Vec) => ({
      x: (point.x - player.x) * cosine + (point.y - player.y) * sine,
      y: -(point.x - player.x) * sine + (point.y - player.y) * cosine,
    }),
    a = local(from, previous),
    b = local(to, current);
  // A projectile going away from the guard cannot supply a counter opening.
  if (b.x >= a.x - 1e-8) return null;
  return (
    segmentRect(
      a,
      b,
      {
        x: offset - halfDepth,
        y: -halfSpan,
        width: halfDepth * 2,
        height: halfSpan * 2,
      },
      shotRadius,
    )?.t ?? null
  );
}
