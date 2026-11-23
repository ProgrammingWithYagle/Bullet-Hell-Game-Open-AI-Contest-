import { counterstrokeIds } from '../../shared/swordsman-counterstroke.ts';
import { measuredIds } from '../../shared/swordsman-measured.ts';
import type { PlayerView } from '../../shared/view.ts';
import type { ControlOptions } from '../input-bindings.ts';
import { locale, t } from '../i18n.ts';
import { actionLabel } from './control-settings.ts';
import { bindingMarkup } from './engineer-controls.ts';
import { escape as e } from './html.ts';

export function swordsmanKitMarkup(player: PlayerView, controls: ControlOptions, open: boolean) {
  if (player.classId !== 'swordsman' || player.training) return '';
  const owned = player.skills.includes(measuredIds.entry);
  const counter=player.skills.includes(counterstrokeIds.entry);
  const rows = [
    { action:'q', key:'ability.swordsman-q.name' },
    { action:'e', key:'ability.swordsman-e.name' },
    { action:'ultimate', key:'ability.swordsman-ultimate.name' },
    ...(owned ? [{ action:'technique1', key:'skill.'+measuredIds.entry+'.name' }] as const : []),
    ...(counter?[{action:'technique2',key:'skill.'+counterstrokeIds.entry+'.name'}] as const:[]),
  ] as const;
  const notes = owned ? ['ui.sword.heldHelp'] : [];
  if (player.skills.includes(measuredIds.turn)) notes.push('ui.sword.turnHelp');
  if (player.skills.includes(measuredIds.follow)) notes.push('ui.sword.followHelp');
  if(counter) notes.push('ui.sword.replyHelp');
  if(player.skills.includes(counterstrokeIds.needle)) notes.push('ui.sword.replyNeedleHelp');
  if(player.skills.includes(counterstrokeIds.back)) notes.push('ui.sword.replyBackHelp');
  return '<details class="engineer-kit" data-class-kit data-swordsman-kit' + (open ? ' open' : '') +
    '><summary><span lang="' + e(locale) + '">' + e(t('ui.controls')) + '</span><small>' + e(t('ui.equipped')) + '</small></summary>' +
    notes.map(key => '<p lang="en" dir="ltr">' + e(t(key)) + '</p>').join('') + '<ul>' + rows.map(({action,key}) =>
      '<li data-kit-action="' + action + '"><span class="engineer-kit-slot">' + e(actionLabel(action)) +
      '</span><strong lang="' + e(action.startsWith('technique') ? 'en' : locale) + '" dir="auto">' + e(t(key)) + '</strong>' +
      bindingMarkup(action,controls) + '</li>',
    ).join('') + '</ul></details>';
}
