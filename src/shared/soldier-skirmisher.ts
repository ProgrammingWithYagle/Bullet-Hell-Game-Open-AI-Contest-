import catalog from "../../content/catalog.json";
import { HZ, type Vec } from "./protocol.ts";
import { distance, segmentCircle, segmentRect, type Rect } from "./geometry.ts";
import type { Player, Stats } from "./game.ts";

export const skirmisherIds = {
  entry: "soldier-skirmisher-1",
  advance: "soldier-skirmisher-advance-1",
  rear: "soldier-skirmisher-rear-1",
  drill: "soldier-skirmisher-drill-1",
  roving: "soldier-skirmisher-roving-1",
} as const;
export const skirmisherRules = catalog.rules.soldierSkirmisher;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export type SoldierStepCue = Vec & {
  kind: "soldier-step";
  id: number;
  owner: string;
  toX: number;
  toY: number;
  at: number;
  until: number;
  mode: "passing" | "advance" | "rear";
  aim: number;
  radius: number;
};
export type SoldierLoadCue = Vec & {
  kind: "soldier-load";
  radius: number;
  id: number;
  owner: string;
  at: number;
  roundAt: number;
  nextAt: number;
  until: number;
  total: number;
  loaded: number;
  roving: boolean;
};
export type SoldierCue = SoldierStepCue | SoldierLoadCue;
export type SkirmisherContext = {
  tick: number;
  players: readonly Player[];
  obstacles: readonly Rect[];
  terrain: { bounds: Rect; lava: readonly (Vec & { radius: number })[] };
  stats(p: Player): Stats;
  id(): number;
  shoot(p: Player, point: Vec, aim: number, damage: number): void;
  intercept(p: Player, from: Vec, to: Vec, radius: number): boolean;
  sound(p: Player, id: string): void;
};
type Motion = SoldierStepCue & { damage: number; middleFired: boolean };
type Loading = Omit<
  SoldierLoadCue,
  "kind" | "radius" | "x" | "y" | "roving"
> & { weapon: string; interval: number };
type State = {
  windowUntil: number;
  technique1At: number;
  technique2At: number;
  motion?: Motion;
  load?: Loading;
};
const live = (p: Player | undefined): p is Player =>
  !!p &&
  p.classId === "soldier" &&
  p.connected &&
  p.status === "active" &&
  p.health > 0 &&
  p.skills.includes(skirmisherIds.entry);
const point = (m: Motion, tick: number): Vec => {
  const u = Math.max(0, Math.min(1, (tick - m.at) / (m.until - m.at)));
  return { x: m.x + (m.toX - m.x) * u, y: m.y + (m.toY - m.y) * u };
};

/** A follow-through supplements the issued burst; it never replaces its rounds. */
export class SoldierSkirmisher {
  private states = new Map<string, State>();
  clear() {
    this.states.clear();
  }
  remove(id: string) {
    const s = this.states.get(id);
    if (s) {
      s.windowUntil = 0;
      s.motion = undefined;
      s.load = undefined;
    }
  }
  hasMotion(id: string) {
    return !!this.states.get(id)?.motion;
  }
  isLoading(id: string) {
    return !!this.states.get(id)?.load;
  }
  stopLoading(id: string) {
    const s = this.states.get(id);
    if (s) s.load = undefined;
  }
  status(id: string) {
    const s = this.states.get(id);
    return {
      soldierFollowupUntil: s?.windowUntil ?? 0,
      soldierStepUntil: s?.motion?.until ?? 0,
      technique1At: s?.technique1At ?? 0,
      technique2At: s?.technique2At ?? 0,
      soldierLoadUntil: s?.load?.until ?? 0,
      soldierLoadNextAt: s?.load?.nextAt ?? 0,
      soldierLoadTotal: s?.load?.total ?? 0,
      soldierLoadInserted: s?.load?.loaded ?? 0,
    };
  }
  private state(id: string) {
    return (
      this.states.get(id) ?? {
        windowUntil: 0,
        technique1At: 0,
        technique2At: 0,
      }
    );
  }
  /** Toggle finite personal loading; stopping preserves inserted rounds, never recovery. */
  load(p: Player, c: SkirmisherContext) {
    if (!live(p) || !p.skills.includes(skirmisherIds.drill) || p.input.reload)
      return false;
    const s = this.state(p.id);
    if (s.load) {
      s.load = undefined;
      return true;
    }
    const stats = c.stats(p),
      weapon = catalog.weapons.find((w) => w.id === p.weapon);
    if (
      !weapon ||
      c.tick < s.technique2At ||
      p.dashUntil > c.tick ||
      p.channelUntil > c.tick ||
      p.overdriveUntil > c.tick ||
      p.ammo >= stats.magazine ||
      (s.motion && !p.skills.includes(skirmisherIds.roving))
    )
      return false;
    const total = Math.min(
        skirmisherRules.drillRounds,
        stats.magazine - p.ammo,
      ),
      first = ticks(
        weapon.reloadTime * stats.reload * skirmisherRules.drillFirstFraction,
      ),
      interval = ticks(
        weapon.reloadTime * stats.reload * skirmisherRules.drillRoundFraction,
      );
    // Normal reload work is forfeited, not converted into immediate cartridges.
    p.reloadAt = 0;
    this.states.set(p.id, {
      ...s,
      technique2At:
        c.tick + ticks(skirmisherRules.drillCooldown * stats.cooldown),
      load: {
        id: c.id(),
        owner: p.id,
        weapon: p.weapon,
        at: c.tick,
        roundAt: c.tick,
        nextAt: c.tick + first,
        until: c.tick + first + interval * (total - 1),
        total,
        loaded: 0,
        interval,
      },
    });
    c.sound(p, "soldier-load-start");
    return true;
  }
  /** Shared combat clock only: no wall-clock/loading progress is saved or refunded. */
  advanceLoad(p: Player, c: SkirmisherContext) {
    const s = this.states.get(p.id),
      load = s?.load;
    if (!s || !load) return;
    if (
      !live(p) ||
      !p.skills.includes(skirmisherIds.drill) ||
      p.weapon !== load.weapon ||
      p.dashUntil > c.tick ||
      p.channelUntil > c.tick ||
      p.reloadAt > 0 ||
      p.ammo >= c.stats(p).magazine
    ) {
      s.load = undefined;
      return;
    }
    if (c.tick < load.nextAt) return;
    p.ammo = Math.min(c.stats(p).magazine, p.ammo + 1);
    load.loaded++;
    c.sound(p, "soldier-load-round");
    if (load.loaded >= load.total || p.ammo >= c.stats(p).magazine)
      s.load = undefined;
    else {
      load.roundAt = load.nextAt;
      load.nextAt += load.interval;
    }
  }
  burst(p: Player, c: SkirmisherContext) {
    if (!live(p)) return;
    const s = this.state(p.id);
    this.states.set(p.id, {
      ...s,
      windowUntil: c.tick + ticks(skirmisherRules.followupSeconds),
      load: p.skills.includes(skirmisherIds.roving) ? s.load : undefined,
    });
  }
  private legal(from: Vec, to: Vec, c: SkirmisherContext) {
    const radius = catalog.rules.playerRadius,
      b = c.terrain.bounds;
    return (
      to.x - radius >= b.x &&
      to.y - radius >= b.y &&
      to.x + radius <= b.x + b.width &&
      to.y + radius <= b.y + b.height &&
      from.x - radius >= b.x &&
      from.y - radius >= b.y &&
      from.x + radius <= b.x + b.width &&
      from.y + radius <= b.y + b.height &&
      !c.obstacles.some((w) => segmentRect(from, to, w, radius) !== null) &&
      !c.terrain.lava.some(
        (l) => segmentCircle(from, to, l, l.radius + radius) !== null,
      )
    );
  }
  cast(p: Player, c: SkirmisherContext) {
    if (!live(p) || p.dashUntil > c.tick || p.channelUntil > c.tick)
      return false;
    const s = this.state(p.id);
    if (s.motion || c.tick >= s.windowUntil || c.tick < s.technique1At)
      return false;
    const mode = p.skills.includes(skirmisherIds.advance)
      ? "advance"
      : p.skills.includes(skirmisherIds.rear)
        ? "rear"
        : "passing";
    let x = p.input.moveX,
      y = p.input.moveY;
    if (mode !== "passing") {
      const sign = mode === "rear" ? -1 : 1;
      x = Math.cos(p.aim) * sign;
      y = Math.sin(p.aim) * sign;
    }
    const length = Math.hypot(x, y);
    if (length < 0.05) return false;
    const to = {
      x: p.x + (x / length) * skirmisherRules.stepDistance,
      y: p.y + (y / length) * skirmisherRules.stepDistance,
    };
    if (!this.legal(p, to, c)) return false;
    const m: Motion = {
      kind: "soldier-step",
      id: c.id(),
      owner: p.id,
      x: p.x,
      y: p.y,
      toX: to.x,
      toY: to.y,
      at: c.tick,
      until: c.tick + ticks(skirmisherRules.stepSeconds),
      mode,
      aim: p.aim,
      radius: catalog.rules.playerRadius,
      damage: skirmisherRules.shotDamage * c.stats(p).ability,
      middleFired: false,
    };
    this.states.set(p.id, {
      ...s,
      load: p.skills.includes(skirmisherIds.roving) ? s.load : undefined,
      windowUntil: 0,
      technique1At:
        c.tick + ticks(skirmisherRules.followupCooldown * c.stats(p).cooldown),
      motion: m,
    });
    if (mode === "advance") c.shoot(p, p, m.aim, m.damage / 2);
    c.sound(p, "soldier-footwork");
    return true;
  }
  /** Called before the ordinary player move, so body/projectile sweeps see it. */
  movement(p: Player, c: SkirmisherContext): Vec | null {
    const s = this.states.get(p.id),
      m = s?.motion;
    if (!s || !m) return null;
    if (
      !live(p) ||
      p.dashUntil > c.tick ||
      p.channelUntil > c.tick ||
      c.tick > m.until ||
      distance(p, point(m, c.tick - 1)) > 0.02 ||
      !this.legal(p, { x: m.toX, y: m.toY }, c)
    ) {
      s.motion = undefined;
      return null;
    }
    const next = point(m, c.tick);
    return { x: next.x - p.x, y: next.y - p.y };
  }
  /** External forces/cover cancel at the actual body; no snap or refund. */
  afterMove(p: Player, c: SkirmisherContext) {
    const s = this.states.get(p.id),
      m = s?.motion;
    if (!s || !m) return;
    if (!live(p) || distance(p, point(m, c.tick)) > 0.02) {
      s.motion = undefined;
      return;
    }
    if (
      m.mode === "rear" &&
      !m.middleFired &&
      c.tick >= m.at + Math.ceil((m.until - m.at) / 2)
    ) {
      m.middleFired = true;
      c.shoot(p, p, m.aim, m.damage);
      c.intercept(
        p,
        p,
        {
          x: p.x + Math.cos(m.aim) * skirmisherRules.guardReach,
          y: p.y + Math.sin(m.aim) * skirmisherRules.guardReach,
        },
        skirmisherRules.guardRadius,
      );
    }
    if (c.tick >= m.until) {
      if (m.mode !== "rear")
        c.shoot(
          p,
          p,
          m.mode === "advance" ? p.aim : m.aim,
          m.damage / (m.mode === "advance" ? 2 : 1),
        );
      s.motion = undefined;
    }
  }
  step(c: SkirmisherContext) {
    for (const [id, s] of this.states) {
      const p = c.players.find((p) => p.id === id);
      if (!live(p)) {
        if (!p) this.states.delete(id);
        else this.remove(id);
        continue;
      }
      this.advanceLoad(p, c);
      if (s.windowUntil <= c.tick) s.windowUntil = 0;
      if (
        s.motion &&
        (p.dashUntil > c.tick ||
          p.channelUntil > c.tick ||
          c.tick > s.motion.until)
      )
        s.motion = undefined;
    }
  }
  cues(players: readonly Player[] = []): SoldierCue[] {
    const result: SoldierCue[] = [];
    for (const [id, s] of this.states) {
      if (s.motion) {
        const { damage: _d, middleFired: _m, ...cue } = s.motion;
        result.push(cue);
      }
      const p = players.find((p) => p.id === id);
      if (s.load && live(p)) {
        const { weapon: _w, interval: _i, ...progress } = s.load;
        result.push({
          kind: "soldier-load",
          radius: catalog.rules.playerRadius + 8,
          ...progress,
          x: p.x,
          y: p.y,
          roving: p.skills.includes(skirmisherIds.roving),
        });
      }
    }
    return result;
  }
}
