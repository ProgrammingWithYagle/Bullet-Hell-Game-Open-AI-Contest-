import { SniperPositions } from "./soldier-sniper-positions.ts";
import {
  advanceSniperBore,
  type BoreFlight,
} from "./soldier-sniper-bore-flight.ts";
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
  bore: "soldier-sniper-bore-1",
  rest: "soldier-sniper-rest-1",
  withdrawal: "soldier-sniper-withdrawal-1",
} as const;
export const sniperRules = catalog.rules.soldierSniper;
export const sniperBoreRules = catalog.rules.soldierSniperBore;
export const sniperRestRules = catalog.rules.soldierSniperRest;
export const sniperWithdrawalRules = catalog.rules.soldierSniperWithdrawal;
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
  restClaimed?: boolean;
  withdrawalAssisted?: boolean;
};
type Flight = { owner: string; weapon: string; origin: Vec; bore?: BoreFlight };
type SniperSightCue = Vec & {
  kind: "soldier-sight";
  owner: string;
  id: number;
  at: number;
  readyAt: number;
  until: number;
  aim: number;
  radius: number;
};
export type SniperPunctureCue = Vec & {
  kind: "soldier-puncture";
  owner: string;
  id: number;
  at: number;
  until: number;
  exitX: number;
  exitY: number;
  aim: number;
  radius: number;
};
export type SniperRestCue = Vec & {
  kind: "soldier-rest";
  owner: string;
  id: number;
  at: number;
  readyAt: number;
  until: number;
  aim: number;
  radius: number;
};
export type SniperCue = SniperSightCue | SniperPunctureCue | SniperRestCue;
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
  private rests = new SniperPositions(
    {
      settleTicks: ticks(sniperRules.settleSeconds),
      lifetimeTicks: ticks(sniperRestRules.seconds),
      claimRadius: sniperRestRules.radius,
      aimArc: sniperRules.aimArc,
      stationaryTolerance: sniperRules.stationaryTolerance,
    },
    {
      minimumDistance: sniperWithdrawalRules.minimumDistance,
      claimRadius: sniperRestRules.radius,
      aimArc: sniperRules.aimArc,
    },
  );
  private actions = new Map<
    string,
    { primaryAt: number; primaryAim: number; shotAt: number; shotAim: number }
  >();
  private barrelUntil = new Map<string, number>();
  private preparations = new Map<string, Preparation>();
  private flights = new Map<number, Flight>();
  private punctures: SniperPunctureCue[] = [];
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
    this.rests.clear();
    this.actions.clear();
    this.barrelUntil.clear();
    this.preparations.clear();
    this.flights.clear();
    this.punctures = [];
  }
  has(id: number) {
    return this.flights.has(id);
  }
  forget(id: number) {
    this.flights.delete(id);
  }
  cancelOwner(owner: string) {
    this.rests.remove(owner);
    this.punctures = this.punctures.filter((c) => c.owner !== owner);
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
    this.rests.abandonPaid(owner);
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
      (q.restClaimed && !p.skills.includes(sniperIds.rest)) ||
      (q.withdrawalAssisted && !p.skills.includes(sniperIds.withdrawal)) ||
      (q.handling !== "plain" && !p.skills.includes(sniperIds[q.handling]))
    ) {
      this.interrupt(p.id);
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
  private syncRest(p: Player | undefined, owner: string, now: number) {
    return this.rests.sync(
      p,
      owner,
      now,
      live(p) && p.skills.includes(sniperIds.rest),
      !this.busy(p, now),
      !!p && p.skills.includes(sniperIds.withdrawal),
    );
  }
  private planted(p: Player) {
    return (
      Math.hypot(p.input.moveX, p.input.moveY) === 0 &&
      Math.hypot(p.x - p.oldX, p.y - p.oldY) <= sniperRules.stationaryTolerance
    );
  }
  react(p: Player, input: InputFrame, c: SniperContext) {
    this.syncRest(p, p.id, c.tick);
    this.rests.react(p.id, input);
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
    this.syncRest(p, p.id, now);
    this.preparation(p, now);
  }
  step(now: number, players: readonly Player[]) {
    for (const owner of this.restOwners()) {
      this.syncRest(
        players.find((p) => p.id === owner),
        owner,
        now,
      );
    }
    this.punctures = this.punctures.filter((c) => c.until > now);
    for (const owner of this.preparations.keys()) {
      const p = players.find((p) => p.id === owner);
      if (!p) this.interrupt(owner);
      else this.preparation(p, now);
    }
  }
  blocksPrimary(owner: string) {
    return this.preparations.has(owner) || this.rests.blocksPrimary(owner);
  }
  cues(players: readonly Player[]): SniperCue[] {
    return [...this.preparations.values()]
      .flatMap<SniperCue>((q) => {
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
      })
      .concat(this.punctures, this.restCues(players));
  }
  private restOwners() {
    return this.rests.owners();
  }
  private restCues(players: readonly Player[]): SniperRestCue[] {
    return this.restOwners().flatMap((owner) => {
      const p = players.find((p) => p.id === owner);
      return live(p)
        ? this.rests
            .all(owner)
            .map((q) => ({
              kind: "soldier-rest" as const,
              owner,
              id: q.cueId,
              x: q.x,
              y: q.y,
              at: q.at,
              readyAt: q.readyAt,
              until: q.until,
              aim: q.aim,
              radius: sniperRestRules.radius,
            }))
        : [];
    });
  }
  status(p: Player | undefined, now: number) {
    const rest = this.syncRest(p, p?.id ?? "", now),
      paired = !!p && p.skills.includes(sniperIds.withdrawal),
      positions = p ? this.rests.status(p.id) : { count: 0, fallbackUntil: 0 },
      fallback = !!p && this.rests.fallback(p, now, paired);
    const q = this.preparation(p, now),
      at = p ? (this.recovery.get(p.id) ?? 0) : 0,
      action = p ? this.actions.get(p.id) : undefined;
    return {
      technique1At: q || fallback ? 0 : at,
      sniperRecoveryAt: at,
      sniperPrimaryAt: action?.primaryAt ?? 0,
      sniperPrimaryAim: action?.primaryAim ?? 0,
      sniperShotAt: action?.shotAt ?? 0,
      sniperShotAim: action?.shotAim ?? 0,
      sniperReadyAt: q?.readyAt ?? 0,
      sniperUntil: q?.until ?? 0,
      sniperPrepared: !!q,
      sniperRestAt: rest?.readyAt ?? 0,
      sniperRestUntil: rest?.until ?? 0,
      sniperRestX: rest?.x ?? 0,
      sniperRestY: rest?.y ?? 0,
      sniperRestAim: rest?.aim ?? 0,
      sniperRestSetting: rest?.setting ?? false,
      sniperRestReady: !!rest && !rest.setting,
      sniperRestCount: positions.count,
      sniperRestCanSecond: !!p && this.rests.canPlaceSecond(p, paired),
      sniperWithdrawalUntil: positions.fallbackUntil,
      sniperWithdrawalReady: fallback,
      sniperRestBlocked: this.busy(p, now) || !p || !this.planted(p),
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
    this.syncRest(p, p.id, c.tick);
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
      return this.release(p, q, c, false);
    }
    const recoveryAt = this.recovery.get(p.id) ?? 0,
      paired = p.skills.includes(sniperIds.withdrawal),
      fallback = this.rests.fallback(p, c.tick, paired),
      duringRecovery = fallback && c.tick < recoveryAt;
    if (
      (c.tick < recoveryAt && !fallback) ||
      p.ammo < 1 ||
      !c.canEmit() ||
      !this.planted(p)
    )
      return false;
    const take = this.rests.take(p, c.tick),
      restClaimed = !!take;
    if (fallback && !take) return false;
    this.rests.cancelSetup(p.id);
    if (fallback) this.rests.consumeFallback(p.id);
    p.ammo--;
    const stats = c.stats(p);
    this.recovery.set(
      p.id,
      (duringRecovery ? recoveryAt : c.tick) +
        ticks(sniperRules.cooldown * stats.cooldown),
    );
    const preparation = c.id();
    if (!fallback)
      this.rests.normalClaim(p, preparation, take, c.tick, recoveryAt, paired);
    this.preparations.set(p.id, {
      owner: p.id,
      id: preparation,
      x: p.x,
      y: p.y,
      weapon: p.weapon,
      health: p.health,
      at: c.tick,
      readyAt: restClaimed ? c.tick : c.tick + ticks(sniperRules.settleSeconds),
      restClaimed,
      withdrawalAssisted: duringRecovery,
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
  private release(p: Player, q: Preparation, c: SniperContext, bore: boolean) {
    const shot = c.shoot(
      p,
      bore
        ? (q.damage * sniperBoreRules.damage) / sniperRules.damage
        : q.damage,
    );
    if (!shot) return false;
    this.rests.released(p, q.id, c.tick);
    this.flights.set(shot.id, {
      owner: p.id,
      weapon: q.weapon,
      origin: { x: p.x, y: p.y },
      ...(bore ? { bore: { available: true } } : {}),
    });
    this.preparations.delete(p.id);
    this.action(p, c.tick, false);
    c.sound(p, bore ? "sniper-bore" : "sniper-shot");
    return true;
  }
  bore(p: Player, c: SniperContext) {
    if (
      !p.skills.includes(sniperIds.bore) ||
      p.input.technique1 ||
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
      return this.release(p, q, c, true);
    }
    if (!p.skills.includes(sniperIds.rest) || !this.planted(p)) return false;
    this.syncRest(p, p.id, c.tick);
    const action = this.rests.operate(
      p,
      c.tick,
      () => c.id(),
      p.input.fire,
      p.skills.includes(sniperIds.withdrawal),
    );
    if (action !== "recall") c.sound(p, "sniper-rest");
    return true;
  }
  advance(s: Shot, c: SniperFlightContext) {
    const f = this.flights.get(s.id);
    if (
      !f ||
      !live(c.owner) ||
      c.owner.id !== f.owner ||
      c.owner.weapon !== f.weapon ||
      (f.bore && !c.owner.skills.includes(sniperIds.bore)) ||
      c.tick >= s.expires
    )
      return false;
    if (f.bore)
      return advanceSniperBore(s, f.bore, {
        bounds: c.bounds,
        obstacles: c.obstacles,
        maximum: sniperBoreRules.coverDepth,
        impactAfterCover: sniperBoreRules.impactAfterCover,
        hit: (from, to, wall, window) =>
          c.hit(from, to, wall, window, f.origin),
        crossed: (entry, exit) =>
          this.punctures.push({
            kind: "soldier-puncture",
            owner: s.owner,
            id: s.id,
            x: entry.x,
            y: entry.y,
            exitX: exit.x,
            exitY: exit.y,
            at: c.tick,
            until: c.tick + ticks(sniperBoreRules.cueSeconds),
            aim: Math.atan2(s.vy, s.vx),
            radius: sniperBoreRules.cueRadius,
          }),
      });
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
