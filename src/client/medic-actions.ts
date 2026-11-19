import type { PlayerView } from '../shared/view.ts';
import { fieldSurgeryIds } from '../shared/medic-field-surgery.ts';
import { t } from './i18n.ts';

export function medicActions(player: PlayerView, now: number) {
  const owned = player.classId === 'medic' && !player.training && player.skills.includes(fieldSurgeryIds.entry);
  const dressing = player.kit.fieldDressing;
  const phase = dressing?.phase ?? 'idle';
  const id = phase === 'held' || dressing?.canHold ? fieldSurgeryIds.aside :
    dressing?.stepRemaining ? fieldSurgeryIds.step : fieldSurgeryIds.entry;
  const at = phase === 'idle' ? player.qAt : phase === 'preparing' ? dressing?.nextAt ?? now : 0;
  const extras = owned ? [{ key: 'technique1' as const, id, at, blocked: !dressing?.ready }] : [];
  return { command: false, qNameKey: null, qAt: player.qAt, qBlocked: false, extras };
}

export function medicDressingLabel(player: PlayerView, now: number) {
  const status = player.kit.fieldDressing;
  if (status?.phase === 'held') return t('ui.medic.dressingResume');
  if (status?.phase === 'preparing') return t('ui.medic.dressingPreparing');
  if (status?.phase === 'applying') return t(status.canHold ? 'ui.medic.dressingSetAside' : 'ui.medic.dressingCancel');
  return t(player.qAt <= now && !status?.ready ? 'ui.medic.dressingPatient' : 'ui.medic.dressingPrepare');
}
