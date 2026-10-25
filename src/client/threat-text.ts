import labels from './threat-labels.json';
import { locale, t, number } from './i18n.ts';
import { threatCode, bossThreat } from '../shared/boss-threat.ts';
export function classifiedThreatText(level: number, subtier: number) {
  const words = labels[locale as keyof typeof labels] ?? labels.en;
  return level > 10 ? words[5] : words[subtier + 2] + ' ' + t('threat.' + level);
}
export const classifiedThreatCode = (level: number, subtier: number, variant = 'normal') =>
  threatCode(level, subtier, variant, number);
export function bossClassification(id: string, variant = 'normal') {
  const p = bossThreat(id);
  return classifiedThreatCode(p.level, p.subtier, variant);
}
