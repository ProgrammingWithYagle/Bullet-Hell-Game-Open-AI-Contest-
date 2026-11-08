import catalog from "../../content/catalog.json";
import { DT, HZ, type Shot, type Vec } from "./protocol.ts";
import { segmentRect, type Rect } from "./geometry.ts";
import { swordCircleContact } from "./sword-geometry.ts";
import type { Player, Stats } from "./game.ts";
import type { MotionWindow } from "./motion-window.ts";

// Shared physical flak and deferred, finite interception authority.
export const flakIds = {
  entry: "heavy-flak-1",
  compact: "heavy-flak-compact-1",
  frontal: "heavy-flak-frontal-1",
  command: "heavy-flak-command-1",
  running: "heavy-flak-running-1",
  hanging: "heavy-flak-hanging-1",
} as const;
export type FlakRules = {
  speed: number;
  radius: number;
  fuseSeconds: number;
  cooldown: number;
  burstSeconds: number;
  baseRadius: number;
  compactRadius: number;
  compactFuseSeconds: number;
  frontalReach: number;
  frontalArc: number;
  frontalFuseSeconds: number;
  projectileLimit: number;
  maximumHostileRadius: number;
};
type Pattern = "base" | "compact" | "frontal";
type Handling = "manual" | "running" | "hanging";
type Flight = Vec & {
  id: number;
  owner: string;
  weapon: string;
  born: number;
  until: number;
  aim: number;
  pattern: Pattern;
  handling: Handling;
  token: number;
  commandedAt?: number;
  parkedAt?: number;
};
type Pending = Flight & {
  at: number;
  reason: "fuse" | "contact" | "command" | "running";
  terminal: boolean;
  limit: number;
};
export type FlakBurstCue = Vec & {
  kind: "heavy-flak-burst";
  id: number;
  owner: string;
  at: number;
  until: number;
  radius: number;
  aim: number;
  arc: number;
  contacts: Vec[];
};
type Action = {
  at: number;
  aim: number;
  primaryAt?: number;
  primaryAim?: number;
};
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
const owned = (p: Player | undefined): p is Player =>
  !!p && p.classId === "heavy" && p.skills.includes(flakIds.entry);
const live = (p: Player | undefined): p is Player =>
  owned(p) && p.connected && p.status === "active" && p.health > 0;
export type FlakContext = {
  tick: number;
  stats(p: Player): Stats;
  canEmit(): boolean;
  shoot(
    p: Player,
    speed: number,
    radius: number,
    fuseSeconds: number,
  ): Shot | undefined;
  shot(id: number): Shot | undefined;
  remove(s: Shot): void;
  update(s: Shot): void;
  sound(p: Player, id: string, point?: Vec): void;
};
export type FlakFlightContext = {
  tick: number;
  owner: Player | undefined;
  bounds: Rect;
  obstacles: readonly Rect[];
  body(from: Vec, to: Vec, window: MotionWindow): number | null;
};
export type FlakBurstContext = {
  tick: number;
  combat: boolean;
  players: readonly Player[];
  obstacles: readonly Rect[];
  shots(): readonly Shot[];
  remove(s: Shot): boolean;
  id(): number;
  sound(p: Player, id: string, point: Vec): void;
};

/** One physical defensive round; interception is deferred until after ordinary shot advancement. */
export class HeavyFlak {
  private recovery = new Map<string, number>();
  private serial = 0;
  private quotas = new Map<number, number>();
  private actions = new Map<string, Action>();
  private flights = new Map<number, Flight>();
  private pending: Pending[] = [];
  private bursts: FlakBurstCue[] = [];
  constructor(readonly rules: FlakRules) {}
  clear() {
    this.recovery.clear();
    this.quotas.clear();
    this.actions.clear();
    this.flights.clear();
    this.pending = [];
    this.bursts = [];
  }
  has(id: number) {
    return this.flights.has(id);
  }
  forget(id: number) {
    const f = this.flights.get(id);
    this.flights.delete(id);
    if (f && !this.pending.some((p) => p.token === f.token))
      this.quotas.delete(f.token);
  }
  private flight(owner: string) {
    return [...this.flights.values()].find((f) => f.owner === owner);
  }
  private valid(p: Player | undefined, f: Flight): p is Player {
    return (
      live(p) &&
      p.weapon === f.weapon &&
      (f.pattern === "base" || p.skills.includes(flakIds[f.pattern])) &&
      (f.handling === "manual" ||
        (p.skills.includes(flakIds.command) &&
          p.skills.includes(flakIds[f.handling])))
    );
  }
  private validPending(p: Player | undefined, f: Pending): p is Player {
    return (
      this.valid(p, f) &&
      (!["command", "running"].includes(f.reason) ||
        p.skills.includes(flakIds.command))
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
  private pattern(p: Player): Pattern {
    return p.skills.includes(flakIds.compact)
      ? "compact"
      : p.skills.includes(flakIds.frontal)
        ? "frontal"
        : "base";
  }
  private seconds(pattern: Pattern) {
    return pattern === "compact"
      ? this.rules.compactFuseSeconds
      : pattern === "frontal"
        ? this.rules.frontalFuseSeconds
        : this.rules.fuseSeconds;
  }
  private shape(pattern: Pattern) {
    return pattern === "frontal"
      ? { radius: this.rules.frontalReach, arc: this.rules.frontalArc }
      : {
          radius:
            pattern === "compact"
              ? this.rules.compactRadius
              : this.rules.baseRadius,
          arc: Math.PI * 2,
        };
  }
  private queue(
    f: Flight,
    now: number,
    reason: Pending["reason"],
    point: Vec = f,
    terminal = true,
    limit = this.rules.projectileLimit,
  ) {
    if (terminal) this.flights.delete(f.id);
    this.pending.push({
      ...f,
      x: point.x,
      y: point.y,
      at: now,
      reason,
      terminal,
      limit,
    });
  }
  cancelOwner(owner: string) {
    const ids = [...this.flights.values()]
      .filter((f) => f.owner === owner)
      .map((f) => f.id);
    for (const id of ids) {
      const f = this.flights.get(id);
      if (f) this.quotas.delete(f.token);
      this.flights.delete(id);
    }
    for (const f of [...this.flights.values(), ...this.pending])
      if (f.owner === owner) this.quotas.delete(f.token);
    this.pending = this.pending.filter((f) => f.owner !== owner);
    this.bursts = this.bursts.filter((c) => c.owner !== owner);
    this.actions.delete(owner);
    return ids;
  }
  step(now: number, players: readonly Player[]) {
    const removed: number[] = [];
    for (const f of this.flights.values())
      if (
        !this.valid(
          players.find((p) => p.id === f.owner),
          f,
        )
      ) {
        this.flights.delete(f.id);
        this.quotas.delete(f.token);
        removed.push(f.id);
      }
    this.pending = this.pending.filter((f) =>
      this.validPending(
        players.find((p) => p.id === f.owner),
        f,
      ),
    );
    this.bursts = this.bursts.filter((c) => c.until > now);
    return removed;
  }
  primaryReleased(p: Player, now: number) {
    if (!owned(p)) return;
    const a = this.actions.get(p.id) ?? { at: 0, aim: 0 };
    this.actions.set(p.id, { ...a, primaryAt: now, primaryAim: p.aim });
  }
  blocksPrimary(owner: string, now: number) {
    return this.actions.get(owner)?.at === now;
  }
  status(p: Player | undefined, now: number) {
    const f = p ? this.flight(p.id) : undefined,
      a = p ? this.actions.get(p.id) : undefined;
    return {
      technique1At: p ? (this.recovery.get(p.id) ?? 0) : 0,
      technique2At: 0,
      heavyFlakBlocked: this.busy(p, now) || !p || p.ammo < 1 || !!f,
      heavyFlakCommandBlocked:
        this.busy(p, now) ||
        !p?.skills.includes(flakIds.command) ||
        !f ||
        f.born >= now ||
        f.until <= now ||
        (f.handling === "running" && f.commandedAt !== undefined) ||
        f.commandedAt === now,
      heavyFlakUntil: f?.until ?? 0,
      heavyFlakParkedAt: f?.parkedAt ?? 0,
      heavyFlakRunningAt: f?.handling === "running" ? (f.commandedAt ?? 0) : 0,
      heavyPrimaryAt: a?.primaryAt ?? 0,
      heavyPrimaryAim: a?.primaryAim ?? 0,
      heavyFlakShotAt: a?.at ?? 0,
      heavyFlakShotAim: a?.aim ?? 0,
    };
  }
  cast(p: Player, c: FlakContext) {
    if (
      this.busy(p, c.tick) ||
      p.input.reload ||
      p.input.dodge ||
      p.input.ultimate ||
      p.ammo < 1 ||
      this.flight(p.id) ||
      c.tick < (this.recovery.get(p.id) ?? 0) ||
      !c.canEmit()
    )
      return false;
    const pattern = this.pattern(p),
      shot = c.shoot(
        p,
        this.rules.speed,
        this.rules.radius,
        this.seconds(pattern),
      );
    if (!shot) return false;
    p.ammo--;
    this.recovery.set(
      p.id,
      c.tick + ticks(this.rules.cooldown * c.stats(p).cooldown),
    );
    const token = ++this.serial;
    this.quotas.set(token, this.rules.projectileLimit);
    this.flights.set(shot.id, {
      id: shot.id,
      owner: p.id,
      weapon: p.weapon,
      born: c.tick,
      until: shot.expires,
      x: shot.x,
      y: shot.y,
      aim: p.aim,
      pattern,
      token,
      handling: p.skills.includes(flakIds.running)
        ? "running"
        : p.skills.includes(flakIds.hanging)
          ? "hanging"
          : "manual",
    });
    this.actions.set(p.id, {
      ...this.actions.get(p.id),
      at: c.tick,
      aim: p.aim,
    });
    c.sound(p, "heavy-flak-shot");
    return true;
  }
  command(p: Player, c: FlakContext) {
    const f = this.flight(p.id);
    if (
      this.busy(p, c.tick) ||
      !p.skills.includes(flakIds.command) ||
      p.input.reload ||
      p.input.dodge ||
      p.input.ultimate ||
      !f ||
      f.born >= c.tick ||
      c.tick >= f.until ||
      !this.valid(p, f) ||
      (f.handling === "running" && f.commandedAt !== undefined) ||
      f.commandedAt === c.tick
    )
      return false;
    const shot = c.shot(f.id);
    if (!shot) return false;
    f.commandedAt = c.tick;
    let sound = "heavy-flak-command";
    if (f.handling === "running") {
      this.queue(f, c.tick, "running", { x: shot.x, y: shot.y }, false, 1);
    } else if (f.handling === "hanging" && f.parkedAt === undefined) {
      f.parkedAt = c.tick;
      shot.vx = 0;
      shot.vy = 0;
      c.update({ ...shot });
      sound = "heavy-flak-arrest";
    } else {
      this.queue(f, c.tick, "command", { x: shot.x, y: shot.y });
      c.remove(shot);
    }
    c.sound(p, sound);
    return true;
  }
  advance(s: Shot, c: FlakFlightContext) {
    const f = this.flights.get(s.id);
    if (!f || !this.valid(c.owner, f)) {
      this.forget(s.id);
      return false;
    }
    const b = c.bounds,
      pad = s.radius;
    if (
      s.x < b.x + pad ||
      s.y < b.y + pad ||
      s.x > b.x + b.width - pad ||
      s.y > b.y + b.height - pad
    ) {
      this.forget(s.id);
      return false;
    }
    if (c.tick >= f.until) {
      this.queue(f, c.tick, "fuse", { x: s.x, y: s.y });
      return false;
    }
    const from = { x: s.x, y: s.y },
      to = { x: s.x + s.vx * DT, y: s.y + s.vy * DT };
    let wall = Infinity,
      bound = Infinity;
    for (const r of c.obstacles) {
      const hit = segmentRect(from, to, r, pad);
      if (hit) wall = Math.min(wall, hit.t);
    }
    for (const [axis, lo, hi] of [
      ["x", b.x + pad, b.x + b.width - pad],
      ["y", b.y + pad, b.y + b.height - pad],
    ] as const) {
      const delta = to[axis] - from[axis];
      if (delta > 0) bound = Math.min(bound, (hi - from[axis]) / delta);
      if (delta < 0) bound = Math.min(bound, (lo - from[axis]) / delta);
    }
    const body = c.body(from, to, { from: 0, to: 1 }) ?? Infinity,
      hit = Math.min(wall, body, bound);
    if (hit <= 1) {
      const at = {
        x: from.x + (to.x - from.x) * Math.max(0, hit),
        y: from.y + (to.y - from.y) * Math.max(0, hit),
      };
      s.x = at.x;
      s.y = at.y;
      if (bound <= wall && bound <= body) this.forget(s.id);
      else this.queue(f, c.tick, "contact", at);
      return false;
    }
    s.x = to.x;
    s.y = to.y;
    f.x = s.x;
    f.y = s.y;
    return true;
  }
  flush(c: FlakBurstContext) {
    const work = this.pending.splice(0);
    if (!c.combat) return;
    for (const f of work) {
      const p = c.players.find((p) => p.id === f.owner);
      if (!this.validPending(p, f)) {
        this.quotas.delete(f.token);
        continue;
      }
      const remaining = this.quotas.get(f.token);
      if (remaining === undefined) continue;
      const shape = this.shape(f.pattern),
        hits = c
          .shots()
          .flatMap((s) => {
            if (
              s.owner !== "hostile" ||
              s.radius <= 0 ||
              s.radius > this.rules.maximumHostileRadius ||
              s.expires <= c.tick
            )
              return [];
            const hit = swordCircleContact(
              f,
              f.aim,
              shape.radius,
              shape.arc,
              s,
              s.radius,
              c.obstacles,
            );
            return hit ? [{ s, near: hit.time * shape.radius }] : [];
          })
          .sort((a, b) => a.near - b.near || a.s.id - b.s.id);
      const contacts: Vec[] = [];
      for (const h of hits) {
        if (contacts.length >= Math.min(f.limit, remaining)) break;
        const point = { x: h.s.x, y: h.s.y };
        if (c.remove(h.s)) contacts.push(point);
      }
      this.quotas.set(f.token, remaining - contacts.length);
      if (f.terminal) this.quotas.delete(f.token);
      this.bursts.push({
        kind: "heavy-flak-burst",
        id: c.id(),
        owner: f.owner,
        x: f.x,
        y: f.y,
        at: c.tick,
        until: c.tick + ticks(this.rules.burstSeconds),
        radius: shape.radius,
        arc: shape.arc,
        aim: f.aim,
        contacts,
      });
      c.sound(p, "heavy-flak-burst", { x: f.x, y: f.y });
    }
    for (const token of this.quotas.keys())
      if (
        ![...this.flights.values()].some((f) => f.token === token) &&
        !this.pending.some((f) => f.token === token)
      )
        this.quotas.delete(token);
  }
  cues() {
    return this.bursts;
  }
}

export const heavyFlakRules: FlakRules = {
  ...catalog.rules.heavyFlak,
  frontalArc: (catalog.rules.heavyFlak.frontalArcDegrees * Math.PI) / 180,
};
