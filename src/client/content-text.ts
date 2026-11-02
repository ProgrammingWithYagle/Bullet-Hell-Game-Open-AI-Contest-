import {generalSkills} from '../shared/mobility.ts';
import {talentForSkill} from '../shared/class-talents.ts';
import {revivedHealth} from '../shared/recovery-policy.ts';
import { t, number } from './i18n.ts';
import { data } from '../shared/game.ts';
export function supplyName(id:string,classId:string){return t('supply.'+(id==='ammo-pouch'?(classId==='swordsman'?'swordsman-canteen':classId==='summoner'?'summoner-thread-spool':classId==='ranger'?'ranger-arrow-bundle':classId==='alchemist'?'alchemist-sample-case':id):id)+'.name');}
export function upgradeName(id:string,classId:string){return t('upgrade.'+(['damage','fire-rate','magazine','reload'].includes(id)?(classId==='swordsman'?'swordsman-':classId==='summoner'?'summoner-':classId==='ranger'?'ranger-':classId==='alchemist'?'alchemist-':''):'')+id+'.name');}
export function supplyText(id: string,difficulty='normal',classId='soldier') {
  if(classId==='alchemist'&&id==='ammo-pouch')return t('supply.alchemist-sample-case.description',{maximum:number(data.supplies.find(s=>s.id==='ammo-pouch')!.maximumStack)});
  if(classId==='ranger'&&id==='ammo-pouch')return t('supply.ranger-arrow-bundle.description',{maximum:number(data.supplies.find(s=>s.id==='ammo-pouch')!.maximumStack)});
  if(classId==='summoner'&&id==='ammo-pouch')return t('supply.summoner-thread-spool.description',{maximum:number(data.supplies.find(s=>s.id==='ammo-pouch')!.maximumStack)});
  if(classId==='swordsman'&&id==='ammo-pouch')return t('supply.swordsman-canteen.description');
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
export function upgradeEffects(id:string,classId:string){
 const u=data.upgrades.find(u=>u.id===id)!;
 return {[u.effect]:u.amount,...(classId==='summoner'&&id==='damage'?{summonDamage:data.rules.summoner.equipmentDamagePerLevel}:{}),...(classId==='summoner'&&id==='fire-rate'?{summonAttackRate:data.rules.summoner.equipmentAttackRatePerLevel}:{})};
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
  'retinueCapacity',
  'rangerTrapCapacity',
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
      else if (key === 'ultimateDuration'||key==='rangerTrapDuration')
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

export function skillBehavior(id:string){if(generalSkills.some(s=>s.id===id))return t('skill.'+id+'.description');const talent=talentForSkill(id);if(talent)return t('talent.'+talent+'.description');const skill=data.skills.find(s=>s.id===id);return skill?.subbranchNameKey==='shieldPath.'+skill?.classId+'.name'?t('shieldPath.help'):'';}
