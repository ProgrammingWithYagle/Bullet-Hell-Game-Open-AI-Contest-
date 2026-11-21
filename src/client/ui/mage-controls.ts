import { mageSpatialIds } from '../../shared/mage-waymark-return.ts';
import { mageBindingIds } from '../../shared/mage-pivot-sigil.ts';
import type { PlayerView } from '../../shared/view.ts';
import { locale, t } from '../i18n.ts';
import type { ControlOptions } from '../input-bindings.ts';
import { actionLabel } from './control-settings.ts';
import { bindingMarkup } from './engineer-controls.ts';
import { escape as e } from './html.ts';

export function mageKitMarkup(player: PlayerView, controls: ControlOptions, open: boolean) {
  if (player.classId !== 'mage' || player.training) return '';
  const binding = player.skills.includes(mageBindingIds.entry);
  const spatial = player.skills.includes(mageSpatialIds.entry);
  const rows = [
    { action: 'q', key: 'ability.mage-q.name' },
    { action: 'e', key: 'ability.mage-e.name' },
    { action: 'ultimate', key: 'ability.mage-ultimate.name' },
    ...(binding ? [{ action: 'technique1', key: 'skill.' + mageBindingIds.entry + '.name' }] as const : []),
    ...(spatial ? [{ action: 'technique2', key: 'skill.' + mageSpatialIds.entry + '.name' }] as const : []),
  ] as const;
  const fitting = player.skills.includes(mageBindingIds.fixed) ? 'ui.mage.pivotFixedHelp' :
    player.skills.includes(mageBindingIds.reverse) ? 'ui.mage.pivotReverseHelp' : undefined;
  const notes = binding ? ['ui.mage.pivotHelp'] : [];
  if (fitting) notes.push(fitting);
  if (spatial) notes.push('ui.mage.waymarkHelp');
  if (player.skills.includes(mageSpatialIds.hold)) notes.push('ui.mage.waymarkHoldHelp');
  if (player.skills.includes(mageSpatialIds.side)) notes.push('ui.mage.waymarkSideHelp');
  const help = notes.map(key => '<p lang="en" dir="ltr">' + e(t(key)) + '</p>').join('');
  return '<details class="engineer-kit" data-class-kit data-mage-kit' + (open ? ' open' : '') +
    '><summary><span lang="' + e(locale) + '">' + e(t('ui.controls')) + '</span><small>' + e(t('ui.equipped')) +
    '</small></summary>' + help + '<ul>' + rows.map(({ action, key }) =>
      '<li data-kit-action="' + action + '"><span class="engineer-kit-slot">' + e(actionLabel(action)) +
      '</span><strong lang="' + e(action.startsWith('technique') ? 'en' : locale) + '" dir="auto">' + e(t(key)) + '</strong>' +
      bindingMarkup(action, controls) + '</li>',
    ).join('') + '</ul></details>';
}
