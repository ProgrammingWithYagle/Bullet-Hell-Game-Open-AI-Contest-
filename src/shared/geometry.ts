import type { Vec } from './protocol.ts';
export type Rect = { x: number; y: number; width: number; height: number };
export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export function segmentCircle(a: Vec, b: Vec, c: Vec, r: number): number | null {
  return segmentCircleXY(a.x, a.y, b.x, b.y, c.x, c.y, r);
}
// Scalar form shares the exact sweep arithmetic without allocating temporary
// relative-position objects for thousands of projectile/body checks.
export function segmentCircleXY(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
): number | null {
  const dx = bx - ax,
    dy = by - ay,
    fx = ax - cx,
    fy = ay - cy;
  const cc = fx * fx + fy * fy - r * r;
  if (cc <= 0) return 0;
  const aa = dx * dx + dy * dy;
  if (aa < 1e-12) return null;
  const bb = 2 * (fx * dx + fy * dy),
    disc = bb * bb - 4 * aa * cc;
  if (disc < 0) return null;
  const t = (-bb - Math.sqrt(disc)) / (2 * aa);
  return t >= 0 && t <= 1 ? t : null;
}
export function segmentRect(a: Vec, b: Vec, r: Rect, pad = 0): { t: number; normal: Vec } | null {
  // Most projectiles are nowhere near masonry. Reject disjoint swept bounds
  // before allocating slab normals; touching bounds still use the exact sweep.
  if (
    Math.max(a.x, b.x) < r.x - pad ||
    Math.min(a.x, b.x) > r.x + r.width + pad ||
    Math.max(a.y, b.y) < r.y - pad ||
    Math.min(a.y, b.y) > r.y + r.height + pad
  )
    return null;
  let enter = 0,
    exit = 1,
    normal = { x: 0, y: 0 };
  for (const axis of ['x', 'y'] as const) {
    const delta = b[axis] - a[axis],
      min = r[axis] - pad,
      max = min + (axis === 'x' ? r.width : r.height) + 2 * pad;
    if (Math.abs(delta) < 1e-12) {
      if (a[axis] < min || a[axis] > max) return null;
      continue;
    }
    let t1 = (min - a[axis]) / delta,
      t2 = (max - a[axis]) / delta;
    const sign = delta > 0 ? -1 : 1;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 >= enter) {
      enter = t1;
      normal = axis === 'x' ? { x: sign, y: 0 } : { x: 0, y: sign };
    }
    exit = Math.min(exit, t2);
    if (enter > exit) return null;
  }
  return enter >= 0 && enter <= 1 && exit >= 0 ? { t: enter, normal } : null;
}
export function moveBody(pos: Vec, delta: Vec, radius: number, obstacles: Rect[]): Vec {
  let p = { ...pos },
    d = { ...delta };
  for (let i = 0; i < 3 && Math.hypot(d.x, d.y) > 0.0001; i++) {
    const end = { x: p.x + d.x, y: p.y + d.y };
    let first: { t: number; normal: Vec } | null = null;
    for (const r of obstacles) {
      const hit = segmentRect(p, end, r, radius);
      if (hit && (!first || hit.t < first.t)) first = hit;
    }
    if (!first) {
      p = end;
      break;
    }
    const t = Math.max(0, first.t - 0.0001);
    p = { x: p.x + d.x * t, y: p.y + d.y * t };
    const remaining = 1 - first.t;
    d = { x: d.x * remaining, y: d.y * remaining };
    const dot = d.x * first.normal.x + d.y * first.normal.y;
    if (dot < 0) {
      d.x -= dot * first.normal.x;
      d.y -= dot * first.normal.y;
    } else break;
  }
  return { x: clamp(p.x, radius, 1600 - radius), y: clamp(p.y, radius, 1000 - radius) };
}
export class SpatialGrid<T extends { x: number; y: number }> {
  private cells = new Map<number, Map<number, T[]>>();
  private querySeen = new WeakMap<T, number>();
  private querySerial = 0;
  clear() {
    this.cells.clear();
  }
  insert(value: T, radius = 9) {
    for (
      let x = Math.floor((value.x - radius) / 128);
      x <= Math.floor((value.x + radius) / 128);
      x++
    )
      for (
        let y = Math.floor((value.y - radius) / 128);
        y <= Math.floor((value.y + radius) / 128);
        y++
      ) {
        let column = this.cells.get(x);
        if (!column) {
          column = new Map<number, T[]>();
          this.cells.set(x, column);
        }
        const list = column.get(y) ?? [];
        list.push(value);
        column.set(y, list);
      }
  }
  query(a: Vec, b: Vec, radius: number): T[] {
    const values: T[] = [];
    this.queryInto(a, b, radius, values);
    return values;
  }
  // Callers may reuse their output array. Returned query() arrays stay owned by
  // their callers; no shared scratch result can be overwritten by a later query.
  queryInto(a: Vec, b: Vec, radius: number, values: T[]): void {
    values.length = 0;
    if (this.querySerial >= Number.MAX_SAFE_INTEGER) {
      this.querySeen = new WeakMap();
      this.querySerial = 0;
    }
    const serial = ++this.querySerial;
    for (
      let x = Math.floor((Math.min(a.x, b.x) - radius) / 128);
      x <= Math.floor((Math.max(a.x, b.x) + radius) / 128);
      x++
    )
      for (
        let y = Math.floor((Math.min(a.y, b.y) - radius) / 128);
        y <= Math.floor((Math.max(a.y, b.y) + radius) / 128);
        y++
      ) {
        const cell = this.cells.get(x)?.get(y);
        if (!cell) continue;
        for (const p of cell)
          if (this.querySeen.get(p) !== serial) {
            this.querySeen.set(p, serial);
            values.push(p);
          }
      }
  }
}
