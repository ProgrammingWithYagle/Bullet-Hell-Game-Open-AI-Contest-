import { compoundFitting, preparedIds } from '../../shared/alchemist-prepared.ts';
import { reactiveFitting, reactiveIds } from '../../shared/alchemist-reactive.ts';
import type { PlayerView } from '../../shared/view.ts';
import type { ControlOptions } from '../input-bindings.ts';
import { locale, t } from '../i18n.ts';
import { actionLabel } from './control-settings.ts';
import { bindingMarkup } from './engineer-controls.ts';
import { escape as e } from './html.ts';

export function alchemyReactiveMarkup(player: PlayerView, controls: ControlOptions, open: boolean) {
  if (player.classId !== 'alchemist' || player.training) return '';
  const known = player.skills.includes(reactiveIds.entry);
  const fitting = reactiveFitting(player.skills);
  const id = fitting === 'standard' ? reactiveIds.entry : reactiveIds[fitting];
  const reserve = player.skills.includes(preparedIds.entry), latch = compoundFitting(player.skills);
  const reserveId = latch === 'standard' ? preparedIds.entry : preparedIds[latch];
  const actions = [
    { action: 'q', key: 'ability.alchemist-q.name' },
    { action: 'e', key: 'ability.alchemist-e.name' },
    { action: 'ultimate', key: 'ability.alchemist-ultimate.name' },
    ...(known ? [{ action: 'technique1', key: `skill.${id}.name` }] as const : []),
    ...(reserve ? [{ action: 'technique2', key: `skill.${reserveId}.name` }] as const : []),
  ] as const;
  const notes = known ? ['ui.alchemyReaction.help'] : [];
  if (known && fitting !== 'standard') notes.push(fitting === 'wick' ? 'ui.alchemyReaction.wickHelp' : 'ui.alchemyReaction.ventHelp');
  if (reserve) notes.push('ui.alchemyReserve.help', latch === 'standard' ? 'ui.alchemyReserve.manualHelp' :
    latch === 'brew' ? 'ui.alchemyReserve.brewHelp' : 'ui.alchemyReserve.tossHelp');
  return '<details class="engineer-kit" data-class-kit data-alchemy-reactive-kit' + (open ? ' open' : '') +
    '><summary><span lang="' + e(locale) + '">' + e(t('ui.controls')) + '</span><small>' + e(t('ui.equipped')) + '</small></summary>' +
    notes.map(key => '<p lang="en" dir="ltr">' + e(t(key)) + '</p>').join('') + '<ul>' + actions.map(({ action, key }) =>
      '<li data-kit-action="' + action + '"><span class="engineer-kit-slot">' + e(actionLabel(action)) +
      '</span><strong lang="' + e(action === 'technique1' || action === 'technique2' ? 'en' : locale) + '" dir="auto">' + e(t(key)) + '</strong>' +
      bindingMarkup(action, controls) + '</li>',
    ).join('') + '</ul></details>';
}
