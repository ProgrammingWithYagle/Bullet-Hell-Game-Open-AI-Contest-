import type { PlayerView } from '../shared/view.ts';
import { fieldSurgeryIds } from '../shared/medic-field-surgery.ts';
import { t } from './i18n.ts';

export function medicActions(player: PlayerView, now: number) {
  const owned = player.classId === 'medic' && !player.training && player.skills.includes(fieldSurgeryIds.entry);
  const dressing = player.kit.fieldDressing;
  const phase = dressing?.phase ?? 'idle';
  let id: typeof fieldSurgeryIds[keyof typeof fieldSurgeryIds] = fieldSurgeryIds.entry;
  if (phase === 'tied' || dressing?.canTie) id = fieldSurgeryIds.tie;
  else if (phase === 'wrapped' || dressing?.canWrap) id = fieldSurgeryIds.wrap;
  else if (phase === 'held' || dressing?.canHold) id = fieldSurgeryIds.aside;
  else if (dressing?.stepRemaining) id = fieldSurgeryIds.step;
  const waiting = phase === 'tied' || (phase === 'preparing' && !dressing?.canWrap);
  const at = phase === 'idle' ? player.qAt : waiting ? dressing?.nextAt ?? now : 0;
  const extras = owned ? [{ key: 'technique1' as const, id, at, blocked: !dressing?.ready }] : [];
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
