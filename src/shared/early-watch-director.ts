import { DT, HZ, type BossId, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  moveBody,
  segmentCircle,
  segmentRect,
  type Rect,
} from "./geometry.ts";
import type { BossCue, SignatureContext } from "./boss-director.ts";

export const earlyWatchBossIds = [
  "ashen-usher",
  "brass-toad",
  "ragpicker-kite",
] as const;
export type EarlyWatchId = (typeof earlyWatchBossIds)[number];
export type EarlyProp = {
  kind: "early-prop";
  id: number;
  role: "ticket" | "drain" | "pin";
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  at: number;
  until: number;
};
export type EarlyLane = {
  kind: "early-lane";
  id: number;
  role: "tongue" | "wind";
  sourceId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  force: number;
  at: number;
  until: number;
  cancelled: boolean;
};
export type EarlyVolley = {
  kind: "early-volley";
  id: number;
  sourceId: number;
  x: number;
  y: number;
  aim: number;
  count: number;
  arc: number;
  ring: boolean;
  at: number;
  until: number;
  cancelled: boolean;
};
export type EarlyHop = {
  kind: "early-hop";
  id: number;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  radius: number;
  at: number;
  landAt: number;
  until: number;
};
export type EarlyWatchCue = EarlyProp | EarlyLane | EarlyVolley | EarlyHop;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);

/** Wind is a velocity, summed once and bounded before collision resolution on both peers. */
export function earlyWatchMovement(
  cues: readonly BossCue[],
  p: Vec,
  now: number,
  dodging = false,
): Vec {
  if (dodging) return { x: 0, y: 0 };
  let x = 0,
    y = 0;
  for (const c of cues) {
    if (
      c.kind !== "early-lane" ||
      c.role !== "wind" ||
      c.cancelled ||
      now < c.at ||
      now >= c.until
    )
      continue;
    const dx = c.x2 - c.x1,
      dy = c.y2 - c.y1,
      length = Math.hypot(dx, dy);
    if (!length) continue;
    const along = ((p.x - c.x1) * dx + (p.y - c.y1) * dy) / length;
    const across = Math.abs((p.x - c.x1) * dy - (p.y - c.y1) * dx) / length;
    if (along < 0 || along > length || across > c.width / 2) continue;
    x += (dx / length) * c.force;
    y += (dy / length) * c.force;
  }
  const magnitude = Math.hypot(x, y),
    factor = magnitude > 65 ? 65 / magnitude : 1;
  return { x: x * factor, y: y * factor };
}

type PendingVolley = EarlyVolley & {
  speed: number;
  damage: number;
  fired: boolean;
};
type PendingHop = EarlyHop & {
  aim: number;
  gap: number;
  count: number;
  speed: number;
  damage: number;
  landed: boolean;
};
type Attack = {
  count: number;
  speed: number;
  damage: number;
  telegraph: number;
};

export class EarlyWatchDirector {
  private kind: BossId = "constable";
  private props: EarlyProp[] = [];
  private lanes: (EarlyLane & { damage: number })[] = [];
  private volleys: PendingVolley[] = [];
  private hops: PendingHop[] = [];
  private contacts = new Map<string, number>();
  private cycle = 0;
  nextSignatureAt = 0;
  lastReleaseAt = 0;
  handles(id: BossId): id is EarlyWatchId {
    return earlyWatchBossIds.some((b) => b === id);
  }
  reset(kind: BossId, encounter = false) {
    this.kind = kind;
    this.props = [];
    this.lanes = [];
    this.volleys = [];
    this.hops = [];
    this.contacts.clear();
    this.nextSignatureAt = this.lastReleaseAt = 0;
    if (encounter) this.cycle = 0;
  }
  weakPoints() {
    return this.props.filter((p) => p.health > 0).map((p) => ({ ...p }));
  }
  cues(): EarlyWatchCue[] {
    return [
      ...this.props,
      ...this.lanes.map(({ damage: _damage, ...c }) => c),
      ...this.volleys.map(
        ({ speed: _speed, damage: _damage, fired: _fired, ...c }) => c,
      ),
      ...this.hops.map(
        ({
          aim: _aim,
          gap: _gap,
          count: _count,
          speed: _speed,
          damage: _damage,
          landed: _landed,
          ...c
        }) => c,
      ),
    ].map((c) => ({ ...c }));
  }
  hit(id: number, amount: number) {
    const p = this.props.find((p) => p.id === id && p.health > 0);
    if (!p || !Number.isFinite(amount) || amount <= 0) return 0;
    const actual = Math.min(p.health, amount);
    p.health -= actual;
    if (p.health <= 0) {
      for (const c of [...this.lanes, ...this.volleys])
        if (c.sourceId === id) c.cancelled = true;
    }
    return actual;
  }
  private open(
    c: SignatureContext,
    desired: Vec,
    radius: number,
    avoidBodies = false,
  ): Vec {
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    const usable = (p: Vec) =>
      !c.obstacles.some((o) => segmentRect(p, p, o, radius + 8)) &&
      (!avoidBodies ||
        (distance(p, c.boss) >= c.radius + radius + 20 &&
          this.props.every((q) => distance(p, q) >= q.radius + radius + 20)));
    for (const spread of [0, 90, 180, 270, 360])
      for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const p = {
          x: clamp(
            desired.x + Math.cos(angle) * spread,
            b.x + radius + 12,
            b.x + b.width - radius - 12,
          ),
          y: clamp(
            desired.y + Math.sin(angle) * spread,
            b.y + radius + 12,
            b.y + b.height - radius - 12,
          ),
        };
        if (usable(p)) return p;
      }
    if (avoidBodies)
      for (let row = 1; row < 8; row++)
        for (let col = 1; col < 10; col++) {
          const p = {
            x: b.x + (b.width * col) / 10,
            y: b.y + (b.height * row) / 8,
          };
          if (usable(p)) return p;
        }
    if (avoidBodies) throw Error("No open Early Watch weak-point site");
    return { x: c.boss.x, y: c.boss.y };
  }
  private prop(
    c: SignatureContext,
    role: EarlyProp["role"],
    point: Vec,
    until: number,
  ) {
    const p = this.open(c, point, 23, true),
      health = (role === "ticket" ? 32 : 44) * (c.brutal ? 1.5 : 1);
    const item: EarlyProp = {
      kind: "early-prop",
      id: c.id(),
      role,
      x: p.x,
      y: p.y,
      radius: 23,
      health,
      maxHealth: health,
      at: c.tick,
      until,
    };
    this.props.push(item);
    return item;
  }
  private volley(
    c: SignatureContext,
    a: Attack,
    origin: Vec,
    target: Vec,
    at: number,
    sourceId = 0,
    offset = 0,
    ring = false,
  ) {
    this.volleys.push({
      kind: "early-volley",
      id: c.id(),
      sourceId,
      x: origin.x,
      y: origin.y,
      aim: Math.atan2(target.y - origin.y, target.x - origin.x) + offset,
      count: Math.max(3, Math.min(28, a.count)),
      arc: ring ? 1.8 : 0.7,
      ring,
      at,
      until: at + ticks(0.35),
      cancelled: false,
      speed: a.speed,
      damage: a.damage * c.damageScale,
      fired: false,
    });
  }
  cast(c: SignatureContext, target: Vec, a: Attack) {
    if (!this.handles(c.bossId)) return false;
    if (c.tick < this.nextSignatureAt) return true;
    this.props = [];
    this.lanes = [];
    this.volleys = [];
    this.hops = [];
    this.contacts.clear();
    this.cycle++;
    const now = c.tick,
      release = now + ticks(Math.max(1.25, a.telegraph));
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    if (c.bossId === "ashen-usher") {
      const until = release + ticks(3.2),
        axis = c.phase === 0 ? 0 : Math.PI / 2;
      for (const side of [-1, 1]) {
        const p = this.prop(
          c,
          "ticket",
          {
            x: c.boss.x + Math.cos(axis) * side * 240,
            y: c.boss.y + Math.sin(axis) * side * 200,
          },
          until,
        );
        this.volley(
          c,
          a,
          p,
          target,
          release + ticks(side === 1 ? 0.65 : 0),
          p.id,
          side * 0.22,
        );
        if (c.phase >= 2)
          this.volley(
            c,
            a,
            p,
            target,
            release + ticks(1.4 + (side === 1 ? 0.55 : 0)),
            p.id,
            -side * 0.22,
          );
      }
      if (c.brutal) {
        const rear = this.prop(
          c,
          "ticket",
          { x: target.x + (this.cycle % 2 ? 280 : -280), y: target.y - 170 },
          until,
        );
        this.volley(
          c,
          a,
          rear,
          target,
          release + ticks(2.2),
          rear.id,
          0,
          c.phase >= 3,
        );
      }
    } else if (c.bossId === "brass-toad") {
      const count = c.phase === 0 ? 1 : c.phase >= 3 ? 3 : 2;
      let from = { ...c.boss };
      const plug = this.prop(
        c,
        "drain",
        { x: c.boss.x + 90, y: c.boss.y + 35 },
        release + ticks(5),
      );
      for (let n = 0; n < count; n++) {
        // Every destination locks now. Bound travel and resolve the complete path against cover.
        const angle =
          Math.atan2(target.y - from.y, target.x - from.x) +
          (n % 2 ? 0.85 : -0.25);
        const wanted = {
          x: from.x + Math.cos(angle) * Math.min(280, distance(from, target)),
          y: from.y + Math.sin(angle) * Math.min(280, distance(from, target)),
        };
        const free = this.open(c, wanted, c.radius);
        const end = moveBody(
          from,
          { x: free.x - from.x, y: free.y - from.y },
          c.radius,
          c.obstacles,
        );
        const at = release + ticks(n * 1.5),
          landAt = at + ticks(0.65);
        this.hops.push({
          kind: "early-hop",
          id: c.id(),
          ...end,
          fromX: from.x,
          fromY: from.y,
          radius: 66,
          at,
          landAt,
          until: landAt + ticks(0.3),
          aim: Math.atan2(target.y - end.y, target.x - end.x),
          gap: 1.9,
          count: Math.max(12, a.count),
          speed: a.speed,
          damage: a.damage * c.damageScale,
          landed: false,
        });
        if (c.brutal)
          this.volley(
            c,
            { ...a, count: Math.max(12, a.count) },
            end,
            target,
            landAt + ticks(0.45),
            0,
            0,
            true,
          );
        from = end;
      }
      if (c.phase >= 2 || c.brutal) {
        const at = this.hops.at(-1)!.landAt + ticks(0.9),
          angle = Math.atan2(target.y - from.y, target.x - from.x);
        const end = {
          x: clamp(
            from.x + Math.cos(angle) * 620,
            b.x + 20,
            b.x + b.width - 20,
          ),
          y: clamp(
            from.y + Math.sin(angle) * 620,
            b.y + 20,
            b.y + b.height - 20,
          ),
        };
        this.lanes.push({
          kind: "early-lane",
          id: c.id(),
          sourceId: plug.id,
          role: "tongue",
          x1: from.x,
          y1: from.y,
          x2: end.x,
          y2: end.y,
          width: 32,
          force: 0,
          at,
          until: at + ticks(0.28),
          cancelled: false,
          damage: a.damage * c.damageScale,
        });
      }
    } else {
      const cross = c.phase >= 1,
        span = b.width * 0.64,
        y = b.y + b.height * 0.55;
      for (const side of cross ? [-1, 1] : [this.cycle % 2 ? 1 : -1]) {
        const laneY = y + (cross ? side * 160 : 0),
          start = { x: b.x + b.width / 2 - (side * span) / 2, y: laneY };
        const pin = this.prop(c, "pin", start, release + ticks(3.8));
        this.lanes.push({
          kind: "early-lane",
          id: c.id(),
          role: "wind",
          sourceId: pin.id,
          x1: start.x,
          y1: start.y,
          x2: start.x + side * span,
          y2: laneY,
          width: 150,
          force: c.brutal ? 65 : 48,
          at: release,
          until: release + ticks(3.5),
          cancelled: false,
          damage: 0,
        });
      }
      const waves = c.phase >= 2 ? 3 : 1;
      for (let wave = 0; wave < waves; wave++)
        this.volley(
          c,
          a,
          { ...c.boss },
          target,
          release + ticks(0.65 + wave * 0.65),
          0,
          (wave - 1) * 0.25,
        );
      if (c.brutal) {
        // A warned diagonal corridor adds a new response; dodge temporarily suppresses its force.
        const pin = this.prop(
          c,
          "pin",
          { x: b.x + b.width * 0.25, y: b.y + b.height * 0.25 },
          release + ticks(4.3),
        );
        this.lanes.push({
          kind: "early-lane",
          id: c.id(),
          role: "wind",
          sourceId: pin.id,
          x1: pin.x,
          y1: pin.y,
          x2: b.x + b.width * 0.75,
          y2: b.y + b.height * 0.75,
          width: 110,
          force: 55,
          at: release + ticks(1.5),
          until: release + ticks(4),
          cancelled: false,
          damage: 0,
        });
        if (c.phase >= 3)
          this.volley(
            c,
            a,
            { ...c.boss },
            target,
            release + ticks(3),
            0,
            0,
            true,
          );
      }
    }
    this.lastReleaseAt = Math.max(
      release,
      ...this.volleys.map((v) => v.at),
      ...this.lanes.map((l) => l.until),
      ...this.hops.map((h) => h.until),
    );
    this.nextSignatureAt = this.lastReleaseAt + ticks(1.2);
    return true;
  }
  private emit(
    c: SignatureContext,
    v: {
      x: number;
      y: number;
      aim: number;
      arc: number;
      count: number;
      speed: number;
      damage: number;
      ring: boolean;
    },
  ) {
    for (let n = 0; n < v.count; n++) {
      const f = n / Math.max(1, v.count - 1),
        angle = v.ring
          ? v.aim + v.arc / 2 + f * (2 * Math.PI - v.arc)
          : v.aim + (f - 0.5) * v.arc;
      c.emitHostile?.(v, angle, v.speed, v.damage, 5);
    }
  }
  step(c: SignatureContext) {
    if (!this.handles(this.kind)) return;
    for (const v of this.volleys)
      if (!v.cancelled && !v.fired && c.tick >= v.at) {
        this.emit(c, v);
        v.fired = true;
      }
    for (const h of this.hops) {
      if (c.tick >= h.at && c.tick <= h.landAt) {
        const f = clamp((c.tick - h.at) / (h.landAt - h.at), 0, 1);
        c.boss.x = h.fromX + (h.x - h.fromX) * f;
        c.boss.y = h.fromY + (h.y - h.fromY) * f;
      }
      if (!h.landed && c.tick >= h.landAt) {
        h.landed = true;
        for (const p of c.targets)
          if (distance(p, h) <= h.radius + 9) c.damage(p.id, h.damage);
        this.emit(c, { ...h, arc: h.gap, ring: true });
      }
    }
    for (const lane of this.lanes)
      if (
        lane.role === "tongue" &&
        !lane.cancelled &&
        c.tick >= lane.at &&
        c.tick < lane.until
      )
        for (const p of c.targets)
          if (
            !this.contacts.has(lane.id + ":" + p.id) &&
            segmentCircle(
              { x: lane.x1, y: lane.y1 },
              { x: lane.x2, y: lane.y2 },
              p,
              lane.width / 2 + 9,
            ) !== null
          ) {
            c.damage(p.id, lane.damage);
            this.contacts.set(lane.id + ":" + p.id, c.tick);
          }
    // Usher advances between calls; Kite orbits faster as its cloth unravels. Toad moves through its warned hops.
    if (
      this.kind !== "brass-toad" &&
      !c.paused &&
      c.tick > 2 * HZ &&
      c.tick >= this.lastReleaseAt + ticks(0.35)
    ) {
      const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
        theta = c.tick / (HZ * (this.kind === "ragpicker-kite" ? 5 : 9));
      const goal = {
        x: b.x + b.width / 2 + Math.cos(theta) * b.width * 0.23,
        y: b.y + b.height * 0.38 + Math.sin(theta) * b.height * 0.17,
      };
      const angle = Math.atan2(goal.y - c.boss.y, goal.x - c.boss.x),
        speed = (this.kind === "ragpicker-kite" ? 60 : 30) + c.phase * 14;
      const p = moveBody(
        c.boss,
        { x: Math.cos(angle) * speed * DT, y: Math.sin(angle) * speed * DT },
        c.radius,
        c.obstacles,
      );
      c.boss.x = clamp(p.x, b.x + c.radius, b.x + b.width - c.radius);
      c.boss.y = clamp(p.y, b.y + c.radius, b.y + b.height - c.radius);
    }
    this.props = this.props.filter((p) => c.tick < p.until);
    this.lanes = this.lanes.filter((p) => c.tick < p.until);
    this.volleys = this.volleys.filter((p) => c.tick < p.until);
    this.hops = this.hops.filter((p) => c.tick < p.until);
  }
}
