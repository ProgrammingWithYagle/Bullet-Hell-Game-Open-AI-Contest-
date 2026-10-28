import {gappedRingContact as serviceRingContact} from './ring-contact.ts';
export {gappedRingContact as serviceRingContact} from './ring-contact.ts';
import {BellCarillon,type BellCue} from './bell-carillon.ts';
import {MoldMixing,moldMovement,type MoldCue} from './mold-mixing.ts';
import {MatronWard,type MatronCue} from './matron-ward.ts';
import catalog from '../../content/catalog.json' with { type: 'json' };
// Services of the dead: authoritative, readable signatures for Midnight Circuit.
// Phaser consumes these exact shapes; current/tether movement is also shared with prediction.
import { DT, HZ, type Vec } from './protocol.ts';
import { clamp, distance, segmentCircle, segmentRect, type Rect } from './geometry.ts';
import type { SignatureContext } from './boss-director.ts';
export const serviceBossIds = [
  'matron',
  'alchemist',
  'bellringer',
  'stitchwright',
  'glass-surgeon',
  'ash-baker',
  'sluice-keeper',
  'stationmaster',
  'lamplighter',
  'anatomist',
  'plague-gardener',
  'choir',
  'red-abbess',
  'vesper-judge',
] as const;
type Life = { id: number; at: number; until: number };
export type ServiceProp = Life &
  Vec & {
    kind: 'service-prop';
    role: 'nest' | 'needle' | 'root' | 'caster';
    radius: number;
    health: number;
    maxHealth: number;
    nextAt: number;
    index: number;
  };
type Pool = Life & Vec & { kind: 'service-pool'; radius: number; damage: number };
type Ring = Life &
  Vec & {
    kind: 'service-ring';
    radius: number;
    oldRadius: number;
    gapAngle: number;
    gap: number;
    width: number;
    speed: number;
    damage: number;
  };
type Beam = Life & {
  kind: 'service-beam';
  style: 'glass' | 'choir' | 'vine' | 'abbess';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  damage: number;
  dependencies: number[];
  disabled: boolean;
  cutAt: number;
  index: number;
};
type Tether = Life &
  Vec & {
    kind: 'service-tether';
    targetId: string;
    endX: number;
    endY: number;
    radius: number;
    health: number;
    maxHealth: number;
    progress: number;
    attached: boolean;
    checked: boolean;
    damage: number;
  };
type Loaf = Life &
  Vec & {
    kind: 'service-loaf';
    oldX: number;
    oldY: number;
    originX: number;
    originY: number;
    endX: number;
    endY: number;
    angle: number;
    radius: number;
    speed: number;
    splitAt: number;
    damage: number;
  };
type Current = Life & Rect & { kind: 'service-current'; forceX: number; forceY: number };
type Rail = Life & {
  kind: 'service-rail';
  x: number;
  y: number;
  width: number;
  height: number;
  trainY: number;
  oldTrainY: number;
  trainHeight: number;
  open: boolean;
  speed: number;
  damage: number;
};
type Sanctuary = Life &
  Vec & {
    kind: 'service-sanctuary';
    style: 'lamp' | 'abbess';
    pads: Vec[];
    starts: Vec[];
    ends: Vec[];
    safeRadius: number;
    radius: number;
    oldRadius: number;
    speed: number;
    width: number;
    damage: number;
    progress: number[];
    neutralized: boolean;
  };
type Caliper = Life &
  Vec & {
    kind: 'service-caliper';
    targetId: string;
    lockAt: number;
    radius: number;
    damage: number;
  };
type Verdict = Life & Rect & { kind: 'service-verdict'; side: number; damage: number };
type Spiral = Life &
  Vec & {
    kind: 'service-spiral';
    angle: number;
    count: number;
    emitted: number;
    speed: number;
    damage: number;
  };
export type ServiceCue =
  | BellCue
  | MoldCue
  | MatronCue
  | ServiceProp
  | Pool
  | Ring
  | Beam
  | Tether
  | Loaf
  | Current
  | Rail
  | Sanctuary
  | Caliper
  | Verdict
  | Spiral;
export type ServiceAttack = {
  kind: string;
  interval?: number;
  count: number;
  speed: number;
  damage: number;
  telegraph: number;
  radius?: number;
  duration?: number;
  width?: number;
  gap?: number;
};
const ticks = (seconds: number) => Math.ceil(seconds * HZ),
  forever = 1e12;
const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function serviceMovement(
  cues: readonly { kind: string }[],
  position: Vec,
  id: string,
  now: number,
) {
  let x = 0,
    y = 0,
    multiplier = 1;
  for (const untyped of cues) {
    const cue = untyped as ServiceCue;
    if (now < cue.at || now >= cue.until) continue;
    if (
      cue.kind === 'service-current' &&
      position.x >= cue.x &&
      position.x <= cue.x + cue.width &&
      position.y >= cue.y &&
      position.y <= cue.y + cue.height
    ) {
      x += cue.forceX;
      y += cue.forceY;
    }
    if (cue.kind === 'service-pool' && distance(position, cue) <= cue.radius + 9)
      multiplier = Math.min(multiplier, 0.65);
    if (cue.kind === 'service-tether' && cue.targetId === id && cue.attached && cue.health > 0)
      multiplier = Math.min(multiplier, 0.5);
  }
  return { x, y, multiplier:Math.min(multiplier,moldMovement(cues,position,now)) };
}
/** Exact swept body against a line capsule, including its round endpoint caps. */
export function serviceBeamContact(
  from: Vec,
  to: Vec,
  beam: { x1: number; y1: number; x2: number; y2: number; width: number },
  body = 9,
) {
  const dx = beam.x2 - beam.x1,
    dy = beam.y2 - beam.y1,
    length = Math.hypot(dx, dy),
    angle = Math.atan2(dy, dx),
    c = Math.cos(angle),
    s = Math.sin(angle),
    r = body + beam.width / 2;
  const local = (p: Vec) => ({
    x: (p.x - beam.x1) * c + (p.y - beam.y1) * s,
    y: -(p.x - beam.x1) * s + (p.y - beam.y1) * c,
  });
  return (
    segmentRect(local(from), local(to), { x: 0, y: -r, width: length, height: r * 2 }) !== null ||
    segmentCircle(from, to, { x: beam.x1, y: beam.y1 }, r) !== null ||
    segmentCircle(from, to, { x: beam.x2, y: beam.y2 }, r) !== null
  );
}
export class ServiceDirector {
  readonly matron=new MatronWard();
  readonly alchemist=new MoldMixing();
  readonly bellringer=new BellCarillon();
  private kind = '';
  private castIndex = 0;
  nextSignatureAt = 0;
  private shapes: ServiceCue[] = [];
  private contacts = new Map<string, number>();
  private once = new Set<string>();
  reset(kind: string, encounter = false) {
    this.matron.reset(0,encounter||kind!==this.kind);
    this.alchemist.reset(0,encounter||kind!==this.kind);
    this.bellringer.reset(0,encounter||kind!==this.kind);
    const keepChoir = kind === this.kind && kind === 'choir' && !encounter;
    this.shapes = keepChoir
      ? this.shapes.filter((c) => c.kind === 'service-prop' && c.role === 'caster')
      : [];
    if (kind !== this.kind || encounter) this.castIndex = 0;
    this.kind = kind;
    this.contacts.clear();
    this.once.clear();
  }
  handles(kind: string) {
    return serviceBossIds.some((id) => id === kind);
  }
  movement(position: Vec, id: string, now: number) {
    const move=serviceMovement(this.shapes, position, id, now);
    return {...move,multiplier:Math.min(move.multiplier,moldMovement(this.alchemist.cues(),position,now))};
  }
  cues(): ServiceCue[] {
    return [...this.bellringer.cues(),...this.alchemist.cues(),...this.matron.cues(),...this.shapes.map((c) => {
      if (c.kind === 'service-sanctuary')
        return {
          ...c,
          pads: c.pads.map((p) => ({ ...p })),
          starts: c.starts.map((p) => ({ ...p })),
          ends: c.ends.map((p) => ({ ...p })),
          progress: [...c.progress],
        };
      if (c.kind === 'service-beam') return { ...c, dependencies: [...c.dependencies] };
      return { ...c };
    })];
  }
  weakPoints() {
    return [...this.matron.weakPoints(),...this.shapes.filter(
      (c): c is ServiceProp | Tether =>
        (c.kind === 'service-prop' || c.kind === 'service-tether') && c.health > 0,
    )];
  }
  transfersDamage(id: number) {
    return this.shapes.some((c) => c.id === id && c.kind === 'service-prop' && c.role === 'caster');
  }
  hit(id: number, damage: number, now: number) {
    const matron=this.matron.hit(id,damage);if(matron)return matron;
    const prop = this.weakPoints().find((p) => p.id === id);
    if (!prop) return 0;
    const actual = Math.min(prop.health, Math.max(0, damage));
    prop.health -= actual;
    if (prop.health <= 0) {
      if (prop.kind === 'service-tether') {
        prop.attached = false;
        prop.until = now;
      }
      for (const cue of this.shapes)
        if (cue.kind === 'service-beam' && cue.dependencies.includes(id)) {
          if (cue.style === 'vine') cue.cutAt = Math.max(1, now);
          else cue.disabled = true;
        }
    }
    return actual;
  }
  private bounds(c: SignatureContext) {
    return c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
  }
  private free(c: SignatureContext, point: Vec, radius = 24) {
    const b = this.bounds(c),
      base = {
        x: clamp(point.x, b.x + radius + 3, b.x + b.width - radius - 3),
        y: clamp(point.y, b.y + radius + 3, b.y + b.height - radius - 3),
      };
    for (let offset = 0; offset <= 600; offset += 24)
      for (let n = 0; n < 16; n++) {
        const p = {
          x: clamp(
            base.x + Math.cos((n * Math.PI) / 8) * offset,
            b.x + radius + 3,
            b.x + b.width - radius - 3,
          ),
          y: clamp(
            base.y + Math.sin((n * Math.PI) / 8) * offset,
            b.y + radius + 3,
            b.y + b.height - radius - 3,
          ),
        };
        if (!c.obstacles.some((o) => segmentRect(p, p, o, radius) !== null)) return p;
      }
    throw Error('Arena has no clear signature position');
  }
  private prop(
    c: SignatureContext,
    role: ServiceProp['role'],
    point: Vec,
    health: number,
    index: number,
    at = c.tick,
  ) {
    const radius = role === 'nest' ? 32 : role === 'caster' ? 24 : 18;
    const p: ServiceProp = {
      kind: 'service-prop',
      id: c.id(),
      role,
      ...this.free(c, point, radius),
      radius,
      health: health * (c.brutal ? 2 : 1),
      maxHealth: health * (c.brutal ? 2 : 1),
      index,
      at,
      until: forever,
      nextAt: at,
    };
    this.shapes.push(p);
    return p;
  }
  private end(c: SignatureContext, from: Vec, target: Vec, range = 1900, pad = 0) {
    const angle = Math.atan2(target.y - from.y, target.x - from.x),
      end = { x: from.x + Math.cos(angle) * range, y: from.y + Math.sin(angle) * range };
    let fraction = 1;
    for (const o of c.obstacles) {
      const hit = segmentRect(from, end, o, pad);
      if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.001));
    }
    return { x: from.x + (end.x - from.x) * fraction, y: from.y + (end.y - from.y) * fraction };
  }
  private beam(
    c: SignatureContext,
    from: Vec,
    to: Vec,
    style: Beam['style'],
    at: number,
    duration: number,
    width: number,
    damage: number,
    dependencies: number[] = [],
    index = 0,
  ) {
    const beam: Beam = {
      kind: 'service-beam',
      id: c.id(),
      style,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      width,
      damage,
      dependencies,
      disabled: false,
      cutAt: 0,
      index,
      at,
      until: at + ticks(duration),
    };
    this.shapes.push(beam);
    return beam;
  }
  cast(c: SignatureContext, target: Vec, attack: ServiceAttack) {
    if (!this.handles(c.bossId)) return false;
    if(c.bossId==='matron')return this.matron.cast(c,target);
    if(c.bossId==='alchemist')return this.alchemist.cast(c,target);
    if(c.bossId==='bellringer')return this.bellringer.cast(c,target);
    const now = c.tick,
      at = now + ticks(attack.telegraph),
      index = this.castIndex++,
      b = this.bounds(c),
      center = { x: b.x + b.width / 2, y: b.y + b.height / 2 },
      visible = c.aimTargets ?? c.targets;
    const mechanics = catalog.bosses.find((b) => b.id === c.bossId)!.mechanics;
    this.nextSignatureAt =
      now +
      ticks(
        mechanics.cycleSeconds
          ? mechanics.cycleSeconds * Math.max(0.7, 1 - c.phase * 0.1)
          : (attack.interval ?? 8),
      );
    switch (c.bossId) {
      case 'stitchwright': {
        const aimed = visible[index % Math.max(1, visible.length)];
        if (!aimed) break;
        const point = this.free(c, { x: aimed.x + 65, y: aimed.y - 35 });
        this.shapes.push({
          kind: 'service-tether',
          id: c.id(),
          ...point,
          targetId: aimed.id,
          endX: aimed.x,
          endY: aimed.y,
          radius: 24,
          health: 45 * (c.brutal ? 2 : 1),
          maxHealth: 45 * (c.brutal ? 2 : 1),
          progress: 0,
          attached: false,
          checked: false,
          damage: attack.damage,
          at,
          until: at + ticks(4),
        });
        break;
      }
      case 'glass-surgeon': {
        this.shapes = this.shapes.filter((s) => s.kind !== 'service-prop' || s.role !== 'needle');
        const points = [
          { x: target.x - 190, y: target.y - 145 },
          { x: target.x + 190, y: target.y - 145 },
          { x: target.x + 190, y: target.y + 145 },
          { x: target.x - 190, y: target.y + 145 },
        ].map((p, n) => this.prop(c, 'needle', p, 35, n, at));
        for (let n = 0; n < 4; n++)
          if (n !== index % 4)
            this.beam(
              c,
              points[n],
              points[(n + 1) % 4],
              'glass',
              now + ticks(1.4),
              2.5,
              14,
              attack.damage,
              [points[n].id, points[(n + 1) % 4].id],
              n,
            );
        break;
      }
      case 'ash-baker': {
        const aim = Math.atan2(target.y - c.boss.y, target.x - c.boss.x);
        for (let n = 0; n < 3; n++) {
          const angle = aim + (n - 1) * 0.55,
            end = this.end(
              c,
              c.boss,
              { x: c.boss.x + Math.cos(angle), y: c.boss.y + Math.sin(angle) },
              150,
              22,
            );
          this.shapes.push({
            kind: 'service-loaf',
            id: c.id(),
            x: c.boss.x,
            y: c.boss.y,
            oldX: c.boss.x,
            oldY: c.boss.y,
            originX: c.boss.x,
            originY: c.boss.y,
            endX: end.x,
            endY: end.y,
            angle,
            radius: 22,
            speed: 100,
            splitAt: at + ticks(1.5),
            damage: attack.damage,
            at,
            until: at + ticks(1.5),
          });
        }
        break;
      }
      case 'sluice-keeper': {
        for (let n = 0; n < 3; n++)
          this.shapes.push({
            kind: 'service-current',
            id: c.id(),
            x: b.x,
            y: b.y + Math.max(180, b.height * 0.24) + n * (b.height * 0.22),
            width: b.width,
            height: 190,
            forceX: (n + index) % 2 ? 65 : -65,
            forceY: 0,
            at: now + ticks(1.5),
            until: now + ticks(5.5),
          });
        break;
      }
      case 'stationmaster': {
        for (let n = 0; n < 2; n++)
          this.shapes.push({
            kind: 'service-rail',
            id: c.id(),
            x: b.x + b.width * (n ? 0.67 : 0.33),
            y: b.y,
            width: 125,
            height: b.height,
            trainY: b.y - 150,
            oldTrainY: b.y - 150,
            trainHeight: 150,
            open: n !== index % 2,
            speed: 300,
            damage: attack.damage,
            at: now + ticks(1.5),
            until: now + ticks(1.5 + (b.height + 300) / 300),
          });
        break;
      }
      case 'lamplighter':
      case 'red-abbess': {
        const lamp = c.bossId === 'lamplighter',
          count = lamp ? 3 : 2,
          safeRadius = lamp ? 95 : 100;
        const ends = Array.from({ length: count }, (_, n) =>
          this.free(
            c,
            {
              x: b.x + b.width * (lamp ? [0.28, 0.5, 0.72][n] : n ? 0.72 : 0.28),
              y:
                b.y +
                b.height *
                  (lamp ? [0.72, 0.54, 0.72][n] : index % 2 ? (n ? 0.57 : 0.77) : n ? 0.77 : 0.57),
            },
            safeRadius + 10,
          ),
        );
        const starts = ends.map((p, n) =>
            this.free(c, { x: p.x + (n % 2 ? 80 : -80), y: p.y - 55 }, safeRadius + 10),
          ),
          startRadius = Math.hypot(b.width, b.height) / 2 + 40;
        if (!lamp)
          this.nextSignatureAt = Math.max(
            this.nextSignatureAt,
            now + ticks(1.6 + startRadius / 90 + 0.7),
          );
        this.shapes.push({
          kind: 'service-sanctuary',
          id: c.id(),
          style: lamp ? 'lamp' : 'abbess',
          ...center,
          pads: starts.map((p) => ({ ...p })),
          starts,
          ends,
          safeRadius,
          radius: startRadius,
          oldRadius: startRadius,
          speed: lamp ? 0 : 90,
          width: 40,
          damage: attack.damage,
          progress: Array(count).fill(0),
          neutralized: false,
          at: now + ticks(lamp ? 1.5 : 1.6),
          until: now + ticks(lamp ? 2.7 : 1.6 + startRadius / 90 + 0.1),
        });
        break;
      }
      case 'anatomist': {
        for (let n = 0; n < Math.min(2, visible.length); n++) {
          const t = visible[(index + n) % visible.length];
          this.shapes.push({
            kind: 'service-caliper',
            id: c.id(),
            x: t.x,
            y: t.y,
            targetId: t.id,
            lockAt: now + ticks(0.7),
            radius: 70,
            damage: 16,
            at: now + ticks(1.6),
            until: now + ticks(1.8),
          });
        }
        break;
      }
      case 'plague-gardener': {
        this.shapes = this.shapes.filter((s) => s.kind !== 'service-prop' || s.role !== 'root');
        for (let n = 0; n < 4; n++) {
          const angle = Math.PI / 4 + (n * Math.PI) / 2,
            root = this.prop(
              c,
              'root',
              { x: center.x + Math.cos(angle) * 350, y: center.y + Math.sin(angle) * 280 },
              70,
              n,
              at,
            ),
            beam = this.beam(
              c,
              center,
              root,
              'vine',
              now + ticks(1.4),
              6,
              35,
              attack.damage,
              [root.id],
              n,
            );
          if (n === index % 4) beam.cutAt = beam.at + ticks(3);
        }
        break;
      }
      case 'choir': {
        let casters = this.weakPoints().filter(
          (p): p is ServiceProp => p.kind === 'service-prop' && p.role === 'caster',
        );
        if (!this.shapes.some((p) => p.kind === 'service-prop' && p.role === 'caster'))
          casters = [-220, 0, 220].map((dx, n) =>
            this.prop(
              c,
              'caster',
              { x: c.boss.x + dx, y: c.boss.y + (n === 1 ? -30 : 25) },
              ((c.bossMaximumHealth ?? 1000) * 0.34) / (c.brutal ? 2 : 1),
              n,
              now,
            ),
          );
        for (const caster of casters) {
          const end = this.end(c, caster, target);
          this.beam(
            c,
            caster,
            end,
            'choir',
            at + ticks(caster.index * 0.45),
            0.6,
            26,
            attack.damage,
            [caster.id],
            caster.index,
          );
        }
        break;
      }
      case 'vesper-judge': {
        const side = index % 2;
        this.shapes.push({
          kind: 'service-verdict',
          id: c.id(),
          x: b.x + (side ? b.width / 2 : 0),
          y: b.y,
          width: b.width / 2,
          height: b.height,
          side,
          damage: attack.damage,
          at: now + ticks(1.7),
          until: now + ticks(2.3),
        });
        break;
      }
    }
    return true;
  }
  supplement(c: SignatureContext, target: Vec, attack: ServiceAttack) {
    const at = c.tick + ticks(attack.telegraph);
    if (attack.kind === 'beam') {
      const angle = Math.atan2(target.y - c.boss.y, target.x - c.boss.x);
      for (let n = 0; n < Math.min(4, attack.count); n++) {
        const theta = angle + (n - (Math.min(4, attack.count) - 1) / 2) * 0.25,
          end = this.end(c, c.boss, {
            x: c.boss.x + Math.cos(theta),
            y: c.boss.y + Math.sin(theta),
          });
        this.beam(
          c,
          c.boss,
          end,
          'abbess',
          at,
          attack.duration ?? 0.6,
          attack.width ?? 22,
          attack.damage,
        );
      }
      return true;
    }
    if (attack.kind === 'spiral') {
      const count = Math.min(60, attack.count);
      this.shapes.push({
        kind: 'service-spiral',
        id: c.id(),
        x: c.boss.x,
        y: c.boss.y,
        angle: this.castIndex * 0.6,
        count,
        emitted: 0,
        speed: attack.speed,
        damage: attack.damage,
        at,
        until: at + count * 2 + 1,
      });
      return true;
    }
    return false;
  }
  private touch(
    c: SignatureContext,
    cue: ServiceCue,
    target: { id: string },
    damage: number,
    repeat = false,
  ) {
    const key = cue.id + ':' + target.id;
    if (repeat) {
      if (c.tick < (this.contacts.get(key) ?? 0)) return;
      this.contacts.set(key, c.tick + ticks(0.5));
    } else {
      if (this.once.has(key)) return;
      this.once.add(key);
    }
    c.damage(target.id, damage * c.damageScale);
  }
  private activeBeam(beam: Beam, now: number) {
    return !beam.disabled && (!beam.cutAt || now < beam.cutAt);
  }
  prepare(c: SignatureContext) {
    if (
      c.bossId === 'choir' &&
      !this.shapes.some((p) => p.kind === 'service-prop' && p.role === 'caster')
    )
      [-220, 0, 220].forEach((dx, n) =>
        this.prop(
          c,
          'caster',
          { x: c.boss.x + dx, y: c.boss.y + (n === 1 ? -30 : 25) },
          ((c.bossMaximumHealth ?? 1000) * 0.34) / (c.brutal ? 2 : 1),
          n,
          c.tick,
        ),
      );
  }
  step(c: SignatureContext) {
    if(c.bossId==='matron'){this.matron.step(c);return;}
    if(c.bossId==='alchemist'){this.alchemist.step(c);return;}
    if(c.bossId==='bellringer'){this.bellringer.step(c);return;}
    this.prepare(c);
    const now = c.tick;
    for (const cue of this.shapes) {
      if (cue.kind === 'service-caliper' && now <= cue.lockAt) {
        const p = c.targets.find((p) => p.id === cue.targetId);
        if (p) {
          cue.x = p.x;
          cue.y = p.y;
        }
      }
      if (cue.kind === 'service-sanctuary' && now < cue.at) {
        const duration = ticks(cue.style === 'lamp' ? 1.5 : 1.6),
          t = clamp(1 - (cue.at - now) / duration, 0, 1);
        cue.pads = cue.ends.map((p, i) => ({
          x: cue.starts[i].x + (p.x - cue.starts[i].x) * t,
          y: cue.starts[i].y + (p.y - cue.starts[i].y) * t,
        }));
      }
      if (now < cue.at || (now >= cue.until && cue.kind !== 'service-loaf')) continue;
      if (
        cue.kind === 'service-prop' &&
        cue.role === 'nest' &&
        cue.health > 0 &&
        now >= cue.nextAt
      ) {
        cue.nextAt = now + ticks(6);
        for (let n = 0; n < 2; n++)
          c.spawnOrdinary?.(
            this.free(c, { x: cue.x + (n ? 22 : -22), y: cue.y + 40 }, 12),
            80 + c.phase * 6,
            45,
            9 * c.damageScale,
            18,
          );
      } else if (cue.kind === 'service-ring') {
        cue.oldRadius = cue.radius;
        cue.radius = Math.max(0, (now - cue.at) * DT * cue.speed);
        for (const p of c.targets)
          if (serviceRingContact({ x: p.oldX, y: p.oldY }, p, cue))
            this.touch(c, cue, p, cue.damage);
      } else if (cue.kind === 'service-pool') {
        for (const p of c.targets)
          if (segmentCircle({ x: p.oldX, y: p.oldY }, p, cue, cue.radius + 9) !== null)
            this.touch(c, cue, p, cue.damage, true);
      } else if (cue.kind === 'service-tether') {
        const p = c.targets.find((p) => p.id === cue.targetId);
        if (!p || cue.health <= 0) {
          cue.until = now;
          continue;
        }
        if (!cue.checked) {
          cue.checked = true;
          cue.attached = distance(p, { x: cue.endX, y: cue.endY }) <= 70;
          if (cue.attached) this.touch(c, cue, p, cue.damage);
          else cue.until = now;
        }
        cue.endX = p.x;
        cue.endY = p.y;
        if (distance(p, cue) > 350) {
          cue.attached = false;
          cue.until = now;
        }
        const rescue = c.targets.some(
          (p) => distance(p, cue) <= 85 && c.interactors?.includes(p.id),
        );
        cue.progress = rescue ? cue.progress + 1 : 0;
        if (cue.progress >= ticks(1)) {
          cue.health = 0;
          cue.attached = false;
          cue.until = now;
        }
      } else if (cue.kind === 'service-beam') {
        if (cue.cutAt && now >= cue.cutAt) {
          for (const p of c.targets) {
            const key = 'heal:' + cue.id + ':' + p.id;
            if (!this.once.has(key) && serviceBeamContact(p, p, cue)) {
              this.once.add(key);
              c.restore?.(p.id, 10);
            }
          }
        } else if (this.activeBeam(cue, now))
          for (const p of c.targets)
            if (serviceBeamContact({ x: p.oldX, y: p.oldY }, p, cue))
              this.touch(c, cue, p, cue.damage, true);
      } else if (cue.kind === 'service-loaf') {
        cue.oldX = cue.x;
        cue.oldY = cue.y;
        const length = Math.hypot(cue.endX - cue.originX, cue.endY - cue.originY),
          travel = length ? Math.min(1, ((now - cue.at) * DT * cue.speed) / length) : 1;
        cue.x = cue.originX + (cue.endX - cue.originX) * travel;
        cue.y = cue.originY + (cue.endY - cue.originY) * travel;
        for (const p of c.targets)
          if (
            segmentCircle(
              { x: p.oldX - cue.oldX, y: p.oldY - cue.oldY },
              { x: p.x - cue.x, y: p.y - cue.y },
              { x: 0, y: 0 },
              cue.radius + 9,
            ) !== null
          )
            this.touch(c, cue, p, cue.damage);
        if (now >= cue.splitAt) {
          for (const turn of [-Math.PI / 3, Math.PI / 3])
            c.emitHostile?.(cue, cue.angle + turn, 165, cue.damage * c.damageScale, 5);
          cue.until = now;
        }
      } else if (cue.kind === 'service-rail' && !cue.open) {
        cue.oldTrainY = cue.trainY;
        cue.trainY = cue.y - 150 + (now - cue.at) * DT * cue.speed;
        for (const p of c.targets)
          if (
            segmentRect(
              { x: p.oldX, y: p.oldY - cue.oldTrainY },
              { x: p.x, y: p.y - cue.trainY },
              { x: cue.x - cue.width / 2, y: 0, width: cue.width, height: cue.trainHeight },
              9,
            ) !== null
          )
            this.touch(c, cue, p, cue.damage);
      } else if (cue.kind === 'service-sanctuary') {
        cue.pads = cue.ends.map((p) => ({ ...p }));
        if (cue.style === 'lamp') {
          for (const p of c.targets)
            if (!cue.pads.some((pad) => distance(p, pad) + 9 <= cue.safeRadius))
              this.touch(c, cue, p, cue.damage, true);
        } else {
          for (let i = 0; i < cue.pads.length; i++)
            cue.progress[i] = c.targets.some((p) => distance(p, cue.pads[i]) + 9 <= cue.safeRadius)
              ? cue.progress[i] + 1
              : 0;
          if (cue.progress.some((v) => v >= ticks(1.2))) cue.neutralized = true;
          cue.oldRadius = cue.radius;
          cue.radius = Math.max(0, cue.radius - cue.speed * DT);
          if (!cue.neutralized)
            for (const p of c.targets)
              if (
                !cue.pads.some((pad) => distance(p, pad) + 9 <= cue.safeRadius) &&
                serviceRingContact({ x: p.oldX, y: p.oldY }, p, cue)
              )
                this.touch(c, cue, p, cue.damage);
        }
      } else if (cue.kind === 'service-caliper') {
        for (const p of c.targets)
          if (segmentCircle({ x: p.oldX, y: p.oldY }, p, cue, cue.radius + 9) !== null)
            this.touch(c, cue, p, cue.damage);
      } else if (cue.kind === 'service-verdict') {
        for (const p of c.targets)
          if (segmentRect({ x: p.oldX, y: p.oldY }, p, cue, 9) !== null)
            this.touch(c, cue, p, cue.damage);
      } else if (cue.kind === 'service-spiral') {
        while (cue.emitted < cue.count && now >= cue.at + cue.emitted * 2) {
          c.emitHostile?.(
            cue,
            cue.angle + (cue.emitted * Math.PI * 2) / cue.count,
            cue.speed,
            cue.damage * c.damageScale,
            5,
          );
          cue.emitted++;
        }
      }
    }
    this.shapes = this.shapes.filter(
      (cue) =>
        now < cue.until && (cue.kind !== 'service-prop' || cue.health > 0 || cue.role === 'caster'),
    );
    const live = new Set(this.shapes.map((c) => String(c.id)));
    for (const key of this.contacts.keys())
      if (!live.has(key.split(':')[0])) this.contacts.delete(key);
    for (const key of this.once)
      if (!live.has(key.split(':')[key.startsWith('heal:') ? 1 : 0])) this.once.delete(key);
  }
}
