import { cohortIds } from '../../shared/summoner-cohort.ts';
import type { PlayerView } from '../../shared/view.ts';
import type { ControlOptions } from '../input-bindings.ts';
import { locale, t } from '../i18n.ts';
import { actionLabel } from './control-settings.ts';
import { bindingMarkup } from './engineer-controls.ts';
import { escape as e } from './html.ts';

export function summonerCohortMarkup(player: PlayerView, controls: ControlOptions, open: boolean) {
  if (player.classId !== 'summoner' || player.training) return '';
  const owned = player.skills.includes(cohortIds.entry);
  const rows = [
    { action: 'q', key: 'ability.summoner-q.name' },
    { action: 'e', key: 'ability.summoner-e.name' },
    { action: 'ultimate', key: 'ability.summoner-ultimate.name' },
    ...(owned ? [{ action: 'technique1', key: 'skill.' + cohortIds.entry + '.name' }] as const : []),
  ] as const;
  const notes = owned ? ['ui.cohort.help'] : [];
  if (player.skills.includes(cohortIds.cross)) notes.push('ui.cohort.crossHelp');
  if (player.skills.includes(cohortIds.relay)) notes.push('ui.cohort.relayHelp');
  return '<details class="engineer-kit" data-class-kit data-summoner-kit' + (open ? ' open' : '') +
    '><summary><span lang="' + e(locale) + '">' + e(t('ui.controls')) + '</span><small>' + e(t('ui.equipped')) + '</small></summary>' +
    notes.map(key => '<p lang="en" dir="ltr">' + e(t(key)) + '</p>').join('') + '<ul>' + rows.map(({ action, key }) =>
      '<li data-kit-action="' + action + '"><span class="engineer-kit-slot">' + e(actionLabel(action)) +
      '</span><strong lang="' + e(action === 'technique1' ? 'en' : locale) + '" dir="auto">' + e(t(key)) + '</strong>' +
      bindingMarkup(action, controls) + '</li>',
    ).join('') + '</ul></details>';
}
