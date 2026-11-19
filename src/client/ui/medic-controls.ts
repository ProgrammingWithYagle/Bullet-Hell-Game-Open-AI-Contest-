import type { PlayerView } from '../../shared/view.ts';
import { fieldSurgeryIds } from '../../shared/medic-field-surgery.ts';
import { locale, t } from '../i18n.ts';
import type { ControlOptions } from '../input-bindings.ts';
import { actionLabel } from './control-settings.ts';
import { bindingMarkup } from './engineer-controls.ts';
import { escape as e } from './html.ts';

export function medicKitMarkup(player: PlayerView, controls: ControlOptions, open: boolean) {
  if (player.classId !== 'medic' || player.training) return '';
  const rows = [
    { action: 'q', key: 'ability.medic-q.name' },
    { action: 'e', key: 'ability.medic-e.name' },
    { action: 'ultimate', key: 'ability.medic-ultimate.name' },
    ...(player.skills.includes(fieldSurgeryIds.entry) ?
      [{ action: 'technique1', key: 'skill.' + fieldSurgeryIds.entry + '.name' }] as const : []),
  ] as const;
  return '<details class="engineer-kit" data-class-kit data-medic-kit' + (open ? ' open' : '') +
    '><summary><span lang="' + e(locale) + '">' + e(t('ui.controls')) + '</span><small>' + e(t('ui.equipped')) +
    '</small></summary>' + (rows.length === 4 ? '<p lang="en" dir="ltr">' + e(t('ui.medic.dressingHelp')) + '</p>' : '') +
    '<ul>' + rows.map(({ action, key }) => {
      const language = action === 'technique1' ? 'en' : locale;
      return '<li data-kit-action="' + action + '"><span class="engineer-kit-slot">' + e(actionLabel(action)) +
        '</span><strong lang="' + e(language) + '" dir="auto">' + e(t(key)) + '</strong>' +
        bindingMarkup(action, controls) + '</li>';
    }).join('') + '</ul></details>';
}
