import catalog from "../../content/catalog.json";
import { HZ, type Vec } from "./protocol.ts";
import { distance, segmentCircle, segmentRect, type Rect } from "./geometry.ts";
import type { Player, Stats } from "./game.ts";

export const skirmisherIds = {
  entry: "soldier-skirmisher-1",
  advance: "soldier-skirmisher-advance-1",
  rear: "soldier-skirmisher-rear-1",
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
type State = { windowUntil: number; technique1At: number; motion?: Motion };
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
    this.states.delete(id);
  }
  hasMotion(id: string) {
    return !!this.states.get(id)?.motion;
  }
  status(id: string) {
    const s = this.states.get(id);
    return {
      soldierFollowupUntil: s?.windowUntil ?? 0,
      soldierStepUntil: s?.motion?.until ?? 0,
      technique1At: s?.technique1At ?? 0,
    };
  }
  private state(id: string) {
    return this.states.get(id) ?? { windowUntil: 0, technique1At: 0 };
  }
  burst(p: Player, c: SkirmisherContext) {
    if (!live(p)) return;
    const s = this.state(p.id);
    this.states.set(p.id, {
      ...s,
      windowUntil: c.tick + ticks(skirmisherRules.followupSeconds),
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
        this.states.delete(id);
        continue;
      }
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
  cues(): SoldierStepCue[] {
    return [...this.states.values()].flatMap((s) => {
      if (!s.motion) return [];
      const { damage: _d, middleFired: _m, ...cue } = s.motion;
      return [cue];
    });
  }
}
