import tuning from "./tollkeeper-return-rules.json";
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
export const tollkeeperReturnRules = tuning;
export type TollkeeperWheel = {
  kind: "wheel";
  id: number;
  x: number;
  y: number;
  radius: number;
  path: Vec[];
  at: number;
  until: number;
  rotation: number;
  leg: number;
  legs: number;
  banked: boolean;
};
export type TollkeeperPatrol = {
  kind: "tollkeeper-patrol";
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  at: number;
  moveAt: number;
  until: number;
};
export type TollkeeperBank = {
  kind: "tollkeeper-bank";
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
  leg: number;
  legs: number;
};
export type TollkeeperCue = TollkeeperWheel | TollkeeperPatrol | TollkeeperBank;
const ticks = (s: number) => Math.ceil(s * HZ);
const arena = (c: SignatureContext) =>
  c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
function walls(c: SignatureContext): Rect[] {
  const b = arena(c);
  return [
    ...c.obstacles,
    { x: b.x - 100, y: b.y - 100, width: 100, height: b.height + 200 },
    { x: b.x + b.width, y: b.y - 100, width: 100, height: b.height + 200 },
    { x: b.x - 100, y: b.y - 100, width: b.width + 200, height: 100 },
    { x: b.x - 100, y: b.y + b.height, width: b.width + 200, height: 100 },
  ];
}
/** A fixed body-radius ray against actual board bounds and masonry. */
export function tollkeeperRay(c: SignatureContext, from: Vec, direction: Vec) {
  const to = { x: from.x + direction.x * 3000, y: from.y + direction.y * 3000 };
  let first: { t: number; normal: Vec } | null = null;
  for (const wall of walls(c)) {
    const hit = segmentRect(from, to, wall, tuning.wheelRadius);
    if (hit && (!first || hit.t < first.t)) first = hit;
  }
  const t = first ? Math.max(0, first.t - 0.00001) : 1;
  return {
    point: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
    normal: first?.normal ?? { x: 0, y: -1 },
  };
}
type Roll = { cue: TollkeeperWheel; segment: number; reflected: Vec };
export class TollkeeperReturn {
  private roll: Roll | null = null;
  private patrol: TollkeeperPatrol | null = null;
  private bank: TollkeeperBank | null = null;
  private bankReleased = false;
  private stage: "idle" | "patrol" | "roll" | "recovery" = "idle";
  private phase = 0;
  private advanced = false;
  private cycle = 0;
  private legs = 2;
  private restUntil = 0;
  private contacts = new Map<string, number>();
  nextAt = 0;
  reset(notBefore = 0) {
    this.roll = null;
    this.patrol = null;
    this.bank = null;
    this.bankReleased = false;
    this.stage = "idle";
    this.cycle = 0;
    this.contacts.clear();
    this.nextAt = notBefore;
  }
  get busy() {
    return this.stage !== "idle";
  }
  cues(): TollkeeperCue[] {
    return [
      ...(this.roll
        ? [
            {
              ...this.roll.cue,
              path: this.roll.cue.path.map((p) => ({ ...p })),
            },
          ]
        : []),
      ...(this.patrol ? [{ ...this.patrol }] : []),
      ...(this.bank ? [{ ...this.bank, angles: [...this.bank.angles] }] : []),
    ];
  }
  private target(c: SignatureContext, leg = 0) {
    const targets = (c.aimTargets ?? c.targets).toSorted((a, b) =>
      a.id.localeCompare(b.id),
    );
    return (
      targets[(Math.max(0, this.cycle - 1) + leg) % targets.length] ?? c.boss
    );
  }
  private start(c: SignatureContext) {
    this.phase = c.phase > 0 ? 1 : 0;
    this.advanced = c.brutal;
    this.cycle++;
    this.legs =
      this.phase && this.advanced ? tuning.advancedLateLegs : tuning.normalLegs;
    if (!this.phase) {
      this.makeRoll(c, c.boss, 1);
      return;
    }
    const target = this.target(c),
      b = arena(c),
      aim = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
      sign = this.cycle % 2 ? 1 : -1;
    const candidates = [
      (sign * Math.PI) / 2,
      (-sign * Math.PI) / 2,
      Math.PI,
      0,
    ].map((turn) => {
      const end = {
        x: clamp(
          c.boss.x + Math.cos(aim + turn) * tuning.patrolDistance,
          b.x + c.radius,
          b.x + b.width - c.radius,
        ),
        y: clamp(
          c.boss.y + Math.sin(aim + turn) * tuning.patrolDistance,
          b.y + c.radius,
          b.y + b.height - c.radius,
        ),
      };
      let fraction = 1;
      for (const wall of c.obstacles) {
        const h = segmentRect(c.boss, end, wall, c.radius);
        if (h) fraction = Math.min(fraction, Math.max(0, h.t - 0.001));
      }
      return {
        x: c.boss.x + (end.x - c.boss.x) * fraction,
        y: c.boss.y + (end.y - c.boss.y) * fraction,
      };
    });
    const end =
        candidates.find((p) => distance(p, c.boss) >= 64) ??
        candidates.toSorted(
          (a, b) => distance(b, c.boss) - distance(a, c.boss),
        )[0],
      moveAt = c.tick + ticks(tuning.patrolWarningSeconds);
    this.patrol = {
      kind: "tollkeeper-patrol",
      id: c.id(),
      x1: c.boss.x,
      y1: c.boss.y,
      x2: end.x,
      y2: end.y,
      at: c.tick,
      moveAt,
      until:
        moveAt +
        Math.max(
          1,
          Math.ceil((distance(c.boss, end) / tuning.patrolSpeed) * HZ),
        ),
    };
    this.stage = "patrol";
  }
  private makeRoll(
    c: SignatureContext,
    from: Vec,
    leg: number,
    direction?: Vec,
    rotation = 0,
  ) {
    const target = this.target(c, leg - 1),
      aim = direction
        ? Math.atan2(direction.y, direction.x)
        : Math.atan2(target.y - from.y, target.x - from.x);
    const choices = [
      0,
      Math.PI / 4,
      -Math.PI / 4,
      Math.PI / 2,
      -Math.PI / 2,
      Math.PI,
    ].map((turn) => {
      const d = { x: Math.cos(aim + turn), y: Math.sin(aim + turn) },
        ray = tollkeeperRay(c, from, d);
      return { d, ...ray };
    });
    const ray = choices.find((r) => distance(r.point, from) >= 64);
    if (!ray) {
      this.finish(c);
      return;
    }
    const dot = ray.d.x * ray.normal.x + ray.d.y * ray.normal.y,
      reflected = {
        x: ray.d.x - 2 * dot * ray.normal.x,
        y: ray.d.y - 2 * dot * ray.normal.y,
      },
      path = [{ x: from.x, y: from.y }, ray.point];
    if (!this.phase && !this.advanced)
      path.push(tollkeeperRay(c, ray.point, reflected).point);
    const speed = tuning.wheelSpeed * (this.phase ? tuning.lateSpeedFactor : 1),
      at = c.tick + ticks(tuning.warningSeconds),
      length = path.slice(1).reduce((n, p, i) => n + distance(p, path[i]), 0);
    this.roll = {
      segment: 1,
      reflected,
      cue: {
        kind: "wheel",
        id: c.id(),
        x: from.x,
        y: from.y,
        radius: tuning.wheelRadius,
        path,
        at,
        until: at + Math.ceil((length / speed) * HZ) + 1,
        rotation,
        leg,
        legs: this.legs,
        banked: leg > 1,
      },
    };
    this.patrol = null;
    this.stage = "roll";
    if (leg > 1) {
      const count = tuning.spokesPerWing[this.phase],
        angles: number[] = [];
      if (this.advanced)
        for (const side of [-1, 1])
          for (let n = 0; n < count; n++)
            angles.push(
              Math.atan2(ray.d.y, ray.d.x) +
                side *
                  (tuning.spokeHalfGap +
                    (n / Math.max(1, count - 1)) * tuning.spokeWingArc),
            );
      this.bank = {
        kind: "tollkeeper-bank",
        id: c.id(),
        x: from.x,
        y: from.y,
        beganAt: c.tick,
        at,
        until: at + ticks(tuning.bankReleaseCueSeconds),
        aim: Math.atan2(ray.d.y, ray.d.x),
        halfGap: tuning.spokeHalfGap,
        wingArc: tuning.spokeWingArc,
        angles,
        leg,
        legs: this.legs,
      };
      this.bankReleased = false;
    }
  }
  private finish(c: SignatureContext) {
    this.roll = null;
    this.patrol = null;
    this.bank = null;
    this.stage = "recovery";
    this.restUntil =
      c.tick +
      ticks(
        (this.advanced
          ? tuning.advancedRecoverySeconds
          : tuning.recoverySeconds)[this.phase],
      );
  }
  step(c: SignatureContext) {
    if (c.paused) {
      this.reset();
      return;
    }
    if (
      this.stage === "idle" &&
      c.tick >= this.nextAt &&
      c.targets.length &&
      !c.auxiliaryBusy
    )
      this.start(c);
    if (this.patrol && c.tick >= this.patrol.moveAt) {
      const old = { ...c.boss },
        end = { x: this.patrol.x2, y: this.patrol.y2 },
        length = distance(old, end),
        travel = Math.min(length, tuning.patrolSpeed * DT),
        next = moveBody(
          old,
          {
            x: length ? ((end.x - old.x) / length) * travel : 0,
            y: length ? ((end.y - old.y) / length) * travel : 0,
          },
          c.radius,
          c.obstacles,
        );
      c.boss.x = next.x;
      c.boss.y = next.y;
      if (
        distance(next, end) < 0.5 ||
        distance(old, next) < 0.01 ||
        c.tick >= this.patrol.until
      )
        this.makeRoll(c, next, 1);
    }
    if (this.bank && !this.bankReleased && c.tick >= this.bank.at) {
      this.bankReleased = true;
      for (const angle of this.bank.angles)
        c.emitHostile?.(
          this.bank,
          angle,
          tuning.spokeSpeed,
          tuning.spokeDamage * c.damageScale,
          tuning.spokeRadius,
        );
    }
    if (this.bank && c.tick >= this.bank.until) this.bank = null;
    const roll = this.roll;
    if (roll && c.tick >= roll.cue.at) {
      let elapsed = 0,
        interrupted = false;
      const speed =
        tuning.wheelSpeed * (this.phase ? tuning.lateSpeedFactor : 1);
      for (
        let guard = 0;
        guard < 4 && elapsed < DT && roll.segment < roll.cue.path.length;
        guard++
      ) {
        const end = roll.cue.path[roll.segment],
          old = { x: roll.cue.x, y: roll.cue.y },
          length = distance(old, end);
        if (length < 0.000001) {
          roll.segment++;
          continue;
        }
        const duration = Math.min(DT - elapsed, length / speed),
          travel = duration * speed,
          next = {
            x: old.x + ((end.x - old.x) / length) * travel,
            y: old.y + ((end.y - old.y) / length) * travel,
          };
        let fraction = 1;
        for (const wall of walls(c)) {
          const h = segmentRect(old, next, wall, tuning.wheelRadius);
          if (h && h.t < 1 - 1e-7)
            fraction = Math.min(fraction, Math.max(0, h.t - 0.001));
        }
        if (fraction < 1) {
          next.x = old.x + (next.x - old.x) * fraction;
          next.y = old.y + (next.y - old.y) * fraction;
          interrupted = true;
        }
        const t0 = elapsed / DT,
          t1 = (elapsed + duration * fraction) / DT;
        for (const p of c.targets)
          if (
            c.tick >= (this.contacts.get(p.id) ?? 0) &&
            segmentCircle(
              {
                x: p.oldX + (p.x - p.oldX) * t0 - old.x,
                y: p.oldY + (p.y - p.oldY) * t0 - old.y,
              },
              {
                x: p.oldX + (p.x - p.oldX) * t1 - next.x,
                y: p.oldY + (p.y - p.oldY) * t1 - next.y,
              },
              { x: 0, y: 0 },
              tuning.wheelRadius + 9,
            ) !== null
          ) {
            c.damage(p.id, tuning.wheelDamage * c.damageScale);
            this.contacts.set(p.id, c.tick + ticks(tuning.contactSeconds));
          }
        roll.cue.x = next.x;
        roll.cue.y = next.y;
        roll.cue.rotation += distance(old, next) / tuning.wheelRadius;
        elapsed += duration;
        if (interrupted) break;
        if (length <= travel + 0.00001) {
          roll.segment++;
          if (roll.cue.path.length === 3 && roll.segment === 2)
            roll.cue.leg = 2;
        }
      }
      if (interrupted) this.finish(c);
      else if (
        roll.segment >= roll.cue.path.length ||
        c.tick >= roll.cue.until
      ) {
        if ((!this.phase && !this.advanced) || roll.cue.leg >= this.legs)
          this.finish(c);
        else
          this.makeRoll(
            c,
            roll.cue,
            roll.cue.leg + 1,
            this.phase ? undefined : roll.reflected,
            roll.cue.rotation,
          );
      }
    }
    if (this.stage === "recovery" && c.tick >= this.restUntil) {
      this.stage = "idle";
      this.nextAt = c.tick + ticks(tuning.betweenRoutesSeconds);
    }
  }
}
