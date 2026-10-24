import revision from '../../content/revision.json' with { type: 'json' };
export const PROTOCOL = 12;
export const CONTENT_REVISION = revision.sha256;
export const HZ = 30,
  DT = 1 / HZ;
export const implementedClassIds = [
  'soldier',
  'medic',
  'heavy',
  'tank',
  'mage',
  'engineer',
  'assassin',
] as const;
export type ClassId = (typeof implementedClassIds)[number];
export const implementedModeIds = ['short', 'standard', 'long', 'raid', 'endless'] as const;
export type ModeId = (typeof implementedModeIds)[number];
export type BossId =
  | 'constable'
  | 'lantern-warden'
  | 'courier'
  | 'ratcatcher'
  | 'quarantine-clerk'
  | 'tollkeeper'
  | 'chain-marshal'
  | 'gate-widow'
  | 'black-ambulance'
  | 'matron'
  | 'alchemist'
  | 'bellringer'
  | 'stitchwright'
  | 'glass-surgeon'
  | 'ash-baker'
  | 'sluice-keeper'
  | 'stationmaster'
  | 'lamplighter'
  | 'anatomist'
  | 'plague-gardener'
  | 'choir'
  | 'red-abbess'
  | 'vesper-judge'
  | 'pallbearer'
  | 'cinder-foreman'
  | 'canal-diver'
  | 'clockmender'
  | 'wire-seamstress'
  | 'gravedigger'
  | 'ink-notary'
  | 'spore-beekeeper'
  | 'ice-custodian'
  | 'bridge-ferryman'
  | 'porcelain-mourner'
  | 'boiler-tender'
  | 'mirror-undertaker'
  | 'chalk-magistrate'
  | 'wire-harpist'
  | 'crow-shepherd'
  | 'ledger-leech'
  | 'engine'
  | 'regent'
  | 'salt-patriarch'
  | 'chain-colossus'
  | 'ossuary-leviathan'
  | 'bell-triplets'
  | 'quarantine-heart'
  | 'crown-procession'
  | 'city-eater'
  | 'last-breath-saint'
  | 'hourglass-widow'
  | 'unlit-astronomer'
  | 'folded-man'
  | 'red-comet'
  | 'memory-taxer'
  | 'choir-of-moths'
  | 'zero-hour-conductor'
  | 'walking-district'
  | 'last-knocker'
  | 'uncounted';
export type CheckpointStatus =
  'disabled' | 'pending' | 'acknowledged' | 'unavailable' | 'finalized';
export type Phase =
  | 'lobby'
  | 'combat'
  | 'mutationVote'
  | 'contractVote'
  | 'shop'
  | 'loading'
  | 'secretOffer'
  | 'victory'
  | 'defeat';
export type InputFrame = {
  sequence: number;
  clientTick: number;
  moveX: number;
  moveY: number;
  aim: number;
  fire: boolean;
  reload: boolean;
  dodge: boolean;
  q: boolean;
  e: boolean;
  ultimate: boolean;
  interact: boolean;
  supply: number;
};
export const idleInput = (): InputFrame => ({
  sequence: 0,
  clientTick: 0,
  moveX: 0,
  moveY: 0,
  aim: -Math.PI / 2,
  fire: false,
  reload: false,
  dodge: false,
  q: false,
  e: false,
  ultimate: false,
  interact: false,
  supply: -1,
});
const booleans = ['fire', 'reload', 'dodge', 'q', 'e', 'ultimate', 'interact'] as const;
const inputKeys = new Set(Object.keys(idleInput()));
export function validInput(x: unknown): x is InputFrame {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const p = x as Record<string, unknown>;
  if (Object.keys(p).length !== inputKeys.size || Object.keys(p).some((k) => !inputKeys.has(k)))
    return false;
  for (const k of ['sequence', 'clientTick'])
    if (!Number.isSafeInteger(p[k]) || Number(p[k]) < 0 || Number(p[k]) > 0xffffffff) return false;
  for (const k of ['moveX', 'moveY', 'aim'])
    if (typeof p[k] !== 'number' || !Number.isFinite(p[k])) return false;
  return (
    Math.abs(Number(p.moveX)) <= 1 &&
    Math.abs(Number(p.moveY)) <= 1 &&
    Math.abs(Number(p.aim)) <= Math.PI &&
    booleans.every((k) => typeof p[k] === 'boolean') &&
    Number.isInteger(p.supply) &&
    Number(p.supply) >= -1 &&
    Number(p.supply) <= 2
  );
}
export type Command = {
  id: string;
  kind: 'weapon' | 'upgrade' | 'skill' | 'supply';
  item: string;
};
export type SupplySlot = { id: string; count: number };
export function validCommand(x: unknown): x is Command {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const p = x as Command;
  return (
    Object.keys(p).length === 3 &&
    typeof p.id === 'string' &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(p.id) &&
    ['weapon', 'upgrade', 'skill', 'supply'].includes(p.kind) &&
    typeof p.item === 'string' &&
    /^[a-z0-9-]{1,64}$/.test(p.item)
  );
}
export type Vec = { x: number; y: number };
export type Shot = {
  id: number;
  owner: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  expires: number;
  pierce: number;
};
export type Warning = {
  id: number;
  kind: 'fan' | 'ring' | 'zone';
  x: number;
  y: number;
  aim: number;
  count: number;
  arc: number;
  speed: number;
  damage: number;
  radius: number;
  at: number;
  until: number;
};
export type Field = {
  id: number;
  owner: string;
  kind: 'rally' | 'heal' | 'zone' | 'barrier';
  x: number;
  y: number;
  radius: number;
  until: number;
  potency: number;
  movement?: number;
};
export type Event =
  | { type: 'shots'; shots: Shot[] }
  | { type: 'remove'; ids: number[] }
  | { type: 'sound'; id: string; owner?: string; x?: number; y?: number }
  | { type: 'notice'; key: string };
export type Contract = {
  id: string;
  bossId?: BossId;
  threat: number;
  risk: number;
  bounty: number;
  recommendedRating: number;
  variant?: 'normal' | 'brutal';
};
export type Result = { ok: boolean; reason?: string };
