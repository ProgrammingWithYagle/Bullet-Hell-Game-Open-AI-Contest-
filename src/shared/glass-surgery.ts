import { DT, type Vec } from "./protocol.ts";
import { clamp, distance, moveBody, type Rect } from "./geometry.ts";
import type { SignatureContext } from "./boss-director.ts";
export type GlassRoute = { lenses: number[]; aim: Vec; delay: number };
export function glassPlan(c: SignatureContext, target: Vec, index: number) {
  const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
    phase = clamp(c.phase, 0, 3),
    center = { x: b.x + b.width / 2, y: b.y + b.height * 0.45 },
    turn = ((index % 8) * Math.PI) / 4,
    radius = Math.min(240, b.width * 0.22, b.height * 0.23),
    count = phase === 0 ? 1 : phase === 1 ? 2 : 3,
    lenses = Array.from({ length: count }, (_, n) => ({
      x: center.x + Math.cos(turn + (n * Math.PI * 2) / count) * radius,
      y: center.y + Math.sin(turn + (n * Math.PI * 2) / count) * radius * 0.65,
    })),
    rotate = (p: Vec, angle: number) => {
      const dx = p.x - center.x,
        dy = p.y - center.y;
      return {
        x: clamp(
          center.x + dx * Math.cos(angle) - dy * Math.sin(angle),
          b.x + 25,
          b.x + b.width - 25,
        ),
        y: clamp(
          center.y + dx * Math.sin(angle) + dy * Math.cos(angle),
          b.y + 25,
          b.y + b.height - 25,
        ),
      };
    },
    visible = c.aimTargets ?? c.targets,
    other =
      visible.find((p) => distance(p, target) > 60) ??
      rotate(target, Math.PI * 0.7),
    routes: GlassRoute[] =
      phase < 2
        ? [{ lenses: phase === 0 ? [0] : [0, 1], aim: { ...target }, delay: 0 }]
        : [
            { lenses: [0, 1], aim: { ...target }, delay: 0 },
            { lenses: [0, 2], aim: { ...other }, delay: 0 },
          ];
  if (c.variant === "brutal" || c.variant === "crazed" || c.brutal)
    routes.push({
      lenses: phase === 3 ? [2, 1] : [count - 1],
      aim: rotate(target, Math.PI / 3),
      delay: 3.3,
    });
  if (c.variant === "crazed")
    routes.push({
      lenses: [phase === 0 ? 0 : 1],
      aim: { ...other },
      delay: 5.7,
    });
  return {
    lenses,
    routes,
    warning: 2,
    active: 1.25,
    width: 12,
    health: 25 + Math.min(35, Math.max(0, visible.length - 1) * 5),
    cycle: c.variant === "crazed" ? 10.5 : c.brutal ? 8.5 : 7.5,
  };
}
/** Fixed-at-cast rays end inside the shared arena; no target following or closed polygon. */
export function glassRayEnd(from: Vec, target: Vec, bounds: Rect) {
  const angle = Math.atan2(target.y - from.y, target.x - from.x),
    dx = Math.cos(angle),
    dy = Math.sin(angle),
    pad = 20;
  const tx =
      Math.abs(dx) < 1e-8
        ? Infinity
        : ((dx > 0 ? bounds.x + bounds.width - pad : bounds.x + pad) - from.x) /
          dx,
    ty =
      Math.abs(dy) < 1e-8
        ? Infinity
        : ((dy > 0 ? bounds.y + bounds.height - pad : bounds.y + pad) -
            from.y) /
          dy,
    length = Math.max(0, Math.min(tx, ty));
  return { x: from.x + dx * length, y: from.y + dy * length };
}
/** Slow harmless repositioning occurs only between the complete optical casts. */
export function moveGlassSurgeon(
  c: SignatureContext,
  index: number,
  busy: boolean,
) {
  if (busy || c.paused || c.auxiliaryBusy || !c.targets.length) return;
  const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
    angle = ((index % 6) * Math.PI) / 3,
    target = {
      x: b.x + b.width / 2 + Math.cos(angle) * Math.min(260, b.width * 0.2),
      y:
        b.y +
        b.height * 0.36 +
        Math.sin(angle) * Math.min(120, b.height * 0.12),
    },
    d = distance(c.boss, target);
  if (d < 2) return;
  const step = Math.min(d, 55 * (c.movementSpeedScale ?? 1) * DT),
    next = moveBody(
      c.boss,
      {
        x: ((target.x - c.boss.x) / d) * step,
        y: ((target.y - c.boss.y) / d) * step,
      },
      c.radius,
      c.bodyObstacles ?? c.obstacles,
    );
  c.boss.x = next.x;
  c.boss.y = next.y;
}
