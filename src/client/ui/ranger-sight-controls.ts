import { rangerSightFitting, rangerSightIds } from '../../shared/ranger-sight.ts';
import { rangerTrackerFitting, rangerTrackerIds } from '../../shared/ranger-tracker.ts';
import { rangerFieldFitting, rangerFieldIds } from '../../shared/ranger-field.ts';
import type { PlayerView } from '../../shared/view.ts';
import type { ControlOptions } from '../input-bindings.ts';
import { locale, t } from '../i18n.ts';
import { actionLabel } from './control-settings.ts';
import { bindingMarkup } from './engineer-controls.ts';
import { escape as e } from './html.ts';

export function rangerSightMarkup(player: PlayerView, controls: ControlOptions, open: boolean) {
  if (player.classId !== 'ranger' || player.training) return '';
  const owned = player.skills.includes(rangerSightIds.entry);
  const fitting = rangerSightFitting(player.skills);
  const tracks = player.skills.includes(rangerTrackerIds.entry);
  const trackerFitting = rangerTrackerFitting(player.skills);
  const field = player.skills.includes(rangerFieldIds.entry);
  const fieldFitting = rangerFieldFitting(player.skills);
  const rows = [
    { action:'q', key:'ability.ranger-q.name' },
    { action:'e', key:'ability.ranger-e.name' },
    { action:'ultimate', key:'ability.ranger-ultimate.name' },
    ...(owned ? [{ action:'technique1', key:'skill.' + (fitting ? rangerSightIds[fitting] : rangerSightIds.entry) + '.name' }] as const : []),
    ...(tracks ? [{ action:'technique2', key:'skill.' + (trackerFitting ? rangerTrackerIds[trackerFitting] : rangerTrackerIds.entry) + '.name' }] as const : []),
    ...(field ? [{ action:'technique3', key:'skill.' + (fieldFitting ? rangerFieldIds[fieldFitting] : rangerFieldIds.entry) + '.name' }] as const : []),
  ] as const;
  const notes = owned ? ['ui.rangerSight.help'] : [];
  if (owned && fitting) notes.push(fitting === 'roll' ? 'ui.rangerSight.rollHelp' : 'ui.rangerSight.bearingHelp');
  if (tracks) notes.push(trackerFitting === 'backtrack' ? 'ui.rangerTracker.backtrackHelp' : 'ui.rangerTracker.help');
  if (tracks && trackerFitting === 'stakes') notes.push('ui.rangerTracker.stakesHelp');
  if (field) notes.push('ui.rangerField.help');
  if (field && fieldFitting) notes.push(fieldFitting === 'pivot' ? 'ui.rangerField.pivotHelp' : 'ui.rangerField.shortHelp');
  return '<details class="engineer-kit" data-class-kit data-ranger-kit' + (open ? ' open' : '') +
    '><summary><span lang="' + e(locale) + '">' + e(t('ui.controls')) + '</span><small>' + e(t('ui.equipped')) + '</small></summary>' +
    notes.map(key => '<p lang="en" dir="ltr">' + e(t(key)) + '</p>').join('') + '<ul>' + rows.map(({ action, key }) =>
      '<li data-kit-action="' + action + '"><span class="engineer-kit-slot">' + e(actionLabel(action)) +
      '</span><strong lang="' + e(action.startsWith('technique') ? 'en' : locale) + '" dir="auto">' + e(t(key)) + '</strong>' +
      bindingMarkup(action,controls) + '</li>',
    ).join('') + '</ul></details>';
}
