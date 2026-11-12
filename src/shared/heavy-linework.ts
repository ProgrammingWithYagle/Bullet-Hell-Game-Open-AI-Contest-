import { constructHit, type Construct } from './class-kits.ts';
import catalog from '../../content/catalog.json';
import { DT, HZ, type Shot, type Vec } from './protocol.ts';
import { segmentRect, type Rect } from './geometry.ts';
import type { Player, Stats } from './game.ts';
import type { MotionWindow } from './motion-window.ts';

// Physical paid anchor/hauling authority. The original finite clocks and current collision decide outcomes.
export const lineworkIds = {
  entry: 'heavy-linework-1',
  yoke: 'heavy-linework-yoke-1',
  sheave: 'heavy-linework-sheave-1',
  reserve: 'heavy-linework-reserve-1',
} as const;
export const heavyLineworkRules = catalog.rules.heavyLinework;
const reserveRules = catalog.rules.heavyLineworkReserve;
/** Built, living constructs use their existing current collision shape, never attachment identity. */
export function lineworkTemporaryConstructs(
  cues: readonly { kind: string }[],
  now: number,
): Construct[] {
  return cues.filter((cue): cue is Construct => {
    if (
      cue.kind !== 'wall' &&
      cue.kind !== 'turret' &&
      cue.kind !== 'siege' &&
      cue.kind !== 'decoy'
    )
      return false;
    const c = cue as Construct;
    return c.health > 0 && now >= (c.buildingUntil ?? 0) && now < c.until;
  });
}
type Mode = 'bare' | 'yoke' | 'sheave';
type Flight = {
  id: number;
  owner: string;
  weapon: string;
  scope: string;
  born: number;
  sequence: number;
  until: number;
  lineUntil: number;
  cancelled: boolean;
  reserve?: boolean;
};
type Attachment = {
  owner: string;
  weapon: string;
  scope: string;
  origin: Vec;
  normal: Vec;
  wall: Rect;
  at: number;
  until: number;
  initialLength: number;
  paidLength: number;
  active: boolean;
  mode: Mode;
  commandAt: number;
  commandSequence: number;
  requiresFitting?: string;
};
export type LineworkConnection = Attachment & {
  reserve?: Attachment;
  reserveFlight?: number;
  reserveSpent?: boolean;
  reserveSelected?: boolean;
};
export type LineworkContext = {
  tick: number;
  scope: string;
  stats(p: Player): Stats;
  canEmit(): boolean;
  shoot(p: Player, speed: number, radius: number, seconds: number): Shot | undefined;
  shot(id: number): Shot | undefined;
  remove(s: Shot): void;
  obstacles: readonly Rect[];
  masonry: readonly Rect[];
  constructs?(): readonly Construct[];
  sound(p: Player, id: string, point?: Vec): void;
};
type FlightContext = {
  tick: number;
  scope: string;
  owner: Player | undefined;
  bounds: Rect;
  obstacles: readonly Rect[];
  masonry: readonly Rect[];
  constructs?(): readonly Construct[];
  body(from: Vec, to: Vec, window: MotionWindow): number | null;
  contact?(owner: Player, point: Vec): void;
};
const owned = (p: Player | undefined): p is Player =>
  !!p && p.classId === 'heavy' && p.skills.includes(lineworkIds.entry);
const live = (p: Player | undefined): p is Player =>
  owned(p) && p.connected && !p.expired && p.status === 'active' && p.health > 0;
const mode = (p: Player): Mode =>
  p.skills.includes(lineworkIds.yoke)
    ? 'yoke'
    : p.skills.includes(lineworkIds.sheave)
      ? 'sheave'
      : 'bare';
const sameRect = (a: Rect, b: Rect) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
function copyAttachment<T extends Attachment>(line: T): T {
  return {
    ...line,
    origin: { ...line.origin },
    normal: { ...line.normal },
    wall: { ...line.wall },
  };
}
function copyConnection(line: LineworkConnection): LineworkConnection {
  const copy = copyAttachment(line);
  if (line.reserve) copy.reserve = copyAttachment(line.reserve);
  return copy;
}
export class HeavyLinework {
  /** Isolated client forecast seeded by an acknowledged transient line, never a checkpoint or emission. */
  static forPrediction(p: { id: string }, known: Partial<LineworkStatus>) {
    const model = new HeavyLinework(),
      line = known.lineworkConnection;
    if (line && line.owner === p.id) model.lines.set(p.id, copyConnection(line));
    if ((known.lineworkCastAt ?? 0) > 0)
      model.casts.set(p.id, {
        at: known.lineworkCastAt!,
        sequence: known.lineworkCastSequence ?? 0,
        aim: known.lineworkCastAim ?? 0,
      });
    model.recovery.set(p.id, known.lineworkRecovery ?? 0);
    return model;
  }
  readonly recovery = new Map<string, number>();
  private flights = new Map<number, Flight>();
  private lines = new Map<string, LineworkConnection>();
  private casts = new Map<string, { at: number; sequence: number; aim: number }>();
  private primaries = new Map<string, { at: number; aim: number }>();
  private reserveCasts = new Map<string, { at: number; aim: number }>();
  clear(c: Pick<LineworkContext, 'shot' | 'remove'>) {
    for (const id of [...this.flights.keys()]) {
      const shot = c.shot(id);
      if (shot) c.remove(shot);
    }
    this.recovery.clear();
    this.flights.clear();
    this.lines.clear();
    this.casts.clear();
    this.primaries.clear();
    this.reserveCasts.clear();
  }
  has(id: number) {
    return this.flights.has(id);
  }
  get hasWork() {
    return this.flights.size > 0 || this.lines.size > 0;
  }
  forget(id: number) {
    const flight = this.flights.get(id);
    if (flight?.reserve) {
      const line = this.lines.get(flight.owner);
      if (line?.reserveFlight === id) line.reserveFlight = undefined;
    }
    this.flights.delete(id);
  }
  private reserveParent(flight: Flight, owner: Player | undefined, tick: number) {
    const parent = this.lines.get(flight.owner);
    if (
      owner?.skills.includes(lineworkIds.reserve) &&
      parent?.reserveFlight === flight.id &&
      tick < parent.until
    )
      return parent;
  }
  private valid(p: Player | undefined, f: Pick<Flight, 'owner' | 'weapon'>) {
    return live(p) && p.id === f.owner && p.weapon === f.weapon;
  }
  private busy(p: Player, now: number) {
    return (
      !live(p) ||
      p.reloadAt > now ||
      p.dashUntil > now ||
      p.overdriveUntil > now ||
      p.channelUntil > now
    );
  }
  private cancelWork(owner: string) {
    this.lines.delete(owner);
    for (const f of this.flights.values()) if (f.owner === owner) f.cancelled = true;
  }
  interrupt(owner: string) {
    this.cancelWork(owner);
  }
  dropOwner(owner: string, c: Pick<LineworkContext, 'shot' | 'remove'>) {
    this.lines.delete(owner);
    const ids = [...this.flights.values()].filter((f) => f.owner === owner).map((f) => f.id);
    for (const id of ids) {
      const shot = c.shot(id);
      if (shot) c.remove(shot);
      this.flights.delete(id);
    }
    this.casts.delete(owner);
    this.primaries.delete(owner);
    this.reserveCasts.delete(owner);
  }
  private pointClear(
    p: Player,
    line: LineworkConnection,
    c: Pick<LineworkContext, 'obstacles' | 'masonry' | 'scope' | 'tick' | 'constructs'>,
  ) {
    if (
      c.scope !== line.scope ||
      c.tick >= line.until ||
      !this.valid(p, line) ||
      (line.requiresFitting && !p.skills.includes(line.requiresFitting)) ||
      (line.reserveSelected && !p.skills.includes(lineworkIds.reserve)) ||
      !c.masonry.some((w) => sameRect(w, line.wall))
    )
      return false;
    const currentMode = line.requiresFitting ? line.mode : mode(p);
    const length = Math.hypot(p.x - line.origin.x, p.y - line.origin.y),
      limit =
        currentMode === 'sheave' && !line.active
          ? heavyLineworkRules.maximumLength
          : line.paidLength + heavyLineworkRules.slack;
    if (length > heavyLineworkRules.maximumLength || length > limit) return false;
    const end = {
      x: line.origin.x + line.normal.x * 1.25,
      y: line.origin.y + line.normal.y * 1.25,
    };
    return (
      !c.obstacles.some((w) => segmentRect(p, end, w, 1) !== null) &&
      !(c.constructs?.() ?? []).some((body) => constructHit(p, end, body, 1) !== null)
    );
  }
  reconcile(players: readonly Player[], c: LineworkContext) {
    for (const [id, f] of this.flights) {
      const p = players.find((p) => p.id === f.owner);
      if (
        !this.valid(p, f) ||
        f.scope !== c.scope ||
        (f.reserve && !this.reserveParent(f, p, c.tick))
      ) {
        const shot = c.shot(id);
        if (shot) c.remove(shot);
        else this.forget(id);
      } else if (p && this.busy(p, c.tick)) f.cancelled = true;
    }
    for (const [owner, line] of this.lines) {
      const p = players.find((p) => p.id === owner);
      if (!p || this.busy(p, c.tick) || !this.pointClear(p, line, c)) this.lines.delete(owner);
      else this.validateReserve(p, line, c);
    }
  }
  cast(p: Player, c: LineworkContext) {
    if (!owned(p)) return false;
    const active =
        this.lines.has(p.id) ||
        [...this.flights.values()].some((f) => f.owner === p.id && !f.cancelled),
      last = this.casts.get(p.id);
    if (active) {
      if (!last || c.tick <= last.at || p.input.sequence <= last.sequence || this.busy(p, c.tick))
        return false;
      this.cancelWork(p.id);
      c.sound(p, 'linework-release');
      return true;
    }
    if (
      this.busy(p, c.tick) ||
      p.input.reload ||
      p.input.dodge ||
      p.input.ultimate ||
      p.ammo < 1 ||
      c.tick < (this.recovery.get(p.id) ?? 0) ||
      !c.canEmit()
    )
      return false;
    const shot = c.shoot(
      p,
      heavyLineworkRules.speed,
      heavyLineworkRules.radius,
      heavyLineworkRules.flightTicks / HZ,
    );
    if (!shot) return false;
    p.ammo--;
    this.recovery.set(
      p.id,
      c.tick + Math.ceil(heavyLineworkRules.cooldown * c.stats(p).cooldown * HZ),
    );
    this.casts.set(p.id, { at: c.tick, sequence: p.input.sequence, aim: p.aim });
    this.flights.set(shot.id, {
      id: shot.id,
      owner: p.id,
      weapon: p.weapon,
      scope: c.scope,
      born: c.tick,
      sequence: p.input.sequence,
      until: shot.expires,
      lineUntil: c.tick + heavyLineworkRules.lineTicks,
      cancelled: false,
    });
    c.sound(p, 'linework-shot');
    return true;
  }

  private commandReserve(p: Player, line: LineworkConnection, c: LineworkContext) {
    if (line.active || p.input.reload || p.input.dodge || p.input.ultimate || p.input.q) return;
    const alternate = line.reserve;
    if (alternate) {
      if (c.tick <= alternate.at || !this.pointClear(p, alternate, c)) return;
      this.lines.set(p.id, {
        ...alternate,
        commandAt: c.tick,
        commandSequence: p.input.sequence,
        reserveSpent: true,
        reserveSelected: true,
      });
      c.sound(p, 'linework-reserve-select');
      return;
    }
    const remaining = line.until - c.tick;
    if (line.reserveSpent || p.ammo < 1 || remaining <= 1 || !c.canEmit()) return;
    const flightTicks = Math.min(heavyLineworkRules.flightTicks, remaining);
    const shot = c.shoot(p, heavyLineworkRules.speed, heavyLineworkRules.radius, flightTicks / HZ);
    if (!shot) return;
    p.ammo--;
    line.reserveSpent = true;
    line.reserveFlight = shot.id;
    this.reserveCasts.set(p.id, { at: c.tick, aim: p.aim });
    this.flights.set(shot.id, {
      id: shot.id,
      owner: p.id,
      weapon: p.weapon,
      scope: c.scope,
      born: c.tick,
      sequence: p.input.sequence,
      until: shot.expires,
      lineUntil: line.until,
      cancelled: false,
      reserve: true,
    });
    c.sound(p, 'linework-shot');
  }

  private validateReserve(p: Player, line: LineworkConnection, c: LineworkContext) {
    if (
      line.reserve &&
      (!p.skills.includes(lineworkIds.reserve) || !this.pointClear(p, line.reserve, c))
    )
      line.reserve = undefined;
  }
  beforeMove(p: Player, c: LineworkContext) {
    if (!owned(p)) return;
    if (this.busy(p, c.tick)) {
      this.cancelWork(p.id);
      return;
    }
    const line = this.lines.get(p.id);
    if (!line) return;
    if (!this.pointClear(p, line, c)) {
      this.lines.delete(p.id);
      return;
    }
    const reserveCommand = p.input.technique3 && p.skills.includes(lineworkIds.reserve);
    if (
      (!p.input.technique2 && !reserveCommand) ||
      p.input.technique1 ||
      c.tick <= line.at ||
      c.tick <= line.commandAt ||
      p.input.sequence <= line.commandSequence
    )
      return;
    line.commandAt = c.tick;
    line.commandSequence = p.input.sequence;
    if (reserveCommand) {
      this.commandReserve(p, line, c);
      return;
    }
    if (!line.requiresFitting) line.mode = mode(p);
    if (line.active) {
      line.active = false;
      c.sound(p, 'linework-brake');
      return;
    }
    if (
      line.mode === 'sheave' &&
      Math.hypot(p.x - line.origin.x, p.y - line.origin.y) >
        line.initialLength + heavyLineworkRules.slack
    )
      line.requiresFitting = lineworkIds.sheave;
    const length = Math.hypot(p.x - line.origin.x, p.y - line.origin.y);
    line.paidLength = line.mode === 'sheave' ? length : Math.min(line.paidLength, length);
    line.active = true;
    if (line.mode === 'yoke') line.requiresFitting = lineworkIds.yoke;
    c.sound(p, 'linework-engage');
  }
  force(p: Player, c: LineworkContext, currentOrdinarySpeed: number) {
    const line = this.lines.get(p.id);
    if (!line?.active || this.busy(p, c.tick) || !this.pointClear(p, line, c))
      return { x: 0, y: 0, yoke: false };
    const dx = line.origin.x + line.normal.x * heavyLineworkRules.bodyStop - p.x,
      dy = line.origin.y + line.normal.y * heavyLineworkRules.bodyStop - p.y,
      d = Math.hypot(dx, dy);
    if (d <= 1) {
      line.active = false;
      return { x: 0, y: 0, yoke: false };
    }
    const speed = Math.min(Math.max(0, currentOrdinarySpeed), d / DT);
    return { x: (dx / d) * speed, y: (dy / d) * speed, yoke: line.mode === 'yoke' };
  }
  afterMove(p: Player, c: LineworkContext) {
    const line = this.lines.get(p.id);
    if (!line) return;
    if (!this.pointClear(p, line, c)) {
      this.lines.delete(p.id);
      return;
    }
    this.validateReserve(p, line, c);
    if (
      mode(p) === 'sheave' &&
      !line.active &&
      Math.hypot(p.x - line.origin.x, p.y - line.origin.y) >
        line.initialLength + heavyLineworkRules.slack
    ) {
      line.mode = 'sheave';
      line.requiresFitting = lineworkIds.sheave;
    }
    if (Math.hypot(p.x - line.origin.x, p.y - line.origin.y) <= heavyLineworkRules.bodyStop + 1)
      line.active = false;
  }
  blocksPrimary(owner: string, now: number) {
    return (
      this.casts.get(owner)?.at === now ||
      this.reserveCasts.get(owner)?.at === now ||
      !!(this.lines.get(owner)?.active && this.lines.get(owner)?.mode !== 'yoke')
    );
  }
  beforeAbility(p: Player, slot: string) {
    if (!owned(p)) return;
    if (slot === 'ultimate') this.cancelWork(p.id);
    else if (slot === 'q') {
      const line = this.lines.get(p.id);
      if (line) line.active = false;
    }
  }
  advance(s: Shot, c: FlightContext) {
    const f = this.flights.get(s.id);
    const reserveParent = f?.reserve ? this.reserveParent(f, c.owner, c.tick) : undefined;
    if (
      !f ||
      !this.valid(c.owner, f) ||
      f.scope !== c.scope ||
      c.tick >= f.until ||
      (f.reserve && !reserveParent)
    ) {
      this.forget(s.id);
      return false;
    }
    const from = { x: s.x, y: s.y },
      to = { x: s.x + s.vx * DT, y: s.y + s.vy * DT },
      b = c.bounds,
      pad = s.radius;
    if (
      from.x < b.x + pad ||
      from.y < b.y + pad ||
      from.x > b.x + b.width - pad ||
      from.y > b.y + b.height - pad
    )
      return false;
    let wall: { t: number; normal: Vec; rect: Rect } | undefined,
      bound = Infinity;
    for (const rect of c.obstacles) {
      const hit = segmentRect(from, to, rect, pad);
      if (hit && (!wall || hit.t < wall.t)) wall = { ...hit, rect };
    }
    for (const [axis, lo, hi] of [
      ['x', b.x + pad, b.x + b.width - pad],
      ['y', b.y + pad, b.y + b.height - pad],
    ] as const) {
      const delta = to[axis] - from[axis];
      if (delta > 0) bound = Math.min(bound, (hi - from[axis]) / delta);
      else if (delta < 0) bound = Math.min(bound, (lo - from[axis]) / delta);
    }
    const body = c.body(from, to, { from: 0, to: 1 }) ?? Infinity,
      t = Math.min(wall?.t ?? Infinity, bound, body);
    if (t > 1) {
      s.x = to.x;
      s.y = to.y;
      return true;
    }
    const at = {
      x: from.x + (to.x - from.x) * Math.max(0, t),
      y: from.y + (to.y - from.y) * Math.max(0, t),
    };
    s.x = at.x;
    s.y = at.y;
    if (
      !f.cancelled &&
      wall &&
      wall.t <= bound &&
      wall.t < body &&
      c.masonry.some((r) => sameRect(r, wall!.rect)) &&
      c.owner &&
      !this.busy(c.owner, c.tick)
    ) {
      const origin = { x: at.x - wall.normal.x * pad, y: at.y - wall.normal.y * pad },
        length = Math.hypot(c.owner.x - origin.x, c.owner.y - origin.y);
      if (length <= heavyLineworkRules.maximumLength) {
        const line: LineworkConnection = {
          owner: f.owner,
          weapon: f.weapon,
          scope: f.scope,
          origin,
          normal: { ...wall.normal },
          wall: { ...wall.rect },
          at: c.tick,
          until: f.lineUntil,
          initialLength: length,
          paidLength: length,
          active: false,
          mode: mode(c.owner),
          commandAt: c.tick,
          commandSequence: Math.max(f.sequence, c.owner.input.sequence),
        };
        if (this.pointClear(c.owner, line, c)) {
          if (!reserveParent) {
            this.lines.set(f.owner, line);
            c.contact?.(c.owner, origin);
          } else if (
            Math.hypot(reserveParent.origin.x - origin.x, reserveParent.origin.y - origin.y) >=
            reserveRules.minimumSeparation
          ) {
            reserveParent.reserve = line;
            c.contact?.(c.owner, origin);
          }
        }
      }
    }
    this.forget(s.id);
    return false;
  }
  primaryReleased(p: Player, now: number) {
    if (owned(p)) this.primaries.set(p.id, { at: now, aim: p.aim });
  }
  status(
    p: Player,
    now: number,
    options?: {
      canEmit: boolean;
      magazineCapacity: number;
      cooldownScale?: number;
      ultimateCooldownScale?: number;
      uncommittedSpeed?: number;
      overdriveTicks?: number;
    },
  ) {
    const line = this.lines.get(p.id),
      flight = [...this.flights.values()].find(
        (f) => f.owner === p.id && !f.cancelled && !f.reserve,
      ),
      cast = this.casts.get(p.id),
      primary = this.primaries.get(p.id),
      reserveCast = this.reserveCasts.get(p.id),
      busy = this.busy(p, now),
      active = !!line || !!flight;
    return {
      lineworkRecovery: this.recovery.get(p.id) ?? 0,
      lineworkFlight: flight?.id ?? 0,
      lineworkUntil: line?.until ?? 0,
      lineworkAnchor: line ? { ...line.origin } : undefined,
      lineworkActive: line?.active ?? false,
      lineworkMode: line?.requiresFitting ? line.mode : mode(p),
      lineworkPaidLength: line?.paidLength ?? 0,
      lineworkAt: line?.at ?? 0,
      lineworkCommandAt: line?.commandAt ?? 0,
      lineworkCommandSequence: line?.commandSequence ?? 0,
      lineworkNow: now,
      lineworkCastAt: cast?.at ?? 0,
      lineworkCastSequence: cast?.sequence ?? 0,
      lineworkCastAim: cast?.aim ?? p.aim,
      lineworkMagazineCapacity: options?.magazineCapacity,
      lineworkCooldownScale: options?.cooldownScale ?? 1,
      lineworkUltimateCooldownScale: options?.ultimateCooldownScale ?? 1,
      lineworkUncommittedSpeed: options?.uncommittedSpeed,
      lineworkOverdriveTicks: options?.overdriveTicks,
      lineworkBlocked:
        busy ||
        (active
          ? now <= (cast?.at ?? now)
          : p.ammo < 1 || now < (this.recovery.get(p.id) ?? 0) || options?.canEmit === false),
      lineworkCommandBlocked: busy || !line || now <= line.at,
      lineworkConnection: line ? copyConnection(line) : undefined,
      lineworkReserveCastAt: reserveCast?.at ?? 0,
      lineworkReserveCastAim: reserveCast?.aim ?? p.aim,
      lineworkReserveBlocked:
        !p.skills.includes(lineworkIds.reserve) ||
        busy ||
        !line ||
        line.active ||
        now <= line.at ||
        (line.reserve
          ? now <= line.reserve.at
          : line.reserveSpent || p.ammo < 1 || line.until - now <= 1 || options?.canEmit === false),
      heavyPrimaryAt: primary?.at ?? 0,
      heavyPrimaryAim: primary?.aim ?? p.aim,
    };
  }
}
export type LineworkStatus = ReturnType<HeavyLinework['status']>;
