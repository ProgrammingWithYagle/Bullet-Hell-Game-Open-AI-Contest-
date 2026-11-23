import { cohortIds } from '../shared/summoner-cohort.ts';
import type { PlayerView } from '../shared/view.ts';
import { t } from './i18n.ts';

export function summonerActions(player: PlayerView, now: number) {
  const state = player.kit.cohort;
  const owned = player.classId === 'summoner' && !player.training && player.skills.includes(cohortIds.entry);
  const relaying = state?.stage === 'relay' && state.until > now;
  const marching = state?.stage === 'march' && state.until > now;
  const extras = owned ? [{
    key: 'technique1' as const,
    id: state?.fitting ? cohortIds[state.fitting] : cohortIds.entry,
    at: relaying || marching ? 0 : state?.recoveryAt ?? 0,
    blocked: !state?.canSend,
  }] : [];
  return { command: false, qNameKey: null, qAt: player.qAt, qBlocked: false, extras };
}

export function summonerCohortLabel(player: PlayerView, now: number) {
  const state = player.kit.cohort;
  const relay = state?.stage === 'relay' && state.until > now;
  if (state?.canSend) return t(relay ? 'ui.cohort.relay' : 'skill.' + (state.fitting ? cohortIds[state.fitting] : cohortIds.entry) + '.name');
  if (state?.stage === 'march' && state.until > now) return t('ui.cohort.march');
  if (!relay && (state?.recoveryAt ?? 0) > now) return t('ui.cohort.recover');
  if ((state?.members ?? 0) < (relay ? 1 : 2)) return t('ui.cohort.company');
  if (!state?.targeted) return t('ui.cohort.mark');
  if (!relay && !player.ammo) return t('ui.cohort.focus');
  return t('ui.cohort.blocked');
}
