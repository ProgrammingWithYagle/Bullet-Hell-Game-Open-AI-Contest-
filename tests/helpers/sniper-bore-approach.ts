import assert from "node:assert/strict";
import {
  distance,
  segmentRect,
  segmentCircle,
  type Rect,
} from "../../src/shared/geometry.ts";
import { sniperCoverExit } from "../../src/shared/soldier-sniper-bore-geometry.ts";
import {
  sniperBoreRules as br,
  sniperRules as r,
} from "../../src/shared/soldier-sniper.ts";
import type { runtimeArena } from "../../src/shared/arena-layouts.ts";
type Point = { x: number; y: number };
export type BoreApproach = Point & {
  aim: number;
  target: Point;
  wall: Rect;
  entry: Point;
  exit?: Point;
  depth?: number;
  postClear: number;
  protectedFromBoss: boolean;
};
// Harness-only legal manual paths/angles from visible runtime cover; never import into production targeting.
export function boreApproach(
  p: Point,
  arena: ReturnType<typeof runtimeArena>,
  variant: "through" | "blocked",
  boss?: Point & { radius: number },
  minimumClear = 160,
): BoreApproach {
  const points: BoreApproach[] = [],
    inside = (q: Point, pad: number) =>
      q.x > arena.bounds.x + pad &&
      q.y > arena.bounds.y + pad &&
      q.x < arena.bounds.x + arena.bounds.width - pad &&
      q.y < arena.bounds.y + arena.bounds.height - pad;
  for (const wall of arena.obstacles) {
    const contacts: { entry: Point; direction: Point }[] = [];
    for (const margin of [24, 32]) {
      for (const [entry, direction] of [
        [
          { x: wall.x - r.radius, y: wall.y + margin },
          { x: 1, y: -1 },
        ],
        [
          { x: wall.x - r.radius, y: wall.y + wall.height - margin },
          { x: 1, y: 1 },
        ],
        [
          { x: wall.x + wall.width + r.radius, y: wall.y + margin },
          { x: -1, y: -1 },
        ],
        [
          {
            x: wall.x + wall.width + r.radius,
            y: wall.y + wall.height - margin,
          },
          { x: -1, y: 1 },
        ],
        [
          { x: wall.x + margin, y: wall.y - r.radius },
          { x: -1, y: 1 },
        ],
        [
          { x: wall.x + wall.width - margin, y: wall.y - r.radius },
          { x: 1, y: 1 },
        ],
        [
          { x: wall.x + margin, y: wall.y + wall.height + r.radius },
          { x: -1, y: -1 },
        ],
        [
          {
            x: wall.x + wall.width - margin,
            y: wall.y + wall.height + r.radius,
          },
          { x: 1, y: -1 },
        ],
      ] as [Point, Point][])
        contacts.push({ entry, direction });
    }
    for (const [entry, direction] of [
      [
        { x: wall.x - r.radius, y: wall.y + wall.height / 2 },
        { x: 1, y: 0 },
      ],
      [
        { x: wall.x + wall.width + r.radius, y: wall.y + wall.height / 2 },
        { x: -1, y: 0 },
      ],
      [
        { x: wall.x + wall.width / 2, y: wall.y - r.radius },
        { x: 0, y: 1 },
      ],
      [
        { x: wall.x + wall.width / 2, y: wall.y + wall.height + r.radius },
        { x: 0, y: -1 },
      ],
    ] as [Point, Point][])
      contacts.push({ entry, direction });
    for (const candidate of contacts) {
      const length = Math.hypot(candidate.direction.x, candidate.direction.y),
        unit = {
          x: candidate.direction.x / length,
          y: candidate.direction.y / length,
        },
        origin = {
          x: candidate.entry.x - unit.x * 24,
          y: candidate.entry.y - unit.y * 24,
        },
        target = { x: origin.x + unit.x * 1600, y: origin.y + unit.y * 1600 };
      if (
        !inside(origin, 12) ||
        arena.obstacles.some((w) => segmentRect(p, origin, w, 9) !== null) ||
        arena.lavaPits.some(
          (l) => segmentCircle(p, origin, l, l.radius + 12) !== null,
        )
      )
        continue;
      let first: { wall: Rect; t: number } | undefined;
      for (const solid of arena.obstacles) {
        const hit = segmentRect(origin, target, solid, r.radius);
        if (hit && (!first || hit.t < first.t))
          first = { wall: solid, t: hit.t };
      }
      if (!first || first.wall !== wall) continue;
      const entry = {
          x: origin.x + (target.x - origin.x) * first.t,
          y: origin.y + (target.y - origin.y) * first.t,
        },
        exit = sniperCoverExit(entry, unit, wall, r.radius, br.coverDepth),
        whole = sniperCoverExit(entry, unit, wall, r.radius, 10000);
      if (
        (variant === "through" && !exit) ||
        (variant === "blocked" && (!whole || whole.distance <= br.coverDepth))
      )
        continue;
      if (
        boss &&
        segmentCircle(origin, entry, boss, boss.radius + r.radius) !== null
      )
        continue;
      let clear = 0;
      if (exit && inside(exit, r.radius)) {
        const end = { x: exit.x + unit.x * 1600, y: exit.y + unit.y * 1600 };
        clear = 1600;
        for (const solid of arena.obstacles) {
          if (solid === wall) continue;
          const hit = segmentRect(exit, end, solid, r.radius);
          if (hit) clear = Math.min(clear, 1600 * hit.t);
        }
        if (boss) {
          const hit = segmentCircle(exit, end, boss, boss.radius + r.radius);
          if (hit !== null) clear = Math.min(clear, 1600 * hit);
        }
        for (const axis of ["x", "y"] as const) {
          const lo = arena.bounds[axis] + r.radius,
            hi =
              arena.bounds[axis] +
              (axis === "x" ? arena.bounds.width : arena.bounds.height) -
              r.radius;
          if (end[axis] < lo || end[axis] > hi)
            clear = Math.min(
              clear,
              ((end[axis] < lo ? lo : hi) - exit[axis]) / unit[axis],
            );
        }
      }
      if (variant === "through" && clear < minimumClear) continue;
      const protectedFromBoss =
        !!boss &&
        arena.obstacles.some((w) => segmentRect(boss, origin, w, 9) !== null);
      points.push({
        ...origin,
        aim: Math.atan2(unit.y, unit.x),
        target,
        wall,
        entry,
        ...(exit
          ? { exit: { x: exit.x, y: exit.y }, depth: exit.distance }
          : {}),
        postClear: clear,
        protectedFromBoss,
      });
    }
  }
  points.sort(
    (a, b) =>
      distance(p, a) -
      distance(p, b) +
      (a.protectedFromBoss ? 0 : 200) -
      (b.protectedFromBoss ? 0 : 200),
  );
  assert(
    points.length,
    "an actual reachable " + variant + " cover line with interior emergence",
  );
  return points[0];
}
export function actualBoreAim(
  p: Point,
  arena: ReturnType<typeof runtimeArena>,
  approach: BoreApproach,
  variant: "through" | "blocked",
) {
  const aim = Math.atan2(approach.target.y - p.y, approach.target.x - p.x),
    to = { x: p.x + Math.cos(aim) * 1600, y: p.y + Math.sin(aim) * 1600 };
  let first: { wall: Rect; t: number } | undefined;
  for (const wall of arena.obstacles) {
    const hit = segmentRect(p, to, wall, r.radius);
    if (hit && (!first || hit.t < first.t)) first = { wall, t: hit.t };
  }
  assert(first);
  const entry = {
      x: p.x + (to.x - p.x) * first.t,
      y: p.y + (to.y - p.y) * first.t,
    },
    exit = sniperCoverExit(
      entry,
      { x: Math.cos(aim), y: Math.sin(aim) },
      first.wall,
      r.radius,
      br.coverDepth,
    );
  assert.equal(
    !!exit,
    variant === "through",
    "the actual stopped position retains the intended cover crossing",
  );
  return { aim, entry, exit, wall: first.wall };
}
