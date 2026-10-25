import { data } from '../../shared/game.ts';
import { classifiedThreatText, classifiedThreatCode } from '../threat-text.ts';
import { rateBuild, buildGrade, equivalentBuilds } from '../../shared/build-rating.ts';
import type { View } from '../../shared/view.ts';
import { t, number } from '../i18n.ts';
import { effectText } from '../content-text.ts';
import { assets } from '../assets.ts';
import { icon } from './icons.ts';
import { escape as e } from './html.ts';
const seal = (n: number) => ['I', 'II', 'III'][n];
export function voteMarkup(view: View) {
  const party = view.players.filter((p) => p.connected && p.status !== 'waiting');
  const capacity = party.reduce((sum, p) => sum + rateBuild(p), 0);
  const header = `<div class="vote-team"><span>${e(t('count.players', { count: party.length }))}</span><strong>${e(t('ui.teamAverage', { grade: buildGrade(capacity / Math.max(1, party.length)) }))}</strong><small>${e(t('ui.ratingExplanation'))}</small></div>`;
  const footer = (i: number) =>
    `<span class="vote-footer"><span>${e(t('ui.vote'))} <b data-vote-count="${i}">0</b></span><span data-your-vote="${i}" hidden>${icon('check')}${e(t('ui.yourVote'))}</span></span>`;
  if (view.phase === 'mutationVote')
    return (
      header +
      `<div class="accord-cards">${view.mutationCards
        .map((id, i) => {
          const m = data.mutations.find((m) => m.id === id)!;
          const entries = Object.entries(m.modifiers).filter(
            ([, value]) => typeof value === 'number',
          );
          const key = entries[0]?.[0] ?? 'damage';
          const art =
            assets.items['mutation/' + id] ??
            assets.upgrades[
              /Health|armor|Shield|healing/.test(key)
                ? 'health'
                : /reload|dodge|moveSpeed|revive/.test(key)
                  ? 'reload'
                  : /magazine/.test(key)
                    ? 'magazine'
                    : /fireRate|bossSpeed|cooldown/.test(key)
                      ? 'fire-rate'
                      : 'damage'
            ];
          return `<button class="accord-card mutation-card" data-vote="${i}" aria-pressed="false"><span class="card-edition">${e(t('ui.mutationChoice'))}<b>${seal(i)}</b></span><span class="mutation-vignette"><img src="${art}" alt="" aria-hidden="true"></span><strong class="vote-title">${e(t('mutation.' + id + '.name'))}</strong><span class="mutation-effects">${entries.map(([key, value]) => `<span>${e(effectText({ [key]: value }, 'mutation'))}</span>`).join('')}</span><span class="mutation-duration">${icon('bell')}${e(t('ui.durationEncounters', { count: 3 }))}</span>${footer(i)}</button>`;
        })
        .join('')}</div>`
    );
  return (
    header +
    `<div class="accord-cards">${view.contractCards
      .map((c, i) => {
        const examples = equivalentBuilds(c.recommendedRating, party.length);
        const choices = examples.filter((x, i) => !i || x.count !== examples[i - 1].count);
        return `<button class="accord-card contract-card ${c.variant === 'brutal' ? 'brutal-contract' : ''}" data-vote="${i}" aria-pressed="false"><span class="card-edition">${e(t('ui.sealedContract'))}<b>${seal(i)}</b></span><span class="contract-seal">${icon('bell')}<b>${e(classifiedThreatCode(c.threat, c.subtier ?? 0, c.variant))}</b></span><strong class="vote-title">${e(classifiedThreatText(c.threat, c.subtier ?? 0))}</strong><span class="contract-variant">${e(t(c.variant === 'brutal' ? 'ui.variantBrutal' : 'ui.variantNormal'))}</span><span class="contract-bounty">${icon('coins')}${e(t('ui.bounty'))} ×${number(c.bounty, 2)}</span><span class="contract-recommendation"><small>${e(t('ui.recommended'))}</small>${choices.map((x) => `<strong>${e(t('ui.gradeRequirement', { players: t('count.players', { count: x.count }), grade: x.grade }))}</strong>`).join('')}</span><span class="strength-fit ${capacity >= c.recommendedRating ? 'within' : 'above'}">${e(t(capacity >= c.recommendedRating ? 'ui.withinStrength' : 'ui.aboveStrength'))}</span>${c.variant === 'brutal' ? `<span class="brutal-note">${e(t('ui.brutalInfo'))}</span>` : ''}<span class="concealed-label">${icon('lock')}${e(t('ui.bossConcealed'))}</span>${footer(i)}</button>`;
      })
      .join('')}</div>`
  );
}
