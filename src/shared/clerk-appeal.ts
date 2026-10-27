import tuning from "./clerk-appeal-rules.json";
import { clerkStampCenters } from "./clerk-placement.ts";
import { DT, HZ, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  moveBody,
  segmentCircle,
  segmentRect,
} from "./geometry.ts";
import type { SignatureContext, SignatureAttack } from "./boss-director.ts";
export const clerkAppealRules = tuning;
export type ClerkStamp = {
  kind: "stamp";
  id: number;
  x: number;
  y: number;
  radius: number;
  index: number;
  at: number;
  until: number;
  safeAt: number;
};
export type ClerkPatrol = {
  kind: "clerk-patrol";
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  at: number;
  moveAt: number;
  until: number;
};
export type ClerkVolley = {
  kind: "clerk-volley";
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angles: number[];
  speed: number;
  beganAt: number;
  at: number;
  until: number;
};
export type ClerkBlock = {
  kind: "clerk-block";
  id: number;
  x: number;
  y: number;
  angle: number;
  at: number;
  until: number;
};
export type ClerkCue = ClerkStamp | ClerkPatrol | ClerkVolley | ClerkBlock;
const ticks = (s: number) => Math.ceil(s * HZ);
export class ClerkAppeal {
  private stamps: ClerkStamp[] = [];
  private volleys: { cue: ClerkVolley; released: boolean }[] = [];
  private blocks: ClerkBlock[] = [];
  private patrol: ClerkPatrol | null = null;
  private stage: "idle" | "patrol" | "stamps" | "rest" = "idle";
  private phase = 0;
  private advanced = false;
  private cycle = 0;
  private batch = 0;
  private repeatAt = 0;
  private restUntil = 0;
  private targetId = "";
  private attack: SignatureAttack | null = null;
  private contacts = new Map<string, number>();
  nextSignatureAt = 0;
  reset() {
    this.stamps = [];
    this.volleys = [];
    this.blocks = [];
    this.patrol = null;
    this.stage = "idle";
    this.cycle = 0;
    this.batch = 0;
    this.repeatAt = 0;
    this.attack = null;
    this.contacts.clear();
    this.nextSignatureAt = 0;
  }
  get busy() {
    return this.stage !== "idle";
  }
  cues(): ClerkCue[] {
    return [
      ...this.stamps.map((s) => ({ ...s })),
      ...this.volleys.map(({ cue }) => ({ ...cue, angles: [...cue.angles] })),
      ...this.blocks.map((b) => ({ ...b })),
      ...(this.patrol ? [{ ...this.patrol }] : []),
    ];
  }
  safeZones(now: number) {
    return this.stamps.filter(
      (s) => s.safeAt > 0 && now >= s.safeAt && now < s.until,
    );
  }
  isSafe(p: Vec, now: number, radius = 9) {
    return this.safeZones(now).some((s) => distance(s, p) + radius <= s.radius);
  }
  /** Called only after the projectile sweep has chosen this seal as the first hit. */
  recordBlock(zoneId: number, point: Vec, now: number, id: () => number) {
    const seal = this.safeZones(now).find((s) => s.id === zoneId);
    if (!seal) return;
    const angle = Math.atan2(point.y - seal.y, point.x - seal.x);
    this.blocks.push({
      kind: "clerk-block",
      id: id(),
      x: seal.x + Math.cos(angle) * seal.radius,
      y: seal.y + Math.sin(angle) * seal.radius,
      angle,
      at: now,
      until: now + ticks(tuning.blockCueSeconds),
    });
    if (this.blocks.length > tuning.maximumBlockCues)
      this.blocks.splice(0, this.blocks.length - tuning.maximumBlockCues);
  }
  cast(c: SignatureContext, target: Vec, attack: SignatureAttack) {
    if (this.busy || c.tick < this.nextSignatureAt) return false;
    this.phase = c.phase > 0 ? 1 : 0;
    this.advanced = c.brutal;
    this.attack = { ...attack };
    this.batch = 0;
    this.cycle++;
    this.targetId =
      (c.aimTargets ?? c.targets).toSorted(
        (a, b) =>
          distance(a, target) - distance(b, target) || a.id.localeCompare(b.id),
      )[0]?.id ?? "";
    if (this.phase) {
      const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
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
        let f = 1;
        for (const o of c.obstacles) {
          const h = segmentRect(c.boss, end, o, c.radius);
          if (h) f = Math.min(f, Math.max(0, h.t - 0.001));
        }
        return {
          x: c.boss.x + (end.x - c.boss.x) * f,
          y: c.boss.y + (end.y - c.boss.y) * f,
        };
      });
      const end =
          candidates.find((p) => distance(p, c.boss) >= 64) ??
          candidates.toSorted(
            (a, b) => distance(c.boss, b) - distance(c.boss, a),
          )[0],
        moveAt = c.tick + ticks(tuning.patrolWarningSeconds);
      this.patrol = {
        kind: "clerk-patrol",
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
      return true;
    }
    return this.beginBatch(c, target);
  }
  private target(c: SignatureContext) {
    return (
      (c.aimTargets ?? c.targets).find((t) => t.id === this.targetId) ??
      (c.aimTargets ?? c.targets)[0] ??
      c.boss
    );
  }
  private beginBatch(c: SignatureContext, target: Vec) {
    const bounds = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
      centers = clerkStampCenters(
        bounds,
        c.obstacles,
        target,
        c.hazardCircles ?? [],
        this.batch ? this.stamps : [],
      );
    if (centers.length !== 3) {
      this.stage = "idle";
      this.attack = null;
      this.patrol = null;
      this.nextSignatureAt = c.tick + HZ;
      return false;
    }
    const first =
        c.tick +
        ticks(Math.max(tuning.warningSeconds, this.attack?.telegraph ?? 0)),
      spacing = ticks(tuning.spacingSeconds),
      last = first + spacing * 2,
      safeIndex = this.phase ? 2 : 0,
      safeAt = last + (this.phase ? ticks(tuning.lateReopenDelaySeconds) : 0);
    for (const [index, p] of centers.entries())
      this.stamps.push({
        kind: "stamp",
        id: c.id(),
        ...p,
        radius: tuning.stampRadius,
        index: index + 1,
        at: first + spacing * index,
        until:
          (index === safeIndex ? safeAt : first + spacing * index) +
          ticks(tuning.activeSeconds),
        safeAt: index === safeIndex ? safeAt : 0,
      });
    // The two red seals fire toward the green shelter. Warning origins and angles
    // lock with the stamps; reopening precedes release, so its purpose is visible.
    const shelter = centers[safeIndex],
      releaseAt = safeAt + ticks(tuning.volleyAfterOpenSeconds);
    for (const [index, origin] of centers.entries()) {
      if (index === safeIndex) continue;
      const aim = Math.atan2(shelter.y - origin.y, shelter.x - origin.x);
      this.volleys.push({
        released: false,
        cue: {
          kind: "clerk-volley",
          id: c.id(),
          ...origin,
          targetX: shelter.x,
          targetY: shelter.y,
          angles: Array.from(
            { length: tuning.volleyCount },
            (_, n) =>
              aim + (n / (tuning.volleyCount - 1) - 0.5) * tuning.volleyArc,
          ),
          speed: clamp(
            distance(origin, shelter) / tuning.volleyTravelSeconds,
            tuning.volleyMinimumSpeed,
            tuning.volleyMaximumSpeed,
          ),
          beganAt: releaseAt - ticks(tuning.volleyWarningSeconds),
          at: releaseAt,
          until: releaseAt + ticks(tuning.volleyReleaseCueSeconds),
        },
      });
    }
    this.batch++;
    this.repeatAt = this.advanced && this.phase && this.batch === 1 ? last : 0;
    this.stage = "stamps";
    this.patrol = null;
    return true;
  }
  step(c: SignatureContext) {
    if (c.paused) {
      this.reset();
      return;
    }
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
        this.beginBatch(c, this.target(c));
    }
    if (this.repeatAt && c.tick >= this.repeatAt) {
      this.repeatAt = 0;
      this.beginBatch(c, this.target(c));
    }
    for (const volley of this.volleys) {
      if (volley.released || c.tick < volley.cue.at) continue;
      volley.released = true;
      for (const angle of volley.cue.angles)
        c.emitHostile?.(
          volley.cue,
          angle,
          volley.cue.speed,
          tuning.volleyDamage * c.damageScale,
          tuning.volleyRadius,
        );
    }
    this.volleys = this.volleys.filter(({ cue }) => c.tick < cue.until);
    this.blocks = this.blocks.filter((b) => c.tick < b.until);
    for (const p of c.targets)
      if (
        c.tick >= (this.contacts.get(p.id) ?? 0) &&
        !this.isSafe(p, c.tick) &&
        this.stamps.some(
          (s) =>
            c.tick >= s.at &&
            c.tick < s.until &&
            !(s.safeAt > 0 && c.tick >= s.safeAt) &&
            segmentCircle({ x: p.oldX, y: p.oldY }, p, s, s.radius + 9) !==
              null,
        )
      ) {
        c.damage(p.id, tuning.stampDamage * c.damageScale);
        this.contacts.set(p.id, c.tick + ticks(tuning.contactSeconds));
      }
    this.stamps = this.stamps.filter((s) => c.tick < s.until);
    if (this.stage === "stamps" && !this.stamps.length) {
      this.stage = "rest";
      this.restUntil = c.tick + ticks(tuning.recoverySeconds);
    }
    if (this.stage === "rest" && c.tick >= this.restUntil) {
      this.stage = "idle";
      this.attack = null;
      this.nextSignatureAt = c.tick + ticks(tuning.betweenSequencesSeconds);
    }
  }
}
