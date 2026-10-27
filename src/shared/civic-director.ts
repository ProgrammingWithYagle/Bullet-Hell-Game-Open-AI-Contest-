import {WidowGates,ejectClosingGates,type WidowCue} from './widow-gates.ts';
import { MarshalChains, type MarshalCue } from './marshal-chains.ts';
import { TollkeeperReturn, type TollkeeperCue } from './tollkeeper-return.ts';
import { DT, HZ, type BossId, type Vec } from './protocol.ts';
import { clamp, distance, moveBody, segmentCircle, segmentRect, type Rect } from './geometry.ts';
import type { BossCue, SignatureContext } from './boss-director.ts';

export type CivicCue =
  | TollkeeperCue
  | MarshalCue
  | WidowCue
  | { kind: 'driver'; id: number; x: number; y: number; radius: number; at: number; until: number };
type Gate = Extract<CivicCue, { kind: 'gate' }>;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export const civicBossIds = [
  'tollkeeper',
  'chain-marshal',
  'gate-widow',
  'black-ambulance',
] as const;

// The same slab rectangles drive authoritative movement, prediction and shot cover.
export function gateObstacles(cues: BossCue[], now: number): Rect[] {
  return cues
    .filter((c): c is Gate => c.kind === 'gate' && !c.open && now >= c.at && now < c.until)
    .map(({ x, y, width, height }) => ({ x, y, width, height }));
}
export function leaveClosingGates(position: Vec, gates: Rect[], radius: number, fixed: Rect[] = [], hazards: (Vec & {radius:number})[] = []): Vec {
  return ejectClosingGates(position,gates,radius,fixed,hazards);
}

export class CivicDirector {
  private kind: BossId = 'constable';
  readonly tollkeeper = new TollkeeperReturn();
  readonly marshal = new MarshalChains();
  readonly widow = new WidowGates();
  private driving = false;
  private station = 0;
  private recoveryUntil = 0;
  private driverId = 0;
  private origin: Vec = { x: 800, y: 250 };

  reset(kind: BossId) {
    this.kind = kind;
    this.tollkeeper.reset();
    this.marshal.reset();
    this.widow.reset();
    this.driving = false;
    this.recoveryUntil = 0;
    this.driverId = 0;
    // Lane rotation survives phase/Accord cancellation; a new encounter gets a
    // new director through beginEncounter()'s explicit resetEncounter().
  }
  resetEncounter(kind: BossId) {
    this.reset(kind);
    this.widow.resetEncounter();
    this.station = 0;
  }
  get recovering() {
    return this.recoveryUntil > 0;
  }
  hit(id: number, amount: number) {
    return this.marshal.hit(id, amount);
  }
  weakPoints() {
    return this.marshal.weakPoints();
  }
  cues(): CivicCue[] {
    return [
      ...this.tollkeeper.cues(),
      ...this.marshal.cues(),
      ...this.widow.cues(),
      ...(this.recoveryUntil
        ? [
            {
              kind: 'driver' as const,
              id: this.driverId,
              x: this.origin.x,
              y: this.origin.y - 35,
              radius: 28,
              at: 0,
              until: this.recoveryUntil,
            },
          ]
        : []),
    ];
  }
  solids(tick: number) {
    return this.widow.solids(tick);
  }
  private drive(context: SignatureContext, charging: boolean) {
    if (this.driving && !charging) {
      this.driving = false;
      this.recoveryUntil = context.tick + ticks(3);
      this.driverId = context.id();
    }
    if (charging) {
      this.driving = true;
      return;
    }
    if (this.recoveryUntil && context.tick < this.recoveryUntil) return;
    this.recoveryUntil = 0;
    const stations = [
      { x: 800, y: 250 },
      { x: 1365, y: 250 },
      { x: 1365, y: 700 },
      { x: 1325, y: 700 },
      { x: 1325, y: 790 },
      { x: 800, y: 800 },
      { x: 275, y: 790 },
      { x: 275, y: 700 },
      { x: 240, y: 700 },
      { x: 240, y: 300 },
      { x: 240, y: 250 },
    ];
    const goal = stations[this.station % stations.length];
    if (distance(context.boss, goal) < 8) this.station = (this.station + 1) % stations.length;
    const d = distance(context.boss, goal) || 1;
    const next = moveBody(
      context.boss,
      {
        x: ((goal.x - context.boss.x) / d) * 140 * DT,
        y: ((goal.y - context.boss.y) / d) * 140 * DT,
      },
      context.radius,
      context.obstacles,
    );
    context.boss.x = next.x;
    context.boss.y = next.y;
  }
  step(context: SignatureContext, charging: boolean) {
    if (!civicBossIds.includes(context.bossId as (typeof civicBossIds)[number])) return;
    if (context.bossId === 'tollkeeper') { this.tollkeeper.step(context); return; }
    if (context.bossId === 'chain-marshal') { this.marshal.step(context); return; }
    if (context.bossId === 'gate-widow') { this.widow.step(context); return; }
    if (context.bossId === 'black-ambulance') this.drive(context, charging);
    this.origin = { ...context.boss };
  }
}
