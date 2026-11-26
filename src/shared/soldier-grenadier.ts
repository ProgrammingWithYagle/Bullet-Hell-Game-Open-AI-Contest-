import catalog from "../../content/catalog.json";
import { DT, HZ, type InputFrame, type Shot, type Vec } from "./protocol.ts";
import { distance, segmentRect, type Rect } from "./geometry.ts";
import type { Player, Stats } from "./game.ts";
import type { MotionWindow } from "./motion-window.ts";

export const grenadierIds = {
  entry: "soldier-grenadier-1",
  skim: "soldier-grenadier-skim-1",
  contact: "soldier-grenadier-contact-1",
  pitch: "soldier-grenadier-pitch-1",
  pin: "soldier-grenadier-pin-1",
  sling: "soldier-grenadier-sling-1",
  kick: "soldier-grenadier-kick-1",
  return: "soldier-grenadier-return-1",
} as const;
export const grenadierRules = catalog.rules.soldierGrenadier;
const ticks = (s: number) => Math.ceil(s * HZ),
  owned = (p: Player | undefined): p is Player =>
    !!p && p.classId === "soldier" && p.skills.includes(grenadierIds.entry),
  live = (p: Player | undefined): p is Player =>
    owned(p) && p.connected && p.status === "active" && p.health > 0;
type Charge = {
  owner: string;
  weapon: string;
  until: number;
  damage: number;
  variant: "plain" | "skim" | "contact";
  pinUsed: boolean;
  kicked: boolean;
  caught: boolean;
  required: string[];
};
type Hand = Charge & {
  id: number;
  at: number;
  fireLatch: boolean;
  health: number;
  pinnedUntil: number;
  remaining: number;
};
type Flight = Charge & { banks: number; grounded: boolean };
export type GrenadierCue = Vec & {
  kind:
    | "soldier-fuse"
    | "soldier-grenade-contact"
    | "soldier-grenade-blast"
    | "soldier-grenade-vent";
  id: number;
  owner: string;
  at: number;
  until: number;
  radius: number;
  held?: boolean;
  pinned?: boolean;
};
export type GrenadierContext = {
  tick: number;
  bounds: Rect;
  obstacles: readonly Rect[];
  stats(p: Player): Stats;
  id(): number;
  canEmit(): boolean;
  shot(id: number): Shot | undefined;
  shoot(p: Player, speed: number, until: number): Shot | undefined;
  remove(s: Shot): void;
  blast(p: Player, point: Vec, damage: number, fraction?: number): void;
  sound(p: Player, id: string, point?: Vec): void;
};
export type GrenadierFlightContext = {
  tick: number;
  owner: Player | undefined;
  bounds: Rect;
  obstacles: readonly Rect[];
  body(from: Vec, to: Vec, window: MotionWindow): number | null;
  blast(p: Player, point: Vec, damage: number, fraction?: number): void;
  id(): number;
  sound(p: Player, id: string, point: Vec): void;
};

/** One finite owned object. Handling never duplicates it or resets its fuse/rights. */
export class SoldierGrenadier {
  private recovery = new Map<string, number>();
  private hands = new Map<string, Hand>();
  private flights = new Map<number, Flight>();
  private feedback = new Map<number, GrenadierCue>();
  clear() {
    this.recovery.clear();
    this.hands.clear();
    this.flights.clear();
    this.feedback.clear();
  }
  has(id: number) {
    return this.flights.has(id);
  }
  forget(id: number) {
    this.flights.delete(id);
  }
  cancelOwner(id: string) {
    this.hands.delete(id);
    for (const [key, cue] of this.feedback)
      if (cue.owner === id) this.feedback.delete(key);
    const shots = [...this.flights]
      .filter(([, f]) => f.owner === id)
      .map(([id]) => id);
    for (const key of shots) this.flights.delete(key);
    return shots;
  }
  interruptHand(id: string) {
    const h = this.hands.get(id);
    if (h && !h.pinnedUntil) this.hands.delete(id);
  }
  private valid(p: Player | undefined, q: Charge) {
    return (
      live(p) &&
      p.id === q.owner &&
      p.weapon === q.weapon &&
      q.required.every((id) => p.skills.includes(id)) &&
      (q.variant === "plain" || p.skills.includes(grenadierIds[q.variant]))
    );
  }
  private busy(p: Player | undefined, now: number) {
    return (
      !live(p) ||
      p.reloadAt > now ||
      p.dashUntil > now ||
      p.channelUntil > now ||
      p.overdriveUntil > now
    );
  }
  private hand(p: Player, c: Pick<GrenadierContext, "tick">) {
    const h = this.hands.get(p.id);
    if (!h) return;
    if (
      this.valid(p, h) &&
      (h.pinnedUntil ? h.pinnedUntil <= c.tick : h.until <= c.tick)
    )
      this.feedback.set(h.id, {
        kind: "soldier-grenade-vent",
        id: h.id,
        owner: h.owner,
        x: p.x,
        y: p.y,
        at: c.tick,
        until: c.tick + ticks(grenadierRules.feedbackSeconds),
        radius: 9,
      });
    if (
      !this.valid(p, h) ||
      (h.pinnedUntil
        ? h.pinnedUntil <= c.tick
        : h.until <= c.tick || p.health < h.health)
    ) {
      this.hands.delete(p.id);
      return;
    }
    return h;
  }
  private occupied(owner: string) {
    return [...this.flights.values()].some((f) => f.owner === owner);
  }
  private nearby(p: Player, c: GrenadierContext) {
    return [...this.flights]
      .flatMap(([id, f]) => {
        const shot = c.shot(id);
        return f.owner === p.id &&
          f.grounded &&
          shot &&
          this.valid(p, f) &&
          f.until > c.tick &&
          distance(p, shot) <= grenadierRules.handlingReach &&
          !c.obstacles.some((w) =>
            segmentRect(p, shot, w, grenadierRules.radius),
          )
          ? [{ id, f, shot }]
          : [];
      })
      .sort((a, b) => distance(p, a.shot) - distance(p, b.shot) || a.id - b.id);
  }
  step(now: number, players: readonly Player[]) {
    for (const [id, cue] of this.feedback)
      if (cue.until <= now) this.feedback.delete(id);
    for (const [id, h] of this.hands) {
      const p = players.find((p) => p.id === id);
      if (!this.valid(p, h)) {
        this.hands.delete(id);
        continue;
      }
      if (h.pinnedUntil ? h.pinnedUntil <= now : h.until <= now) {
        if (p)
          this.feedback.set(h.id, {
            kind: "soldier-grenade-vent",
            id: h.id,
            owner: id,
            x: p.x,
            y: p.y,
            at: now,
            until: now + ticks(grenadierRules.feedbackSeconds),
            radius: 9,
          });
        this.hands.delete(id);
      } else if (!h.pinnedUntil && (p!.health < h.health || this.busy(p, now)))
        this.hands.delete(id);
    }
  }
  react(p: Player, input: InputFrame, c: GrenadierContext) {
    const h = this.hand(p, c);
    if (!h || h.pinnedUntil) return;
    if (input.reload && p.skills.includes(grenadierIds.pin) && !h.pinUsed) {
      h.remaining = h.until - c.tick;
      h.at = c.tick;
      h.pinnedUntil = c.tick + ticks(grenadierRules.pinSeconds);
      h.pinUsed = true;
      h.required.push(grenadierIds.pin);
      c.sound(p, "grenadier-pin");
      return;
    }
    if (!input.fire) h.fireLatch = false;
    if (
      (input.fire && !h.fireLatch) ||
      input.reload ||
      input.dodge ||
      input.ultimate ||
      (input.e && !p.skills.includes(grenadierIds.sling))
    )
      this.hands.delete(p.id);
    else if (
      input.e &&
      p.skills.includes(grenadierIds.sling) &&
      !h.required.includes(grenadierIds.sling)
    )
      h.required.push(grenadierIds.sling);
  }
  blocksPrimary(id: string) {
    const h = this.hands.get(id);
    return !!h && !h.pinnedUntil;
  }
  cues(players: readonly Player[]): GrenadierCue[] {
    return [
      ...this.feedback.values(),
      ...[...this.hands.values()].flatMap((h) => {
        const p = players.find((p) => p.id === h.owner);
        return p && this.valid(p, h)
          ? [
              {
                kind: "soldier-fuse" as const,
                id: h.id,
                owner: h.owner,
                x: p.x,
                y: p.y,
                at: h.at,
                until: h.pinnedUntil || h.until,
                radius: 13,
                held: !h.pinnedUntil,
                pinned: !!h.pinnedUntil,
              },
            ]
          : [];
      }),
    ];
  }
  status(p: Player | undefined, c: GrenadierContext) {
    const h = p ? this.hand(p, c) : undefined,
      near = p ? this.nearby(p, c) : [],
      catchable =
        !!p &&
        p.skills.includes(grenadierIds.return) &&
        near.some(
          (q) =>
            !q.f.caught &&
            q.f.until - c.tick >= ticks(grenadierRules.minimumCatchSeconds),
        ),
      kickable =
        !!p &&
        p.skills.includes(grenadierIds.kick) &&
        near.some((q) => !q.f.kicked),
      at = p ? (this.recovery.get(p.id) ?? 0) : 0,
      active = !!p && this.occupied(p.id);
    return {
      technique1At: h || catchable ? 0 : at,
      technique2At: (h && !h.pinnedUntil) || kickable ? 0 : at,
      grenadierRecoveryAt: at,
      grenadierFuseUntil: h && !h.pinnedUntil ? h.until : 0,
      grenadierPinnedUntil: h?.pinnedUntil ?? 0,
      grenadierRemainingFuse: h?.pinnedUntil ? h.remaining : 0,
      grenadierCanCatch: catchable,
      grenadierCanKick: kickable,
      grenadierHolding: !!h && !h.pinnedUntil,
      grenadierBlocked: this.busy(p, c.tick) || (!h && !catchable && active),
      grenadierShortBlocked:
        this.busy(p, c.tick) || !!h?.pinnedUntil || (!h && !kickable && active),
    };
  }
  private charge(p: Player, c: GrenadierContext): Charge {
    return {
      owner: p.id,
      weapon: p.weapon,
      until: c.tick + ticks(grenadierRules.fuseSeconds),
      damage: grenadierRules.damage * c.stats(p).ability,
      variant: p.skills.includes(grenadierIds.skim)
        ? "skim"
        : p.skills.includes(grenadierIds.contact)
          ? "contact"
          : "plain",
      pinUsed: false,
      kicked: false,
      caught: false,
      required: [],
    };
  }
  private setRecovery(p: Player, c: GrenadierContext) {
    this.recovery.set(
      p.id,
      c.tick + ticks(grenadierRules.cooldown * c.stats(p).cooldown),
    );
  }
  private release(
    p: Player,
    h: Charge,
    c: GrenadierContext,
    speed: number,
    short = false,
  ) {
    const shot = c.shoot(p, speed, h.until);
    if (!shot) return false;
    const required = [...h.required];
    if (short && !required.includes(grenadierIds.pitch))
      required.push(grenadierIds.pitch);
    this.flights.set(shot.id, {
      ...h,
      required,
      banks: h.variant === "skim" ? 1 : 0,
      grounded: false,
    });
    this.hands.delete(p.id);
    c.sound(p, "grenadier-throw");
    return true;
  }
  cast(p: Player, c: GrenadierContext) {
    if (this.busy(p, c.tick)) return false;
    const h = this.hand(p, c);
    if (h) {
      if (h.pinnedUntil) {
        h.until = c.tick + h.remaining;
        h.pinnedUntil = 0;
        h.health = p.health;
        h.at = c.tick;
        h.fireLatch = p.input.fire;
        c.sound(p, "grenadier-pin");
        return true;
      }
      return this.release(p, h, c, grenadierRules.speed);
    }
    if (p.skills.includes(grenadierIds.return)) {
      const q = this.nearby(p, c).find(
        (q) =>
          !q.f.caught &&
          q.f.until - c.tick >= ticks(grenadierRules.minimumCatchSeconds),
      );
      if (q) {
        const held: Hand = {
          ...q.f,
          required: [...new Set([...q.f.required, grenadierIds.return])],
          caught: true,
          id: c.id(),
          at: c.tick,
          fireLatch: p.input.fire,
          health: p.health,
          pinnedUntil: 0,
          remaining: 0,
        };
        c.remove(q.shot);
        this.hands.set(p.id, held);
        c.sound(p, "grenadier-pin");
        return true;
      }
    }
    if (
      this.occupied(p.id) ||
      c.tick < (this.recovery.get(p.id) ?? 0) ||
      !c.canEmit() ||
      c.obstacles.some((w) => segmentRect(p, p, w, grenadierRules.radius))
    )
      return false;
    this.hands.set(p.id, {
      ...this.charge(p, c),
      id: c.id(),
      at: c.tick,
      fireLatch: p.input.fire,
      health: p.health,
      pinnedUntil: 0,
      remaining: 0,
    });
    this.setRecovery(p, c);
    c.sound(p, "grenadier-prime");
    return true;
  }
  shortCast(p: Player, c: GrenadierContext) {
    if (!p.skills.includes(grenadierIds.pitch) || this.busy(p, c.tick))
      return false;
    const h = this.hand(p, c);
    if (h)
      return (
        !h.pinnedUntil && this.release(p, h, c, grenadierRules.shortSpeed, true)
      );
    if (p.skills.includes(grenadierIds.kick)) {
      const q = this.nearby(p, c).find((q) => !q.f.kicked);
      if (q) {
        q.f.kicked = true;
        q.f.grounded = false;
        q.f.required = [...new Set([...q.f.required, grenadierIds.kick])];
        q.shot.vx = Math.cos(p.aim) * grenadierRules.kickSpeed;
        q.shot.vy = Math.sin(p.aim) * grenadierRules.kickSpeed;
        c.sound(p, "grenadier-throw", q.shot);
        return true;
      }
    }
    if (
      this.occupied(p.id) ||
      c.tick < (this.recovery.get(p.id) ?? 0) ||
      !c.canEmit() ||
      c.obstacles.some((w) => segmentRect(p, p, w, grenadierRules.radius))
    )
      return false;
    if (!this.release(p, this.charge(p, c), c, grenadierRules.shortSpeed, true))
      return false;
    this.setRecovery(p, c);
    return true;
  }
  private contact(shot: Shot, c: GrenadierFlightContext) {
    const id = c.id();
    this.feedback.set(id, {
      kind: "soldier-grenade-contact",
      id,
      owner: shot.owner,
      x: shot.x,
      y: shot.y,
      radius: shot.radius,
      at: c.tick,
      until: c.tick + ticks(grenadierRules.feedbackSeconds),
    });
    c.sound(c.owner!, "grenadier-contact", shot);
  }
  private explode(
    shot: Shot,
    f: Flight,
    c: GrenadierFlightContext,
    fraction = 1,
  ) {
    c.blast(c.owner!, shot, f.damage, fraction);
    const id = c.id();
    this.feedback.set(id, {
      kind: "soldier-grenade-blast",
      id,
      owner: shot.owner,
      x: shot.x,
      y: shot.y,
      radius: grenadierRules.blastRadius,
      at: c.tick,
      until: c.tick + ticks(grenadierRules.feedbackSeconds),
    });
    c.sound(c.owner!, "grenadier-blast", shot);
    return { alive: false, updated: false };
  }
  advance(shot: Shot, c: GrenadierFlightContext) {
    const f = this.flights.get(shot.id);
    if (!f || !this.valid(c.owner, f)) return { alive: false, updated: false };
    if (c.tick >= f.until) return this.explode(shot, f, c);
    if (f.grounded) return { alive: true, updated: false };
    let fromFraction = 0,
      updated = false;
    for (let leg = 0; leg < 2; leg++) {
      const from = { x: shot.x, y: shot.y },
        to = {
          x: from.x + shot.vx * DT * (1 - fromFraction),
          y: from.y + shot.vy * DT * (1 - fromFraction),
        };
      let first: ReturnType<typeof segmentRect> = null,
        bound = false;
      for (const wall of c.obstacles) {
        const hit = segmentRect(from, to, wall, shot.radius);
        if (hit && (!first || hit.t < first.t)) {
          first = hit;
          bound = false;
        }
      }
      for (const axis of ["x", "y"] as const) {
        const lo = c.bounds[axis] + shot.radius,
          hi =
            c.bounds[axis] +
            (axis === "x" ? c.bounds.width : c.bounds.height) -
            shot.radius;
        if (to[axis] < lo || to[axis] > hi) {
          const value = to[axis] < lo ? lo : hi,
            t = (value - from[axis]) / (to[axis] - from[axis]);
          if (t >= 0 && t <= 1 && (!first || t < first.t)) {
            first = {
              t,
              normal:
                axis === "x"
                  ? { x: to.x < lo ? 1 : -1, y: 0 }
                  : { x: 0, y: to.y < lo ? 1 : -1 },
            };
            bound = true;
          }
        }
      }
      const body = c.body(from, to, { from: fromFraction, to: 1 }),
        time = body !== null && body < (first?.t ?? 1) ? body : first?.t;
      if (time === undefined) {
        shot.x = to.x;
        shot.y = to.y;
        break;
      }
      shot.x = from.x + (to.x - from.x) * time;
      shot.y = from.y + (to.y - from.y) * time;
      this.contact(shot, c);
      updated = true;
      if (f.variant === "contact")
        return this.explode(
          shot,
          f,
          c,
          fromFraction + (1 - fromFraction) * time,
        );
      if (
        (body !== null && body < (first?.t ?? 1)) ||
        bound ||
        !first ||
        f.banks <= 0 ||
        first.normal.x ** 2 + first.normal.y ** 2 < 0.5
      ) {
        f.grounded = true;
        shot.vx = shot.vy = 0;
        break;
      }
      const dot = shot.vx * first.normal.x + shot.vy * first.normal.y;
      shot.vx =
        (shot.vx - 2 * dot * first.normal.x) * grenadierRules.bankRetention;
      shot.vy =
        (shot.vy - 2 * dot * first.normal.y) * grenadierRules.bankRetention;
      shot.x += first.normal.x * grenadierRules.separation;
      shot.y += first.normal.y * grenadierRules.separation;
      f.banks--;
      fromFraction += (1 - fromFraction) * time;
    }
    const speed = Math.hypot(shot.vx, shot.vy),
      nextSpeed = Math.max(0, speed - grenadierRules.drag * DT);
    if (speed > 0) {
      shot.vx *= nextSpeed / speed;
      shot.vy *= nextSpeed / speed;
      updated = true;
    }
    if (nextSpeed === 0) {
      f.grounded = true;
      shot.vx = shot.vy = 0;
    }
    return { alive: true, updated };
  }
}
