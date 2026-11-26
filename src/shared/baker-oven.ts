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
export const bakerRules = {
  warning: 1.8,
  roll: 1.8,
  crumbWarning: 1.6,
  crumbTravel: 1.6,
  rollReach: 300,
  crumbReach: 225,
  radius: 22,
  crumbRadius: 6,
  crustHealth: 25,
  damage: 18,
  crumbDamage: 12,
  brutalDelay: 4.3,
  crazedDelay: 7.2,
  walkSpeed: 60,
};
type Life = {
  id: number;
  beganAt: number;
  at: number;
  until: number;
  phase: number;
  batch: number;
};
export type BakerLoaf = Life &
  Vec & {
    kind: "service-baker-loaf";
    oldX: number;
    oldY: number;
    originX: number;
    originY: number;
    endX: number;
    endY: number;
    angle: number;
    radius: number;
    landAt: number;
    splitAt: number;
    landed: boolean;
    health: number;
    maxHealth: number;
    brokenAt: number;
    damage: number;
  };
export type BakerCrumb = Life &
  Vec & {
    kind: "service-baker-crumb";
    parent: number;
    oldX: number;
    oldY: number;
    originX: number;
    originY: number;
    endX: number;
    endY: number;
    radius: number;
    damage: number;
  };
export type BakerCue = BakerLoaf | BakerCrumb;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
const bounds = (c: SignatureContext) =>
  c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** The whole warned swept disc stops before cover, arena walls or lava footprints. */
export function bakerRayEnd(
  c: SignatureContext,
  from: Vec,
  angle: number,
  reach: number,
  radius: number,
) {
  const b = bounds(c),
    pad = radius + 3,
    dx = Math.cos(angle),
    dy = Math.sin(angle);
  const tx =
    Math.abs(dx) < 1e-8
      ? Infinity
      : ((dx > 0 ? b.x + b.width - pad : b.x + pad) - from.x) / dx;
  const ty =
    Math.abs(dy) < 1e-8
      ? Infinity
      : ((dy > 0 ? b.y + b.height - pad : b.y + pad) - from.y) / dy;
  const length = Math.max(0, Math.min(reach, tx, ty)),
    raw = { x: from.x + dx * length, y: from.y + dy * length };
  let fraction = 1;
  for (const wall of c.obstacles) {
    const hit = segmentRect(from, raw, wall, pad);
    if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.002));
  }
  for (const pit of c.hazardCircles ?? []) {
    const hit = segmentCircle(from, raw, pit, pit.radius + pad);
    if (hit !== null) fraction = Math.min(fraction, Math.max(0, hit - 0.002));
  }
  return {
    x: from.x + (raw.x - from.x) * fraction,
    y: from.y + (raw.y - from.y) * fraction,
  };
}
export function bakerOffsets(phase: number) {
  return phase === 0
    ? [0]
    : phase === 1
      ? [-0.65, 0, 0.65]
      : phase === 2
        ? [-1.05, -0.525, 0, 0.525, 1.05]
        : [-1.05, -0.35, 0.35, 1.05];
}
export function bakerCrumbOffsets(phase: number) {
  return phase < 2
    ? [-0.8, 0.8]
    : phase === 2
      ? [-1.05, -0.35, 0.35, 1.05]
      : [-1.1, 0, 1.1];
}
/** Relative sweep includes the first and final travelling sample, never the later warning. */
export function bakerContact(
  from: Vec,
  to: Vec,
  q: Pick<BakerCrumb, "x" | "y" | "oldX" | "oldY" | "radius">,
  body = 9,
) {
  return (
    segmentCircle(
      { x: from.x - q.oldX, y: from.y - q.oldY },
      { x: to.x - q.x, y: to.y - q.y },
      { x: 0, y: 0 },
      q.radius + body,
    ) !== null
  );
}
type Batch = {
  due: number;
  phase: number;
  batch: number;
  turn: number;
  secondary: boolean;
};
export class BakerOven {
  private shapes: BakerCue[] = [];
  private queue: Batch[] = [];
  private hits = new Map<number, Set<string>>();
  private cycle = 0;
  private now = 0;
  nextSignatureAt = 0;
  get busy() {
    return this.queue.length > 0 || this.shapes.length > 0;
  }
  reset(until = 0, encounter = false) {
    this.shapes = [];
    this.queue = [];
    this.hits.clear();
    this.nextSignatureAt = until;
    if (encounter) this.cycle = 0;
  }
  cues(): BakerCue[] {
    return this.shapes
      .filter((q) => q.beganAt <= this.now && q.until > this.now)
      .map((q) => ({ ...q }));
  }
  weakPoints() {
    return this.shapes.filter(
      (q): q is BakerLoaf =>
        q.kind === "service-baker-loaf" &&
        q.landed &&
        q.health > 0 &&
        this.now >= q.landAt &&
        this.now < q.splitAt,
    );
  }
  hit(id: number, amount: number, now: number) {
    // Check the caller's activation time too: a stale client cannot break an already firing crust.
    const loaf = this.weakPoints().find((q) => q.id === id);
    if (
      !loaf ||
      now < loaf.landAt ||
      now >= loaf.splitAt ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      return 0;
    const actual = Math.min(loaf.health, amount);
    loaf.health -= actual;
    if (!loaf.health) {
      loaf.brokenAt = Math.max(1, now);
      loaf.until = now + ticks(0.4);
      for (const q of this.shapes)
        if (q.kind === "service-baker-crumb" && q.parent === id) q.until = now;
    }
    return actual;
  }
  cast(c: SignatureContext, target: Vec) {
    if (
      c.paused ||
      c.auxiliaryBusy ||
      c.tick < this.nextSignatureAt ||
      this.busy
    )
      return true;
    this.now = c.tick;
    const phase = clamp(c.phase, 0, 3),
      cycle = this.cycle++,
      advanced = c.brutal || c.variant === "brutal" || c.variant === "crazed";
    this.queue = [
      { due: c.tick, phase, batch: cycle * 3, turn: 0, secondary: false },
    ];
    if (advanced)
      this.queue.push({
        due: c.tick + ticks(bakerRules.brutalDelay),
        phase,
        batch: cycle * 3 + 1,
        turn: (cycle % 2 ? 1 : -1) * 0.25,
        secondary: true,
      });
    if (c.variant === "crazed")
      this.queue.push({
        due: c.tick + ticks(bakerRules.crazedDelay),
        phase,
        batch: cycle * 3 + 2,
        turn: (cycle % 2 ? -1 : 1) * 0.4,
        secondary: true,
      });
    this.nextSignatureAt =
      c.tick + ticks(c.variant === "crazed" ? 16 : advanced ? 13 : 8);
    this.emitDue(c, target);
    return true;
  }
  private emitDue(c: SignatureContext, initial?: Vec) {
    const ready = this.queue.filter((q) => q.due <= c.tick);
    this.queue = this.queue.filter((q) => q.due > c.tick);
    for (const plan of ready) {
      const visible = c.aimTargets ?? c.targets;
      const target =
        initial && !plan.secondary
          ? initial
          : visible[
              (Math.floor(plan.batch / 3) + (plan.batch % 3)) %
                Math.max(1, visible.length)
            ];
      if (!target) continue;
      const aim =
        Math.atan2(target.y - c.boss.y, target.x - c.boss.x) + plan.turn;
      const health =
        bakerRules.crustHealth +
        Math.min(35, Math.max(0, c.targets.length - 1) * 5);
      this.hits.set(plan.batch, new Set());
      for (const offset of bakerOffsets(plan.phase)) {
        const angle = aim + offset,
          end = bakerRayEnd(
            c,
            c.boss,
            angle,
            bakerRules.rollReach,
            bakerRules.radius,
          );
        if (distance(c.boss, end) < 35) continue;
        const at = c.tick + ticks(bakerRules.warning),
          landAt = at + ticks(bakerRules.roll),
          splitAt = landAt + ticks(bakerRules.crumbWarning),
          id = c.id();
        this.shapes.push({
          kind: "service-baker-loaf",
          id,
          beganAt: c.tick,
          at,
          until: splitAt + ticks(0.3),
          phase: plan.phase,
          batch: plan.batch,
          x: c.boss.x,
          y: c.boss.y,
          oldX: c.boss.x,
          oldY: c.boss.y,
          originX: c.boss.x,
          originY: c.boss.y,
          endX: end.x,
          endY: end.y,
          angle,
          radius: bakerRules.radius,
          landAt,
          splitAt,
          landed: false,
          health,
          maxHealth: health,
          brokenAt: 0,
          damage: bakerRules.damage,
        });
      }
      c.warn?.();
    }
  }
  private crumbs(c: SignatureContext, q: BakerLoaf) {
    for (const turn of bakerCrumbOffsets(q.phase)) {
      const end = bakerRayEnd(
        c,
        q,
        q.angle + turn,
        bakerRules.crumbReach,
        bakerRules.crumbRadius,
      );
      if (distance(q, end) < 20) continue;
      this.shapes.push({
        kind: "service-baker-crumb",
        id: c.id(),
        parent: q.id,
        beganAt: c.tick,
        at: q.splitAt,
        until: q.splitAt + ticks(bakerRules.crumbTravel),
        phase: q.phase,
        batch: q.batch,
        x: q.x,
        y: q.y,
        oldX: q.x,
        oldY: q.y,
        originX: q.x,
        originY: q.y,
        endX: end.x,
        endY: end.y,
        radius: bakerRules.crumbRadius,
        damage: bakerRules.crumbDamage,
      });
    }
    c.warn?.();
  }
  private contact(c: SignatureContext, q: BakerCue) {
    const hit = this.hits.get(q.batch);
    if (!hit) return;
    for (const p of c.targets)
      if (!hit.has(p.id) && bakerContact(c.tick===q.at?p:{ x: p.oldX, y: p.oldY }, p, q)) {
        hit.add(p.id);
        c.damage(p.id, q.damage * c.damageScale);
      }
  }
  step(c: SignatureContext) {
    this.now = c.tick;
    if (c.paused) {
      this.reset(c.tick + ticks(1.5));
      return;
    }
    this.emitDue(c);
    for (const q of [...this.shapes]) {
      if (q.until <= c.tick || (q.kind === "service-baker-loaf" && q.brokenAt))
        continue;
      if (c.tick < q.at) continue;
      q.oldX = q.x;
      q.oldY = q.y;
      if (q.kind === "service-baker-loaf") {
        const t = clamp((c.tick - q.at) / (q.landAt - q.at), 0, 1);
        q.x = lerp(q.originX, q.endX, t);
        q.y = lerp(q.originY, q.endY, t);
        if (c.tick <= q.landAt) this.contact(c, q);
        if (!q.landed && c.tick >= q.landAt) {
          q.landed = true;
          this.crumbs(c, q);
        }
      } else {
        const t = clamp((c.tick - q.at) / (q.until - q.at - 1), 0, 1);
        q.x = lerp(q.originX, q.endX, t);
        q.y = lerp(q.originY, q.endY, t);
        this.contact(c, q);
      }
    }
    this.shapes = this.shapes.filter((q) => q.until > c.tick);
    const groups = new Set(this.shapes.map((q) => q.batch));
    for (const id of this.hits.keys())
      if (!groups.has(id)) this.hits.delete(id);
    if (!this.busy && !c.auxiliaryBusy) {
      this.move(c);
      const targets = c.aimTargets ?? c.targets,
        target = targets[this.cycle % Math.max(1, targets.length)];
      if (target && c.tick >= this.nextSignatureAt) this.cast(c, target);
    }
  }
  private move(c: SignatureContext) {
    const target = (c.aimTargets ?? c.targets)[0];
    if (!target) return;
    const d = distance(c.boss, target);
    if (d < 240) return;
    const b = bounds(c),
      step = Math.min(
        d - 240,
        bakerRules.walkSpeed * (c.movementSpeedScale ?? 1) * DT,
      ),
      next = moveBody(
        c.boss,
        {
          x: ((target.x - c.boss.x) / d) * step,
          y: ((target.y - c.boss.y) / d) * step,
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
