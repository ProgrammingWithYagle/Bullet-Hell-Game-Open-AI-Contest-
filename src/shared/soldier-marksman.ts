import catalog from "../../content/catalog.json";
import { segmentRect, type Rect } from "./geometry.ts";
import { DT, HZ, type Shot, type Vec } from "./protocol.ts";
import type { Player, Stats } from "./game.ts";
import type { MotionWindow } from "./motion-window.ts";

export const marksmanId = "soldier-marksman-1";
export const marksmanIds = {
  entry: marksmanId,
  carom: "soldier-marksman-carom-1",
  line: "soldier-marksman-line-1",
  pair: "soldier-marksman-pair-1",
  reserve: "soldier-marksman-reserve-1",
  relay: "soldier-marksman-relay-1",
  twin: "soldier-marksman-twin-1",
} as const;
export const marksmanRules = catalog.rules.soldierMarksman;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export type MarksmanBankCue = Vec & {
  kind: "soldier-bank";
  id: number;
  owner: string;
  radius: number;
  incomingAim: number;
  outgoingAim: number;
  at: number;
  until: number;
};
export type MarksmanContext = {
  tick: number;
  stats(p: Player): Stats;
  shoot(p: Player, damage: number): Shot | undefined;
  shootMany(
    p: Player,
    damage: number,
    aims: readonly number[],
  ): Shot[] | undefined;
  sound(p: Player, id: string, point?: Vec): void;
};
export type BankFlightContext = {
  tick: number;
  owner: Player | undefined;
  obstacles: readonly Rect[];
  hit(
    from: Vec,
    to: Vec,
    wall: number,
    window: MotionWindow,
    origin: Vec,
  ): boolean;
  sound(p: Player, id: string, point: Vec): void;
};
type Flight = {
  owner: string;
  banks: number;
  origin: Vec;
  variant: "single" | "carom" | "line";
  operation: "bank" | "pair" | "relay";
  earnsRelay: boolean;
  twin: boolean;
  earnsPair: boolean;
};
type Pair = {
  first: number;
  until: number;
  reserved?: boolean;
  held?: { reloadAt: number; weapon: string };
};
const owned = (p: Player | undefined): p is Player =>
  !!p && p.classId === "soldier" && p.skills.includes(marksmanId);
const live = (p: Player | undefined): p is Player =>
  owned(p) && p.connected && p.status === "active" && p.health > 0;

/** Physical cover and finite cartridges; no targeting or unfinished restore proof. */
export class SoldierMarksman {
  private recovery = new Map<string, number>();
  private pairRecovery = new Map<string, number>();
  private pairs = new Map<string, Pair>();
  private relays = new Map<string, number>();
  private flights = new Map<number, Flight>();
  private contacts = new Map<string, MarksmanBankCue>();
  clear() {
    this.recovery.clear();
    this.pairRecovery.clear();
    this.pairs.clear();
    this.relays.clear();
    this.flights.clear();
    this.contacts.clear();
  }
  has(id: number) {
    return this.flights.has(id);
  }
  forget(id: number) {
    const flight = this.flights.get(id);
    if (flight && this.pairs.get(flight.owner)?.first === id)
      this.pairs.delete(flight.owner);
    this.flights.delete(id);
  }
  cancelOwner(owner: string) {
    const ids = [...this.flights]
      .filter(([, f]) => f.owner === owner)
      .map(([id]) => id);
    for (const id of ids) this.flights.delete(id);
    for (const [id, cue] of this.contacts)
      if (cue.owner === owner) this.contacts.delete(id);
    this.pairs.delete(owner);
    this.relays.delete(owner);
    // Rostered owner loss never refunds either spent action's recovery.
    return ids;
  }
  private heldInterrupted(p: Player, pair: Pair, now: number) {
    const held = pair.held;
    return (
      !!held &&
      (!p.skills.includes(marksmanIds.reserve) ||
        p.weapon !== held.weapon ||
        p.dashUntil > now ||
        p.channelUntil > now ||
        p.overdriveUntil > now ||
        (now < held.reloadAt && p.reloadAt !== held.reloadAt))
    );
  }
  reservePair(p: Player, c: MarksmanContext) {
    const pair = this.pairs.get(p.id);
    if (
      !live(p) ||
      !p.skills.includes(marksmanIds.reserve) ||
      !pair ||
      pair.until <= c.tick ||
      pair.reserved ||
      p.reloadAt <= c.tick
    )
      return false;
    pair.until = Math.min(
      p.reloadAt + ticks(marksmanRules.reserveGrace),
      c.tick + ticks(marksmanRules.reserveMaximum),
    );
    pair.reserved = true;
    pair.held = { reloadAt: p.reloadAt, weapon: p.weapon };
    return true;
  }
  step(now: number, players: readonly Player[]) {
    for (const [id, cue] of this.contacts)
      if (cue.until <= now) this.contacts.delete(id);
    for (const [id, pair] of this.pairs) {
      const p = players.find((p) => p.id === id);
      if (
        !live(p) ||
        !p.skills.includes(marksmanIds.pair) ||
        (pair.until > 0 && pair.until <= now) ||
        this.heldInterrupted(p, pair, now)
      )
        this.pairs.delete(id);
      // Keep the reservation identity through its grace period so interruption still cancels it.
    }
    for (const [id, until] of this.relays) {
      const p = players.find((p) => p.id === id);
      if (
        until <= now ||
        !live(p) ||
        !p.skills.includes(marksmanIds.relay) ||
        !p.skills.includes(marksmanIds.pair)
      )
        this.relays.delete(id);
    }
  }
  private relayUntil(p: Player | undefined, now: number) {
    return live(p) &&
      p.skills.includes(marksmanIds.pair) &&
      p.skills.includes(marksmanIds.relay)
      ? Math.max(
          0,
          (this.relays.get(p.id) ?? 0) > now ? this.relays.get(p.id)! : 0,
        )
      : 0;
  }
  cues(): MarksmanBankCue[] {
    return [...this.contacts.values()];
  }
  blocked(
    p: Player | undefined,
    now: number,
    ammunition = marksmanRules.ammunition,
  ) {
    return (
      !live(p) ||
      p.ammo < ammunition ||
      p.reloadAt > now ||
      p.dashUntil > now ||
      p.channelUntil > now ||
      p.overdriveUntil > now
    );
  }
  status(p: Player | undefined, now: number) {
    const relay = this.relayUntil(p, now),
      pair = p ? this.pairs.get(p.id) : undefined;
    const twin =
      !!p &&
      relay > now &&
      (this.recovery.get(p.id) ?? 0) > now &&
      p.skills.includes(marksmanIds.twin);
    return {
      technique1At: p ? (this.recovery.get(p.id) ?? 0) : 0,
      technique2At: p ? (this.pairRecovery.get(p.id) ?? 0) : 0,
      soldierPairUntil:
        p && pair && !this.heldInterrupted(p, pair, now) ? pair.until : 0,
      soldierPairHeld:
        !!p &&
        !!pair?.held &&
        pair.held.reloadAt > now &&
        !this.heldInterrupted(p, pair, now),
      soldierRelayUntil: relay,
      soldierBankAmmunition: twin
        ? marksmanRules.twinAmmunition
        : marksmanRules.ammunition,
      soldierPairBlocked: this.blocked(p, now),
      soldierBankBlocked: this.blocked(
        p,
        now,
        twin ? marksmanRules.twinAmmunition : marksmanRules.ammunition,
      ),
    };
  }
  private release(
    p: Player,
    c: MarksmanContext,
    operation: Flight["operation"],
    earnsPair: boolean,
    earnsRelay = false,
    twin = false,
  ) {
    const damage = marksmanRules.damage * c.stats(p).ability,
      offset = (marksmanRules.twinDegrees * Math.PI) / 180;
    const shots = twin
      ? c.shootMany(p, damage, [p.aim - offset, p.aim + offset])
      : undefined;
    const shot = twin ? shots?.[0] : c.shoot(p, damage);
    if (!shot) return undefined;
    p.ammo -= twin ? marksmanRules.twinAmmunition : marksmanRules.ammunition;
    const variant = p.skills.includes(marksmanIds.carom)
      ? "carom"
      : p.skills.includes(marksmanIds.line)
        ? "line"
        : "single";
    for (const projectile of shots ?? [shot])
      this.flights.set(projectile.id, {
        owner: p.id,
        banks:
          variant === "carom" ? marksmanRules.caromBanks : marksmanRules.banks,
        origin: { x: p.x, y: p.y },
        variant,
        operation,
        earnsPair,
        earnsRelay,
        twin,
      });
    c.sound(p, "soldier-bank-shot");
    return shot;
  }
  cast(p: Player, c: MarksmanContext) {
    const at = this.recovery.get(p.id) ?? 0,
      relay = this.relayUntil(p, c.tick) > c.tick,
      bypass = at > c.tick;
    const twin = bypass && relay && p.skills.includes(marksmanIds.twin);
    if (
      (bypass && !relay) ||
      this.blocked(
        p,
        c.tick,
        twin ? marksmanRules.twinAmmunition : marksmanRules.ammunition,
      )
    )
      return false;
    if (!this.release(p, c, bypass ? "relay" : "bank", false, false, twin))
      return false;
    this.relays.delete(p.id);
    this.recovery.set(
      p.id,
      Math.max(c.tick, at) +
        ticks(marksmanRules.cooldown * c.stats(p).cooldown),
    );
    return true;
  }
  castPair(p: Player, c: MarksmanContext) {
    if (!p.skills.includes(marksmanIds.pair) || this.blocked(p, c.tick))
      return false;
    const pair = this.pairs.get(p.id);
    if (pair && this.heldInterrupted(p, pair, c.tick)) this.pairs.delete(p.id);
    const followup = (this.pairs.get(p.id)?.until ?? 0) > c.tick;
    if (!followup && c.tick < (this.pairRecovery.get(p.id) ?? 0)) return false;
    const shot = this.release(
      p,
      c,
      "pair",
      !followup,
      followup && p.skills.includes(marksmanIds.relay),
    );
    if (!shot) return false;
    if (followup) this.pairs.delete(p.id);
    else {
      this.pairs.set(p.id, { first: shot.id, until: 0 });
      this.pairRecovery.set(
        p.id,
        c.tick + ticks(marksmanRules.pairCooldown * c.stats(p).cooldown),
      );
    }
    return true;
  }
  advance(shot: Shot, c: BankFlightContext) {
    const flight = this.flights.get(shot.id);
    if (
      !flight ||
      !live(c.owner) ||
      c.owner.id !== flight.owner ||
      c.tick >= shot.expires ||
      (flight.operation === "pair" &&
        !c.owner.skills.includes(marksmanIds.pair)) ||
      (flight.operation === "relay" &&
        (!c.owner.skills.includes(marksmanIds.relay) ||
          !c.owner.skills.includes(marksmanIds.pair))) ||
      (flight.twin && !c.owner.skills.includes(marksmanIds.twin)) ||
      (flight.variant !== "single" &&
        !c.owner.skills.includes(marksmanIds[flight.variant]))
    )
      return { alive: false, updated: false };
    let fromFraction = 0,
      updated = false;
    // At most two real cover banks, then the remaining-time segment. Bodies still intercept first.
    for (let leg = 0; leg <= marksmanRules.caromBanks; leg++) {
      const from = { x: shot.x, y: shot.y };
      const to = {
        x: from.x + shot.vx * DT * (1 - fromFraction),
        y: from.y + shot.vy * DT * (1 - fromFraction),
      };
      let first: ReturnType<typeof segmentRect> = null;
      for (const wall of c.obstacles) {
        const hit = segmentRect(from, to, wall, shot.radius);
        if (hit && (!first || hit.t < first.t)) first = hit;
      }
      if (
        c.hit(
          from,
          to,
          first?.t ?? 1,
          { from: fromFraction, to: 1 },
          flight.origin,
        )
      )
        return { alive: false, updated };
      if (!first) {
        shot.x = to.x;
        shot.y = to.y;
        return {
          alive: shot.x >= 0 && shot.x <= 1600 && shot.y >= 0 && shot.y <= 1000,
          updated,
        };
      }
      const contact = {
        x: from.x + (to.x - from.x) * first.t,
        y: from.y + (to.y - from.y) * first.t,
      };
      shot.x = contact.x;
      shot.y = contact.y;
      const normal = first.normal;
      if (flight.banks <= 0 || normal.x * normal.x + normal.y * normal.y < 0.5)
        return { alive: false, updated };
      const incomingAim = Math.atan2(shot.vy, shot.vx),
        dot = shot.vx * normal.x + shot.vy * normal.y;
      shot.vx -= 2 * dot * normal.x;
      shot.vy -= 2 * dot * normal.y;
      flight.banks--;
      fromFraction += (1 - fromFraction) * first.t;
      shot.x += normal.x * marksmanRules.separation;
      shot.y += normal.y * marksmanRules.separation;
      flight.origin = { x: shot.x, y: shot.y };
      if (flight.variant === "line") shot.pierce = marksmanRules.linePierce;
      if (flight.earnsPair) {
        const pair = this.pairs.get(shot.owner);
        if (
          pair?.first === shot.id &&
          c.owner.skills.includes(marksmanIds.pair)
        ) {
          pair.first = 0;
          pair.until = c.tick + ticks(marksmanRules.pairWindow);
        }
        flight.earnsPair = false;
      }
      if (flight.earnsRelay) {
        if (
          c.owner.skills.includes(marksmanIds.relay) &&
          c.owner.skills.includes(marksmanIds.pair)
        )
          this.relays.set(
            shot.owner,
            c.tick + ticks(marksmanRules.relayWindow),
          );
        flight.earnsRelay = false;
      }
      this.contacts.set(shot.id + ":" + flight.banks, {
        kind: "soldier-bank",
        id: shot.id,
        owner: shot.owner,
        ...contact,
        radius: shot.radius,
        incomingAim,
        outgoingAim: Math.atan2(shot.vy, shot.vx),
        at: c.tick,
        until: c.tick + ticks(marksmanRules.contactSeconds),
      });
      c.sound(c.owner, "soldier-bank", contact);
      updated = true;
      if (fromFraction >= 1 - 1e-12) return { alive: true, updated };
    }
    return { alive: false, updated };
  }
}
