import { preventiveCareIds } from '../shared/medic-preventive-care.ts';
import { rapidResponseIds, rapidResponseRules } from '../shared/medic-rapid-response.ts';
import type { PlayerView } from '../shared/view.ts';
import { fieldSurgeryIds } from '../shared/medic-field-surgery.ts';
import { t } from './i18n.ts';

export function medicActions(player: PlayerView, now: number) {
  const activeKit = player.classId === 'medic' && !player.training;
  const owned = activeKit && player.skills.includes(fieldSurgeryIds.entry);
  const dressing = player.kit.fieldDressing;
  const phase = dressing?.phase ?? 'idle';
  let id: typeof fieldSurgeryIds[keyof typeof fieldSurgeryIds] = fieldSurgeryIds.entry;
  if (phase === 'tied' || dressing?.canTie) id = fieldSurgeryIds.tie;
  else if (phase === 'wrapped' || dressing?.canWrap) id = fieldSurgeryIds.wrap;
  else if (phase === 'held' || dressing?.canHold) id = fieldSurgeryIds.aside;
  else if (dressing?.stepRemaining) id = fieldSurgeryIds.step;
  const waiting = phase === 'tied' || (phase === 'preparing' && !dressing?.canWrap);
  const at = phase === 'idle' ? player.qAt : waiting ? dressing?.nextAt ?? now : 0;
  const response = player.kit.rapidResponse;
  const responseId = response?.canSwitch ? rapidResponseIds.switchback : response?.canHandoff ? rapidResponseIds.handoff : rapidResponseIds.entry;
  const wrap = player.kit.precautionWrap;
  let wrapId: typeof preventiveCareIds[keyof typeof preventiveCareIds] = preventiveCareIds.entry;
  if (wrap?.phase === 'station' || wrap?.canPlace) wrapId = preventiveCareIds.doorstep;
  else if (wrap?.phase === 'layered' || wrap?.canLayer) wrapId = preventiveCareIds.layered;
  const extras = [
    ...(owned ? [{ key: 'technique1' as const, id, at, blocked: !dressing?.ready }] : []),
    ...(activeKit && player.skills.includes(rapidResponseIds.entry) ? [{
      key: 'technique2' as const, id: responseId, at: response?.phase === 'idle' || !response ? player.eAt : 0,
      blocked: !response?.ready,
    }] : []),
    ...(activeKit && player.skills.includes(preventiveCareIds.entry) ? [{
      key: 'technique3' as const, id: wrapId, at: wrap?.ready ? 0 : wrap?.until ?? player.qAt, blocked: !wrap?.ready,
    }] : []),
  ];
  return { command: false, qNameKey: null, qAt: player.qAt, qBlocked: false, extras };
}

export function medicDressingLabel(player: PlayerView, now: number) {
  const status = player.kit.fieldDressing;
  if (status?.phase === 'tied') return t('ui.medic.dressingTied');
  if (status?.phase === 'wrapped') return t('ui.medic.dressingUnwrap');
  if (status?.phase === 'held') return t('ui.medic.dressingResume');
  if (status?.canTie) return t('ui.medic.dressingTieMoving');
  if (status?.phase === 'preparing') return t(status.canWrap ? 'ui.medic.dressingWrap' : 'ui.medic.dressingPreparing');
  if (status?.phase === 'applying') return t(status.canHold ? 'ui.medic.dressingSetAside' : 'ui.medic.dressingCancel');
  return t(player.qAt <= now && !status?.ready ? 'ui.medic.dressingPatient' : 'ui.medic.dressingPrepare');
}

export function medicResponseLabel(player: PlayerView) {
  const status = player.kit.rapidResponse;
  if (status?.canSwitch) return t('ui.medic.responseTurn');
  if (status?.canHandoff) return t('ui.medic.responseHandoff');
  if (status?.phase === 'arrived') return t(status.patient ? 'ui.medic.responseDose' : 'ui.medic.responseAim');
  if (status?.phase === 'running') return t((status.walked ?? 0) >= rapidResponseRules.requiredWalk
    ? 'ui.medic.responseBrake' : 'ui.medic.responseStep');
  return t('ui.medic.responseRun');
}

export function medicWrapLabel(player: PlayerView, now: number) {
  const wrap = player.kit.precautionWrap;
  if (wrap?.phase === 'settling') return t('ui.medic.wrapSettle');
  if (wrap?.phase === 'station') return t('ui.medic.wrapStation');
  if (wrap?.phase === 'layered') return t(wrap.capturedHits ? 'ui.medic.wrapRelease' : 'ui.medic.wrapLayerWaiting');
  if (wrap?.phase === 'armed') {
    if (wrap.canPlace) return t('ui.medic.wrapPlace');
    if (wrap.canLayer) return t('ui.medic.wrapLayer');
    return t('ui.medic.wrapWaiting');
  }
  return t(!wrap?.patient && (wrap?.until ?? player.qAt) <= now ? 'ui.medic.wrapAim' : 'ui.medic.wrapPrepare');
}

export function medicHudLabel(player: PlayerView, action: 'technique1' | 'technique2' | 'technique3', now: number) {
  if (action === 'technique3') return medicWrapLabel(player, now);
  if (action === 'technique2') return medicResponseLabel(player);
  return medicDressingLabel(player, now);
}
