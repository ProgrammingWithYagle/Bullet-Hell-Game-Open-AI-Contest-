import tuning from "./mold-mixing-rules.json";
import { DT, HZ, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  segmentCircle,
  segmentRect,
  type Rect,
} from "./geometry.ts";
import type { SignatureContext } from "./boss-director.ts";
export const moldRules = tuning;
type Life = { id: number; beganAt: number; at: number; until: number };
export type Reagent = "acid" | "alkali" | "catalyst" | "water";
export type MoldWalk = Life & {
  kind: "mold-walk";
  path: Vec[];
  index: number;
  speed: number;
};
export type MoldFlask = Life &
  Vec & {
    kind: "mold-flask";
    fromX: number;
    fromY: number;
    reagent: Exclude<Reagent, "water">;
    radius: number;
    batch: number;
    slot: number;
  };
export type MoldPool = Life &
  Vec & {
    kind: "mold-pool";
    radius: number;
    reagent: Reagent;
    index: number;
    spentAt: number;
  };
export type MoldReaction = Life &
  Vec & {
    kind: "mold-reaction";
    radius: number;
    type: "coupled" | "catalytic";
    sources: number[];
    fired: boolean;
  };
export type MoldReactor = Life &
  Vec & {
    kind: "mold-reactor";
    radius: number;
    blastRadius: number;
    state: "pressure" | "rupture" | "cooled" | "spent";
    ruptureAt: number;
    burstAt: number;
    cooledAt: number;
  };
export type MoldGas = Life &
  Rect & {
    kind: "mold-gas";
    axis: "x" | "y";
    head: number;
    oldHead: number;
    start: number;
    end: number;
    bankWidth: number;
    speed: number;
    index: number;
    count: number;
  };
export type MoldCue =
  MoldWalk | MoldFlask | MoldPool | MoldReaction | MoldReactor | MoldGas;
const ticks = (s: number) => Math.ceil(s * HZ);
const bounds = (c: SignatureContext) =>
  c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
export function moldWalls(c: SignatureContext): Rect[] {
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
const clear = (a: Vec, b: Vec, walls: Rect[], radius: number) =>
  !walls.some((o) => segmentRect(a, b, o, radius + 0.1) !== null);
/** A body-clear mixing road approaches a locked flank on the actual offset arena. */
export function moldRoad(
  c: SignatureContext,
  target: Vec,
  cycle: number,
): Vec[] {
  const b = bounds(c),
    pad = c.radius + tuning.clearance,
    step = tuning.gridSpacing,
    walls = moldWalls(c),
    nx = Math.floor((b.width - 2 * pad) / step) + 1,
    ny = Math.floor((b.height - 2 * pad) / step) + 1;
  if (nx < 1 || ny < 1 || nx * ny > 2000) return [{ x: c.boss.x, y: c.boss.y }];
  const nodes = Array.from({ length: nx * ny }, (_, i) => ({
      x: b.x + pad + (i % nx) * step,
      y: b.y + pad + Math.floor(i / nx) * step,
    })),
    valid = nodes.map((p) => clear(p, p, walls, pad - tuning.clearance)),
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
  const angle = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
    side = (cycle % 2 ? 1 : -1) * (c.phase >= 2 ? -1 : 1),
    goal = {
      x: target.x - Math.cos(angle) * 180 - Math.sin(angle) * side * 140,
      y: target.y - Math.sin(angle) * 180 + Math.cos(angle) * side * 140,
    },
    choices = queue
      .filter(
        (i) => cost[i] >= tuning.minimumWalk && cost[i] <= tuning.maximumWalk,
      )
      .toSorted(
        (a, z) =>
          distance(nodes[a], goal) - distance(nodes[z], goal) ||
          cost[a] - cost[z],
      ),
    best = choices[0] ?? queue.toSorted((a, z) => cost[z] - cost[a])[0];
  if (best === undefined) return [{ x: c.boss.x, y: c.boss.y }];
  const reverse: Vec[] = [];
  for (let i = best; i >= 0; i = parent[i]) reverse.push(nodes[i]);
  return [{ x: c.boss.x, y: c.boss.y }, ...reverse.reverse()];
}
export function moldMovement(
  cues: readonly { kind: string }[],
  position: Vec,
  now: number,
) {
  return cues.some((q) => {
    if (q.kind !== "mold-pool") return false;
    const p = q as MoldPool;
    return (
      p.reagent !== "water" &&
      now >= p.at &&
      now < p.until &&
      distance(position, p) <= p.radius + 9
    );
  })
    ? tuning.slowMultiplier
    : 1;
}
/** A whole-body location inside coolant; the edge remains visibly unsafe. */
export function moldCoolant(
  pools: readonly MoldPool[],
  p: Vec,
  now: number,
  body = 9,
) {
  return pools.some(
    (q) =>
      q.reagent === "water" &&
      now >= q.at &&
      now < q.until &&
      distance(q, p) <= q.radius - body,
  );
}
/** Relative sweep against a vapor bank, excluding only the actual coolant footprint. */
export function moldGasContact(
  from: Vec,
  to: Vec,
  q: MoldGas,
  pools: readonly MoldPool[],
  now: number,
  body = 9,
) {
  const steps = Math.max(
    1,
    Math.ceil((distance(from, to) + Math.abs(q.head - q.oldHead)) / 2),
  );
  for (let n = 0; n <= steps; n++) {
    const f = n / steps,
      p = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f },
      head = q.oldHead + (q.head - q.oldHead) * f,
      axis = q.axis === "x" ? p.x : p.y;
    const tangent = q.axis === "x" ? p.y : p.x,
      lo = q.axis === "x" ? q.y : q.x,
      span = q.axis === "x" ? q.height : q.width;
    if (
      tangent >= lo - body - 2 &&
      tangent <= lo + span + body + 2 &&
      Math.abs(axis - head) <= q.bankWidth / 2 + body + 2 &&
      !moldCoolant(pools, p, now, body)
    )
      return true;
  }
  return false;
}
export function moldFree(
  c: SignatureContext,
  point: Vec,
  radius: number,
): Vec | undefined {
  const b = bounds(c),
    walls = moldWalls(c),
    base = {
      x: clamp(point.x, b.x + radius + 3, b.x + b.width - radius - 3),
      y: clamp(point.y, b.y + radius + 3, b.y + b.height - radius - 3),
    };
  for (let offset = 0; offset <= 480; offset += 24)
    for (let n = 0; n < (offset ? 24 : 1); n++) {
      const p = {
        x: clamp(
          base.x + Math.cos((n * Math.PI) / 12) * offset,
          b.x + radius + 3,
          b.x + b.width - radius - 3,
        ),
        y: clamp(
          base.y + Math.sin((n * Math.PI) / 12) * offset,
          b.y + radius + 3,
          b.y + b.height - radius - 3,
        ),
      };
      if (clear(p, p, walls, radius)) return p;
    }
  return undefined;
}
export class MoldMixing {
  private walk: MoldWalk | null = null;
  private flasks: MoldFlask[] = [];
  private pools: MoldPool[] = [];
  private reactions: MoldReaction[] = [];
  private reactors: MoldReactor[] = [];
  private gas: MoldGas | null = null;
  private contacts = new Map<string, number>();
  private hit = new Map<number, Set<string>>();
  private paired = new Set<number>();
  private stage: "idle" | "walk" | "throws" | "gas" = "idle";
  private phase = -1;
  private cycle = 0;
  private throwIndex = 0;
  private gasIndex = 0;
  private gasCount = 0;
  private nextAt = 0;
  nextSignatureAt = 0;
  get busy() {
    return this.stage !== "idle" || this.walk !== null;
  }
  reset(until = 0, encounter = false) {
    this.walk = null;
    this.flasks = [];
    this.pools = [];
    this.reactions = [];
    this.reactors = [];
    this.gas = null;
    this.contacts.clear();
    this.hit.clear();
    this.paired.clear();
    this.stage = "idle";
    this.phase = -1;
    this.throwIndex = 0;
    this.gasIndex = 0;
    this.gasCount = 0;
    this.nextAt = 0;
    this.nextSignatureAt = until;
    if (encounter) this.cycle = 0;
  }
  cues(): MoldCue[] {
    return [
      ...(this.walk
        ? [
            {
              ...this.walk,
              path: this.walk.path.map((p) => ({ x: p.x, y: p.y })),
            },
          ]
        : []),
      ...this.flasks.map((q) => ({ ...q })),
      ...this.pools.map((q) => ({ ...q })),
      ...this.reactions.map((q) => ({ ...q, sources: [...q.sources] })),
      ...this.reactors.map((q) => ({ ...q })),
      ...(this.gas ? [{ ...this.gas }] : []),
    ];
  }
  cast(c: SignatureContext, target: Vec) {
    if (!c.paused && !c.auxiliaryBusy && !this.busy && c.tick >= this.nextSignatureAt)
      this.begin(c, target);
    return true;
  }
  private begin(c: SignatureContext, target: Vec) {
    this.phase = c.phase;
    const path = moldRoad(c, target, this.cycle++),
      length = path.slice(1).reduce((n, p, i) => n + distance(path[i], p), 0),
      speed =
        (c.phase ? tuning.lateWalkSpeed : tuning.walkSpeed) *
        Math.min(1.75, Math.max(0.5, c.movementSpeedScale ?? 1)),
      at = c.tick + ticks(tuning.walkWarning);
    this.walk = {
      kind: "mold-walk",
      id: c.id(),
      beganAt: c.tick,
      at,
      until: at + Math.ceil(length / (speed * DT)) + 1,
      path,
      index: 1,
      speed,
    };
    c.warn?.();
    this.batch(c);
  }
  private target(c: SignatureContext) {
    const targets = c.aimTargets ?? c.targets;
    return (
      targets[(this.cycle + this.throwIndex) % Math.max(1, targets.length)] ??
      c.boss
    );
  }
  private batch(c: SignatureContext) {
    this.throwIndex = 0;
    this.gasIndex = 0;
    this.gasCount = c.phase === 0 ? 0 : c.phase >= 3 ? 2 : 1;
    if (c.phase >= 2) {
      const target = this.target(c),
        count = c.variant === "crazed" ? 3 : c.brutal ? 2 : 1;
      for (let i = 0; i < count; i++) {
        // Reserve a reagent-sized working footprint, so cover cannot isolate a vessel from its cooling reaction.
        const p = moldFree(
          c,
          {
            x: target.x + (i ? Math.cos(i * 2.1) * 150 : 0),
            y: target.y + (i ? Math.sin(i * 2.1) * 150 : 0),
          },
          tuning.poolRadius,
        );
        if (
          !p ||
          this.reactors.some(
            (q) =>
              q.state !== "spent" &&
              q.state !== "cooled" &&
              distance(q, p) < 65,
          )
        )
          continue;
        const at = c.tick + ticks(tuning.reactorWarning),
          ruptureAt = at + ticks(tuning.reactorFuse),
          burstAt = ruptureAt + ticks(tuning.reactorRuptureWarning);
        this.reactors.push({
          kind: "mold-reactor",
          id: c.id(),
          x: p.x,
          y: p.y,
          radius: tuning.reactorRadius,
          blastRadius: tuning.reactorBlastRadius,
          state: "pressure",
          beganAt: c.tick,
          at,
          ruptureAt,
          burstAt,
          until: burstAt + 10,
          cooledAt: 0,
        });
      }
    }
    this.throw(c, "acid");
  }
  private throw(c: SignatureContext, reagent: Exclude<Reagent, "water">) {
    const target = this.target(c),
      angle = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
      side = reagent === "acid" ? 1 : -1,
      count = reagent === "catalyst" ? 1 : c.brutal ? 2 : 1,
      positions: Vec[] = [],
      at = c.tick + ticks(tuning.flaskWarning);
    for (let i = 0; i < count; i++) {
      const radius =
        reagent === "catalyst" ? tuning.catalystRadius : tuning.poolRadius;
      let p: Vec | undefined;
      for (const turn of i ? [0, 0.45, -0.45, 0.9, -0.9, Math.PI] : [0]) {
        const desired = {
            x: target.x - Math.sin(angle + turn) * side * i * 175,
            y: target.y + Math.cos(angle + turn) * side * i * 175,
          },
          candidate = moldFree(c, desired, radius);
        if (
          candidate &&
          positions.every(
            (q) =>
              distance(q, candidate) >= 120 &&
              distance(q, candidate) <= tuning.couplingRange,
          )
        ) {
          p = candidate;
          break;
        }
      }
      if (!p) continue;
      positions.push(p);
      this.flasks.push({
        kind: "mold-flask",
        id: c.id(),
        x: p.x,
        y: p.y,
        fromX: c.boss.x,
        fromY: c.boss.y - 40,
        reagent,
        radius,
        batch: this.cycle,
        slot: i,
        beganAt: c.tick,
        at,
        until: at + 1,
      });
    }
    this.throwIndex++;
    this.nextAt = at + ticks(tuning.throwGap);
    this.stage = "throws";
    c.warn?.();
  }
  private reaction(
    c: SignatureContext,
    p: Vec,
    radius: number,
    type: "coupled" | "catalytic",
    sources: number[],
    delay: number,
  ) {
    const at = c.tick + ticks(delay);
    this.reactions.push({
      kind: "mold-reaction",
      id: c.id(),
      x: p.x,
      y: p.y,
      radius,
      type,
      sources: [...sources],
      beganAt: c.tick,
      at,
      until: at + 8,
      fired: false,
    });
    c.warn?.();
  }
  private coolant(c: SignatureContext, a: MoldPool, q: MoldFlask) {
    const center = { x: q.x, y: q.y },
      now = c.tick,
      removed = new Set<number>([a.id]),
      walls = moldWalls(c);
    a.until = now;
    let radius = tuning.waterRadius;
    while (radius > tuning.poolRadius && !clear(center, center, walls, radius))
      radius = Math.max(tuning.poolRadius, radius - 8);
    for (const p of this.pools)
      if (p.reagent !== "water" && distance(center, p) <= radius) {
        p.until = now;
        removed.add(p.id);
      }
    this.reactions = this.reactions.filter(
      (r) =>
        !r.sources.some((id) => removed.has(id)) &&
        distance(r, center) > radius,
    );
    this.pools.push({
      kind: "mold-pool",
      id: c.id(),
      x: center.x,
      y: center.y,
      radius,
      reagent: "water",
      index: q.slot,
      beganAt: now,
      at: now,
      until: now + ticks(tuning.waterSeconds),
      spentAt: 0,
    });
    for (const reactor of this.reactors)
      if (
        reactor.state !== "spent" &&
        reactor.state !== "cooled" &&
        distance(reactor, center) <= radius + reactor.radius
      ) {
        reactor.state = "cooled";
        reactor.cooledAt = now;
        reactor.until = now + ticks(0.9);
      }
  }
  private land(c: SignatureContext, q: MoldFlask) {
    const now = c.tick;
    if (q.reagent === "catalyst") {
      const water = this.pools.find(
        (p) =>
          p.until > now && p.reagent === "water" && distance(p, q) <= p.radius,
      );
      if (water) {
        water.spentAt = now;
        water.until = Math.min(water.until, now + ticks(tuning.quenchGrace));
        return;
      }
      const active = this.pools.filter(
        (p) =>
          p.until > now &&
          p.reagent !== "water" &&
          distance(p, q) < p.radius + q.radius,
      );
      if (active.length) {
        for (const p of active) p.until = now;
        this.reaction(
          c,
          q,
          tuning.catalystBlastRadius,
          "catalytic",
          [],
          tuning.catalystWarning,
        );
        return;
      }
    } else {
      const opposite = this.pools
        .filter(
          (p) =>
            p.until > now &&
            p.at <= now &&
            ((p.reagent === "acid" && q.reagent === "alkali") ||
              (p.reagent === "alkali" && q.reagent === "acid")) &&
            distance(p, q) <= (p.radius + q.radius) * tuning.neutralOverlap,
        )
        .toSorted((a, b) => distance(a, q) - distance(b, q))[0];
      if (opposite) {
        this.coolant(c, opposite, q);
        return;
      }
    }
    const p: MoldPool = {
      kind: "mold-pool",
      id: c.id(),
      x: q.x,
      y: q.y,
      radius: q.radius,
      reagent: q.reagent,
      index: q.slot,
      beganAt: q.beganAt,
      at: now,
      until: now + ticks(tuning.poolSeconds),
      spentAt: 0,
    };
    this.pools.push(p);
    if (c.brutal && p.reagent !== "catalyst") {
      const other = this.pools.find(
        (o) =>
          o.id !== p.id &&
          o.until > now &&
          o.reagent === p.reagent &&
          !this.paired.has(o.id) &&
          distance(o, p) <= tuning.couplingRange,
      );
      if (other) {
        this.paired.add(other.id);
        this.paired.add(p.id);
        const sources = [other.id, p.id];
        this.reaction(
          c,
          other,
          tuning.couplingRadius,
          "coupled",
          sources,
          tuning.couplingWarning,
        );
        this.reaction(
          c,
          p,
          tuning.couplingRadius,
          "coupled",
          sources,
          tuning.couplingWarning + tuning.couplingEcho,
        );
      }
    }
  }
  private startGas(c: SignatureContext) {
    const b = bounds(c),
      axis = (this.cycle + this.gasIndex) % 2 ? "x" : "y",
      forward = this.cycle % 2 === 0,
      lo = axis === "x" ? b.x : b.y,
      span = axis === "x" ? b.width : b.height,
      start = forward ? lo - tuning.gasWidth : lo + span + tuning.gasWidth,
      end = forward ? lo + span + tuning.gasWidth : lo - tuning.gasWidth,
      speed =
        tuning.gasSpeed *
        Math.min(1.5, Math.max(0.5, c.movementSpeedScale ?? 1)),
      at = c.tick + ticks(tuning.gasWarning);
    this.gasIndex++;
    this.gas = {
      kind: "mold-gas",
      id: c.id(),
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      axis,
      head: start,
      oldHead: start,
      start,
      end,
      bankWidth: tuning.gasWidth,
      speed,
      index: this.gasIndex,
      count: this.gasCount,
      beganAt: c.tick,
      at,
      until: at + Math.ceil(Math.abs(end - start) / (speed * DT)) + 1,
    };
    this.stage = "gas";
    c.warn?.();
  }
  private rest(now: number) {
    this.gas = null;
    this.stage = "idle";
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
      walls = moldWalls(c);
    for (const q of this.flasks) if (now >= q.at) this.land(c, q);
    this.flasks = this.flasks.filter((q) => q.at > now);
    this.pools = this.pools.filter((q) => q.until > now);
    for (const id of this.paired)
      if (!this.pools.some((p) => p.id === id)) this.paired.delete(id);
    this.reactions = this.reactions.filter(
      (q) =>
        q.until > now &&
        (!q.sources.length ||
          q.sources.every((id) => this.pools.some((p) => p.id === id))),
    );
    for (const p of this.pools)
      if (p.reagent !== "water" && now >= p.at)
        for (const target of c.targets)
          if (
            segmentCircle(
              now === p.at ? target : { x: target.oldX, y: target.oldY },
              target,
              p,
              p.radius + 9,
            ) !== null &&
            now >= (this.contacts.get(target.id) ?? 0)
          ) {
            this.contacts.set(
              target.id,
              now + ticks(tuning.poolContactSeconds),
            );
            c.damage(target.id, tuning.poolDamage * c.damageScale);
          }
    for (const id of this.contacts.keys())
      if (
        !this.pools.some((p) => p.reagent !== "water") ||
        !c.targets.some((p) => p.id === id)
      )
        this.contacts.delete(id);
    for (const q of this.reactions)
      if (!q.fired && now >= q.at) {
        q.fired = true;
        for (const p of c.targets)
          if (
            distance(p, q) <= q.radius + 9 &&
            !moldCoolant(this.pools, p, now)
          )
            c.damage(p.id, tuning.reactionDamage * c.damageScale);
      }
    this.reactors = this.reactors.filter((q) => q.until > now);
    for (const q of this.reactors) {
      if (q.state === "pressure" && now >= q.ruptureAt) {
        q.state = "rupture";
        c.warn?.();
      }
      if (q.state === "rupture" && now >= q.burstAt) {
        q.state = "spent";
        for (const p of c.targets)
          if (
            distance(p, q) <= q.blastRadius + 9 &&
            !moldCoolant(this.pools, p, now)
          )
            c.damage(p.id, tuning.reactorDamage * c.damageScale);
      }
    }
    if (this.gas && now >= this.gas.at && now < this.gas.until) {
      const q = this.gas;
      q.oldHead = q.head;
      q.head =
        q.end > q.start
          ? Math.min(q.end, q.head + q.speed * DT)
          : Math.max(q.end, q.head - q.speed * DT);
      let hit = this.hit.get(q.id);
      if (!hit) {
        hit = new Set();
        this.hit.set(q.id, hit);
      }
      for (const p of c.targets)
        if (
          !hit.has(p.id) &&
          moldGasContact(
            now === q.at ? p : { x: p.oldX, y: p.oldY },
            p,
            q,
            this.pools,
            now,
          )
        ) {
          hit.add(p.id);
          c.damage(p.id, tuning.gasDamage * c.damageScale);
        }
    }
    for (const id of this.hit.keys())
      if (this.gas?.id !== id) this.hit.delete(id);
    if (this.walk && now >= this.walk.at) {
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
      if (blocked || w.index >= w.path.length) this.walk = null;
    }
    if (this.stage === "throws" && now >= this.nextAt) {
      if (this.throwIndex === 1) this.throw(c, "alkali");
      else if (this.throwIndex === 2 && c.variant === "crazed")
        this.throw(c, "catalyst");
      else if (this.gasCount) this.startGas(c);
      else this.rest(now);
    } else if (this.stage === "gas" && this.gas && now >= this.gas.until) {
      if (this.gasIndex < this.gasCount) this.startGas(c);
      else this.rest(now);
    }
    if (!this.busy && now >= this.nextSignatureAt && !c.auxiliaryBusy) {
      const targets = c.aimTargets ?? c.targets;
      if (targets.length) this.begin(nextContext, targets[this.cycle % targets.length]);
    }
  }
}
