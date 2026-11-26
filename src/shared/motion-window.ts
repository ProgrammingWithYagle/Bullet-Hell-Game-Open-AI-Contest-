import type { Vec } from "./protocol.ts";

/** A projectile leg occupies this fraction of the current fixed simulation tick. */
export type MotionWindow = { from: number; to: number };
export function motionAt(previous: Vec, current: Vec, fraction: number): Vec {
  // Keep issued full-tick endpoints bit-for-bit, avoiding subtract/add drift.
  if (fraction === 0) return previous;
  if (fraction === 1) return current;
  return {
    x: previous.x + (current.x - previous.x) * fraction,
    y: previous.y + (current.y - previous.y) * fraction,
  };
}
