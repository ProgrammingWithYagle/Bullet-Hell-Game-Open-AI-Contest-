import { DT, HZ, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  moveBody,
  segmentRect,
  segmentCircle,
  type Rect,
} from "./geometry.ts";
import type { SignatureContext } from "./boss-director.ts";
import { sluiceValvePoint } from "./sluice-pressure.ts";
export const lamplightRules = {
  warning: 2.8,
  pulse: 0.9,
  waveSpacing: 4.8,
  brutalAfterLast: 6,
  crazedAfterReturn: 4.8,
  width: 170,
  height: 130,
  finalWidth: 140,
  finalHeight: 110,
  growth: 60,
  wickHealth: 30,
  damage: 12,
  walkSpeed: 45,
};
type Life = {
  id: number;
  wave: number;
  phase: number;
  beganAt: number;
  at: number;
  until: number;
};
export type LampWick = Life &
  Vec & {
    kind: "service-lamp-wick";
    radius: number;
    health: number;
    maxHealth: number;
    group: number;
  };
export type LampShadow = Life &
  Rect & {
    kind: "service-lamp-shadow";
    lamp: number;
    group: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    goalX: number;
    goalY: number;
    banked: boolean;
    owner: string;
  };
export type LampPulse = Life &
  Rect & { kind: "service-lamp-pulse"; damage: number };
export type LamplightCue = LampWick | LampShadow | LampPulse;
type Order = {
  due: number;
  wave: number;
  phase: number;
  turn: number;
  moving: boolean;
};
const ticks = (s: number) => Math.ceil(s * HZ - 1e-9),
  floor = (c: SignatureContext) =>
    c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
export function lamplightOrders(
  phase: number,
  cycle: number,
  advanced: boolean,
  crazed: boolean,
) {
  const count = [1, 1, 2, 3][clamp(phase, 0, 3)],
    orders: { delay: number; moving: boolean; turn: number }[] = [];
  for (let n = 0; n < count; n++)
    orders.push({
      delay: n * lamplightRules.waveSpacing,
      moving: phase === 1 || phase === 3 || (phase === 2 && n > 0),
      turn: cycle + n,
    });
  if (advanced)
    orders.push({
      delay: orders.at(-1)!.delay + lamplightRules.brutalAfterLast,
      moving: true,
      turn: cycle + count,
    });
  if (crazed)
    orders.push({
      delay: orders.at(-1)!.delay + lamplightRules.crazedAfterReturn,
      moving: true,
      turn: cycle + count + 1,
    });
  return orders;
}
export function lamplightRect(
  b: Rect,
  p: Vec,
  width: number,
  height: number,
): Rect {
  width = Math.min(width, b.width);
  height = Math.min(height, b.height);
  return {
    x: clamp(p.x - width / 2, b.x, b.x + b.width - width),
    y: clamp(p.y - height / 2, b.y, b.y + b.height - height),
    width,
    height,
  };
}
export function lamplightSafe(p: Vec, r: Rect, body = 9) {
  return (
    p.x - body >= r.x - 1e-7 &&
    p.y - body >= r.y - 1e-7 &&
    p.x + body <= r.x + r.width + 1e-7 &&
    p.y + body <= r.y + r.height + 1e-7
  );
}
/** Union the intervals where the whole body fits a refuge; any uncovered travel is exposed. */
export function lamplightExposed(
  from: Vec,
  to: Vec,
  shadows: readonly Rect[],
  body = 9,
) {
  const intervals: [number, number][] = [];
  for (const r of shadows) {
    let enter = 0,
      leave = 1,
      valid = true;
    for (const axis of ["x", "y"] as const) {
      const size = axis === "x" ? "width" : "height",
        min = r[axis] + body,
        max = r[axis] + r[size] - body,
        delta = to[axis] - from[axis];
      if (max < min) {
        valid = false;
        break;
      }
      if (Math.abs(delta) < 1e-9) {
        if (from[axis] < min - 1e-7 || from[axis] > max + 1e-7) {
          valid = false;
          break;
        }
      } else {
        const a = (min - from[axis]) / delta,
          b = (max - from[axis]) / delta;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
        if (enter > leave + 1e-7) {
          valid = false;
          break;
        }
      }
    }
    if (valid && leave >= 0 && enter <= 1)
      intervals.push([Math.max(0, enter), Math.min(1, leave)]);
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let covered = 0;
  for (const [begin, end] of intervals) {
    if (begin > covered + 1e-7) return true;
    covered = Math.max(covered, end);
    if (covered >= 1 - 1e-7) return false;
  }
  return true;
}
function reachable(c: SignatureContext, from: Vec, to: Vec) {
  const b = floor(c);
  return (
    to.x >= b.x + 10 &&
    to.y >= b.y + 10 &&
    to.x <= b.x + b.width - 10 &&
    to.y <= b.y + b.height - 10 &&
    distance(from, to) <= 210 &&
    c.obstacles.every((o) => segmentRect(from, to, o, 10) === null) &&
    (c.hazardCircles ?? []).every(
      (p) => segmentCircle(from, to, p, p.radius + 10) === null,
    )
  );
}
export function lamplightRefuge(
  c: SignatureContext,
  anchor: Vec,
  turn: number,
  index: number,
  width: number,
  height: number,
) {
  const b = floor(c),
    angle = (turn * Math.PI) / 2 + (index * 2 * Math.PI) / 3;
  for (const length of [150, 110, 65])
    for (const offset of [0, 0.55, -0.55, 1.1, -1.1, Math.PI]) {
      const rect = lamplightRect(
          b,
          {
            x: anchor.x + Math.cos(angle + offset) * length,
            y: anchor.y + Math.sin(angle + offset) * length,
          },
          width,
          height,
        ),
        goal = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      if (reachable(c, anchor, goal)) return { rect, goal };
    }
  // A legal survivor already fits this floor-clipped refuge even if its centre is behind cover.
  return { rect: lamplightRect(b, anchor, width, height), goal: { ...anchor } };
}
export class LamplightWatch {
  private shapes: LamplightCue[] = [];
  private queue: Order[] = [];
  private groups = new Map<number, { hit: Set<string>; warned: Set<string> }>();
  private now = 0;
  private cycle = 0;
  nextSignatureAt = 0;
  get busy() {
    return this.shapes.length > 0 || this.queue.length > 0;
  }
  reset(until = 0, encounter = false) {
    this.shapes = [];
    this.queue = [];
    this.groups.clear();
    this.nextSignatureAt = until;
    if (encounter) this.cycle = 0;
  }
  cues(): LamplightCue[] {
    return this.shapes.filter((q) => q.until > this.now).map((q) => ({ ...q }));
  }
  weakPoints() {
    return this.shapes.filter(
      (q): q is LampWick =>
        q.kind === "service-lamp-wick" && q.health > 0 && q.until > this.now,
    );
  }
  hitWick(id: number, amount: number, now: number) {
    const wick = this.weakPoints().find((q) => q.id === id);
    if (!wick || now >= wick.until || !Number.isFinite(amount) || amount <= 0)
      return 0;
    const actual = Math.min(wick.health, amount);
    wick.health -= actual;
    if (!wick.health)
      for (const q of this.shapes)
        if (q.kind === "service-lamp-shadow" && q.lamp === id) {
          const b = this.shapes.find(
            (p): p is LampPulse =>
              p.kind === "service-lamp-pulse" && p.wave === q.wave,
          )!;
          const rect = lamplightRect(
            b,
            { x: q.endX + q.width / 2, y: q.endY + q.height / 2 },
            q.width + lamplightRules.growth,
            q.height + lamplightRules.growth,
          );
          Object.assign(q, rect, {
            startX: rect.x,
            startY: rect.y,
            endX: rect.x,
            endY: rect.y,
            banked: true,
          });
        }
    return actual;
  }
  cast(c: SignatureContext) {
    if (
      c.paused ||
      c.auxiliaryBusy ||
      this.busy ||
      c.tick < this.nextSignatureAt ||
      !c.targets.length
    )
      return true;
    this.now = c.tick;
    const cycle = this.cycle++,
      phase = clamp(c.phase, 0, 3),
      advanced = c.brutal || c.variant === "brutal" || c.variant === "crazed";
    const orders = lamplightOrders(
      phase,
      cycle,
      advanced,
      c.variant === "crazed",
    );
    this.queue = orders.map((q, i) => ({
      ...q,
      due: c.tick + ticks(q.delay),
      wave: cycle * 6 + i,
      phase,
    }));
    this.nextSignatureAt = Math.max(
      c.tick + ticks(9),
      this.queue.at(-1)!.due +
        ticks(lamplightRules.warning + lamplightRules.pulse + 3),
    );
    this.emitDue(c);
    return true;
  }
  private emitDue(c: SignatureContext) {
    const due = this.queue.filter((q) => q.due <= c.tick);
    this.queue = this.queue.filter((q) => q.due > c.tick);
    for (const order of due) {
      const b = floor(c),
        targets = [...c.targets]
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
          .slice(0, 50);
      if (!targets.length) continue;
      const life = {
          wave: order.wave,
          phase: order.phase,
          beganAt: c.tick,
          at: c.tick + ticks(lamplightRules.warning),
          until:
            c.tick +
            ticks(lamplightRules.warning) +
            ticks(lamplightRules.pulse),
        },
        lamps: LampWick[] = [];
      for (let i = 0; i < 3; i++) {
        const point = sluiceValvePoint(
          {
            ...c,
            obstacles: [
              ...c.obstacles,
              ...lamps.map((q) => ({
                x: q.x - 36,
                y: q.y - 36,
                width: 72,
                height: 72,
              })),
            ],
          },
          {
            x: b.x + b.width * [0.25, 0.5, 0.75][i] - 30,
            y: b.y + b.height * 0.3 + 32,
            width: 60,
            height: 60,
          },
          "x",
          1,
        );
        if (!point) break;
        const health =
          lamplightRules.wickHealth +
          Math.min(30, Math.max(0, targets.length - 1) * 5);
        lamps.push({
          ...life,
          ...point,
          id: c.id(),
          kind: "service-lamp-wick",
          radius: 22,
          health,
          maxHealth: health,
          group: i,
        });
      }
      if (lamps.length !== 3) continue;
      const pulse: LampPulse = {
        ...life,
        ...b,
        id: c.id(),
        kind: "service-lamp-pulse",
        damage: lamplightRules.damage,
      };
      const shadows: LampShadow[] = Array.from(
        { length: Math.max(3, targets.length) },
        (_, i) => {
          const p = targets[i % targets.length],
            width =
              order.phase === 3
                ? lamplightRules.finalWidth
                : lamplightRules.width,
            height =
              order.phase === 3
                ? lamplightRules.finalHeight
                : lamplightRules.height,
            end = lamplightRefuge(c, p, order.turn, i, width, height),
            start = order.moving
              ? lamplightRect(b, p, width, height)
              : end.rect;
          return {
            ...life,
            ...start,
            id: c.id(),
            kind: "service-lamp-shadow",
            lamp: lamps[i % 3].id,
            group: i % 3,
            startX: start.x,
            startY: start.y,
            endX: end.rect.x,
            endY: end.rect.y,
            goalX: end.goal.x,
            goalY: end.goal.y,
            banked: false,
            owner: p.id,
          };
        },
      );
      this.groups.set(order.wave, {
        hit: new Set(),
        warned: new Set(targets.map((p) => p.id)),
      });
      this.shapes.push(pulse, ...shadows, ...lamps);
      c.warn?.();
    }
  }
  step(c: SignatureContext) {
    this.now = c.tick;
    if (c.paused) {
      this.reset(c.tick + ticks(1.5));
      return;
    }
    this.emitDue(c);
    for (const q of this.shapes)
      if (q.kind === "service-lamp-shadow" && !q.banked) {
        const t = clamp(
          (c.tick - q.beganAt) / ticks(lamplightRules.warning * 0.8),
          0,
          1,
        );
        q.x = q.startX + (q.endX - q.startX) * t;
        q.y = q.startY + (q.endY - q.startY) * t;
      }
    for (const pulse of this.shapes) {
      if (
        pulse.kind !== "service-lamp-pulse" ||
        c.tick < pulse.at ||
        c.tick >= pulse.until
      )
        continue;
      const group = this.groups.get(pulse.wave)!,
        shadows = this.shapes.filter(
          (q): q is LampShadow =>
            q.kind === "service-lamp-shadow" && q.wave === pulse.wave,
        );
      for (const p of c.targets)
        if (
          group.warned.has(p.id) &&
          !group.hit.has(p.id) &&
          lamplightExposed(
            c.tick === pulse.at ? p : { x: p.oldX, y: p.oldY },
            p,
            shadows,
          )
        ) {
          group.hit.add(p.id);
          c.damage(p.id, pulse.damage * c.damageScale);
        }
    }
    this.shapes = this.shapes.filter((q) => q.until > c.tick);
    const live = new Set(this.shapes.map((q) => q.wave));
    for (const wave of this.groups.keys())
      if (!live.has(wave)) this.groups.delete(wave);
    if (!this.busy && !c.auxiliaryBusy) {
      this.move(c);
      if (c.targets.length && c.tick >= this.nextSignatureAt) this.cast(c);
    }
  }
  private move(c: SignatureContext) {
    const b = floor(c),
      goal = {
        x: b.x + b.width * (this.cycle % 2 ? 0.64 : 0.36),
        y: b.y + b.height * 0.35,
      },
      d = distance(c.boss, goal);
    if (d < 2) return;
    const step = Math.min(
        d,
        lamplightRules.walkSpeed * (c.movementSpeedScale ?? 1) * DT,
      ),
      next = moveBody(
        c.boss,
        {
          x: ((goal.x - c.boss.x) / d) * step,
          y: ((goal.y - c.boss.y) / d) * step,
        },
        c.radius,
        c.bodyObstacles ?? c.obstacles,
      );
    c.boss.x = clamp(next.x, b.x + c.radius, b.x + b.width - c.radius);
    c.boss.y = clamp(next.y, b.y + c.radius, b.y + b.height - c.radius);
  }
  diagnostics() {
    return {
      shapes: this.shapes.length,
      queued: this.queue.length,
      hitGroups: this.groups.size,
    };
  }
}
