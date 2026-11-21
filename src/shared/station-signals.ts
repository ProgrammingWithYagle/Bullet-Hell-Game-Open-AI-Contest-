import { DT, HZ, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  moveBody,
  segmentRect,
  type Rect,
} from "./geometry.ts";
import type { SignatureContext } from "./boss-director.ts";
import { sluiceValvePoint } from "./sluice-pressure.ts";
export const stationRules = {
  warning: 2,
  travel: 2.6,
  trackWidth: 100,
  carLength: 125,
  signalHealth: 30,
  damage: 20,
  brutalReturn: 7,
  crazedReturn: 12,
  walkSpeed: 50,
};
type Life = {
  id: number;
  beganAt: number;
  at: number;
  until: number;
  phase: number;
  dispatch: number;
  signal: number;
};
export type StationSignal = Life &
  Vec & {
    kind: "service-train-signal";
    radius: number;
    health: number;
    maxHealth: number;
    open: boolean;
  };
export type StationTrack = Life &
  Rect & {
    kind: "service-train-track";
    axis: "x" | "y";
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    carX: number;
    carY: number;
    oldCarX: number;
    oldCarY: number;
    carWidth: number;
    carHeight: number;
    open: boolean;
    damage: number;
  };
export type StationCue = StationSignal | StationTrack;
export type DispatchPlan = {
  axis: "x" | "y";
  offsets: number[];
  open: number;
  sign: number;
  delay: number;
};
type Queued = {
  due: number;
  phase: number;
  dispatch: number;
  reverse: boolean;
};
const ticks = (s: number) => Math.ceil(s * HZ),
  bounds = (c: SignatureContext) =>
    c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
export function stationPlan(
  phase: number,
  cycle: number,
  reverse = false,
): DispatchPlan[] {
  const sign = (cycle % 2 ? -1 : 1) * (reverse ? -1 : 1);
  if (phase === 0)
    return [
      { axis: "y", offsets: [0.33, 0.67], open: cycle % 2, sign, delay: 0 },
    ];
  if (phase === 1)
    return [
      {
        axis: "y",
        offsets: [0.25, 0.5, 0.75],
        open: cycle % 3,
        sign,
        delay: 0,
      },
    ];
  if (phase === 2)
    return [
      {
        axis: "x",
        offsets: [0.27, 0.5, 0.73],
        open: cycle % 3,
        sign,
        delay: 0,
      },
      {
        axis: "y",
        offsets: [0.35, 0.65],
        open: (cycle + 1) % 2,
        sign: -sign,
        delay: 4,
      },
    ];
  return [
    { axis: "y", offsets: [0.3, 0.7], open: cycle % 2, sign, delay: 0 },
    {
      axis: "x",
      offsets: [0.3, 0.7],
      open: (cycle + 1) % 2,
      sign: -sign,
      delay: 3.6,
    },
  ];
}
export function stationTrackRect(
  b: Rect,
  axis: "x" | "y",
  offset: number,
): Rect {
  const width = Math.min(
      stationRules.trackWidth,
      (axis === "y" ? b.width : b.height) * 0.17,
    ),
    pad = 14;
  return axis === "y"
    ? {
        x: b.x + b.width * offset - width / 2,
        y: b.y + pad,
        width,
        height: b.height - pad * 2,
      }
    : {
        x: b.x + pad,
        y: b.y + b.height * offset - width / 2,
        width: b.width - pad * 2,
        height: width,
      };
}
export function stationTrainContact(
  from: Vec,
  to: Vec,
  q: StationTrack,
  body = 9,
  first = false,
) {
  return (
    segmentRect(
      {
        x: (first ? to.x : from.x) - q.oldCarX,
        y: (first ? to.y : from.y) - q.oldCarY,
      },
      { x: to.x - q.carX, y: to.y - q.carY },
      { x: 0, y: 0, width: q.carWidth, height: q.carHeight },
      body,
    ) !== null
  );
}
export class StationSignals {
  private shapes: StationCue[] = [];
  private queue: Queued[] = [];
  private hit = new Map<number, Set<string>>();
  private cycle = 0;
  private now = 0;
  nextSignatureAt = 0;
  get busy() {
    return this.shapes.length > 0 || this.queue.length > 0;
  }
  reset(until = 0, encounter = false) {
    this.shapes = [];
    this.queue = [];
    this.hit.clear();
    this.nextSignatureAt = until;
    if (encounter) this.cycle = 0;
  }
  cues(): StationCue[] {
    return this.shapes
      .filter((q) => q.beganAt <= this.now && q.until > this.now)
      .map((q) => ({ ...q }));
  }
  weakPoints() {
    return this.shapes.filter(
      (q): q is StationSignal =>
        q.kind === "service-train-signal" &&
        !q.open &&
        q.health > 0 &&
        q.beganAt <= this.now &&
        q.until > this.now,
    );
  }
  hitSignal(id: number, amount: number, now: number) {
    const signal = this.weakPoints().find((q) => q.id === id);
    if (
      !signal ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      now >= signal.until
    )
      return 0;
    const actual = Math.min(signal.health, amount);
    signal.health -= actual;
    if (!signal.health)
      for (const q of this.shapes) if (q.signal === id) q.open = true;
    return actual;
  }
  cast(c: SignatureContext) {
    if (
      c.paused ||
      c.auxiliaryBusy ||
      this.busy ||
      c.tick < this.nextSignatureAt
    )
      return true;
    this.now = c.tick;
    const cycle = this.cycle++,
      phase = clamp(c.phase, 0, 3),
      advanced = c.brutal || c.variant === "brutal" || c.variant === "crazed";
    this.queue = [{ due: c.tick, phase, dispatch: cycle * 3, reverse: false }];
    if (advanced)
      this.queue.push({
        due: c.tick + ticks(stationRules.brutalReturn),
        phase,
        dispatch: cycle * 3 + 1,
        reverse: true,
      });
    if (c.variant === "crazed")
      this.queue.push({
        due: c.tick + ticks(stationRules.crazedReturn),
        phase,
        dispatch: cycle * 3 + 2,
        reverse: false,
      });
    this.nextSignatureAt =
      c.tick + ticks(c.variant === "crazed" ? 23 : advanced ? 18 : 11);
    this.emitDue(c);
    return true;
  }
  private emitDue(c: SignatureContext) {
    const ready = this.queue.filter((q) => q.due <= c.tick);
    this.queue = this.queue.filter((q) => q.due > c.tick);
    for (const order of ready) {
      this.hit.set(order.dispatch, new Set());
      c.warn?.();
      for (const plan of stationPlan(
        order.phase,
        Math.floor(order.dispatch / 3),
        order.reverse,
      ))
        for (const [i, offset] of plan.offsets.entries()) {
          const box = stationTrackRect(bounds(c), plan.axis, offset),
            point = sluiceValvePoint(c, box, plan.axis, plan.sign);
          if (!point) continue;
          const beganAt = c.tick + ticks(plan.delay),
            at = beganAt + ticks(stationRules.warning),
            until = at + ticks(stationRules.travel),
            signal = c.id(),
            open = i === plan.open,
            health =
              stationRules.signalHealth +
              Math.min(30, Math.max(0, c.targets.length - 1) * 5),
            life = {
              beganAt,
              at,
              until,
              signal,
              phase: order.phase,
              dispatch: order.dispatch,
            };
          this.shapes.push({
            kind: "service-train-signal",
            id: signal,
            ...life,
            at: beganAt,
            ...point,
            radius: 19,
            health,
            maxHealth: health,
            open,
          });
          const carWidth =
              plan.axis === "x"
                ? Math.min(stationRules.carLength, box.width)
                : box.width,
            carHeight =
              plan.axis === "y"
                ? Math.min(stationRules.carLength, box.height)
                : box.height;
          const fromX =
              plan.axis === "x" && plan.sign < 0
                ? box.x + box.width - carWidth
                : box.x,
            fromY =
              plan.axis === "y" && plan.sign < 0
                ? box.y + box.height - carHeight
                : box.y,
            toX =
              plan.axis === "x" && plan.sign > 0
                ? box.x + box.width - carWidth
                : box.x,
            toY =
              plan.axis === "y" && plan.sign > 0
                ? box.y + box.height - carHeight
                : box.y;
          this.shapes.push({
            kind: "service-train-track",
            id: c.id(),
            ...life,
            ...box,
            axis: plan.axis,
            fromX,
            fromY,
            toX,
            toY,
            carX: fromX,
            carY: fromY,
            oldCarX: fromX,
            oldCarY: fromY,
            carWidth,
            carHeight,
            open,
            damage: stationRules.damage,
          });
        }
    }
  }
  step(c: SignatureContext) {
    const before = this.now;
    this.now = c.tick;
    if (c.paused) {
      this.reset(c.tick + ticks(1.5));
      return;
    }
    const warn = this.shapes.some(
      (q) => q.beganAt > before && q.beganAt <= c.tick,
    );
    this.emitDue(c);
    if (warn) c.warn?.();
    for (const q of this.shapes) {
      if (
        q.kind !== "service-train-track" ||
        q.open ||
        c.tick < q.at ||
        c.tick >= q.until
      )
        continue;
      q.oldCarX = q.carX;
      q.oldCarY = q.carY;
      const t = clamp((c.tick - q.at) / (q.until - q.at - 1), 0, 1);
      q.carX = q.fromX + (q.toX - q.fromX) * t;
      q.carY = q.fromY + (q.toY - q.fromY) * t;
      const hit = this.hit.get(q.dispatch)!;
      for (const p of c.targets)
        if (
          !hit.has(p.id) &&
          stationTrainContact(
            { x: p.oldX, y: p.oldY },
            p,
            q,
            9,
            c.tick === q.at,
          )
        ) {
          hit.add(p.id);
          c.damage(p.id, q.damage * c.damageScale);
        }
    }
    this.shapes = this.shapes.filter((q) => q.until > c.tick);
    const live = new Set(this.shapes.map((q) => q.dispatch));
    for (const id of this.hit.keys()) if (!live.has(id)) this.hit.delete(id);
    if (!this.busy && !c.auxiliaryBusy) {
      this.move(c);
      if ((c.aimTargets ?? c.targets).length && c.tick >= this.nextSignatureAt)
        this.cast(c);
    }
  }
  private move(c: SignatureContext) {
    const b = bounds(c),
      point = {
        x: b.x + b.width * (this.cycle % 2 ? 0.68 : 0.32),
        y: b.y + b.height * 0.38,
      },
      d = distance(c.boss, point);
    if (d < 2) return;
    const step = Math.min(
        d,
        stationRules.walkSpeed * (c.movementSpeedScale ?? 1) * DT,
      ),
      next = moveBody(
        c.boss,
        {
          x: ((point.x - c.boss.x) / d) * step,
          y: ((point.y - c.boss.y) / d) * step,
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
      hitGroups: this.hit.size,
    };
  }
}
