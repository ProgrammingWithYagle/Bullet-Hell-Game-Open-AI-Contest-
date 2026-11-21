import { infiltratorIds } from '../../shared/assassin-slip-route.ts';
import { duelistIds } from '../../shared/assassin-called-opening.ts';
import type { PlayerView } from '../../shared/view.ts';
import type { ControlOptions } from '../input-bindings.ts';
import { locale, t } from '../i18n.ts';
import { actionLabel } from './control-settings.ts';
import { bindingMarkup } from './engineer-controls.ts';
import { escape as e } from './html.ts';

export function assassinKitMarkup(player: PlayerView, controls: ControlOptions, open: boolean) {
  if (player.classId !== 'assassin' || player.training) return '';
  const owns = player.skills.includes(duelistIds.entry);
  const knowsRoute = player.skills.includes(infiltratorIds.entry);
  const rows = [
    { action: 'q', key: 'ability.assassin-q.name' },
    { action: 'e', key: 'ability.assassin-e.name' },
    { action: 'ultimate', key: 'ability.assassin-ultimate.name' },
    ...(owns ? [{ action: 'technique1', key: 'skill.' + duelistIds.entry + '.name' }] as const : []),
    ...(knowsRoute ? [{ action: 'technique2', key: 'skill.' + infiltratorIds.entry + '.name' }] as const : []),
  ] as const;
  const notes = owns ? ['ui.assassin.duelHelp'] : [];
  if (player.skills.includes(duelistIds.passing)) notes.push('ui.assassin.duelPassingHelp');
  if (player.skills.includes(duelistIds.counter)) notes.push('ui.assassin.duelCounterHelp');
  if (knowsRoute) notes.push('ui.assassin.slipHelp');
  if (player.skills.includes(infiltratorIds.relay)) notes.push('ui.assassin.slipRelayHelp');
  if (player.skills.includes(infiltratorIds.threshold)) notes.push('ui.assassin.slipThresholdHelp');
  const help = notes.map(key => '<p lang="en" dir="ltr">' + e(t(key)) + '</p>').join('');
  return '<details class="engineer-kit" data-class-kit data-assassin-kit' + (open ? ' open' : '') +
    '><summary><span lang="' + e(locale) + '">' + e(t('ui.controls')) + '</span><small>' + e(t('ui.equipped')) +
    '</small></summary>' + help + '<ul>' + rows.map(({ action, key }) =>
      '<li data-kit-action="' + action + '"><span class="engineer-kit-slot">' + e(actionLabel(action)) +
      '</span><strong lang="' + e(action === 'technique1' || action === 'technique2' ? 'en' : locale) + '" dir="auto">' + e(t(key)) + '</strong>' +
      bindingMarkup(action, controls) + '</li>',
    ).join('') + '</ul></details>';
}
