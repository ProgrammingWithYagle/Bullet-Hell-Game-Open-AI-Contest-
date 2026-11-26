import type { AlchemyContext, AlchemyCue, AlchemyOwner } from './alchemist-kit.ts';
import { distance, segmentRect } from './geometry.ts';
import type { Vec } from './protocol.ts';

export const restorativeIds = {
  entry:'alchemist-set-dressing-1',
  shared:'alchemist-shared-roll-1',
  quick:'alchemist-quick-knot-1',
} as const;

export type RestorativeFitting = 'standard' | 'shared' | 'quick';
export function restorativeFitting(skills: readonly string[]): RestorativeFitting {
  if (skills.includes(restorativeIds.shared)) return 'shared';
  if (skills.includes(restorativeIds.quick)) return 'quick';
  return 'standard';
}

export const dressingRules = { range:160, lifeTicks:210, useTicks:21, quickTicks:8, radiusScale:.68, quickScale:.5 } as const;
export type AlchemyDressingStatus = {
  fitting: RestorativeFitting;
  stage: 'busy' | 'recovering' | 'prepare' | 'placed' | 'aim' | 'ready';
  targets?: (Vec & { radius: number })[];
};
export function dressingRadius(radius: number, fitting: RestorativeFitting) {
  return radius * (fitting === 'quick' ? dressingRules.quickScale : dressingRules.radiusScale);
}

export type TreatmentFlask = {
  id: number;
  owner: string;
  point: Vec;
  radius: number;
  potency: number;
  refund: boolean;
  refundGroup: number;
  empowered: boolean;
};
type Dressing = Vec & {
  id: number;
  owner: string;
  radius: number;
  at: number;
  until: number;
  amount: number;
  empowered: boolean;
  uses: number;
  fitting: RestorativeFitting;
  treated: Set<string>;
  waiting?: { patient: string; readyAt: number };
  refund: boolean;
  refundGroup: number;
};

export class RestorativeGround {
  private fields: Dressing[] = [];
  clear() { this.fields = []; }
  removeOwner(owner: string) { this.fields = this.fields.filter(field => field.owner !== owner); }
  active(owner: string, tick: number) { return this.fields.some(field => field.owner === owner && tick < field.until); }
  refundGroups() { return this.fields.map(field => field.refundGroup); }

  place(flask: TreatmentFlask, tick: number, fitting: RestorativeFitting, healing: number) {
    const uses = fitting === 'shared' ? 2 : 1;
    this.fields.push({ ...flask.point, id:flask.id, owner:flask.owner, empowered:flask.empowered,
      radius:dressingRadius(flask.radius,fitting),
      amount:healing * flask.potency / uses, at:tick, until:tick + dressingRules.lifeTicks,
      uses, fitting, treated:new Set(), refund:flask.refund, refundGroup:flask.refundGroup });
  }

  step(c: AlchemyContext, owners: ReadonlyMap<string,AlchemyOwner>, rewarded: (owner: AlchemyOwner, group: number, refund: boolean) => void) {
    for (const field of this.fields) {
      const owner = owners.get(field.owner);
      if (!owner || field.until <= c.tick || !field.uses) continue;
      const eligible = (patient: AlchemyOwner) => patient.connected && patient.status === 'active' &&
        (field.fitting !== 'quick' || owner.id === patient.id) && !field.treated.has(patient.id) &&
        c.needsHealing?.(patient.id) === true && distance(field,patient) <= field.radius &&
        !c.obstacles.some(wall => segmentRect(field,patient,wall) !== null);
      const waiting = field.waiting;
      const present = waiting && c.owners.find(patient => patient.id === waiting.patient && eligible(patient));
      if (!waiting || !present) {
        const candidate = c.owners.find(eligible);
        const duration = field.fitting === 'quick' ? dressingRules.quickTicks : dressingRules.useTicks;
        field.waiting = candidate && { patient:candidate.id, readyAt:c.tick + duration };
        continue;
      }
      if (c.tick < waiting.readyAt) continue;
      const result = c.area({ owner:owner.id, recipient:present.id, recipe:'mending', x:field.x, y:field.y, radius:field.radius,
        healing:field.amount, damage:0, slowTicks:0, slowMultiplier:1, training:false, origin:field });
      field.waiting = undefined;
      if (result.healing <= 0) continue;
      field.uses--;
      field.treated.add(present.id);
      rewarded(owner,field.refundGroup,field.refund);
      c.sound('alchemy-ready',owner);
    }
    this.fields = this.fields.filter(field => owners.has(field.owner) && c.tick < field.until && field.uses > 0);
  }

  cues(owners: ReadonlyMap<string,AlchemyOwner>, tick: number): AlchemyCue[] {
    return this.fields.filter(field => owners.has(field.owner) && tick < field.until).map(field => ({
      kind:'alchemy-dressing',id:field.id,owner:field.owner,recipe:'mending',x:field.x,y:field.y,x2:field.x,y2:field.y,
      radius:field.radius,at:field.at,until:field.until,empowered:field.empowered,uses:field.uses,
    }));
  }
}
