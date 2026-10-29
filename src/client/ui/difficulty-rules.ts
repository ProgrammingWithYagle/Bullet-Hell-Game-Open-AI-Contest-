import {encounterAssists} from '../../shared/encounter-policy.ts';
import {revivedHealth,passiveRegenerationMultiplier,maximumPersonalShield} from '../../shared/recovery-policy.ts';
import {t,number} from '../i18n.ts';
import {escape as e} from './html.ts';
export function difficultyRulesMarkup(difficulty:string) {
  const rules=encounterAssists(difficulty);
  const revive=difficulty==='hellish'?t('ui.reviveNobody'):rules.revivedHealthFraction
    ?t('ui.ordinaryReviveHealth',{health:number(rules.revivedHealthFraction*100)}):t('ui.reviveMedicOnly');
  const medic=difficulty==='hellish'?'':difficulty==='baby'?t('ui.medicReviveBaby'):difficulty==='insane'?t('ui.medicReviveOne')
    :t('ui.medicReviveHealth',{health:number(revivedHealth(difficulty,100,'medic'))});
  const regen=passiveRegenerationMultiplier(difficulty);
  const cover=difficulty==='hellish'?'coverLava':difficulty==='insane'?'coverNone':difficulty==='hard'?'coverHalf':difficulty==='baby'?'coverExtra':'coverFull';
  return `<span class="difficulty-rules"><span>${e(t('ui.'+(rules.phaseShieldBreak?'phaseShieldOn':'phaseShieldOff')))}</span><span>${e(revive)}</span>${medic?`<span>${e(medic)}</span>`:''}<span>${e(t(regen===0?'ui.regenOff':regen===1?'ui.regenUnchanged':'ui.regenReduced',{percent:number((1-regen)*100)}))}</span><span>${e(t(difficulty==='hellish'?'ui.shieldsDisabled':'ui.shieldLimit',{percent:number(maximumPersonalShield(difficulty,100))}))}</span><span>${e(t('ui.'+cover))}</span>${rules.phaseShieldBreak?`<span>${e(t('ui.shieldBreakDetails',{count:number(rules.shieldCircles),seconds:number(rules.shieldChannelSeconds)}))}</span>`:''}${['insane','hellish'].includes(difficulty)?`<strong>${e(t(difficulty==='hellish'?'ui.allCrazed':'ui.allBrutal'))}</strong>`:''}</span>`;
}
