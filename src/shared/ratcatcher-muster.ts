import tuning from "./ratcatcher-muster-rules.json";
import { DT, HZ, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  moveBody,
  segmentRect,
  segmentCircle,
} from "./geometry.ts";
import type { SignatureContext, SignatureAttack } from "./boss-director.ts";
export const ratcatcherMusterRules = tuning;
export type RatScent = {
  kind: "scent";
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
export type RatSack = {
  kind: "sack";
  id: number;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
};
export type RatPatrol = {
  kind: "ratcatcher-patrol";
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  at: number;
  moveAt: number;
  until: number;
};
export type RatWhistle = {
  kind: "ratcatcher-whistle";
  id: number;
  x: number;
  y: number;
  aim: number;
  gap: number;
  pass: number;
  passes: number;
  beganAt: number;
  at: number;
  until: number;
  angles: number[];
};
export type RatMusterCue = RatScent | RatPatrol | RatWhistle;
const ticks = (s: number) => Math.ceil(s * HZ);
export class RatcatcherMuster {
  private active = false;
  private advanced = false;
  private phase = 0;
  private cycle = 0;
  private sackId = 0;
  private sackHealth = 65;
  private sackMaximum = 65;
  private restoreAt = 0;
  private blockNext = false;
  private origin: Vec = { x: 800, y: 250 };
  private oldOrigin: Vec = { ...this.origin };
  private stage: "idle" | "patrol" | "pack" | "whistle" | "recovery" = "idle";
  private until = 0;
  private patrol: RatPatrol | null = null;
  private lanes: RatScent[] = [];
  private whistle: RatWhistle | null = null;
  private release: RatWhistle | null = null;
  private attack: SignatureAttack | null = null;
  private targetId = "";
  private packAt = 0;
  private packReleased = false;
  private interrupted = false;
  private whistlePass = 0;
  nextSignatureAt = 0;
  reset(active: boolean, advanced = false) {
    this.active = active;
    this.advanced = advanced;
    this.sackMaximum = this.sackHealth = tuning.sackHealth * (advanced ? 2 : 1);
    this.sackId = 0;
    this.restoreAt = 0;
    this.blockNext = false;
    this.stage = "idle";
    this.patrol = null;
    this.lanes = [];
    this.whistle = null;
    this.release = null;
    this.attack = null;
    this.nextSignatureAt = 0;
    this.cycle = 0;
    this.origin = { x: 800, y: 250 };
    this.oldOrigin = { ...this.origin };
  }
  clearCast() {
    this.stage = "idle";
    this.patrol = null;
    this.lanes = [];
    this.whistle = null;
    this.release = null;
    this.attack = null;
    this.packAt = 0;
    this.packReleased = false;
    this.interrupted = false;
    this.nextSignatureAt = 0;
  }
  get busy() {
    return this.stage !== "idle";
  }
  sack(): RatSack | null {
    return this.active
      ? {
          kind: "sack",
          id: this.sackId,
          x: this.origin.x + tuning.sackOffset.x,
          y: this.origin.y + tuning.sackOffset.y,
          radius: tuning.sackRadius,
          health: this.sackHealth,
          maxHealth: this.sackMaximum,
        }
      : null;
  }
  weakContact(from: Vec, to: Vec, radius: number) {
    return segmentCircle(
      {
        x: from.x - this.oldOrigin.x - tuning.sackOffset.x,
        y: from.y - this.oldOrigin.y - tuning.sackOffset.y,
      },
      {
        x: to.x - this.origin.x - tuning.sackOffset.x,
        y: to.y - this.origin.y - tuning.sackOffset.y,
      },
      { x: 0, y: 0 },
      radius + tuning.sackRadius,
    );
  }
  cues(): RatMusterCue[] {
    return [
      ...(this.release
        ? [{ ...this.release, angles: [...this.release.angles] }]
        : []),
      ...this.lanes.map((l) => ({ ...l })),
      ...(this.patrol ? [{ ...this.patrol }] : []),
      ...(this.whistle
        ? [{ ...this.whistle, angles: [...this.whistle.angles] }]
        : []),
    ];
  }
  hit(amount: number, now: number, id?: number) {
    if (
      !this.active ||
      this.sackHealth <= 0 ||
      (id !== undefined && id !== this.sackId)
    )
      return 0;
    const actual = Math.min(this.sackHealth, amount);
    this.sackHealth -= actual;
    if (this.sackHealth <= 0) {
      if (this.stage === "pack" && !this.packReleased && now < this.packAt) {
        this.interrupted = true;
        for (const lane of this.lanes) lane.interrupted = true;
        this.restoreAt = this.packAt + ticks(tuning.sackRecoverySeconds);
      } else {
        this.blockNext = true;
        this.restoreAt = 0;
      }
    }
    return actual;
  }
  cast(c: SignatureContext, target: Vec, attack: SignatureAttack) {
    if (!this.active || this.busy || c.tick < this.nextSignatureAt)
      return false;
    this.advanced = c.brutal;
    this.phase = c.phase > 0 ? 1 : 0;
    this.attack = { ...attack };
    this.targetId =
      (c.aimTargets ?? c.targets).toSorted(
        (a, b) =>
          distance(a, target) - distance(b, target) || a.id.localeCompare(b.id),
      )[0]?.id ?? "";
    this.origin = { ...c.boss };
    this.oldOrigin = { ...c.boss };
    this.cycle++;
    if (this.phase) {
      const end = this.patrolEnd(c, target),
        moveAt = c.tick + ticks(tuning.patrolWarningSeconds);
      this.patrol = {
        kind: "ratcatcher-patrol",
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
    } else this.beginPack(c, target);
    return true;
  }
  private target(c: SignatureContext) {
    return (
      (c.aimTargets ?? c.targets).find((t) => t.id === this.targetId) ??
      (c.aimTargets ?? c.targets)[0] ?? { x: c.boss.x, y: c.boss.y + 400 }
    );
  }
  private clip(c: SignatureContext, to: Vec, includeSack: boolean) {
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    const end = {
      x: clamp(
        to.x,
        b.x + c.radius,
        b.x +
          b.width -
          (includeSack
            ? Math.max(c.radius, tuning.sackOffset.x + tuning.sackRadius)
            : c.radius),
      ),
      y: clamp(
        to.y,
        b.y +
          (includeSack
            ? Math.max(c.radius, -tuning.sackOffset.y + tuning.sackRadius)
            : c.radius),
        b.y + b.height - c.radius,
      ),
    };
    let fraction = 1;
    for (const o of c.obstacles) {
      const hit = segmentRect(c.boss, end, o, c.radius);
      if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.001));
      if (includeSack) {
        const a = {
            x: c.boss.x + tuning.sackOffset.x,
            y: c.boss.y + tuning.sackOffset.y,
          },
          z = {
            x: end.x + tuning.sackOffset.x,
            y: end.y + tuning.sackOffset.y,
          },
          s = segmentRect(a, z, o, tuning.sackRadius);
        if (s) fraction = Math.min(fraction, Math.max(0, s.t - 0.001));
      }
    }
    return {
      x: c.boss.x + (end.x - c.boss.x) * fraction,
      y: c.boss.y + (end.y - c.boss.y) * fraction,
    };
  }
  private patrolEnd(c: SignatureContext, target: Vec) {
    const aim = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
      sign = this.cycle % 2 ? 1 : -1;
    const candidates = [
      (sign * Math.PI) / 2,
      (-sign * Math.PI) / 2,
      Math.PI,
      0,
      (sign * Math.PI) / 3,
      (-sign * Math.PI) / 3,
    ].map((turn) =>
      this.clip(
        c,
        {
          x: c.boss.x + Math.cos(aim + turn) * tuning.patrolDistance,
          y: c.boss.y + Math.sin(aim + turn) * tuning.patrolDistance,
        },
        true,
      ),
    );
    return (
      candidates.find((p) => distance(c.boss, p) >= 72) ??
      candidates.toSorted(
        (a, b) => distance(c.boss, b) - distance(c.boss, a),
      )[0]
    );
  }
  private beginPack(c: SignatureContext, target: Vec) {
    if (!this.attack) return;
    const aim = Math.atan2(target.y - c.boss.y, target.x - c.boss.x);
    this.packAt =
      c.tick +
      ticks(Math.max(tuning.packWarningSeconds, this.attack.telegraph));
    this.packReleased = false;
    this.interrupted = this.blockNext;
    this.blockNext = false;
    this.stage = "pack";
    this.patrol = null;
    this.lanes = [-0.48, 0, 0.48].map((offset, index) => {
      const end = this.clip(
        c,
        {
          x: c.boss.x + Math.cos(aim + offset) * 600,
          y: c.boss.y + Math.sin(aim + offset) * 600,
        },
        false,
      );
      return {
        kind: "scent",
        id: c.id(),
        x1: c.boss.x,
        y1: c.boss.y,
        x2: end.x,
        y2: end.y,
        width: 34,
        at: this.packAt,
        until: this.packAt + ticks(1),
        lane: index + 1,
        interrupted: this.interrupted,
      };
    });
    if (this.interrupted)
      this.restoreAt = this.packAt + ticks(tuning.sackRecoverySeconds);
  }
  private beginWhistle(c: SignatureContext) {
    const target = this.target(c),
      aim =
        Math.atan2(target.y - c.boss.y, target.x - c.boss.x) +
        (this.whistlePass ? tuning.whistleTurnRadians : 0),
      at = c.tick + ticks(tuning.whistleWarningSeconds),
      count = tuning.whistleCount[this.phase];
    const angles = Array.from(
      { length: count },
      (_, n) =>
        aim +
        tuning.whistleGapRadians / 2 +
        (n / Math.max(1, count - 1)) * (Math.PI * 2 - tuning.whistleGapRadians),
    );
    this.whistle = {
      kind: "ratcatcher-whistle",
      id: c.id(),
      x: c.boss.x,
      y: c.boss.y,
      aim,
      gap: tuning.whistleGapRadians,
      pass: this.whistlePass + 1,
      passes: tuning.whistlePasses[this.phase],
      beganAt: c.tick,
      at,
      until: at + 1,
      angles,
    };
    this.stage = "whistle";
  }
  private recover(c: SignatureContext) {
    this.whistle = null;
    this.stage = "recovery";
    this.until =
      c.tick +
      ticks(
        this.advanced ? tuning.advancedRecoverySeconds : tuning.recoverySeconds,
      );
  }
  step(c: SignatureContext) {
    if (!this.active) return;
    this.oldOrigin = { ...this.origin };
    this.origin = { ...c.boss };
    if (!this.sackId) {
      this.sackId = c.id();
      this.oldOrigin = { ...this.origin };
    }
    if (this.restoreAt && c.tick >= this.restoreAt) {
      this.sackHealth = this.sackMaximum;
      this.restoreAt = 0;
    }
    if (c.paused) {
      this.clearCast();
      return;
    }
    if (this.patrol && c.tick >= this.patrol.moveAt) {
      const old = { ...c.boss },
        end = { x: this.patrol.x2, y: this.patrol.y2 },
        length = distance(c.boss, end),
        travel = Math.min(length, tuning.patrolSpeed * DT),
        desired = {
          x: c.boss.x + (length ? ((end.x - c.boss.x) / length) * travel : 0),
          y: c.boss.y + (length ? ((end.y - c.boss.y) / length) * travel : 0),
        },
        clipped = this.clip(c, desired, true),
        next = moveBody(
          c.boss,
          { x: clipped.x - c.boss.x, y: clipped.y - c.boss.y },
          c.radius,
          c.obstacles,
        );
      c.boss.x = next.x;
      c.boss.y = next.y;
      this.origin = { ...c.boss };
      if (
        distance(c.boss, end) < 0.5 ||
        distance(old, next) < 0.01 ||
        c.tick >= this.patrol.until
      )
        this.beginPack(c, this.target(c));
    }
    if (
      this.stage === "pack" &&
      !this.packReleased &&
      c.tick >= this.packAt &&
      this.attack
    ) {
      if (!this.interrupted)
        for (const lane of this.lanes) {
          const length = Math.hypot(lane.x2 - lane.x1, lane.y2 - lane.y1) || 1;
          for (let n = 0; n < tuning.ratsPerLane; n++) {
            const travel = 35 + n * 14,
              origin = { x: lane.x1, y: lane.y1 },
              pos = moveBody(
                origin,
                {
                  x: ((lane.x2 - lane.x1) / length) * travel,
                  y: ((lane.y2 - lane.y1) / length) * travel,
                },
                12,
                c.obstacles,
              );
            c.spawnRat(
              pos,
              { x: lane.x2, y: lane.y2 },
              Math.min(300, (125 * this.attack.speed) / 100),
              tuning.ratHealth,
              this.attack.damage * c.damageScale,
              tuning.maximumRats,
            );
          }
        }
      this.packReleased = true;
      this.whistlePass = 0;
      if (this.advanced) this.beginWhistle(c);
      else this.recover(c);
    }
    if (this.release && c.tick >= this.release.until) this.release = null;
    if (this.whistle && c.tick >= this.whistle.at) {
      const w = this.whistle;
      this.release = {
        ...w,
        angles: [...w.angles],
        until: c.tick + ticks(0.4),
      };
      for (const angle of w.angles)
        c.emitHostile?.(
          { x: w.x, y: w.y },
          angle,
          tuning.whistleSpeed,
          tuning.whistleDamage * c.damageScale,
          5,
        );
      this.whistlePass++;
      if (this.whistlePass < tuning.whistlePasses[this.phase])
        this.beginWhistle(c);
      else this.recover(c);
    }
    if (this.stage === "recovery" && c.tick >= this.until) {
      this.stage = "idle";
      this.attack = null;
      this.nextSignatureAt = c.tick + ticks(tuning.betweenMustersSeconds);
    }
    this.lanes = this.lanes.filter((l) => c.tick < l.until);
    this.origin = { ...c.boss };
  }
}
