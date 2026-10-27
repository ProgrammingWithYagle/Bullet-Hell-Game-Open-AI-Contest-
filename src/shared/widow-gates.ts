import { clerkStampCenters } from "./clerk-placement.ts";
import tuning from "./widow-gates-rules.json";
import catalog from "../../content/catalog.json";
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
export const widowRules = tuning;
export type GateAxis = "horizontal" | "vertical";
export type WidowGate = Rect & {
  kind: "gate";
  id: number;
  open: boolean;
  lane: number;
  axis: GateAxis;
  leg: number;
  legs: number;
  beganAt: number;
  at: number;
  until: number;
  passage: Vec;
};
export type WidowPall = {
  kind: "widow-pall";
  id: number;
  axis: GateAxis;
  direction: number;
  leg: number;
  legs: number;
  beganAt: number;
  at: number;
  until: number;
  from: number;
  to: number;
  thickness: number;
  spans: { low: number; high: number }[];
};
export type WidowWalk = {
  kind: "widow-walk";
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  at: number;
  moveAt: number;
  until: number;
};
export type WidowNeedles = {
  kind: "widow-needles";
  id: number;
  x: number;
  y: number;
  angles: number[];
  leg: number;
  wave: number;
  crossing: boolean;
  beganAt: number;
  at: number;
  until: number;
};
export type WidowCue = WidowGate | WidowPall | WidowWalk | WidowNeedles;
const ticks = (s: number) => Math.ceil(s * HZ);
const board = (c: SignatureContext) =>
  c.bounds ?? { x: 200, y: 0, width: 1200, height: 1000 };
const inside = (p: Vec, r: Rect, radius: number) =>
  p.x > r.x - radius &&
  p.x < r.x + r.width + radius &&
  p.y > r.y - radius &&
  p.y < r.y + r.height + radius;
/** Shared authoritative/predicted ejection, along a clear short route on either axis. */
export function ejectClosingGates(
  position: Vec,
  gates: Rect[],
  radius: number,
  fixed: Rect[] = [],
  hazards: (Vec & { radius: number })[] = [],
): Vec {
  let next = { ...position };
  for (const gate of gates) {
    if (!inside(next, gate, radius)) continue;
    const origin = { ...next };
    const options = (
      gate.width < gate.height
        ? [
            { x: gate.x - radius - 0.1, y: next.y },
            { x: gate.x + gate.width + radius + 0.1, y: next.y },
          ]
        : [
            { x: next.x, y: gate.y - radius - 0.1 },
            { x: next.x, y: gate.y + gate.height + radius + 0.1 },
          ]
    ).sort((a, b) => distance(origin, a) - distance(origin, b));
    const clear = options.find(
      (p) =>
        !gates.some((g) => inside(p, g, radius)) &&
        !fixed.some((o) => segmentRect(origin, p, o, radius) !== null) &&
        hazards.every(
          (h) =>
            distance(p, h) > h.radius + radius &&
            (distance(origin, h) <= h.radius + radius ||
              segmentCircle(origin, p, h, h.radius + radius) === null),
        ),
    );
    if (clear) next = clear;
  }
  return next;
}
type Layout = {
  axis: GateAxis;
  coordinate: number;
  openLane: number;
  passage: Vec;
  passageWidth: number;
  gates: Rect[];
  direction: number;
};
function subtract(
  intervals: [number, number][],
  low: number,
  high: number,
): [number, number][] {
  return intervals.flatMap(([a, b]) =>
    high <= a || low >= b
      ? [[a, b] as [number, number]]
      : ([
          [a, Math.min(b, low)],
          [Math.max(a, high), b],
        ].filter(([a, b]) => b > a) as [number, number][]),
  );
}
/** Find a real open crossing, then reject gate lines that could trap clear floor. */
export function widowLayout(
  c: SignatureContext,
  axis: GateAxis,
  preferredLane: number,
): Layout | null {
  const b = board(c),
    horizontal = axis === "horizontal",
    along = horizontal ? b.x : b.y,
    span = horizontal ? b.width : b.height,
    normal = horizontal ? b.y : b.x,
    depth = horizontal ? b.height : b.width,
    half = tuning.gateThickness / 2,
    pad = tuning.passageClearance;
  const target = (c.aimTargets ?? c.targets)[0] ?? c.boss;
  const fractions = [0.58, 0.5, 0.66, 0.42, 0.74, 0.34, 0.82, 0.26, 0.18, 0.9];
  for (const fraction of fractions) {
    const coordinate = normal + depth * fraction;
    if (
      Math.abs((horizontal ? c.boss.y : c.boss.x) - coordinate) <
      c.radius + half + 8
    )
      continue;
    const direction = (horizontal ? target.y : target.x) >= coordinate ? 1 : -1;
    if (
      (direction > 0 ? normal + depth - coordinate : coordinate - normal) <
      tuning.minimumPallTravel
    )
      continue;
    const gates = Array.from({ length: 3 }, (_, lane) =>
      horizontal
        ? {
            x: along + (lane * span) / 3,
            y: coordinate - half,
            width: span / 3,
            height: tuning.gateThickness,
          }
        : {
            x: coordinate - half,
            y: along + (lane * span) / 3,
            width: tuning.gateThickness,
            height: span / 3,
          },
    );
    for (let offset = 0; offset < 3; offset++) {
      const openLane = (preferredLane + offset) % 3,
        gate = gates[openLane];
      let intervals: [number, number][] = [
        [
          along + (openLane * span) / 3 + pad,
          along + ((openLane + 1) * span) / 3 - pad,
        ],
      ];
      for (const o of c.obstacles) {
        const n0 = horizontal ? o.y : o.x,
          n1 = n0 + (horizontal ? o.height : o.width);
        if (n1 < coordinate - half - pad || n0 > coordinate + half + pad)
          continue;
        intervals = subtract(
          intervals,
          (horizontal ? o.x : o.y) - pad,
          (horizontal ? o.x + o.width : o.y + o.height) + pad,
        );
      }
      for (const h of c.hazardCircles ?? []) {
        if (
          Math.abs((horizontal ? h.y : h.x) - coordinate) >
          h.radius + half + pad
        )
          continue;
        intervals = subtract(
          intervals,
          (horizontal ? h.x : h.y) - h.radius - pad,
          (horizontal ? h.x : h.y) + h.radius + pad,
        );
      }
      const interval = intervals
        .filter(([a, z]) => z - a >= tuning.minimumPassageWidth)
        .sort((a, z) => z[1] - z[0] - (a[1] - a[0]))[0];
      if (!interval) continue;
      const center = (interval[0] + interval[1]) / 2,
        passage = horizontal
          ? { x: center, y: coordinate }
          : { x: coordinate, y: center };
      const solids = gates.filter((_, lane) => lane !== openLane);
      let safe = true;
      // Bounded placement-time sampling only, never a per-frame floor scan.
      for (const solid of solids) {
        const low = horizontal ? solid.x : solid.y,
          high = low + (horizontal ? solid.width : solid.height);
        for (
          let at = low;
          at <= high && safe;
          at += tuning.ejectionSampleSpacing
        )
          for (const delta of [-half + 1, 0, half - 1]) {
            const p = horizontal
              ? { x: at, y: coordinate + delta }
              : { x: coordinate + delta, y: at };
            if (
              p.x < b.x + 9 ||
              p.x > b.x + b.width - 9 ||
              p.y < b.y + 9 ||
              p.y > b.y + b.height - 9 ||
              c.obstacles.some((o) => segmentRect(p, p, o, 9))
            )
              continue;
            const q = ejectClosingGates(
              p,
              solids,
              9,
              c.obstacles,
              c.hazardCircles,
            );
            if (solids.some((g) => inside(q, g, 9))) {
              safe = false;
              break;
            }
          }
      }
      if (safe) {
        const origin = ejectClosingGates(
          target,
          solids,
          9,
          c.obstacles,
          c.hazardCircles,
        );
        const reachable =
          clerkStampCenters(
            b,
            [...c.obstacles, ...solids],
            origin,
            [],
            [],
            9,
            1,
            30,
            (p) => distance(p, passage) < 64,
          ).length > 0;
        if (reachable)
          return {
            axis,
            coordinate,
            openLane,
            passage,
            passageWidth: interval[1] - interval[0],
            gates,
            direction,
          };
      }
    }
  }
  return null;
}
export function widowPallTracks(q: WidowPall): Rect[] {
  const low = Math.min(q.from, q.to) - q.thickness / 2,
    length = Math.abs(q.to - q.from) + q.thickness;
  return q.spans.map((s) =>
    q.axis === "horizontal"
      ? { x: s.low, y: low, width: s.high - s.low, height: length }
      : { x: low, y: s.low, width: length, height: s.high - s.low },
  );
}
export function widowPallRects(q: WidowPall, now: number): Rect[] {
  const t = clamp((now - q.at) / Math.max(1, q.until - q.at), 0, 1),
    center = q.from + (q.to - q.from) * t;
  return q.spans.map((s) =>
    q.axis === "horizontal"
      ? {
          x: s.low,
          y: center - q.thickness / 2,
          width: s.high - s.low,
          height: q.thickness,
        }
      : {
          x: center - q.thickness / 2,
          y: s.low,
          width: q.thickness,
          height: s.high - s.low,
        },
  );
}
export class WidowGates {
  private gates: WidowGate[] = [];
  private pall: WidowPall | null = null;
  private needles: WidowNeedles[] = [];
  private released = new Set<number>();
  private touched = new Set<string>();
  private walk: WidowWalk | null = null;
  private stage: "idle" | "walk" | "gates" | "between" | "recovery" = "idle";
  private phase = 0;
  private variant: "normal" | "brutal" | "crazed" = "normal";
  private leg = 0;
  private legs = 1;
  private rotation = 0;
  private cycle = 0;
  private until = 0;
  private targetId = "";
  nextSignatureAt = 0;
  get busy() {
    return this.stage !== "idle";
  }
  reset(notBefore = 0) {
    this.gates = [];
    this.pall = null;
    this.needles = [];
    this.walk = null;
    this.released.clear();
    this.touched.clear();
    this.stage = "idle";
    this.nextSignatureAt = notBefore;
  }
  resetEncounter() {
    this.reset();
    this.rotation = 0;
    this.cycle = 0;
  }
  cues(): WidowCue[] {
    return [
      ...this.gates.map((q) => ({ ...q, passage: { ...q.passage } })),
      ...(this.pall
        ? [{ ...this.pall, spans: this.pall.spans.map((s) => ({ ...s })) }]
        : []),
      ...this.needles.map((q) => ({ ...q, angles: [...q.angles] })),
      ...(this.walk ? [{ ...this.walk }] : []),
    ];
  }
  solids(now: number): Rect[] {
    return this.gates
      .filter((q) => !q.open && now >= q.at && now < q.until)
      .map(({ x, y, width, height }) => ({ x, y, width, height }));
  }
  private target(c: SignatureContext) {
    return (
      (c.aimTargets ?? c.targets).find((p) => p.id === this.targetId) ??
      (c.aimTargets ?? c.targets)[0] ??
      c.boss
    );
  }
  private begin(c: SignatureContext) {
    this.phase = c.phase > 0 ? 1 : 0;
    this.variant = c.variant ?? (c.brutal ? "brutal" : "normal");
    this.leg = 0;
    this.legs = 1 + this.phase + (this.variant === "crazed" ? 1 : 0);
    this.cycle++;
    const targets = (c.aimTargets ?? c.targets).toSorted((a, b) =>
      a.id.localeCompare(b.id),
    );
    this.targetId = targets[(this.cycle - 1) % targets.length]?.id ?? "";
    if (!this.phase) {
      this.beginGate(c);
      return;
    }
    const b = board(c),
      target = this.target(c),
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
      const goal = {
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
      for (const o of c.obstacles) {
        const hit = segmentRect(c.boss, goal, o, c.radius);
        if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.001));
      }
      const p = {
        x: c.boss.x + (goal.x - c.boss.x) * fraction,
        y: c.boss.y + (goal.y - c.boss.y) * fraction,
      };
      return (c.hazardCircles ?? []).some(
        (h) => segmentCircle(c.boss, p, h, h.radius + c.radius) !== null,
      )
        ? { ...c.boss }
        : p;
    });
    const end =
        candidates.find((p) => distance(p, c.boss) >= 64) ??
        candidates.toSorted(
          (a, b) => distance(b, c.boss) - distance(a, c.boss),
        )[0],
      moveAt = c.tick + ticks(tuning.patrolWarningSeconds);
    this.walk = {
      kind: "widow-walk",
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
    this.stage = "walk";
  }
  private beginGate(c: SignatureContext) {
    const axis: GateAxis =
        (this.phase + this.leg) % 2 ? "vertical" : "horizontal",
      layout = widowLayout(
        {
          ...c,
          aimTargets: [this.target(c) as SignatureContext["targets"][number]],
        },
        axis,
        this.rotation % 3,
      );
    if (!layout) {
      this.reset(c.tick + ticks(tuning.retrySeconds));
      return;
    }
    c.warn?.();
    this.leg++;
    this.rotation = layout.openLane + 1;
    this.walk = null;
    this.stage = "gates";
    this.touched.clear();
    this.released.clear();
    const b = board(c),
      at = c.tick + ticks(tuning.warningSeconds),
      normalLow = axis === "horizontal" ? b.y : b.x,
      normalHigh = normalLow + (axis === "horizontal" ? b.height : b.width),
      from =
        layout.coordinate +
        layout.direction *
          (tuning.gateThickness / 2 + tuning.pallThickness / 2 + 1),
      to =
        layout.direction > 0
          ? normalHigh - tuning.pallThickness / 2
          : normalLow + tuning.pallThickness / 2,
      pallAt = at + ticks(tuning.pallDelaySeconds),
      pallUntil =
        pallAt +
        Math.max(1, Math.ceil((Math.abs(to - from) / tuning.pallSpeed) * HZ));
    this.pall = {
      kind: "widow-pall",
      id: c.id(),
      axis,
      direction: layout.direction,
      leg: this.leg,
      legs: this.legs,
      beganAt: c.tick,
      at: pallAt,
      until: pallUntil,
      from,
      to,
      thickness: tuning.pallThickness,
      spans: layout.gates.flatMap((g, lane) =>
        lane === layout.openLane
          ? []
          : [
              {
                low: axis === "horizontal" ? g.x : g.y,
                high: axis === "horizontal" ? g.x + g.width : g.y + g.height,
              },
            ],
      ),
    };
    this.gates = layout.gates.map((g, lane) => ({
      ...g,
      kind: "gate",
      id: c.id(),
      open: lane === layout.openLane,
      lane,
      axis,
      leg: this.leg,
      legs: this.legs,
      beganAt: c.tick,
      at,
      until: 0,
      passage: { ...layout.passage },
    }));
    this.needles = [];
    if (this.variant !== "normal")
      this.warnNeedles(c, layout, at + ticks(tuning.needleDelaySeconds));
    this.until = Math.max(
      at + ticks(tuning.closedSeconds),
      pallUntil + ticks(tuning.exitSeconds),
      ...this.needles.map((n) => n.until),
    );
    for (const g of this.gates) g.until = this.until;
  }
  private warnNeedles(c: SignatureContext, l: Layout, firstAt: number) {
    const horizontal = l.axis === "horizontal",
      target = this.target(c),
      multiplier =
        this.variant === "crazed"
          ? catalog.rules.crazed.projectileMultiplier
          : catalog.rules.brutal.projectileMultiplier,
      base = tuning.needlesPerWing * 2,
      total = Math.round(base * multiplier),
      waves = Math.ceil(total / base),
      baseAngles = [-1, 1].flatMap((sign) =>
        Array.from(
          { length: tuning.needlesPerWing },
          (_, i) =>
            sign *
            (tuning.needleHalfGap +
              (i * tuning.needleWingArc) /
                Math.max(1, tuning.needlesPerWing - 1)),
        ),
      );
    for (const sign of [-1, 1]) {
      const p = horizontal
        ? {
            x: l.passage.x + sign * tuning.postSpacing,
            y: l.coordinate + l.direction * (tuning.gateThickness / 2 + 14),
          }
        : {
            x: l.coordinate + l.direction * (tuning.gateThickness / 2 + 14),
            y: l.passage.y + sign * tuning.postSpacing,
          };
      const aim = Math.atan2(target.y - p.y, target.x - p.x);
      for (let wave = 0; wave < waves; wave++) {
        const crossing =
            this.variant === "crazed" && wave >= tuning.crazedCrossingFromWave,
          turn = crossing ? (wave % 2 ? 1 : -1) * tuning.crazedCrossingTurn : 0,
          angles =
            total - wave * base >= base
              ? baseAngles
              : baseAngles.filter((_, i) => i % 2 === 0),
          at =
            firstAt +
            (wave
              ? ticks(
                  catalog.rules.brutal.echoDelaySeconds +
                    (wave - 1) * catalog.rules.brutal.echoWaveSpacingSeconds,
                )
              : 0);
        this.needles.push({
          kind: "widow-needles",
          id: c.id(),
          ...p,
          angles: angles.map((a) => aim + turn + a),
          leg: this.leg,
          wave: wave + 1,
          crossing,
          beganAt: at - ticks(tuning.needleWarningSeconds),
          at,
          until: at + ticks(tuning.needleCueSeconds),
        });
      }
    }
  }
  private strike(c: SignatureContext) {
    if (this.gates.length && c.tick === this.gates[0].at) {
      const solids = this.solids(c.tick);
      // New masonry may invalidate an issued layout. Cancel harm and solids rather
      // than forcing a survivor into an overlap that the original tell did not show.
      const opening = this.gates.find((g) => g.open)!,
        p = opening.passage,
        offset = tuning.gateThickness / 2 + tuning.passageClearance;
      const a =
          opening.axis === "horizontal"
            ? { x: p.x, y: p.y - offset }
            : { x: p.x - offset, y: p.y },
        b =
          opening.axis === "horizontal"
            ? { x: p.x, y: p.y + offset }
            : { x: p.x + offset, y: p.y };
      if (
        c.obstacles.some((o) => segmentRect(a, b, o, 9)) ||
        (c.hazardCircles ?? []).some(
          (h) => segmentCircle(a, b, h, h.radius + 9) !== null,
        ) ||
        c.targets.some(
          (p) =>
            solids.some((g) => inside(p, g, 9)) &&
            solids.some((g) =>
              inside(
                ejectClosingGates(p, solids, 9, c.obstacles, c.hazardCircles),
                g,
                9,
              ),
            ),
        )
      ) {
        this.finish(c);
        return;
      }
      for (const p of c.targets)
        if (
          solids.some((g) => segmentRect({ x: p.oldX, y: p.oldY }, p, g, 9))
        ) {
          c.damage(p.id, tuning.closingDamage * c.damageScale);
          this.touched.add("close:" + p.id);
        }
    }
    const q = this.pall;
    if (q && c.tick >= q.at && c.tick < q.until) {
      const current = widowPallRects(q, c.tick),
        previous = widowPallRects(q, Math.max(q.at, c.tick - 1));
      for (const p of c.targets) {
        const key = "pall:" + p.id;
        if (this.touched.has(key)) continue;
        if (
          current.some(
            (r, i) =>
              segmentRect(
                c.tick === q.at
                  ? p
                  : {
                      x: p.oldX + r.x - previous[i].x,
                      y: p.oldY + r.y - previous[i].y,
                    },
                p,
                r,
                9,
              ) !== null,
          )
        ) {
          c.damage(p.id, tuning.pallDamage * c.damageScale);
          this.touched.add(key);
        }
      }
    }
    for (const n of this.needles)
      if (c.tick >= n.at && !this.released.has(n.id)) {
        this.released.add(n.id);
        const emit = c.emitControlled ?? c.emitHostile;
        for (const angle of n.angles)
          emit?.(
            n,
            angle,
            tuning.needleSpeed,
            tuning.needleDamage * c.damageScale,
            tuning.needleRadius,
          );
      }
    this.needles = this.needles.filter((n) => c.tick < n.until);
  }
  private finish(c: SignatureContext) {
    this.gates = [];
    this.pall = null;
    this.needles = [];
    this.released.clear();
    this.touched.clear();
    this.stage = "recovery";
    this.until = c.tick + ticks(tuning.recoverySeconds);
  }
  step(c: SignatureContext) {
    if (c.paused || !c.targets.length) return;
    if (this.stage === "idle") {
      if (c.tick >= this.nextSignatureAt && !c.auxiliaryBusy) this.begin(c);
      return;
    }
    if (this.stage === "walk") {
      const w = this.walk!;
      if (c.tick < w.moveAt) return;
      const d = distance(c.boss, { x: w.x2, y: w.y2 }),
        step = Math.min(tuning.patrolSpeed * DT, d),
        p = moveBody(
          c.boss,
          {
            x: ((w.x2 - c.boss.x) / Math.max(d, 1e-9)) * step,
            y: ((w.y2 - c.boss.y) / Math.max(d, 1e-9)) * step,
          },
          c.radius,
          c.obstacles,
        ),
        moved = distance(c.boss, p);
      if (c.relocateBoss) c.relocateBoss(p);
      else Object.assign(c.boss, p);
      if (d <= step + 0.01 || moved < 0.001 || c.tick >= w.until)
        this.beginGate(c);
      return;
    }
    if (this.stage === "gates") {
      this.strike(c);
      if (this.stage !== "gates") return;
      if (c.tick >= this.until) {
        this.gates = [];
        this.pall = null;
        this.needles = [];
        this.released.clear();
        if (this.leg < this.legs) {
          this.stage = "between";
          this.until = c.tick + ticks(tuning.betweenGatesSeconds);
        } else this.finish(c);
      }
      return;
    }
    if (c.tick < this.until) return;
    if (this.stage === "between") {
      this.beginGate(c);
      return;
    }
    this.stage = "idle";
    this.nextSignatureAt = c.tick + ticks(tuning.betweenSequencesSeconds);
  }
}
