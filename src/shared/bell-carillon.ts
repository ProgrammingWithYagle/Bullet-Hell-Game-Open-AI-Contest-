import tuning from "./bell-carillon-rules.json";
import { DT, HZ, type Vec } from "./protocol.ts";
import { distance, segmentRect, type Rect } from "./geometry.ts";
import { gappedRingContact } from "./ring-contact.ts";
import type { SignatureContext } from "./boss-director.ts";
export const bellRules = tuning;
type Life = { id: number; beganAt: number; at: number; until: number };
export type BellWalk = Life & {
  kind: "bell-walk";
  path: Vec[];
  index: number;
  speed: number;
};
export type BellRing = Life &
  Vec & {
    kind: "bell-ring";
    radius: number;
    oldRadius: number;
    startRadius: number;
    endRadius: number;
    reach: number;
    gapAngle: number;
    initialGapAngle: number;
    gap: number;
    speed: number;
    width: number;
    damage: number;
    strike: number;
    strikes: number;
    returning: boolean;
    echo: boolean;
    respondTo: number;
    state: "warning" | "travel" | "quiet" | "rewarn" | "done";
    held: boolean;
    holdRadius: number;
    quietUntil: number;
    resumeAt: number;
    motionAt: number;
  };
export type BellResonator = Life &
  Vec & {
    kind: "bell-resonator";
    radius: number;
    fromX: number;
    fromY: number;
    ringId: number;
    respondTo: number;
  };
export type BellCue = BellWalk | BellRing | BellResonator;
const ticks = (s: number) => Math.ceil(s * HZ);
export function bellWalls(c: SignatureContext): Rect[] {
  const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
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
const clear = (a: Vec, b: Vec, walls: Rect[], radius: number) =>
  !walls.some((o) => segmentRect(a, b, o, radius + 0.1) !== null);
/** Connected body-clear lateral procession. No actor metadata enters a path point. */
export function bellRoad(
  c: SignatureContext,
  target: Vec,
  cycle: number,
): Vec[] {
  const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
    pad = c.radius + tuning.clearance,
    step = tuning.gridSpacing,
    walls = bellWalls(c),
    nx = Math.floor((b.width - 2 * pad) / step) + 1,
    ny = Math.floor((b.height - 2 * pad) / step) + 1;
  if (nx < 1 || ny < 1 || nx * ny > 2000) return [{ x: c.boss.x, y: c.boss.y }];
  const nodes = Array.from({ length: nx * ny }, (_, i) => ({
      x: b.x + pad + (i % nx) * step,
      y: b.y + pad + Math.floor(i / nx) * step,
    })),
    valid = nodes.map((p) => clear(p, p, walls, c.radius)),
    parent = new Int32Array(nodes.length).fill(-2),
    cost = new Float64Array(nodes.length).fill(Infinity),
    queue: number[] = [];
  for (let i = 0; i < nodes.length; i++)
    if (
      valid[i] &&
      distance(c.boss, nodes[i]) <= step * 3 &&
      clear(c.boss, nodes[i], walls, c.radius)
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
      if (
        j >= 0 &&
        parent[j] === -2 &&
        valid[j] &&
        clear(nodes[i], nodes[j], walls, c.radius)
      ) {
        parent[j] = i;
        cost[j] = cost[i] + step;
        queue.push(j);
      }
  }
  const a = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
    side = cycle % 2 ? 1 : -1,
    goal = {
      x: c.boss.x - Math.sin(a) * side * 230,
      y: c.boss.y + Math.cos(a) * side * 230,
    },
    candidates = queue
      .filter(
        (i) => cost[i] >= tuning.minimumWalk && cost[i] <= tuning.maximumWalk,
      )
      .toSorted(
        (i, j) =>
          distance(nodes[i], goal) - distance(nodes[j], goal) ||
          cost[i] - cost[j],
      ),
    best =
      candidates[0] ??
      queue
        .filter((i) => cost[i] <= tuning.maximumWalk)
        .toSorted((i, j) => cost[j] - cost[i])[0];
  if (best === undefined) return [{ x: c.boss.x, y: c.boss.y }];
  const reverse: Vec[] = [];
  for (let i = best; i >= 0; i = parent[i]) reverse.push(nodes[i]);
  return [{ x: c.boss.x, y: c.boss.y }, ...reverse.reverse()];
}
export function bellReach(origin: Vec, b: Rect) {
  return (
    Math.max(
      ...[
        { x: b.x, y: b.y },
        { x: b.x + b.width, y: b.y },
        { x: b.x, y: b.y + b.height },
        { x: b.x + b.width, y: b.y + b.height },
      ].map((p) => distance(origin, p)),
    ) +
    tuning.ringWidth +
    12
  );
}
export function bellEchoPoint(
  c: SignatureContext,
  origin: Vec,
  angle: number,
  cycle: number,
): Vec | undefined {
  const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
    walls = bellWalls(c),
    radius = tuning.echoClearance,
    goal = {
      x:
        origin.x + Math.cos(angle + ((cycle % 2 ? 1 : -1) * Math.PI) / 2) * 300,
      y:
        origin.y + Math.sin(angle + ((cycle % 2 ? 1 : -1) * Math.PI) / 2) * 300,
    },
    points: Vec[] = [];
  for (let y = b.y + radius; y <= b.y + b.height - radius; y += 32)
    for (let x = b.x + radius; x <= b.x + b.width - radius; x += 32) {
      const p = { x, y },
        d = distance(origin, p);
      if (
        d >= tuning.echoMinimumDistance &&
        d <= tuning.echoMaximumDistance &&
        clear(p, p, walls, radius)
      )
        points.push(p);
    }
  return points.toSorted((a, b) => distance(a, goal) - distance(b, goal))[0];
}
export class BellCarillon {
  private walk: BellWalk | null = null;
  private rings: BellRing[] = [];
  private bells: BellResonator[] = [];
  private hits = new Map<number, Set<string>>();
  private stage: "idle" | "walk" | "score" = "idle";
  private phase = -1;
  private cycle = 0;
  private strike = 0;
  private directions: boolean[] = [];
  private origin: Vec = { x: 0, y: 0 };
  private gapAngle = 0;
  private activeId = 0;
  private nextAt = 0;
  nextSignatureAt = 0;
  get busy() {
    return this.stage !== "idle";
  }
  reset(until = 0, encounter = false) {
    this.walk = null;
    this.rings = [];
    this.bells = [];
    this.hits.clear();
    this.stage = "idle";
    this.phase = -1;
    this.strike = 0;
    this.directions = [];
    this.activeId = 0;
    this.nextAt = 0;
    this.nextSignatureAt = until;
    if (encounter) this.cycle = 0;
  }
  cues(): BellCue[] {
    return [
      ...(this.walk
        ? [
            {
              ...this.walk,
              path: this.walk.path.map((p) => ({ x: p.x, y: p.y })),
            },
          ]
        : []),
      ...this.rings.map((q) => ({ ...q })),
      ...this.bells.map((q) => ({ ...q })),
    ];
  }
  cast(c: SignatureContext, target: Vec) {
    if (!c.paused && !this.busy && c.tick >= this.nextSignatureAt)
      this.begin(c, target);
    return true;
  }
  private begin(c: SignatureContext, target: Vec) {
    this.phase = c.phase;
    this.gapAngle = (this.cycle * tuning.gapStepDegrees * Math.PI) / 180;
    this.strike = 0;
    this.directions =
      c.phase >= 3
        ? [false, true, false]
        : c.phase === 2
          ? [true, false]
          : c.brutal
            ? [false, true]
            : [false];
    const cycle = this.cycle++;
    if (c.phase === 0) {
      this.origin = { x: c.boss.x, y: c.boss.y };
      this.startRing(c);
      return;
    }
    const path = bellRoad(c, target, cycle),
      length = path.slice(1).reduce((n, p, i) => n + distance(path[i], p), 0),
      speed =
        (c.phase >= 2 ? tuning.lateWalkSpeed : tuning.walkSpeed) *
        Math.min(1.75, Math.max(0.5, c.movementSpeedScale ?? 1)),
      at = c.tick + ticks(tuning.walkWarning);
    this.walk = {
      kind: "bell-walk",
      id: c.id(),
      beganAt: c.tick,
      at,
      until: at + Math.ceil(length / (speed * DT)) + 1,
      path,
      index: 1,
      speed,
    };
    this.stage = "walk";
    c.warn?.();
  }
  private createRing(
    c: SignatureContext,
    origin: Vec,
    returning: boolean,
    echo: boolean,
    respondTo = 0,
  ): BellRing {
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
      reach = bellReach(origin, b),
      startRadius = returning ? reach : 0,
      endRadius = returning ? 0 : reach,
      speed =
        tuning.ringSpeeds[Math.max(0, Math.min(3, c.phase))] *
        Math.min(1.75, Math.max(0.5, c.movementSpeedScale ?? 1)),
      at =
        c.tick +
        ticks(
          echo
            ? tuning.echoWarning
            : returning
              ? tuning.returnWarning
              : tuning.ringWarning,
        ),
      travel = Math.ceil(reach / (speed * DT)),
      holdRadius = Math.min(tuning.holdRadius, reach * 0.4),
      gapAngle =
        this.gapAngle + (echo ? Math.PI : ((this.strike - 1) * Math.PI) / 3),
      q: BellRing = {
        kind: "bell-ring",
        id: c.id(),
        x: origin.x,
        y: origin.y,
        beganAt: c.tick,
        at,
        motionAt: at,
        until: at + travel + (c.brutal && !returning && !echo ? ticks(25) : 1),
        radius: startRadius,
        oldRadius: startRadius,
        startRadius,
        endRadius,
        reach,
        gapAngle,
        initialGapAngle: gapAngle,
        gap: (tuning.gapDegrees * Math.PI) / 180,
        speed,
        width: tuning.ringWidth,
        damage: echo ? tuning.echoDamage : tuning.ringDamage,
        strike: this.strike,
        strikes: this.directions.length,
        returning,
        echo,
        respondTo,
        state: "warning",
        held: false,
        holdRadius,
        quietUntil: 0,
        resumeAt: 0,
      };
    this.rings.push(q);
    this.hits.set(q.id, new Set());
    return q;
  }
  private startRing(c: SignatureContext) {
    this.strike++;
    const q = this.createRing(
      c,
      this.origin,
      this.directions[this.strike - 1],
      false,
    );
    this.activeId = q.id;
    this.walk = null;
    this.stage = "score";
    c.warn?.();
  }
  private hold(c: SignatureContext, q: BellRing) {
    q.held = true;
    q.state = "quiet";
    q.gapAngle =
      q.initialGapAngle + (tuning.resumeGapTurnDegrees * Math.PI) / 180;
    q.quietUntil = c.tick + ticks(tuning.quietSeconds);
    if (c.variant === "crazed") {
      const p = bellEchoPoint(c, q, q.initialGapAngle, this.cycle);
      if (p) {
        const echo = this.createRing(c, p, false, true, q.id);
        q.quietUntil = echo.until + 1;
        this.bells.push({
          kind: "bell-resonator",
          id: c.id(),
          x: p.x,
          y: p.y,
          radius: tuning.echoClearance,
          fromX: q.x,
          fromY: q.y,
          ringId: echo.id,
          respondTo: q.id,
          beganAt: c.tick,
          at: echo.at,
          until: echo.until,
        });
        c.warn?.();
      }
    }
    q.resumeAt = q.quietUntil + ticks(tuning.resumeWarning);
    q.until =
      q.resumeAt + Math.ceil((q.endRadius - q.radius) / (q.speed * DT)) + 1;
  }
  private rest(now: number) {
    this.stage = "idle";
    this.activeId = 0;
    this.nextSignatureAt = now + ticks(tuning.restSeconds);
  }
  step(c: SignatureContext) {
    if (c.paused) {
      this.reset(c.tick + ticks(0.8));
      return;
    }
    if (this.phase >= 0 && c.phase !== this.phase)
      this.reset(c.tick + ticks(1.5));
    this.phase = c.phase;
    const now = c.tick,
      walls = bellWalls(c);
    this.rings = this.rings.filter((q) => {
      if (q.until > now && q.state !== "done") return true;
      this.hits.delete(q.id);
      return false;
    });
    this.bells = this.bells.filter((q) => q.until > now);
    for (const q of this.rings) {
      if (q.state === "warning" && now >= q.at) q.state = "travel";
      if (q.state === "quiet" && now >= q.quietUntil) {
        q.state = "rewarn";
        c.warn?.();
      }
      if (q.state === "rewarn" && now >= q.resumeAt) {
        q.state = "travel";
        q.motionAt = now;
      }
      if (q.state !== "travel") continue;
      q.oldRadius = q.radius;
      const budget = q.speed * DT,
        hold = c.brutal && !q.echo && !q.returning && !q.held,
        limit = hold ? q.holdRadius : q.endRadius;
      q.radius = q.returning
        ? Math.max(limit, q.radius - budget)
        : Math.min(limit, q.radius + budget);
      const hit = this.hits.get(q.id)!;
      for (const p of c.targets)
        if (
          !hit.has(p.id) &&
          gappedRingContact(
            now === q.motionAt ? p : { x: p.oldX, y: p.oldY },
            p,
            q,
          )
        ) {
          hit.add(p.id);
          c.damage(p.id, q.damage * c.damageScale);
        }
      if (hold && q.radius >= q.holdRadius - 0.001) this.hold(c, q);
      else if (Math.abs(q.radius - q.endRadius) < 0.001) {
        q.state = "done";
        q.until = now;
      }
    }
    this.rings = this.rings.filter((q) => {
      if (q.state !== "done") return true;
      this.hits.delete(q.id);
      return false;
    });
    if (this.stage === "walk" && this.walk && now >= this.walk.at) {
      const w = this.walk;
      let budget = w.speed * DT,
        blocked = false;
      while (budget > 0.001 && w.index < w.path.length) {
        const p = w.path[w.index],
          length = distance(c.boss, p),
          travel = Math.min(length, budget),
          next = length
            ? {
                x: c.boss.x + ((p.x - c.boss.x) * travel) / length,
                y: c.boss.y + ((p.y - c.boss.y) * travel) / length,
              }
            : { x: p.x, y: p.y };
        if (!clear(c.boss, next, walls, c.radius)) {
          blocked = true;
          break;
        }
        c.boss.x = next.x;
        c.boss.y = next.y;
        budget -= travel;
        if (length <= travel + 0.001) w.index++;
      }
      if (blocked) {
        this.walk = null;
        this.rest(now);
      } else if (w.index >= w.path.length) {
        this.origin = { x: c.boss.x, y: c.boss.y };
        this.startRing(c);
      }
    } else if (this.stage === "score") {
      if (this.activeId && !this.rings.some((q) => q.id === this.activeId)) {
        this.activeId = 0;
        this.nextAt = now + ticks(tuning.strikeGap);
      }
      if (!this.activeId && now >= this.nextAt) {
        if (this.strike < this.directions.length) this.startRing(c);
        else this.rest(now);
      }
    }
    if (!this.busy && now >= this.nextSignatureAt && !c.auxiliaryBusy) {
      const targets = c.aimTargets ?? c.targets;
      if (targets.length) this.begin(c, targets[this.cycle % targets.length]);
    }
  }
}
