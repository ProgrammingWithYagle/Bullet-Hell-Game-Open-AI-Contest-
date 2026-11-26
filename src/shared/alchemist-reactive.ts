import type { Vec } from './protocol.ts';

export const reactiveIds = {
  entry: 'alchemist-flash-reaction-1',
  wick: 'alchemist-short-wick-1',
  vent: 'alchemist-vent-cap-1',
} as const;

export type ReactiveFitting = 'standard' | 'wick' | 'vent';
export function reactiveFitting(skills: readonly string[]): ReactiveFitting {
  if (skills.includes(reactiveIds.wick)) return 'wick';
  if (skills.includes(reactiveIds.vent)) return 'vent';
  return 'standard';
}

export const reactiveRules = { chalk: 1, wickRange: 190, wickFlightTicks: 9 } as const;

export type AlchemyReactionStatus = {
  fitting: ReactiveFitting;
  stage: 'busy' | 'normal' | 'spent' | 'prepare' | 'chalk' | 'aim' | 'ready';
  target?: Vec & { radius: number };
};
