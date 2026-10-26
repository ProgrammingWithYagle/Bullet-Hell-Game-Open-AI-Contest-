import { HZ, type Vec, type Field } from './protocol.ts';
import { hasTalent, type TalentId } from './class-talents.ts';
import type { Player, Stats } from './game.ts';
import type { KitContext, ClassKits } from './class-kits.ts';
import { distance } from './geometry.ts';
const ticks = (s: number) => Math.ceil(s * HZ);
export type TalentCue = {
  kind: 'talent-area' | 'talent-link';
  id: number;
  owner: string;
  talent: TalentId;
  x: number;
  y: number;
  x2: number;
  y2: number;
  radius: number;
  at: number;
  until: number;
};
export type TransformContext = {
  tick: number;
  players: Player[];
  fields: Field[];
  kits: ClassKits;
  kit: KitContext;
  id(): number;
  stats(p: Player): Stats;
  shot(
    p: Player,
    point: Vec,
    angle: number,
    speed: number,
    damage: number,
    pierce: number,
    life?: number,
    slowSeconds?: number,
  ): void;
  heal(source: Player, target: Player, amount: number): void;
};
type Task = {
  owner: string;
  at: number;
  run: (p: Player, c: TransformContext) => void;
};
type Procession = {
  owner: string;
  until: number;
  radius: number;
  shield: number;
  armor: number;
  given: Set<string>;
  cue: TalentCue;
};
export class AbilityTransforms {
  private tasks: Task[] = [];
  private marks: TalentCue[] = [];
  private processions: Procession[] = [];
  clear() {
    this.tasks = [];
    this.marks = [];
    this.processions = [];
  }
  private later(owner: string, at: number, run: Task['run']) {
    if (this.tasks.filter((t) => t.owner === owner).length < 64)
      this.tasks.push({ owner, at, run });
  }
  private cue(
    p: Player,
    talent: TalentId,
    point: Vec,
    radius: number,
    at: number,
    until: number,
    c: TransformContext,
    to = point,
  ) {
    const mark: TalentCue = {
      kind: point === to ? 'talent-area' : 'talent-link',
      id: c.id(),
      owner: p.id,
      talent,
      x: point.x,
      y: point.y,
      x2: to.x,
      y2: to.y,
      radius,
      at,
      until,
    };
    this.marks.push(mark);
    return mark;
  }
  private healRing(
    p: Player,
    point: Vec,
    radius: number,
    pulses: number,
    amount: number,
    talent: TalentId,
    c: TransformContext,
  ) {
    const location = { ...point };
    this.cue(p, talent, location, radius, c.tick, c.tick + ticks(pulses), c);
    for (let i = 1; i <= pulses; i++)
      this.later(p.id, c.tick + ticks(i), (owner, next) => {
        for (const ally of next.players)
          if (ally.status === 'active' && distance(ally, location) <= radius)
            next.heal(owner, ally, amount);
      });
  }
  // Overrides keep the normal cooldown assignment but replace the cast's behavior.
  cast(p: Player, slot: 'q' | 'e' | 'ultimate', c: TransformContext) {
    const s = c.stats(p),
      now = c.tick;
    if (
      p.classId === 'soldier' &&
      slot === 'e' &&
      hasTalent(p, 'breach-cadence')
    ) {
      const aim = p.aim,
        damage = (45 * s.ability) / 3;
      const shoot = (owner: Player, next: TransformContext) =>
        next.shot(owner, owner, aim, 900, damage, 1);
      shoot(p, c);
      this.later(p.id, now + ticks(0.12), shoot);
      this.later(p.id, now + ticks(0.24), shoot);
      return true;
    }
    if (
      p.classId === 'heavy' &&
      slot === 'q' &&
      hasTalent(p, 'split-suppression')
    ) {
      for (const side of [-1, 1])
        for (let i = 0; i < 7; i++)
          c.shot(
            p,
            p,
            p.aim + ((side * 26 + (i / 6 - 0.5) * 22) * Math.PI) / 180,
            700,
            (45 * s.ability) / 14,
            s.pierce,
            220 / 700,
            3 * (1 + (s.effects.suppressionDuration ?? 0)),
          );
      return true;
    }
    if (p.classId === 'medic' && slot === 'e' && hasTalent(p, 'serum-relay')) {
      let point: Vec = p;
      const used = new Set<string>();
      for (let hop = 0; hop < 3; hop++) {
        const ally = c.players
          .filter(
            (a) =>
              a.status === 'active' &&
              !used.has(a.id) &&
              distance(point, a) <= 140,
          )
          .sort(
            (a, b) =>
              a.health / a.maxHealth - b.health / b.maxHealth ||
              a.id.localeCompare(b.id),
          )[0];
        if (!ally) break;
        used.add(ally.id);
        c.heal(p, ally, 20 * s.ability);
        ally.slowUntil = 0;
        this.cue(
          p,
          'serum-relay',
          { x: point.x, y: point.y },
          0,
          now,
          now + ticks(0.6),
          c,
          { x: ally.x, y: ally.y },
        );
        point = ally;
      }
      return true;
    }
    if (
      p.classId === 'tank' &&
      slot === 'ultimate' &&
      hasTalent(p, 'procession')
    ) {
      const cue = this.cue(
        p,
        'procession',
        { x: p.x, y: p.y },
        230,
        now,
        now + ticks(8),
        c,
      );
      this.processions = this.processions.filter((a) => a.owner !== p.id);
      this.processions.push({
        owner: p.id,
        until: cue.until,
        radius: 230,
        shield: 90 * (1 + (s.effects.ultimatePotency ?? 0)),
        armor: 0.35 * (1 + (s.effects.ultimatePotency ?? 0)),
        given: new Set(),
        cue,
      });
      return true;
    }
    if (
      p.classId === 'mage' &&
      slot === 'ultimate' &&
      hasTalent(p, 'orbit-requiem')
    ) {
      const pulses = 3 + Math.floor(s.effects.ultimatePulses ?? 0),
        damage = 40 * (1 + (s.effects.ultimatePotency ?? 0));
      c.kit.erase(p, 300);
      for (let i = 0; i < pulses; i++)
        this.later(
          p.id,
          now + Math.floor((ticks(3) * i) / pulses),
          (owner, next) => {
            for (let arm = 0; arm < 3; arm++) {
              const angle =
                (arm * Math.PI * 2) / 3 + ((next.tick - now) / HZ) * 1.7;
              const point = {
                x: owner.x + Math.cos(angle) * 140,
                y: owner.y + Math.sin(angle) * 140,
              };
              next.kit.area(owner, point, 110, damage, 0.3, ticks(0.4));
              this.cue(
                owner,
                'orbit-requiem',
                point,
                110,
                next.tick,
                next.tick + ticks(0.45),
                next,
              );
            }
          },
        );
      return true;
    }
    return false;
  }
  afterCast(
    p: Player,
    slot: 'q' | 'e' | 'ultimate',
    before: Vec,
    empowered: boolean,
    c: TransformContext,
  ) {
    const s = c.stats(p),
      now = c.tick;
    if (p.classId === 'soldier') {
      if (slot === 'q' && hasTalent(p, 'marching-colors')) {
        const f = c.fields.findLast(
          (f) => f.owner === p.id && f.kind === 'rally',
        );
        if (f) {
          f.anchor = p.id;
          f.radius *= 0.75;
        }
      }
      if (slot === 'ultimate' && hasTalent(p, 'supply-line')) {
        const f = c.fields.findLast(
          (f) => f.owner === p.id && f.kind === 'rally',
        );
        if (f) {
          f.potency *= 5 / 7;
          const at = now + Math.floor((f.until - now) / 2),
            point = { x: f.x, y: f.y };
          this.cue(p, 'supply-line', point, f.radius, at, f.until, c);
          this.later(p.id, at, (_, next) => {
            for (const ally of next.players)
              if (
                ally.status === 'active' &&
                distance(point, ally) <= f.radius
              ) {
                ally.ammo = next.stats(ally).magazine;
                ally.reloadAt = 0;
              }
          });
        }
      }
    }
    if (p.classId === 'heavy') {
      if (slot === 'e' && hasTalent(p, 'shoulder-mantlet'))
        c.kits.extraWall(p, c.kit, {
          point: p,
          source: 'mantlet',
          health: 80 * s.ability,
          seconds: Math.max(0, (p.braceUntil - now) / HZ),
          follow: true,
          halfSpan: 65,
        });
      if (slot === 'ultimate' && hasTalent(p, 'furnace-vents'))
        for (let at = now + ticks(1); at < p.overdriveUntil; at += ticks(2))
          this.later(p.id, at, (owner, next) => {
            if (next.tick >= owner.overdriveUntil) return;
            for (let i = 0; i < 8; i++)
              next.shot(
                owner,
                owner,
                (i * Math.PI) / 4,
                400,
                (30 * (1 + (s.effects.ultimatePotency ?? 0))) / 8,
                0,
                0.7,
              );
            this.cue(
              owner,
              'furnace-vents',
              { x: owner.x, y: owner.y },
              280,
              next.tick,
              next.tick + ticks(0.35),
              next,
            );
          });
    }
    if (p.classId === 'tank' && slot === 'e' && hasTalent(p, 'wake-guard'))
      c.kits.extraWall(p, c.kit, {
        point: before,
        source: 'wake',
        health: 80 * s.ability,
        seconds: 2,
        halfSpan: 65,
      });
    if (p.classId === 'medic' && slot === 'q' && hasTalent(p, 'field-triage')) {
      const f = c.fields.findLast((f) => f.owner === p.id && f.kind === 'heal');
      const ally = c.players
        .filter((a) => a.status === 'active' && distance(p, a) <= 300)
        .sort(
          (a, b) =>
            a.health / a.maxHealth - b.health / b.maxHealth ||
            a.id.localeCompare(b.id),
        )[0];
      if (f && ally) {
        f.anchor = ally.id;
        f.radius *= 0.75;
        f.x = ally.x;
        f.y = ally.y;
      }
    }
    if (p.classId === 'mage' && slot === 'e' && hasTalent(p, 'ward-echo')) {
      const ward = c.kits
        .cues()
        .findLast((a) => a.kind === 'ward' && a.owner === p.id && a.at === now);
      if (ward) {
        const point = { x: ward.x, y: ward.y };
        this.cue(
          p,
          'ward-echo',
          point,
          145,
          now + ticks(0.75),
          now + ticks(1.1),
          c,
        );
        this.later(p.id, now + ticks(0.75), (owner, next) =>
          next.kit.area(owner, point, 145, 25 * s.ability),
        );
      }
    }
    if (p.classId === 'assassin' && slot === 'e') {
      if (hasTalent(p, 'aftercut')) {
        const from = { ...before },
          to = { x: p.x, y: p.y },
          damage =
            (empowered
              ? 100 * (1 + (s.effects.ultimatePotency ?? 0))
              : 50 * s.ability) * 0.4;
        this.cue(
          p,
          'aftercut',
          from,
          45,
          now + ticks(0.45),
          now + ticks(0.8),
          c,
          to,
        );
        this.later(p.id, now + ticks(0.45), (owner, next) =>
          next.kit.sweep(owner, from, to, 45, damage, new Set()),
        );
      }
      if (empowered && hasTalent(p, 'unwritten-traps')) {
        const point = { ...before };
        this.cue(p, 'unwritten-traps', point, 65, now, now + ticks(2), c);
        for (let i = 0; i < 3; i++)
          this.later(p.id, now + ticks(i * 0.65), (owner, next) =>
            next.kit.area(
              owner,
              point,
              65,
              20 * (1 + (s.effects.ultimatePotency ?? 0)),
            ),
          );
      }
    }
  }
  afterResurrection(p: Player, c: TransformContext) {
    if (hasTalent(p, 'second-breath'))
      this.healRing(
        p,
        p,
        240 + (c.stats(p).effects.ultimateRadius ?? 0),
        3,
        6 * (1 + (c.stats(p).effects.ultimatePotency ?? 0)),
        'second-breath',
        c,
      );
  }
  step(c: TransformContext) {
    const active = new Map(
      c.players
        .filter((p) => p.status === 'active' && p.connected)
        .map((p) => [p.id, p]),
    );
    const due = this.tasks.filter((t) => t.at <= c.tick);
    this.tasks = this.tasks.filter((t) => t.at > c.tick && active.has(t.owner));
    for (const t of due) {
      const owner = active.get(t.owner);
      if (owner) t.run(owner, c);
    }
    this.processions = this.processions.filter(
      (a) => a.until > c.tick && active.has(a.owner),
    );
    for (const a of this.processions) {
      const owner = active.get(a.owner)!;
      a.cue.x = owner.x;
      a.cue.y = owner.y;
      for (const ally of c.players)
        if (ally.status === 'active' && distance(owner, ally) <= a.radius) {
          const shield = a.given.has(ally.id) ? 0 : a.shield;
          a.given.add(ally.id);
          c.kits.protect(
            ally.id,
            shield,
            a.armor,
            c.tick + ticks(0.2),
            c.tick,
            a.until,
          );
        }
    }
    this.marks = this.marks.filter(
      (m) => m.until > c.tick && active.has(m.owner),
    );
  }
  cues(): TalentCue[] {
    return this.marks.map((m) => ({ ...m }));
  }
}
