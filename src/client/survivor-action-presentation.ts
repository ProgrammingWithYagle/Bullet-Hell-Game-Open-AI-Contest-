// Drawn action selection only. Combat state, damage and movement remain authoritative.
import library from '../../assets/production/motion/survivor-actions/library.json';
import bardLibrary from '../../assets/production/motion/bard-actions/library.json';
import swordLibrary from '../../assets/production/motion/swordsman-actions/library.json';
import summonerLibrary from '../../assets/production/motion/summoner-actions/library.json';
import alchemistLibrary from '../../assets/production/motion/alchemist-actions/library.json';
import {alchemyActionCue,alchemyActionFrame} from './alchemy-presentation.ts';
import rangerLibrary from '../../assets/production/motion/ranger-actions/library.json';
import {rangerAttackCue,rangerAttackFrame} from './ranger-presentation.ts';
import catalog from '../../content/catalog.json';
import { HZ, type ClassId } from '../shared/protocol.ts';
import type { View, PlayerView } from '../shared/view.ts';
import { RESCUE_CHARGE_TICKS } from '../shared/class-kits.ts';
import { PresentationClock } from './presentation-clock.ts';
import type { SurvivorFacing } from './survivor-visual-motion.ts';
import { deliveredSurvivorClip } from './survivor-delivery.ts';

type Facing = 'south' | 'east' | 'north' | 'west';
type Action = 'idle' | 'attack' | 'hurt' | 'dash' | 'downed' | 'guard' | 'brew' | 'throw';
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
  entries: [
    ...(library as unknown as { entries: Clip[] }).entries,
    ...(bardLibrary as unknown as { entries: Clip[] }).entries,
    ...(swordLibrary as unknown as { entries: Clip[] }).entries,
    ...(summonerLibrary as unknown as { entries: Clip[] }).entries,
    ...(rangerLibrary as unknown as { entries: Clip[] }).entries,
    ...(alchemistLibrary as unknown as { entries: Clip[] }).entries,
  ].map(deliveredSurvivorClip),
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
  swordCutId?: number;
  sniperEventAt?:number;heavyEventAt?:number;
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
      const sniper=player.classId==='soldier'&&player.skills.includes('soldier-sniper-1'),flak=player.classId==='heavy'&&player.skills.includes('heavy-flak-1');
      if (old && continuingCombat && old.status === 'active' && player.status === 'active') {
        const attack = clips.get(player.classId + '-attack-south');
        if (
          !sniper && !flak && player.classId !== 'ranger' && player.weapon === old.weapon &&
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
      if(sniper&&view.phase==='combat'&&player.status==='active'){
        const primaryAt=player.kit.sniperPrimaryAt??0,shotAt=player.kit.sniperShotAt??0,at=Math.max(primaryAt,shotAt),fresh=at>0&&at!==(memory.sniperEventAt??0),attack=clips.get('soldier-attack-south')!,duration=attack.frames*HZ/attack.fps;
        memory.sniperEventAt=at;
        if(fresh&&view.combatTick>=at&&view.combatTick-at<duration&&view.tick-memory.attackAt>=duration&&(!old||(player.weapon===old.weapon&&player.health>=old.health))){memory.attackAt=view.tick-Math.max(0,view.combatTick-at);memory.attackFacing=facingOf(shotAt>=primaryAt?(player.kit.sniperShotAim??player.aim):(player.kit.sniperPrimaryAim??player.aim));}
      }
      if(flak&&view.phase==='combat'&&player.status==='active'){
        const primaryAt=player.kit.heavyPrimaryAt??0,shotAt=player.kit.heavyFlakShotAt??0,at=Math.max(primaryAt,shotAt),fresh=at>0&&at!==(memory.heavyEventAt??0),attack=clips.get('heavy-attack-south')!,duration=attack.frames*HZ/attack.fps;
        memory.heavyEventAt=at;
        if(fresh&&view.combatTick>=at&&view.combatTick-at<duration&&view.tick-memory.attackAt>=duration&&(!old||(player.weapon===old.weapon&&player.health>=old.health))){memory.attackAt=view.tick-Math.max(0,view.combatTick-at);memory.attackFacing=facingOf(shotAt>=primaryAt?(player.kit.heavyFlakShotAim??player.aim):(player.kit.heavyPrimaryAim??player.aim));}
      }
      if (player.classId === 'swordsman' && view.phase === 'combat' && player.status === 'active') {
        const cut = view.classCues
          .filter(
            (c) => c.owner === player.id && (c.kind === 'sword-windup' || c.kind === 'sword-cut'),
          )
          .sort((a, b) => b.id - a.id)[0];
        if (
          cut &&
          (cut.kind === 'sword-windup' || cut.kind === 'sword-cut') &&
          memory.swordCutId !== cut.id
        ) {
          memory.swordCutId = cut.id;
          memory.attackAt = view.tick - Math.max(0, view.combatTick - cut.at);
          memory.attackFacing = facingOf(cut.aim);
        }
        if (view.combatTick < player.dashUntil) memory.attackAt = -Infinity;
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
    let poseFrame:number|undefined;
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
        } else {
          const guard =
            player.classId === 'swordsman' && view.phase === 'combat'
              ? view.classCues.find(
                  (c) =>
                    c.owner === player.id &&
                    c.kind === 'sword-guard' &&
                    c.active &&
                    (c.remaining ?? 0) > 0,
                )
              : undefined;
          const attack = clips.get(player.classId + '-attack-' + facing)!;
          const candidateChemistry=alchemyActionCue(player,view,drawn.combatTick);
          const chemistry=candidateChemistry&&(candidateChemistry.kind==='alchemy-brew'||memory.attackAt<view.tick-(view.combatTick-candidateChemistry.at))?candidateChemistry:undefined;
          const bow=rangerAttackCue(player,view,drawn.combatTick);
          const attacking = view.tick - memory.attackAt < (attack.frames * HZ) / attack.fps;
          if(chemistry?.kind==='alchemy-brew'){
            action='brew';facing=facingOf(player.aim);
            poseFrame=alchemyActionFrame(chemistry,drawn.combatTick,clips.get(player.classId+'-brew-'+facing)!.frames,reduced);
          }else if(bow){
            action='attack';facing=facingOf(bow.aim);poseFrame=rangerAttackFrame(bow,drawn.combatTick,reduced);
          }else if (guard && guard.kind === 'sword-guard') {
            action = 'guard';
            facing = facingOf(guard.aim);
            elapsed = 0;
          } else if(chemistry?.kind==='alchemy-flask'){
            action='throw';facing=facingOf(chemistry.x===chemistry.x2&&chemistry.y===chemistry.y2?player.aim:Math.atan2(chemistry.y2-chemistry.y,chemistry.x2-chemistry.x));
            poseFrame=alchemyActionFrame(chemistry,drawn.combatTick,clips.get(player.classId+'-throw-'+facing)!.frames,reduced);
          } else if (attacking && (!moving || player.classId === 'swordsman'||player.classId==='alchemist')) {
            action = 'attack';
            facing = memory.attackFacing;
            elapsed = drawn.tick - memory.attackAt;
          } else if (moving) return undefined;
        }
      }
    } else return undefined;
    const clip = clips.get(player.classId + '-' + action + '-' + facing)!;
    const frame = poseFrame ?? (reduced
      ? action === 'downed'
        ? clip.frames - 1
        : action === 'dash'
          ? Math.floor(clip.frames / 2)
          : action === 'attack'
            ? 1
            : 0
      : action === 'idle'
        ? Math.floor((Math.max(0, elapsed) * clip.fps) / HZ) % clip.frames
        : Math.min(clip.frames - 1, Math.floor((Math.max(0, elapsed) * clip.fps) / HZ)));
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
