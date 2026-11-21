import { mageSpatialIds } from '../shared/mage-waymark-return.ts';
import { mageBindingIds } from '../shared/mage-pivot-sigil.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

export function mageActions(player: PlayerView) {
  const pivot = player.kit.pivotSigil;
  const active = player.classId === 'mage' && !player.training;
  const id = pivot?.canFix || pivot?.phase === 'fixed' ? mageBindingIds.fixed :
    pivot?.reverseArmed ? mageBindingIds.reverse : mageBindingIds.entry;
  const at = pivot?.ready ? 0 : pivot?.until ?? player.qAt;
  const waymark = player.kit.waymark;
  const waymarkId = waymark?.phase === 'resting' || waymark?.canHold ? mageSpatialIds.hold :
    waymark?.sideWindow ? mageSpatialIds.side : mageSpatialIds.entry;
  const extras = [
    ...(active && player.skills.includes(mageBindingIds.entry) ? [{ key:'technique1' as const,id,at,blocked:!pivot?.ready }] : []),
    ...(active && player.skills.includes(mageSpatialIds.entry) ? [{ key:'technique2' as const,id:waymarkId,
      at:waymark?.ready ? 0 : waymark?.until ?? player.eAt,blocked:!waymark?.ready }] : []),
  ];
  return { command: false, qNameKey: null, qAt: player.qAt, qBlocked: false, extras };
}

export function mageBindingLabel(player: PlayerView, now: number) {
  const pivot = player.kit.pivotSigil;
  if (pivot?.phase === 'fixed') return t('ui.mage.pivotFixed');
  if (pivot?.phase === 'sweeping') {
    if (pivot.canFix) return t('ui.mage.pivotFix');
    if (pivot.canReverse) return t('ui.mage.pivotReverse');
    if (pivot.reverseArmed) return t('ui.mage.pivotOpposite');
    return t('ui.mage.pivotGuide');
  }
  if (pivot?.phase === 'marked') return t(pivot.ready ? 'ui.mage.pivotStroke' : 'ui.mage.pivotLineup');
  return t(!pivot?.ready && (pivot?.until ?? player.qAt) <= now ? 'ui.mage.pivotFindFloor' : 'ui.mage.pivotMark');
}

export function mageWaymarkLabel(player: PlayerView, now: number) {
  const waymark = player.kit.waymark;
  if (waymark?.phase === 'resting') return t('ui.mage.waymarkResume');
  if (waymark?.phase === 'returning') {
    if (waymark.canHold) return t('ui.mage.waymarkHold');
    if (waymark.canSide) return t('ui.mage.waymarkSide');
    if (waymark.sideWindow) return t('ui.mage.waymarkAimSide');
    return t('ui.mage.waymarkLive');
  }
  if (waymark?.phase === 'marked') return t(waymark.ready ? 'ui.mage.waymarkCommit' : 'ui.mage.waymarkWalk');
  return t(!waymark?.ready && (waymark?.until ?? player.eAt) <= now ? 'ui.mage.waymarkFind' : 'ui.mage.waymarkMark');
}
