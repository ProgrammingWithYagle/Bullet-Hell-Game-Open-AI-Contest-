import catalog from "../../content/catalog.json";
import { HZ, type Shot, type Vec } from "./protocol.ts";
import type { Player, Stats } from "./game.ts";
export const traverseIds = {
  entry: "heavy-traverse-1",
  spade: "heavy-traverse-spade-1",
  floating: "heavy-traverse-floating-1",
} as const;
export const heavyTraverseRules = catalog.rules.heavyTraverse;
type Mode = "loose" | "spade" | "floating";
type Owner = Player;
export const clutchId = "heavy-traverse-clutch-1";
// Optional acquired handling keeps the same finite paid stroke and original opportunities.
export const keyedId = "heavy-traverse-keyed-1",
  openId = "heavy-traverse-open-1";
export const lanyardId = "heavy-traverse-lanyard-1";
export const tetherRadius = 64;
type Stroke = {
  tether?: { origin: Vec; at: number; sequence: number };
  requiresClutch?: boolean;
  requiresLanyard?: boolean;
  requiresHandling?: typeof keyedId | typeof openId;
  forfeited: number;
  converted: number;
  clutch?: { lifted: boolean; at: number; sequence: number };
  owner: string;
  weapon: string;
  mode: Mode;
  born: number;
  until: number;
  next: number;
  bornSequence: number;
  fired: number;
  initialAim: number;
  aim: number;
  turnedAt: number;
  post: Vec;
};
type Flight = {
  requiresClutch?: boolean;
  requiresLanyard?: boolean;
  requiresHandling?: typeof keyedId | typeof openId;
  id: number;
  owner: string;
  weapon: string;
  mode: Mode;
  origin: Vec;
};
type Impulse = {
  requiresClutch?: boolean;
  requiresLanyard?: boolean;
  requiresHandling?: typeof keyedId | typeof openId;
  owner: string;
  weapon: string;
  mode: Mode;
  at: number;
  until: number;
  aim: number;
};
type Action = {
  lanyardAt?: number;
  castAt?: number;
  primaryAt?: number;
  primaryAim?: number;
  shotAt?: number;
  shotAim?: number;
  shotMode?: Mode;
  shotWeapon?: string;
  shotRequiresClutch?: boolean;
  shotRequiresLanyard?: boolean;
  shotOrigin?: Vec;
  shotRequiresHandling?: typeof keyedId | typeof openId;
  handledSequence?: number;
  handledAt?: number;
};
export type TraverseContext = {
  tick: number;
  stats(p: Owner): Pick<Stats, "damage" | "cooldown">;
  canEmit(): boolean;
  postPathClear?(origin: Vec, body: Vec): boolean;
  shoot(
    p: Owner,
    aim: number,
    damage: number,
    speed: number,
    radius: number,
    lifeSeconds: number,
  ): Shot | undefined;
  sound(p: Owner, id: string): void;
};
export type FlightAuthority = {
  postPathClear?(origin: Vec, body: Vec): boolean;
  players: readonly Owner[];
  tick: number;
  shot(id: number): Shot | undefined;
  remove(s: Shot): void;
};
const angle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a)),
  delta = (from: number, to: number) => angle(to - from),
  clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));
const owned = (p: Owner | undefined): p is Owner =>
    !!p && p.classId === "heavy" && p.skills.includes(traverseIds.entry),
  live = (p: Owner | undefined): p is Owner =>
    owned(p) && p.connected && p.status === "active" && p.health > 0;

/** Finite paid stroke; Game supplies actual fixed-step movement, pool admission and projectile authority. */
export class HeavyTraverse {
  private recovery = new Map<string, number>();
  private strokes = new Map<string, Stroke>();
  private flights = new Map<number, Flight>();
  private impulses: Impulse[] = [];
  private actions = new Map<string, Action>();
  constructor(readonly rules = heavyTraverseRules) {
    if (
      !Number.isInteger(rules.rounds) ||
      rules.rounds < 1 ||
      !Number.isInteger(rules.intervalTicks) ||
      rules.intervalTicks < 1 ||
      rules.deadlineTicks <= (rules.rounds - 1) * rules.intervalTicks ||
      rules.recoilTicks < 1
    )
      throw Error("invalid traverse stroke");
  }
  private mode(p: Owner): Mode {
    return p.skills.includes(traverseIds.spade)
      ? "spade"
      : p.skills.includes(traverseIds.floating)
        ? "floating"
        : "loose";
  }
  private valid(
    p: Owner | undefined,
    work: {
      weapon: string;
      mode: Mode;
      requiresClutch?: boolean;
  requiresLanyard?: boolean;
      requiresHandling?: typeof keyedId | typeof openId;
    },
  ): p is Owner {
    return (
      live(p) &&
      p.weapon === work.weapon &&
      (work.mode === "loose" || p.skills.includes(traverseIds[work.mode])) &&
      (!work.requiresClutch || p.skills.includes(clutchId)) &&
      (!work.requiresLanyard || p.skills.includes(lanyardId)) &&
      (!work.requiresHandling || p.skills.includes(work.requiresHandling))
    );
  }
  private busy(p: Owner, now: number) {
    return (
      !live(p) ||
      p.reloadAt > now ||
      p.dashUntil > now ||
      p.channelUntil > now ||
      p.overdriveUntil > now
    );
  }
  private interrupt(p: Owner, now: number) {
    return (
      this.busy(p, now) || p.input.reload || p.input.dodge || p.input.ultimate
    );
  }
  private releaseFeed(owner: string) {
    this.strokes.delete(owner);
  }
  private tetherValid(p: Owner, s: Stroke, c: { postPathClear?(origin: Vec, body: Vec): boolean }) {
    return !s.tether || (Math.hypot(p.x-s.tether.origin.x,p.y-s.tether.origin.y)<=tetherRadius && c.postPathClear?.(s.tether.origin,p)===true);
  }
  private slew(p: Owner, s: Stroke, now: number) {
    if(s.tether){s.turnedAt=now;return;}
    if (now <= s.turnedAt) return;
    if (s.requiresHandling === keyedId && s.clutch && !s.clutch.lifted) {
      s.turnedAt = now;
      return;
    }
    if (
      s.mode !== "floating" ||
      (s.requiresHandling === keyedId && s.clutch?.lifted)
    ) {
      const goal =
          s.initialAim +
          clamp(
            delta(s.initialAim, p.aim),
            -this.rules.halfArc,
            this.rules.halfArc,
          ),
        step = this.rules.turnPerSecond / HZ;
      s.aim = angle(s.aim + clamp(delta(s.aim, goal), -step, step));
    }
    s.turnedAt = now;
  }
  /** Call before ordinary movement. Fresh C cancels the feed so manual walking can resume that same step. */
  beforeMove(p: Owner, c: TraverseContext) {
    const s = this.strokes.get(p.id);
    if (s) {
      if (
        !this.valid(p, s) ||
        this.interrupt(p, c.tick) ||
        c.tick >= s.until ||
        !this.tetherValid(p, s, c) ||
        (s.mode === "spade" &&
          !s.clutch?.lifted &&
          !s.tether &&
          Math.hypot(p.x - s.post.x, p.y - s.post.y) > 1e-4)
      )
        this.releaseFeed(p.id);
      else if (
        p.input.technique1 &&
        p.input.sequence > s.bornSequence &&
        c.tick > s.born
      ) {
        this.releaseFeed(p.id);
        this.actions.set(p.id, {
          ...this.actions.get(p.id),
          handledSequence: p.input.sequence,
          handledAt: c.tick,
        });
        c.sound(p, "heavy-traverse-release");
      } else {
        if (p.input.technique2) this.command(p, c);
        this.slew(p, s, c.tick);
      }
    }
    this.impulses = this.impulses.filter((i) => i.until >= c.tick);
  }
  walkFactor(owner: string) {
    const s = this.strokes.get(owner);
    return s && s.mode !== "floating" && !s.clutch?.lifted && !s.tether ? 0 : 1;
  }
  /** Velocity from paid shots begins on the following combat step; ordinary body collision remains the caller's responsibility. */
  recoil(p: Owner, now: number): Vec {
    const v = { x: 0, y: 0 },
      speed = (this.rules.recoilDistance * HZ) / this.rules.recoilTicks;
    for (const i of this.impulses)
      if (
        i.owner === p.id &&
        i.at < now &&
        i.until >= now &&
        this.valid(p, i)
      ) {
        v.x -= Math.cos(i.aim) * speed;
        v.y -= Math.sin(i.aim) * speed;
      }
    return v;
  }
  private emit(p: Owner, s: Stroke, c: TraverseContext) {
    if (this.interrupt(p, c.tick) || p.ammo < 1 || !c.canEmit()) return false;
    const origin = s.tether?.origin ?? p;
    const emitter = s.tether ? {...p,x:origin.x,y:origin.y} : p;
    const shot = c.shoot(
      emitter,
      s.aim,
      this.rules.damage * c.stats(p).damage,
      this.rules.speed,
      this.rules.radius,
      this.rules.lifeSeconds,
    );
    if (!shot) return false;
    p.ammo--;
    s.fired++;
    this.flights.set(shot.id, {
      id: shot.id,
      owner: p.id,
      weapon: p.weapon,
      mode: s.mode,
      origin: { x: origin.x, y: origin.y },
      requiresClutch: s.requiresClutch,
      requiresLanyard: s.requiresLanyard,
      requiresHandling: s.requiresHandling,
    });
    if (s.mode !== "spade")
      this.impulses.push({
        owner: p.id,
        weapon: p.weapon,
        mode: s.mode,
        requiresClutch: s.requiresClutch,
      requiresLanyard: s.requiresLanyard,
        requiresHandling: s.requiresHandling,
        at: c.tick,
        until: c.tick + this.rules.recoilTicks,
        aim: s.aim,
      });
    this.actions.set(p.id, {
      ...this.actions.get(p.id),
      shotAt: c.tick,
      shotAim: s.aim,
      shotMode: s.mode,
      shotWeapon: p.weapon,
      shotRequiresClutch: s.requiresClutch,
      shotRequiresLanyard: s.requiresLanyard,
      shotOrigin: { x: origin.x, y: origin.y },
      shotRequiresHandling: s.requiresHandling,
    });
    c.sound(emitter, "heavy-traverse-shot");
    return true;
  }
  cast(p: Owner, c: TraverseContext) {
    const a = this.actions.get(p.id);
    if (a?.handledAt === c.tick && a.handledSequence === p.input.sequence)
      return false;
    const existing = this.strokes.get(p.id);
    if (existing) {
      if (c.tick <= existing.born || p.input.sequence <= existing.bornSequence)
        return false;
      this.releaseFeed(p.id);
      this.actions.set(p.id, {
        ...a,
        handledAt: c.tick,
        handledSequence: p.input.sequence,
      });
      c.sound(p, "heavy-traverse-release");
      return true;
    }
    if (
      this.interrupt(p, c.tick) ||
      c.tick < (this.recovery.get(p.id) ?? 0) ||
      p.ammo < 1 ||
      !c.canEmit() ||
      (this.mode(p) === "spade" &&
        Math.hypot(p.input.moveX, p.input.moveY) > 1e-6)
    )
      return false;
    const s: Stroke = {
      owner: p.id,
      weapon: p.weapon,
      mode: this.mode(p),
      born: c.tick,
      until: c.tick + this.rules.deadlineTicks,
      next: c.tick + this.rules.intervalTicks,
      bornSequence: p.input.sequence,
      fired: 0,
      forfeited: 0,
      converted: 0,
      initialAim: p.aim,
      aim: p.aim,
      turnedAt: c.tick,
      post: { x: p.x, y: p.y },
    };
    if (!this.emit(p, s, c)) return false;
    this.recovery.set(
      p.id,
      c.tick + Math.ceil(this.rules.cooldown * c.stats(p).cooldown * HZ),
    );
    this.actions.set(p.id, { ...this.actions.get(p.id), castAt: c.tick });
    if (s.fired < this.rules.rounds) this.strokes.set(p.id, s);
    return true;
  }
  /** Call after actual movement and Q/E input, before ordinary primary. A missed schedule is never caught up. */
  advance(p: Owner, c: TraverseContext) {
    const s = this.strokes.get(p.id);
    if (!s) return;
    this.slew(p, s, c.tick);
    if (
      !this.valid(p, s) ||
      this.interrupt(p, c.tick) ||
      c.tick >= s.until ||
      !this.tetherValid(p, s, c) ||
      (s.mode === "spade" &&
        !s.clutch?.lifted &&
          !s.tether &&
        Math.hypot(p.x - s.post.x, p.y - s.post.y) > 1e-4)
    ) {
      this.releaseFeed(p.id);
      return;
    }
    if (c.tick < s.next) return;
    if (c.tick !== s.next) {
      this.releaseFeed(p.id);
      return;
    }
    if (s.clutch?.lifted) {
      s.forfeited++;
      s.next += this.rules.intervalTicks;
      if (s.fired + s.forfeited >= this.rules.rounds) this.releaseFeed(p.id);
      return;
    }
    if (!this.emit(p, s, c)) {
      this.releaseFeed(p.id);
      return;
    }
    s.next += this.rules.intervalTicks;
    if (s.fired + s.forfeited >= this.rules.rounds) this.releaseFeed(p.id);
  }
  command(p: Owner, c: TraverseContext) {
    const s = this.strokes.get(p.id);
    if (
      !s ||
      !p.skills.includes(clutchId) ||
      !this.valid(p, s) ||
      this.interrupt(p, c.tick) ||
      p.input.technique1 ||
      c.tick <= s.born ||
      c.tick >= s.until ||
      p.input.sequence <= s.bornSequence ||
      p.input.sequence <= (s.clutch?.sequence ?? -1) ||
      c.tick <= (s.clutch?.at ?? -1)
    )
      return false;
    if(s.clutch && !s.clutch.lifted){
      if(!p.skills.includes(lanyardId)||s.tether||this.rules.rounds-s.fired-s.forfeited<2||c.postPathClear?.(p,p)!==true)return false;
      s.tether={origin:{x:p.x,y:p.y},at:c.tick,sequence:p.input.sequence};
      s.requiresLanyard=true;
      this.actions.set(p.id,{...this.actions.get(p.id),lanyardAt:c.tick});
      c.sound(p,"heavy-traverse-post");
      return true;
    }
    if (!s.clutch) {
      s.clutch = { lifted: true, at: c.tick, sequence: p.input.sequence };
      s.requiresClutch = true;
      s.requiresHandling = p.skills.includes(keyedId)
        ? keyedId
        : p.skills.includes(openId)
          ? openId
          : undefined;
      c.sound(p, "heavy-clutch-lift");
      return true;
    }
    if (
      !s.clutch.lifted ||
      (s.mode === "spade" && Math.hypot(p.input.moveX, p.input.moveY) > 1e-6)
    )
      return false;
    s.clutch = { lifted: false, at: c.tick, sequence: p.input.sequence };
    if (s.mode === "spade") s.post = { x: p.x, y: p.y };
    c.sound(p, "heavy-clutch-engage");
    return true;
  }
  /** Accepted body-fired Q retrieves/releases the posted feed before the issued ability executes. */
  beforeAbility(p: Owner, slot: "q"|"e"|"ultimate", c: TraverseContext) {
    const s=this.strokes.get(p.id);
    if(slot!=="q"||!s?.tether)return false;
    this.releaseFeed(p.id);c.sound(p,"heavy-traverse-release");return true;
  }
  blocksPrimary(owner: string, now: number) {
    const s = this.strokes.get(owner);
    return (
      (!!s && !(s.clutch?.lifted && s.requiresHandling === openId)) ||
      this.actions.get(owner)?.shotAt === now
    );
  }
  openFeed(owner: string) {
    const s = this.strokes.get(owner);
    return !!s && s.clutch?.lifted === true && s.requiresHandling === openId;
  }
  /** Derived Game calls once per actually admitted/paid primary round, never once per pellet. */
  primaryRound(p: Owner, c: TraverseContext) {
    const s = this.strokes.get(p.id);
    if (
      !s ||
      !this.openFeed(p.id) ||
      !this.valid(p, s) ||
      this.interrupt(p, c.tick) ||
      c.tick >= s.until
    )
      return false;
    s.forfeited++;
    s.converted++;
    s.next += this.rules.intervalTicks;
    if (s.fired + s.forfeited >= this.rules.rounds) this.releaseFeed(p.id);
    return true;
  }
  primaryReleased(p: Owner, now: number) {
    if (owned(p))
      this.actions.set(p.id, {
        ...this.actions.get(p.id),
        primaryAt: now,
        primaryAim: p.aim,
      });
  }
  status(p: Owner, now: number) {
    const s = this.strokes.get(p.id),
      a = this.actions.get(p.id),
      paid =
        a?.shotWeapon &&
        a.shotMode &&
        this.valid(p, {
          weapon: a.shotWeapon,
          mode: a.shotMode,
          requiresClutch: a.shotRequiresClutch,
          requiresLanyard: a.shotRequiresLanyard,
          requiresHandling: a.shotRequiresHandling,
        });
    const currentPost=s&&this.valid(p,s)?s.tether:undefined,
      paidPostNow=!!(paid&&a?.shotRequiresLanyard&&a.shotAt===now),
      postOrigin=currentPost?.origin??(paidPostNow?a?.shotOrigin:undefined);
    return {
      heavyLanyardAt:postOrigin?(currentPost?.at??a?.lanyardAt??0):0,
      heavyLanyardSequence:currentPost?.sequence??0,
      heavyLanyardUntil:postOrigin?(s?.until??now+1):0,
      heavyLanyardX:postOrigin?.x??p.x,
      heavyLanyardY:postOrigin?.y??p.y,
      heavyLanyardRemaining:s?.tether?this.rules.rounds-s.fired-s.forfeited:0,
      heavyTraverseShotPosted:!!(paid&&a?.shotRequiresLanyard),
      heavyTraverseShotX:a?.shotOrigin?.x??p.x,
      heavyTraverseShotY:a?.shotOrigin?.y??p.y,
      heavyClutchConverted: s?.converted ?? 0,
      heavyClutchHandling: s?.requiresHandling,
      heavyClutchAt: s?.clutch?.at ?? 0,
      heavyClutchSequence: s?.clutch?.sequence ?? 0,
      heavyClutchBlocked:
        !s ||
        !p.skills.includes(clutchId) ||
        !this.valid(p, s) ||
        this.interrupt(p, now) ||
        now <= s.born ||
        now >= s.until ||
        !!(s.clutch && !s.clutch.lifted && (s.tether || !p.skills.includes(lanyardId) || this.rules.rounds-s.fired-s.forfeited<2)) ||
        !!(
          s.clutch?.lifted &&
          s.mode === "spade" &&
          Math.hypot(p.input.moveX, p.input.moveY) > 1e-6
        ),
      heavyClutchLifted: !!s?.clutch?.lifted,
      heavyClutchUsed: !!s?.clutch,
      heavyClutchForfeited: s?.forfeited ?? 0,
      heavyClutchSlotsRemaining: s
        ? this.rules.rounds - s.fired - s.forfeited
        : 0,
      heavyPrimaryAt: a?.primaryAt ?? 0,
      heavyPrimaryAim: a?.primaryAim ?? 0,
      heavyTraverseBornAt: s?.born ?? 0,
      heavyTraverseSequence: s?.bornSequence ?? 0,
      heavyTraversePostX: s?.post.x ?? p.x,
      heavyTraversePostY: s?.post.y ?? p.y,
      technique1At: this.recovery.get(p.id) ?? 0,
      heavyTraverseUntil: s?.until ?? 0,
      heavyTraverseNextAt: s?.next ?? 0,
      heavyTraverseRounds: s?.fired ?? 0,
      heavyTraverseAim: s?.aim ?? a?.shotAim ?? p.aim,
      heavyTraverseMode: s?.mode ?? this.mode(p),
      heavyTraverseCastAt: a?.castAt ?? 0,
      heavyTraverseShotRequiresClutch: !!(paid && a?.shotRequiresClutch),
      heavyTraverseShotRequiresHandling: paid
        ? a?.shotRequiresHandling
        : undefined,
      heavyTraverseShotAt: paid ? (a?.shotAt ?? 0) : 0,
      heavyTraverseShotAim: paid ? (a?.shotAim ?? 0) : 0,
      heavyTraverseShotMode: paid ? a?.shotMode : undefined,
      heavyTraverseBlocked: !!s ? false : this.interrupt(p, now) || p.ammo < 1,
    };
  }
  has(id: number) {
    return this.flights.has(id);
  }
  origin(id: number) {
    return this.flights.get(id)?.origin;
  }
  forget(id: number) {
    this.flights.delete(id);
  }
  /** Read/cancel actual admitted flights by id and owner, never by a retained pooled Shot reference. */
  reconcile(c: FlightAuthority) {
    for (const [owner, s] of this.strokes) {
      const p = c.players.find((p) => p.id === owner);
      if (
        !this.valid(p, s) ||
        this.interrupt(p, c.tick) ||
        c.tick >= s.until ||
        !this.tetherValid(p, s, c) ||
        (s.mode === "spade" &&
          !s.clutch?.lifted &&
          !s.tether &&
          Math.hypot(p.x - s.post.x, p.y - s.post.y) > 1e-4)
      )
        this.releaseFeed(owner);
    }
    this.impulses = this.impulses.filter(
      (i) =>
        i.until >= c.tick &&
        this.valid(
          c.players.find((p) => p.id === i.owner),
          i,
        ),
    );
    for (const [id, f] of this.flights) {
      const p = c.players.find((p) => p.id === f.owner),
        shot = c.shot(id);
      if (!shot || shot.owner !== f.owner) {
        this.flights.delete(id);
        continue;
      }
      if (!this.valid(p, f)) {
        this.flights.delete(id);
        c.remove(shot);
      }
    }
  }
  cancelOwner(
    owner: string,
    c: { shot(id: number): Shot | undefined; remove(s: Shot): void },
  ) {
    this.releaseFeed(owner);
    this.impulses = this.impulses.filter((i) => i.owner !== owner);
    for (const [id, f] of this.flights)
      if (f.owner === owner) {
        const shot = c.shot(id);
        this.flights.delete(id);
        if (shot?.owner === owner) c.remove(shot);
      }
  }
  clear() {
    this.recovery.clear();
    this.strokes.clear();
    this.flights.clear();
    this.impulses = [];
    this.actions.clear();
  }
}
