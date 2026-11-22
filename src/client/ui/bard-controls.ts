import { lamentIds } from '../../shared/bard-lament.ts';
import { conductorIds } from '../../shared/bard-kit.ts';
import type { PlayerView } from '../../shared/view.ts';
import type { ControlOptions } from '../input-bindings.ts';
import { locale, t } from '../i18n.ts';
import { actionLabel } from './control-settings.ts';
import { bindingMarkup } from './engineer-controls.ts';
import { escape as e } from './html.ts';

export function bardKitMarkup(player: PlayerView, controls: ControlOptions, open: boolean) {
  if (player.classId !== 'bard' || player.training) return '';
  const owned = player.skills.includes(conductorIds.entry);
  const rows = [
    { action:'q', key:'ability.bard-q.name' },
    { action:'e', key:'ability.bard-e.name' },
    { action:'ultimate', key:'ability.bard-ultimate.name' },
    ...(owned ? [{ action:'technique1', key:'skill.' + conductorIds.entry + '.name' }] as const : []),
    ...(player.skills.includes(lamentIds.entry) ? [{ action:'technique2', key:'skill.' + lamentIds.entry + '.name' }] as const : []),
  ] as const;
  const notes = owned ? ['ui.bard.conductorHelp'] : [];
  if (player.skills.includes(conductorIds.side)) notes.push('ui.bard.sideHelp');
  if (player.skills.includes(conductorIds.reprise)) notes.push('ui.bard.repriseHelp');
  if (player.skills.includes(lamentIds.entry)) notes.push('ui.bard.lamentHelp');
  if (player.skills.includes(lamentIds.cross)) notes.push('ui.bard.lamentCrossHelp');
  if (player.skills.includes(lamentIds.closing)) notes.push('ui.bard.lamentClosingHelp');
  return '<details class="engineer-kit" data-class-kit data-bard-kit' + (open ? ' open' : '') +
    '><summary><span lang="' + e(locale) + '">' + e(t('ui.controls')) + '</span><small>' + e(t('ui.equipped')) + '</small></summary>' +
    notes.map(key => '<p lang="en" dir="ltr">' + e(t(key)) + '</p>').join('') + '<ul>' + rows.map(({ action, key }) =>
      '<li data-kit-action="' + action + '"><span class="engineer-kit-slot">' + e(actionLabel(action)) +
      '</span><strong lang="' + e(action.startsWith('technique') ? 'en' : locale) + '" dir="auto">' + e(t(key)) + '</strong>' +
      bindingMarkup(action, controls) + '</li>',
    ).join('') + '</ul></details>';
}
