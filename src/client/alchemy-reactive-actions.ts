import { reactiveFitting, reactiveIds } from '../shared/alchemist-reactive.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

export function alchemyReactiveActions(player: PlayerView) {
  const state = player.kit.alchemyReaction;
  const fitting = reactiveFitting(player.skills);
  const owned = player.classId === 'alchemist' && !player.training && player.skills.includes(reactiveIds.entry);
  const extras = owned ? [{
    key: 'technique1' as const,
    id: fitting === 'standard' ? reactiveIds.entry : reactiveIds[fitting],
    blocked: state?.stage !== 'ready',
    at: state?.stage === 'spent' ? player.eAt : 0,
  }] : [];
  return { command: false, qNameKey: null, qAt: player.qAt, qBlocked: false, extras };
}

export function alchemyReactionLabel(player: PlayerView) {
  const state = player.kit.alchemyReaction;
  return t(state && state.stage !== 'ready' ? 'ui.alchemyReaction.' + state.stage : 'skill.' + reactiveIds.entry + '.name');
}
