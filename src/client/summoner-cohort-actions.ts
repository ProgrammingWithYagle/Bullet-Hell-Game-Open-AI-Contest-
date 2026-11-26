import { formationIds } from '../shared/summoner-formation.ts';
import { bondIds } from '../shared/summoner-bond.ts';
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
  const bond = player.kit.bond;
  const ownsBond = player.classId === 'summoner' && !player.training && player.skills.includes(bondIds.entry);
  const bondAction = ownsBond ? [{
    key: 'technique2' as const,
    id: bond?.fitting ? bondIds[bond.fitting] : bondIds.entry,
    at: bond?.stage === 'linked' || bond?.stage === 'returning' ? 0 : bond?.recoveryAt ?? 0,
    blocked: bond?.stage !== 'ready',
  }] : [];
  const formation = player.kit.formation;
  const ownsFormation = player.classId === 'summoner' && !player.training && player.skills.includes(formationIds.entry);
  const formationAction = ownsFormation ? [{
    key: 'technique3' as const,
    id: formation?.fitting ? formationIds[formation.fitting] : formationIds.entry,
    at: formation?.stage === 'setting' || formation?.stage === 'set' ? 0 : formation?.recoveryAt ?? 0,
    blocked: !formation?.canCommand,
  }] : [];
  return { command: false, qNameKey: null, qAt: player.qAt, qBlocked: false, extras: [...extras, ...bondAction, ...formationAction] };
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
  if (player.kit.formation?.stage === 'setting' || player.kit.formation?.stage === 'set') return t('ui.bond.formation');
  return t(player.kit.bond?.stage === 'returning' ? 'ui.bond.returning' : 'ui.cohort.blocked');
}

export function summonerBondLabel(player: PlayerView) {
  const state = player.kit.bond;
  if (state?.stage === 'ready') return t('skill.' + (state.fitting ? bondIds[state.fitting] : bondIds.entry) + '.name');
  return t('ui.bond.' + (state?.stage ?? 'busy'));
}

export function summonerFormationLabel(player: PlayerView) {
  const state = player.kit.formation;
  if (state?.stage === 'set' && state.canCommand) return t('ui.formation.turnReady');
  if (state?.stage === 'ready') return t('skill.' + (state.fitting ? formationIds[state.fitting] : formationIds.entry) + '.name');
  return t('ui.formation.' + (state?.stage ?? 'busy'));
}
