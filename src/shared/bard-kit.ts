import catalog from "../../content/catalog.json";
import { hasTalent } from "./class-talents.ts";
import type { ClassKits, KitContext } from "./class-kits.ts";
import type { Player } from "./game.ts";
import { distance, moveBody } from "./geometry.ts";
import { HZ, type Vec } from "./protocol.ts";

const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export const CADENCE_MAXIMUM = 3;
export const CADENCE_HIT_INTERVAL = ticks(1 / 3);
export type BardCue = {
  kind: "bard-phrase" | "bard-cut";
  id: number;
  owner: string;
  x: number;
  y: number;
  radius: number;
  at: number;
  until: number;
  cadence: number;
  beat: number;
  encore: boolean;
  x2?: number;
  y2?: number;
};
export type BardContext = KitContext & {
  kits: ClassKits;
  shield(ally: Player, amount: number, until: number): void;
  eraseLine(from: Vec, to: Vec, radius: number, maximum: number): number;
  sound(id: string, source: Player): void;
};
type Performance = {
  owner: string;
  point: Vec;
  encore: boolean;
  cadence: number;
  radius: number;
  damage: number;
  shield: number;
  remaining: number;
  beat: number;
  nextAt: number;
  interval: number;
  held: boolean;
  travelling: boolean;
};

/** Fixed-step performances. Only actual primary-weapon hits can earn cadence. */
export class BardKit {
  private meters = new Map<string, { cadence: number; hitAt: number }>();
  private performances: Performance[] = [];
  private visible: BardCue[] = [];
  clear() {
    this.meters.clear();
    this.performances = [];
    this.visible = [];
  }
  status(id: string) {
    return { cadence: this.meters.get(id)?.cadence ?? 0 };
  }
  primaryHit(source: Player | undefined, actual: number, now: number) {
    if (
      !source ||
      source.classId !== "bard" ||
      source.status !== "active" ||
      !source.connected ||
      !Number.isFinite(actual) ||
      actual <= 0
    )
      return false;
    const meter = this.meters.get(source.id) ?? {
      cadence: 0,
      hitAt: -Infinity,
    };
    if (now < meter.hitAt + CADENCE_HIT_INTERVAL) return false;
    meter.hitAt = now;
    meter.cadence = Math.min(CADENCE_MAXIMUM, meter.cadence + 1);
    this.meters.set(source.id, meter);
    return true;
  }
  cues(): BardCue[] {
    return this.visible.map((cue) => ({ ...cue }));
  }
  cast(p: Player, slot: "q" | "e" | "ultimate", c: BardContext) {
    if (p.classId !== "bard" || p.status !== "active" || !p.connected)
      return false;
    const s = c.stats(p),
      cl = catalog.classes.find((cl) => cl.id === "bard")!;
    if (slot === "e") {
      const from = { x: p.x, y: p.y },
        to = moveBody(
          p,
          {
            x: Math.cos(p.aim) * cl.abilities[1].radius,
            y: Math.sin(p.aim) * cl.abilities[1].radius,
          },
          12,
          c.obstacles,
        );
      c.sweep(p, from, to, 18, cl.abilities[1].damage * s.ability, new Set());
      c.eraseLine(from, to, 22, 8);
      if (hasTalent(p, "borrowed-cue"))
        c.kits.placeDecoy(p, c, to, 30, 4, "bard-borrowed-cue");
      this.visible.push({
        kind: "bard-cut",
        id: c.id(),
        owner: p.id,
        ...from,
        x2: to.x,
        y2: to.y,
        radius: 22,
        at: c.tick,
        until: c.tick + ticks(0.25),
        cadence: 0,
        beat: 0,
        encore: false,
      });
      c.sound("bard-cut", p);
      return true;
    }
    const encore = slot === "ultimate",
      cadence = this.status(p.id).cadence,
      a = encore ? cl.ultimate : cl.abilities[0],
      potency = s.ability * (encore ? 1 + (s.effects.ultimatePotency ?? 0) : 1);
    this.meters.set(p.id, {
      cadence: 0,
      hitAt: this.meters.get(p.id)?.hitAt ?? -Infinity,
    });
    // One Q and one Encore per owner; recasting replaces the prior performance.
    this.performances = this.performances.filter(
      (v) => v.owner !== p.id || v.encore !== encore,
    );
    this.performances.push({
      owner: p.id,
      point: { x: p.x, y: p.y },
      encore,
      cadence,
      radius:
        a.radius * (1 + (s.effects.phraseRadius ?? 0)) +
        (encore ? (s.effects.ultimateRadius ?? 0) : 0),
      damage: (a.damage + cadence * (encore ? 4 : 5)) * potency,
      shield: (encore ? 18 + cadence * 2 : 6 + cadence * 3) * potency,
      remaining: encore
        ? Math.min(
            12,
            6 +
              Math.floor(s.effects.ultimateDuration ?? 0) +
              Math.floor(s.effects.ultimatePulses ?? 0),
          )
        : 3,
      beat: 0,
      nextAt: c.tick,
      interval: ticks(encore ? 1 : 0.75),
      held: !encore && hasTalent(p, "held-note"),
      travelling: !encore || hasTalent(p, "travelling-chorus"),
    });
    return true;
  }
  step(c: BardContext) {
    const active = new Map(
      c.players
        .filter(
          (p) => p.classId === "bard" && p.status === "active" && p.connected,
        )
        .map((p) => [p.id, p]),
    );
    for (const id of this.meters.keys())
      if (!active.has(id)) this.meters.delete(id);
    this.visible = this.visible.filter(
      (cue) => cue.until > c.tick && active.has(cue.owner),
    );
    this.performances = this.performances.filter((v) => active.has(v.owner));
    for (const v of this.performances) {
      if (c.tick < v.nextAt || v.remaining <= 0) continue;
      const owner = active.get(v.owner)!,
        point = v.travelling ? owner : v.point,
        finalHeld = v.held && v.remaining === 1,
        radius = v.radius * (finalHeld ? 1.4 : 1);
      c.area(
        owner,
        point,
        radius,
        v.damage,
        0.75,
        ticks(finalHeld ? 2.5 : 1.25),
        !v.encore && v.cadence > 0 ? "phrased-hit" : undefined,
      );
      for (const ally of c.players)
        if (
          ally.status === "active" &&
          ally.connected &&
          distance(ally, point) <= radius
        )
          c.shield(ally, v.shield * (finalHeld ? 2 : 1), c.tick + ticks(2));
      this.visible.push({
        kind: "bard-phrase",
        id: c.id(),
        owner: owner.id,
        x: point.x,
        y: point.y,
        radius,
        at: c.tick,
        until: c.tick + ticks(0.45),
        cadence: v.cadence,
        beat: v.beat,
        encore: v.encore,
      });
      c.sound(
        v.encore ? "bard-encore-" + (v.beat % 3) : "bard-phrase-" + v.beat,
        owner,
      );
      v.beat++;
      v.remaining--;
      v.nextAt += v.interval;
    }
    this.performances = this.performances.filter((v) => v.remaining > 0);
  }
}
