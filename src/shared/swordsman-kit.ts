import rules from './sword-rules.json';
import { swordGuardContact } from './sword-geometry.ts';
import { HZ, type Vec } from './protocol.ts';

export type SwordFighter = Vec & {
  id: string;
  oldX: number;
  oldY: number;
  aim: number;
  status: string;
  connected: boolean;
  dashUntil: number;
};
export type SwordTalents = {
  returnStep: boolean;
  openCircle: boolean;
  secondWatch: boolean;
};
export type SwordCue = {
  kind: 'sword-cut' | 'sword-windup' | 'sword-guard' | 'sword-parry' | 'sword-return';
  id: number;
  owner: string;
  x: number;
  y: number;
  aim: number;
  radius: number;
  arc: number;
  at: number;
  until: number;
  counter: boolean;
  empowered: boolean;
  active?: boolean;
  remaining?: number;
};
export type SwordContext = {
  tick: number;
  players: SwordFighter[];
  id(): number;
  move(player: SwordFighter, delta: Vec): void;
  slash(
    player: SwordFighter,
    aim: number,
    reach: number,
    arc: number,
    damage: number,
    ordinaryTargets: number,
    training: boolean,
  ): void;
  sound(id: string, player: SwordFighter): void;
};
type Cut = {
  id: number;
  owner: string;
  kind: 'primary' | 'measure' | 'return';
  aim: number;
  at: number;
  startedAt: number;
  reach: number;
  arc: number;
  damage: number;
  ordinaryTargets: number;
  counter: boolean;
  empowered: boolean;
  returnStep: boolean;
};
type Guard = {
  id: number;
  owner: string;
  aim: number;
  at: number;
  until: number;
  remaining: number;
  secondWatch: boolean;
};
type SwordState = {
  counterUntil: number;
  measureUntil: number;
  measureCuts: number;
  measureMultiplier: number;
  measureReach: number;
};
const empty = (): SwordState => ({
  counterUntil: 0,
  measureUntil: 0,
  measureCuts: 0,
  measureMultiplier: 1,
  measureReach: 0,
});
export type SwordCastOptions = {
  potency: number;
  reachBonus: number;
  ultimateBonus: number;
  ultimateDuration: number;
  ultimateCharges: number;
  ultimateRadius: number;
  talents: SwordTalents;
};
const active = (p: SwordFighter | undefined): p is SwordFighter =>
  Boolean(p?.connected && p.status === 'active');

/** Private combat-only sword state; learning, upgrades and actual collisions stay with Game. */
export class SwordsmanKit {
  private states = new Map<string, SwordState>();
  private cuts: Cut[] = [];
  private guards = new Map<string, Guard>();
  private visible: SwordCue[] = [];
  get guarding() {
    return this.guards.size > 0;
  }
  clear() {
    this.states.clear();
    this.cuts = [];
    this.guards.clear();
    this.visible = [];
  }
  private state(id: string) {
    let state = this.states.get(id);
    if (!state) {
      state = empty();
      this.states.set(id, state);
    }
    return state;
  }
  status(id: string, now: number) {
    const s = this.states.get(id) ?? empty(),
      guard = this.guards.get(id);
    return {
      counterUntil: now < s.counterUntil ? s.counterUntil : 0,
      swordUntil: now < s.measureUntil ? s.measureUntil : 0,
      swordCuts: now < s.measureUntil ? s.measureCuts : 0,
      guardUntil: guard && now < guard.until ? guard.until : 0,
      guardRemaining: guard && now < guard.until ? guard.remaining : 0,
      guardActive: Boolean(guard && this.guardActive(guard, now)),
    };
  }
  movement(id: string, now: number) {
    return this.cuts.some((c) => c.owner === id && c.kind === 'measure' && now < c.at) ? 0.6 : 1;
  }
  canCast(p: SwordFighter, now: number) {
    return active(p) && now >= p.dashUntil;
  }
  canPrimary(p: SwordFighter, now: number) {
    return this.canCast(p, now) && !this.cuts.some((v) => v.owner === p.id);
  }
  private guardActive(g: Guard, now: number) {
    if (now < g.at || now >= g.until || g.remaining <= 0) return false;
    if (!g.secondWatch) return true;
    const elapsed = now - g.at,
      window = rules.secondWatchWindowTicks;
    return elapsed < window || elapsed >= window + rules.secondWatchGapTicks;
  }
  primary(
    p: SwordFighter,
    c: SwordContext,
    options: {
      damage: number;
      reach: number;
      arc: number;
      ordinaryTargets: number;
      talents: SwordTalents;
    },
  ) {
    if (!this.canPrimary(p, c.tick)) return false;
    const s = this.state(p.id),
      counter = c.tick < s.counterUntil,
      empowered = c.tick < s.measureUntil && s.measureCuts > 0;
    const at = Math.max(
      c.tick + rules.primaryWindupTicks,
      ...this.cuts
        .filter((v) => v.owner === p.id && v.kind === 'measure')
        .map((v) => v.at + rules.primaryWindupTicks),
    );
    this.cuts = this.cuts.filter((v) => v.owner !== p.id || v.kind !== 'primary');
    this.cuts.push({
      id: c.id(),
      owner: p.id,
      kind: 'primary',
      aim: p.aim,
      at,
      startedAt: c.tick,
      reach: Math.min(rules.maximumReach, options.reach + (empowered ? s.measureReach : 0)),
      arc: empowered && options.talents.openCircle ? Math.PI * 2 : options.arc,
      damage:
        options.damage *
        (counter ? rules.counterMultiplier : 1) *
        (empowered ? s.measureMultiplier : 1),
      ordinaryTargets: Math.min(
        rules.maximumOrdinaryTargets,
        Math.max(0, Math.floor(options.ordinaryTargets)),
      ),
      counter,
      empowered,
      returnStep: false,
    });
    if (counter) s.counterUntil = 0;
    if (empowered) s.measureCuts--;
    return true;
  }
  cast(p: SwordFighter, slot: 'q' | 'e' | 'ultimate', c: SwordContext, options: SwordCastOptions) {
    if (!this.canCast(p, c.tick)) return false;
    const { potency, reachBonus, ultimateBonus, talents } = options;
    if (slot === 'ultimate') {
      const s = this.state(p.id);
      s.measureUntil =
        c.tick +
        rules.ultimateTicks +
        Math.ceil(HZ * Math.max(0, Math.min(12, options.ultimateDuration)));
      s.measureCuts = Math.min(
        rules.maximumUltimateCuts,
        rules.ultimateCuts + Math.max(0, Math.floor(options.ultimateCharges)),
      );
      s.measureReach = rules.ultimateReach + Math.max(0, Math.min(120, options.ultimateRadius));
      s.measureMultiplier = Math.min(
        2.25,
        1 +
          ((talents.openCircle ? rules.circleMultiplier : rules.ultimateMultiplier) - 1) *
            potency *
            (1 + ultimateBonus),
      );
      c.sound('sword-measure', p);
    } else if (slot === 'e') {
      const until =
        c.tick +
        (talents.secondWatch
          ? 2 * rules.secondWatchWindowTicks + rules.secondWatchGapTicks
          : rules.guardTicks);
      this.guards.set(p.id, {
        id: c.id(),
        owner: p.id,
        aim: p.aim,
        at: c.tick,
        until,
        remaining: rules.guardProjectiles,
        secondWatch: talents.secondWatch,
      });
      c.sound('sword-guard', p);
    } else {
      this.cuts = this.cuts.filter((v) => v.owner !== p.id);
      this.cuts.push({
        id: c.id(),
        owner: p.id,
        kind: 'measure',
        aim: p.aim,
        at: c.tick + rules.measureWindupTicks,
        startedAt: c.tick,
        reach: Math.min(rules.maximumReach, rules.measureReach * (1 + reachBonus)),
        arc: (Math.PI * 100) / 180,
        damage: rules.measureDamage * potency,
        ordinaryTargets: rules.ordinaryTargets,
        counter: false,
        empowered: false,
        returnStep: talents.returnStep,
      });
    }
    return true;
  }
  /** Probe contacts without spending a guard charge; Game compares nearer walls/bodies first. */
  guardContact(
    from: Vec,
    to: Vec,
    radius: number,
    players: SwordFighter[],
    now: number,
    before: number,
  ) {
    let best: { owner: string; time: number } | undefined;
    for (const guard of this.guards.values()) {
      const p = players.find((p) => p.id === guard.owner);
      if (!active(p) || now < p.dashUntil || !this.guardActive(guard, now)) continue;
      const time = swordGuardContact(
        from,
        to,
        { x: p.oldX, y: p.oldY },
        p,
        guard.aim,
        radius,
        rules.guardOffset,
        rules.guardHalfSpan,
        rules.guardHalfDepth,
      );
      if (
        time !== null &&
        time < before &&
        (!best || time < best.time || (time === best.time && p.id < best.owner))
      )
        best = { owner: p.id, time };
    }
    return best;
  }
  parry(owner: string, c: SwordContext) {
    const guard = this.guards.get(owner),
      p = c.players.find((p) => p.id === owner);
    if (!guard || !active(p) || !this.guardActive(guard, c.tick)) return false;
    guard.remaining--;
    this.state(owner).counterUntil = c.tick + rules.counterTicks;
    this.visible.push({
      kind: 'sword-parry',
      id: c.id(),
      owner,
      x: p.x,
      y: p.y,
      aim: guard.aim,
      radius: rules.guardOffset,
      arc: 0,
      at: c.tick,
      until: c.tick + 6,
      counter: true,
      empowered: false,
    });
    c.sound('sword-parry', p);
    return true;
  }
  cues(players: SwordFighter[], now: number): SwordCue[] {
    const result = this.visible.map((v) => ({ ...v }));
    for (const cut of this.cuts) {
      const p = players.find((p) => p.id === cut.owner);
      if (!active(p) || cut.kind === 'return') continue;
      result.push({
        kind: 'sword-windup',
        id: cut.id,
        owner: p.id,
        x: p.x,
        y: p.y,
        aim: cut.aim,
        radius: cut.reach,
        arc: cut.arc,
        at: cut.startedAt,
        until: cut.at,
        counter: cut.counter,
        empowered: cut.empowered,
      });
    }
    for (const guard of this.guards.values()) {
      const p = players.find((p) => p.id === guard.owner);
      if (!active(p)) continue;
      result.push({
        kind: 'sword-guard',
        id: guard.id,
        owner: p.id,
        x: p.x,
        y: p.y,
        aim: guard.aim,
        radius: rules.guardOffset,
        arc: 0,
        at: guard.at,
        until: guard.until,
        counter: false,
        empowered: false,
        active: this.guardActive(guard, now),
        remaining: guard.remaining,
      });
    }
    return result;
  }
  step(c: SwordContext) {
    const live = new Map(c.players.filter(active).map((p) => [p.id, p]));
    this.visible = this.visible.filter((v) => v.until > c.tick && live.has(v.owner));
    for (const id of this.states.keys()) if (!live.has(id)) this.states.delete(id);
    for (const [id, g] of this.guards)
      if (!live.has(id) || c.tick >= g.until || c.tick < live.get(id)!.dashUntil)
        this.guards.delete(id);
    this.cuts = this.cuts.filter(
      (v) => live.has(v.owner) && !(live.get(v.owner)!.dashUntil > v.startedAt),
    );
    const pending = this.cuts;
    this.cuts = [];
    for (const cut of pending) {
      const p = live.get(cut.owner)!;
      if (c.tick < cut.at) {
        this.cuts.push(cut);
        continue;
      }
      if (cut.kind === 'return') {
        c.move(p, {
          x: -Math.cos(cut.aim) * rules.returnStepDistance,
          y: -Math.sin(cut.aim) * rules.returnStepDistance,
        });
        this.visible.push({
          kind: 'sword-return',
          id: c.id(),
          owner: p.id,
          x: p.x,
          y: p.y,
          aim: cut.aim,
          radius: 0,
          arc: 0,
          at: c.tick,
          until: c.tick + 6,
          counter: false,
          empowered: false,
        });
        continue;
      }
      if (cut.kind === 'measure')
        c.move(p, {
          x: Math.cos(cut.aim) * rules.measureAdvance,
          y: Math.sin(cut.aim) * rules.measureAdvance,
        });
      c.slash(
        p,
        cut.aim,
        cut.reach,
        cut.arc,
        cut.damage,
        cut.ordinaryTargets,
        cut.kind === 'measure',
      );
      this.visible.push({
        kind: 'sword-cut',
        id: cut.id,
        owner: p.id,
        x: p.x,
        y: p.y,
        aim: cut.aim,
        radius: cut.reach,
        arc: cut.arc,
        at: c.tick,
        until: c.tick + 7,
        counter: cut.counter,
        empowered: cut.empowered,
      });
      c.sound(cut.counter ? 'sword-counter' : 'sword-cut', p);
      if (cut.returnStep)
        this.cuts.push({
          ...cut,
          kind: 'return',
          at: c.tick + rules.returnStepDelayTicks,
          startedAt: c.tick,
        });
    }
  }
}
