import catalog from '../../content/catalog.json' with { type: 'json' };
import { DT, HZ, type Vec } from './protocol.ts';
import { clamp, distance, moveBody, segmentCircle, segmentRect, type Rect } from './geometry.ts';
import { serviceBeamContact, serviceRingContact, type ServiceAttack } from './service-director.ts';
import type { SignatureContext } from './boss-director.ts';

export const districtBossIds = [
  'pallbearer',
  'cinder-foreman',
  'canal-diver',
  'clockmender',
  'wire-seamstress',
  'gravedigger',
  'ink-notary',
  'spore-beekeeper',
  'ice-custodian',
  'bridge-ferryman',
  'porcelain-mourner',
  'boiler-tender',
  'mirror-undertaker',
  'chalk-magistrate',
  'wire-harpist',
  'crow-shepherd',
  'ledger-leech',
  'engine',
  'regent',
  'salt-patriarch',
] as const;
type Life = { id: number; at: number; until: number };
export type DistrictProp = Life &
  Vec & {
    kind: 'district-prop';
    role: 'coffin' | 'ridge' | 'anchor' | 'drone' | 'fragment' | 'core';
    radius: number;
    width: number;
    height: number;
    health: number;
    maxHealth: number;
    angle: number;
    speed: number;
    index: number;
    oldX: number;
    oldY: number;
  };
export type DistrictLine = Life & {
  kind: 'district-line';
  style: 'wire' | 'ink' | 'harp' | 'chalk' | 'salt';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  damage: number;
  dependencies: number[];
  disabled: boolean;
  index: number;
};
export type DistrictArea = Life &
  Vec & {
    kind: 'district-area';
    style: 'vent' | 'puddle' | 'ice' | 'pit' | 'water' | 'cleanse' | 'valve' | 'seal' | 'ghost';
    width: number;
    height: number;
    radius: number;
    damage: number;
    slow: number;
    index: number;
    targetId: string;
    progress: number;
    disabled: boolean;
  };
type Ring = Life &
  Vec & {
    kind: 'district-ring';
    style: 'swarm' | 'pressure';
    radius: number;
    oldRadius: number;
    width: number;
    speed: number;
    damage: number;
    gaps: { angle: number; width: number; dependency: number }[];
  };
type State = Life &
  Vec & {
    kind: 'district-state';
    style: 'armor' | 'dive' | 'warp' | 'clock' | 'salt';
    progress: number;
    endX: number;
    endY: number;
    targetId: string;
    index: number;
  };
type Bird = Life &
  Vec & {
    kind: 'district-bird';
    oldX: number;
    oldY: number;
    endX: number;
    endY: number;
    angle: number;
    speed: number;
    damage: number;
    radius: number;
    trailWidth: number;
  };
export type DistrictCue = DistrictProp | DistrictLine | DistrictArea | Ring | State | Bird;
export type TerrainStatus = { iceX: number; iceY: number; cleansedSeals: number[] };
export const freshTerrain = (): TerrainStatus => ({ iceX: 0, iceY: 0, cleansedSeals: [] });
const ticks = (s: number) => Math.ceil(s * HZ),
  forever = 1e12;
type Context = SignatureContext & {
  emitControlled?(
    p: Vec,
    angle: number,
    speed: number,
    damage: number,
    radius: number,
  ): number | undefined;
  controlShot?(id: number, vx: number, vy: number): boolean;
  removeHostile?(id: number): void;
  relocateBoss?(point: Vec): void;
};
const rect = (p: Vec & { width: number; height: number }): Rect => ({
  x: p.x - p.width / 2,
  y: p.y - p.height / 2,
  width: p.width,
  height: p.height,
});
const inside = (p: Vec, area: DistrictArea, body = 0) =>
  area.radius > 0
    ? distance(p, area) <= Math.max(0, area.radius - body)
    : p.x >= area.x - area.width / 2 + body &&
      p.x <= area.x + area.width / 2 - body &&
      p.y >= area.y - area.height / 2 + body &&
      p.y <= area.y + area.height / 2 - body;
const delta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Swept moving ring with several independent removable safe wedges. */
export function districtRingContact(from: Vec, to: Vec, ring: Ring, body = 9) {
  const steps = Math.max(
    1,
    Math.ceil((distance(from, to) + Math.abs(ring.radius - ring.oldRadius)) / 2),
  );
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      x = from.x + (to.x - from.x) * t - ring.x,
      y = from.y + (to.y - from.y) * t - ring.y;
    const d = Math.hypot(x, y),
      r = ring.oldRadius + (ring.radius - ring.oldRadius) * t;
    if (Math.abs(d - r) > ring.width / 2 + body + 2) continue;
    const edge = Math.asin(Math.min(1, (body + 2) / Math.max(d, body + 2)));
    if (ring.gaps.some((g) => Math.abs(delta(Math.atan2(y, x), g.angle)) < g.width / 2 - edge))
      continue;
    return true;
  }
  return false;
}

/** Shared terrain integration. Dodge and dry ground clear ice drift immediately. */
export function districtMovement(
  cues: readonly { kind: string }[],
  p: Vec,
  id: string,
  now: number,
  status: TerrainStatus,
  input: Vec,
  dodging: boolean,
) {
  const live = (cues as DistrictCue[]).filter((c) => now >= c.at && now < c.until);
  const seals = live.filter(
    (c): c is DistrictArea =>
      c.kind === 'district-area' && c.style === 'seal' && c.targetId === id && !c.disabled,
  );
  status.cleansedSeals = status.cleansedSeals.filter((key) => seals.some((s) => s.id === key));
  const cleansed = live.some(
    (c) => c.kind === 'district-area' && c.style === 'cleanse' && inside(p, c, 9),
  );
  if (cleansed)
    for (const seal of seals)
      if (!status.cleansedSeals.includes(seal.id)) status.cleansedSeals.push(seal.id);
  let multiplier = 1;
  if (seals.some((s) => !status.cleansedSeals.includes(s.id))) multiplier = 0.8;
  if (
    live.some(
      (c) => c.kind === 'district-area' && c.style === 'water' && !c.disabled && inside(p, c),
    )
  )
    multiplier = Math.min(multiplier, 0.8);
  const icy = live.some(
    (c) => c.kind === 'district-area' && c.style === 'ice' && !c.disabled && inside(p, c),
  );
  if (icy && !dodging) {
    const approach = (n: number, target: number) => n + clamp(target - n, -80 * DT, 80 * DT);
    status.iceX = approach(status.iceX, input.x * 45);
    status.iceY = approach(status.iceY, input.y * 45);
    const length = Math.hypot(status.iceX, status.iceY);
    if (length > 45) {
      status.iceX *= 45 / length;
      status.iceY *= 45 / length;
    }
  } else {
    status.iceX = 0;
    status.iceY = 0;
  }
  return { x: status.iceX, y: status.iceY, multiplier };
}

export class DistrictDirector {
  private kind = '';
  private castIndex = 0;
  private shapes: DistrictCue[] = [];
  private contacts = new Map<string, number>();
  private once = new Set<string>();
  private waterShiftAt = 0;
  private waterIndex = 0;
  private swarmShots: { id: number; ring: number; drone: number }[] = [];
  private clockShots: {
    id: number;
    cueId: number;
    vx: number;
    vy: number;
    stop: number;
    restart: number;
    until: number;
  }[] = [];
  nextSignatureAt = 0;
  handles(kind: string) {
    return districtBossIds.some((id) => id === kind);
  }
  reset(kind: string, encounter = false) {
    // A cancelled phase must remove its stopped shots rather than leaving permanent mines.
    this.shapes =
      kind === this.kind && kind === 'pallbearer' && !encounter
        ? this.shapes.filter((c) => c.kind === 'district-prop' && c.role === 'coffin')
        : [];
    this.nextSignatureAt = 0;
    if (kind !== this.kind || encounter) {
      this.waterShiftAt = 0;
      this.waterIndex = 0;
    }
    this.contacts.clear();
    this.once.clear();
    if (kind !== this.kind || encounter) this.castIndex = 0;
    this.kind = kind;
  }
  cues() {
    return this.shapes;
  }
  weakPoints() {
    return this.shapes.filter((c): c is DistrictProp => c.kind === 'district-prop' && c.health > 0);
  }
  weakContact(from: Vec, to: Vec, p: DistrictProp, radius: number) {
    const a = { x: from.x - p.oldX, y: from.y - p.oldY },
      b = { x: to.x - p.x, y: to.y - p.y };
    if (p.width > 0)
      return (
        segmentRect(a, b, {
          x: -p.width / 2 - radius,
          y: -p.height / 2 - radius,
          width: p.width + 2 * radius,
          height: p.height + 2 * radius,
        })?.t ?? null
      );
    return segmentCircle(a, b, { x: 0, y: 0 }, p.radius + radius);
  }
  projectileCover() {
    return this.weakPoints()
      .filter((p) => p.role === 'coffin' || p.role === 'ridge' || p.role === 'fragment')
      .map(rect);
  }
  transfersDamage(id: number) {
    return this.weakPoints().some((p) => p.id === id && p.role === 'core');
  }
  hit(id: number, amount: number, now: number) {
    const p = this.weakPoints().find((p) => p.id === id);
    if (!p) return 0;
    const actual = Math.min(p.health, Math.max(0, amount));
    p.health -= actual;
    if (p.health <= 0) {
      for (const cue of this.shapes)
        if (cue.kind === 'district-line' && cue.dependencies.includes(id)) cue.disabled = true;
      if (p.role === 'drone')
        for (const cue of this.shapes)
          if (cue.kind === 'district-ring' && cue.style === 'swarm')
            cue.gaps.push({ angle: p.angle, width: (Math.PI * 2) / 3, dependency: id });
      if (p.role === 'ridge') p.until = now;
    }
    return actual;
  }
  bodyMultiplier(source: Vec | undefined, boss: Vec, now: number) {
    if (
      this.shapes.some(
        (c) => c.kind === 'district-state' && c.style === 'dive' && now >= c.at && now < c.until,
      )
    )
      return 0;
    if (
      this.kind === 'engine' &&
      this.shapes.some(
        (c) => c.kind === 'district-state' && c.style === 'armor' && now >= c.at && now < c.until,
      )
    )
      return 0.4;
    const coffin = this.weakPoints().find((p) => p.role === 'coffin');
    if (this.kind === 'pallbearer' && coffin && source) {
      const angle = Math.atan2(source.y - boss.y, source.x - boss.x);
      if (Math.abs(delta(angle, coffin.angle)) < Math.PI / 2) return 0.5;
    }
    return 1;
  }
  private safe(c: Context, p: Vec, margin = 40): Vec {
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    const clamped = {
      x: clamp(p.x, b.x + margin, b.x + b.width - margin),
      y: clamp(p.y, b.y + margin, b.y + b.height - margin),
    };
    const free = (v: Vec) =>
      !c.obstacles.some(
        (r) =>
          v.x > r.x - margin &&
          v.x < r.x + r.width + margin &&
          v.y > r.y - margin &&
          v.y < r.y + r.height + margin,
      );
    if (free(clamped)) return clamped;
    for (let radius = 50; radius <= 600; radius += 50)
      for (let i = 0; i < 16; i++) {
        const v = {
          x: clamp(
            clamped.x + Math.cos((i * Math.PI) / 8) * radius,
            b.x + margin,
            b.x + b.width - margin,
          ),
          y: clamp(
            clamped.y + Math.sin((i * Math.PI) / 8) * radius,
            b.y + margin,
            b.y + b.height - margin,
          ),
        };
        if (free(v)) return v;
      }
    return { ...c.boss };
  }
  private prop(
    c: Context,
    role: DistrictProp['role'],
    p: Vec,
    health: number,
    at: number,
    until: number,
    index = 0,
    width = 0,
    height = 0,
    radius = 24,
  ) {
    const result: DistrictProp = {
      kind: 'district-prop',
      id: c.id(),
      role,
      ...this.safe(c, p, Math.max(radius, width / 2, height / 2) + 12),
      oldX: 0,
      oldY: 0,
      health: health * (c.brutal ? 2 : 1),
      maxHealth: health * (c.brutal ? 2 : 1),
      radius,
      width,
      height,
      at,
      until,
      angle: 0,
      speed: 0,
      index,
    };
    result.oldX = result.x;
    result.oldY = result.y;
    this.shapes.push(result);
    return result;
  }
  private area(
    c: Context,
    style: DistrictArea['style'],
    p: Vec,
    at: number,
    until: number,
    radius = 0,
    width = 0,
    height = 0,
    index = 0,
  ) {
    const a: DistrictArea = {
      kind: 'district-area',
      id: c.id(),
      style,
      x: p.x,
      y: p.y,
      at,
      until,
      radius,
      width,
      height,
      index,
      targetId: '',
      progress: 0,
      disabled: false,
      damage: 0,
      slow: 0,
    };
    this.shapes.push(a);
    return a;
  }
  private line(
    c: Context,
    style: DistrictLine['style'],
    from: Vec,
    to: Vec,
    at: number,
    until: number,
    width: number,
    damage: number,
    index = 0,
    dependencies: number[] = [],
  ) {
    const l: DistrictLine = {
      kind: 'district-line',
      style,
      id: c.id(),
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      at,
      until,
      width,
      damage,
      index,
      dependencies,
      disabled: false,
    };
    this.shapes.push(l);
    return l;
  }
  private state(c: Context, style: State['style'], at: number, until: number, p = c.boss) {
    const s: State = {
      kind: 'district-state',
      id: c.id(),
      style,
      x: p.x,
      y: p.y,
      at,
      until,
      progress: 0,
      endX: p.x,
      endY: p.y,
      index: 0,
      targetId: '',
    };
    this.shapes.push(s);
    return s;
  }
  private touch(c: Context, cue: Life, target: { id: string }, damage: number, rate = 0.5) {
    const key = cue.id + ':' + target.id;
    if (c.tick < (this.contacts.get(key) ?? 0)) return;
    this.contacts.set(key, c.tick + ticks(rate));
    c.damage(target.id, damage * c.damageScale);
  }
  private emit(c: Context, p: Vec, angle: number, speed: number, damage: number, radius = 5) {
    c.emitHostile?.(p, angle, speed, damage * c.damageScale, radius);
  }
  private ring(
    c: Context,
    style: Ring['style'],
    p: Vec,
    at: number,
    until: number,
    radius: number,
    speed: number,
    damage: number,
    gaps: Ring['gaps'],
  ) {
    const r: Ring = {
      kind: 'district-ring',
      id: c.id(),
      style,
      x: p.x,
      y: p.y,
      at,
      until,
      radius,
      oldRadius: radius,
      speed,
      width: 24,
      damage,
      gaps,
    };
    this.shapes.push(r);
    return r;
  }
  cast(c: Context, target: Vec, attack: ServiceAttack) {
    const kind = String(c.bossId);
    if (!this.handles(kind)) return false;
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
      cx = b.x + b.width / 2,
      cy = b.y + b.height / 2;
    const boss = catalog.bosses.find((x) => x.id === kind)!,
      p = boss.mechanics as unknown as Record<string, number>;
    const n = this.castIndex++,
      now = c.tick;
    const at = now + ticks(Math.max(c.brutal ? 0.85 : 0, p.warningSeconds ?? attack.telegraph));
    this.nextSignatureAt =
      now +
      ticks(
        (p.cycleSeconds ?? p.firingCycleSeconds ?? attack.interval ?? 10) *
          Math.max(0.7, 1 - 0.1 * c.phase),
      );
    const point = (x: number, y: number) =>
      this.safe(c, { x: b.x + x * b.width, y: b.y + y * b.height });
    if (kind === 'pallbearer') {
      if (!this.shapes.some((x) => x.kind === 'district-prop' && x.role === 'coffin'))
        this.prop(c, 'coffin', c.boss, 180, now, forever, 0, 72, 140);
      const s = this.state(c, 'warp', at, at + ticks(1), c.boss);
      s.index = -1;
      const angle = Math.atan2(target.y - c.boss.y, target.x - c.boss.x);
      s.endX = Math.cos(angle) * 330;
      s.endY = Math.sin(angle) * 330;
      for (const prop of this.weakPoints()) if (prop.role === 'coffin') prop.angle = angle;
    } else if (kind === 'cinder-foreman') {
      let safe = n % 3;
      const zones = Array.from({ length: 3 }, (_, i) => point(0.23 + 0.27 * i, 0.57));
      const last = c.targets.at(-1);
      if (last)
        safe = zones.reduce(
          (best, q, i) => (distance(q, last) < distance(zones[best], last) ? i : best),
          0,
        );
      zones.forEach((v, i) => {
        const z = this.area(c, 'vent', v, at, at + ticks(3), 105, 0, 0, i);
        z.disabled = i === safe;
        z.damage = 11;
      });
      this.area(c, 'valve', point(0.5, 0.78), now, at + ticks(3), 65).targetId = 'cool';
    } else if (kind === 'canal-diver') {
      const spots = [point(0.24, 0.48), point(0.5, 0.69), point(0.76, 0.48)],
        selected = n % 3;
      const emerge = at + ticks(1.8);
      const state = this.state(c, 'dive', at, emerge);
      state.index = selected;
      state.endX = spots[selected].x;
      state.endY = spots[selected].y;
      spots.forEach((v, i) => {
        const z = this.area(c, 'puddle', v, now, emerge + ticks(4), 65, 0, 0, i);
        z.targetId = i === selected ? 'true' : 'decoy';
        z.progress = i === selected ? 1 : 0;
      });
      // The true puddle bubbles for at least 1.5 seconds before the emergence strike.
    } else if (kind === 'clockmender') {
      const stop = at + ticks(1.4),
        restart = stop + ticks(2);
      const clock = this.state(c, 'clock', at, restart + ticks(4));
      const density=Math.round(24*(c.projectileMultiplier??1));
      for (let i = 0; i < density; i++) {
        const angle = (i * Math.PI * 2) / density + n * 0.13;
        // Emit on the release tick, not while the warning is still visible.
        this.clockShots.push({
          id: -1,
          cueId: clock.id,
          vx: Math.cos(angle) * 125,
          vy: Math.sin(angle) * 125,
          stop,
          restart,
          until: restart + ticks(4),
        });
      }
    } else if (kind === 'wire-seamstress') {
      const positions = [point(0.25, 0.4), point(0.5, 0.67), point(0.75, 0.4)];
      const props = positions.map((v, i) => this.prop(c, 'anchor', v, 80, now, at + ticks(4), i));
      for (let i = 0; i < 2; i++) {
        const a = props[i],
          d = props[i + 1],
          length = distance(a, d),
          t = (length - 170) / (2 * length);
        this.line(
          c,
          'wire',
          a,
          { x: a.x + (d.x - a.x) * t, y: a.y + (d.y - a.y) * t },
          at,
          at + ticks(4),
          14,
          14,
          i,
          [a.id, d.id],
        );
        this.line(
          c,
          'wire',
          { x: d.x - (d.x - a.x) * t, y: d.y - (d.y - a.y) * t },
          d,
          at,
          at + ticks(4),
          14,
          14,
          i,
          [a.id, d.id],
        );
      }
    } else if (kind === 'gravedigger') {
      const ridge = this.prop(c, 'ridge', point(0.5, 0.38), 150, at, at + ticks(4), 0, 220, 55);
      ridge.speed = 65;
      const pit = this.area(
        c,
        'pit',
        { x: ridge.x, y: ridge.y + 65 * 4 },
        at + ticks(4 + 1.5),
        at + ticks(4 + 1.5 + 3),
        0,
        220,
        100,
      );
      pit.damage = 14;
      pit.targetId = String(ridge.id);
    } else if (kind === 'ink-notary') {
      // Real open spiral segments, drawn progressively; the missing angular sector remains clear.
      const center = point(0.5, 0.52),
        steps = 40,
        gap = ((n % 4) * Math.PI) / 2;
      let previous: Vec | undefined;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 3.5 + gap,
          r = 70 + (i / steps) * 220,
          v = { x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r };
        if (
          previous &&
          Math.abs(delta(a, gap)) > (65 * Math.PI) / 360 &&
          Math.abs(delta(a - (Math.PI * 3.5) / steps, gap)) > (65 * Math.PI) / 360
        )
          this.line(
            c,
            'ink',
            previous,
            v,
            at + ticks((2 * i) / steps),
            at + ticks(2 + 3),
            26,
            13,
            i,
          );
        previous = v;
      }
    } else if (kind === 'spore-beekeeper') {
      const center = point(0.5, 0.48),
        props = Array.from({ length: 3 }, (_, i) => {
          const a = (i * Math.PI * 2) / 3 + n * 0.2;
          const q = this.prop(
            c,
            'drone',
            { x: center.x + Math.cos(a) * 150, y: center.y + Math.sin(a) * 150 },
            55,
            now,
            at + ticks(5),
            i,
          );
          q.angle = a;
          return q;
        });
      this.ring(c, 'swarm', center, at, at + ticks(5), 55, 85, 14, [
        { angle: n * 0.5, width: (45 * Math.PI) / 180, dependency: 0 },
      ]);
      void props;
    } else if (kind === 'ice-custodian') {
      for (let i = 0; i < 3; i++)
        this.area(
          c,
          'ice',
          { x: b.x + (b.width * (i + 1)) / 4, y: cy },
          at,
          at + ticks(4),
          0,
          120,
          b.height - 100,
          i,
        );
    } else if (kind === 'bridge-ferryman') {
      // Alternate bridge openings plus permanent outer bypass; dry ground never becomes an invisible wall.
      const left = n % 2 === 0,
        y = cy;
      const cuts = [
        b.x + 190,
        b.x + b.width * 0.32 - 90,
        b.x + b.width * 0.32 + 90,
        b.x + b.width * 0.68 - 90,
        b.x + b.width * 0.68 + 90,
        b.x + b.width - 190,
      ];
      const intervals = [
        [cuts[0], cuts[1]],
        [cuts[2], cuts[3]],
        [cuts[4], cuts[5]],
        left ? [cuts[3], cuts[4]] : [cuts[1], cuts[2]],
      ];
      intervals.forEach(([a, z], i) => {
        if (z <= a) return;
        const water = this.area(
          c,
          'water',
          { x: (a + z) / 2, y },
          at,
          at + ticks(5),
          0,
          z - a,
          190,
          i,
        );
        water.damage = 4;
      });
    } else if (kind === 'porcelain-mourner') {
      for (let i = 0; i < 4; i++) {
        const q = this.prop(
          c,
          'fragment',
          point(0.2 + 0.2 * i, 0.5),
          65,
          now,
          at + ticks(3),
          i,
          55,
          75,
        );
        q.angle = ((i % 2 ? 1 : -1) * Math.PI) / 2;
        q.speed = 55;
      }
    } else if (kind === 'boiler-tender') {
      const center = point(0.5, 0.5);
      for (let i = 0; i < 3; i++)
        this.area(
          c,
          'valve',
          point(0.25 + 0.25 * i, 0.76),
          now,
          at + ticks(5),
          55,
          0,
          0,
          i,
        ).targetId = 'pressure';
      this.ring(c, 'pressure', center, at + ticks(5), at + ticks(9), 40, 135, 18, [
        { angle: n * Math.PI * 0.7, width: (45 * Math.PI) / 180, dependency: 0 },
      ]);
    } else if (kind === 'mirror-undertaker') {
      const source: Vec & { id?: string } =
        c.aimTargets?.[n % (c.aimTargets?.length || 1)] ?? c.targets[0] ?? target;
      const ghost = this.area(
        c,
        'ghost',
        { x: source.x, y: source.y },
        at + ticks(1.5),
        at + ticks(1.5 + 4),
        0,
        0,
        0,
      );
      ghost.targetId = source.id ?? '';
      const state = this.state(c, 'warp', at, at + ticks(1.5));
      const dest = this.safe(c, { x: 2 * cx - c.boss.x, y: 2 * cy - c.boss.y }, c.radius + 20);
      state.endX = dest.x;
      state.endY = dest.y;
    } else if (kind === 'chalk-magistrate') {
      const q = {
          x: clamp(target.x, b.x + 225, b.x + b.width - 225),
          y: clamp(target.y, b.y + 155, b.y + b.height - 155),
        },
        w = 420,
        h = 280,
        points = [
          { x: q.x - w / 2, y: q.y - h / 2 },
          { x: q.x + w / 2, y: q.y - h / 2 },
          { x: q.x + w / 2, y: q.y + h / 2 },
          { x: q.x - w / 2, y: q.y + h / 2 },
        ];
      points.forEach((v, i) => {
        const line = this.line(c, 'chalk', v, points[(i + 1) % 4], at, at + ticks(1), 22, 16, i);
        line.disabled = i === n % 4;
      });
    } else if (kind === 'wire-harpist') {
      for (let i = 0; i < 3; i++) {
        const x = b.x + (b.width * (i + 1)) / 4;
        this.line(
          c,
          'harp',
          { x, y: b.y + 90 },
          { x, y: b.y + b.height - 90 },
          at + ticks(i * 0.8),
          at + ticks(i * 0.8 + 0.45),
          18,
          16,
          i,
        );
      }
    } else if (kind === 'crow-shepherd') {
      const angle = Math.atan2(target.y - c.boss.y, target.x - c.boss.x);
      for (let flock = 0; flock < 3; flock++)
        for (let i = 0; i < 5; i++) {
          const a = angle + (i - 2) * 0.11,
            origin = {
              x: c.boss.x + Math.cos(angle + Math.PI / 2) * (i - 2) * 24,
              y: c.boss.y + Math.sin(angle + Math.PI / 2) * (i - 2) * 24,
            };
          this.shapes.push({
            kind: 'district-bird',
            id: c.id(),
            ...origin,
            oldX: origin.x,
            oldY: origin.y,
            endX: origin.x + Math.cos(a) * 900,
            endY: origin.y + Math.sin(a) * 900,
            angle: a,
            speed: 150,
            damage: 12,
            radius: 8,
            trailWidth: 40,
            at: at + ticks(flock * 0.55),
            until: at + ticks(flock * 0.55 + 6),
          });
        }
    } else if (kind === 'ledger-leech') {
      const targets = c.aimTargets ?? c.targets;
      for (const who of targets.slice(0, 2)) {
        const seal = this.area(c, 'seal', who, at, at + ticks(4), 0);
        seal.targetId = who.id;
        seal.slow = 0.2;
      }
      for (let i = 0; i < 2; i++)
        this.area(c, 'cleanse', point(0.3 + 0.4 * i, 0.72), now, at + ticks(4), 90, 0, 0, i);
    } else if (kind === 'engine') {
      const armor = this.state(c, 'armor', at, at + ticks(4));
      const core = this.prop(
        c,
        'core',
        { x: c.boss.x, y: c.boss.y + c.radius * 0.8 },
        c.bossMaximumHealth ?? 1800,
        armor.until,
        at + ticks(15),
        0,
        0,
        0,
        26,
      );
      core.health = 0;
      core.maxHealth = c.bossMaximumHealth ?? 1800;
      this.nextSignatureAt = Math.max(this.nextSignatureAt, core.until);
    } else if (kind === 'regent') {
      const state = this.state(c, 'warp', at, at + 1),
        dest = this.safe(c, { x: 2 * cx - c.boss.x, y: b.y + b.height * 0.65 }, c.radius + 20);
      state.endX = dest.x;
      state.endY = dest.y;
      for (let i = 0; i < 2; i++)
        this.area(c, 'ghost', point(0.25 + 0.5 * i, 0.4), now, at + ticks(2), 0, 0, 0, i).targetId =
          'regent';
    } else if (kind === 'salt-patriarch') {
      const state = this.state(c, 'salt', at, at + ticks(3 * 3.6));
      state.endX = cx;
      state.endY = cy;
      // Perimeters keep two 200-pixel opposite gates; neutral pads can hold the next step.
      for (let step = 0; step < 3; step++) {
        const inset = 80 + step * 75,
          x1 = b.x + inset,
          x2 = b.x + b.width - inset,
          y1 = b.y + inset,
          y2 = b.y + b.height - inset;
        const start = at + ticks(step * 3.6),
          until = start + ticks(2);
        this.line(c, 'salt', { x: x1, y: y1 }, { x: cx - 100, y: y1 }, start, until, 25, 18, step);
        this.line(c, 'salt', { x: cx + 100, y: y1 }, { x: x2, y: y1 }, start, until, 25, 18, step);
        this.line(c, 'salt', { x: x1, y: y2 }, { x: cx - 100, y: y2 }, start, until, 25, 18, step);
        this.line(c, 'salt', { x: cx + 100, y: y2 }, { x: x2, y: y2 }, start, until, 25, 18, step);
        this.line(c, 'salt', { x: x1, y: y1 }, { x: x1, y: y2 }, start, until, 25, 18, step);
        this.line(c, 'salt', { x: x2, y: y1 }, { x: x2, y: y2 }, start, until, 25, 18, step);
      }
      for (let i = 0; i < 2; i++)
        this.area(c, 'valve', point(0.35 + 0.3 * i, 0.5), now, state.until, 60, 0, 0, i).targetId =
          'salt';
      this.nextSignatureAt = Math.max(this.nextSignatureAt, state.until + ticks(0.7));
    }
    return true;
  }
  prepare(c: Context) {
    if (this.kind === 'regent' && c.tick >= this.waterShiftAt) {
      const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
      this.area(
        c,
        'water',
        { x: b.x + b.width / 2, y: b.y + b.height * (this.waterIndex++ % 2 ? 0.3 : 0.7) },
        c.tick + ticks(1.5),
        c.tick + ticks(12),
        0,
        b.width - 100,
        130,
      ).slow = 0.2;
      this.waterShiftAt = c.tick + ticks(12);
    }
    if (
      this.kind === 'pallbearer' &&
      !this.shapes.some((p) => p.kind === 'district-prop' && p.role === 'coffin')
    )
      this.prop(c, 'coffin', c.boss, 180, c.tick, forever, 0, 72, 140);
  }
  step(c: Context) {
    this.prepare(c);
    const now = c.tick;
    // Remove phase-cancelled clock projectiles, including stopped ones.
    for (const shot of this.clockShots) {
      const clock = this.shapes.find(
        (s) => s.id === shot.cueId && s.kind === 'district-state' && s.style === 'clock',
      ) as State | undefined;
      if (!clock || now >= shot.until) {
        if (shot.id >= 0) c.removeHostile?.(shot.id);
        continue;
      }
      if (shot.id === -1 && now >= clock.at)
        shot.id =
          c.emitControlled?.(clock, Math.atan2(shot.vy, shot.vx), 125, 12 * c.damageScale, 5) ?? -2;
      if (shot.id >= 0)
        c.controlShot?.(
          shot.id,
          now >= shot.stop && now < shot.restart ? 0 : shot.vx,
          now >= shot.stop && now < shot.restart ? 0 : shot.vy,
        );
      if (now >= shot.stop && now < shot.restart)
        clock.progress = clamp((now - (shot.restart - ticks(1.2))) / ticks(1.2), 0, 1);
    }
    this.clockShots = this.clockShots.filter(
      (s) => now < s.until && this.shapes.some((c) => c.id === s.cueId),
    );
    const futureVents = this.shapes.filter(
      (s): s is DistrictArea => s.kind === 'district-area' && s.style === 'vent' && now < s.at,
    );
    if (
      !this.shapes.some(
        (s) =>
          s.kind === 'district-area' && s.style === 'valve' && s.targetId === 'cool' && s.disabled,
      )
    ) {
      const occupied = futureVents.filter((z) => c.targets.some((p) => inside(p, z)));
      const last = occupied.at(-1);
      if (last) for (const z of futureVents) z.disabled = z.id === last.id;
    }
    for (const cue of [...this.shapes]) {
      if (cue.kind === 'district-prop') {
        cue.oldX = cue.x;
        cue.oldY = cue.y;
        if (cue.role === 'coffin') {
          cue.x = c.boss.x + Math.cos(cue.angle) * 85;
          cue.y = c.boss.y + Math.sin(cue.angle) * 85;
        }
        if (cue.role === 'core') {
          cue.x = c.boss.x;
          cue.y = c.boss.y + c.radius * 0.8;
          if (now >= cue.at && !this.once.has('core:' + cue.id)) {
            cue.health = cue.maxHealth;
            this.once.add('core:' + cue.id);
          }
        }
        if (cue.health > 0 && now >= cue.at && (cue.role === 'ridge' || cue.role === 'fragment')) {
          if (now < cue.until) {
            const angle = cue.role === 'ridge' ? Math.PI / 2 : cue.angle;
            const next = moveBody(
              cue,
              { x: Math.cos(angle) * cue.speed * DT, y: Math.sin(angle) * cue.speed * DT },
              Math.max(cue.width, cue.height) / 2,
              c.obstacles,
            );
            cue.x = next.x;
            cue.y = next.y;
          }
        }
        if (cue.role === 'fragment' && cue.health > 0 && now === cue.until)
          for (let i = 0; i < 6; i++) this.emit(c, cue, (i * Math.PI) / 3, 140, 13);
      } else if (cue.kind === 'district-area') {
        if (cue.style === 'pit' && now < cue.at - ticks(1.5)) {
          const ridge = this.shapes.find(
            (p) => p.id === Number(cue.targetId) && p.kind === 'district-prop',
          );
          if (ridge && 'x' in ridge) {
            cue.x = ridge.x;
            cue.y = ridge.y;
          }
        }
        if (cue.style === 'seal') {
          const p = c.targets.find((p) => p.id === cue.targetId);
          if (p) {
            cue.x = p.x;
            cue.y = p.y;
            if (
              this.shapes.some(
                (s) =>
                  s.kind === 'district-area' &&
                  s.style === 'cleanse' &&
                  now >= s.at &&
                  now < s.until &&
                  inside(p, s, 9),
              )
            )
              cue.disabled = true;
          }
        }
        if (cue.style === 'valve' && !cue.disabled && now < cue.until) {
          const users = c.targets.filter(
            (p) => (c.interactors ?? []).includes(p.id) && inside(p, cue, 9),
          );
          cue.progress = users.length ? cue.progress + 1 : 0;
          const duration = cue.targetId === 'salt' ? 2 : 1.2;
          if (cue.progress >= ticks(duration)) {
            cue.disabled = true;
            if (cue.targetId === 'cool')
              for (const z of this.shapes)
                if (z.kind === 'district-area' && z.style === 'vent') z.disabled = true;
            if (cue.targetId === 'pressure')
              for (const z of this.shapes)
                if (z.kind === 'district-ring' && z.style === 'pressure')
                  z.gaps.push({
                    angle: Math.atan2(cue.y - z.y, cue.x - z.x),
                    width: (70 * Math.PI) / 180,
                    dependency: cue.id,
                  });
            if (cue.targetId === 'salt') {
              for (const line of this.shapes)
                if (line.kind === 'district-line' && line.style === 'salt' && line.at > now) {
                  line.at += ticks(2);
                  line.until += ticks(2);
                }
              for (const s of this.shapes)
                if (s.kind === 'district-state' && s.style === 'salt') s.until += ticks(2);
              this.nextSignatureAt += ticks(2);
            }
          }
        }
        if (cue.disabled || now < cue.at || now >= cue.until) continue;
        if (cue.damage > 0)
          for (const p of c.targets) if (inside(p, cue)) this.touch(c, cue, p, cue.damage);
      } else if (cue.kind === 'district-line') {
        if (cue.disabled || now < cue.at || now >= cue.until) continue;
        for (const p of c.targets)
          if (serviceBeamContact({ x: p.oldX, y: p.oldY }, p, cue))
            this.touch(c, cue, p, cue.damage);
      } else if (cue.kind === 'district-ring') {
        cue.oldRadius = cue.radius;
        if (now < cue.at || now >= cue.until) continue;
        if (cue.style === 'swarm') {
          if (!this.once.has('swarm:' + cue.id)) {
            this.once.add('swarm:' + cue.id);
            const drones = this.shapes.filter(
              (p): p is DistrictProp => p.kind === 'district-prop' && p.role === 'drone',
            );
            const density=Math.round(24*(c.projectileMultiplier??1));
            for (let i = 0; i < density; i++) {
              const angle = (i * Math.PI * 2) / density;
              if (cue.gaps.some((g) => Math.abs(delta(angle, g.angle)) < g.width / 2)) continue;
              const drone = drones.toSorted(
                (a, b) => Math.abs(delta(angle, a.angle)) - Math.abs(delta(angle, b.angle)),
              )[0];
              if (!drone || drone.health <= 0) continue;
              const id = c.emitControlled?.(
                {
                  x: cue.x + Math.cos(angle) * cue.radius,
                  y: cue.y + Math.sin(angle) * cue.radius,
                },
                angle,
                cue.speed,
                cue.damage * c.damageScale,
                5,
              );
              if (id !== undefined) this.swarmShots.push({ id, ring: cue.id, drone: drone.id });
            }
          }
          cue.radius += cue.speed * DT;
          continue; // Actual shared projectiles own collision, cover and erasure.
        }
        cue.radius += cue.speed * DT;
        for (const p of c.targets) {
          if (districtRingContact({ x: p.oldX, y: p.oldY }, p, cue))
            this.touch(c, cue, p, cue.damage);
        }
      } else if (cue.kind === 'district-state') {
        if (cue.style === 'warp' && cue.index === -1 && now >= cue.at && now < cue.until) {
          const from = { ...c.boss },
            dest = moveBody(c.boss, { x: cue.endX * DT, y: cue.endY * DT }, c.radius, c.obstacles);
          c.boss.x = dest.x;
          c.boss.y = dest.y;
          for (const p of c.targets)
            if (segmentCircle(from, dest, p, c.radius + 9) !== null) this.touch(c, cue, p, 22, 2);
        } else if (
          ((cue.style === 'warp' && cue.index !== -1) || cue.style === 'dive') &&
          now >= cue.until &&
          !this.once.has('warp:' + cue.id)
        ) {
          this.once.add('warp:' + cue.id);
          c.relocateBoss?.({ x: cue.endX, y: cue.endY });
          if (cue.style === 'dive')
            for (const p of c.targets)
              if (distance(p, { x: cue.endX, y: cue.endY }) <= 74) this.touch(c, cue, p, 18, 2);
        }
      } else if (cue.kind === 'district-bird' && now >= cue.at && now < cue.until) {
        cue.oldX = cue.x;
        cue.oldY = cue.y;
        const next = {
          x: cue.x + Math.cos(cue.angle) * cue.speed * DT,
          y: cue.y + Math.sin(cue.angle) * cue.speed * DT,
        };
        const wall = c.obstacles.some((o) => segmentRect(cue, next, o) !== null);
        if (wall) {
          cue.until = now;
          continue;
        }
        cue.x = next.x;
        cue.y = next.y;
        for (const p of c.targets)
          if (
            segmentCircle(
              { x: cue.oldX - p.oldX, y: cue.oldY - p.oldY },
              { x: cue.x - p.x, y: cue.y - p.y },
              { x: 0, y: 0 },
              cue.radius + 9,
            ) !== null
          )
            this.touch(c, cue, p, cue.damage, 10);
      }
    }
    this.shapes = this.shapes.filter(
      (cue) => now < cue.until || (cue.kind === 'district-prop' && cue.role === 'coffin'),
    );
    this.swarmShots = this.swarmShots.filter((shot) => {
      const live =
        this.shapes.some((s) => s.id === shot.ring) &&
        this.shapes.some((p) => p.id === shot.drone && p.kind === 'district-prop' && p.health > 0);
      if (!live) c.removeHostile?.(shot.id);
      return live;
    });
    // Bounded transient contact records; entries expire with their shapes.
    if (now % HZ === 0) {
      const ids = new Set(this.shapes.map((s) => String(s.id)));
      for (const key of this.once) if (!ids.has(key.split(':').at(-1)!)) this.once.delete(key);
      for (const key of this.contacts.keys())
        if (!ids.has(key.split(':')[0])) this.contacts.delete(key);
    }
  }
}
