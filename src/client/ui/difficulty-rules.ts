import {encounterAssists} from '../../shared/encounter-policy.ts';
import {t,number} from '../i18n.ts';
import {escape as e} from './html.ts';
export function difficultyRulesMarkup(difficulty:string) {
  const rules=encounterAssists(difficulty);
  const revive=rules.revivedHealthFraction===1?'reviveFull':rules.revivedHealthFraction===.25?'reviveQuarter':rules.revivedHealthFraction?'reviveHalf':'reviveOff';
  const cover=difficulty==='hellish'?'coverLava':difficulty==='insane'?'coverNone':difficulty==='hard'?'coverHalf':difficulty==='baby'?'coverExtra':'coverFull';
  return `<span class="difficulty-rules"><span>${e(t('ui.'+(rules.phaseShieldBreak?'phaseShieldOn':'phaseShieldOff')))}</span><span>${e(t('ui.'+revive))}</span><span>${e(t('ui.'+cover))}</span>${rules.phaseShieldBreak?`<span>${e(t('ui.shieldBreakDetails',{count:number(rules.shieldCircles),seconds:number(rules.shieldChannelSeconds)}))}</span>`:''}${difficulty==='hellish'?`<strong>${e(t('ui.allBrutal'))}</strong>`:''}</span>`;
}
