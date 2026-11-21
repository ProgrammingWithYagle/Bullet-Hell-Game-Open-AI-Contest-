export type Vec = { x: number; y: number };
export type Rect = Vec & { width: number; height: number };
export type BulwarkWorld = {
  tick: number;
  bounds: Rect;
  obstacles: readonly Rect[];
  lavaPits: readonly (Vec & { radius: number })[];
};
export type BulwarkStatus = {
  bulwarkCarried:boolean;
  bulwarkCanLift:boolean;
  bulwarkCanSet:boolean;
  bulwarkCanSetFolded?:boolean;
  bulwarkCanHandle:boolean;
  bulwarkCanShiftPort?:boolean;
  bulwarkPrimaryReady:boolean;
  bulwarkPortPhase:'closed'|'opening'|'open'|'closing'|'shifting';
  bulwarkRecoveryAt:number;
  bulwarkCommitAt:number;
  bulwarkCommitUntil:number;
  bulwarkPanelUntil:number;
  bulwarkHeading:number;
  bulwarkPanelIds:readonly number[];
};
export type BulwarkOwner = Vec & {
  id: string;
  classId: string;
  connected: boolean;
  status: string;
  oldX: number;
  oldY: number;
  weapon: string;
  skills: readonly string[];
  dashUntil: number;
  reloadAt: number;
  input: {
    sequence: number;
    aim: number;
    moveX: number;
    moveY: number;
    technique1: boolean;
    q: boolean;
    e: boolean;
    ultimate: boolean;
    reload: boolean;
    dodge: boolean;
  };
};
export type BulwarkWall = Vec & {
  id: number;
  owner: string;
  kind: string;
  aim: number;
  source?: string;
  halfSpan?: number;
  bulwarkPortOffset?: number;
  bulwarkPortHalfSpan?: number;
  at: number;
  until: number;
  health: number;
};
export type WallStore = Pick<ReadonlyMap<number, BulwarkWall>, 'get' | 'values'> & {
  delete(id: number): boolean;
};
export const bulwarkIds = {
  entry: 'tank-bulwark-carry-1',
  pivot: 'tank-bulwark-pivot-1',
  foldedSetdown: 'tank-bulwark-folded-setdown-1',
  port: 'tank-bulwark-port-1',
  sidePort: 'tank-bulwark-side-port-1',
} as const;
export const bulwarkRules = {
  lead: 32,
  pickupRange: 37,
  defaultHalfSpan: 110,
  fold: .5,
  thickness: 12,
  sweepStep: 3,
  turnStep: Math.PI / 72,
  windTicks: 12,
  recoveryTicks: 60,
  portWindTicks: 6,
  portHalfSpan: 14,
  portAimRadians: Math.PI / 18,
  sidePortMinRadians: Math.PI / 15,
  sidePortMaxRadians: Math.PI * 35 / 180,
  sidePortRim: 5,
} as const;

const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const normalOf = (wall: BulwarkWall): Vec => ({ x: Math.cos(wall.aim), y: Math.sin(wall.aim) });
const lead = (body: Vec, normal: Vec): Vec => ({
  x: body.x + normal.x * bulwarkRules.lead,
  y: body.y + normal.y * bulwarkRules.lead,
});
const rotate = (point: Vec, angle: number): Vec => ({
  x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
  y: point.x * Math.sin(angle) + point.y * Math.cos(angle),
});
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const ejected = (owner: BulwarkOwner) => distance(owner, { x: owner.oldX, y: owner.oldY }) > .01;
const available = (owner: BulwarkOwner) => owner.classId === 'tank' && owner.connected && owner.status === 'active' && owner.skills.includes(bulwarkIds.entry);

export function wallFootprintClear(world: BulwarkWorld, center: Vec, normal: Vec, halfSpan: number) {
  const along = { x: -normal.y, y: normal.x }, thickness = bulwarkRules.thickness;
  const xReach = thickness * Math.abs(normal.x) + halfSpan * Math.abs(along.x);
  const yReach = thickness * Math.abs(normal.y) + halfSpan * Math.abs(along.y);
  const { x, y, width, height } = world.bounds;
  if (center.x - xReach < x || center.x + xReach > x + width ||
      center.y - yReach < y || center.y + yReach > y + height) return false;
  for (const wall of world.obstacles) {
    const dx = wall.x + wall.width / 2 - center.x, dy = wall.y + wall.height / 2 - center.y;
    const rw = wall.width / 2, rh = wall.height / 2;
    if (Math.abs(dx) > xReach + rw || Math.abs(dy) > yReach + rh) continue;
    if (Math.abs(dx * normal.x + dy * normal.y) > thickness + rw * Math.abs(normal.x) + rh * Math.abs(normal.y)) continue;
    if (Math.abs(dx * along.x + dy * along.y) > halfSpan + rw * Math.abs(along.x) + rh * Math.abs(along.y)) continue;
    return false;
  }
  for (const pit of world.lavaPits) {
    const dx = pit.x - center.x, dy = pit.y - center.y;
    const a = dx * normal.x + dy * normal.y, b = dx * along.x + dy * along.y;
    if (Math.hypot(a - clamp(a, -thickness, thickness), b - clamp(b, -halfSpan, halfSpan)) <= pit.radius) return false;
  }
  return true;
}

type Member = { id: number; halfSpan?: number; offset: Vec };
type Pivot = {
  at: number;
  until: number;
  angle: number;
  fromNormal: Vec;
  startMembers: { id: number; aim: number; offset: Vec }[];
};
type HeldWall = {
  weapon: string;
  normal: Vec;
  members: Member[];
  pivot?: Pivot;
  pivotUsed?: boolean;
  port?: {phase: "opening" | "open" | "closing"; at: number; until: number; heading?: number; pendingHeading?: number};
  portUsed?: boolean;
};

/** Owns only the handling of existing paid Q panels. It never spawns or repairs a panel. */
export class TankBulwark {
  private held = new Map<string, HeldWall>();
  private commands = new Map<string, number>();
  private pivotRecovery = new Map<string, number>();
  private readonly shiftedPanels = new Set<number>();
  private readonly setInPlace = new Set<number>();

  clear() {
    this.held.clear();
    this.commands.clear();
    this.pivotRecovery.clear();
    this.shiftedPanels.clear();
    this.setInPlace.clear();
  }

  remove(id: string, walls: WallStore) {
    for (const member of this.held.get(id)?.members ?? []) walls.delete(member.id);
    this.held.delete(id);
    this.commands.delete(id);
  }

  active(id: string, walls: WallStore, tick: number): BulwarkWall | undefined {
    const held = this.held.get(id);
    if (!held) return;
    held.members = held.members.filter(member => {
      const wall = walls.get(member.id);
      return wall?.kind === 'wall' && wall.owner === id && wall.until > tick && wall.health > 0;
    });
    if (held.members.length) return walls.get(held.members[0].id);
    this.held.delete(id);
  }

  step(players: readonly BulwarkOwner[], walls: WallStore, tick: number) {
    for (const id of this.setInPlace) {
      const wall = walls.get(id);
      if (!wall || wall.until <= tick || wall.health <= 0) this.setInPlace.delete(id);
    }
    for (const id of this.shiftedPanels) {
      const wall = walls.get(id);
      if (!wall || wall.until <= tick || wall.health <= 0) this.shiftedPanels.delete(id);
    }
    for (const [id, held] of this.held) {
      if (!this.active(id, walls, tick)) continue;
      const owner = players.find(player => player.id === id);
      if (!owner || !available(owner) || owner.weapon !== held.weapon ||
          ((held.pivotUsed && !owner.skills.includes(bulwarkIds.pivot)) || (held.portUsed && !owner.skills.includes(bulwarkIds.port)))) this.remove(id, walls);
    }
  }

  pivotStatus(id: string) {
    return { active: !!this.held.get(id)?.pivot, readyAt: this.pivotRecovery.get(id) ?? 0 };
  }

  private frames(held: HeldWall, center: Vec, folded: boolean, walls: WallStore) {
    const fraction = folded ? bulwarkRules.fold : 1;
    return held.members.flatMap(member => {
      const wall = walls.get(member.id);
      if (!wall) return [];
      return [{
        wall,
        center: { x: center.x + member.offset.x * fraction, y: center.y + member.offset.y * fraction },
        halfSpan: (member.halfSpan ?? bulwarkRules.defaultHalfSpan) * fraction,
        originalSpan: member.halfSpan,
      }];
    });
  }

  private pickup(player:BulwarkOwner,walls:WallStore,world:BulwarkWorld){
    if(!available(player))return;
    // A new lift cannot start a second hand operation on the same input frame.
    if (player.dashUntil > world.tick || player.reloadAt > world.tick || player.input.reload ||
        player.input.q || player.input.e || player.input.ultimate || player.input.dodge) return;
    const placed = [...walls.values()]
      .filter(wall => wall.owner === player.id && wall.kind === 'wall' && !this.setInPlace.has(wall.id) &&
        (!wall.source || wall.source.startsWith('corner-')) && wall.until > world.tick && wall.health > 0)
      .sort((a, b) => b.at - a.at || a.id - b.id);
    const first = placed[0];
    if (!first) return;
    const group = first.source ? placed.filter(wall => wall.source?.startsWith('corner-') && wall.at === first.at) : [first];
    const center = {
      x: group.reduce((sum, wall) => sum + wall.x, 0) / group.length,
      y: group.reduce((sum, wall) => sum + wall.y, 0) / group.length,
    };
    const heading = {
      x: group.reduce((sum, wall) => sum + Math.cos(wall.aim), 0),
      y: group.reduce((sum, wall) => sum + Math.sin(wall.aim), 0),
    };
    const length = Math.hypot(heading.x, heading.y);
    if (length < 1e-6) return;
    const normal = group.length === 1 ? normalOf(first) : { x: heading.x / length, y: heading.y / length };
    const carriedCenter = lead(player, normal);
    const rear = (center.x - player.x) * normal.x + (center.y - player.y) * normal.y;
    if (distance(player, center) > bulwarkRules.pickupRange || rear < 23 || distance(center, carriedCenter) > 12) return;
    const held: HeldWall = {
      weapon: player.weapon, normal,
      members: group.map(wall => ({ id: wall.id, halfSpan: wall.halfSpan, offset: { x: wall.x - center.x, y: wall.y - center.y } })),
    };
    const frames = this.frames(held, carriedCenter, true, walls);
    if (frames.length !== held.members.length ||
        frames.some(frame => !wallFootprintClear(world, frame.center, normalOf(frame.wall), frame.halfSpan))) return;
    return {held,frames};
  }

  private handlingReady(player:BulwarkOwner,walls:WallStore,world:BulwarkWorld,next:Vec=player):boolean{
    if(!available(player)||!this.active(player.id,walls,world.tick)||
        player.input.technique1||player.input.moveX||player.input.moveY||distance(player,next)>.01||ejected(player)||
        player.input.q||player.input.e||player.input.ultimate||player.input.reload||player.input.dodge)return false;
    const held=this.held.get(player.id)!;
    if(held.pivot)return false;
    const remaining=Math.min(...held.members.map(member=>walls.get(member.id)?.until??0))-world.tick;
    const port=player.skills.includes(bulwarkIds.port),pivot=player.skills.includes(bulwarkIds.pivot);
    if(port&&pivot)return false;
    if(port)return remaining>bulwarkRules.portWindTicks&&(!held.port||held.port.phase==='open'||world.tick>=held.port.until);
    if(!pivot||world.tick<(this.pivotRecovery.get(player.id)??0)||remaining<=bulwarkRules.windTicks)return false;
    const from=Math.atan2(held.normal.y,held.normal.x);
    return Math.abs(Math.atan2(Math.sin(player.input.aim-from),Math.cos(player.input.aim-from)))>=.02;
  }

  private setdown(player: BulwarkOwner, held: HeldWall, walls: WallStore, world: BulwarkWorld) {
    const center = lead(player, held.normal);
    const fits = (frames: ReturnType<TankBulwark['frames']>) => frames.length === held.members.length &&
      frames.every(frame => wallFootprintClear(world, frame.center, normalOf(frame.wall), frame.halfSpan));
    const full = this.frames(held, center, false, walls);
    if (fits(full)) return { frames: full, folded: false };
    if (!player.skills.includes(bulwarkIds.foldedSetdown) || !player.skills.includes(bulwarkIds.pivot) ||
        held.pivot || ejected(player) || player.input.moveX || player.input.moveY) return;
    const folded = this.frames(held, center, true, walls);
    if (fits(folded)) return { frames: folded, folded: true };
  }

  status(player:BulwarkOwner,walls:WallStore,world:BulwarkWorld):Partial<BulwarkStatus>{
    if(!available(player))return {};
    this.active(player.id,walls,world.tick);
    const held=this.held.get(player.id),port=held?.port,pivot=held?.pivot;
    const placement = held && this.setdown(player, held, walls, world);
    const canHandle = this.handlingReady(player, walls, world);
    return {
      bulwarkCarried:!!held,
      bulwarkCanLift:!held&&!!this.pickup(player,walls,world),
      bulwarkCanSet:!!placement,
      ...(placement?.folded ? { bulwarkCanSetFolded: true } : {}),
      bulwarkCanHandle:canHandle,
      ...(held && canHandle && this.sideHeading(held, player, walls) !== undefined ? { bulwarkCanShiftPort: true } : {}),
      bulwarkPrimaryReady:this.canPrimary(player,walls,world),
      bulwarkPortPhase:port?.pendingHeading !== undefined ? 'shifting' : port?.phase ?? 'closed',
      bulwarkRecoveryAt:this.pivotRecovery.get(player.id)??0,
      bulwarkCommitAt:pivot?.at??port?.at??0,
      bulwarkCommitUntil:pivot?.until??(port?.phase==='open'?0:port?.until)??0,
      bulwarkPanelUntil:held?Math.min(...held.members.map(member=>walls.get(member.id)?.until??0)):0,
      bulwarkHeading:held?Math.atan2(held.normal.y,held.normal.x):player.input.aim,
      bulwarkPanelIds:held?held.members.map(member=>member.id):[],
    };
  }

  command(player: BulwarkOwner, walls: WallStore, world: BulwarkWorld): 'lift' | 'set' | 'set-folded' | undefined {
    if (!available(player) || player.input.sequence <= (this.commands.get(player.id) ?? -1)) return;
    this.commands.set(player.id, player.input.sequence);
    if (this.active(player.id, walls, world.tick)) {
      const held = this.held.get(player.id)!;
      const placement = this.setdown(player, held, walls, world);
      if (!placement) return;
      for (const { wall, center, halfSpan, originalSpan } of placement.frames) {
        Object.assign(wall, center, { halfSpan: placement.folded ? halfSpan : originalSpan });
        if (placement.folded) this.setInPlace.add(wall.id);
      }
      this.clearPort(held,walls);
      this.held.delete(player.id);
      return placement.folded ? 'set-folded' : 'set';
    }
    const picked=this.pickup(player,walls,world);
    if(!picked)return;
    const {held,frames}=picked;
    this.held.set(player.id, held);
    for (const frame of frames) Object.assign(frame.wall, frame.center, { halfSpan: frame.halfSpan });
    return 'lift';
  }

  beginPivot(player: BulwarkOwner, walls: WallStore, world: BulwarkWorld, next: Vec = player): boolean {
    if(!player.skills.includes(bulwarkIds.pivot)||!this.handlingReady(player,walls,world,next)||
        player.input.sequence<=(this.commands.get(player.id)??-1))return false;
    const held = this.held.get(player.id)!;
    if (held.pivot) return false;
    const members = held.members.flatMap(member => {
      const wall = walls.get(member.id);
      return wall ? [{ ...member, wall }] : [];
    });
    if (members.length !== held.members.length || members.some(member => member.wall.until <= world.tick + bulwarkRules.windTicks)) return false;
    const from = Math.atan2(held.normal.y, held.normal.x);
    const angle = Math.atan2(Math.sin(player.input.aim - from), Math.cos(player.input.aim - from));
    if (Math.abs(angle) < .02) return false;
    this.commands.set(player.id, player.input.sequence);
    this.pivotRecovery.set(player.id, world.tick + bulwarkRules.recoveryTicks);
    held.pivotUsed = true;
    held.pivot = {
      at: world.tick, until: world.tick + bulwarkRules.windTicks, angle, fromNormal: { ...held.normal },
      startMembers: members.map(member => ({ id: member.id, aim: member.wall.aim, offset: { ...member.offset } })),
    };
    return true;
  }

  private clearPort(held:HeldWall,walls:WallStore){
    for(const member of held.members){const wall=walls.get(member.id);if(wall){delete wall.bulwarkPortOffset;delete wall.bulwarkPortHalfSpan;}}
    held.port=undefined;
  }

  private syncPort(held:HeldWall,walls:WallStore,tick:number){
    if(!held.port||tick<held.port.until)return;
    if(held.port.phase==='opening') {
      held.port.phase='open';
      if (held.port.pendingHeading !== undefined) {
        held.port.heading = held.port.pendingHeading;
        delete held.port.pendingHeading;
      }
    }
    else if(held.port.phase==='closing')this.clearPort(held,walls);
  }

  private portCut(wall: BulwarkWall, from: Vec, heading: Vec) {
    const normal = normalOf(wall), along = { x: -normal.y, y: normal.x };
    const projection = heading.x * normal.x + heading.y * normal.y;
    if (Math.abs(projection) < .1) return;
    const t = ((wall.x - from.x) * normal.x + (wall.y - from.y) * normal.y) / projection;
    const x = from.x + heading.x * t, y = from.y + heading.y * t;
    return {
      offset: (x - wall.x) * along.x + (y - wall.y) * along.y,
      halfSpan: bulwarkRules.portHalfSpan / Math.abs(projection),
      t,
    };
  }

  private sidePortCuts(held: HeldWall, from: Vec, heading: Vec, walls: WallStore) {
    const cuts: { wall: BulwarkWall; offset: number; halfSpan: number }[] = [];
    for (const { id } of held.members) {
      const wall = walls.get(id);
      if (!wall) return;
      const cut = this.portCut(wall, from, heading);
      if (!cut || cut.t <= 0) return;
      const span = wall.halfSpan ?? bulwarkRules.defaultHalfSpan;
      const offset = Math.abs(cut.offset);
      if (offset - cut.halfSpan >= span) continue;
      if (offset + cut.halfSpan + bulwarkRules.sidePortRim > span) return;
      cuts.push({ wall, offset: cut.offset, halfSpan: cut.halfSpan });
    }
    if (cuts.length) return cuts;
  }

  private sideHeading(held: HeldWall, player: BulwarkOwner, walls: WallStore) {
    if (!player.skills.includes(bulwarkIds.sidePort) || held.port?.phase !== 'open' ||
        held.members.some(member => this.shiftedPanels.has(member.id))) return;
    const aim = player.input.aim;
    const heading = { x: Math.cos(aim), y: Math.sin(aim) };
    const dot = heading.x * held.normal.x + heading.y * held.normal.y;
    if (dot > Math.cos(bulwarkRules.sidePortMinRadians) || dot < Math.cos(bulwarkRules.sidePortMaxRadians)) return;
    if (this.sidePortCuts(held, player, heading, walls)) return aim;
  }

  private applyPort(held: HeldWall, player: BulwarkOwner, walls: WallStore) {
    const port = held.port;
    if (!port) return;
    if (port.heading !== undefined) {
      const heading = { x: Math.cos(port.heading), y: Math.sin(port.heading) };
      const cuts = this.sidePortCuts(held, player, heading, walls);
      if (!cuts) return this.clearPort(held, walls);
      // On a paired wall only the panel crossed by the new slit should open.
      for (const { id } of held.members) {
        const wall = walls.get(id);
        if (wall) {
          delete wall.bulwarkPortOffset;
          delete wall.bulwarkPortHalfSpan;
        }
      }
      for (const { wall, offset, halfSpan } of cuts) {
        wall.bulwarkPortOffset = offset;
        wall.bulwarkPortHalfSpan = halfSpan;
      }
      return;
    }
    const origin = lead(player, held.normal);
    for (const { id } of held.members) {
      const wall = walls.get(id);
      if (!wall) continue;
      const cut = this.portCut(wall, origin, held.normal);
      if (!cut) {
        this.clearPort(held, walls);
        return;
      }
      wall.bulwarkPortOffset = cut.offset;
      wall.bulwarkPortHalfSpan = cut.halfSpan;
    }
  }

  portStatus(id:string){
    const port=this.held.get(id)?.port;
    return {phase:port?.phase??'closed',at:port?.at??0,until:port?.until??0};
  }

  portCovers(id:string,walls:WallStore,tick:number):BulwarkWall[]{
    if(!this.active(id,walls,tick))return [];
    const held=this.held.get(id)!;
    if(!held.portUsed)return [];
    return held.members.flatMap(member=>{const wall=walls.get(member.id);return wall?[wall]:[];});
  }

  canPrimary(player:BulwarkOwner,walls:WallStore,world:BulwarkWorld):boolean{
    if(!available(player)||!player.skills.includes(bulwarkIds.port)||player.skills.includes(bulwarkIds.pivot)||
        !this.active(player.id,walls,world.tick))return false;
    const held=this.held.get(player.id)!,port=held.port;
    if(!port||port.phase==='closing'||world.tick<port.until||
        player.input.technique1||player.input.moveX||player.input.moveY||ejected(player)||
        player.input.q||player.input.e||player.input.ultimate||player.input.reload||player.input.dodge||
        player.reloadAt>world.tick||player.dashUntil>world.tick)return false;
    const normal = port.heading === undefined ? held.normal : { x: Math.cos(port.heading), y: Math.sin(port.heading) };
    const dot=Math.cos(player.input.aim)*normal.x+Math.sin(player.input.aim)*normal.y;
    return dot>=Math.cos(bulwarkRules.portAimRadians);
  }

  beginHandling(player:BulwarkOwner,walls:WallStore,world:BulwarkWorld,next:Vec=player):'pivot'|'port-open'|'port-close'|'port-shift'|undefined{
    if(!player.skills.includes(bulwarkIds.port))return this.beginPivot(player,walls,world,next)?'pivot':undefined;
    if(!this.handlingReady(player,walls,world,next)||
        player.input.sequence<=(this.commands.get(player.id)??-1))return;
    const held=this.held.get(player.id)!;
    this.syncPort(held,walls,world.tick);
    if(held.pivot||(held.port&&held.port.phase!=='open'))return;
    if(held.members.some(member=>(walls.get(member.id)?.until??0)<=world.tick+bulwarkRules.portWindTicks))return;
    const closing=held.port?.phase==='open';
    this.commands.set(player.id,player.input.sequence);
    held.portUsed=true;
    const heading = this.sideHeading(held, player, walls);
    if (heading !== undefined) {
      for (const { id } of held.members) this.shiftedPanels.add(id);
      held.port = { phase: 'opening', at: world.tick, until: world.tick + bulwarkRules.portWindTicks,
        heading: held.port?.heading, pendingHeading: heading };
      this.applyPort(held,player,walls);
      return 'port-shift';
    }
    held.port={phase:closing?'closing':'opening',at:world.tick,until:world.tick+bulwarkRules.portWindTicks,heading:held.port?.heading};
    this.applyPort(held,player,walls);
    return closing?'port-close':'port-open';
  }

  private advancePivot(player: BulwarkOwner, held: HeldWall, walls: WallStore, world: BulwarkWorld) {
    const pivot = held.pivot!;
    const target = pivot.angle * Math.min(1, (world.tick - pivot.at) / bulwarkRules.windTicks);
    const current = Math.atan2(pivot.fromNormal.x * held.normal.y - pivot.fromNormal.y * held.normal.x,
      pivot.fromNormal.x * held.normal.x + pivot.fromNormal.y * held.normal.y);
    const steps = Math.max(1, Math.ceil(Math.abs(target - current) / bulwarkRules.turnStep));
    for (let step = 1; step <= steps; step++) {
      const angle = current + (target - current) * step / steps, normal = rotate(pivot.fromNormal, angle);
      const center = lead(player, normal);
      const frames = held.members.flatMap(member => {
        const original = pivot.startMembers.find(original => original.id === member.id), wall = walls.get(member.id);
        if (!original || !wall) return [];
        const offset = rotate(original.offset, angle);
        return [{ member, wall, offset, point: { x: center.x + offset.x / 2, y: center.y + offset.y / 2 }, aim: original.aim + angle }];
      });
      if (frames.length !== held.members.length || frames.some(frame => !wallFootprintClear(world, frame.point,
          { x: Math.cos(frame.aim), y: Math.sin(frame.aim) }, (frame.member.halfSpan ?? bulwarkRules.defaultHalfSpan) / 2))) {
        held.pivot = undefined;
        return;
      }
      held.normal = normal;
      for (const frame of frames) {
        frame.member.offset = frame.offset;
        Object.assign(frame.wall, frame.point, { aim: frame.aim });
      }
    }
    if (world.tick >= pivot.until) held.pivot = undefined;
  }

  move(player: BulwarkOwner, next: Vec, walls: WallStore, world: BulwarkWorld): Vec {
    if (!this.active(player.id, walls, world.tick)) return next;
    const held = this.held.get(player.id)!;
    const current = this.frames(held, lead(player, held.normal), true, walls);
    if (!available(player) || player.weapon !== held.weapon || ((held.pivotUsed && !player.skills.includes(bulwarkIds.pivot)) || (held.portUsed && !player.skills.includes(bulwarkIds.port))) ||
        current.length !== held.members.length ||
        current.some(frame => !wallFootprintClear(world, frame.center, normalOf(frame.wall), frame.halfSpan))) {
      this.remove(player.id, walls);
      return next;
    }
    if(held.port){
      if(player.input.moveX||player.input.moveY||distance(player,next)>.01||ejected(player))this.clearPort(held,walls);
      else {this.syncPort(held,walls,world.tick);this.applyPort(held,player,walls);}
    }
    if (held.pivot) {
      if (player.input.technique1 || player.input.moveX || player.input.moveY || distance(player, next) > .01 || ejected(player)) held.pivot = undefined;
      else { this.advancePivot(player, held, walls, world); return player; }
    }
    const target = this.frames(held, lead(next, held.normal), true, walls);
    const steps = Math.max(1, ...target.map(frame => Math.ceil(distance(frame.wall, frame.center) / bulwarkRules.sweepStep)));
    for (let n = 1; n <= steps; n++) for (const frame of target) {
      const portion = n / steps;
      const center = { x: frame.wall.x + (frame.center.x - frame.wall.x) * portion, y: frame.wall.y + (frame.center.y - frame.wall.y) * portion };
      if (!wallFootprintClear(world, center, normalOf(frame.wall), frame.halfSpan)) return player;
    }
    for (const frame of target) Object.assign(frame.wall, frame.center);
    return next;
  }
}
