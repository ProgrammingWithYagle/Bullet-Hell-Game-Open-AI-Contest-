import { rangerSightIds } from '../shared/ranger-sight.ts';
import { rangerTrackerIds } from '../shared/ranger-tracker.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

export function rangerActions(player: PlayerView) {
  const state = player.kit.rangerSight;
  const owned = player.classId === 'ranger' && !player.training && player.skills.includes(rangerSightIds.entry);
  const canPress = state?.stage === 'ready' || state?.stage === 'release' || state?.stage === 'outside' && state.canAdjust;
  const tracking = player.kit.rangerTracker;
  const trackerOwned = player.classId === 'ranger' && !player.training && player.skills.includes(rangerTrackerIds.entry);
  const extras = [
    ...(owned ? [{ key:'technique1' as const, id:state?.fitting ? rangerSightIds[state.fitting] : rangerSightIds.entry,
      at:state?.stage === 'recovery' ? state.recoveryAt : 0, blocked:!canPress }] : []),
    ...(trackerOwned ? [{ key:'technique2' as const, id:tracking?.fitting ? rangerTrackerIds[tracking.fitting] : rangerTrackerIds.entry,
      at:tracking?.stage === 'recovering' ? tracking.recoveryAt : 0, blocked:tracking?.stage !== 'ready' }] : []),
  ];
  return { command:false, qNameKey:null, qAt:player.qAt, qBlocked:false, extras };
}

export function rangerSightLabel(player: PlayerView) {
  const state = player.kit.rangerSight;
  if (!state || state.stage === 'ready') return t('skill.' + rangerSightIds.entry + '.name');
  if (state.stage === 'outside' && state.canAdjust) return t('ui.rangerSight.change');
  return t('ui.rangerSight.' + state.stage);
}

export function rangerTrackerLabel(player: PlayerView) {
  const track = player.kit.rangerTracker;
  if (!track || track.stage === 'ready') return t('skill.' + rangerTrackerIds.entry + '.name');
  return t('ui.rangerTracker.' + (track.stage === 'flank' && track.fitting === 'stakes' ? 'stake' : track.stage));
}
