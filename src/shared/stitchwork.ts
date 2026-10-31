import tuning from "./stitchwork-rules.json";
import { DT, HZ, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  moveBody,
  segmentRect,
  type Rect,
} from "./geometry.ts";
import { serviceBeamContact } from "./service-director.ts";
import type { SignatureContext } from "./boss-director.ts";

export const stitchRules = tuning;
type Life = { id: number; beganAt: number; at: number; until: number };
export type StitchPin = Life &
  Vec & {
    kind: "stitch-pin";
    radius: number;
    health: number;
    maxHealth: number;
    oldX: number;
    oldY: number;
    fromX: number;
    fromY: number;
    endX: number;
    endY: number;
    moveAt: number;
    moveUntil: number;
  };
export type StitchSeam = Life & {
  kind: "stitch-seam";
  style: "baste" | "backstitch" | "hem";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  oldX1: number;
  oldY1: number;
  oldX2: number;
  oldY2: number;
  pin1: number;
  pin2: number;
  width: number;
  damage: number;
  disabled: boolean;
};
export type StitchGate = Life &
  Vec & { kind: "stitch-gate"; endX: number; endY: number; width: number };
export type StitchWalk = Life & {
  kind: "stitch-walk";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  speed: number;
};
export type StitchCue = StitchPin | StitchSeam | StitchGate | StitchWalk;
const ticks = (s: number) => Math.ceil(s * HZ);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const bounds = (c: SignatureContext) =>
  c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
const inside = (p: Vec, b: Rect, pad: number) =>
  p.x >= b.x + pad &&
  p.x <= b.x + b.width - pad &&
  p.y >= b.y + pad &&
  p.y <= b.y + b.height - pad;
function clear(
  c: SignatureContext,
  a: Vec,
  b: Vec,
  radius: number,
  body = false,
) {
  if (!inside(a, bounds(c), radius + 2) || !inside(b, bounds(c), radius + 2))
    return false;
  const walls = body ? (c.bodyObstacles ?? c.obstacles) : c.obstacles;
  return (
    !walls.some((o) => segmentRect(a, b, o, radius + 2) !== null) &&
    !(c.hazardCircles ?? []).some((p) =>
      serviceBeamContact(
        a,
        b,
        { x1: p.x, y1: p.y, x2: p.x, y2: p.y, width: p.radius * 2 },
        radius + 2,
      ),
    )
  );
}

/** Exact static capsule sweep; moving seams use bounded conservative subdivision. */
export function stitchSeamContact(from: Vec, to: Vec, q: StitchSeam, body = 9) {
  const travel = Math.max(
    Math.hypot(q.x1 - q.oldX1, q.y1 - q.oldY1),
    Math.hypot(q.x2 - q.oldX2, q.y2 - q.oldY2),
  );
  if (travel < 1e-8) return serviceBeamContact(from, to, q, body);
  const steps = Math.max(1, Math.ceil((distance(from, to) + travel) / 2));
  for (let n = 0; n < steps; n++) {
    const a = n / steps,
      b = (n + 1) / steps,
      mid = (a + b) / 2;
    if (
      serviceBeamContact(
        { x: lerp(from.x, to.x, a), y: lerp(from.y, to.y, a) },
        { x: lerp(from.x, to.x, b), y: lerp(from.y, to.y, b) },
        {
          x1: lerp(q.oldX1, q.x1, mid),
          y1: lerp(q.oldY1, q.y1, mid),
          x2: lerp(q.oldX2, q.x2, mid),
          y2: lerp(q.oldY2, q.y2, mid),
          width: q.width,
        },
        body + travel / (2 * steps),
      )
    )
      return true;
  }
  return false;
}

/** A whole clear workshop patch, including a body-clear route through the missing side. */
export function sewingPatch(
  c: SignatureContext,
  target: Vec,
  cycle: number,
  avoidGate = -1,
) {
  const b = bounds(c),
    candidates: Vec[] = [target];
  for (let y = b.y + 100; y <= b.y + b.height - 100; y += 48)
    for (let x = b.x + 100; x <= b.x + b.width - 100; x += 48)
      candidates.push({ x, y });
  candidates.sort(
    (a, b) =>
      distance(a, target) - distance(b, target) || a.y - b.y || a.x - b.x,
  );
  for (const [hw, hh] of [
    [170, 140],
    [145, 120],
    [120, 100],
  ]) {
    // Wall-edge candidates catch valid narrow pockets that a regular grid can miss.
    const xs = [
      target.x,
      b.x + b.width / 2,
      b.x + hw + 25,
      b.x + b.width - hw - 25,
    ];
    const ys = [
      target.y,
      b.y + b.height / 2,
      b.y + hh + 25,
      b.y + b.height - hh - 25,
    ];
    for (const o of c.obstacles) {
      xs.push(o.x - hw - 25, o.x + o.width + hw + 25);
      ys.push(o.y - hh - 25, o.y + o.height + hh + 25);
    }
    const options = [
      ...candidates,
      ...[...new Set(xs)].flatMap((x) =>
        [...new Set(ys)].map((y) => ({ x, y })),
      ),
    ];
    options.sort(
      (a, z) =>
        distance(a, target) - distance(z, target) || a.y - z.y || a.x - z.x,
    );
    for (const p of options) {
      const area = {
        x: p.x - hw - 23,
        y: p.y - hh - 23,
        width: 2 * hw + 46,
        height: 2 * hh + 46,
      };
      if (
        !inside({ x: area.x, y: area.y }, b, 2) ||
        !inside({ x: area.x + area.width, y: area.y + area.height }, b, 2)
      )
        continue;
      if (
        c.obstacles.some(
          (o) =>
            area.x < o.x + o.width &&
            area.x + area.width > o.x &&
            area.y < o.y + o.height &&
            area.y + area.height > o.y,
        )
      )
        continue;
      if (
        (c.hazardCircles ?? []).some(
          (q) =>
            Math.hypot(
              Math.max(0, Math.abs(q.x - p.x) - hw - 23),
              Math.max(0, Math.abs(q.y - p.y) - hh - 23),
            ) <= q.radius,
        )
      )
        continue;
      const corners = [
        { x: p.x - hw, y: p.y - hh },
        { x: p.x + hw, y: p.y - hh },
        { x: p.x + hw, y: p.y + hh },
        { x: p.x - hw, y: p.y + hh },
      ];
      for (let n = 0; n < 4; n++) {
        const gate = (cycle + n) % 4,
          a = corners[gate],
          z = corners[(gate + 1) % 4];
        if (gate === avoidGate) continue;
        const midpoint = { x: (a.x + z.x) / 2, y: (a.y + z.y) / 2 },
          d = distance(p, midpoint);
        const exit = {
          x: midpoint.x + ((midpoint.x - p.x) / d) * 65,
          y: midpoint.y + ((midpoint.y - p.y) / d) * 65,
        };
        if (clear(c, p, exit, 12))
          return {
            center: { x: p.x, y: p.y },
            corners,
            gate,
            exit,
            width: 2 * Math.min(hw, hh) - tuning.hemContraction * 2,
          };
      }
    }
  }
  return null;
}

export class Stitchwork {
  private shapes: StitchCue[] = [];
  private touched = new Set<string>();
  private now = 0;
  private cycle = 0;
  private finishAt = 0;
  private walking: StitchWalk | null = null;
  private lastHemSide = -1;
  nextAt = ticks(2);
  reset(now = 0, encounter = false) {
    this.shapes = [];
    this.touched.clear();
    this.walking = null;
    this.finishAt = 0;
    this.now = now;
    this.nextAt = now + ticks(2);
    if (encounter) this.cycle = 0;
  }
  get busy() {
    return !!this.walking || this.now < this.finishAt;
  }
  cues(): StitchCue[] {
    return this.shapes
      .filter((q) => q.beganAt <= this.now && this.now < q.until)
      .map((q) => ({ ...q }));
  }
  weakPoints() {
    return this.shapes.filter(
      (q): q is StitchPin =>
        q.kind === "stitch-pin" &&
        q.health > 0 &&
        q.beganAt <= this.now &&
        this.now < q.until,
    );
  }
  hit(id: number, amount: number, now: number) {
    const p = this.weakPoints().find((p) => p.id === id);
    if (!p || !Number.isFinite(amount) || amount <= 0) return 0;
    const actual = Math.min(p.health, amount);
    p.health -= actual;
    if (p.health <= 0) {
      p.until = Math.min(p.until, now + ticks(0.5));
      for (const q of this.shapes)
        if (q.kind === "stitch-seam" && (q.pin1 === id || q.pin2 === id))
          q.disabled = true;
    }
    return actual;
  }
  private pin(
    c: SignatureContext,
    p: Vec,
    end: Vec,
    beganAt: number,
    at: number,
    until: number,
  ): StitchPin {
    const health =
      tuning.pinHealth * (c.variant === "crazed" ? 1.5 : c.brutal ? 1.25 : 1);
    const q: StitchPin = {
      kind: "stitch-pin",
      id: c.id(),
      ...p,
      oldX: p.x,
      oldY: p.y,
      fromX: p.x,
      fromY: p.y,
      endX: end.x,
      endY: end.y,
      radius: tuning.pinRadius,
      health,
      maxHealth: health,
      beganAt,
      at: beganAt,
      until,
      moveAt: at,
      moveUntil: until,
    };
    this.shapes.push(q);
    return q;
  }
  private seam(
    c: SignatureContext,
    a: StitchPin,
    b: StitchPin,
    style: StitchSeam["style"],
    beganAt: number,
    at: number,
    until: number,
  ) {
    this.shapes.push({
      kind: "stitch-seam",
      id: c.id(),
      style,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      oldX1: a.x,
      oldY1: a.y,
      oldX2: b.x,
      oldY2: b.y,
      pin1: a.id,
      pin2: b.id,
      width: tuning.threadWidth,
      damage: tuning.threadDamage * c.damageScale,
      disabled: false,
      beganAt,
      at,
      until,
    });
  }
  private baste(
    c: SignatureContext,
    target: Vec,
    angle: number,
    beganAt: number,
    returning: boolean,
  ) {
    const b = bounds(c),
      base = {
        x: clamp(target.x, b.x + 50, b.x + b.width - 50),
        y: clamp(target.y, b.y + 50, b.y + b.height - 50),
      };
    const centers = [base];
    for (const radius of [48, 96, 144])
      for (let n = 0; n < 8; n++) {
        const p = {
          x: base.x + Math.cos((n * Math.PI) / 4) * radius,
          y: base.y + Math.sin((n * Math.PI) / 4) * radius,
        };
        if (clear(c, target, p, 10)) centers.push(p);
      }
    for (const center of centers)
      for (const turn of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2])
        for (const half of [170, 130, 90, 60]) {
          const theta = angle + turn,
            a = {
              x: center.x - Math.cos(theta) * half,
              y: center.y - Math.sin(theta) * half,
            },
            z = {
              x: center.x + Math.cos(theta) * half,
              y: center.y + Math.sin(theta) * half,
            };
          if (!clear(c, a, z, tuning.pinRadius)) continue;
          const at = beganAt + ticks(tuning.warningSeconds),
            end = at + ticks(tuning.activeSeconds);
          const returnBegan = end + ticks(tuning.returnRestSeconds),
            returnAt = returnBegan + ticks(tuning.warningSeconds);
          const until = returning
            ? returnAt + ticks(tuning.activeSeconds)
            : end;
          const p = this.pin(c, a, a, beganAt, at, until),
            q = this.pin(c, z, z, beganAt, at, until);
          this.seam(c, p, q, "baste", beganAt, at, end);
          if (returning)
            this.seam(c, q, p, "backstitch", returnBegan, returnAt, until);
          return until;
        }
    return beganAt;
  }
  private hem(
    c: SignatureContext,
    target: Vec,
    beganAt: number,
    turn = 0,
    avoidGate = -1,
  ) {
    const patch = sewingPatch(c, target, this.cycle + turn, avoidGate);
    if (!patch) return this.baste(c, target, 0, beganAt, true);
    this.lastHemSide = patch.gate;
    const at = beganAt + ticks(tuning.hemWarningSeconds),
      until = at + ticks(tuning.hemSeconds);
    const pins = patch.corners.map((p) =>
      this.pin(
        c,
        p,
        {
          x: p.x + Math.sign(patch.center.x - p.x) * tuning.hemContraction,
          y: p.y + Math.sign(patch.center.y - p.y) * tuning.hemContraction,
        },
        beganAt,
        at,
        until,
      ),
    );
    for (let n = 0; n < 4; n++)
      if (n !== patch.gate)
        this.seam(c, pins[n], pins[(n + 1) % 4], "hem", beganAt, at, until);
    this.shapes.push({
      kind: "stitch-gate",
      id: c.id(),
      ...patch.center,
      endX: patch.exit.x,
      endY: patch.exit.y,
      width: patch.width,
      beganAt,
      at,
      until,
    });
    return until;
  }
  /** Target positions and phase are sampled only when the complete warning is created. */
  cast(c: SignatureContext, target: Vec, tether?: (target: Vec) => void) {
    if (this.busy) return false;
    this.now = c.tick;
    this.cycle++;
    const phase = Math.max(0, Math.min(3, c.phase)),
      variant = c.variant ?? (c.brutal ? "brutal" : "normal");
    const angle =
      Math.atan2(target.y - c.boss.y, target.x - c.boss.x) +
      Math.PI / 2 +
      (this.cycle % 2 ? 0.22 : -0.22);
    let end =
      phase < 2
        ? this.baste(
            c,
            target,
            angle,
            c.tick,
            phase >= 1 || variant !== "normal",
          )
        : this.hem(c, target, c.tick);
    if (phase === 1) tether?.(target);
    // The hem's open side stays clear for its whole life. Follow-up cuts start afterwards.
    if (phase === 3)
      end = this.hem(c, target, end + ticks(0.5), 2, this.lastHemSide);
    if (variant === "crazed") {
      const visible = c.aimTargets ?? c.targets;
      const other =
        visible.find((p) => p.id !== ("id" in target ? target.id : "")) ??
        target;
      const echoAt = phase < 2 ? c.tick + ticks(0.7) : end + ticks(0.4);
      end = Math.max(
        end,
        this.baste(c, other, angle + Math.PI / 2, echoAt, true),
      );
    }
    this.finishAt = Math.max(c.tick + ticks(0.5), end);
    this.nextAt = this.finishAt + ticks(tuning.restSeconds);
    c.warn?.();
    return true;
  }
  private approach(c: SignatureContext, target: Vec) {
    const aim = Math.atan2(target.y - c.boss.y, target.x - c.boss.x);
    const side = this.cycle % 2 ? 1 : -1;
    for (const turn of distance(c.boss, target) > 320
      ? [0, side * 0.5, -side * 0.5]
      : [(side * Math.PI) / 2, (-side * Math.PI) / 2]) {
      const p = {
        x: c.boss.x + Math.cos(aim + turn) * tuning.walkDistance,
        y: c.boss.y + Math.sin(aim + turn) * tuning.walkDistance,
      };
      if (!clear(c, c.boss, p, c.radius, true)) continue;
      const at = c.tick + ticks(tuning.walkWarningSeconds),
        speed = tuning.walkSpeed * Math.min(1.25, c.movementSpeedScale ?? 1);
      const q: StitchWalk = {
        kind: "stitch-walk",
        id: c.id(),
        x1: c.boss.x,
        y1: c.boss.y,
        x2: p.x,
        y2: p.y,
        speed,
        beganAt: c.tick,
        at,
        until: at + Math.ceil(distance(c.boss, p) / (speed * DT)),
      };
      this.walking = q;
      this.shapes.push(q);
      return true;
    }
    return false;
  }
  step(c: SignatureContext, tether?: (target: Vec) => void) {
    if (c.bossId !== "stitchwright") return;
    this.now = c.tick;
    this.shapes = this.shapes.filter((q) => c.tick < q.until);
    const liveIds = new Set(this.shapes.map((q) => q.id));
    for (const key of this.touched)
      if (!liveIds.has(Number(key.split(":")[0]))) this.touched.delete(key);
    for (const q of this.shapes)
      if (q.kind === "stitch-pin") {
        q.oldX = q.x;
        q.oldY = q.y;
        const t = clamp(
          (c.tick - q.moveAt) / Math.max(1, q.moveUntil - q.moveAt),
          0,
          1,
        );
        q.x = lerp(q.fromX, q.endX, t);
        q.y = lerp(q.fromY, q.endY, t);
      }
    const pins = new Map(
      this.shapes
        .filter((q): q is StitchPin => q.kind === "stitch-pin")
        .map((q) => [q.id, q]),
    );
    for (const q of this.shapes)
      if (q.kind === "stitch-seam") {
        const a = pins.get(q.pin1),
          b = pins.get(q.pin2);
        q.oldX1 = q.x1;
        q.oldY1 = q.y1;
        q.oldX2 = q.x2;
        q.oldY2 = q.y2;
        if (!a || !b || a.health <= 0 || b.health <= 0) q.disabled = true;
        if (a && b) {
          q.x1 = a.x;
          q.y1 = a.y;
          q.x2 = b.x;
          q.y2 = b.y;
        }
        if (q.disabled || c.tick < q.at || c.tick >= q.until) continue;
        for (const p of c.targets) {
          const key = q.id + ":" + p.id;
          if (
            !this.touched.has(key) &&
            stitchSeamContact({ x: p.oldX, y: p.oldY }, p, q)
          ) {
            this.touched.add(key);
            c.damage(p.id, q.damage);
          }
        }
      }
    const target = (c.aimTargets ?? c.targets).toSorted((a, b) =>
      a.id.localeCompare(b.id),
    )[this.cycle % Math.max(1, (c.aimTargets ?? c.targets).length)];
    if (this.walking) {
      const q = this.walking;
      if (c.tick >= q.at) {
        const end = { x: q.x2, y: q.y2 },
          remaining = distance(c.boss, end),
          step = Math.min(remaining, q.speed * DT);
        const p = moveBody(
          c.boss,
          {
            x: remaining ? ((end.x - c.boss.x) / remaining) * step : 0,
            y: remaining ? ((end.y - c.boss.y) / remaining) * step : 0,
          },
          c.radius,
          c.bodyObstacles ?? c.obstacles,
        );
        c.boss.x = p.x;
        c.boss.y = p.y;
        if (remaining <= q.speed * DT || c.tick >= q.until) {
          q.until = c.tick;
          this.walking = null;
          // Phase/Accord entry may delay a fresh warning after committed harmless movement.
          if (target && !c.paused && !c.auxiliaryBusy)
            this.cast(c, target, tether);
          else this.nextAt = c.tick + ticks(0.5);
        }
      }
    } else if (
      !this.busy &&
      c.tick >= this.nextAt &&
      target &&
      !c.paused &&
      !c.auxiliaryBusy
    ) {
      if (!this.approach(c, target)) this.cast(c, target, tether);
    }
  }
}
