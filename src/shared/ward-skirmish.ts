import { HZ, type Vec } from "./protocol.ts";
import { distance, segmentRect, type Rect } from "./geometry.ts";
import type { Minion, MinionSpawn } from "./minions.ts";

export type SkirmishView = {
  id: "ward-approach";
  status: "briefing" | "warning" | "fighting" | "rest" | "complete" | "failed";
  wave: number;
  waves: number;
  defeated: number;
  total: number;
  remaining: number;
  deadline: number;
  portals: (Vec & { at: number })[];
};
type Context = {
  now: number;
  bounds: Rect;
  obstacles: Rect[];
  lava: (Vec & { radius: number })[];
  targets: Vec[];
  actors: Map<number, Minion>;
  healthScale: number;
  damageScale: number;
  speedScale: number;
  spawn(definition: MinionSpawn): Minion | null;
};
export const wardSkirmishRules = {
  warning: 2.5,
  rest: 3,
  deadline: 180,
  radius: 12,
  spawnDistance: 170,
  maximumPerWave: 48,
};
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
/** Legal, well-separated spawn sites. No site is silently relocated after its warning. */
export function skirmishSites(
  bounds: Rect,
  obstacles: Rect[],
  lava: (Vec & { radius: number })[],
  targets: Vec[],
) {
  const sites: Vec[] = [];
  const columns = Math.max(2, Math.floor(bounds.width / 90)),
    rows = Math.max(2, Math.floor(bounds.height / 90));
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const p = {
        x: bounds.x + 35 + (column * (bounds.width - 70)) / (columns - 1),
        y: bounds.y + 35 + (row * (bounds.height - 70)) / (rows - 1),
      };
      if (
        obstacles.some((rect) => segmentRect(p, p, rect, 26)) ||
        lava.some((pit) => distance(p, pit) < pit.radius + 26) ||
        targets.some((t) => distance(t, p) < wardSkirmishRules.spawnDistance)
      )
        continue;
      sites.push(p);
    }
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  return sites.toSorted(
    (a, b) =>
      distance(b, center) - distance(a, center) || a.y - b.y || a.x - b.x,
  );
}
/** Shared fixed-step objective. It never refers to a boss or awards boss/progression receipts. */
export class WardSkirmish {
  private state: SkirmishView = {
    id: "ward-approach",
    status: "briefing",
    wave: 0,
    waves: 3,
    defeated: 0,
    total: 0,
    remaining: 0,
    deadline: 0,
    portals: [],
  };
  private counts: number[] = [];
  private alive = new Map<number, number>();
  private pending = 0;
  private nextAt = 0;
  private turn = 0;
  start(now: number, party: number) {
    const scale = Math.min(4, Math.sqrt(Math.max(1, Math.min(50, party))));
    this.counts = [4, 6, 8].map((n) =>
      Math.min(wardSkirmishRules.maximumPerWave, Math.ceil(n * scale)),
    );
    const total = this.counts.reduce((a, b) => a + b, 0);
    this.state = {
      id: "ward-approach",
      status: "rest",
      wave: 0,
      waves: 3,
      defeated: 0,
      total,
      remaining: total,
      deadline: now + ticks(wardSkirmishRules.deadline),
      portals: [],
    };
    this.alive.clear();
    this.pending = 0;
    this.nextAt = now;
    this.turn = 0;
  }
  view(): SkirmishView {
    return {
      ...this.state,
      portals: this.state.portals.map((p) => ({ ...p })),
    };
  }
  cancel() {
    this.state.portals = [];
    this.alive.clear();
    this.pending = 0;
  }
  fail() {
    this.state.status = "failed";
    this.cancel();
  }
  step(c: Context) {
    const s = this.state;
    if (["briefing", "complete", "failed"].includes(s.status)) return;
    if (c.now >= s.deadline) {
      this.fail();
      return;
    }
    for (const [id, expires] of this.alive)
      if (!c.actors.has(id)) {
        if (c.now >= expires) {
          this.fail();
          return;
        }
        this.alive.delete(id);
        s.defeated++;
        s.remaining--;
      }
    if (s.status === "warning") {
      if (!s.portals.length || c.now < s.portals[0].at) return;
      const promised = s.portals;
      s.portals = [];
      for (const point of promised) {
        // An occupied or changed site is cancelled, then receives a fresh warning later.
        if (
          c.targets.some((t) => distance(t, point) < 55) ||
          c.obstacles.some((r) => segmentRect(point, point, r, 26)) ||
          c.lava.some((pit) => distance(point, pit) < pit.radius + 26)
        )
          continue;
        const actor = c.spawn({
          kind: "ordinary",
          x: point.x,
          y: point.y,
          health: (42 + s.wave * 5) * c.healthScale,
          radius: wardSkirmishRules.radius,
          speed: (48 + s.wave * 6) * c.speedScale,
          damage: 5 * c.damageScale,
          lifeSeconds: 600,
        });
        if (!actor) continue;
        this.alive.set(actor.id, actor.expires);
        this.pending--;
      }
      s.status = "fighting";
    }
    if (s.status === "fighting") {
      if (this.pending > 0 && c.actors.size < 50) this.announce(c);
      if (!this.pending && !this.alive.size) {
        if (s.wave === s.waves) {
          s.status = "complete";
          this.cancel();
        } else {
          s.status = "rest";
          this.nextAt = c.now + ticks(wardSkirmishRules.rest);
        }
      }
    }
    if (s.status === "rest" && c.now >= this.nextAt) {
      s.wave++;
      this.pending = this.counts[s.wave - 1];
      s.status = "fighting";
      this.announce(c);
    }
  }
  private announce(c: Context) {
    const sites = skirmishSites(c.bounds, c.obstacles, c.lava, c.targets);
    if (!sites.length || !c.targets.length) return;
    const offset = this.turn++ % sites.length;
    this.state.portals = sites
      .slice(offset)
      .concat(sites.slice(0, offset))
      .slice(0, Math.min(this.pending, 50 - c.actors.size))
      .map((p) => ({ ...p, at: c.now + ticks(wardSkirmishRules.warning) }));
    if (this.state.portals.length) this.state.status = "warning";
  }
}
