import tuning from "./clerk-appeal-rules.json";
import { clamp, distance, segmentRect, type Rect } from "./geometry.ts";
import type { Vec } from "./protocol.ts";
export type ExcludedCircle = Vec & { radius: number };
/** A bounded walkable grid supplies connected candidate centers on the actual arena. */
export function clerkStampCenters(
  bounds: Rect,
  obstacles: Rect[],
  target: Vec,
  excluded: ExcludedCircle[] = [],
  previous: Vec[] = [],
  radius = tuning.stampRadius,
  count = 3,
  previousSpacing = radius * 2 + tuning.stampSeparation,
) {
  if (!Number.isInteger(count) || count < 1 || count > 10) return [];
  const step = tuning.gridSpacing,
    body = 9,
    pad = radius + tuning.stampClearance;
  const nx = Math.floor((bounds.width - body * 2 - 2) / step) + 1,
    ny = Math.floor((bounds.height - body * 2 - 2) / step) + 1;
  if (nx < 1 || ny < 1 || nx * ny > 2000) return [];
  const nodes = Array.from({ length: nx * ny }, (_, i) => ({
    x: bounds.x + body + 1 + (i % nx) * step,
    y: bounds.y + body + 1 + Math.floor(i / nx) * step,
  }));
  const clear = (a: Vec, b: Vec, r: number) =>
    !obstacles.some((o) => segmentRect(a, b, o, r) !== null);
  const valid = nodes.map((p) => clear(p, p, body)),
    seen = new Uint8Array(nodes.length),
    queue: number[] = [];
  const origin = {
    x: clamp(target.x, bounds.x + body, bounds.x + bounds.width - body),
    y: clamp(target.y, bounds.y + body, bounds.y + bounds.height - body),
  };
  const anchors = nodes
    .map((p, i) => ({ i, d: distance(p, origin) }))
    .filter(
      (a) => valid[a.i] && a.d <= step * 3 && clear(origin, nodes[a.i], body),
    )
    .toSorted((a, b) => a.d - b.d);
  for (const a of anchors) {
    seen[a.i] = 1;
    queue.push(a.i);
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head],
      x = i % nx,
      y = Math.floor(i / nx);
    for (const j of [
      x ? i - 1 : -1,
      x < nx - 1 ? i + 1 : -1,
      y ? i - nx : -1,
      y < ny - 1 ? i + nx : -1,
    ])
      if (j >= 0 && !seen[j] && valid[j] && clear(nodes[i], nodes[j], body)) {
        seen[j] = 1;
        queue.push(j);
      }
  }
  const candidates = nodes
    .filter(
      (p, i) =>
        seen[i] &&
        p.x >= bounds.x + pad &&
        p.x <= bounds.x + bounds.width - pad &&
        p.y >= bounds.y + pad &&
        p.y <= bounds.y + bounds.height - pad &&
        clear(p, p, pad) &&
        excluded.every(
          (e) => distance(p, e) > radius + e.radius + tuning.stampClearance,
        ) &&
        previous.every((e) => distance(p, e) > previousSpacing),
    )
    .toSorted(
      (a, b) =>
        distance(a, origin) - distance(b, origin) || a.y - b.y || a.x - b.x,
    );
  const result: Vec[] = [];
  for (const p of candidates)
    if (
      result.every((q) => distance(p, q) > radius * 2 + tuning.stampSeparation)
    ) {
      result.push(p);
      if (result.length === count) break;
    }
  return result.length === count ? result : [];
}
