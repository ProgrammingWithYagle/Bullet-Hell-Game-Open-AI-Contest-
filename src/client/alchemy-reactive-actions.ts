import { restorativeFitting, restorativeIds } from '../shared/alchemist-restorative.ts';
import { compoundFitting, preparedIds } from '../shared/alchemist-prepared.ts';
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

export function alchemyActions(player: PlayerView) {
  const reactive = alchemyReactiveActions(player);
  if (player.classId !== 'alchemist' || player.training) return reactive;
  const compound = compoundFitting(player.skills), reserve = player.kit.alchemyReserve;
  const restorative = restorativeFitting(player.skills), dressing = player.kit.alchemyDressing;
  return { ...reactive, extras:[...reactive.extras,
    ...(player.skills.includes(preparedIds.entry) ? [{
      key:'technique2' as const,
      id:compound === 'standard' ? preparedIds.entry : preparedIds[compound],
      blocked:reserve?.stage !== 'stow' && reserve?.stage !== 'return',
      at:reserve?.stage === 'latched' ? reserve.held?.readyAt ?? 0 : 0,
    }] : []),
    ...(player.skills.includes(restorativeIds.entry) ? [{
      key:'technique3' as const,
      id:restorative === 'standard' ? restorativeIds.entry : restorativeIds[restorative],
      blocked:dressing?.stage !== 'ready',
      at:dressing?.stage === 'recovering' ? player.eAt : 0,
    }] : []),
  ] };
}

export function alchemyReserveLabel(player: PlayerView) {
  return t('ui.alchemyReserve.' + (player.kit.alchemyReserve?.stage ?? 'empty'));
}

export function alchemyDressingLabel(player: PlayerView) {
  const state = player.kit.alchemyDressing;
  return t(state && state.stage !== 'ready' ? 'ui.alchemyDressing.' + state.stage : 'skill.' + restorativeIds.entry + '.name');
}
