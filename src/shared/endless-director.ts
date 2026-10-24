import { DT, HZ, type Vec, type Shot } from './protocol.ts';
import { clamp, distance, moveBody, segmentCircle, segmentRect, type Rect } from './geometry.ts';
import { serviceBeamContact, serviceRingContact, type ServiceAttack } from './service-director.ts';
import { sectorIntersectsCircle, wrappedAngle } from './warden-signature.ts';
import type { SignatureContext } from './boss-director.ts';
export const exclusiveBossIds = [
  'hourglass-widow',
  'unlit-astronomer',
  'folded-man',
  'red-comet',
  'memory-taxer',
  'choir-of-moths',
  'zero-hour-conductor',
  'walking-district',
  'last-knocker',
] as const;
export const finalBossIds = [...exclusiveBossIds, 'uncounted'] as const;
type Life = { id: number; at: number; until: number };
type Line = Life & {
  kind: 'endless-line';
  style: 'replay' | 'fold' | 'entry' | 'exit' | 'trail' | 'beat' | 'echo';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  damage: number;
  index: number;
  disabled: boolean;
};
type State = Life &
  Vec & {
    kind: 'endless-state';
    style: 'fan' | 'dash' | 'memory' | 'beat' | 'knock' | 'warp' | 'summon';
    index: number;
    progress: number;
    emitted: boolean;
    angle: number;
    endX: number;
    endY: number;
    history: number[];
    damage: number;
  };
type Marker = Life &
  Vec & {
    kind: 'endless-marker';
    style: 'orbit' | 'safe-orbit' | 'moth';
    oldX: number;
    oldY: number;
    centerX: number;
    centerY: number;
    orbit: number;
    angle: number;
    radius: number;
    damage: number;
    index: number;
    offset: number;
    pathWidth: number;
    speed: number;
  };
type Pad = Life &
  Vec & { kind: 'endless-pad'; radius: number; index: number; correct: boolean; order: number };
type Echo = Life & Vec & { kind: 'endless-echo'; radius: number; damage: number; index: number };
type Ring = Life &
  Vec & {
    kind: 'endless-ring';
    radius: number;
    oldRadius: number;
    gap: number;
    gapAngle: number;
    width: number;
    damage: number;
    speed: number;
  };
export type EndlessProp = Life &
  Vec & {
    kind: 'endless-prop';
    role: 'block' | 'core';
    width: number;
    height: number;
    radius: number;
    health: number;
    maxHealth: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    settles: number;
    index: number;
  };
export type EndlessCue = Line | State | Marker | Pad | Echo | Ring | EndlessProp;
const ticks = (s: number) => Math.ceil(s * HZ);
export function blockPosition(p: EndlessProp, now: number) {
  const length = Math.hypot(p.endX - p.startX, p.endY - p.startY),
    t = clamp(((now - p.at) * DT * 55) / Math.max(1e-9, length), 0, 1);
  return { x: p.startX + (p.endX - p.startX) * t, y: p.startY + (p.endY - p.startY) * t };
}
export function endlessSolids(cues: readonly { kind: string }[], now: number): Rect[] {
  return (cues as EndlessCue[])
    .filter(
      (p): p is EndlessProp =>
        p.kind === 'endless-prop' &&
        p.role === 'block' &&
        p.health > 0 &&
        now >= p.at &&
        now < p.until,
    )
    .map((p) => {
      const q = blockPosition(p, now);
      return { x: q.x - p.width / 2, y: q.y - p.height / 2, width: p.width, height: p.height };
    });
}
/** Eject only along a clear route, shared with prediction when moving blocks settle. */
export function leaveMovingBlocks(p: Vec, blocks: Rect[], fixed: Rect[], radius = 9) {
  let q = { x: p.x, y: p.y };
  for (const b of blocks) {
    if (
      q.x <= b.x - radius ||
      q.x >= b.x + b.width + radius ||
      q.y <= b.y - radius ||
      q.y >= b.y + b.height + radius
    )
      continue;
    const options = [
      { x: b.x - radius - 0.1, y: q.y },
      { x: b.x + b.width + radius + 0.1, y: q.y },
      { x: q.x, y: b.y - radius - 0.1 },
      { x: q.x, y: b.y + b.height + radius + 0.1 },
    ].sort((a, z) => distance(q, a) - distance(q, z));
    const next = options.find(
      (v) =>
        !fixed.some((r) => segmentRect(q, v, r, radius) !== null) &&
        !blocks.some(
          (r) =>
            v.x > r.x - radius &&
            v.x < r.x + r.width + radius &&
            v.y > r.y - radius &&
            v.y < r.y + r.height + radius,
        ),
    );
    if (next) q = next;
  }
  return q;
}
export class EndlessDirector {
  private now = 0;
  private kind = '';
  private shapes: EndlessCue[] = [];
  private castIndex = 0;
  private contacts = new Map<string, number>();
  private reflected = new Set<number>();
  private openingUntil = 0;
  nextSignatureAt = 0;
  handles(kind: string) {
    return finalBossIds.some((x) => x === kind);
  }
  reset(kind: string, encounter = false) {
    this.shapes = [];
    this.contacts.clear();
    this.reflected.clear();
    this.openingUntil = 0;
    this.nextSignatureAt = 0;
    if (encounter || kind !== this.kind) this.castIndex = 0;
    this.kind = kind;
  }
  cues() {
    return this.shapes;
  }
  prepare(c: SignatureContext) {
    if (this.kind === 'unlit-astronomer') {
      const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
      c.relocateBoss?.(this.safe(c, { x: b.x + b.width / 2, y: b.y + b.height / 2 }, 65));
    }
  }
  weakPoints() {
    return this.shapes.filter(
      (c): c is EndlessProp =>
        c.kind === 'endless-prop' && c.health > 0 && (c.role !== 'core' || this.now >= c.at),
    );
  }
  transfersDamage(id: number) {
    return this.weakPoints().some((p) => p.id === id && p.role === 'core');
  }
  weakContact(a: Vec, b: Vec, p: EndlessProp, r: number) {
    return p.role === 'block'
      ? (segmentRect(
          a,
          b,
          { x: p.x - p.width / 2, y: p.y - p.height / 2, width: p.width, height: p.height },
          r,
        )?.t ?? null)
      : segmentCircle(a, b, p, r + p.radius);
  }
  hit(id: number, amount: number) {
    const p = this.weakPoints().find((p) => p.id === id);
    if (!p) return 0;
    const n = Math.min(p.health, Math.max(0, amount));
    p.health -= n;
    return n;
  }
  bodyMultiplier(now: number) {
    if (now < this.openingUntil) return 1.5;
    return this.kind === 'walking-district' &&
      this.shapes.some((c) => c.kind === 'endless-prop' && c.role === 'block' && now < c.settles)
      ? 0.6
      : 1;
  }
  reflectShot(s: Shot, a: Vec, b: Vec, now: number) {
    if (this.kind !== 'folded-man' || s.owner !== 'hostile' || this.reflected.has(s.id))
      return false;
    for (const l of this.shapes) {
      if (l.kind !== 'endless-line' || l.style !== 'fold' || now < l.at || now >= l.until) continue;
      if ((a.x - l.x1) * (b.x - l.x1) > 0 || Math.abs(b.x - a.x) < 1e-9) continue;
      const t = (l.x1 - a.x) / (b.x - a.x),
        y = a.y + (b.y - a.y) * t;
      if (t < 0 || t > 1 || y < Math.min(l.y1, l.y2) || y > Math.max(l.y1, l.y2)) continue;
      // End this tick exactly at the fold, then travel away on the next tick.
      b.x = l.x1;
      b.y = y;
      s.vx = -s.vx;
      this.reflected.add(s.id);
      return true;
    }
    return false;
  }
  private safe(c: SignatureContext, p: Vec, r = 45) {
    const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    const fit = (q: Vec) =>
      !c.obstacles.some(
        (o) =>
          q.x > o.x - r && q.x < o.x + o.width + r && q.y > o.y - r && q.y < o.y + o.height + r,
      );
    const bound = (q: Vec) => ({
      x: clamp(q.x, b.x + r, b.x + b.width - r),
      y: clamp(q.y, b.y + r, b.y + b.height - r),
    });
    const start = bound(p);
    if (fit(start)) return start;
    for (let d = 40; d <= 640; d += 40)
      for (let n = 0; n < 16; n++) {
        const q = bound({
          x: start.x + Math.cos((n * Math.PI) / 8) * d,
          y: start.y + Math.sin((n * Math.PI) / 8) * d,
        });
        if (fit(q)) return q;
      }
    return start;
  }
  private line(
    c: SignatureContext,
    style: Line['style'],
    a: Vec,
    b: Vec,
    width: number,
    damage: number,
    at: number,
    until: number,
    index = 0,
  ) {
    const l: Line = {
      kind: 'endless-line',
      id: c.id(),
      style,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      width,
      damage,
      at,
      until,
      index,
      disabled: false,
    };
    this.shapes.push(l);
    return l;
  }
  private state(
    c: SignatureContext,
    style: State['style'],
    p: Vec,
    at: number,
    until: number,
    index = 0,
  ) {
    const s: State = {
      kind: 'endless-state',
      id: c.id(),
      style,
      x: p.x,
      y: p.y,
      at,
      until,
      index,
      progress: 0,
      emitted: false,
      angle: 0,
      endX: p.x,
      endY: p.y,
      history: [],
      damage: 0,
    };
    this.shapes.push(s);
    return s;
  }
  private touch(c: SignatureContext, key: number, p: { id: string }, amount: number) {
    const k = key + ':' + p.id;
    if (c.tick < (this.contacts.get(k) ?? 0)) return;
    this.contacts.set(k, c.tick + ticks(0.5));
    c.damage(p.id, amount * c.damageScale);
  }
  cast(c: SignatureContext, target: Vec, attack: ServiceAttack) {
    const id = String(c.bossId);
    if (!this.handles(id)) return false;
    const n = this.castIndex++,
      now = c.tick,
      b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
    const point = (x: number, y: number, r = 45) =>
      this.safe(c, { x: b.x + x * b.width, y: b.y + y * b.height }, r);
    const warning =
        id === 'last-knocker' || id === 'zero-hour-conductor' || id === 'walking-district'
          ? 1.8
          : id === 'red-comet'
            ? 1.3
            : id === 'folded-man'
              ? 1.6
              : 1.5,
      at = now + ticks(warning),
      aim = Math.atan2(target.y - c.boss.y, target.x - c.boss.x);
    let cycle =
      id === 'hourglass-widow'
        ? 9
        : id === 'unlit-astronomer' || id === 'memory-taxer'
          ? 12
          : id === 'last-knocker' || id === 'zero-hour-conductor'
            ? 11
            : id === 'walking-district'
              ? 13
              : 10;
    if (id === 'hourglass-widow') {
      for (let pass = 0; pass < 2; pass++) {
        const fan = this.state(
          c,
          'fan',
          c.boss,
          at + pass * ticks(2.5),
          at + pass * ticks(2.5) + 1,
          pass,
        );
        fan.angle = aim;
        fan.damage = 13;
        for (let i = 0; i < 11; i++) {
          const a = aim + (i / 10 - 0.5) * Math.PI * 0.7;
          this.line(
            c,
            'replay',
            c.boss,
            { x: c.boss.x + Math.cos(a) * 650, y: c.boss.y + Math.sin(a) * 650 },
            2,
            0,
            fan.at,
            fan.at + ticks(3),
            pass,
          );
        }
      }
    } else if (id === 'unlit-astronomer') {
      for (let i = 0; i < 3; i++) {
        const orbit = [180, 300, 240][i],
          angle = n * 0.7 + i * Math.PI * 0.65;
        const p = { x: c.boss.x + Math.cos(angle) * orbit, y: c.boss.y + Math.sin(angle) * orbit };
        this.shapes.push({
          kind: 'endless-marker',
          id: c.id(),
          style: i === 2 ? 'safe-orbit' : 'orbit',
          ...p,
          oldX: p.x,
          oldY: p.y,
          centerX: c.boss.x,
          centerY: c.boss.y,
          orbit,
          angle,
          radius: 32,
          damage: i === 2 ? 0 : 14,
          index: i,
          offset: 0,
          pathWidth: 0,
          speed: (22 * Math.PI) / 180,
          at,
          until: at + ticks(8),
        });
      }
    } else if (id === 'folded-man') {
      const x = b.x + b.width * 0.56,
        y = clamp(target.y, b.y + 280, b.y + b.height - 280);
      this.line(c, 'fold', { x, y: y - 260 }, { x, y: y + 260 }, 5, 0, at, at + ticks(3));
      const origin = this.safe(c, { x: x - 270, y });
      const fan = this.state(c, 'fan', origin, at, at + 1);
      fan.angle = 0;
      fan.index = 2;
      fan.damage = 12;
      for (const a of [-0.35, 0, 0.35]) {
        const cross = { x, y: y + Math.tan(a) * 270 };
        this.line(c, 'entry', origin, cross, 2, 0, at, at + ticks(3));
        this.line(
          c,
          'exit',
          cross,
          { x: x - 250, y: cross.y + Math.tan(a) * 250 },
          2,
          0,
          at,
          at + ticks(3),
        );
      }
    } else if (id === 'red-comet') {
      let start = { x: c.boss.x, y: c.boss.y },
        release = at;
      const points = [
        point(n % 2 ? 0.25 : 0.75, 0.35),
        point(n % 2 ? 0.72 : 0.28, 0.62),
        point(0.5, 0.78),
      ];
      points.forEach((desired, i) => {
        let fraction = 1;
        for (const o of c.obstacles) {
          const hit = segmentRect(start, desired, o, 58);
          if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.001));
        }
        const end = {
          x: start.x + (desired.x - start.x) * fraction,
          y: start.y + (desired.y - start.y) * fraction,
        };
        const time = Math.max(1, ticks(distance(start, end) / 360)),
          s = this.state(c, 'dash', start, release, release + time + 1, i);
        s.endX = end.x;
        s.endY = end.y;
        const trail = this.line(
          c,
          'trail',
          start,
          end,
          30,
          13,
          release,
          release + time + ticks(2.5),
          i,
        );
        trail.disabled = true;
        start = end;
        release += time + ticks(0.35);
      });
      cycle = Math.max(cycle, (release - now) / HZ + 3);
    } else if (id === 'memory-taxer') {
      const s = this.state(c, 'memory', point(0.5, 0.45), now, now + ticks(4) + 1);
      s.history = [n % 3, (n + 1) % 3, (n + 2) % 3];
      s.index = s.history[0];
      s.endX = now + ticks(2);
      s.endY = now + ticks(4);
      s.damage = 18;
      for (let i = 0; i < 3; i++) {
        const p = point(0.25 + i * 0.25, 0.66, 110);
        this.shapes.push({
          kind: 'endless-pad',
          id: c.id(),
          ...p,
          radius: 105,
          index: i,
          order: s.history.indexOf(i),
          correct: i === s.index,
          at: now,
          until: s.until,
        });
      }
    } else if (id === 'choir-of-moths') {
      const width = b.width - 160;
      for (let row = 0; row < 3; row++)
        for (let i = 0; i < 6; i++) {
          if (row === n % 3 && (i === 2 || i === 3)) continue;
          const offset = i * 65 + (row === n % 3 && i >= 4 ? 50 : 0),
            x = b.x + 80 - offset,
            centerY = b.y + b.height * (0.3 + row * 0.2),
            y = centerY + Math.sin(-offset / 170 + row * 0.4) * 55;
          this.shapes.push({
            kind: 'endless-marker',
            id: c.id(),
            style: 'moth',
            x,
            y,
            oldX: x,
            oldY: y,
            centerX: b.x + 80,
            centerY,
            orbit: 0,
            angle: 0,
            radius: 9,
            damage: 11,
            index: row,
            offset,
            pathWidth: width,
            speed: 130,
            at,
            until: at + ticks(7.5),
          });
        }
    } else if (id === 'zero-hour-conductor') {
      for (let beat = 0; beat < 4; beat++) {
        const safe = (n + (beat % 2)) % 4,
          s = this.state(
            c,
            'beat',
            point(0.5, 0.25),
            at + ticks(0.9 * beat),
            at + ticks(0.9 * beat + 0.4),
            beat,
          );
        s.history = [safe];
        for (let lane = 0; lane < 4; lane++) {
          if (lane === safe) continue;
          const x = b.x + (b.width * (lane + 0.5)) / 4;
          this.line(
            c,
            'beat',
            { x, y: b.y + 30 },
            { x, y: b.y + b.height - 30 },
            b.width / 4 - 12,
            14,
            s.at,
            s.until,
            beat,
          );
        }
      }
    } else if (id === 'walking-district') {
      let settle = at;
      for (let i = 0; i < 2; i++) {
        const p = point(0.32 + 0.36 * i, 0.35, 100),
          desired = point(0.32 + 0.36 * i, 0.64, 100);
        let fraction = 1;
        for (const o of c.obstacles) {
          const hit = segmentRect(p, desired, {
            x: o.x - 75,
            y: o.y - 65,
            width: o.width + 150,
            height: o.height + 130,
          });
          if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.01));
        }
        const end = {
            x: p.x + (desired.x - p.x) * fraction,
            y: p.y + (desired.y - p.y) * fraction,
          },
          settles = at + ticks(distance(p, end) / 55);
        settle = Math.max(settle, settles);
        this.shapes.push({
          kind: 'endless-prop',
          id: c.id(),
          role: 'block',
          ...p,
          width: 150,
          height: 130,
          radius: 0,
          health: 180 * (c.brutal ? 2 : 1),
          maxHealth: 180 * (c.brutal ? 2 : 1),
          startX: p.x,
          startY: p.y,
          endX: end.x,
          endY: end.y,
          settles,
          index: i,
          at,
          until: settles + ticks(4),
        });
      }
      const p = this.safe(c, { x: c.boss.x, y: c.boss.y + 65 }, 35);
      this.shapes.push({
        kind: 'endless-prop',
        id: c.id(),
        role: 'core',
        ...p,
        width: 0,
        height: 0,
        radius: 30,
        health: c.bossMaximumHealth ?? 3000,
        maxHealth: c.bossMaximumHealth ?? 3000,
        startX: p.x,
        startY: p.y,
        endX: p.x,
        endY: p.y,
        settles: settle,
        index: 0,
        at: settle,
        until: settle + ticks(4),
      });
    } else if (id === 'last-knocker') {
      const s = this.state(c, 'knock', c.boss, at, at + ticks(1.4));
      s.angle = aim;
      s.damage = 17;
      s.endX = now;
      s.endY = at;
      this.openingUntil = 0;
    } else if (id === 'uncounted') {
      const places = c.targets.slice(0, 4);
      for (let i = 0; i < Math.max(1, places.length); i++) {
        const p = places[i] ?? target;
        this.shapes.push({
          kind: 'endless-echo',
          id: c.id(),
          x: p.x,
          y: p.y,
          radius: 65,
          damage: 17,
          index: i,
          at: at + ticks(i * 0.4),
          until: at + ticks(i * 0.4 + 0.5),
        });
      }
      const destination = point(n % 2 ? 0.3 : 0.7, 0.28, 65),
        warp = this.state(c, 'warp', c.boss, at + ticks(1), at + ticks(1) + 1);
      warp.endX = destination.x;
      warp.endY = destination.y;
      for (let i = 0; i < 2; i++) {
        const y = b.y + b.height * (0.45 + i * 0.2),
          gap = clamp(target.x, b.x + 180, b.x + b.width - 180);
        this.line(
          c,
          'echo',
          { x: b.x + 40, y },
          { x: gap - 115, y },
          26,
          18,
          at + ticks(2 + i * 0.6),
          at + ticks(2.5 + i * 0.6),
          i,
        );
        this.line(
          c,
          'echo',
          { x: gap + 115, y },
          { x: b.x + b.width - 40, y },
          26,
          18,
          at + ticks(2 + i * 0.6),
          at + ticks(2.5 + i * 0.6),
          i,
        );
      }
      this.shapes.push({
        kind: 'endless-ring',
        id: c.id(),
        x: destination.x,
        y: destination.y,
        radius: 60,
        oldRadius: 60,
        gap: (40 * Math.PI) / 180,
        gapAngle: aim,
        width: 20,
        damage: 16,
        speed: 115,
        at: at + ticks(3.4),
        until: at + ticks(8),
      });
      const summon = this.state(c, 'summon', destination, at + ticks(1.5), at + ticks(1.5) + 1);
      summon.index = Math.min(8, 4 + c.phase);
      summon.damage = 10;
    }
    this.nextSignatureAt = Math.max(
      now + ticks(cycle),
      ...this.shapes.map((c) => c.until + ticks(0.5)),
    );
    return true;
  }
  step(c: SignatureContext) {
    const now = c.tick;
    this.now = now;
    for (const s of this.shapes) {
      if (now >= s.until) continue;
      if (s.kind === 'endless-state') {
        if (s.style === 'fan' && now >= s.at && !s.emitted) {
          s.emitted = true;
          const count = 11,
            arc = s.index === 2 ? 0.7 : Math.PI * 0.7;
          for (let i = 0; i < count; i++)
            c.emitHostile?.(
              s,
              s.angle + (i / (count - 1) - 0.5) * arc,
              140,
              s.damage * c.damageScale,
              5,
            );
        }
        if (s.style === 'dash' && now >= s.at) {
          const t = clamp((now - s.at) / Math.max(1, s.until - s.at - 1), 0, 1),
            desired = { x: s.x + (s.endX - s.x) * t, y: s.y + (s.endY - s.y) * t },
            next = moveBody(
              c.boss,
              { x: desired.x - c.boss.x, y: desired.y - c.boss.y },
              58,
              c.obstacles,
            );
          c.boss.x = next.x;
          c.boss.y = next.y;
          const trail = this.shapes.find(
            (p): p is Line =>
              p.kind === 'endless-line' && p.style === 'trail' && p.index === s.index,
          );
          if (trail) {
            trail.disabled = false;
            trail.x2 = next.x;
            trail.y2 = next.y;
          }
          // Dash body and laid trail use the same swept capsule.
        }
        if (s.style === 'memory') {
          s.progress = now < s.endX ? Math.min(2, Math.floor((now - s.at) / (ticks(2) / 3))) : 3;
          if (now >= s.endY && !s.emitted) {
            s.emitted = true;
            const pad = this.shapes.find((p): p is Pad => p.kind === 'endless-pad' && p.correct);
            for (const p of c.targets)
              if (!pad || distance(p, pad) + 9 > pad.radius)
                c.damage(p.id, s.damage * c.damageScale);
          }
        }
        if (s.style === 'knock') {
          s.progress = now < s.at ? Math.min(3, 1 + Math.floor((now - s.endX) / ticks(0.65))) : 3;
          if (now >= s.at) {
            const fraction = clamp((now - s.at) / ticks(1.4), 0, 1),
              previous = clamp((now - s.at - 1) / ticks(1.4), 0, 1),
              aim = s.angle + ((fraction - 0.5) * 100 * Math.PI) / 180,
              arc = (12 * Math.PI) / 180 + ((fraction - previous) * 100 * Math.PI) / 180;
            for (const p of c.targets)
              if (
                sectorIntersectsCircle(
                  {
                    x: s.x,
                    y: s.y,
                    radius: 420,
                    aim: aim - ((fraction - previous) * 50 * Math.PI) / 180,
                    arc,
                  },
                  p,
                  9,
                )
              )
                this.touch(c, s.id, p, s.damage);
            if (now === s.until - 1) this.openingUntil = now + ticks(3.5);
          }
        }
        if (s.style === 'warp' && now >= s.at && !s.emitted) {
          s.emitted = true;
          c.relocateBoss?.({ x: s.endX, y: s.endY });
        }
        if (s.style === 'summon' && now >= s.at && !s.emitted) {
          s.emitted = true;
          for (let i = 0; i < s.index; i++) {
            const p = this.safe(
              c,
              {
                x: s.x + Math.cos((i * Math.PI * 2) / s.index) * 90,
                y: s.y + Math.sin((i * Math.PI * 2) / s.index) * 90,
              },
              20,
            );
            c.spawnOrdinary?.(p, 90, 40, s.damage * c.damageScale, 8);
          }
        }
      } else if (s.kind === 'endless-marker') {
        s.oldX = s.x;
        s.oldY = s.y;
        if (now < s.at) continue;
        if (s.style === 'moth') {
          const travel = s.x - s.centerX,
            slope = (Math.cos(travel / 170 + s.index * 0.4) * 55) / 170,
            dx = (s.speed * DT) / Math.hypot(1, slope),
            nextX = s.x + dx,
            nextY = s.centerY + Math.sin((nextX - s.centerX) / 170 + s.index * 0.4) * 55,
            length = Math.hypot(nextX - s.x, nextY - s.y),
            scale = Math.min(1, (s.speed * DT) / Math.max(1e-9, length));
          s.x += (nextX - s.x) * scale;
          s.y += (nextY - s.y) * scale;
          s.angle = Math.atan2(s.y - s.oldY, s.x - s.oldX);
        } else {
          s.angle += s.speed * DT;
          s.x = s.centerX + Math.cos(s.angle) * s.orbit;
          s.y = s.centerY + Math.sin(s.angle) * s.orbit;
        }
        if (s.damage > 0) {
          const wall =
            s.style === 'moth' &&
            c.obstacles.some((o) => segmentRect({ x: s.oldX, y: s.oldY }, s, o, s.radius) !== null);
          if (wall) {
            s.until = now;
            continue;
          }
          const b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
          if (s.x < b.x || s.x > b.x + b.width || s.y < b.y || s.y > b.y + b.height) continue;
          for (const p of c.targets)
            if (
              segmentCircle(
                { x: p.oldX - s.oldX, y: p.oldY - s.oldY },
                { x: p.x - s.x, y: p.y - s.y },
                { x: 0, y: 0 },
                s.radius + 9,
              ) !== null
            )
              this.touch(c, s.id, p, s.damage);
        }
      } else if (s.kind === 'endless-prop') {
        if (s.role === 'block') {
          const p = blockPosition(s, now);
          s.x = p.x;
          s.y = p.y;
        }
      } else if (s.kind === 'endless-line' && !s.disabled && s.damage > 0 && now >= s.at) {
        for (const p of c.targets)
          if (serviceBeamContact({ x: p.oldX, y: p.oldY }, p, s)) this.touch(c, s.id, p, s.damage);
      } else if (s.kind === 'endless-echo' && now >= s.at) {
        for (const p of c.targets)
          if (segmentCircle({ x: p.oldX, y: p.oldY }, p, s, s.radius + 9) !== null)
            this.touch(c, s.id, p, s.damage);
      } else if (s.kind === 'endless-ring' && now >= s.at) {
        s.oldRadius = s.radius;
        s.radius += s.speed * DT;
        for (const p of c.targets)
          if (serviceRingContact({ x: p.oldX, y: p.oldY }, p, s)) this.touch(c, s.id, p, s.damage);
      }
    }
    this.shapes = this.shapes.filter((s) => now < s.until);
    if (now % HZ === 0) {
      const ids = new Set(this.shapes.map((s) => String(s.id)));
      for (const key of this.contacts.keys())
        if (!ids.has(key.split(':')[0])) this.contacts.delete(key);
    }
  }
}
