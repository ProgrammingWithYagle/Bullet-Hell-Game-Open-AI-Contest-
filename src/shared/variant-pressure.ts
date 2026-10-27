import { HZ, type BossId, type Vec } from "./protocol.ts";
import { segmentCircle, clamp, type Rect } from "./geometry.ts";

export type VariantPressureCue = {
  kind: "variant-pressure";
  id: number;
  style: "pursuit" | "crosscut" | "weave";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  beganAt: number;
  at: number;
  until: number;
  crazed: boolean;
};
type Target = Vec & { id: string; oldX: number; oldY: number };
type Context = {
  now: number;
  bossId: BossId;
  variant: string;
  phase: number;
  bounds: Rect;
  targets: Target[];
  damageScale: number;
  paused: boolean;
  id(): number;
  damage(id: string, amount: number): void;
};
const ticks = (s: number) => Math.ceil(s * HZ);
/** Additional forms punish a stationary refuge, with fixed geometry and a complete tell. */
export class VariantPressure {
  private shapes: VariantPressureCue[] = [];
  private nextAt = 0;
  private sequence = 0;
  private touched = new Set<string>();
  reset(now = 0) {
    this.shapes = [];
    this.touched.clear();
    this.sequence = 0;
    this.nextAt = now + ticks(6);
  }
  clear() {
    this.shapes = [];
    this.touched.clear();
  }
  cues(): VariantPressureCue[] {
    return this.shapes.map((c) => ({ ...c }));
  }
  step(c: Context) {
    if (c.variant === "normal") {
      this.clear();
      return;
    }
    // A Warden sweep must retain its clear trailing space. Pausing cancels all auxiliary pressure.
    if (c.paused) {
      this.clear();
      this.nextAt = Math.max(this.nextAt, c.now + ticks(2));
      return;
    }
    const crazed = c.variant === "crazed";
    if (c.now >= this.nextAt && c.targets.length) {
      const b = c.bounds,
        index = this.sequence++;
      const seed = [...c.bossId].reduce((n, char) => n + char.charCodeAt(0), 0);
      const targets = c.targets.toSorted((a, b) => a.id.localeCompare(b.id));
      const target = targets[(index + seed) % targets.length];
      const x = clamp(target.x, b.x + 32, b.x + b.width - 32);
      const y = clamp(target.y, b.y + 32, b.y + b.height - 32);
      const add = (
        style: VariantPressureCue["style"],
        a: Vec,
        z: Vec,
        width: number,
        delay = 0,
      ) => {
        const at = c.now + ticks(1.8 + delay);
        this.shapes.push({
          kind: "variant-pressure",
          id: c.id(),
          style,
          x1: a.x,
          y1: a.y,
          x2: z.x,
          y2: z.y,
          width,
          beganAt: c.now,
          at,
          until: at + ticks(0.55),
          crazed,
        });
      };
      if (index % (crazed ? 3 : 2) === 0) {
        // Widely separated players are marked in rotating groups; all fifty are never caged at once.
        const chosen: Target[] = [];
        for (
          let n = 0;
          n < targets.length && chosen.length < (crazed ? 3 : 2);
          n++
        ) {
          const p = targets[(index + seed + n) % targets.length];
          if (chosen.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > 180))
            chosen.push(p);
        }
        for (const p of chosen) add("pursuit", p, p, crazed ? 132 : 112);
      } else {
        const vertical = (index + seed) % 2 === 0;
        add(
          index % 3 === 2 && crazed ? "weave" : "crosscut",
          vertical ? { x, y: b.y } : { x: b.x, y },
          vertical ? { x, y: b.y + b.height } : { x: b.x + b.width, y },
          crazed ? 70 : 54,
        );
        if (crazed && index % 3 === 2)
          add(
            "weave",
            vertical ? { x: b.x, y } : { x, y: b.y },
            vertical ? { x: b.x + b.width, y } : { x, y: b.y + b.height },
            70,
            1.15,
          );
      }
      this.nextAt =
        c.now + ticks((crazed ? 6.5 : 10) - Math.min(2, c.phase) * 0.45);
    }
    for (const shape of this.shapes) {
      if (c.now < shape.at || c.now >= shape.until) continue;
      for (const p of c.targets) {
        const key = shape.id + ":" + p.id;
        if (this.touched.has(key)) continue;
        // Capsule sweep includes end caps and player movement between authority ticks.
        const hit =
          segmentCircle(
            { x: p.oldX, y: p.oldY },
            p,
            { x: shape.x1, y: shape.y1 },
            shape.width / 2 + 9,
          ) !== null ||
          segmentCircle(
            { x: shape.x1, y: shape.y1 },
            { x: shape.x2, y: shape.y2 },
            p,
            shape.width / 2 + 9,
          ) !== null ||
          segmentCircle(
            { x: shape.x1, y: shape.y1 },
            { x: shape.x2, y: shape.y2 },
            { x: p.oldX, y: p.oldY },
            shape.width / 2 + 9,
          ) !== null ||
          segmentCircle(
            { x: p.oldX, y: p.oldY },
            p,
            { x: shape.x2, y: shape.y2 },
            shape.width / 2 + 9,
          ) !== null ||
          crossedSegments(
            { x: p.oldX, y: p.oldY },
            p,
            { x: shape.x1, y: shape.y1 },
            { x: shape.x2, y: shape.y2 },
          );
        if (hit) {
          c.damage(p.id, (shape.style === "pursuit" ? 14 : 18) * c.damageScale);
          this.touched.add(key);
        }
      }
    }
    const expired = this.shapes
      .filter((s) => c.now >= s.until)
      .map((s) => s.id + ":");
    this.shapes = this.shapes.filter((s) => c.now < s.until);
    for (const key of this.touched)
      if (expired.some((prefix) => key.startsWith(prefix)))
        this.touched.delete(key);
  }
}
function crossedSegments(a: Vec, b: Vec, c: Vec, d: Vec) {
  const cross = (u: Vec, v: Vec, w: Vec) =>
    (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
  const ab1 = cross(a, b, c),
    ab2 = cross(a, b, d),
    cd1 = cross(c, d, a),
    cd2 = cross(c, d, b);
  return ab1 * ab2 < 0 && cd1 * cd2 < 0;
}
