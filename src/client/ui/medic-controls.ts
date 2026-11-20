import { rapidResponseIds } from '../../shared/medic-rapid-response.ts';
import type { PlayerView } from '../../shared/view.ts';
import { fieldSurgeryIds } from '../../shared/medic-field-surgery.ts';
import { locale, t } from '../i18n.ts';
import type { ControlOptions } from '../input-bindings.ts';
import { actionLabel } from './control-settings.ts';
import { bindingMarkup } from './engineer-controls.ts';
import { escape as e } from './html.ts';

export function medicKitMarkup(player: PlayerView, controls: ControlOptions, open: boolean) {
  if (player.classId !== 'medic' || player.training) return '';
  const hasDressing = player.skills.includes(fieldSurgeryIds.entry);
  const hasResponse = player.skills.includes(rapidResponseIds.entry);
  const rows = [
    { action: 'q', key: 'ability.medic-q.name' },
    { action: 'e', key: 'ability.medic-e.name' },
    { action: 'ultimate', key: 'ability.medic-ultimate.name' },
    ...(hasDressing ? [{ action: 'technique1', key: 'skill.' + fieldSurgeryIds.entry + '.name' }] as const : []),
    ...(hasResponse ? [{ action: 'technique2', key: 'skill.' + rapidResponseIds.entry + '.name' },
      { action: 'interact', key: 'ui.revive' }] as const : []),
  ] as const;
  const lateHelp = player.skills.includes(fieldSurgeryIds.tie) ? 'ui.medic.dressingTieHelp' :
    player.skills.includes(fieldSurgeryIds.wrap) ? 'ui.medic.dressingWrapHelp' : undefined;
  const responseFitting = player.skills.includes(rapidResponseIds.switchback) ? 'ui.medic.responseTurnHelp' :
    player.skills.includes(rapidResponseIds.handoff) ? 'ui.medic.responseHandoffHelp' : undefined;
  return '<details class="engineer-kit" data-class-kit data-medic-kit' + (open ? ' open' : '') +
    '><summary><span lang="' + e(locale) + '">' + e(t('ui.controls')) + '</span><small>' + e(t('ui.equipped')) +
    '</small></summary>' + (hasDressing ? '<p lang="en" dir="ltr">' + e(t('ui.medic.dressingHelp')) + '</p>' : '') +
    (lateHelp ? '<p lang="en" dir="ltr">' + e(t(lateHelp)) + '</p>' : '') +
    (hasResponse ? '<p lang="en" dir="ltr">' + e(t('ui.medic.responseHelp')) + '</p>' : '') +
    (responseFitting ? '<p lang="en" dir="ltr">' + e(t(responseFitting)) + '</p>' : '') +
    '<ul>' + rows.map(({ action, key }) => {
      const language = action === 'technique1' || action === 'technique2' ? 'en' : locale;
      return '<li data-kit-action="' + action + '"><span class="engineer-kit-slot">' + e(actionLabel(action)) +
        '</span><strong lang="' + e(language) + '" dir="auto">' + e(t(key)) + '</strong>' +
        bindingMarkup(action, controls) + '</li>';
    }).join('') + '</ul></details>';
}
