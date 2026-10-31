import {AmbulanceRoute,type AmbulanceCue} from './ambulance-route.ts';
import {WidowGates,ejectClosingGates,type WidowCue} from './widow-gates.ts';
import { MarshalChains, type MarshalCue } from './marshal-chains.ts';
import { TollkeeperReturn, type TollkeeperCue } from './tollkeeper-return.ts';
import { type BossId, type Vec } from './protocol.ts';
import { type Rect } from './geometry.ts';
import type { BossCue, SignatureContext } from './boss-director.ts';

export type CivicCue =
  | TollkeeperCue
  | MarshalCue
  | WidowCue
  | AmbulanceCue;
type Gate = Extract<CivicCue, { kind: 'gate' }>;
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
  readonly ambulance = new AmbulanceRoute();

  reset(kind: BossId) {
    this.kind = kind;
    this.tollkeeper.reset();
    this.marshal.reset();
    this.widow.reset();
    this.ambulance.reset();
    // Lane rotation survives phase/Accord cancellation; a new encounter gets a
    // new director through beginEncounter()'s explicit resetEncounter().
  }
  resetEncounter(kind: BossId) {
    this.reset(kind);
    this.widow.resetEncounter();
    this.ambulance.resetEncounter();
  }
  get recovering() {
    return this.ambulance.recovering;
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
      ...this.ambulance.cues(),
    ];
  }
  solids(tick: number) {
    return this.widow.solids(tick);
  }
  step(context: SignatureContext, _charging: boolean) {
    if (!civicBossIds.includes(context.bossId as (typeof civicBossIds)[number])) return;
    if (context.bossId === 'tollkeeper') { this.tollkeeper.step(context); return; }
    if (context.bossId === 'chain-marshal') { this.marshal.step(context); return; }
    if (context.bossId === 'gate-widow') { this.widow.step(context); return; }
    if (context.bossId === 'black-ambulance') this.ambulance.step(context);
  }
}
