import { distance } from "./geometry.ts";
import type { Vec } from "./protocol.ts";
const angleDelta = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** Conservative two-pixel sampling covers simultaneous radial and body motion. */
export function gappedRingContact(
  from: Vec,
  to: Vec,
  ring: {
    x: number;
    y: number;
    oldRadius: number;
    radius: number;
    width: number;
    gapAngle?: number;
    gap?: number;
  },
  body = 9,
) {
  const steps = Math.max(
    1,
    Math.ceil(
      (distance(from, to) + Math.abs(ring.radius - ring.oldRadius)) / 2,
    ),
  );
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      x = from.x + (to.x - from.x) * t - ring.x,
      y = from.y + (to.y - from.y) * t - ring.y,
      r = ring.oldRadius + (ring.radius - ring.oldRadius) * t,
      d = Math.hypot(x, y);
    if (Math.abs(d - r) > ring.width / 2 + body + 2) continue;
    const edgePad = Math.asin(Math.min(1, (body + 2) / Math.max(d, body + 2)));
    if (
      ring.gap &&
      Math.abs(angleDelta(Math.atan2(y, x), ring.gapAngle ?? 0)) <
        ring.gap / 2 - edgePad
    )
      continue;
    return true;
  }
  return false;
}
