import catalog from "../../content/catalog.json";
import { DT, HZ, type InputFrame, type Shot, type Vec } from "./protocol.ts";
import { distance, segmentRect, type Rect } from "./geometry.ts";
import type { Player, Stats } from "./game.ts";
import type { MotionWindow } from "./motion-window.ts";

export const sniperId = "soldier-sniper-1";
export const sniperIds = {
  entry: sniperId,
  carry: "soldier-sniper-carry-1",
  clear: "soldier-sniper-clear-1",
} as const;
export const sniperRules = catalog.rules.soldierSniper;
const ticks = (seconds: number) => Math.ceil(seconds * HZ),
  angle = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));
const owned = (p: Player | undefined): p is Player =>
  !!p && p.classId === "soldier" && p.skills.includes(sniperId);
const live = (p: Player | undefined): p is Player =>
  owned(p) && p.connected && p.status === "active" && p.health > 0;
type Preparation = Vec & {
  owner: string;
  id: number;
  weapon: string;
  health: number;
  at: number;
  readyAt: number;
  until: number;
  aim: number;
  fireLatch: boolean;
  damage: number;
  handling: "plain" | "carry" | "clear";
};
type Flight = { owner: string; weapon: string; origin: Vec };
export type SniperCue = Vec & {
  kind: "soldier-sight";
  owner: string;
  id: number;
  at: number;
  readyAt: number;
  until: number;
  aim: number;
  radius: number;
};
export type SniperContext = {
  tick: number;
  stats(p: Player): Stats;
  id(): number;
  canEmit(): boolean;
  shoot(p: Player, damage: number): Shot | undefined;
  sound(p: Player, id: string): void;
};
export type SniperFlightContext = {
  tick: number;
  owner: Player | undefined;
  bounds: Rect;
  obstacles: readonly Rect[];
  hit(
    from: Vec,
    to: Vec,
    wall: number,
    window: MotionWindow,
    origin: Vec,
  ): boolean;
};

/** A paid, planted opportunity. Settling never fires, targets or refunds a round. */
export class SoldierSniper {
  private recovery = new Map<string, number>();
  private actions = new Map<
    string,
    { primaryAt: number; primaryAim: number; shotAt: number; shotAim: number }
  >();
  private barrelUntil = new Map<string, number>();
  private preparations = new Map<string, Preparation>();
  private flights = new Map<number, Flight>();
  noteBurst(p: Player, now: number, remainingTicks: number) {
    if (!owned(p)) return;
    this.interrupt(p.id);
    this.barrelUntil.set(p.id, now + remainingTicks);
  }
  private action(p: Player, now: number, primary: boolean) {
    if (!owned(p)) return;
    const a = this.actions.get(p.id) ?? {
      primaryAt: 0,
      primaryAim: 0,
      shotAt: 0,
      shotAim: 0,
    };
    if (primary) {
      a.primaryAt = now;
      a.primaryAim = p.aim;
    } else {
      a.shotAt = now;
      a.shotAim = p.aim;
    }
    this.actions.set(p.id, a);
  }
  primaryReleased(p: Player, now: number) {
    this.action(p, now, true);
  }
  clear() {
    this.recovery.clear();
    this.actions.clear();
    this.barrelUntil.clear();
    this.preparations.clear();
    this.flights.clear();
  }
  has(id: number) {
    return this.flights.has(id);
  }
  forget(id: number) {
    this.flights.delete(id);
  }
  cancelOwner(owner: string) {
    this.barrelUntil.delete(owner);
    this.actions.delete(owner);
    this.preparations.delete(owner);
    const ids = [...this.flights]
      .filter(([, f]) => f.owner === owner)
      .map(([id]) => id);
    for (const id of ids) this.flights.delete(id);
    return ids;
  }
  interrupt(owner: string) {
    this.preparations.delete(owner);
  }
  private busy(p: Player | undefined, now: number) {
    return (
      !live(p) ||
      p.reloadAt > now ||
      p.dashUntil > now ||
      p.channelUntil > now ||
      p.overdriveUntil > now ||
      now < (this.barrelUntil.get(p.id) ?? 0)
    );
  }
  private preparation(p: Player | undefined, now: number) {
    if (!p) return;
    const q = this.preparations.get(p.id);
    if (!q) return;
    if (
      this.busy(p, now) ||
      q.until <= now ||
      p.weapon !== q.weapon ||
      p.health < q.health ||
      (q.handling !== "plain" && !p.skills.includes(sniperIds[q.handling]))
    ) {
      this.preparations.delete(p.id);
      return;
    }
    if (distance(p, q) > sniperRules.stationaryTolerance) {
      if (q.handling !== "carry") {
        this.interrupt(p.id);
        return;
      }
      q.x = p.x;
      q.y = p.y;
      q.aim = p.aim;
      q.at = now;
      q.readyAt = now + ticks(sniperRules.settleSeconds);
    }
    return q;
  }
  react(p: Player, input: InputFrame, c: SniperContext) {
    const q = this.preparation(p, c.tick);
    if (!q) return false;
    if (!input.fire) q.fireLatch = false;
    if (
      (input.fire && !q.fireLatch) ||
      input.dodge ||
      input.e ||
      input.ultimate
    ) {
      this.interrupt(p.id);
      return false;
    }
    if (input.reload) {
      if (q.handling !== "clear") {
        this.interrupt(p.id);
        return false;
      }
      if (p.ammo < c.stats(p).magazine) {
        p.ammo++;
        this.interrupt(p.id);
        c.sound(p, "sniper-clear");
      }
      return true;
    }
    if (Math.abs(angle(p.aim - q.aim)) > sniperRules.aimArc) {
      q.aim = p.aim;
      q.at = c.tick;
      q.readyAt = c.tick + ticks(sniperRules.settleSeconds);
      c.sound(p, "sniper-settle");
    }
    return false;
  }
  afterMove(p: Player, now: number) {
    this.preparation(p, now);
  }
  step(now: number, players: readonly Player[]) {
    for (const owner of this.preparations.keys()) {
      const p = players.find((p) => p.id === owner);
      if (!p) this.interrupt(owner);
      else this.preparation(p, now);
    }
  }
  blocksPrimary(owner: string) {
    return this.preparations.has(owner);
  }
  cues(players: readonly Player[]): SniperCue[] {
    return [...this.preparations.values()].flatMap((q) => {
      const p = players.find((p) => p.id === q.owner);
      return live(p)
        ? [
            {
              kind: "soldier-sight" as const,
              owner: q.owner,
              id: q.id,
              x: q.x,
              y: q.y,
              at: q.at,
              readyAt: q.readyAt,
              until: q.until,
              aim: q.aim,
              radius: sniperRules.cueReach,
            },
          ]
        : [];
    });
  }
  status(p: Player | undefined, now: number) {
    const q = this.preparation(p, now),
      at = p ? (this.recovery.get(p.id) ?? 0) : 0,
      action = p ? this.actions.get(p.id) : undefined;
    return {
      technique1At: q ? 0 : at,
      sniperRecoveryAt: at,
      sniperPrimaryAt: action?.primaryAt ?? 0,
      sniperPrimaryAim: action?.primaryAim ?? 0,
      sniperShotAt: action?.shotAt ?? 0,
      sniperShotAim: action?.shotAim ?? 0,
      sniperReadyAt: q?.readyAt ?? 0,
      sniperUntil: q?.until ?? 0,
      sniperPrepared: !!q,
      sniperBlocked:
        this.busy(p, now) ||
        (q
          ? now < q.readyAt
          : !p ||
            p.ammo < 1 ||
            Math.hypot(p.input.moveX, p.input.moveY) > 0 ||
            Math.hypot(p.x - p.oldX, p.y - p.oldY) >
              sniperRules.stationaryTolerance),
    };
  }
  cast(p: Player, c: SniperContext) {
    if (
      this.busy(p, c.tick) ||
      p.input.reload ||
      p.input.dodge ||
      p.input.e ||
      p.input.ultimate
    )
      return false;
    const q = this.preparation(p, c.tick);
    if (q) {
      if (c.tick < q.readyAt) return false;
      const shot = c.shoot(p, q.damage);
      if (!shot) return false;
      this.flights.set(shot.id, {
        owner: p.id,
        weapon: q.weapon,
        origin: { x: p.x, y: p.y },
      });
      this.preparations.delete(p.id);
      this.action(p, c.tick, false);
      c.sound(p, "sniper-shot");
      return true;
    }
    if (
      c.tick < (this.recovery.get(p.id) ?? 0) ||
      p.ammo < 1 ||
      !c.canEmit() ||
      Math.hypot(p.input.moveX, p.input.moveY) > 0 ||
      Math.hypot(p.x - p.oldX, p.y - p.oldY) > sniperRules.stationaryTolerance
    )
      return false;
    p.ammo--;
    const stats = c.stats(p);
    this.recovery.set(
      p.id,
      c.tick + ticks(sniperRules.cooldown * stats.cooldown),
    );
    this.preparations.set(p.id, {
      owner: p.id,
      id: c.id(),
      x: p.x,
      y: p.y,
      weapon: p.weapon,
      health: p.health,
      at: c.tick,
      readyAt: c.tick + ticks(sniperRules.settleSeconds),
      until: c.tick + ticks(sniperRules.preparationSeconds),
      aim: p.aim,
      fireLatch: p.input.fire,
      damage: sniperRules.damage * stats.ability,
      handling: p.skills.includes(sniperIds.carry)
        ? "carry"
        : p.skills.includes(sniperIds.clear)
          ? "clear"
          : "plain",
    });
    c.sound(p, "sniper-settle");
    return true;
  }
  advance(s: Shot, c: SniperFlightContext) {
    const f = this.flights.get(s.id);
    if (
      !f ||
      !live(c.owner) ||
      c.owner.id !== f.owner ||
      c.owner.weapon !== f.weapon ||
      c.tick >= s.expires
    )
      return false;
    const from = { x: s.x, y: s.y },
      to = { x: s.x + s.vx * DT, y: s.y + s.vy * DT };
    let wall = 1,
      blocked = false;
    for (const obstacle of c.obstacles) {
      const hit = segmentRect(from, to, obstacle, s.radius);
      if (hit && hit.t <= wall) {
        wall = hit.t;
        blocked = true;
      }
    }
    for (const axis of ["x", "y"] as const) {
      const lo = c.bounds[axis] + s.radius,
        hi =
          c.bounds[axis] +
          (axis === "x" ? c.bounds.width : c.bounds.height) -
          s.radius;
      if (to[axis] < lo || to[axis] > hi) {
        const boundary = to[axis] < lo ? lo : hi,
          time = (boundary - from[axis]) / (to[axis] - from[axis]);
        if (time >= 0 && time <= wall) {
          wall = time;
          blocked = true;
        }
      }
    }
    if (c.hit(from, to, wall, { from: 0, to: 1 }, f.origin)) return false;
    s.x = from.x + (to.x - from.x) * wall;
    s.y = from.y + (to.y - from.y) * wall;
    return !blocked;
  }
}
