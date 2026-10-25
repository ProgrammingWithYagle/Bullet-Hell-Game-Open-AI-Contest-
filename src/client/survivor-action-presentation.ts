// Drawn action selection only. Combat state, damage and movement remain authoritative.
import library from '../../assets/production/motion/survivor-actions/library.json';
import catalog from '../../content/catalog.json';
import { HZ, type ClassId } from '../shared/protocol.ts';
import type { View, PlayerView } from '../shared/view.ts';
import { RESCUE_CHARGE_TICKS } from '../shared/class-kits.ts';
import { PresentationClock } from './presentation-clock.ts';
import type { SurvivorFacing } from './survivor-visual-motion.ts';
import { deliveredSurvivorClip } from './survivor-delivery.ts';

type Facing = 'south' | 'east' | 'north' | 'west';
type Action = 'idle' | 'attack' | 'hurt' | 'dash' | 'downed';
type Clip = {
  id: string;
  classId: ClassId;
  action: Action;
  direction: Facing;
  frames: number;
  fps: number;
  cellSize: number;
  columns: number;
  origin: number[];
  displayCell: number;
};
export const survivorActionArt = {
  entries: (library as unknown as { entries: Clip[] }).entries.map(deliveredSurvivorClip),
};
const clips = new Map(survivorActionArt.entries.map((clip) => [clip.id, clip]));
const classes = new Set(survivorActionArt.entries.map((clip) => clip.classId));
const facingOf = (aim: number): Facing =>
  Math.abs(Math.sin(aim)) > Math.abs(Math.cos(aim))
    ? Math.sin(aim) < 0
      ? 'north'
      : 'south'
    : Math.cos(aim) < 0
      ? 'west'
      : 'east';
type Memory = {
  classId: ClassId;
  health: number;
  ammo: number;
  weapon: string;
  status: string;
  attackAt: number;
  hurtAt: number;
  downAt: number;
  downFacing: Facing;
  attackFacing: Facing;
  hurtFacing: Facing;
};

export class SurvivorActionClock {
  private timeline = new PresentationClock();
  timeAt(wallTimeMs: number) {
    return this.timeline.sample(wallTimeMs);
  }
  private people = new Map<string, Memory>();
  private run = '';
  private encounter = -1;
  private tick = -1;
  private phase = '';
  observe(view: View, wallTimeMs = 0) {
    this.timeline.observe(view, wallTimeMs);
    const reset =
      view.run.id !== this.run || view.encounter !== this.encounter || view.tick < this.tick;
    if (reset) this.people.clear();
    const continuingCombat = !reset && this.phase === 'combat' && view.phase === 'combat';
    const present = new Set<string>();
    for (const player of view.players) {
      if (!classes.has(player.classId)) continue;
      present.add(player.id);
      let old = this.people.get(player.id);
      if (old?.classId !== player.classId) old = undefined;
      const memory: Memory = old ?? {
        classId: player.classId,
        health: player.health,
        ammo: player.ammo,
        weapon: player.weapon,
        status: '',
        attackAt: -Infinity,
        hurtAt: -Infinity,
        downAt: view.tick,
        downFacing: facingOf(player.aim),
        attackFacing: facingOf(player.aim),
        hurtFacing: facingOf(player.aim),
      };
      if (old && continuingCombat && old.status === 'active' && player.status === 'active') {
        const attack = clips.get(player.classId + '-attack-south');
        if (
          player.weapon === old.weapon &&
          player.ammo < old.ammo &&
          attack &&
          view.tick - memory.attackAt >= (attack.frames * HZ) / attack.fps
        ) {
          memory.attackAt = view.tick;
          memory.attackFacing = facingOf(player.aim);
        }
        if (player.health < old.health) {
          memory.hurtAt = view.tick;
          memory.hurtFacing = facingOf(player.aim);
          memory.attackAt = -Infinity;
        }
      }
      if (view.phase !== 'combat') {
        memory.attackAt = -Infinity;
        memory.hurtAt = -Infinity;
      }
      if (player.status === 'downed' && old?.status !== 'downed') {
        // The replicated timer also handles a late observer of an existing fall.
        const elapsed = Math.max(
          0,
          view.combatTick - (player.downUntil - Math.ceil(catalog.rules.downedSeconds * HZ)),
        );
        memory.downAt = view.tick - elapsed;
        memory.downFacing = facingOf(player.aim);
      } else if (
        player.status === 'eliminated' &&
        !['downed', 'eliminated'].includes(old?.status ?? '')
      ) {
        memory.downFacing = facingOf(player.aim);
      }
      if (player.status === 'active' && old && old.status !== 'active') {
        memory.attackAt = -Infinity;
        memory.hurtAt = -Infinity;
      }
      Object.assign(memory, {
        health: player.health,
        ammo: player.ammo,
        weapon: player.weapon,
        status: player.status,
      });
      this.people.set(player.id, memory);
    }
    for (const id of this.people.keys()) if (!present.has(id)) this.people.delete(id);
    this.run = view.run.id;
    this.encounter = view.encounter;
    this.tick = view.tick;
    this.phase = view.phase;
  }
  pose(
    player: PlayerView,
    view: View,
    moving: boolean,
    reduced = false,
    wallTimeMs?: number,
    visualFacing?: SurvivorFacing,
  ) {
    if (!classes.has(player.classId) || player.status === 'waiting') return undefined;
    const memory = this.people.get(player.id);
    if (!memory) return undefined;
    const drawn = wallTimeMs === undefined ? view : this.timeline.sample(wallTimeMs);
    let facing = visualFacing ?? facingOf(player.aim),
      action: Action = 'idle',
      elapsed = drawn.tick;
    if (player.status === 'downed' || player.status === 'eliminated') {
      action = 'downed';
      facing = memory.downFacing;
      elapsed =
        player.status === 'eliminated' || view.phase !== 'combat'
          ? Infinity
          : Math.max(0, drawn.tick - memory.downAt);
    } else if (player.status === 'active') {
      if (view.combatTick < player.dashUntil && (player.dashX || player.dashY)) {
        action = 'dash';
        facing = facingOf(Math.atan2(player.dashY, player.dashX));
        const clip = clips.get(player.classId + '-dash-' + facing)!;
        // Fit the full strip to the actual authoritative dash interval.
        const duration =
          player.classId === 'tank' && player.kit.chargeUntil === player.dashUntil
            ? RESCUE_CHARGE_TICKS
            : Math.ceil(catalog.rules.dodgeDuration * HZ);
        const remaining = Math.min(duration, Math.max(0, player.dashUntil - drawn.combatTick));
        elapsed = ((duration - remaining) * clip.frames * HZ) / (duration * clip.fps);
      } else {
        const hurt = clips.get(player.classId + '-hurt-' + facing)!;
        if (view.tick - memory.hurtAt < (hurt.frames * HZ) / hurt.fps) {
          action = 'hurt';
          facing = memory.hurtFacing;
          elapsed = drawn.tick - memory.hurtAt;
        } else if (moving)
          return undefined; // Existing independent directional run art.
        else {
          const attack = clips.get(player.classId + '-attack-' + facing)!;
          if (view.tick - memory.attackAt < (attack.frames * HZ) / attack.fps) {
            action = 'attack';
            facing = memory.attackFacing;
            elapsed = drawn.tick - memory.attackAt;
          }
        }
      }
    } else return undefined;
    const clip = clips.get(player.classId + '-' + action + '-' + facing)!;
    const frame = reduced
      ? action === 'downed'
        ? clip.frames - 1
        : action === 'dash'
          ? Math.floor(clip.frames / 2)
          : action === 'attack'
            ? 1
            : 0
      : action === 'idle'
        ? Math.floor((Math.max(0, elapsed) * clip.fps) / HZ) % clip.frames
        : Math.min(clip.frames - 1, Math.floor((Math.max(0, elapsed) * clip.fps) / HZ));
    return {
      texture: clip.id,
      frame,
      origin: clip.origin,
      displayCell: clip.displayCell,
      action,
      facing,
    };
  }
}
