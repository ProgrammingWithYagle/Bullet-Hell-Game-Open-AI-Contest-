import tuning from "./bell-carillon-rules.json";
import {
  BellReturnChain,
  bellChainRules,
  type BellChain,
} from "./bell-return-chain.ts";
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
  targetX: number;
  targetY: number;
  arrivalRange: number;
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
export type BellCue =
  BellWalk | BellRing | BellResonator | BellClapper | BellChain;
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
    far = distance(c.boss, target) > tuning.approachRange + 50,
    side = cycle % 2 ? 1 : -1,
    goal = far
      ? {
          x: target.x - Math.cos(a) * tuning.approachRange,
          y: target.y - Math.sin(a) * tuning.approachRange,
        }
      : {
          x: target.x - Math.sin(a) * side * tuning.approachRange,
          y: target.y + Math.cos(a) * side * tuning.approachRange,
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
  target?: Vec,
): Vec | undefined {
  const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
    walls = bellWalls(c),
    radius = tuning.echoClearance,
    goal = target
      ? {
          x: target.x - Math.sin(angle) * (cycle % 2 ? 1 : -1) * 190,
          y: target.y + Math.cos(angle) * (cycle % 2 ? 1 : -1) * 190,
        }
      : {
          x:
            origin.x +
            Math.cos(angle + ((cycle % 2 ? 1 : -1) * Math.PI) / 2) * 300,
          y:
            origin.y +
            Math.sin(angle + ((cycle % 2 ? 1 : -1) * Math.PI) / 2) * 300,
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
export type BellClapper = Life &
  Vec & {
    kind: "bell-clapper";
    angle: number;
    halfAngle: number;
    reach: number;
    damage: number;
    state: "warning" | "swing" | "done";
    echo: boolean;
  };
/** Swept body against a fixed warned sector, including both straight edges. */
export function bellClapperContact(
  from: Vec,
  to: Vec,
  q: BellClapper,
  body = 9,
) {
  const edgeDistance = (p: Vec, a: number) => {
    const dx = Math.cos(a) * q.reach,
      dy = Math.sin(a) * q.reach;
    const t = Math.max(
      0,
      Math.min(1, ((p.x - q.x) * dx + (p.y - q.y) * dy) / (q.reach * q.reach)),
    );
    return Math.hypot(p.x - q.x - dx * t, p.y - q.y - dy * t);
  };
  const steps = Math.max(1, Math.ceil(distance(from, to) / 2));
  for (let i = 0; i <= steps; i++) {
    const p = {
      x: from.x + ((to.x - from.x) * i) / steps,
      y: from.y + ((to.y - from.y) * i) / steps,
    };
    const d = distance(p, q),
      a = Math.atan2(p.y - q.y, p.x - q.x) - q.angle;
    if (d <= body + 1) return true;
    if (
      d <= q.reach + body + 1 &&
      Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= q.halfAngle
    )
      return true;
    if (
      edgeDistance(p, q.angle - q.halfAngle) <= body + 1 ||
      edgeDistance(p, q.angle + q.halfAngle) <= body + 1
    )
      return true;
  }
  return false;
}
/** One clear-floor point aligns the openings of both simultaneous sources. */
export function bellOpeningPoint(
  c: SignatureContext,
  origin: Vec,
  target: Vec,
  echo?: Vec,
): Vec {
  const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
    walls = bellWalls(c);
  const aim = Math.atan2(target.y - origin.y, target.x - origin.x),
    turn = aim + Math.PI * 0.36;
  const goal = {
    x: origin.x + Math.cos(turn) * 300,
    y: origin.y + Math.sin(turn) * 300,
  };
  const points: Vec[] = [];
  for (let y = b.y + 20; y <= b.y + b.height - 20; y += 24)
    for (let x = b.x + 20; x <= b.x + b.width - 20; x += 24) {
      const p = { x, y };
      if (
        distance(p, origin) < 150 ||
        (echo && distance(p, echo) < 130) ||
        !clear(p, p, walls, 12)
      )
        continue;
      const a = Math.atan2(p.y - origin.y, p.x - origin.x) - aim;
      if (
        distance(p, origin) <= tuning.clapperReach + 20 &&
        Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <
          tuning.clapperHalfAngle + 0.15
      )
        continue;
      points.push(p);
    }
  return (
    points.toSorted(
      (a, b) =>
        distance(a, goal) - distance(b, goal) ||
        distance(a, target) - distance(b, target),
    )[0] ?? { x: target.x, y: target.y }
  );
}
type ScoreStep = {
  chain?: boolean;
  due: number;
  returning: boolean;
  echo: boolean;
  strike: number;
  strikes: number;
  clapper: boolean;
};
export class BellCarillon {
  private walk: BellWalk | null = null;
  private rings: BellRing[] = [];
  private chain = new BellReturnChain();
  private bells: BellResonator[] = [];
  private clappers: BellClapper[] = [];
  private hits = new Map<number, Set<string>>();
  private queue: ScoreStep[] = [];
  private stage: "idle" | "walk" | "score" = "idle";
  private phase = -1;
  private cycle = 0;
  private origin: Vec = { x: 0, y: 0 };
  private opening: Vec = { x: 0, y: 0 };
  private response: Vec | undefined;
  private primaryId = 0;
  nextSignatureAt = 0;
  get busy() {
    return this.stage !== "idle";
  }
  reset(until = 0, encounter = false) {
    this.walk = null;
    this.chain.clear();
    this.rings = [];
    this.bells = [];
    this.clappers = [];
    this.hits.clear();
    this.queue = [];
    this.stage = "idle";
    this.phase = -1;
    this.response = undefined;
    this.primaryId = 0;
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
      ...this.chain.cues(),
      ...this.rings.map((q) => ({ ...q })),
      ...this.bells.map((q) => ({ ...q })),
      ...this.clappers.map((q) => ({ ...q })),
    ];
  }
  weakPoints() {
    return this.chain.weakPoints();
  }
  hit(id: number, damage: number, now: number) {
    return this.chain.hit(id, damage, now);
  }
  cast(c: SignatureContext, target: Vec) {
    if (
      !c.paused &&
      !c.auxiliaryBusy &&
      !this.busy &&
      c.tick >= this.nextSignatureAt
    )
      this.begin(c, target);
    return true;
  }
  private begin(c: SignatureContext, target: Vec) {
    this.phase = c.phase;
    const path = bellRoad(c, target, this.cycle++),
      length = path.slice(1).reduce((n, p, i) => n + distance(path[i], p), 0);
    const speed =
      (c.phase >= 2 ? tuning.lateWalkSpeed : tuning.walkSpeed) *
      Math.min(1.75, Math.max(0.5, c.movementSpeedScale ?? 1));
    if (length < 2) {
      this.startScore(c, target);
      return;
    }
    const at = c.tick + ticks(tuning.walkWarning);
    this.walk = {
      kind: "bell-walk",
      id: c.id(),
      beganAt: c.tick,
      at,
      until: at + Math.ceil(length / (speed * DT)) + 1,
      path,
      index: 1,
      speed,
      targetX: target.x,
      targetY: target.y,
      arrivalRange: tuning.approachRange,
    };
    this.stage = "walk";
    c.warn?.();
  }
  private startScore(c: SignatureContext, target: Vec) {
    this.walk = null;
    this.origin = { x: c.boss.x, y: c.boss.y };
    this.stage = "score";
    this.primaryId = 0;
    const aim = Math.atan2(target.y - this.origin.y, target.x - this.origin.x);
    this.response =
      c.variant === "crazed"
        ? bellEchoPoint(c, this.origin, aim, this.cycle, target)
        : undefined;
    this.opening = bellOpeningPoint(c, this.origin, target, this.response);
    const normalOrders = [
      [false, false],
      [false, false, false],
      [false, true, false, false],
    ];
    const advancedOrders = [
      [false, false, true, false],
      [false, true, false, true],
      [false, true, false, true, false],
      [false, true, false, true, false, true],
    ];
    const order = (c.brutal ? advancedOrders : normalOrders)[
      Math.min(c.brutal ? 3 : 2, c.phase)
    ];
    const spacing = c.brutal ? tuning.brutalBeatSeconds : tuning.beatSeconds;
    this.queue = order.map((returning, i) => ({
      due: c.tick + ticks(i * spacing),
      returning,
      echo: false,
      strike: i + 1,
      strikes: order.length,
      clapper: false,
    }));
    const claps = c.brutal ? (c.phase >= 3 ? 3 : 2) : c.phase >= 1 ? 2 : 1;
    for (let i = 0; i < claps; i++)
      this.queue.push({
        due:
          c.tick +
          ticks(
            i *
              (c.brutal
                ? tuning.clapperBeatSeconds
                : tuning.standardClapperBeatSeconds),
          ),
        returning: false,
        echo: false,
        strike: i + 1,
        strikes: claps,
        clapper: true,
      });
    if (c.brutal)
      this.queue.push({
        due: c.tick + ticks(bellChainRules.scoreDelaySeconds),
        returning: false,
        echo: false,
        strike: 1,
        strikes: 1,
        clapper: false,
        chain: true,
      });
    if (this.response) {
      const count = c.phase >= 2 ? 4 : 3,
        first = c.tick + ticks(tuning.echoOffsetSeconds);
      for (let i = 0; i < count; i++)
        this.queue.push({
          due: first + ticks(i * tuning.echoBeatSeconds),
          returning: c.phase >= 2 && i === count - 1,
          echo: true,
          strike: i + 1,
          strikes: count,
          clapper: false,
        });
      this.queue.push({
        due: first + ticks(tuning.echoBeatSeconds),
        returning: false,
        echo: true,
        strike: 1,
        strikes: 1,
        clapper: true,
      });
      this.bells.push({
        kind: "bell-resonator",
        id: c.id(),
        x: this.response.x,
        y: this.response.y,
        radius: tuning.echoClearance,
        fromX: this.origin.x,
        fromY: this.origin.y,
        ringId: 0,
        respondTo: 0,
        beganAt: c.tick,
        at: first + ticks(tuning.echoWarning),
        until: c.tick + ticks(25),
      });
    }
    this.queue.sort(
      (a, b) =>
        a.due - b.due ||
        Number(a.echo) - Number(b.echo) ||
        Number(a.clapper) - Number(b.clapper),
    );
    this.emitDue(c);
  }
  private emitDue(c: SignatureContext) {
    while (this.queue[0] && this.queue[0].due <= c.tick) {
      const s = this.queue.shift()!,
        origin = s.echo ? this.response! : this.origin;
      if (s.chain) {
        const targets = c.aimTargets ?? c.targets;
        this.chain.start(
          c,
          origin,
          targets[this.cycle % Math.max(1, targets.length)] ?? this.opening,
          bellWalls(c),
        );
        continue;
      }
      if (s.clapper) {
        const targets = c.aimTargets ?? c.targets,
          target =
            targets[(s.strike - 1) % Math.max(1, targets.length)] ??
            this.opening;
        const at = c.tick + ticks(tuning.clapperWarning),
          q: BellClapper = {
            kind: "bell-clapper",
            id: c.id(),
            x: origin.x,
            y: origin.y,
            beganAt: c.tick,
            at,
            until: at + ticks(tuning.clapperActiveSeconds),
            angle: Math.atan2(target.y - origin.y, target.x - origin.x),
            halfAngle: tuning.clapperHalfAngle,
            reach: s.echo
              ? tuning.echoClapperReach
              : c.brutal
                ? tuning.clapperReach
                : tuning.standardClapperReach,
            damage: tuning.clapperDamage,
            state: "warning",
            echo: s.echo,
          };
        this.clappers.push(q);
        this.hits.set(q.id, new Set());
        c.warn?.();
        continue;
      }
      const reach = bellReach(
          origin,
          c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
        ),
        speed =
          tuning.ringSpeeds[Math.min(3, c.phase)] *
          Math.min(1.75, Math.max(0.5, c.movementSpeedScale ?? 1));
      const at =
          c.tick +
          ticks(
            s.echo
              ? tuning.echoWarning
              : s.returning
                ? tuning.returnWarning
                : tuning.ringWarning,
          ),
        gapAngle = Math.atan2(
          this.opening.y - origin.y,
          this.opening.x - origin.x,
        );
      const q: BellRing = {
        kind: "bell-ring",
        id: c.id(),
        x: origin.x,
        y: origin.y,
        beganAt: c.tick,
        at,
        motionAt: at,
        until: at + Math.ceil(reach / (speed * DT)) + 2,
        radius: s.returning ? reach : 0,
        oldRadius: s.returning ? reach : 0,
        startRadius: s.returning ? reach : 0,
        endRadius: s.returning ? 0 : reach,
        reach,
        gapAngle,
        initialGapAngle: gapAngle,
        gap:
          ((c.brutal ? tuning.gapDegrees : tuning.standardGapDegrees) *
            Math.PI) /
          180,
        speed,
        width: tuning.ringWidth,
        damage: s.echo ? tuning.echoDamage : tuning.ringDamage,
        strike: s.strike,
        strikes: s.strikes,
        returning: s.returning,
        echo: s.echo,
        respondTo: s.echo ? this.primaryId : 0,
        state: "warning",
        held: false,
        holdRadius: 0,
        quietUntil: 0,
        resumeAt: 0,
      };
      if (!s.echo && !this.primaryId) this.primaryId = q.id;
      if (s.echo && this.bells[0]) {
        if (!this.bells[0].ringId) this.bells[0].ringId = q.id;
        this.bells[0].respondTo = this.primaryId;
      }
      this.rings.push(q);
      this.hits.set(q.id, new Set());
      c.warn?.();
    }
  }
  private rest(now: number) {
    this.stage = "idle";
    this.walk = null;
    this.queue = [];
    this.bells = [];
    this.nextSignatureAt = now + ticks(tuning.restSeconds);
  }
  step(c: SignatureContext) {
    if (c.paused) {
      this.reset(c.tick + ticks(0.8));
      return;
    }
    const nextContext = c;
    // A committed walk/score retains the phase that issued its child attacks.
    if (this.busy) c = { ...c, phase: this.phase };
    const now = c.tick,
      walls = bellWalls(c);
    if (this.stage === "score") this.emitDue(c);
    this.chain.step(c);
    for (const q of this.rings) {
      if (q.state === "warning" && now >= q.at) {
        q.state = "travel";
        c.cueSound?.(q.echo ? "bell-answer" : "bell-toll");
      }
      if (q.state !== "travel") continue;
      q.oldRadius = q.radius;
      q.radius = q.returning
        ? Math.max(0, q.radius - q.speed * DT)
        : Math.min(q.reach, q.radius + q.speed * DT);
      const hit = this.hits.get(q.id)!;
      for (const p of c.targets)
        if (
          !hit.has(p.id) &&
          gappedRingContact(now === q.at ? p : { x: p.oldX, y: p.oldY }, p, q)
        ) {
          hit.add(p.id);
          c.damage(p.id, q.damage * c.damageScale);
        }
      if (Math.abs(q.radius - q.endRadius) < 0.001) {
        q.state = "done";
        q.until = now;
      }
    }
    for (const q of this.clappers) {
      if (q.state === "warning" && now >= q.at) {
        q.state = "swing";
        c.cueSound?.("bell-clapper");
      }
      if (now >= q.until) {
        q.state = "done";
        continue;
      }
      if (q.state !== "swing") continue;
      const hit = this.hits.get(q.id)!;
      for (const p of c.targets)
        if (
          !hit.has(p.id) &&
          bellClapperContact(now === q.at ? p : { x: p.oldX, y: p.oldY }, p, q)
        ) {
          hit.add(p.id);
          c.damage(p.id, q.damage * c.damageScale);
        }
    }
    this.rings = this.rings.filter((q) => {
      if (q.state !== "done" && now < q.until) return true;
      this.hits.delete(q.id);
      return false;
    });
    this.clappers = this.clappers.filter((q) => {
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
        const targets = c.aimTargets ?? c.targets;
        this.startScore(
          c,
          targets[(this.cycle - 1) % Math.max(1, targets.length)] ?? {
            x: w.targetX,
            y: w.targetY,
          },
        );
      }
    } else if (
      this.stage === "score" &&
      !this.queue.length &&
      !this.rings.length &&
      !this.clappers.length &&
      !this.chain.busy
    )
      this.rest(now);
    if (!this.busy && now >= this.nextSignatureAt && !c.auxiliaryBusy) {
      const targets = c.aimTargets ?? c.targets;
      if (targets.length)
        this.begin(nextContext, targets[this.cycle % targets.length]);
    }
  }
}
