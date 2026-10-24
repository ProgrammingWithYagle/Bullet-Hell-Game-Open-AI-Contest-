import type { TerrainStatus } from './district-director.ts';
import type { KitCue, KitStatus } from './class-kits.ts';
import type { Game, Boss } from './game.ts';
import type { Minion } from './minions.ts';
import type { BossCue } from './boss-director.ts';
import type { WardenSample } from './warden-signature.ts';
import type { ClassId, Phase, Warning, Field, Contract, SupplySlot } from './protocol.ts';
export type PlayerView = {
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
  reloadAt: number;
  downUntil: number;
  reviveProgress: number;
  reviveTarget: string;
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
  dodgeCooldown: number;
};
export type View = {
  secretStatus: Game['secretStatus'];
  extensionParticipants: string[];
  campaignBank: Game['campaignBank'];
  tick: number;
  combatTick: number;
  phase: Phase;
  phaseEnds: number;
  encounter: number;
  arenaId: string;
  owner: string;
  players: PlayerView[];
  boss: Boss;
  signatures: WardenSample[];
  minions: Minion[];
  bossCues: BossCue[];
  classCues: KitCue[];
  warnings: Warning[];
  fields: Field[];
  mutations: { id: string; remaining: number }[];
  mutationCards: string[];
  contractCards: Contract[];
  votes: Record<string, number>;
  accord: Game['accord'];
};
export function viewOf(g: Game, owner: string): View {
  return {
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
      id: p.id,
      eligible: p.eligible,
      kit: g.classKits.status(p.id, g.combatTick),
      terrain: structuredClone(p.terrain),
      name: p.name,
      classId: p.classId,
      x: p.x,
      y: p.y,
      aim: p.aim,
      health: p.health,
      maxHealth: p.maxHealth,
      shield:
        p.shield +
        (g.combatTick < p.supplyShieldUntil ? p.supplyShield : 0) +
        g.classKits.status(p.id, g.combatTick).shield,
      status: p.status,
      connected: p.connected,
      ack: p.ack,
      ammo: p.ammo,
      coins: p.coins,
      sp: p.totalSp - p.skills.reduce((n, id) => n + g.skillCost(id), 0),
      qAt: p.qAt,
      eAt: p.eAt,
      ultimateAt: p.ultimateAt,
      dodgeAt: p.dodgeAt,
      reloadAt: p.reloadAt,
      downUntil: p.downUntil,
      reviveProgress: p.reviveProgress,
      reviveTarget: p.reviveTarget,
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
      dodgeCooldown: g.stats(p).dodgeCooldown,
    })),
    boss: { ...g.boss },
    signatures: structuredClone(g.signatures),
    minions: g.minions.snapshot(),
    bossCues: g.director.cues(),
    classCues: g.classKits.cues(),
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
