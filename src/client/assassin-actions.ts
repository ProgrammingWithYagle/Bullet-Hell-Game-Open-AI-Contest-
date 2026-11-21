import { duelistIds } from '../shared/assassin-called-opening.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

export function assassinActions(player: PlayerView) {
  const state = player.kit.calledOpening;
  const owns = player.classId === 'assassin' && !player.training && player.skills.includes(duelistIds.entry);
  const id = state?.phase === 'reposition' ? duelistIds.counter : state?.canPass ? duelistIds.passing : duelistIds.entry;
  const extras = owns ? [{ key: 'technique1' as const, id, at: state?.ready ? 0 : state?.until ?? player.eAt, blocked: !state?.ready }] : [];
  return { command: false, qNameKey: null, qAt: player.qAt, qBlocked: false, extras };
}

export function assassinDuelLabel(player: PlayerView, now: number) {
  const state = player.kit.calledOpening;
  if (state?.phase === 'reposition') return t('ui.assassin.duelTurn');
  if (state?.phase === 'measuring') return t('ui.assassin.duelMeasure');
  if (state?.phase === 'open') {
    if (!state.ready) return t('ui.assassin.duelAlign');
    return t(state.canPass ? 'ui.assassin.duelPass' : 'ui.assassin.duelStrike');
  }
  return t(!state?.ready && (state?.until ?? player.eAt) <= now ? 'ui.assassin.duelFind' : 'ui.assassin.duelMark');
}
