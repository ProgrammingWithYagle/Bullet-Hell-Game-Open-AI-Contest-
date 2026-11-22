import { conductorIds, conductorRules } from '../shared/bard-kit.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

export function bardActions(player: PlayerView) {
  const state = player.kit.conducting;
  const id = state?.adjustment ? conductorIds.side : state?.returning ? conductorIds.reprise : conductorIds.entry;
  const owned = player.classId === 'bard' && !player.training && player.skills.includes(conductorIds.entry);
  const extras = owned ? [{ key: 'technique1' as const, id, at: state?.ready ? 0 : state?.until ?? player.qAt, blocked: !state?.ready }] : [];
  return { command: false, qNameKey: null, qAt: player.qAt, qBlocked: false, extras };
}

export function bardHudLabel(player: PlayerView, now: number) {
  const state = player.kit.conducting;
  if (state?.phase === 'listening') return t(state.adjustment ? 'ui.bard.shiftStage' : 'ui.bard.landStageNote');
  if (state?.phase === 'answer') {
    if (!state.ready) return t('ui.bard.returnRange');
    return t(state.returning ? 'ui.bard.answerAtCall' : 'ui.bard.answerAtStage');
  }
  if (player.qAt > now) return t('skill.' + conductorIds.entry + '.name');
  if ((player.kit.cadence ?? 0) < conductorRules.cadence) return t('ui.bard.earnCadence');
  return t(state?.ready ? 'ui.bard.startCall' : 'ui.bard.findStage');
}
