import type {SummonView} from './summoner-kit.ts';
import type {SkirmishView} from './ward-skirmish.ts';
import type {StoryChapterState} from './story-chapter.ts';
import type {StoryTrainingState} from './story-training.ts';
import type { RunProgress } from './run-progress.ts';
import type { TerrainStatus } from './district-director.ts';
import type { KitCue, KitStatus } from './class-kits.ts';
import type { Game, Boss } from './game.ts';
import type { Minion } from './minions.ts';
import type { BossCue } from './boss-director.ts';
import type { WardenSample } from './warden-signature.ts';
import type { ClassId, Phase, Warning, Field, Contract, SupplySlot } from './protocol.ts';
export type PlayerView = {
  training?:StoryTrainingState;
  progress: RunProgress;
  eligible: boolean;
  terrain: TerrainStatus;
  kit: KitStatus;
  id: string;
  name: string;
  classId: ClassId;
  x: number;
  y: number;
  aim: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  status: string;
  connected: boolean;
  ack: number;
  ammo: number;
  coins: number;
  sp: number;
  qAt: number;
  eAt: number;
  ultimateAt: number;
  dodgeAt: number;
  dodgeInputDown?:boolean;dodgeSteered?:boolean;dodgeControlUntil?:number;
  dodgeCharges:number;dodgeMaximum:number;sprintStamina:number;sprintRecoveryAt:number;sprintExhausted:boolean;sprinting:boolean;
  reloadAt: number;
  downUntil: number;
  reviveProgress: number;
  reviveTarget: string;
  selfRevives: number;
  weapon: string;
  skills: string[];
  upgrades: Record<string, number>;
  supplies: SupplySlot[];
  supplyAt: number;
  braceUntil: number;
  overdriveUntil: number;
  speed: number;
  dashUntil: number;
  dashX: number;
  dashY: number;
  slowUntil: number;
  poisonUntil: number;
  dodgeCooldown: number;
};
export type View = {
  retinue?:SummonView[];
  chapter?:StoryChapterState;
  patients?:{owner:string;x:number;y:number;health:number;maxHealth:number}[];
  objective?:SkirmishView;
  run: { id: string; mode: Game['settings']['mode']; difficulty: string; practiceOnly: true; testingModified?: boolean; customized?:boolean;
    arenaSelection?: Game['settings']['arenaSelection']; selectedArenaId?: string; maximumPlayers?: number; bossDeadlineMultiplier?:number };
  secretStatus: Game['secretStatus'];
  extensionParticipants: string[];
  campaignBank: Game['campaignBank'];
  storyChoices?:number[];
  tick: number;
  combatTick: number;
  phase: Phase;
  phaseEnds: number;
  encounter: number;
  arenaId: string;
  owner: string;
  matchPaused?: boolean;
  endedByHost?: boolean;
  players: PlayerView[];
  boss: Boss;
  signatures: WardenSample[];
  minions: Minion[];
  bossCues: BossCue[];
  classCues: (KitCue | import('./heavy-seam.ts').FlakSeamContactCue)[];
  warnings: Warning[];
  fields: Field[];
  mutations: { id: string; remaining: number }[];
  mutationCards: string[];
  contractCards: Contract[];
  votes: Record<string, number>;
  accord: Game['accord'];
};
/** Anchor coordinates and the friendly projectile ID travel only to the Lineworker. */
export function splitInterceptorKit(kit:KitStatus){
  if(kit.interceptorPhase===undefined&&kit.bastionCanPlant===undefined)return {shared:kit,owner:undefined};
  const {bastionCanPlant,bastionAdjustment,interceptorPhase,interceptorMode,interceptorHeading,interceptorStartedAt,interceptorReadyAt,interceptorExpiresAt,interceptorScreenUntil,interceptorMotionX,interceptorMotionY,interceptorInputDown,interceptorCanArm,interceptorCanLaunch,interceptorCanCrossLeft,interceptorCanCrossRight,interceptorCanOffsetLeft,interceptorCanOffsetRight,interceptorOffset,interceptorOffsetHeld,interceptorCanReturn,...shared}=kit;
  return {shared,owner:{bastionCanPlant,bastionAdjustment,interceptorPhase,interceptorMode,interceptorHeading,interceptorStartedAt,interceptorReadyAt,interceptorExpiresAt,interceptorScreenUntil,interceptorMotionX,interceptorMotionY,interceptorInputDown,interceptorCanArm,interceptorCanLaunch,interceptorCanCrossLeft,interceptorCanCrossRight,interceptorCanOffsetLeft,interceptorCanOffsetRight,interceptorOffset,interceptorOffsetHeld,interceptorCanReturn}};
}
export function splitBulwarkKit(kit:KitStatus){
  const base=splitInterceptorKit(kit);
  if(base.shared.bulwarkCarried===undefined)return base;
  const {bulwarkCarried,bulwarkCanLift,bulwarkCanSet,bulwarkCanSetFolded,bulwarkCanHandle,bulwarkCanShiftPort,bulwarkPrimaryReady,bulwarkPortPhase,bulwarkRecoveryAt,bulwarkCommitAt,bulwarkCommitUntil,bulwarkPanelUntil,bulwarkHeading,bulwarkPanelIds,...shared}=base.shared;
  return {shared,owner:{...base.owner,bulwarkCarried,bulwarkCanLift,bulwarkCanSet,bulwarkCanSetFolded,bulwarkCanHandle,bulwarkCanShiftPort,bulwarkPrimaryReady,bulwarkPortPhase,bulwarkRecoveryAt,bulwarkCommitAt,bulwarkCommitUntil,bulwarkPanelUntil,bulwarkHeading,bulwarkPanelIds}};
}
export function splitLineworkKit(kit: KitStatus) {
  const base=splitBulwarkKit(kit);
  if (kit.fieldDressing !== undefined || kit.rapidResponse !== undefined || kit.precautionWrap !== undefined || kit.pivotSigil !== undefined || kit.waymark !== undefined || kit.fuseSeal !== undefined || kit.calledOpening !== undefined || kit.slipRoute !== undefined || kit.crossingWrit !== undefined || kit.conducting !== undefined || kit.lamenting !== undefined || kit.misdirecting !== undefined || kit.measuredStance !== undefined || kit.counterstroke !== undefined || kit.pursuit !== undefined || kit.cohort !== undefined || kit.bond !== undefined || kit.formation !== undefined || kit.rangerSight !== undefined || kit.rangerTracker !== undefined || kit.rangerField !== undefined || kit.alchemyReaction !== undefined || kit.alchemyReserve !== undefined) {
    const { fieldDressing, rapidResponse, precautionWrap, pivotSigil, waymark, fuseSeal, calledOpening, slipRoute, crossingWrit, conducting, lamenting, misdirecting, measuredStance, counterstroke, pursuit, cohort, bond, formation, rangerSight, rangerTracker, rangerField, alchemyReaction, alchemyReserve, ...shared } = base.shared;
    return { shared, owner: { ...base.owner, fieldDressing, rapidResponse, precautionWrap, pivotSigil, waymark, fuseSeal, calledOpening, slipRoute, crossingWrit, conducting, lamenting, misdirecting, measuredStance, counterstroke, pursuit, cohort, bond, formation, rangerSight, rangerTracker, rangerField, alchemyReaction, alchemyReserve } };
  }
  if (kit.lineworkRecovery === undefined) return base;
  const { lineworkAnchor, lineworkConnection, lineworkFlight, lineworkGuideBlocked, ...shared } = base.shared;
  return { shared, owner: { ...base.owner,lineworkAnchor, lineworkConnection, lineworkFlight, lineworkGuideBlocked } };
}

export function viewOf(g: Game, owner: string): View {
  return {
    ...(g.chapter?{chapter:g.chapter,patients:g.patients}:{}),
    ...(g.objective?{objective:g.objective}:{}),
    run: {
      id: g.settings.runId,
      mode: g.settings.mode,
      difficulty: g.settings.difficulty,
      practiceOnly: true,
      arenaSelection: g.settings.arenaSelection,
      selectedArenaId: g.settings.openingArenaId,
      maximumPlayers: g.settings.maxPlayers,
      bossDeadlineMultiplier:g.bossDeadlineMultiplier,
      ...(g.testingModified?{testingModified:true}:{}),
      ...(g.customized?{customized:true}:{}),
    },
    storyChoices:[...g.storyChoices],
    secretStatus: g.secretStatus,
    extensionParticipants: [...g.extensionParticipants],
    campaignBank: g.campaignBank ? { ...g.campaignBank } : null,
    tick: g.tick,
    combatTick: g.combatTick,
    phase: g.phase,
    phaseEnds: g.phaseEnds,
    encounter: g.encounter,
    arenaId: g.arena.id,
    owner,
    players: [...g.players.values()].map((p) => ({
      ...(g.trainingFor(p.id)?{training:g.trainingFor(p.id)}:{}),
      id: p.id,
      progress: structuredClone(p.progress),
      eligible: p.eligible,
      kit: p.id === owner ? g.kitStatus(p.id) : splitLineworkKit(g.kitStatus(p.id)).shared,
      terrain: structuredClone(p.terrain),
      name: p.name,
      classId: p.classId,
      x: p.x,
      y: p.y,
      aim: p.aim,
      health: p.health,
      maxHealth: p.maxHealth,
      maxShield: g.maximumShield(p),
      shield:
        p.shield +
        (g.combatTick < p.supplyShieldUntil ? p.supplyShield : 0) +
        g.classKits.status(p.id, g.combatTick).shield,
      status: p.status,
      connected: p.connected,
      ack: p.ack,
      ammo: p.ammo,
      coins: p.coins,
      sp: g.chapter?0:p.totalSp - p.skills.reduce((n, id) => n + g.skillCost(id), 0),
      qAt: p.qAt,
      eAt: p.eAt,
      ultimateAt: p.ultimateAt,
      dodgeAt: p.dodgeAt,
      dodgeInputDown:p.dodgeInputDown??false,dodgeSteered:p.dodgeSteered??false,dodgeControlUntil:p.dodgeControlUntil??0,
      dodgeCharges:p.dodgeCharges,dodgeMaximum:p.dodgeMaximum,sprintStamina:p.sprintStamina,sprintRecoveryAt:p.sprintRecoveryAt,sprintExhausted:p.sprintExhausted,sprinting:p.sprinting&&g.phase==='combat'&&p.status==='active',
      reloadAt: p.reloadAt,
      downUntil: p.downUntil,
      reviveProgress: p.reviveProgress,
      reviveTarget: p.reviveTarget,
      selfRevives: p.selfRevives,
      weapon: p.weapon,
      skills: [...p.skills],
      upgrades: { ...p.upgrades },
      supplies: p.supplies.map((s) => ({ ...s })),
      supplyAt: p.supplyAt,
      braceUntil: p.braceUntil,
      overdriveUntil: p.overdriveUntil,
      speed: g.movementSpeed(p),
      dashUntil: p.dashUntil,
      dashX: p.dashX,
      dashY: p.dashY,
      slowUntil: p.slowUntil,
      poisonUntil: p.poisonUntil,
      dodgeCooldown: g.stats(p).dodgeCooldown,
    })),
    boss: { ...g.boss },
    signatures: structuredClone(g.signatures),
    minions: g.minions.snapshot(),
    bossCues: g.bossCues(),
    classCues: g.classCues(),
    retinue:g.retinue.snapshot(),
    warnings: g.warnings.map((w) => ({ ...w })),
    fields: g.fields.map((f) => ({ ...f })),
    mutations: g.mutations.map((m) => ({ ...m })),
    mutationCards: [...g.mutationCards],
    contractCards: g.contractCards.map(({ bossId: _concealed, ...card }) => card),
    votes: Object.fromEntries(g.votes),
    accord: g.accord ? structuredClone(g.accord) : null,
  };
}

/** A survivor who banks and leaves sees their secured victory while willing allies continue. */
export function personalView(view: View, id: string): View {
  const p = view.players.find((p) => p.id === id);
  if (
    view.campaignBank &&
    p?.eligible &&
    ((view.phase === 'secretOffer' && view.votes[id] === 0) ||
      (['active', 'cleared', 'failed'].includes(view.secretStatus) &&
        !view.extensionParticipants.includes(id)))
  )
    return {
      ...view,
      phase: 'victory',
      phaseEnds: view.tick,
      secretStatus: 'declined',
      bossCues: [],
      minions: [],
      warnings: [],
      fields: [],
    };
  return view;
}
