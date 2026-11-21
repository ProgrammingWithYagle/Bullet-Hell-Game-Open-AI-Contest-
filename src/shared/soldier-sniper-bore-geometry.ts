import type { Rect } from "./geometry.ts";
import type { Vec } from "./protocol.ts";

/** The physical forward exit from an already contacted padded solid. No travel is granted here. */
export function sniperCoverExit(
  entry: Vec,
  direction: Vec,
  solid: Rect,
  radius: number,
  maximum: number,
) {
  const values = [
    entry.x,
    entry.y,
    direction.x,
    direction.y,
    solid.x,
    solid.y,
    solid.width,
    solid.height,
    radius,
    maximum,
  ];
  if (
    !values.every(Number.isFinite) ||
    radius < 0 ||
    maximum < 0 ||
    solid.width <= 0 ||
    solid.height <= 0
  )
    return;
  const length = Math.hypot(direction.x, direction.y);
  if (length < 1e-12) return;
  const unit = { x: direction.x / length, y: direction.y / length },
    low = { x: solid.x - radius, y: solid.y - radius },
    high = {
      x: solid.x + solid.width + radius,
      y: solid.y + solid.height + radius,
    };
  if (
    entry.x < low.x - 1e-8 ||
    entry.x > high.x + 1e-8 ||
    entry.y < low.y - 1e-8 ||
    entry.y > high.y + 1e-8
  )
    return;
  let distance = Infinity;
  for (const axis of ["x", "y"] as const) {
    if (Math.abs(unit[axis]) < 1e-12) continue;
    const edge = unit[axis] > 0 ? high[axis] : low[axis];
    distance = Math.min(distance, (edge - entry[axis]) / unit[axis]);
  }
  if (
    !Number.isFinite(distance) ||
    distance < -1e-8 ||
    distance > maximum + 1e-8
  )
    return;
  distance = Math.max(0, distance);
  return {
    x: entry.x + unit.x * distance,
    y: entry.y + unit.y * distance,
    distance,
  };
}
