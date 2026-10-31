import {talentForSkill} from '../shared/class-talents.ts';
import {revivedHealth} from '../shared/recovery-policy.ts';
import { t, number } from './i18n.ts';
import { data } from '../shared/game.ts';
export function supplyText(id: string,difficulty='normal',classId='soldier') {
  const item = data.supplies.find((s) => s.id === id)!;
  if(item.effect==='revive'&&difficulty==='insane'&&classId==='medic')return t('ui.reviveKitOneHealth',{maximum:number(item.maximumStack)});
  const description=t('supply.' + id + '.description', {
    amount: ['moveSpeed', 'revive', 'abilityCooldown'].includes(item.effect)
      ? t('template.percent', { value: number(item.effect==='revive'?revivedHealth(difficulty,100,classId):item.amount*100) })
      : number(item.amount),
    duration: t('template.seconds', { value: number(item.duration) }),
    maximum: number(item.maximumStack),
  });
  return description+(item.effect==='revive'&&difficulty==='baby'&&classId==='medic'?' '+t('ui.medicBabyShield'):'');
}
const flat = new Set([
  'maxHealth',
  'magazine',
  'pierce',
  'extraShots',
  'extraTurrets',
  'selfRevives',
  'healOnHit',
  'ultimateCharges',
  'ultimatePulses',
  'ultimateShield',
  'ultimateRadius',
  'startShield',
]);
export function effectText(
  effects: Record<string, number | undefined>,
  kind: 'bonus' | 'mutation' = 'bonus',
) {
  return Object.entries(effects)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] !== 0)
    .map(([key, value]) => {
      const label = t('stat.' + key);
      let formatted = '';
      if (kind === 'mutation' && !['armor', 'extraShots', 'startShield'].includes(key))
        formatted = '×' + number(value, 2);
      else if (key === 'ultimateDuration')
        formatted = t('template.seconds', { value: (value > 0 ? '+' : '') + number(value, 2) });
      else if (key === 'ultimateRadius')
        formatted = t('template.pixels', { value: (value > 0 ? '+' : '') + number(value, 2) });
      else if (key === 'armor' || key === 'criticalChance')
        formatted = t('template.points', {
          value: (value > 0 ? '+' : '') + number(value * 100, 2),
        });
      else if (key === 'regeneration')
        formatted = t('template.perSecond', { value: '+' + number(value, 2) });
      else if (flat.has(key))
        formatted =
          (value > 0 ? '+' : '') +
          number(value, 2) +
          (['maxHealth', 'healOnHit', 'ultimateShield', 'startShield'].includes(key)
            ? ' ' + t('stat.health')
            : '');
      else
        formatted =
          (value > 0 ? '+' : '') + t('template.percent', { value: number(value * 100, 2) });
      return t('template.effect', { label, value: formatted });
    })
    .join(' · ');
}

export function skillBehavior(id:string){const talent=talentForSkill(id);return talent?t('talent.'+talent+'.description'):'';}
