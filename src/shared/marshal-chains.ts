import tuning from "./marshal-chains-rules.json";
import catalog from "../../content/catalog.json";
import { clerkStampCenters } from "./clerk-placement.ts";
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
export const marshalRules = tuning;
const ticks = (s: number) => Math.ceil(s * HZ);
export type MarshalChain = {
  kind: "chain";
  id: number;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  index: number;
  leg: number;
  legs: number;
  beganAt: number;
  at: number;
  endsAt: number;
  until: number;
  angle: number;
  startAngle: number;
  sweep: number;
  length: number;
  width: number;
  edge: Vec[];
};
export type MarshalPatrol = {
  kind: "marshal-patrol";
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  at: number;
  moveAt: number;
  until: number;
};
export type MarshalBarbs = {
  kind: "marshal-barbs";
  id: number;
  anchorId: number;
  x: number;
  y: number;
  beganAt: number;
  at: number;
  until: number;
  angles: number[];
  wave: number;
  crossing: boolean;
};
export type MarshalCue = MarshalChain | MarshalPatrol | MarshalBarbs;
type Anchor = { cue: MarshalChain; returnAt: number; done: boolean };
const bounds = (c: SignatureContext) =>
  c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
function walls(c: SignatureContext) {
  const b = bounds(c);
  return [
    ...c.obstacles,
    { x: b.x - 100, y: b.y - 100, width: 100, height: b.height + 200 },
    { x: b.x + b.width, y: b.y - 100, width: 100, height: b.height + 200 },
    { x: b.x - 100, y: b.y - 100, width: b.width + 200, height: 100 },
    { x: b.x - 100, y: b.y + b.height, width: b.width + 200, height: 100 },
  ];
}
export function marshalRay(
  from: Vec,
  angle: number,
  obstacles: Rect[],
  maximum = tuning.maximumReach,
) {
  const end = {
    x: from.x + Math.cos(angle) * maximum,
    y: from.y + Math.sin(angle) * maximum,
  };
  let fraction = 1;
  for (const o of obstacles) {
    const hit = segmentRect(from, end, o, tuning.chainWidth / 2);
    if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.00001));
  }
  return maximum * fraction;
}
/** Intersect the current ray with the exact locked polygon that the warning paints. */
export function marshalEnvelopeLength(cue: MarshalChain, angle: number) {
  const progress = clamp((angle - cue.startAngle) / cue.sweep, 0, 1),
    index = Math.min(
      cue.edge.length - 2,
      Math.floor(progress * (cue.edge.length - 1)),
    );
  const a = cue.edge[index],
    b = cue.edge[index + 1],
    p = { x: a.x - cue.x, y: a.y - cue.y },
    v = { x: b.x - a.x, y: b.y - a.y },
    d = { x: Math.cos(angle), y: Math.sin(angle) };
  const denominator = d.x * v.y - d.y * v.x;
  const length =
    Math.abs(denominator) < 1e-9
      ? Math.min(distance(cue, a), distance(cue, b))
      : (p.x * v.y - p.y * v.x) / denominator;
  return clamp(length, 0, tuning.maximumReach);
}
export function marshalAnchorCenters(c: SignatureContext, target: Vec) {
  const excluded = [
      ...(c.hazardCircles ?? []),
      { x: target.x, y: target.y, radius: tuning.targetClearance },
      { x: c.boss.x, y: c.boss.y, radius: c.radius + tuning.bossClearance },
    ],
    tried: Vec[] = [];
  const clear = (p: Vec) =>
    !c.obstacles.some((o) => segmentRect(target, p, o, 3));
  // Prefer a clear shot around the boss. A narrow boss/wall wedge can hide all
  // widely separated pairs behind the boss body; retain reachable floor and
  // masonry visibility there rather than silently omitting the whole sequence.
  for (const avoidBoss of [true, false]) {
    tried.length = 0;
    const visible = (p: Vec) =>
      clear(p) &&
      (!avoidBoss ||
        distance(target, c.boss) <= c.radius + 12 ||
        segmentCircle(target, p, c.boss, c.radius + 3) === null);
    for (let attempt = 0; attempt < tuning.placementAttempts; attempt++) {
      const first = clerkStampCenters(
        bounds(c),
        c.obstacles,
        target,
        excluded,
        tried,
        tuning.anchorRadius,
        1,
        64,
        visible,
      )[0];
      if (!first) break;
      const second = clerkStampCenters(
        bounds(c),
        c.obstacles,
        target,
        excluded,
        [first],
        tuning.anchorRadius,
        1,
        tuning.anchorSeparation,
        visible,
      )[0];
      if (second) return [first, second];
      tried.push(first);
    }
  }
  return [];
}
export class MarshalChains {
  private anchors: Anchor[] = [];
  private barbs: MarshalBarbs[] = [];
  private patrol: MarshalPatrol | null = null;
  private stage: "idle" | "patrol" | "active" | "rest" = "idle";
  private phase = 0;
  private variant: "normal" | "brutal" | "crazed" = "normal";
  private targetId = "";
  private cycle = 0;
  private restUntil = 0;
  private contacts = new Map<string, number>();
  nextSignatureAt = 0;
  get busy() {
    return this.stage !== "idle";
  }
  reset(nextAt = 0) {
    this.anchors = [];
    this.barbs = [];
    this.patrol = null;
    this.stage = "idle";
    this.contacts.clear();
    this.cycle = 0;
    this.nextSignatureAt = nextAt;
  }
  cues(): MarshalCue[] {
    return [
      ...this.anchors.map((a) => ({
        ...a.cue,
        edge: a.cue.edge.map((p) => ({ x: p.x, y: p.y })),
      })),
      ...this.barbs.map((b) => ({ ...b, angles: [...b.angles] })),
      ...(this.patrol ? [{ ...this.patrol }] : []),
    ];
  }
  weakPoints() {
    return this.stage === "active"
      ? this.anchors
          .filter((a) => a.cue.health > 0)
          .map(({ cue: c }) => ({
            kind: "chain" as const,
            id: c.id,
            x: c.x,
            y: c.y,
            radius: c.radius,
            health: c.health,
            maxHealth: c.maxHealth,
            at: c.at,
          }))
      : [];
  }
  hit(id: number, amount: number) {
    const a = this.anchors.find(
      (a) => a.cue.id === id && a.cue.health > 0 && this.stage === "active",
    );
    if (!a || !Number.isFinite(amount) || amount <= 0) return 0;
    const actual = Math.min(a.cue.health, amount);
    a.cue.health -= actual;
    if (a.cue.health <= 0) {
      a.done = true;
      a.returnAt = 0;
      this.barbs = this.barbs.filter((b) => b.anchorId !== id);
    }
    return actual;
  }
  private target(c: SignatureContext) {
    return (
      (c.aimTargets ?? c.targets).find((p) => p.id === this.targetId) ??
      (c.aimTargets ?? c.targets)[0] ??
      c.boss
    );
  }
  private start(c: SignatureContext) {
    this.phase = c.phase > 0 ? 1 : 0;
    this.variant = c.variant ?? (c.brutal ? "brutal" : "normal");
    this.cycle++;
    this.targetId =
      (c.aimTargets ?? c.targets)[
        this.cycle % (c.aimTargets ?? c.targets).length
      ]?.id ?? "";
    if (!this.phase) {
      this.beginAnchors(c);
      return;
    }
    const target = this.target(c),
      b = bounds(c),
      aim = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
      sign = this.cycle % 2 ? 1 : -1;
    const candidates = [
      (sign * Math.PI) / 2,
      (-sign * Math.PI) / 2,
      Math.PI,
      0,
      Math.PI / 4,
      -Math.PI / 4,
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
        const hit = segmentRect(c.boss, end, o, c.radius);
        if (hit) f = Math.min(f, Math.max(0, hit.t - 0.001));
      }
      return {
        x: c.boss.x + (end.x - c.boss.x) * f,
        y: c.boss.y + (end.y - c.boss.y) * f,
      };
    });
    const end =
        candidates.find((p) => distance(p, c.boss) >= 64) ??
        candidates.toSorted(
          (a, b) => distance(b, c.boss) - distance(a, c.boss),
        )[0],
      moveAt = c.tick + ticks(tuning.patrolWarningSeconds);
    this.patrol = {
      kind: "marshal-patrol",
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
          Math.ceil((distance(end, c.boss) / tuning.patrolSpeed) * HZ),
        ),
    };
    this.stage = "patrol";
  }
  private beginAnchors(c: SignatureContext) {
    const centers = marshalAnchorCenters(c, this.target(c));
    if (centers.length !== 2) {
      this.reset(c.tick + ticks(tuning.retrySeconds));
      return;
    }
    const hp =
      tuning.anchorHealth *
      (this.variant === "normal" ? 1 : tuning.advancedAnchorHealthMultiplier);
    this.anchors = centers.map((p, index) => ({
      cue: {
        kind: "chain",
        id: c.id(),
        x: p.x,
        y: p.y,
        radius: tuning.anchorRadius,
        health: hp,
        maxHealth: hp,
        index: index + 1,
        leg: 0,
        legs: this.phase ? 2 : 1,
        beganAt: c.tick,
        at: 0,
        endsAt: 0,
        until: 0,
        angle: 0,
        startAngle: 0,
        sweep: 0,
        length: 0,
        width: tuning.chainWidth,
        edge: [],
      },
      returnAt: 0,
      done: false,
    }));
    this.stage = "active";
    this.patrol = null;
    for (const a of this.anchors)
      this.warnLeg(
        c,
        a,
        this.phase
          ? (a.cue.index - 1) * ticks(tuning.lateArmSpacingSeconds)
          : 0,
      );
  }
  private warnLeg(c: SignatureContext, a: Anchor, delay = 0) {
    const q = a.cue,
      target = this.target(c),
      leg = q.leg + 1,
      direction = (q.index === 1 ? 1 : -1) * (leg === 1 ? 1 : -1),
      sweep = (direction * tuning.sweepDegrees * Math.PI) / 180,
      aim = Math.atan2(target.y - q.y, target.x - q.x),
      startAngle = aim - sweep / 2,
      at = c.tick + delay + ticks(tuning.warningSeconds),
      obstacles = walls(c);
    Object.assign(q, {
      leg,
      beganAt: c.tick + delay,
      at,
      endsAt: at + ticks(tuning.activeSeconds),
      angle: startAngle,
      startAngle,
      sweep,
    });
    q.edge = Array.from({ length: tuning.edgeSegments + 1 }, (_, i) => {
      const angle = startAngle + (sweep * i) / tuning.edgeSegments,
        length = marshalRay(q, angle, obstacles);
      return {
        x: q.x + Math.cos(angle) * length,
        y: q.y + Math.sin(angle) * length,
      };
    });
    q.length = marshalEnvelopeLength(q, startAngle);
    a.returnAt = 0;
    if (this.variant !== "normal") this.warnBarbs(c, a, aim);
    const ownLast = this.barbs
      .filter((b) => b.anchorId === q.id)
      .reduce((last, b) => Math.max(last, b.until), q.endsAt);
    q.until = Math.max(
      q.until,
      ownLast +
        (q.legs - leg) *
          ticks(
            tuning.returnPauseSeconds +
              tuning.warningSeconds +
              tuning.activeSeconds,
          ),
    );
  }
  private warnBarbs(c: SignatureContext, a: Anchor, aim: number) {
    const multiplier =
        this.variant === "crazed"
          ? catalog.rules.crazed.projectileMultiplier
          : catalog.rules.brutal.projectileMultiplier,
      baseAngles = [-1, 1].flatMap((sign) =>
        Array.from(
          { length: tuning.barbsPerWing },
          (_, n) =>
            sign *
            (tuning.barbHalfGap +
              (n / Math.max(1, tuning.barbsPerWing - 1)) * tuning.barbWingArc),
        ),
      ),
      base = baseAngles.length,
      total = Math.round(base * multiplier),
      waves = Math.ceil(total / base);
    for (let wave = 0; wave < waves; wave++) {
      const crossing =
          this.variant === "crazed" && wave >= tuning.crazedCrossingFromWave,
        turn = crossing ? (wave % 2 ? 1 : -1) * tuning.crazedCrossingTurn : 0,
        chosen =
          total - wave * base >= base
            ? baseAngles
            : baseAngles.filter((_, i) => i % 2 === 0),
        at =
          a.cue.at +
          (wave
            ? Math.ceil(
                (catalog.rules.brutal.echoDelaySeconds +
                  (wave - 1) * catalog.rules.brutal.echoWaveSpacingSeconds) *
                  HZ,
              )
            : 0);
      this.barbs.push({
        kind: "marshal-barbs",
        id: c.id(),
        anchorId: a.cue.id,
        x: a.cue.x,
        y: a.cue.y,
        beganAt: at - ticks(tuning.barbWarningSeconds),
        at,
        until: at + ticks(tuning.barbCueSeconds),
        angles: chosen.map((v) => aim + turn + v),
        wave: wave + 1,
        crossing,
      });
    }
  }
  private contact(c: SignatureContext, a: Anchor, obstacles: Rect[]) {
    const q = a.cue,
      fromAngle =
        q.startAngle +
        q.sweep *
          clamp((c.tick - 1 - q.at) / ticks(tuning.activeSeconds), 0, 1),
      toAngle =
        q.startAngle +
        q.sweep * clamp((c.tick - q.at) / ticks(tuning.activeSeconds), 0, 1),
      movement = Math.max(
        0,
        ...c.targets.map((p) => Math.hypot(p.x - p.oldX, p.y - p.oldY)),
      ),
      subdivisions = Math.min(
        tuning.maximumCollisionSteps,
        Math.max(
          1,
          Math.ceil(
            (movement + Math.abs(toAngle - fromAngle) * tuning.maximumReach) /
              tuning.collisionSpacing,
          ),
        ),
      ),
      samples = Array.from(
        { length: c.tick === q.at ? 1 : subdivisions + 1 },
        (_, i) => {
          const f = c.tick === q.at ? 1 : i / subdivisions,
            angle = fromAngle + (toAngle - fromAngle) * f,
            length = Math.min(
              marshalEnvelopeLength(q, angle),
              marshalRay(q, angle, obstacles),
            );
          return {
            f,
            end: {
              x: q.x + Math.cos(angle) * length,
              y: q.y + Math.sin(angle) * length,
            },
          };
        },
      );
    q.angle = toAngle;
    q.length = Math.min(
      marshalEnvelopeLength(q, toAngle),
      marshalRay(q, toAngle, obstacles),
    );
    for (const p of c.targets) {
      if (c.tick < (this.contacts.get(p.id) ?? 0)) continue;
      if (
        samples.some(
          ({ f, end }) =>
            segmentCircle(
              q,
              end,
              {
                x: p.oldX + (p.x - p.oldX) * f,
                y: p.oldY + (p.y - p.oldY) * f,
              },
              q.width / 2 + 9,
            ) !== null,
        )
      ) {
        c.damage(p.id, tuning.contactDamage * c.damageScale);
        this.contacts.set(p.id, c.tick + ticks(tuning.contactSeconds));
      }
    }
  }
  step(c: SignatureContext) {
    if (c.paused) {
      this.reset(c.tick + ticks(tuning.betweenSequencesSeconds));
      return;
    }
    if (
      this.stage === "idle" &&
      c.tick >= this.nextSignatureAt &&
      c.targets.length &&
      !c.auxiliaryBusy
    )
      this.start(c);
    if (this.patrol && c.tick >= this.patrol.moveAt) {
      const old = { x: c.boss.x, y: c.boss.y },
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
          c.bodyObstacles ?? c.obstacles,
        );
      c.boss.x = next.x;
      c.boss.y = next.y;
      if (
        distance(next, end) < 0.5 ||
        distance(old, next) < 0.01 ||
        c.tick >= this.patrol.until
      )
        this.beginAnchors(c);
    }
    const obstacles = this.stage === "active" ? walls(c) : [];
    for (const a of this.anchors) {
      const q = a.cue;
      if (q.health <= 0 || this.stage !== "active") continue;
      if (c.tick >= q.at && c.tick < q.endsAt) this.contact(c, a, obstacles);
      if (c.tick >= q.endsAt && q.leg < q.legs) {
        if (!a.returnAt)
          a.returnAt = q.endsAt + ticks(tuning.returnPauseSeconds);
        if (c.tick >= a.returnAt) this.warnLeg(c, a);
      } else if (c.tick >= q.endsAt && q.leg === q.legs) a.done = true;
    }
    for (const b of this.barbs) {
      if (c.tick !== b.at) continue;
      for (const angle of b.angles) {
        if (c.emitControlled)
          c.emitControlled(
            b,
            angle,
            tuning.barbSpeed,
            tuning.barbDamage * c.damageScale,
            tuning.barbRadius,
          );
        else
          c.emitHostile?.(
            b,
            angle,
            tuning.barbSpeed,
            tuning.barbDamage * c.damageScale,
            tuning.barbRadius,
          );
      }
    }
    this.barbs = this.barbs.filter((b) => c.tick < b.until);
    if (
      this.stage === "active" &&
      this.anchors.every((a) => a.done) &&
      !this.barbs.length
    ) {
      this.stage = "rest";
      this.restUntil =
        c.tick +
        ticks(
          this.variant === "normal"
            ? tuning.recoverySeconds
            : tuning.advancedRecoverySeconds,
        );
      for (const a of this.anchors)
        a.cue.until = c.tick + ticks(tuning.brokenCueSeconds);
    }
    if (this.stage === "rest") {
      this.anchors = this.anchors.filter((a) => c.tick < a.cue.until);
      if (c.tick >= this.restUntil) {
        this.stage = "idle";
        this.anchors = [];
        this.contacts.clear();
        this.nextSignatureAt = c.tick + ticks(tuning.betweenSequencesSeconds);
      }
    }
  }
}
