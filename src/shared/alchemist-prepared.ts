import type { Recipe } from './alchemist-kit.ts';

export const preparedIds = {
  entry: 'alchemist-stow-flask-1',
  brew: 'alchemist-brew-latch-1',
  toss: 'alchemist-throw-latch-1',
} as const;

export type CompoundFitting = 'standard' | 'brew' | 'toss';
export function compoundFitting(skills: readonly string[]): CompoundFitting {
  if (skills.includes(preparedIds.brew)) return 'brew';
  if (skills.includes(preparedIds.toss)) return 'toss';
  return 'standard';
}

export const compoundRules = { settleTicks: 36, holdingTicks: 210 } as const;

export type AlchemyReserveStatus = {
  fitting: CompoundFitting;
  stage: 'empty' | 'stow' | 'busy' | 'latched' | 'return' | 'brew' | 'toss';
  held?: { recipe: Recipe; readyAt: number; until: number };
};
