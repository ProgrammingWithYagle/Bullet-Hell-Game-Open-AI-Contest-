// Shared-authority Small Wakes signatures. Warnings, real movement and contact share geometry.
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
import {smallWakesBorderObstacles} from './small-wakes-body-bounds.ts';
export const smallWakesIds = [
  "candle-snail",
  "cobble-crab",
  "mourning-kettle",
] as const;
export type SmallWakesId = (typeof smallWakesIds)[number];
export type SmallLane = {
  kind: "small-lane";
  id: number;
  role: "wax" | "steam";
  sourceId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  beganAt: number;
  at: number;
  until: number;
  cancelled: boolean;
};
export type SmallProp = {
  kind: "small-prop";
  id: number;
  role: "anchor" | "valve";
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  at: number;
  until: number;
};
export type SmallVolley = {
  kind: "small-volley";
  id: number;
  sourceId: number;
  x: number;
  y: number;
  aim: number;
  arc: number;
  count: number;
  beganAt: number;
  at: number;
  until: number;
  cancelled: boolean;
};
export type SmallClamp = {
  kind: "small-clamp";
  id: number;
  sourceId: number;
  x: number;
  y: number;
  axis: number;
  halfLength: number;
  beganAt: number;
  at: number;
  closeAt: number;
  until: number;
  fromGap: number;
  toGap: number;
  cancelled: boolean;
};
export type SmallMotion = {
  kind: "small-motion";
  id: number;
  role: "glide" | "scuttle" | "waddle";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  at: number;
  until: number;
};
export type SmallWakesCue =
  SmallLane | SmallProp | SmallVolley | SmallClamp | SmallMotion;
type Context = SignatureContext;
type Attack = {
  count: number;
  speed: number;
  damage: number;
  telegraph: number;
};
const ticks = (s: number) => Math.ceil(s * HZ);
export function smallClampPanels(c: SmallClamp, now: number) {
  const t = clamp((now - c.at) / Math.max(1, c.closeAt - c.at), 0, 1),
    gap = c.fromGap + (c.toGap - c.fromGap) * t;
  const x = Math.cos(c.axis),
    y = Math.sin(c.axis);
  return [-1, 1].map((side) => ({
    x: c.x - y * gap * side,
    y: c.y + x * gap * side,
    aim: c.axis,
    halfLength: c.halfLength,
    halfWidth: 13,
  }));
}
export function smallClampContact(
  c: SmallClamp,
  p: Vec,
  old: Vec,
  now: number,
  radius = 9,
) {
  if (c.cancelled || now < c.at || now >= c.until) return false;
  const previous = smallClampPanels(c, now - 1),
    next = smallClampPanels(c, now),
    cos = Math.cos(c.axis),
    sin = Math.sin(c.axis);
  return next.some((n, i) => {
    const a = previous[i],
      from = {
        x: (old.x - a.x) * cos + (old.y - a.y) * sin,
        y: -(old.x - a.x) * sin + (old.y - a.y) * cos,
      },
      to = {
        x: (p.x - n.x) * cos + (p.y - n.y) * sin,
        y: -(p.x - n.x) * sin + (p.y - n.y) * cos,
      };
    return (
      segmentRect(
        from,
        to,
        {
          x: -n.halfLength,
          y: -n.halfWidth,
          width: n.halfLength * 2,
          height: n.halfWidth * 2,
        },
        radius,
      ) !== null
    );
  });
}
/** A swept player capsule, including both round lane ends, prevents dash tunnelling. */
export function smallLaneContact(
  l: SmallLane,
  p: Vec,
  old: Vec,
  now: number,
  radius = 9,
) {
  if (l.cancelled || now < l.at || now >= l.until) return false;
  const dx = l.x2 - l.x1,
    dy = l.y2 - l.y1,
    length = Math.hypot(dx, dy),
    r = l.width / 2 + radius;
  if (!length) return segmentCircle(old, p, { x: l.x1, y: l.y1 }, r) !== null;
  const cos = dx / length,
    sin = dy / length;
  const local = (v: Vec) => ({
    x: (v.x - l.x1) * cos + (v.y - l.y1) * sin,
    y: -(v.x - l.x1) * sin + (v.y - l.y1) * cos,
  });
  return (
    segmentRect(local(old), local(p), {
      x: 0,
      y: -r,
      width: length,
      height: r * 2,
    }) !== null ||
    segmentCircle(old, p, { x: l.x1, y: l.y1 }, r) !== null ||
    segmentCircle(old, p, { x: l.x2, y: l.y2 }, r) !== null
  );
}
export class SmallWakesDirector {
  private kind = "";
  private cycle = 0;
  private props: SmallProp[] = [];
  private lanes: (SmallLane & { damage: number })[] = [];
  private volleys: (SmallVolley & {
    damage: number;
    speed: number;
    fired: boolean;
  })[] = [];
  private clamps: (SmallClamp & { damage: number })[] = [];
  private motion?: SmallMotion;
  private contacts = new Map<string, number>();
  nextSignatureAt = 0;
  lastReleaseAt = 0;
  handles(id: string): id is SmallWakesId {
    return smallWakesIds.some((x) => x === id);
  }
  reset(kind: string, encounter = false) {
    this.kind = kind;
    this.props = [];
    this.lanes = [];
    this.volleys = [];
    this.clamps = [];
    this.motion = undefined;
    this.contacts.clear();
    this.nextSignatureAt = 0;
    this.lastReleaseAt = 0;
    if (encounter) this.cycle = 0;
  }
  weakPoints() {
    return this.props.filter((p) => p.health > 0).map((p) => ({ ...p }));
  }
  hit(id: number, amount: number) {
    const p = this.props.find((p) => p.id === id && p.health > 0);
    if (!p || !Number.isFinite(amount) || amount < 0) return 0;
    const actual = Math.min(p.health, amount);
    p.health -= actual;
    if (p.health <= 0) {
      for (const list of [this.lanes, this.volleys, this.clamps])
        for (const cue of list) if (cue.sourceId === id) cue.cancelled = true;
    }
    return actual;
  }
  private site(
    c: Context,
    wanted: Vec,
    radius: number,
    prop = false,
    edgeMargin = radius + 12,
  ) {
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    const usable = (p: Vec) =>
      !c.obstacles.some((o) => segmentRect(p, p, o, radius + 8) !== null) &&
      (!prop ||
        (distance(p, c.boss) >= c.radius + radius + 24 &&
          this.props.every((q) => distance(p, q) >= q.radius + radius + 24)));
    const bounded = (p: Vec) => ({
      x: clamp(p.x, b.x + edgeMargin, b.x + b.width - edgeMargin),
      y: clamp(p.y, b.y + edgeMargin, b.y + b.height - edgeMargin),
    });
    for (const offset of [0, 90, 180, 270])
      for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const p = bounded({
          x: wanted.x + Math.cos(angle) * offset,
          y: wanted.y + Math.sin(angle) * offset,
        });
        if (usable(p)) return p;
      }
    for (let row = 1; row < 8; row++)
      for (let col = 1; col < 10; col++) {
        const p = bounded({
          x: b.x + (b.width * col) / 10,
          y: b.y + (b.height * row) / 8,
        });
        if (usable(p)) return p;
      }
    if (prop) throw Error("No clear Small Wakes prop site");
    return bounded(c.boss);
  }
  private prop(
    c: Context,
    role: SmallProp["role"],
    wanted: Vec,
    until: number,
  ) {
    const point = this.site(c, wanted, 21, true),
      health = (role === "anchor" ? 38 : 42) * (c.brutal ? 1.5 : 1);
    const p: SmallProp = {
      kind: "small-prop",
      id: c.id(),
      role,
      ...point,
      radius: 21,
      health,
      maxHealth: health,
      at: c.tick,
      until,
    };
    this.props.push(p);
    return p;
  }
  private lane(
    c: Context,
    role: SmallLane["role"],
    from: Vec,
    to: Vec,
    at: number,
    duration: number,
    damage: number,
    sourceId = 0,
    width = 38,
  ) {
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
      pad = width / 2 + 10;
    const bounded = (p: Vec) => ({
      x: clamp(p.x, b.x + pad, b.x + b.width - pad),
      y: clamp(p.y, b.y + pad, b.y + b.height - pad),
    });
    from = bounded(from);
    to = bounded(to);
    // Mark exactly the same segment that can burn. Existing masonry stops a pour/wax wake.
    let fraction = 1;
    for (const o of c.obstacles) {
      const hit = segmentRect(from, to, o, width / 2);
      if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.002));
    }
    to = {
      x: from.x + (to.x - from.x) * fraction,
      y: from.y + (to.y - from.y) * fraction,
    };
    const cue: SmallLane & { damage: number } = {
      kind: "small-lane",
      id: c.id(),
      role,
      sourceId,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      width,
      beganAt: c.tick,
      at,
      until: at + ticks(duration),
      cancelled: fraction === 0,
      damage,
    };
    this.lanes.push(cue);
    this.lastReleaseAt = Math.max(this.lastReleaseAt, at);
    return cue;
  }
  private volley(
    c: Context,
    a: Attack,
    from: Vec,
    target: Vec,
    at: number,
    sourceId = 0,
    offset = 0,
    arc = 0.8,
  ) {
    this.volleys.push({
      kind: "small-volley",
      id: c.id(),
      sourceId,
      x: from.x,
      y: from.y,
      aim: Math.atan2(target.y - from.y, target.x - from.x) + offset,
      arc,
      count: Math.max(3, Math.min(24, a.count)),
      beganAt: c.tick,
      at,
      until: at + ticks(0.35),
      cancelled: false,
      damage: a.damage * c.damageScale,
      speed: a.speed,
      fired: false,
    });
    this.lastReleaseAt = Math.max(this.lastReleaseAt, at);
  }
  cast(c: Context, target: Vec, a: Attack) {
    if (!this.handles(c.bossId)) return false;
    if (c.tick < this.nextSignatureAt) return true;
    this.kind = c.bossId;
    this.cycle++;
    // Temporary cues expire individually, including work from the prior phase.
    const now = c.tick,
      release = now + ticks(Math.max(1.3, a.telegraph)),
      final = c.phase > 0,
      damage = a.damage * c.damageScale;
    const aim = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
      ux = Math.cos(aim),
      uy = Math.sin(aim),
      px = -uy,
      py = ux,
      b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    this.lastReleaseAt = release;
    if (c.bossId === "candle-snail") {
      const length = Math.min(430, Math.max(240, distance(c.boss, target))),
        sides = final ? [-1, 1] : [0];
      for (const side of sides) {
        const offset = side * 105,
          from = { x: c.boss.x + px * offset, y: c.boss.y + py * offset },
          to = {
            x: clamp(from.x + ux * length, b.x + 30, b.x + b.width - 30),
            y: clamp(from.y + uy * length, b.y + 30, b.y + b.height - 30),
          };
        this.lane(c, "wax", from, to, release, 1.8, damage, 0, 38);
      }
      this.volley(
        c,
        a,
        { ...c.boss },
        target,
        release + ticks(0.55),
        0,
        this.cycle % 2 ? 0.32 : -0.32,
        0.7,
      );
      if (c.brutal) {
        // Offset cross-cut leaves the central approach behind its origin open.
        const center = { x: c.boss.x + ux * 260, y: c.boss.y + uy * 260 };
        this.lane(
          c,
          "wax",
          { x: center.x - px * 180, y: center.y - py * 180 },
          { x: center.x + px * 180, y: center.y + py * 180 },
          release + ticks(2.2),
          1.1,
          damage,
          0,
          30,
        );
        this.volley(c, a, center, target, release + ticks(2.8), 0, -0.32, 0.7);
      }
      this.nextSignatureAt = now + ticks(c.brutal ? 8.8 : 7.8);
    } else if (c.bossId === "cobble-crab") {
      const axis = final ? (this.cycle % 2 ? Math.PI / 2 : 0) : 0,
        center = this.site(
          c,
          { x: target.x, y: target.y - 100 },
          32,
          false,
          220,
        );
      const anchor = this.prop(
        c,
        "anchor",
        { x: center.x - 180, y: center.y - 80 },
        release + ticks(4),
      );
      const make = (
        point: Vec,
        angle: number,
        at: number,
        sourceId: number,
      ) => {
        this.clamps.push({
          kind: "small-clamp",
          id: c.id(),
          sourceId,
          ...point,
          axis: angle,
          halfLength: final ? 105 : 90,
          beganAt: now,
          at,
          closeAt: at + ticks(0.65),
          until: at + ticks(1.15),
          fromGap: 180,
          toGap: 34,
          cancelled: false,
          damage,
        });
        this.lastReleaseAt = Math.max(this.lastReleaseAt, at);
      };
      make(center, axis, release, anchor.id);
      this.volley(
        c,
        a,
        { ...c.boss },
        target,
        release + ticks(1.4),
        0,
        0,
        0.95,
      );
      if (final)
        make(center, axis + Math.PI / 2, release + ticks(2), anchor.id);
      if (c.brutal) {
        const other = this.prop(
          c,
          "anchor",
          { x: center.x + 180, y: center.y + 80 },
          release + ticks(5),
        );
        const side = this.site(
          c,
          { x: center.x + px * 180, y: center.y + py * 180 },
          32,
          false,
          220,
        );
        make(
          side,
          axis + Math.PI / 2,
          release + ticks(final ? 3 : 1.8),
          other.id,
        );
        this.volley(
          c,
          a,
          other,
          target,
          release + ticks(2.5),
          other.id,
          0,
          0.95,
        );
      }
      this.nextSignatureAt = now + ticks(c.brutal ? 9.4 : 8.2);
    } else {
      const length = 430,
        origin = { ...c.boss },
        sides = final ? [-1, 1] : [0];
      for (const [i, side] of sides.entries()) {
        const base = {
            x: origin.x + px * side * 100,
            y: origin.y + py * side * 100,
          },
          end = {
            x: clamp(base.x + ux * length, b.x + 35, b.x + b.width - 35),
            y: clamp(base.y + uy * length, b.y + 35, b.y + b.height - 35),
          },
          at = release + ticks(i * 1.2);
        const valve = this.prop(
          c,
          "valve",
          { x: base.x + px * 140, y: base.y + py * 140 },
          at + ticks(3),
        );
        const pour = this.lane(
          c,
          "steam",
          base,
          end,
          at,
          1.65,
          damage,
          valve.id,
          44,
        );
        const drip = { x: pour.x2, y: pour.y2 };
        if (!pour.cancelled) {
          this.volley(
            c,
            a,
            drip,
            { x: drip.x + px * 250, y: drip.y + py * 250 },
            pour.until + ticks(0.7),
            valve.id,
            0,
            0.8,
          );
          this.volley(
            c,
            a,
            drip,
            { x: drip.x - px * 250, y: drip.y - py * 250 },
            pour.until + ticks(0.7),
            valve.id,
            0,
            0.8,
          );
        }
      }
      if (c.brutal) {
        const rear = {
            x: clamp(target.x + px * 160, b.x + 50, b.x + b.width - 50),
            y: clamp(target.y + py * 160, b.y + 50, b.y + b.height - 50),
          },
          end = {
            x: clamp(rear.x - ux * 320, b.x + 30, b.x + b.width - 30),
            y: clamp(rear.y - uy * 320, b.y + 30, b.y + b.height - 30),
          };
        const valve = this.prop(
          c,
          "valve",
          { x: rear.x + px * 100, y: rear.y + py * 100 },
          release + ticks(5),
        );
        this.lane(
          c,
          "steam",
          rear,
          end,
          release + ticks(3),
          1.3,
          damage,
          valve.id,
          32,
        );
      }
      this.nextSignatureAt = now + ticks(c.brutal ? 10.4 : 9.2);
    }
    return true;
  }
  step(c: Context) {
    if (!this.handles(c.bossId) || this.kind !== c.bossId) return;
    const now = c.tick;
    if (!c.paused) {
      const target = c.aimTargets?.[0] ??
          c.targets[0] ?? { x: c.boss.x, y: c.boss.y + 300 },
        final = c.phase > 0;
      const aim =
        Math.atan2(target.y - c.boss.y, target.x - c.boss.x) +
        (this.kind === "candle-snail"
          ? this.cycle % 2
            ? 1.1
            : -1.1
          : (Math.PI / 2) * (this.cycle % 2 ? 1 : -1));
      const speed =
        this.kind === "candle-snail"
          ? final
            ? 32
            : 20
          : this.kind === "cobble-crab"
            ? final
              ? 42
              : 30
            : final
              ? 24
              : 16;
      const bossObstacles = [
        ...c.obstacles,
        ...smallWakesBorderObstacles(this.kind,c.bounds??{x:0,y:0,width:1600,height:1000},c.radius),
        ...this.props
          .filter((p) => p.health > 0)
          .map((p) => ({
            x: p.x - p.radius - 8,
            y: p.y - p.radius - 8,
            width: p.radius * 2 + 16,
            height: p.radius * 2 + 16,
          })),
      ];
      const point = moveBody(
        c.boss,
        { x: Math.cos(aim) * speed * DT, y: Math.sin(aim) * speed * DT },
        c.radius,
        bossObstacles,
      );
      if (distance(point, c.boss) > 0.01) {
        this.motion = {
          kind: "small-motion",
          id: -101,
          role:
            this.kind === "candle-snail"
              ? "glide"
              : this.kind === "cobble-crab"
                ? "scuttle"
                : "waddle",
          x1: c.boss.x,
          y1: c.boss.y,
          x2: point.x,
          y2: point.y,
          at: now,
          until: now + 2,
        };
        c.boss.x = point.x;
        c.boss.y = point.y;
      }
    }
    for (const volley of this.volleys)
      if (!volley.cancelled && !volley.fired && now >= volley.at) {
        volley.fired = true;
        for (let i = 0; i < volley.count; i++) {
          const angle =
            volley.aim + (i / (volley.count - 1) - 0.5) * volley.arc;
          c.emitHostile?.(volley, angle, volley.speed, volley.damage, 4);
        }
      }
    for (const p of c.targets) {
      if (now < (this.contacts.get(p.id) ?? 0)) continue;
      const from = { x: p.oldX, y: p.oldY };
      const lane = this.lanes.find((l) => smallLaneContact(l, p, from, now));
      const clampHit = this.clamps.find((q) =>
        smallClampContact(q, p, from, now),
      );
      if (lane || clampHit) {
        c.damage(p.id, (lane ?? clampHit)!.damage);
        this.contacts.set(p.id, now + ticks(0.5));
      }
    }
    this.props = this.props.filter((p) => now < p.until);
    this.lanes = this.lanes.filter((l) => now < l.until);
    this.volleys = this.volleys.filter((v) => now < v.until);
    this.clamps = this.clamps.filter((q) => now < q.until);
    if (this.motion && now >= this.motion.until) this.motion = undefined;
  }
  cues(): SmallWakesCue[] {
    return [
      ...this.props.map((p) => ({ ...p })),
      ...this.lanes.map(({ damage, ...l }) => ({ ...l })),
      ...this.volleys.map(({ damage, speed, fired, ...v }) => ({ ...v })),
      ...this.clamps.map(({ damage, ...c }) => ({ ...c })),
      ...(this.motion ? [{ ...this.motion }] : []),
    ];
  }
}
