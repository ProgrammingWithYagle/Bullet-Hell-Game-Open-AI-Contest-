import { mageBindingIds } from '../shared/mage-pivot-sigil.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

export function mageActions(player: PlayerView) {
  const pivot = player.kit.pivotSigil;
  const owned = player.classId === 'mage' && !player.training && player.skills.includes(mageBindingIds.entry);
  const id = pivot?.canFix || pivot?.phase === 'fixed' ? mageBindingIds.fixed :
    pivot?.reverseArmed ? mageBindingIds.reverse : mageBindingIds.entry;
  const at = pivot?.ready ? 0 : pivot?.until ?? player.qAt;
  const extras = owned ? [{ key: 'technique1' as const, id, at, blocked: !pivot?.ready }] : [];
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
