import type { Game } from './game.ts';
import type { ClassId, Phase, Warning, Field, Contract, SupplySlot } from './protocol.ts';
export type PlayerView = {
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
  speed: number;
  dashUntil: number;
  dashX: number;
  dashY: number;
  slowUntil: number;
  dodgeCooldown: number;
};
export type View = {
  tick: number;
  combatTick: number;
  phase: Phase;
  phaseEnds: number;
  encounter: number;
  owner: string;
  players: PlayerView[];
  boss: {
    variant: 'normal' | 'brutal';
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    phase: number;
    threat: number;
    deadline: number;
    staggerUntil: number;
  };
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
    tick: g.tick,
    combatTick: g.combatTick,
    phase: g.phase,
    phaseEnds: g.phaseEnds,
    encounter: g.encounter,
    owner,
    players: [...g.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      classId: p.classId,
      x: p.x,
      y: p.y,
      aim: p.aim,
      health: p.health,
      maxHealth: p.maxHealth,
      shield: p.shield + (g.combatTick < p.supplyShieldUntil ? p.supplyShield : 0),
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
      speed: g.movementSpeed(p),
      dashUntil: p.dashUntil,
      dashX: p.dashX,
      dashY: p.dashY,
      slowUntil: p.slowUntil,
      dodgeCooldown: g.stats(p).dodgeCooldown,
    })),
    boss: { ...g.boss },
    warnings: g.warnings.map((w) => ({ ...w })),
    fields: g.fields.map((f) => ({ ...f })),
    mutations: g.mutations.map((m) => ({ ...m })),
    mutationCards: [...g.mutationCards],
    contractCards: g.contractCards.map((c) => ({ ...c })),
    votes: Object.fromEntries(g.votes),
    accord: g.accord ? structuredClone(g.accord) : null,
  };
}
