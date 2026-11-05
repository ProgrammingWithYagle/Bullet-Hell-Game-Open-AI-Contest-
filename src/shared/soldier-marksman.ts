import catalog from "../../content/catalog.json";
import { segmentRect, type Rect } from "./geometry.ts";
import { DT, HZ, type Shot, type Vec } from "./protocol.ts";
import type { Player, Stats } from "./game.ts";
import type { MotionWindow } from "./motion-window.ts";

export const marksmanId = "soldier-marksman-1";
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
type Flight = { owner: string; banks: number; origin: Vec };
const owned = (p: Player | undefined): p is Player =>
  !!p && p.classId === "soldier" && p.skills.includes(marksmanId);
const live = (p: Player | undefined): p is Player =>
  owned(p) && p.connected && p.status === "active" && p.health > 0;

/** Deliberate ammunition and real cover geometry, without changing ordinary shots. */
export class SoldierMarksman {
  private recovery = new Map<string, number>();
  private flights = new Map<number, Flight>();
  private contacts = new Map<number, MarksmanBankCue>();
  clear() {
    this.recovery.clear();
    this.flights.clear();
    this.contacts.clear();
  }
  has(id: number) {
    return this.flights.has(id);
  }
  forget(id: number) {
    this.flights.delete(id);
  }
  cancelOwner(owner: string) {
    const ids = [...this.flights]
      .filter(([, flight]) => flight.owner === owner)
      .map(([id]) => id);
    for (const id of ids) this.flights.delete(id);
    for (const [id, cue] of this.contacts)
      if (cue.owner === owner) this.contacts.delete(id);
    // Rostered owner loss never refunds spent action recovery.
    return ids;
  }
  step(now: number) {
    for (const [id, cue] of this.contacts)
      if (cue.until <= now) this.contacts.delete(id);
  }
  cues(): MarksmanBankCue[] {
    return [...this.contacts.values()];
  }
  blocked(p: Player | undefined, now: number) {
    return (
      !live(p) ||
      p.ammo < marksmanRules.ammunition ||
      p.reloadAt > now ||
      p.dashUntil > now ||
      p.channelUntil > now ||
      p.overdriveUntil > now
    );
  }
  status(p: Player | undefined, now: number) {
    return {
      technique1At: p ? (this.recovery.get(p.id) ?? 0) : 0,
      soldierBankBlocked: this.blocked(p, now),
    };
  }
  cast(p: Player, c: MarksmanContext) {
    if (this.blocked(p, c.tick) || c.tick < (this.recovery.get(p.id) ?? 0))
      return false;
    const shot = c.shoot(p, marksmanRules.damage * c.stats(p).ability);
    if (!shot) return false;
    p.ammo -= marksmanRules.ammunition;
    this.recovery.set(
      p.id,
      c.tick + ticks(marksmanRules.cooldown * c.stats(p).cooldown),
    );
    this.flights.set(shot.id, {
      owner: p.id,
      banks: marksmanRules.banks,
      origin: { x: p.x, y: p.y },
    });
    c.sound(p, "soldier-bank-shot");
    return true;
  }
  advance(shot: Shot, c: BankFlightContext) {
    const flight = this.flights.get(shot.id);
    if (
      !flight ||
      !live(c.owner) ||
      c.owner.id !== flight.owner ||
      c.tick >= shot.expires
    )
      return { alive: false, updated: false };
    let fromFraction = 0,
      updated = false;
    // One fixed, bounded cover bank, followed by its remaining-time segment.
    for (let leg = 0; leg <= marksmanRules.banks; leg++) {
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
      // Separation is only from the contacted surface; a second wall still blocks.
      shot.x += normal.x * marksmanRules.separation;
      shot.y += normal.y * marksmanRules.separation;
      flight.origin = { x: shot.x, y: shot.y };
      this.contacts.set(shot.id, {
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
