import { DT, HZ, type Vec } from './protocol.ts';
import { clamp, distance, moveBody, segmentCircle, type Rect } from './geometry.ts';
import { serviceBeamContact, type ServiceAttack } from './service-director.ts';
import type { SignatureContext } from './boss-director.ts';
export const raidBossIds = [
  'chain-colossus',
  'ossuary-leviathan',
  'bell-triplets',
  'quarantine-heart',
  'crown-procession',
  'city-eater',
  'last-breath-saint',
] as const;
type Life = { id: number; at: number; until: number };
export type RaidProp = Life &
  Vec & {
    kind: 'raid-prop';
    role: 'pylon' | 'rib' | 'keeper' | 'core' | 'attendant' | 'wall';
    radius: number;
    health: number;
    maxHealth: number;
    index: number;
    active: boolean;
    interrupt: number;
    maximumInterrupt: number;
    oldX: number;
    oldY: number;
  };
type Lane = Life & {
  kind: 'raid-lane';
  style: 'pull' | 'body' | 'beam' | 'hose' | 'bite';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  damage: number;
  forceX: number;
  forceY: number;
  dependencies: number[];
  disabled: boolean;
  index: number;
};
type Pad = Life &
  Vec & {
    kind: 'raid-pad';
    style: 'valve' | 'shelter';
    radius: number;
    progress: number;
    disabled: boolean;
    index: number;
  };
type State = Life &
  Vec & {
    kind: 'raid-state';
    style:
      'colossus' | 'leviathan' | 'triplets' | 'heart' | 'procession' | 'bite' | 'breath' | 'exhale';
    progress: number;
    index: number;
    emitted: boolean;
    endX: number;
    endY: number;
  };
export type RaidCue = RaidProp | Lane | Pad | State;
const ticks = (s: number) => Math.ceil(s * HZ),
  forever = 1e12;
type Context = SignatureContext & { hurtBoss?(amount: number, sourceId?: string): void };
export function raidMovement(cues: readonly { kind: string }[], p: Vec, now: number) {
  let x = 0,
    y = 0;
  const shapes = cues as RaidCue[];
  for (const c of shapes) {
    if (now < c.at || now >= c.until) continue;
    if (
      c.kind === 'raid-lane' &&
      c.style === 'pull' &&
      !c.disabled &&
      serviceBeamContact(p, p, c, 0)
    ) {
      x += c.forceX;
      y += c.forceY;
    }
    if (c.kind === 'raid-state' && c.style === 'breath') {
      if (
        shapes.some(
          (s) =>
            s.kind === 'raid-pad' &&
            s.style === 'shelter' &&
            now >= s.at &&
            now < s.until &&
            distance(p, s) + 9 <= s.radius,
        )
      )
        continue;
      const d = distance(c, p);
      if (d > 1) {
        x += ((c.x - p.x) / d) * 45;
        y += ((c.y - p.y) / d) * 45;
      }
    }
  }
  const length = Math.hypot(x, y);
  if (length > 45) {
    x *= 45 / length;
    y *= 45 / length;
  }
  return { x, y };
}
export class RaidDirector {
  private kind = '';
  private shapes: RaidCue[] = [];
  private castIndex = 0;
  private contacts = new Map<string, number>();
  private once = new Set<string>();
  private openingUntil = 0;
  private originalBoss: Vec = { x: 800, y: 250 };
  nextSignatureAt = 0;
  handles(kind: string) {
    return raidBossIds.some((id) => id === kind);
  }
  reset(kind: string, encounter = false) {
    const keep = kind === this.kind && kind === 'bell-triplets' && !encounter;
    this.shapes = keep
      ? this.shapes.filter((c) => c.kind === 'raid-prop' && c.role === 'keeper')
      : [];
    if (kind !== this.kind || encounter) this.castIndex = 0;
    this.kind = kind;
    this.contacts.clear();
    this.once.clear();
    this.openingUntil = 0;
    this.nextSignatureAt = 0;
  }
  cues() {
    return this.shapes;
  }
  independentBodies() {
    return this.kind === 'bell-triplets';
  }
  weakPoints() {
    return this.shapes.filter(
      (c): c is RaidProp =>
        c.kind === 'raid-prop' && c.health > 0 && (c.role !== 'rib' || c.active),
    );
  }
  transfer(id: number) {
    const p = this.weakPoints().find((p) => p.id === id);
    return p?.role === 'rib' ? 1.5 : p?.role === 'keeper' ? 1 : p?.role === 'core' ? 1.5 : 0;
  }
  coreContact(from: Vec, to: Vec, radius: number) {
    return this.weakPoints().some(
      (p) =>
        this.transfer(p.id) > 0 &&
        segmentCircle(
          { x: from.x - p.oldX, y: from.y - p.oldY },
          { x: to.x - p.x, y: to.y - p.y },
          { x: 0, y: 0 },
          p.radius + radius,
        ) !== null,
    );
  }
  bodyMultiplier(now: number) {
    if (now < this.openingUntil) return 1.5;
    if (this.kind === 'ossuary-leviathan') return 0.55;
    if (this.kind === 'crown-procession') return 0.55;
    return 1;
  }
  hit(id: number, amount: number, now: number) {
    const p = this.weakPoints().find((p) => p.id === id);
    if (!p) return 0;
    const actual = Math.min(p.health, Math.max(0, amount));
    p.health -= actual;
    if (p.role === 'keeper' && p.active) {
      p.interrupt -= actual;
      if (p.interrupt <= 0) {
        p.active = false;
        for (const cue of this.shapes)
          if (cue.kind === 'raid-lane' && cue.dependencies.includes(id)) cue.disabled = true;
      }
    }
    if (p.health <= 0) {
      for (const cue of this.shapes)
        if (cue.kind === 'raid-lane' && cue.dependencies.includes(id)) cue.disabled = true;
      if (p.role === 'pylon') {
        this.openingUntil = Math.max(this.openingUntil, now + ticks(4));
        for (const cue of this.shapes)
          if (cue.kind === 'raid-lane' && cue.style === 'pull') cue.disabled = true;
      }
      if (p.role === 'attendant') this.openingUntil = Math.max(this.openingUntil, now + ticks(5));
      if (p.role === 'wall') {
        this.openingUntil = Math.max(this.openingUntil, now + ticks(4));
        const core = this.shapes.find(
          (c): c is RaidProp => c.kind === 'raid-prop' && c.role === 'core',
        );
        if (core) {
          core.active = true;
          core.health = core.maxHealth;
        }
      }
    }
    return actual;
  }
  private safe(c: Context, p: Vec, r = 45) {
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    const inside = (q: Vec) =>
      !c.obstacles.some(
        (o) =>
          q.x > o.x - r && q.x < o.x + o.width + r && q.y > o.y - r && q.y < o.y + o.height + r,
      );
    const clampPoint = (q: Vec) => ({
      x: clamp(q.x, b.x + r, b.x + b.width - r),
      y: clamp(q.y, b.y + r, b.y + b.height - r),
    });
    const start = clampPoint(p);
    if (inside(start)) return start;
    for (let d = 50; d <= 500; d += 50)
      for (let i = 0; i < 16; i++) {
        const q = clampPoint({
          x: start.x + Math.cos((i * Math.PI) / 8) * d,
          y: start.y + Math.sin((i * Math.PI) / 8) * d,
        });
        if (inside(q)) return q;
      }
    return start;
  }
  private prop(
    c: Context,
    role: RaidProp['role'],
    point: Vec,
    health: number,
    index: number,
    at: number,
    until: number,
    radius = 26,
  ) {
    const scale = (c.brutal ? 2 : 1) * (1 + 0.2 * Math.max(0, c.targets.length - 1));
    const p: RaidProp = {
      kind: 'raid-prop',
      role,
      ...this.safe(c, point, radius + 12),
      oldX: point.x,
      oldY: point.y,
      id: c.id(),
      health: health * scale,
      maxHealth: health * scale,
      index,
      active: true,
      interrupt: 95 * scale,
      maximumInterrupt: 95 * scale,
      at,
      until,
      radius,
    };
    p.oldX = p.x;
    p.oldY = p.y;
    this.shapes.push(p);
    return p;
  }
  private lane(
    c: Context,
    style: Lane['style'],
    from: Vec,
    to: Vec,
    width: number,
    damage: number,
    at: number,
    until: number,
    index = 0,
    dependencies: number[] = [],
  ) {
    const lane: Lane = {
      kind: 'raid-lane',
      id: c.id(),
      style,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      width,
      damage,
      forceX: 0,
      forceY: 0,
      disabled: false,
      at,
      until,
      index,
      dependencies,
    };
    this.shapes.push(lane);
    return lane;
  }
  private pad(
    c: Context,
    style: Pad['style'],
    p: Vec,
    radius: number,
    index: number,
    at: number,
    until: number,
  ) {
    const s: Pad = {
      kind: 'raid-pad',
      id: c.id(),
      style,
      ...this.safe(c, p, radius / 2),
      radius,
      index,
      at,
      until,
      progress: 0,
      disabled: false,
    };
    this.shapes.push(s);
    return s;
  }
  private state(c: Context, style: State['style'], at: number, until: number, index = 0) {
    const s: State = {
      kind: 'raid-state',
      id: c.id(),
      style,
      x: c.boss.x,
      y: c.boss.y,
      at,
      until,
      index,
      progress: 0,
      emitted: false,
      endX: c.boss.x,
      endY: c.boss.y,
    };
    this.shapes.push(s);
    return s;
  }
  private touch(c: Context, cue: Life, p: { id: string }, damage: number) {
    const key = cue.id + ':' + p.id;
    if (c.tick < (this.contacts.get(key) ?? 0)) return;
    this.contacts.set(key, c.tick + ticks(0.5));
    c.damage(p.id, damage * c.damageScale);
  }
  prepare(c: Context) {
    if (
      this.kind === 'bell-triplets' &&
      !this.shapes.some((p) => p.kind === 'raid-prop' && p.role === 'keeper')
    )
      for (let i = 0; i < 3; i++)
        this.prop(
          c,
          'keeper',
          { x: c.boss.x + (i - 1) * 125, y: c.boss.y },
          c.bossMaximumHealth ?? 3000,
          i,
          c.tick,
          forever,
          30,
        );
  }
  cast(c: Context, target: Vec, attack: ServiceAttack) {
    const kind = String(c.bossId);
    if (!this.handles(kind)) return false;
    this.prepare(c);
    const n = this.castIndex++,
      now = c.tick,
      b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    const at =
      now +
      ticks(
        Math.max(
          c.brutal ? 0.85 : 0,
          kind === 'city-eater'
            ? 1.8
            : kind === 'last-breath-saint'
              ? 1.8
              : kind === 'crown-procession'
                ? 1.7
                : kind === 'bell-triplets'
                  ? 1.5
                  : 1.6,
        ),
      );
    const cycle =
      kind === 'crown-procession' || kind === 'last-breath-saint'
        ? 14
        : kind === 'city-eater'
          ? 13
          : kind === 'bell-triplets'
            ? 11
            : 12;
    this.nextSignatureAt = now + ticks(cycle * Math.max(0.8, 1 - c.phase * 0.07));
    const point = (x: number, y: number) =>
      this.safe(c, { x: b.x + x * b.width, y: b.y + y * b.height });
    this.originalBoss = { x: c.boss.x, y: c.boss.y };
    if (kind === 'chain-colossus') {
      for (let i = 0; i < 3; i++)
        this.prop(c, 'pylon', point(0.25 + 0.25 * i, 0.56), 110, i, now, at + ticks(3));
      const pull = this.lane(
        c,
        'pull',
        { x: b.x + (n % 2 ? b.width * 0.65 : b.width * 0.35), y: b.y + 190 },
        { x: b.x + (n % 2 ? b.width * 0.65 : b.width * 0.35), y: b.y + b.height - 190 },
        b.width * 0.32,
        0,
        at,
        at + ticks(3),
      );
      pull.forceX = n % 2 ? -45 : 45;
      this.state(c, 'colossus', at, at + ticks(7));
    } else if (kind === 'ossuary-leviathan') {
      const state = this.state(c, 'leviathan', at, at + ticks(9));
      state.index = n;
      for (let i = 0; i < 3; i++) {
        const rib = this.prop(
          c,
          'rib',
          { x: c.boss.x + (i - 1) * 80, y: c.boss.y },
          c.bossMaximumHealth ?? 3000,
          i,
          now,
          state.until,
          28,
        );
        rib.active = i === 0;
      }
      this.lane(
        c,
        'body',
        { x: c.boss.x - 120, y: c.boss.y },
        { x: c.boss.x + 120, y: c.boss.y },
        75,
        18,
        at,
        state.until,
      );
    } else if (kind === 'bell-triplets') {
      const active = n % 3,
        keepers = this.weakPoints().filter((p) => p.role === 'keeper');
      for (const p of keepers) {
        p.active = p.index === active;
        p.interrupt = p.maximumInterrupt;
      }
      const who = keepers.find((p) => p.index === active) ?? keepers[0];
      if (who) {
        const gap = this.safe(c, target, 110);
        gap.x = clamp(gap.x, b.x + 160, b.x + b.width - 160);
        const y = gap.y;
        for (const [a, z] of [
          [b.x + 60, gap.x - 104.5],
          [gap.x + 104.5, b.x + b.width - 60],
        ])
          if (z > a)
            this.lane(
              c,
              'beam',
              { x: a, y },
              { x: z, y },
              24,
              17,
              at + ticks(0.65),
              at + ticks(1.65),
              active,
              [who.id],
            );
      }
      this.state(c, 'triplets', now, at + ticks(2), active);
    } else if (kind === 'quarantine-heart') {
      const until = at + ticks(6);
      this.state(c, 'heart', at, until);
      const endpoints = [point(0.18, 0.3), point(0.82, 0.3), point(0.18, 0.75), point(0.82, 0.75)];
      endpoints.forEach((end, i) => {
        this.lane(c, 'hose', c.boss, end, 28, 12, at, until, i);
        this.pad(c, 'valve', point(0.2 + 0.2 * i, 0.84), 52, i, now, until);
      });
      // The four narrow streams leave broad ground between them.
    } else if (kind === 'crown-procession') {
      const until = at + ticks(12),
        s = this.state(c, 'procession', at, until, n);
      const dest = point(n % 2 ? 0.3 : 0.7, 0.56);
      s.endX = dest.x;
      s.endY = dest.y;
      for (let i = 0; i < 4; i++)
        this.prop(
          c,
          'attendant',
          { x: c.boss.x + (i % 2 ? 85 : -85), y: c.boss.y + (i < 2 ? -55 : 55) },
          90,
          i,
          now,
          until,
          22,
        );
    } else if (kind === 'city-eater') {
      const safeCenter = b.x + b.width * (n % 3 === 0 ? 0.5 : n % 3 === 1 ? 0.25 : 0.75),
        gapLeft = clamp(safeCenter - 120, b.x + 20, b.x + b.width - 260),
        gapRight = gapLeft + 240;
      this.lane(
        c,
        'bite',
        { x: (b.x + gapLeft) / 2, y: b.y + 70 },
        { x: (b.x + gapLeft) / 2, y: b.y + b.height - 70 },
        gapLeft - b.x,
        22,
        at,
        at + ticks(0.6),
        0,
      );
      this.lane(
        c,
        'bite',
        { x: (gapRight + b.x + b.width) / 2, y: b.y + 70 },
        { x: (gapRight + b.x + b.width) / 2, y: b.y + b.height - 70 },
        b.x + b.width - gapRight,
        22,
        at,
        at + ticks(0.6),
        1,
      );
      for (let i = 0; i < 2; i++)
        this.prop(c, 'wall', point(0.3 + 0.4 * i, 0.5), 120, i, now, at + ticks(4.6), 38);
      const core = this.prop(
        c,
        'core',
        { x: c.boss.x, y: c.boss.y + 55 },
        c.bossMaximumHealth ?? 3000,
        0,
        now,
        at + ticks(4.6),
        28,
      );
      core.health = 0;
      core.active = false;
      this.state(c, 'bite', at, at + ticks(4.6));
    } else if (kind === 'last-breath-saint') {
      const inhale = this.state(c, 'breath', at, at + ticks(3));
      for (let i = 0; i < 2; i++)
        this.pad(c, 'shelter', point(0.3 + 0.4 * i, 0.66), 100, i, now, at + ticks(7));
      for (let i = 0; i < 3; i++)
        this.state(
          c,
          'exhale',
          inhale.until + ticks(i * 1.2),
          inhale.until + ticks(i * 1.2 + 1),
          i,
        );
    }
    this.nextSignatureAt = Math.max(
      this.nextSignatureAt,
      ...this.shapes.filter((s) => s.until < forever).map((s) => s.until + ticks(0.5)),
    );
    return true;
  }
  step(c: Context) {
    this.prepare(c);
    const now = c.tick;
    for (const cue of this.shapes)
      if (cue.kind === 'raid-prop') {
        cue.oldX = cue.x;
        cue.oldY = cue.y;
      }
    for (const cue of this.shapes) {
      if (
        cue.kind === 'raid-state' &&
        cue.style === 'leviathan' &&
        now >= cue.at &&
        now < cue.until
      ) {
        const angle = (now - cue.at) * DT * 0.38 + cue.index * Math.PI;
        const delta = { x: Math.cos(angle) * 70 * DT, y: Math.sin(angle) * 70 * DT };
        // Check the entire horizontal body, including both ends, against cover.
        for (const offset of [-120, 0, 120]) {
          const base = { x: c.boss.x + offset, y: c.boss.y };
          const probe = moveBody(base, delta, 38, c.obstacles);
          delta.x =
            Math.sign(delta.x) *
            Math.min(Math.abs(delta.x), Math.max(0, (probe.x - base.x) * Math.sign(delta.x)));
          delta.y =
            Math.sign(delta.y) *
            Math.min(Math.abs(delta.y), Math.max(0, (probe.y - base.y) * Math.sign(delta.y)));
        }
        const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
        c.boss.x = clamp(c.boss.x + delta.x, b.x + 158, b.x + b.width - 158);
        c.boss.y = clamp(c.boss.y + delta.y, b.y + 38, b.y + b.height - 38);
        const active = Math.min(2, Math.floor((now - cue.at) / ticks(3)));
        for (const p of this.shapes)
          if (p.kind === 'raid-prop' && p.role === 'rib') {
            p.x = c.boss.x + (p.index - 1) * 80;
            p.y = c.boss.y;
            p.active = p.index === active;
          }
        for (const line of this.shapes)
          if (line.kind === 'raid-lane' && line.style === 'body') {
            line.x1 = c.boss.x - 120;
            line.x2 = c.boss.x + 120;
            line.y1 = line.y2 = c.boss.y;
          }
      }
      if (
        cue.kind === 'raid-state' &&
        cue.style === 'procession' &&
        now >= cue.at &&
        now < cue.until
      ) {
        const remaining = cue.until - now;
        cue.progress = remaining <= ticks(4) ? 1 : 0;
        if (remaining <= ticks(4)) this.openingUntil = Math.max(this.openingUntil, now + 1);
        if (now >= this.openingUntil && remaining > ticks(4)) {
          const dx = cue.endX - c.boss.x,
            dy = cue.endY - c.boss.y,
            d = Math.hypot(dx, dy);
          if (d > 2) {
            const v = moveBody(
              c.boss,
              { x: (dx / d) * 65 * DT, y: (dy / d) * 65 * DT },
              58,
              c.obstacles,
            );
            c.boss.x = v.x;
            c.boss.y = v.y;
          }
        }
        for (const p of this.shapes)
          if (p.kind === 'raid-prop' && p.role === 'attendant') {
            p.x = c.boss.x + (p.index % 2 ? 85 : -85);
            p.y = c.boss.y + (p.index < 2 ? -55 : 55);
          }
      }
      if (cue.kind === 'raid-state' && cue.style === 'exhale' && now >= cue.at && !cue.emitted) {
        cue.emitted = true;
        for (let i = 0; i < 16; i++)
          c.emitHostile?.(
            c.boss,
            (i * Math.PI * 2) / 16 + cue.index * 0.11,
            90,
            13 * c.damageScale,
            5,
          );
      }
      if (cue.kind === 'raid-pad' && cue.style === 'valve' && !cue.disabled && now < cue.until) {
        const user = c.targets.find(
          (p) => (c.interactors ?? []).includes(p.id) && distance(p, cue) + 9 <= cue.radius,
        );
        cue.progress = user ? cue.progress + 1 : 0;
        if (cue.progress >= ticks(1.5)) {
          cue.disabled = true;
          this.openingUntil = Math.max(this.openingUntil, now + ticks(4));
          for (const line of this.shapes)
            if (line.kind === 'raid-lane' && line.style === 'hose' && line.index === cue.index)
              line.disabled = true;
          c.hurtBoss?.(120, user?.id);
        }
      }
      if (
        cue.kind === 'raid-lane' &&
        !cue.disabled &&
        now >= cue.at &&
        now < cue.until &&
        cue.damage > 0
      )
        for (const p of c.targets)
          if (serviceBeamContact({ x: p.oldX, y: p.oldY }, p, cue))
            this.touch(c, cue, p, cue.damage);
    }
    this.shapes = this.shapes.filter((c) => now < c.until);
    if (now % HZ === 0) {
      const live = new Set(this.shapes.map((c) => String(c.id)));
      for (const key of this.contacts.keys())
        if (!live.has(key.split(':')[0])) this.contacts.delete(key);
    }
  }
}
