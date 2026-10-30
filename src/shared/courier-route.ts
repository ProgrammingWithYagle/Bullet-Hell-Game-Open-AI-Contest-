import tuning from "./courier-route-rules.json";
import { DT, HZ, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  moveBody,
  segmentCircle,
  segmentRect,
} from "./geometry.ts";
import type { SignatureContext, SignatureAttack } from "./boss-director.ts";

export const courierRouteRules = tuning;
export type CourierLane = {
  kind: "charge";
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  at: number;
  until: number;
  lane: number;
  interrupted: boolean;
};
export type CourierTrail = {
  kind: "trail";
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  until: number;
};
export type CourierRouteState = {
  kind: "courier-route";
  id: number;
  x: number;
  y: number;
  leg: number;
  legs: number;
  state: "warning" | "charge" | "turn" | "dispatch" | "recovery";
  at: number;
  until: number;
};
export type CourierDispatch = {
  kind: "courier-dispatch";
  id: number;
  x: number;
  y: number;
  beganAt: number;
  at: number;
  until: number;
  aim: number;
  halfGap: number;
  wingArc: number;
  angles: number[];
};
export type CourierCue =
  CourierLane | CourierTrail | CourierRouteState | CourierDispatch;
const ticks = (s: number) => Math.ceil(s * HZ);
type Trail = {
  cue: CourierTrail;
  origin: Vec;
  direction: Vec;
  started: number;
  speed: number;
  length: number;
};
type Leg = {
  cue: CourierLane;
  origin: Vec;
  touched: Set<string>;
  trail?: Trail;
};

export function courierDispatchAngles(
  aim: number,
  count: number,
  halfGap = tuning.dispatchHalfGapRadians,
  arc = tuning.dispatchWingArcRadians,
) {
  const wing = count / 2,
    angles: number[] = [];
  for (const side of [-1, 1])
    for (let n = 0; n < wing; n++)
      angles.push(aim + side * (halfGap + (arc * n) / Math.max(1, wing - 1)));
  return angles;
}
/** Each return is planned only after a real stop, then locks for a fresh full warning. */
export class CourierRoute {
  private route: CourierRouteState | null = null;
  private leg: Leg | null = null;
  private dispatch: CourierDispatch | null = null;
  private trails: Trail[] = [];
  private contacts = new Map<string, number>();
  private attack: SignatureAttack | null = null;
  private targetId = "";
  private advanced = false;
  private phase = 0;
  private nextLegAt = 0;
  nextRouteAt = 0;
  reset() {
    this.route = null;
    this.leg = null;
    this.dispatch = null;
    this.trails = [];
    this.contacts.clear();
    this.attack = null;
    this.nextLegAt = 0;
    this.nextRouteAt = 0;
  }
  get busy() {
    return this.route !== null;
  }
  get charging() {
    return this.leg !== null;
  }
  cues(): CourierCue[] {
    return [
      ...(this.route ? [{ ...this.route }] : []),
      ...(this.leg ? [{ ...this.leg.cue }] : []),
      ...this.trails.map((t) => ({ ...t.cue })),
      ...(this.dispatch
        ? [{ ...this.dispatch, angles: [...this.dispatch.angles] }]
        : []),
    ];
  }
  cast(c: SignatureContext, target: Vec, attack: SignatureAttack) {
    if (this.busy || c.tick < this.nextRouteAt) return false;
    this.phase = Math.min(1, Math.max(0, c.phase));
    this.advanced = c.brutal;
    this.attack = { ...attack, speed: Math.min(600, attack.speed) };
    this.targetId =
      (c.aimTargets ?? c.targets).toSorted(
        (a, b) =>
          distance(a, target) - distance(b, target) || a.id.localeCompare(b.id),
      )[0]?.id ?? "";
    this.route = {
      kind: "courier-route",
      id: c.id(),
      x: c.boss.x,
      y: c.boss.y,
      leg: 0,
      legs:
        tuning.normalLegs[this.phase] +
        (c.brutal ? tuning.advancedExtraLeg : 0),
      state: "warning",
      at: c.tick,
      until: c.tick,
    };
    this.beginLeg(c, target, attack.telegraph);
    return true;
  }
  private aim(c: SignatureContext) {
    const targets = (c.aimTargets ?? c.targets).toSorted((a, b) =>
      a.id.localeCompare(b.id),
    );
    if (!targets.length) return { x: c.boss.x, y: c.boss.y + 100 };
    // Advanced third deliveries can select another survivor; solo still has the same complete tell.
    const original = targets.findIndex((p) => p.id === this.targetId),
      index = Math.max(0, original);
    return targets[
      (index + (this.advanced && this.route?.leg === 2 ? 1 : 0)) %
        targets.length
    ];
  }
  private endpoint(c: SignatureContext, target: Vec) {
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    let dx = target.x - c.boss.x,
      dy = target.y - c.boss.y,
      len = Math.hypot(dx, dy);
    if (len < 1) {
      dx = b.x + b.width / 2 - c.boss.x;
      dy = b.y + b.height / 2 - c.boss.y;
      len = Math.hypot(dx, dy);
      if (len < 1) {
        dy = 100;
        len = 100;
      }
    }
    const aim = Math.atan2(dy, dx),
      reach = len + 100;
    const clip = (angle: number) => {
      const end = {
        x: clamp(
          c.boss.x + Math.cos(angle) * reach,
          b.x + c.radius,
          b.x + b.width - c.radius,
        ),
        y: clamp(
          c.boss.y + Math.sin(angle) * reach,
          b.y + c.radius,
          b.y + b.height - c.radius,
        ),
      };
      let fraction = 1;
      for (const obstacle of c.obstacles) {
        const hit = segmentRect(c.boss, end, obstacle, c.radius);
        if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.001));
      }
      return {
        x: c.boss.x + (end.x - c.boss.x) * fraction,
        y: c.boss.y + (end.y - c.boss.y) * fraction,
      };
    };
    let end = clip(aim);
    // A wall stop must not produce a chain of zero-length deliveries aimed through that wall.
    // Select a clear fixed departure before warning it; never steer an active charge.
    if (distance(c.boss, end) < c.radius * 2)
      for (const turn of [
        Math.PI / 3,
        -Math.PI / 3,
        (2 * Math.PI) / 3,
        (-2 * Math.PI) / 3,
        Math.PI,
      ]) {
        const alternative = clip(aim + turn);
        if (distance(c.boss, alternative) > distance(c.boss, end))
          end = alternative;
        if (distance(c.boss, end) >= c.radius * 2) break;
      }
    return end;
  }
  private beginLeg(c: SignatureContext, target: Vec, warning: number) {
    if (!this.route || !this.attack) return;
    const end = this.endpoint(c, target),
      at =
        c.tick +
        ticks(
          Math.max(
            warning,
            tuning.turnWarningSeconds * (this.route.leg > 0 ? 1 : 0),
          ),
        );
    this.route.leg++;
    this.route.state = "warning";
    this.route.at = c.tick;
    this.route.until = at;
    this.leg = {
      cue: {
        kind: "charge",
        id: c.id(),
        x1: c.boss.x,
        y1: c.boss.y,
        x2: end.x,
        y2: end.y,
        width: c.radius * 2,
        at,
        until:
          at + Math.ceil(distance(c.boss, end) / (this.attack.speed * DT)) + 1,
        lane: this.route.leg,
        interrupted: false,
      },
      origin: { x: c.boss.x, y: c.boss.y },
      touched: new Set(),
    };
  }
  private recover(c: SignatureContext) {
    if (!this.route) return;
    this.route.state = "recovery";
    this.route.at = c.tick;
    this.route.until =
      c.tick +
      ticks(
        (this.advanced
          ? tuning.advancedRecoverySeconds
          : tuning.recoverySeconds)[this.phase],
      );
  }
  private stop(c: SignatureContext) {
    const leg = this.leg;
    if (!leg || !this.route) return;
    if (leg.trail) leg.trail.cue.until = c.tick + ticks(3);
    this.leg = null;
    if (this.route.leg < this.route.legs) {
      this.route.state = "turn";
      this.route.at = c.tick;
      this.nextLegAt = c.tick + ticks(tuning.turnPauseSeconds);
      this.route.until = this.nextLegAt;
    } else if (this.advanced) {
      const target = this.aim(c),
        aim = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
        at = c.tick + ticks(tuning.dispatchWarningSeconds);
      this.dispatch = {
        kind: "courier-dispatch",
        id: c.id(),
        x: c.boss.x,
        y: c.boss.y,
        beganAt: c.tick,
        at,
        until: at + 1,
        aim,
        halfGap: tuning.dispatchHalfGapRadians,
        wingArc: tuning.dispatchWingArcRadians,
        angles: courierDispatchAngles(aim, tuning.dispatchCount[this.phase]),
      };
      this.route.state = "dispatch";
      this.route.at = c.tick;
      this.route.until = at;
    } else this.recover(c);
  }
  step(c: SignatureContext) {
    const now = c.tick;
    if (c.paused) {
      this.reset();
      return;
    }
    if (this.route) {
      this.route.x = c.boss.x;
      this.route.y = c.boss.y;
    }
    if (this.route?.state === "turn" && now >= this.nextLegAt)
      this.beginLeg(c, this.aim(c), tuning.turnWarningSeconds);
    const leg = this.leg;
    if (leg && this.attack && now >= leg.cue.at) {
      if (this.route) {
        this.route.state = "charge";
        this.route.until = leg.cue.until;
      }
      const old = { x: c.boss.x, y: c.boss.y },
        end = { x: leg.cue.x2, y: leg.cue.y2 },
        length = distance(old, end),
        travel = Math.min(length, this.attack.speed * DT);
      const next = moveBody(
        old,
        {
          x: length ? ((end.x - old.x) / length) * travel : 0,
          y: length ? ((end.y - old.y) / length) * travel : 0,
        },
        c.radius,
        c.bodyObstacles ?? c.obstacles,
      );
      c.boss.x = next.x;
      c.boss.y = next.y;
      if (distance(old, next) > 0.001 && !leg.trail) {
        const total = distance(leg.origin, end) || 1;
        leg.trail = {
          cue: {
            kind: "trail",
            id: c.id(),
            x1: old.x,
            y1: old.y,
            x2: next.x,
            y2: next.y,
            width: 32,
            until: leg.cue.until + ticks(3),
          },
          origin: leg.origin,
          direction: {
            x: (end.x - leg.origin.x) / total,
            y: (end.y - leg.origin.y) / total,
          },
          started: now,
          speed: this.attack.speed,
          length: 0,
        };
        this.trails.push(leg.trail);
        if (this.trails.length > tuning.maximumTrails) this.trails.shift();
      }
      if (leg.trail) {
        leg.trail.length = distance(leg.origin, next);
        leg.trail.cue.x2 = next.x;
        leg.trail.cue.y2 = next.y;
      }
      for (const target of c.targets)
        if (
          !leg.touched.has(target.id) &&
          segmentCircle(
            { x: target.oldX - old.x, y: target.oldY - old.y },
            { x: target.x - next.x, y: target.y - next.y },
            { x: 0, y: 0 },
            c.radius + 9,
          ) !== null
        ) {
          c.damage(target.id, this.attack.damage * c.damageScale);
          leg.touched.add(target.id);
        }
      if (
        distance(next, end) < 0.5 ||
        distance(old, next) < 0.01 ||
        now >= leg.cue.until
      )
        this.stop(c);
    }
    if (this.dispatch && this.attack && now >= this.dispatch.at) {
      const d = this.dispatch;
      for (const angle of d.angles)
        c.emitHostile?.(
          { x: d.x, y: d.y },
          angle,
          Math.min(240, this.attack.speed * 0.4),
          tuning.dispatchDamage * c.damageScale,
          5,
        );
      this.dispatch = null;
      this.recover(c);
    }
    if (this.route?.state === "recovery" && now >= this.route.until) {
      this.route = null;
      this.attack = null;
      this.nextRouteAt = now + ticks(tuning.betweenRoutesSeconds);
    }
    for (const t of this.trails) {
      if (now >= t.cue.until) continue;
      const retired = Math.min(
        t.length,
        Math.max(0, (now - t.started - ticks(3)) * t.speed * DT),
      );
      t.cue.x1 = t.origin.x + t.direction.x * retired;
      t.cue.y1 = t.origin.y + t.direction.y * retired;
      if (retired >= t.length && now >= t.started + ticks(3)) {
        t.cue.until = now;
        continue;
      }
      for (const target of c.targets)
        if (
          now >= (this.contacts.get(target.id) ?? 0) &&
          capsuleContact(
            { x: target.oldX, y: target.oldY },
            target,
            { x: t.cue.x1, y: t.cue.y1 },
            { x: t.cue.x2, y: t.cue.y2 },
            t.cue.width / 2 + 9,
          )
        ) {
          c.damage(target.id, 5 * c.damageScale);
          this.contacts.set(target.id, now + ticks(0.5));
        }
    }
    this.trails = this.trails.filter((t) => now < t.cue.until);
    if (this.route) {
      this.route.x = c.boss.x;
      this.route.y = c.boss.y;
    }
  }
}
function capsuleContact(a: Vec, b: Vec, c: Vec, d: Vec, r: number) {
  if (
    segmentCircle(a, b, c, r) !== null ||
    segmentCircle(a, b, d, r) !== null ||
    segmentCircle(c, d, a, r) !== null ||
    segmentCircle(c, d, b, r) !== null
  )
    return true;
  const cross = (u: Vec, v: Vec, w: Vec) =>
    (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
  return (
    cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0
  );
}
