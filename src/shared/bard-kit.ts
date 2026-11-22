import catalog from "../../content/catalog.json";
import { hasTalent } from "./class-talents.ts";
import type { ClassKits, KitContext } from "./class-kits.ts";
import type { Player } from "./game.ts";
import { distance, moveBody, segmentCircle, segmentRect } from "./geometry.ts";
import { HZ, type Vec } from "./protocol.ts";

const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export const CADENCE_MAXIMUM = 3;
export const CADENCE_HIT_INTERVAL = ticks(1 / 3);
export const callAndResponseId = 'bard-call-and-response-1';
export const conductorIds = { entry: callAndResponseId, side: 'bard-conductor-side-stage-1', reprise: 'bard-conductor-reprise-1' } as const;
export const conductorRules = { cadence: 2, reach: 156, stageRadius: 62, ownerReach: 230, stageTicks: ticks(3.8), floorPadding: 12,
  shiftMinimum: 42, shiftMaximum: 103, repriseRange: 42, repriseAim: .3 } as const;
export type BardPrimaryNote = Vec & { at: number };
export type ConductorStatus = {
  phase: 'idle' | 'listening' | 'answer';
  ready: boolean;
  stage?: Vec;
  until?: number;
  adjustment?: Vec;
  answerAt?: Vec;
  returning?: boolean;
};
export type ConductorCue = Vec & { kind: 'bard-response-stage'; id: number; owner: string; originX: number; originY: number;
  radius: number; at: number; until: number; proof: boolean; shifted?: true };
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

type Reply = { id: number; origin: Vec; stage: Vec; madeAt: number; until: number; noteSince: number; performance: Performance;
  provedAt?: number; shifted?: true };

const point = ({ x, y }: Vec): Vec => ({ x, y });
const canConduct = (p: Player) => p.classId === 'bard' && p.status === 'active' && p.health > 0 && p.connected && !p.expired && p.skills.includes(callAndResponseId);

function legalStage(origin: Vec, stage: Vec, c: BardContext): boolean {
  const terrain = c.terrain;
  if (!terrain) return false;
  const { bounds, lava } = terrain, pad = conductorRules.floorPadding;
  return stage.x >= bounds.x + pad && stage.x <= bounds.x + bounds.width - pad &&
    stage.y >= bounds.y + pad && stage.y <= bounds.y + bounds.height - pad &&
    c.obstacles.every(wall => segmentRect(origin, stage, wall, pad) === null) &&
    lava.every(pit => segmentCircle(origin, stage, pit, pit.radius + pad) === null);
}

function proposedStage(aim: number, origin: Vec) {
  return { x: origin.x + Math.cos(aim) * conductorRules.reach, y: origin.y + Math.sin(aim) * conductorRules.reach };
}

/** Fixed-step performances. Only actual primary-weapon hits can earn cadence. */
export class BardKit {
  private meters = new Map<string, { cadence: number; hitAt: number }>();
  private performances: Performance[] = [];
  private replies = new Map<string, Reply>();
  private visible: BardCue[] = [];
  clear() {
    this.meters.clear();
    this.replies.clear();
    this.performances = [];
    this.visible = [];
  }
  status(id: string) {
    return { cadence: this.meters.get(id)?.cadence ?? 0 };
  }
  dropConductor(id: string) { this.replies.delete(id); }

  conductorStatus(p: Player, c: BardContext, combat: boolean): ConductorStatus {
    if (!combat || !canConduct(p)) return { phase: 'idle', ready: false };
    const reply = this.replies.get(p.id);
    const freeHands = p.dashUntil <= c.tick && p.channelUntil <= c.tick;
    if (reply) {
      const live = c.tick < reply.until && freeHands && legalStage(reply.origin, reply.stage, c);
      if (reply.provedAt === undefined) {
        const adjustment = live ? this.sideStage(p, reply, c) : undefined;
        return { phase: 'listening', ready: !!adjustment, stage: point(reply.stage), until: reply.until, adjustment };
      }
      const returning = this.returningReply(p, reply, c);
      const answerAt = returning ? reply.origin : reply.stage;
      const ready = live && distance(p, answerAt) <= conductorRules.ownerReach && legalStage(p, answerAt, c);
      return { phase: 'answer', ready, stage: point(reply.stage), until: reply.until, answerAt: point(answerAt), returning };
    }
    const stage = proposedStage(p.aim, p);
    const ready = freeHands && p.qAt <= c.tick && this.status(p.id).cadence >= conductorRules.cadence && legalStage(p, stage, c);
    return { phase: 'idle', ready, stage: ready ? stage : undefined, until: p.qAt };
  }

  private sideStage(p: Player, reply: Reply, c: BardContext) {
    if (!p.skills.includes(conductorIds.side) || reply.shifted || this.status(p.id).cadence < 1) return undefined;
    const adjustment = proposedStage(p.aim, reply.origin), delta = distance(reply.stage, adjustment);
    if (delta < conductorRules.shiftMinimum || delta > conductorRules.shiftMaximum || distance(p, adjustment) > conductorRules.ownerReach ||
        !legalStage(reply.origin, adjustment, c) || !legalStage(p, adjustment, c)) return undefined;
    return adjustment;
  }

  private returningReply(p: Player, reply: Reply, c: BardContext) {
    if (!p.skills.includes(conductorIds.reprise) || distance(p, reply.origin) < conductorRules.repriseRange || !legalStage(p, reply.origin, c)) return false;
    const difference = Math.atan2(reply.origin.y - p.y, reply.origin.x - p.x) - p.aim;
    return Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference))) <= conductorRules.repriseAim;
  }

  conduct(p: Player, c: BardContext): 'call' | 'answer' | 'shift' | undefined {
    const status = this.conductorStatus(p, c, true);
    if (!status.ready || !status.stage) return undefined;
    const reply = this.replies.get(p.id);
    if (reply) {
      if (status.adjustment) {
        const meter = this.meters.get(p.id)!;
        meter.cadence--;
        reply.stage = status.adjustment;
        reply.noteSince = c.tick;
        reply.shifted = true;
        c.sound('bard-answer-shift', p);
        return 'shift';
      }
      if (!status.answerAt) return undefined;
      this.replies.delete(p.id);
      this.playBeat(reply.performance, p, status.answerAt, c, true);
      if (status.returning) c.sound('bard-answer-reprise', p);
      c.sound('bard-answer-release', p);
      return 'answer';
    }
    const performance = this.createPerformance(p, 'q', c);
    const origin = point(p);
    const newReply = { id: c.id(), origin, stage: status.stage, madeAt: c.tick, noteSince: c.tick,
      until: c.tick + conductorRules.stageTicks, performance };
    this.replies.set(p.id, newReply);
    this.playBeat(performance, p, origin, c, true);
    performance.remaining = 1;
    c.sound('bard-answer-call', p);
    return 'call';
  }

  primaryHit(source: Player | undefined, actual: number, now: number, note?: BardPrimaryNote,
    onProof?: (owner: Player, stage: Vec) => void) {
    if (
      !source ||
      source.classId !== "bard" ||
      source.status !== "active" ||
      !source.connected ||
      !Number.isFinite(actual) ||
      actual <= 0
    )
      return false;
    const reply = this.replies.get(source.id);
    if (reply && note && canConduct(source) && reply.provedAt === undefined && note.at >= reply.noteSince && now < reply.until &&
        distance(note, reply.stage) <= conductorRules.stageRadius) {
      reply.provedAt = now;
      onProof?.(source, reply.stage);
    }
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
    return this.visible.map(cue => ({ ...cue }));
  }

  conductorCues(): ConductorCue[] {
    return [...this.replies].map(([owner, reply]) => ({
      kind: 'bard-response-stage', owner, id: reply.id, ...reply.stage, originX: reply.origin.x, originY: reply.origin.y,
      radius: conductorRules.stageRadius, at: reply.madeAt, until: reply.until, proof: reply.provedAt !== undefined, shifted: reply.shifted,
    }));
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
    const performance = this.createPerformance(p, slot, c);
    this.performances = this.performances.filter(v => v.owner !== p.id || v.encore !== performance.encore);
    this.performances.push(performance);
    return true;
  }

  private createPerformance(p: Player, slot: 'q' | 'ultimate', c: BardContext): Performance {
    const s = c.stats(p), cl = catalog.classes.find(cl => cl.id === 'bard')!;
    const encore = slot === "ultimate",
      cadence = this.status(p.id).cadence,
      a = encore ? cl.ultimate : cl.abilities[0],
      potency = s.ability * (encore ? 1 + (s.effects.ultimatePotency ?? 0) : 1);
    this.meters.set(p.id, {
      cadence: 0,
      hitAt: this.meters.get(p.id)?.hitAt ?? -Infinity,
    });
    return {
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
    };
  }

  step(c: BardContext) {
    const active = new Map(
      c.players
        .filter(
          (p) => p.classId === "bard" && p.status === "active" && p.connected,
        )
        .map((p) => [p.id, p]),
    );
    for (const [id, reply] of this.replies) {
      const owner = active.get(id);
      if (!owner || !canConduct(owner) || reply.until <= c.tick || !legalStage(reply.origin, reply.stage, c)) {
        this.replies.delete(id);
        if (owner) c.sound('bard-answer-close', owner);
      }
    }
    for (const id of this.meters.keys())
      if (!active.has(id)) this.meters.delete(id);
    this.visible = this.visible.filter(
      (cue) => cue.until > c.tick && active.has(cue.owner),
    );
    this.performances = this.performances.filter((v) => active.has(v.owner));
    for (const v of this.performances) {
      if (c.tick < v.nextAt || v.remaining <= 0) continue;
      const owner = active.get(v.owner)!,
        point = v.travelling ? owner : v.point;
      this.playBeat(v, owner, point, c);
      v.nextAt += v.interval;
    }
    this.performances = this.performances.filter(v => v.remaining > 0);
  }

  private playBeat(v: Performance, owner: Player, point: Vec, c: BardContext, usesSeparatedStage = false) {
    const finalHeld = v.held && v.remaining === 1,
        radius = v.radius * (finalHeld ? 1.4 : 1);
      c.area(
        owner,
        point,
        radius,
        v.damage,
        0.75,
        ticks(finalHeld ? 2.5 : 1.25),
        !v.encore && v.cadence > 0 ? "phrased-hit" : undefined,
        usesSeparatedStage,
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
  }
}
