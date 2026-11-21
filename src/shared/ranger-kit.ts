import rules from "./ranger-rules.json";
import {
  clamp,
  distance,
  segmentCircle,
  segmentRect,
  type Rect,
} from "./geometry.ts";
import type { Vec } from "./protocol.ts";

export type RangerOwner = Vec & {
  id: string;
  classId: string;
  aim: number;
  connected: boolean;
  status: string;
  dashUntil: number;
};
export type RangerTarget = Vec & {
  key: string;
  oldX: number;
  oldY: number;
  radius: number;
  health: number;
  kind: "boss" | "ordinary";
};
export type RangerTalents = {
  crosswind: boolean;
  linkedStakes: boolean;
  longSurvey: boolean;
};
export type RangerOptions = {
  potency: number;
  trapCapacityBonus: number;
  trapDurationBonus: number;
  ultimateDurationBonus: number;
  ultimateCharges: number;
  ultimatePotency: number;
  ultimateRadius: number;
  talents: RangerTalents;
};
export const baseRangerOptions = (): RangerOptions => ({
  potency: 1,
  trapCapacityBonus: 0,
  trapDurationBonus: 0,
  ultimateDurationBonus: 0,
  ultimateCharges: 0,
  ultimatePotency: 0,
  ultimateRadius: 0,
  talents: { crosswind: false, linkedStakes: false, longSurvey: false },
});
export type RangerArrow = {
  owner: string;
  x: number;
  y: number;
  aim: number;
  damage: number;
  speed: number;
  range: number;
  pierce: number;
  training: boolean;
  drawId: number;
};
export type RangerCue = {
  kind: "ranger-draw" | "ranger-release" | "ranger-trap" | "ranger-survey";
  id: number;
  owner: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
  aim: number;
  radius: number;
  at: number;
  until: number;
  remaining: number;
  active: boolean;
  training: boolean;
};
export type RangerContext = {
  tick: number;
  combat: boolean;
  paused: boolean;
  owners: readonly RangerOwner[];
  bounds: Rect;
  obstacles: readonly Rect[];
  lava: readonly (Vec & { radius: number })[];
  targets: readonly RangerTarget[];
  id(): number;
  arrow(arrow: RangerArrow): void;
  strike(
    owner: RangerOwner,
    target: RangerTarget,
    damage: number,
    slowTicks: number,
    slowMultiplier: number,
    origin: Vec,
  ): number;
  sound(id: string, owner: RangerOwner): void;
};
type Draw = {
  id: number;
  owner: string;
  aim: number;
  startedAt: number;
  at: number;
  damage: number;
  speed: number;
  range: number;
  pierce: number;
  count: number;
  spread: number;
  training: boolean;
};
type Trap = {
  id: number;
  owner: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
  at: number;
  until: number;
  remaining: number;
  damage: number;
  touched: Set<string>;
};
type Survey = {
  id: number;
  owner: string;
  x: number;
  y: number;
  at: number;
  until: number;
  remaining: number;
  radius: number;
  damageBonus: number;
  pierce: number;
};
const live = (p: RangerOwner | undefined): p is RangerOwner =>
  !!p && p.classId === "ranger" && p.connected && p.status === "active";
const finite = (n: number, low: number, high: number) =>
  Number.isFinite(n) ? clamp(n, low, high) : low;
const controlled = (p: RangerOwner, c: RangerContext) =>
  live(p) &&
  c.combat &&
  !c.paused &&
  c.owners.some((o) => o.id === p.id && live(o));

/** Exact finite cable contact, including both round endpoints and fast crossings. */
export function rangerTriplineContact(
  from: Vec,
  to: Vec,
  a: Vec,
  b: Vec,
  radius: number,
) {
  if (
    Math.max(from.x, to.x) < Math.min(a.x, b.x) - radius ||
    Math.min(from.x, to.x) > Math.max(a.x, b.x) + radius ||
    Math.max(from.y, to.y) < Math.min(a.y, b.y) - radius ||
    Math.min(from.y, to.y) > Math.max(a.y, b.y) + radius
  )
    return false;
  const angle = Math.atan2(b.y - a.y, b.x - a.x),
    cos = Math.cos(angle),
    sin = Math.sin(angle),
    length = distance(a, b);
  const local = (p: Vec) => ({
    x: (p.x - a.x) * cos + (p.y - a.y) * sin,
    y: -(p.x - a.x) * sin + (p.y - a.y) * cos,
  });
  return (
    segmentRect(local(from), local(to), {
      x: 0,
      y: -radius,
      width: length,
      height: radius * 2,
    }) !== null ||
    segmentCircle(from, to, a, radius) !== null ||
    segmentCircle(from, to, b, radius) !== null
  );
}

/** Combat-only bow commitments and finite prepared ground. Game owns real projectiles/credit. */
export class RangerKit {
  private draws = new Map<string, Draw>();
  private traps = new Map<number, Trap>();
  private surveys = new Map<number, Survey>();
  private released: RangerCue[] = [];
  clear() {
    this.draws.clear();
    this.traps.clear();
    this.surveys.clear();
    this.released = [];
  }
  removeOwner(owner: string) {
    this.draws.delete(owner);
    for (const [id, t] of this.traps)
      if (t.owner === owner) this.traps.delete(id);
    for (const [id, s] of this.surveys)
      if (s.owner === owner) this.surveys.delete(id);
    this.released = this.released.filter((c) => c.owner !== owner);
  }
  private legal(point: Vec, c: RangerContext, radius = 8) {
    return (
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= c.bounds.x + radius &&
      point.x <= c.bounds.x + c.bounds.width - radius &&
      point.y >= c.bounds.y + radius &&
      point.y <= c.bounds.y + c.bounds.height - radius &&
      !c.obstacles.some((w) => segmentRect(point, point, w, radius)) &&
      !c.lava.some((l) => distance(point, l) <= l.radius + radius)
    );
  }
  private point(
    p: RangerOwner,
    angle: number,
    reach: number,
    c: RangerContext,
  ) {
    for (let d = reach; d >= 32; d -= 8) {
      const point = {
        x: p.x + Math.cos(angle) * d,
        y: p.y + Math.sin(angle) * d,
      };
      if (
        this.legal(point, c) &&
        !c.obstacles.some((w) => segmentRect(p, point, w, 8)) &&
        !c.lava.some((l) => segmentCircle(p, point, l, l.radius + 8) !== null)
      )
        return point;
    }
  }
  private line(p: RangerOwner, c: RangerContext) {
    const end = this.point(p, p.aim, rules.trapReach, c),
      start = {
        x: p.x + Math.cos(p.aim) * rules.trapNear,
        y: p.y + Math.sin(p.aim) * rules.trapNear,
      };
    return end &&
      this.legal(start, c) &&
      distance(start, end) >= rules.trapMinimumLength
      ? { start, end }
      : undefined;
  }
  private surveyPoints(p: RangerOwner, c: RangerContext, o: RangerOptions) {
    const angles = o.talents.longSurvey
        ? [p.aim]
        : [p.aim - Math.PI / 2, p.aim + Math.PI / 2],
      reach = o.talents.longSurvey
        ? rules.longSurveyOffset
        : rules.surveyOffset;
    return angles.flatMap((angle) => {
      const point = this.point(p, angle, reach, c);
      return point ? [point] : [];
    });
  }
  canPrimary(p: RangerOwner, c: RangerContext) {
    return controlled(p, c) && c.tick >= p.dashUntil && !this.draws.has(p.id);
  }
  canCast(
    p: RangerOwner,
    slot: "q" | "e" | "ultimate",
    c: RangerContext,
    o = baseRangerOptions(),
  ) {
    if (!this.canPrimary(p, c)) return false;
    if (slot === "e")
      return (
        [...this.traps.values()].filter(
          (t) => t.owner === p.id && t.until > c.tick,
        ).length <
          Math.min(
            rules.maximumTrapCapacity,
            rules.trapCapacity + Math.floor(finite(o.trapCapacityBonus, 0, 2)),
          ) && !!this.line(p, c)
      );
    if (slot === "ultimate") return this.surveyPoints(p, c, o).length > 0;
    return true;
  }
  movement(owner: string, now: number) {
    const d = this.draws.get(owner);
    return d && now < d.at
      ? d.training
        ? rules.lineMovementMultiplier
        : rules.primaryMovementMultiplier
      : 1;
  }
  status(owner: string, now: number, o = baseRangerOptions()) {
    const d = this.draws.get(owner);
    const points = [...this.surveys.values()].filter(
      (s) => s.owner === owner && now < s.until && s.remaining > 0,
    );
    return {
      rangerDrawUntil: d?.at ?? 0,
      rangerDrawId: d?.id ?? 0,
      rangerDrawMovement: this.movement(owner, now),
      rangerTraps: [...this.traps.values()].filter(
        (t) => t.owner === owner && now < t.until,
      ).length,
      rangerTrapCapacity: Math.min(
        rules.maximumTrapCapacity,
        rules.trapCapacity + Math.floor(finite(o.trapCapacityBonus, 0, 2)),
      ),
      rangerSurveyCharges: points.reduce((n, s) => n + s.remaining, 0),
      rangerSurveyUntil: Math.max(0, ...points.map((s) => s.until)),
    };
  }
  primary(
    p: RangerOwner,
    c: RangerContext,
    shot: {
      damage: number;
      speed: number;
      range: number;
      pierce: number;
      count: number;
      spread: number;
    },
  ) {
    if (!this.canPrimary(p, c)) return false;
    const point = [...this.surveys.values()]
      .filter(
        (s) =>
          s.owner === p.id &&
          c.tick < s.until &&
          s.remaining > 0 &&
          distance(p, s) <= s.radius,
      )
      .sort((a, b) => distance(p, a) - distance(p, b) || a.id - b.id)[0];
    if (point) point.remaining--;
    return this.draw(p, c, {
      ...shot,
      damage: shot.damage * (1 + (point?.damageBonus ?? 0)),
      pierce: shot.pierce + (point?.pierce ?? 0),
      training: false,
      ticks: rules.primaryDrawTicks,
    });
  }
  private draw(
    p: RangerOwner,
    c: RangerContext,
    shot: {
      damage: number;
      speed: number;
      range: number;
      pierce: number;
      count: number;
      spread: number;
      training: boolean;
      ticks: number;
    },
  ) {
    this.draws.set(p.id, {
      id: c.id(),
      owner: p.id,
      aim: finite(p.aim, -Math.PI, Math.PI),
      startedAt: c.tick,
      at: c.tick + shot.ticks,
      damage: finite(shot.damage, 1, rules.maximumArrowDamage),
      speed: finite(shot.speed, 100, 1600),
      range: finite(shot.range, 80, rules.maximumArrowRange),
      pierce: Math.floor(finite(shot.pierce, 0, rules.maximumArrowPierce)),
      count: Math.floor(finite(shot.count, 1, 4)),
      spread: finite(shot.spread, 0, 0.5),
      training: shot.training,
    });
    c.sound("ranger-draw", p);
    return true;
  }
  cast(
    p: RangerOwner,
    slot: "q" | "e" | "ultimate",
    c: RangerContext,
    o = baseRangerOptions(),
  ) {
    if (!this.canCast(p, slot, c, o)) return false;
    if (slot === "q")
      return this.draw(p, c, {
        damage:
          rules.lineDamage *
          finite(o.potency, 0.5, 3) *
          (o.talents.crosswind ? rules.crosswindDamageMultiplier : 1),
        speed: rules.lineSpeed,
        range: rules.lineRange,
        pierce: rules.linePierce,
        count: o.talents.crosswind ? 3 : 1,
        spread: o.talents.crosswind ? rules.crosswindSpreadRadians : 0,
        training: true,
        ticks: rules.lineDrawTicks,
      });
    if (slot === "e") {
      const line = this.line(p, c)!;
      const id = c.id();
      this.traps.set(id, {
        id,
        owner: p.id,
        x: line.start.x,
        y: line.start.y,
        x2: line.end.x,
        y2: line.end.y,
        at: c.tick + rules.trapArmingTicks,
        until:
          c.tick +
          rules.trapArmingTicks +
          rules.trapLifetimeTicks +
          Math.floor(finite(o.trapDurationBonus, 0, 600)),
        remaining: o.talents.linkedStakes ? rules.linkedStakeTargets : 1,
        damage: rules.trapDamage * finite(o.potency, 0.5, 3),
        touched: new Set(),
      });
      c.sound("ranger-stakes", p);
      return true;
    }
    for (const [id, s] of this.surveys)
      if (s.owner === p.id) this.surveys.delete(id);
    for (const point of this.surveyPoints(p, c, o)) {
      const id = c.id();
      this.surveys.set(id, {
        id,
        owner: p.id,
        ...point,
        at: c.tick,
        until:
          c.tick +
          (o.talents.longSurvey ? rules.longSurveyTicks : rules.surveyTicks) +
          Math.floor(finite(o.ultimateDurationBonus, 0, 240)),
        remaining: Math.min(
          rules.maximumSurveyChargesPerPoint,
          rules.surveyChargesPerPoint +
            Math.floor(finite(o.ultimateCharges, 0, 2)),
        ),
        radius: rules.surveyRadius + finite(o.ultimateRadius, 0, 22),
        damageBonus: Math.min(
          2,
          (o.talents.longSurvey
            ? rules.longSurveyDamageBonus
            : rules.surveyDamageBonus) *
            (1 + finite(o.ultimatePotency, 0, 2)),
        ),
        pierce: rules.surveyPierce,
      });
    }
    c.sound("ranger-survey", p);
    return true;
  }
  step(c: RangerContext) {
    if (!c.combat) {
      this.clear();
      return;
    }
    if (c.paused) return;
    if (
      !this.draws.size &&
      !this.traps.size &&
      !this.surveys.size &&
      !this.released.length
    )
      return;
    const owners = new Map(c.owners.filter(live).map((p) => [p.id, p]));
    for (const owner of new Set([
      ...this.draws.keys(),
      ...[...this.traps.values()].map((t) => t.owner),
      ...[...this.surveys.values()].map((s) => s.owner),
      ...this.released.map((r) => r.owner),
    ]))
      if (!owners.has(owner)) this.removeOwner(owner);
    this.released = this.released.filter((r) => c.tick < r.until);
    for (const [owner, d] of this.draws) {
      const p = owners.get(owner);
      if (!p || c.tick < p.dashUntil) {
        this.draws.delete(owner);
        continue;
      }
      if (c.tick < d.at) continue;
      this.draws.delete(owner);
      for (let n = 0; n < d.count; n++)
        c.arrow({
          owner,
          x: p.x,
          y: p.y,
          aim: d.aim + (d.count > 1 ? (n / (d.count - 1) - 0.5) * d.spread : 0),
          damage: d.damage,
          speed: d.speed,
          range: d.range,
          pierce: d.pierce,
          training: d.training,
          drawId: d.id,
        });
      this.released.push({
        kind: "ranger-release",
        id: d.id,
        owner,
        x: p.x,
        y: p.y,
        x2: p.x,
        y2: p.y,
        aim: d.aim,
        radius: d.range,
        at: d.startedAt,
        until: c.tick + 6,
        remaining: 0,
        active: true,
        training: d.training,
      });
      c.sound("ranger-release", p);
    }
    const targets = this.traps.size ? c.targets : [];
    for (const [id, t] of this.traps) {
      if (c.tick >= t.until || !owners.has(t.owner)) {
        this.traps.delete(id);
        continue;
      }
      if (c.tick < t.at) continue;
      const p = owners.get(t.owner)!;
      for (const target of targets) {
        if (
          target.health <= 0 ||
          t.touched.has(target.key) ||
          !rangerTriplineContact(
            { x: target.oldX, y: target.oldY },
            target,
            { x: t.x, y: t.y },
            { x: t.x2, y: t.y2 },
            target.radius + rules.trapWidth / 2,
          )
        )
          continue;
        const actual = c.strike(
          p,
          target,
          t.damage,
          target.kind === "ordinary" ? rules.trapSlowTicks : 0,
          rules.trapSlowMultiplier,
          { x: (t.x + t.x2) / 2, y: (t.y + t.y2) / 2 },
        );
        if (actual <= 0) continue;
        t.touched.add(target.key);
        t.remaining--;
        c.sound("ranger-trip", p);
        if (t.remaining <= 0) {
          this.traps.delete(id);
          break;
        }
      }
    }
    for (const [id, s] of this.surveys)
      if (c.tick >= s.until || !owners.has(s.owner)) this.surveys.delete(id);
  }
  cues(c: RangerContext): RangerCue[] {
    const owners = new Map(c.owners.filter(live).map((p) => [p.id, p]));
    return [
      ...[...this.draws.values()].flatMap((d) => {
        const p = owners.get(d.owner);
        return p
          ? [
              {
                kind: "ranger-draw" as const,
                id: d.id,
                owner: d.owner,
                x: p.x,
                y: p.y,
                x2: p.x,
                y2: p.y,
                aim: d.aim,
                radius: d.range,
                at: d.startedAt,
                until: d.at,
                remaining: 1,
                active: false,
                training: d.training,
              },
            ]
          : [];
      }),
      ...[...this.traps.values()]
        .filter((t) => owners.has(t.owner))
        .map((t) => ({
          kind: "ranger-trap" as const,
          id: t.id,
          owner: t.owner,
          x: t.x,
          y: t.y,
          x2: t.x2,
          y2: t.y2,
          aim: Math.atan2(t.y2 - t.y, t.x2 - t.x),
          radius: rules.trapWidth / 2,
          at: t.at,
          until: t.until,
          remaining: t.remaining,
          active: c.tick >= t.at,
          training: false,
        })),
      ...[...this.surveys.values()]
        .filter((s) => owners.has(s.owner))
        .map((s) => ({
          kind: "ranger-survey" as const,
          id: s.id,
          owner: s.owner,
          x: s.x,
          y: s.y,
          x2: s.x,
          y2: s.y,
          aim: 0,
          radius: s.radius,
          at: s.at,
          until: s.until,
          remaining: s.remaining,
          active: s.remaining > 0,
          training: false,
        })),
      ...this.released.map((r) => ({ ...r })),
    ];
  }
}
