import {courierHelp} from './courier-text.ts';
import smallWakesHelp from './small-wakes-help.json';
import {smallWakesIds} from '../shared/small-wakes-director.ts';
import earlyWatchHelp from './early-watch-help.json';
import { earlyWatchBossIds } from '../shared/early-watch-director.ts';
import messages from './extension-ui.json';
import type { View } from '../shared/view.ts';
export type ExtensionMessage = keyof typeof messages.en;
export function extensionText(
  locale: string,
  key: ExtensionMessage,
  values: Record<string, string | number> = {},
) {
  let text = (messages[locale as keyof typeof messages] ?? messages.en)[key];
  for (const [k, v] of Object.entries(values)) text = text.replaceAll('{' + k + '}', String(v));
  return text;
}
export function signatureHelp(view: View, locale: string) {
  if(view.boss.id==='courier')return courierHelp(view.boss.variant,locale);
  if(smallWakesIds.some(id=>id===view.boss.id)){
    const words=(smallWakesHelp[locale as keyof typeof smallWakesHelp]??smallWakesHelp.en) as Record<string,string>;
    return words[`boss.${view.boss.id}.description`]+(view.boss.variant!=='normal'?' '+words[`boss.${view.boss.id}.brutalHelp`]:'');
  }
  if (earlyWatchBossIds.some(id=>id===view.boss.id)) {
    const words = (earlyWatchHelp[locale as keyof typeof earlyWatchHelp] ?? earlyWatchHelp.en) as Record<string,string>;
    return words[`boss.${view.boss.id}.description`] + (view.boss.variant !== 'normal' ? ' ' + words[`boss.${view.boss.id}.brutalHelp`] : '');
  }
  const now = view.combatTick,
    number = (n: number) => new Intl.NumberFormat(locale).format(n);
  const memory = view.bossCues.find(
    (c) => c.kind === 'endless-state' && c.style === 'memory' && now < c.until,
  );
  if (memory?.kind === 'endless-state')
    return extensionText(locale, 'history', {
      history: memory.history.map((i) => number(i + 1)).join(' → '),
      first: number(memory.index + 1),
    });
  const beat = view.bossCues
    .filter((c) => c.kind === 'endless-state' && c.style === 'beat' && now < c.until)
    .sort((a, b) => ('at' in a ? a.at : 0) - ('at' in b ? b.at : 0))[0];
  if (beat?.kind === 'endless-state')
    return extensionText(locale, 'beat', {
      beat: number(beat.index + 1),
      lane: number(beat.history[0] + 1),
    });
  const knock = view.bossCues.find(
    (c) => c.kind === 'endless-state' && c.style === 'knock' && now < c.until,
  );
  if (knock?.kind === 'endless-state')
    return extensionText(locale, 'knock', {
      count: number(Math.min(3, Math.max(1, knock.progress))),
    });
  return '';
}
