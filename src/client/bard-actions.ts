import { misdirectionIds, misdirectionRules } from '../shared/bard-misdirection.ts';
import { lamentIds, lamentRules } from '../shared/bard-lament.ts';
import { conductorIds, conductorRules } from '../shared/bard-kit.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

export function bardActions(player: PlayerView) {
  const state = player.kit.conducting;
  const id = state?.adjustment ? conductorIds.side : state?.returning ? conductorIds.reprise : conductorIds.entry;
  const owned = player.classId === 'bard' && !player.training && player.skills.includes(conductorIds.entry);
  const lament = player.kit.lamenting;
  const lamentOwned = player.classId === 'bard' && !player.training && player.skills.includes(lamentIds.entry);
  const measure = lament?.turn ? lamentIds.cross : lament?.closing ? lamentIds.closing : lamentIds.entry;
  const ruse=player.kit.misdirecting;
  const ruseOwned=player.classId==='bard'&&!player.training&&player.skills.includes(misdirectionIds.entry);
  const deception=ruse?.alternative?misdirectionIds.wrong:ruse?.phase==='second'?misdirectionIds.second:misdirectionIds.entry;
  const extras = [
    ...(owned ? [{ key:'technique1' as const, id, at:state?.ready ? 0 : state?.until ?? player.qAt, blocked:!state?.ready }] : []),
    ...(lamentOwned ? [{ key:'technique2' as const, id:measure, at:lament?.ready ? 0 : lament?.until ?? player.eAt, blocked:!lament?.ready }] : []),
    ...(ruseOwned ? [{ key:'technique3' as const,id:deception,at:ruse?.ready?0:ruse?.until??0,blocked:!ruse?.ready }] : []),
  ];
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

export function bardLamentLabel(player: PlayerView, now: number) {
  const state = player.kit.lamenting;
  if (state?.phase === 'sustain') {
    if (state.turn) return t('ui.bard.lamentTurn');
    if (state.closing) return t('ui.bard.lamentClose');
    return t('ui.bard.lamentSustain');
  }
  if (player.eAt > now) return t('skill.' + lamentIds.entry + '.name');
  if ((player.kit.cadence ?? 0) < lamentRules.cadence) return t('ui.bard.earnCadence');
  return t(state?.ready ? 'ui.bard.lamentStart' : 'ui.bard.lamentAim');
}

export function bardMisdirectionLabel(player: PlayerView, now: number) {
  const ruse=player.kit.misdirecting;
  if(ruse?.phase==='walk')return t('ui.bard.entranceWalk');
  if(ruse?.phase==='waiting')return t('ui.bard.entranceWait');
  if(ruse?.phase==='distracting')return t(ruse.alternative?'ui.bard.entranceTurn':'ui.bard.entranceTaken');
  if(ruse?.phase==='second')return t(ruse.ready?'ui.bard.entranceRepeat':'ui.bard.entranceFresh');
  if((ruse?.until??0)>now)return t('skill.'+misdirectionIds.entry+'.name');
  if((player.kit.cadence??0)<misdirectionRules.cadence)return t('ui.bard.earnCadence');
  return t(ruse?.ready?'ui.bard.entranceSet':'ui.bard.entranceAim');
}
