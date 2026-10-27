import tuning from "./ambulance-route-rules.json";
import catalog from "../../content/catalog.json";
import { DT, HZ, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  segmentRect,
  segmentCircle,
  type Rect,
} from "./geometry.ts";
import type { SignatureContext } from "./boss-director.ts";
export const ambulanceRules = tuning;
export type AmbulancePatrol = {
  kind: "ambulance-patrol";
  id: number;
  path: Vec[];
  index: number;
  beganAt: number;
  moveAt: number;
  until: number;
};
export type AmbulanceLane = {
  kind: "ambulance-lane";
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  beganAt: number;
  at: number;
  until: number;
  leg: number;
  legs: number;
  interrupted: boolean;
};
export type AmbulanceBurst = {
  kind: "ambulance-burst";
  id: number;
  x: number;
  y: number;
  angles: number[];
  beganAt: number;
  at: number;
  until: number;
  leg: number;
  legs: number;
  crossing: boolean;
};
export type AmbulanceStop = {
  kind: "ambulance-stop";
  id: number;
  x: number;
  y: number;
  beganAt: number;
  until: number;
  leg: number;
  legs: number;
};
export type AmbulanceDriver = {
  kind: "driver";
  id: number;
  x: number;
  y: number;
  radius: number;
  beganAt: number;
  at: number;
  until: number;
};
export type AmbulanceCue =
  | AmbulancePatrol
  | AmbulanceLane
  | AmbulanceBurst
  | AmbulanceStop
  | AmbulanceDriver;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
const bounds = (c: SignatureContext) =>
  c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
function walls(c: SignatureContext): Rect[] {
  const b = bounds(c);
  return [
    ...c.obstacles,
    ...(c.hazardCircles ?? []).map((p) => ({
      x: p.x - p.radius,
      y: p.y - p.radius,
      width: p.radius * 2,
      height: p.radius * 2,
    })),
    { x: b.x - 100, y: b.y - 100, width: 100, height: b.height + 200 },
    { x: b.x + b.width, y: b.y - 100, width: 100, height: b.height + 200 },
    { x: b.x - 100, y: b.y - 100, width: b.width + 200, height: 100 },
    { x: b.x - 100, y: b.y + b.height, width: b.width + 200, height: 100 },
  ];
}
/** Body-radius straight segment; bounds/cover/lava clip the locked tell and motion together. */
export function ambulanceRay(
  c: SignatureContext,
  from: Vec,
  toward: Vec,
  extra = tuning.chargeOverrun,
) {
  const b = bounds(c),
    length = distance(from, toward) || 1;
  const desired = {
    x: clamp(
      toward.x + ((toward.x - from.x) / length) * extra,
      b.x + c.radius + 1,
      b.x + b.width - c.radius - 1,
    ),
    y: clamp(
      toward.y + ((toward.y - from.y) / length) * extra,
      b.y + c.radius + 1,
      b.y + b.height - c.radius - 1,
    ),
  };
  let fraction = 1;
  for (const wall of walls(c)) {
    const h = segmentRect(from, desired, wall, c.radius + 0.1);
    if (h) fraction = Math.min(fraction, Math.max(0, h.t - 0.0001));
  }
  return {
    x: from.x + (desired.x - from.x) * fraction,
    y: from.y + (desired.y - from.y) * fraction,
  };
}
/** Bounded body grid, with reconstructed connected paths rather than steering at unreachable sockets. */
export function ambulancePatrol(
  c: SignatureContext,
  cycle: number,
  late: boolean,
): Vec[] {
  const b = bounds(c),
    pad = c.radius + tuning.routeClearance,
    step = tuning.gridSpacing,
    blocked = walls(c);
  const nx = Math.floor((b.width - 2 * pad) / step) + 1,
    ny = Math.floor((b.height - 2 * pad) / step) + 1;
  if (nx < 1 || ny < 1 || nx * ny > 2000) return [];
  const clear = (a: Vec, z: Vec) =>
    !blocked.some((o) => segmentRect(a, z, o, c.radius + 0.1));
  const nodes = Array.from({ length: nx * ny }, (_, i) => ({
    x: b.x + pad + (i % nx) * step,
    y: b.y + pad + Math.floor(i / nx) * step,
  }));
  const valid = nodes.map((p) => clear(p, p)),
    parent = new Int32Array(nodes.length).fill(-2),
    cost = new Float64Array(nodes.length).fill(Infinity),
    queue: number[] = [];
  for (let i = 0; i < nodes.length; i++)
    if (
      valid[i] &&
      distance(c.boss, nodes[i]) <= step * 2.5 &&
      clear(c.boss, nodes[i])
    ) {
      parent[i] = -1;
      cost[i] = distance(c.boss, nodes[i]);
      queue.push(i);
    }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head],
      x = i % nx,
      y = Math.floor(i / nx);
    for (const j of [
      x ? i - 1 : -1,
      x < nx - 1 ? i + 1 : -1,
      y ? i - nx : -1,
      y < ny - 1 ? i + nx : -1,
    ])
      if (j >= 0 && parent[j] === -2 && valid[j] && clear(nodes[i], nodes[j])) {
        parent[j] = i;
        cost[j] = cost[i] + step;
        queue.push(j);
      }
  }
  const stations = [
    [0.2, 0.16],
    [0.8, 0.16],
    [0.84, 0.5],
    [0.8, 0.82],
    [0.2, 0.82],
    [0.16, 0.5],
  ];
  const station =
      stations[
        (((late ? -cycle : cycle) % stations.length) + stations.length) %
          stations.length
      ],
    goal = { x: b.x + b.width * station[0], y: b.y + b.height * station[1] };
  const candidates = queue
    .filter(
      (i) => cost[i] >= tuning.minimumPatrol && cost[i] <= tuning.maximumPatrol,
    )
    .toSorted(
      (a, z) =>
        distance(nodes[a], goal) - distance(nodes[z], goal) ||
        cost[a] - cost[z],
    );
  const best = candidates[0] ?? queue.toSorted((a, z) => cost[z] - cost[a])[0];
  if (best === undefined) return [];
  const reverse: Vec[] = [];
  for (let i = best; i >= 0; i = parent[i]) reverse.push(nodes[i]);
  const path = [{ ...c.boss }, ...reverse.reverse()];
  return path.filter(
    (p, i) =>
      !i ||
      i === path.length - 1 ||
      Math.abs(
        (p.x - path[i - 1].x) * (path[i + 1].y - p.y) -
          (p.y - path[i - 1].y) * (path[i + 1].x - p.x),
      ) > 0.01,
  );
}
export class AmbulanceRoute {
  private patrol: AmbulancePatrol | null = null;
  private lane: AmbulanceLane | null = null;
  private driver: AmbulanceDriver | null = null;
  private stop: AmbulanceStop | null = null;
  private bursts: AmbulanceBurst[] = [];
  private released = new Set<number>();
  private touched = new Set<string>();
  private stage: "idle" | "patrol" | "lane" | "stop" | "recovery" = "idle";
  private phase = 0;
  private variant: "normal" | "brutal" | "crazed" = "normal";
  private cycle = 0;
  private leg = 1;
  private legs = 1;
  private until = 0;
  nextSignatureAt = 0;
  get busy() {
    return this.stage !== "idle";
  }
  get recovering() {
    return this.stage === "recovery";
  }
  get charging() {
    return this.stage === "lane";
  }
  reset(notBefore = 0) {
    this.patrol = null;
    this.lane = null;
    this.driver = null;
    this.stop = null;
    this.bursts = [];
    this.released.clear();
    this.touched.clear();
    this.stage = "idle";
    this.nextSignatureAt = notBefore;
  }
  resetEncounter() {
    this.reset();
    this.cycle = 0;
  }
  cues(): AmbulanceCue[] {
    return [
      ...(this.patrol
        ? [{ ...this.patrol, path: this.patrol.path.map((p) => ({ ...p })) }]
        : []),
      ...(this.lane ? [{ ...this.lane }] : []),
      ...(this.driver ? [{ ...this.driver }] : []),
      ...(this.stop ? [{ ...this.stop }] : []),
      ...this.bursts.map((q) => ({ ...q, angles: [...q.angles] })),
    ];
  }
  private target(c: SignatureContext) {
    const all = (c.aimTargets ?? c.targets).toSorted((a, b) =>
      a.id.localeCompare(b.id),
    );
    return all[(this.cycle + this.leg - 2) % all.length] ?? c.boss;
  }
  private start(c: SignatureContext) {
    this.phase = c.phase > 0 ? 1 : 0;
    this.variant = c.variant ?? (c.brutal ? "brutal" : "normal");
    this.cycle++;
    this.leg = 1;
    this.legs =
      this.variant === "normal"
        ? 1 + this.phase
        : 2 + this.phase + (this.variant === "crazed" && this.phase ? 1 : 0);
    const path = ambulancePatrol(c, this.cycle, this.phase > 0),
      length = path
        .slice(1)
        .reduce((sum, p, i) => sum + distance(p, path[i]), 0);
    if (path.length < 2 || length < 16) {
      this.makeLane(c);
      return;
    }
    const moveAt = c.tick + ticks(tuning.patrolWarningSeconds);
    this.patrol = {
      kind: "ambulance-patrol",
      id: c.id(),
      path,
      index: 1,
      beganAt: c.tick,
      moveAt,
      until:
        moveAt + Math.ceil((length / tuning.patrolSpeed) * HZ) + ticks(0.5),
    };
    this.stage = "patrol";
    c.warn?.();
  }
  private attack() {
    const boss = catalog.bosses.find((b) => b.id === "black-ambulance")!;
    return (
      this.variant === "normal"
        ? boss.phases
        : boss.variants[this.variant].phases
    )[this.phase].attacks.find((a) => a.kind === "charge")!;
  }
  private makeLane(c: SignatureContext) {
    const target = this.target(c),
      aim = Math.atan2(target.y - c.boss.y, target.x - c.boss.x);
    const options = [0, Math.PI / 2, -Math.PI / 2, Math.PI].map((turn) =>
      ambulanceRay(c, c.boss, {
        x:
          c.boss.x +
          Math.cos(aim + turn) * Math.max(160, distance(c.boss, target)),
        y:
          c.boss.y +
          Math.sin(aim + turn) * Math.max(160, distance(c.boss, target)),
      }),
    );
    const end = options.find(
      (p) => distance(p, c.boss) >= tuning.minimumCharge,
    );
    if (!end) {
      this.finish(c);
      return;
    }
    const speed = Math.min(
        600,
        this.attack().speed * (c.movementSpeedScale ?? 1),
      ),
      at = c.tick + ticks(this.attack().telegraph);
    this.lane = {
      kind: "ambulance-lane",
      id: c.id(),
      x1: c.boss.x,
      y1: c.boss.y,
      x2: end.x,
      y2: end.y,
      width: c.radius * 2,
      beganAt: c.tick,
      at,
      until: at + Math.ceil((distance(c.boss, end) / speed) * HZ) + 1,
      leg: this.leg,
      legs: this.legs,
      interrupted: false,
    };
    this.touched.clear();
    this.patrol = null;
    this.stop = null;
    this.stage = "lane";
    c.warn?.();
  }
  private arrive(c: SignatureContext) {
    this.lane = null;
    this.stage = "stop";
    this.until = c.tick + ticks(tuning.betweenLegSeconds);
    this.stop = {
      kind: "ambulance-stop",
      id: c.id(),
      x: c.boss.x,
      y: c.boss.y,
      beganAt: c.tick,
      until: this.until,
      leg: this.leg,
      legs: this.legs,
    };
    if (this.variant === "normal") return;
    const target = this.target(c),
      heading = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
      base = tuning.spokesPerWing * 2,
      total = Math.round(
        base *
          (this.variant === "crazed"
            ? catalog.rules.crazed.projectileMultiplier
            : catalog.rules.brutal.projectileMultiplier),
      );
    const offsets = [-1, 1].flatMap((sign) =>
      Array.from(
        { length: tuning.spokesPerWing },
        (_, i) =>
          sign *
          (tuning.halfGap +
            (i * tuning.wingArc) / Math.max(1, tuning.spokesPerWing - 1)),
      ),
    );
    for (const sign of [-1, 1]) {
      const point = {
        x: c.boss.x + Math.cos(heading + Math.PI / 2) * sign * c.radius * 0.65,
        y: c.boss.y + Math.sin(heading + Math.PI / 2) * sign * c.radius * 0.65,
      };
      const aim = Math.atan2(target.y - point.y, target.x - point.x);
      for (let wave = 0; wave < Math.ceil(total / base); wave++) {
        const crossing = this.variant === "crazed" && wave >= 3,
          turn = crossing ? (wave % 2 ? 1 : -1) * tuning.crossingTurn : 0;
        const selected =
            total - wave * base >= base
              ? offsets
              : offsets.filter((_, i) => i % 2 === 0),
          at =
            c.tick +
            ticks(tuning.burstWarningSeconds + wave * tuning.echoSeconds);
        this.bursts.push({
          kind: "ambulance-burst",
          id: c.id(),
          ...point,
          angles: selected.map((a) => aim + a + turn),
          beganAt: c.tick,
          at,
          until: at + ticks(tuning.releaseCueSeconds),
          leg: this.leg,
          legs: this.legs,
          crossing,
        });
      }
    }
    this.until = Math.max(
      this.until,
      ...this.bursts.map((q) => q.until + ticks(tuning.departureGapSeconds)),
    );
    this.stop.until = this.until;
    c.warn?.();
  }
  private finish(c: SignatureContext) {
    this.patrol = null;
    this.lane = null;
    this.stop = null;
    this.bursts = [];
    this.released.clear();
    this.stage = "recovery";
    this.until = c.tick + ticks(tuning.recoverySeconds);
    this.driver = {
      kind: "driver",
      id: c.id(),
      x: c.boss.x,
      y: c.boss.y - 35,
      radius: 28,
      beganAt: c.tick,
      at: c.tick,
      until: this.until,
    };
  }
  step(c: SignatureContext) {
    if (c.paused) {
      this.reset();
      return;
    }
    if (
      this.stage === "idle" &&
      c.tick >= this.nextSignatureAt &&
      c.targets.length &&
      !c.auxiliaryBusy
    )
      this.start(c);
    const patrol = this.patrol;
    if (patrol && c.tick >= patrol.moveAt) {
      const old = { ...c.boss },
        goal = patrol.path[patrol.index],
        length = distance(old, goal),
        travel = Math.min(length, tuning.patrolSpeed * DT),
        next = ambulanceRay(
          c,
          old,
          {
            x: old.x + ((goal.x - old.x) / Math.max(0.000001, length)) * travel,
            y: old.y + ((goal.y - old.y) / Math.max(0.000001, length)) * travel,
          },
          0,
        );
      c.boss.x = next.x;
      c.boss.y = next.y;
      if (distance(next, goal) < 0.5) patrol.index++;
      if (
        patrol.index >= patrol.path.length ||
        distance(old, next) < 0.01 ||
        c.tick >= patrol.until
      )
        this.makeLane(c);
    }
    const lane = this.lane;
    if (lane && c.tick >= lane.at) {
      const old = { ...c.boss },
        end = { x: lane.x2, y: lane.y2 },
        length = distance(old, end),
        speed = Math.min(
          600,
          this.attack().speed * (c.movementSpeedScale ?? 1),
        ),
        travel = Math.min(length, speed * DT);
      const desired = {
          x: old.x + ((end.x - old.x) / Math.max(0.000001, length)) * travel,
          y: old.y + ((end.y - old.y) / Math.max(0.000001, length)) * travel,
        },
        next = ambulanceRay(c, old, desired, 0),
        fraction = Math.min(
          1,
          distance(old, next) / Math.max(0.000001, speed * DT),
        );
      c.boss.x = next.x;
      c.boss.y = next.y;
      for (const p of c.targets)
        if (!this.touched.has(p.id)) {
          const first = c.tick === lane.at,
            px = first ? p.x : p.oldX,
            py = first ? p.y : p.oldY;
          if (
            segmentCircle(
              { x: px - old.x, y: py - old.y },
              {
                x: px + (p.x - px) * fraction - next.x,
                y: py + (p.y - py) * fraction - next.y,
              },
              { x: 0, y: 0 },
              c.radius + 9,
            ) !== null
          ) {
            c.damage(p.id, this.attack().damage * c.damageScale);
            this.touched.add(p.id);
          }
        }
      lane.interrupted = distance(next, desired) > 0.1;
      if (
        distance(next, end) < 0.5 ||
        distance(old, next) < 0.01 ||
        lane.interrupted ||
        c.tick >= lane.until
      )
        this.arrive(c);
    }
    for (const q of this.bursts)
      if (c.tick >= q.at && !this.released.has(q.id)) {
        this.released.add(q.id);
        if (!c.obstacles.some((o) => segmentRect(q, q, o, tuning.shotRadius)))
          for (const angle of q.angles)
            (c.emitControlled ?? c.emitHostile)?.(
              q,
              angle,
              tuning.shotSpeed,
              tuning.shotDamage * c.damageScale,
              tuning.shotRadius,
            );
      }
    this.bursts = this.bursts.filter((q) => c.tick < q.until);
    if (this.stage === "stop" && c.tick >= this.until) {
      this.bursts = [];
      this.released.clear();
      if (this.leg < this.legs) {
        this.leg++;
        this.makeLane(c);
      } else this.finish(c);
    }
    if (this.stage === "recovery" && c.tick >= this.until) {
      this.driver = null;
      this.stage = "idle";
      this.nextSignatureAt = c.tick + ticks(tuning.betweenSequencesSeconds);
    }
  }
}
