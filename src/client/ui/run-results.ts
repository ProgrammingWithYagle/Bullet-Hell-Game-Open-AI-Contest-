import type { Phase } from '../../shared/protocol.ts';
import { HZ } from '../../shared/protocol.ts';
import type { View, PlayerView } from '../../shared/view.ts';
import { expeditionText } from '../expedition-text.ts';
import { escape as e } from './html.ts';

export function phaseCountdownMarkup(phase: Phase, language: string) {
  return ['mutationVote', 'contractVote', 'shop', 'loading', 'secretOffer'].includes(phase)
    ? `<span class="phase-countdown"><small>${e(expeditionText(language, 'timeLeft'))}</small><time id="phase-time"></time></span>`
    : '';
}

/** Present authoritative progress without changing awards, saving or simulation. */
export function runResultModel(view: View, player: PlayerView) {
  const bank = view.phase === 'victory' && view.secretStatus === 'declined' ? view.campaignBank : null;
  return {
    teamClears: bank?.encounters ?? view.encounter,
    personalClears: player.progress.clears,
    rescues: player.progress.rescues,
    experience: view.run.testingModified ? 0 : player.progress.clears * 100,
    combatSeconds: (bank?.combatTick ?? view.combatTick) / HZ,
    showPersonalClears: view.players.length > 1 || view.encounter !== player.progress.clears,
    reason: view.phase !== 'defeat' || view.endedByHost ? null
      : view.combatTick >= view.boss.deadline ? 'resultTimeout'
      : view.players.length > 1 ? 'resultTeamDown' : 'resultSoloDown',
  } as const;
}

type Labels = {
  language: string;
  mode: string;
  difficulty: string;
  className: string;
  number: (value: number) => string;
  clock: (seconds: number) => string;
};

export function runResultsMarkup(view: View, player: PlayerView, labels: Labels) {
  const model = runResultModel(view, player);
  const text = (key: Parameters<typeof expeditionText>[1]) => e(expeditionText(labels.language, key));
  const stats = [
    [text('resultBosses'), e(labels.number(model.teamClears))],
    ...(model.showPersonalClears ? [[text('resultPersonal'), e(labels.number(model.personalClears))]] : []),
    [text('resultTime'), `<bdi>${e(labels.clock(model.combatSeconds))}</bdi>`],
    [text('resultRescues'), e(labels.number(model.rescues))],
    [text('resultExperience'), `<bdi>${e(labels.number(model.experience))} XP</bdi>`],
  ];
  return `<div class="run-results"><p class="result-context">${e(labels.mode)} · ${e(labels.difficulty)} · ${e(labels.className)}</p>${model.reason ? `<p class="result-reason">${text(model.reason)}</p>` : ''}<dl class="run-stat-list">${stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>${view.run.testingModified ? `<p class="result-records">${text('resultModified')}</p>` : `<p class="result-records">${text('resultRecords')}</p>`}</div>`;
}
