import { markHunterIds } from '../shared/assassin-crossing-writ.ts';
import { infiltratorIds } from '../shared/assassin-slip-route.ts';
import { duelistIds } from '../shared/assassin-called-opening.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

type AssassinAction = { key: 'technique1' | 'technique2' | 'technique3'; id: string; at: number; blocked: boolean };

export function assassinActions(player: PlayerView) {
  const extras: AssassinAction[] = [];
  if (player.classId === 'assassin' && !player.training) {
    const duel = player.kit.calledOpening;
    if (player.skills.includes(duelistIds.entry)) {
      const id = duel?.phase === 'reposition' ? duelistIds.counter : duel?.canPass ? duelistIds.passing : duelistIds.entry;
      extras.push({ key: 'technique1', id, at: duel?.ready ? 0 : duel?.until ?? player.eAt, blocked: !duel?.ready });
    }
    const route = player.kit.slipRoute;
    if (player.skills.includes(infiltratorIds.entry)) {
      const relay = route?.phase === 'relay' || route?.phase === 'relaying';
      const threshold = route?.phase === 'watch' || route?.phase === 'exit' && player.skills.includes(infiltratorIds.threshold);
      const id = relay ? infiltratorIds.relay : threshold ? infiltratorIds.threshold : infiltratorIds.entry;
      extras.push({ key: 'technique2', id, at: route?.ready ? 0 : route?.until ?? player.qAt, blocked: !route?.ready });
    }
  }
  if (player.classId === 'assassin' && !player.training && player.skills.includes(markHunterIds.entry)) {
    const writ = player.kit.crossingWrit;
    const id = writ?.phase === 'pinned' || writ?.phase === 'confirmed' && player.skills.includes(markHunterIds.canted)
      ? markHunterIds.canted : writ?.phase === 'transfer' || writ?.phase === 'laid' && writ.ready ? markHunterIds.transfer : markHunterIds.entry;
    extras.push({ key: 'technique3', id, at: writ?.ready ? 0 : writ?.until ?? player.ultimateAt, blocked: !writ?.ready });
  }
  return { command: false, qNameKey: null, qAt: player.qAt, qBlocked: false, extras };
}

export function assassinWritLabel(player: PlayerView, now: number) {
  const writ = player.kit.crossingWrit;
  if (writ?.phase === 'marked') return t(writ.proof === 1 ? 'ui.assassin.writSecond' : 'ui.assassin.writFirst');
  if (writ?.phase === 'transfer') return t('ui.assassin.writTransferHit');
  if (writ?.phase === 'laid') return t(writ.ready ? 'ui.assassin.writOffer' : 'ui.assassin.writLead');
  if (writ?.phase === 'confirmed' || writ?.phase === 'pinned') {
    if (!writ.ready) return t('ui.assassin.writAim');
    return t(writ.phase === 'confirmed' && player.skills.includes(markHunterIds.canted) ? 'ui.assassin.writPin' : 'ui.assassin.writSet');
  }
  return t(!writ?.ready && (writ?.until ?? player.ultimateAt) <= now ? 'ui.assassin.writFind' : 'ui.assassin.writStart');
}

export function assassinSlipLabel(player: PlayerView, now: number) {
  const route = player.kit.slipRoute;
  if (route?.phase === 'watch') return t(route.ready ? 'ui.assassin.slipCall' : 'ui.assassin.slipWatch');
  if (route?.phase === 'relay') return t(route.ready ? 'ui.assassin.slipRelay' : 'ui.assassin.slipSettle');
  if (route?.phase === 'relaying') return t('ui.assassin.slipRelaying');
  if (route?.phase === 'walk') return t('ui.assassin.slipWalk');
  if (route?.phase === 'exit') {
    if (!route.ready) return t('ui.assassin.slipStop');
    return t(player.skills.includes(infiltratorIds.threshold) ? 'ui.assassin.slipArm' : 'ui.assassin.slipExchange');
  }
  return t(!route?.ready && (route?.until ?? player.qAt) <= now ? 'ui.assassin.slipFind' : 'ui.assassin.slipStart');
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
