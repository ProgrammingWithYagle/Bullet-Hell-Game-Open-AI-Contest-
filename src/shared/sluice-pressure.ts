import { DT, HZ, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  moveBody,
  segmentCircle,
  segmentRect,
  type Rect,
} from "./geometry.ts";
import type { SignatureContext } from "./boss-director.ts";
export const sluiceRules = {
  warning: 1.8,
  flowSeconds: 5,
  force: 70,
  waveWarning: 1.8,
  waveDelay: 0.7,
  waveTravel: 2.4,
  front: 40,
  damage: 16,
  valveHealth: 30,
  returnDelay: 5.1,
  crazedDelay: 10.2,
  walkSpeed: 50,
};
type Life = {
  id: number;
  beganAt: number;
  at: number;
  until: number;
  valve: number;
  phase: number;
  batch: number;
};
export type SluiceCurrent = Life &
  Rect & {
    kind: "service-current";
    forceX: number;
    forceY: number;
    drained: boolean;
  };
export type SluiceValve = Life &
  Vec & {
    kind: "service-sluice-valve";
    radius: number;
    health: number;
    maxHealth: number;
  };
export type SluiceWave = Life &
  Rect & {
    kind: "service-sluice-wave";
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    oldX: number;
    oldY: number;
    damage: number;
    disabled: boolean;
  };
export type SluiceCue = SluiceCurrent | SluiceValve | SluiceWave;
export type SluiceLane = {
  axis: "x" | "y";
  offset: number;
  span: number;
  sign: number;
  delay: number;
};
type Batch = { due: number; phase: number; batch: number; reversed: boolean };
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
const bounds = (c: SignatureContext) =>
  c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
export function sluiceLanes(
  phase: number,
  cycle: number,
  reversed = false,
): SluiceLane[] {
  const sign = (cycle % 2 ? -1 : 1) * (reversed ? -1 : 1),
    axis: "x" | "y" = phase === 2 && cycle % 2 ? "y" : "x";
  if (phase === 0)
    return [{ axis: "x", offset: 0.5, span: 0.22, sign, delay: 0 }];
  if (phase === 1)
    return [0.3, 0.7].map((offset, i) => ({
      axis: "x",
      offset,
      span: 0.18,
      sign: i ? -sign : sign,
      delay: i * 0.8,
    }));
  if (phase === 2)
    return [0.25, 0.5, 0.75].map((offset, i) => ({
      axis,
      offset,
      span: 0.14,
      sign: i % 2 ? -sign : sign,
      delay: i * 0.8,
    }));
  return [
    { axis: "x", offset: 0.28, span: 0.17, sign, delay: 0 },
    { axis: "x", offset: 0.72, span: 0.17, sign: -sign, delay: 0.8 },
    { axis: "y", offset: 0.5, span: 0.14, sign, delay: 1.6 },
  ];
}
/** Current rectangles are contained by the real floor, including compact and offset arenas. */
export function sluiceLaneRect(b: Rect, lane: SluiceLane): Rect {
  const pad = 16;
  return lane.axis === "x"
    ? {
        x: b.x + pad,
        y: b.y + b.height * (lane.offset - lane.span / 2),
        width: b.width - pad * 2,
        height: b.height * lane.span,
      }
    : {
        x: b.x + b.width * (lane.offset - lane.span / 2),
        y: b.y + pad,
        width: b.width * lane.span,
        height: b.height - pad * 2,
      };
}
export function sluiceValvePoint(
  c: SignatureContext,
  lane: Rect,
  axis: "x" | "y",
  sign: number,
) {
  const b = bounds(c),
    pad = 36,
    desired =
      axis === "x"
        ? {
            x: sign > 0 ? lane.x + 30 : lane.x + lane.width - 30,
            y: lane.y - 32,
          }
        : {
            x: lane.x - 32,
            y: sign > 0 ? lane.y + 30 : lane.y + lane.height - 30,
          };
  for (let ring = 0; ring <= 400; ring += 24)
    for (let n = 0; n < 16; n++) {
      const a = (n * Math.PI) / 8,
        p = {
          x: clamp(
            desired.x + Math.cos(a) * ring,
            b.x + pad,
            b.x + b.width - pad,
          ),
          y: clamp(
            desired.y + Math.sin(a) * ring,
            b.y + pad,
            b.y + b.height - pad,
          ),
        };
      if (
        c.obstacles.every((o) => segmentRect(p, p, o, pad) === null) &&
        (c.hazardCircles ?? []).every(
          (pit) => distance(p, pit) > pit.radius + pad,
        )
      )
        return p;
    }
  return undefined;
}
export function sluiceWaveContact(
  from: Vec,
  to: Vec,
  wave: SluiceWave,
  body = 9,
) {
  return (
    segmentRect(
      { x: from.x - wave.oldX, y: from.y - wave.oldY },
      { x: to.x - wave.x, y: to.y - wave.y },
      { x: 0, y: 0, width: wave.width, height: wave.height },
      body,
    ) !== null
  );
}
export class SluicePressure {
  private shapes: SluiceCue[] = [];
  private queue: Batch[] = [];
  private hits = new Map<number, Set<string>>();
  private now = 0;
  private cycle = 0;
  nextSignatureAt = 0;
  get busy() {
    return this.shapes.length > 0 || this.queue.length > 0;
  }
  reset(until = 0, encounter = false) {
    this.shapes = [];
    this.queue = [];
    this.hits.clear();
    this.nextSignatureAt = until;
    if (encounter) this.cycle = 0;
  }
  cues(): SluiceCue[] {
    return this.shapes
      .filter((q) => q.beganAt <= this.now && q.until > this.now)
      .map((q) => ({ ...q }));
  }
  weakPoints() {
    return this.shapes.filter(
      (q): q is SluiceValve =>
        q.kind === "service-sluice-valve" &&
        q.health > 0 &&
        q.beganAt <= this.now &&
        q.until > this.now,
    );
  }
  hit(id: number, amount: number, now: number) {
    const valve = this.weakPoints().find((q) => q.id === id);
    if (!valve || !Number.isFinite(amount) || amount <= 0 || now >= valve.until)
      return 0;
    const actual = Math.min(valve.health, amount);
    valve.health -= actual;
    if (!valve.health)
      for (const q of this.shapes)
        if (q.valve === id) {
          q.until = Math.min(q.until, now + ticks(0.4));
          if (q.kind === "service-current") {
            q.drained = true;
            q.forceX = q.forceY = 0;
          }
          if (q.kind === "service-sluice-wave") q.disabled = true;
        }
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
    this.queue = [{ due: c.tick, phase, batch: cycle * 3, reversed: false }];
    if (advanced)
      this.queue.push({
        due: c.tick + ticks(sluiceRules.returnDelay),
        phase,
        batch: cycle * 3 + 1,
        reversed: true,
      });
    if (c.variant === "crazed")
      this.queue.push({
        due: c.tick + ticks(sluiceRules.crazedDelay),
        phase,
        batch: cycle * 3 + 2,
        reversed: false,
      });
    this.nextSignatureAt =
      c.tick + ticks(c.variant === "crazed" ? 20 : advanced ? 15 : 10);
    this.emitDue(c);
    return true;
  }
  private emitDue(c: SignatureContext) {
    const ready = this.queue.filter((q) => q.due <= c.tick);
    this.queue = this.queue.filter((q) => q.due > c.tick);
    for (const plan of ready)
      for (const lane of sluiceLanes(
        plan.phase,
        Math.floor(plan.batch / 3),
        plan.reversed,
      )) {
        const box = sluiceLaneRect(bounds(c), lane),
          point = sluiceValvePoint(c, box, lane.axis, lane.sign);
        if (!point) continue;
        const beganAt = c.tick + ticks(lane.delay),
          at = beganAt + ticks(sluiceRules.warning),
          until = at + ticks(sluiceRules.flowSeconds),
          valve = c.id(),
          health =
            sluiceRules.valveHealth +
            Math.min(30, Math.max(0, c.targets.length - 1) * 5);
        const life = {
          beganAt,
          at,
          until,
          valve,
          phase: plan.phase,
          batch: plan.batch,
        };
        if (beganAt === c.tick) c.warn?.();
        this.shapes.push({
          kind: "service-sluice-valve",
          id: valve,
          ...life,
          at: beganAt,
          ...point,
          radius: 19,
          health,
          maxHealth: health,
        });
        this.shapes.push({
          kind: "service-current",
          id: c.id(),
          ...life,
          ...box,
          forceX: lane.axis === "x" ? lane.sign * sluiceRules.force : 0,
          forceY: lane.axis === "y" ? lane.sign * sluiceRules.force : 0,
          drained: false,
        });
        const width = lane.axis === "x" ? sluiceRules.front : box.width,
          height = lane.axis === "y" ? sluiceRules.front : box.height;
        const fromX =
            lane.axis === "x" && lane.sign < 0
              ? box.x + box.width - width
              : box.x,
          fromY =
            lane.axis === "y" && lane.sign < 0
              ? box.y + box.height - height
              : box.y;
        const toX =
            lane.axis === "x" && lane.sign > 0
              ? box.x + box.width - width
              : box.x,
          toY =
            lane.axis === "y" && lane.sign > 0
              ? box.y + box.height - height
              : box.y;
        const waveBegan = beganAt + ticks(sluiceRules.waveDelay),
          waveAt = waveBegan + ticks(sluiceRules.waveWarning),
          id = c.id();
        this.shapes.push({
          kind: "service-sluice-wave",
          id,
          ...life,
          beganAt: waveBegan,
          at: waveAt,
          until: waveAt + ticks(sluiceRules.waveTravel),
          x: fromX,
          y: fromY,
          oldX: fromX,
          oldY: fromY,
          fromX,
          fromY,
          toX,
          toY,
          width,
          height,
          damage: sluiceRules.damage,
          disabled: false,
        });
        this.hits.set(id, new Set());
      }
  }
  step(c: SignatureContext) {
    const before = this.now;
    this.now = c.tick;
    if (c.paused) {
      this.reset(c.tick + ticks(1.5));
      return;
    }
    const newlyAnnounced = this.shapes.some(
      (q) => q.beganAt > before && q.beganAt <= c.tick,
    );
    this.emitDue(c);
    if (newlyAnnounced) c.warn?.();
    for (const q of this.shapes) {
      if (
        q.kind !== "service-sluice-wave" ||
        q.disabled ||
        c.tick < q.at ||
        c.tick >= q.until
      )
        continue;
      q.oldX = q.x;
      q.oldY = q.y;
      const t = clamp((c.tick - q.at) / (q.until - q.at - 1), 0, 1);
      q.x = q.fromX + (q.toX - q.fromX) * t;
      q.y = q.fromY + (q.toY - q.fromY) * t;
      const hit = this.hits.get(q.id)!;
      for (const p of c.targets)
        if (
          !hit.has(p.id) &&
          sluiceWaveContact(
            c.tick === q.at ? p : { x: p.oldX, y: p.oldY },
            p,
            q,
          )
        ) {
          hit.add(p.id);
          c.damage(p.id, q.damage * c.damageScale);
        }
    }
    this.shapes = this.shapes.filter((q) => q.until > c.tick);
    const live = new Set(
      this.shapes
        .filter((q) => q.kind === "service-sluice-wave")
        .map((q) => q.id),
    );
    for (const id of this.hits.keys()) if (!live.has(id)) this.hits.delete(id);
    if (!this.busy && !c.auxiliaryBusy) {
      this.move(c);
      if ((c.aimTargets ?? c.targets).length && c.tick >= this.nextSignatureAt)
        this.cast(c);
    }
  }
  private move(c: SignatureContext) {
    const b = bounds(c),
      angle = this.cycle * Math.PI * 0.7,
      point = {
        x: b.x + b.width / 2 + Math.cos(angle) * Math.min(220, b.width * 0.18),
        y:
          b.y +
          b.height * 0.38 +
          Math.sin(angle) * Math.min(110, b.height * 0.12),
      },
      d = distance(c.boss, point);
    if (d < 2) return;
    const step = Math.min(
        d,
        sluiceRules.walkSpeed * (c.movementSpeedScale ?? 1) * DT,
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
      hitGroups: this.hits.size,
    };
  }
}
