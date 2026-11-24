import { rangerSightIds } from '../shared/ranger-sight.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

export function rangerActions(player: PlayerView) {
  const state = player.kit.rangerSight;
  const owned = player.classId === 'ranger' && !player.training && player.skills.includes(rangerSightIds.entry);
  const canPress = state?.stage === 'ready' || state?.stage === 'release' || state?.stage === 'outside' && state.canAdjust;
  const extras = owned ? [{ key:'technique1' as const, id:state?.fitting ? rangerSightIds[state.fitting] : rangerSightIds.entry,
    at:state?.stage === 'recovery' ? state.recoveryAt : 0, blocked:!canPress }] : [];
  return { command:false, qNameKey:null, qAt:player.qAt, qBlocked:false, extras };
}

export function rangerSightLabel(player: PlayerView) {
  const state = player.kit.rangerSight;
  if (!state || state.stage === 'ready') return t('skill.' + rangerSightIds.entry + '.name');
  if (state.stage === 'outside' && state.canAdjust) return t('ui.rangerSight.change');
  return t('ui.rangerSight.' + state.stage);
}
