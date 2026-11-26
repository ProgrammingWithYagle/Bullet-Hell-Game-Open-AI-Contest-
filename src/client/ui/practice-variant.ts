import labels from './practice-variant-labels.json';
import { escape as e } from './html.ts';
export const practiceVariantLabels = labels;
export function practiceVariantMarkup(
  language: string,
  variant: string,
  standard: string,
  brutal: string,
  forced=false,
  crazed='',
  forcedHelp='',
) {
  const words = labels[language as keyof typeof labels] ?? labels.en;
  return `<label class="name-label" for="practice-variant">${e(words[0])}<select id="practice-variant" aria-describedby="practice-variant-help" ${forced?'disabled':''}><option value="normal" ${variant === 'normal' ? 'selected' : ''}>${e(standard)}</option><option value="brutal" ${variant === 'brutal' ? 'selected' : ''}>${e(brutal)}</option><option value="crazed" ${variant === 'crazed' ? 'selected' : ''}>${e(crazed)}</option></select></label><p class="muted" id="practice-variant-help">${e(forcedHelp || words[1])}</p>`;
}
