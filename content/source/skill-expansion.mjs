// Three parent branches, each with three six-node specializations. A path costs 21 SP.
const series=(key,values)=>values.map(value=>({[key]:value}));
const merge=(...rows)=>Array.from({length:6},(_,i)=>Object.assign({},...rows.map(r=>r[i])));
const weapon=[.04,.05,.07,.09,.12,.18],rate=[.06,.07,.08,.1,.12,.16],crit=[.02,.03,.04,.05,.06,.1];
const potency=[.04,.06,.08,.1,.14,.2],cdr=[.015,.02,.025,.035,.045,.06];
const health=[5,6,8,10,12,18],regen=[.05,.06,.08,.1,.14,.22];
const weaponLanes={
  soldier:[['stat.fireRate',merge(series('fireRate',rate),series('reloadReduction',[.02,.025,.03,.035,.04,.05])),{magazine:4}],['stat.criticalChance',merge(series('weaponDamage',weapon),series('criticalChance',crit)),{pierce:2}]],
  heavy:[['stat.magazine',merge(series('magazine',[3,4,5,6,8,12]),series('reloadReduction',[.02,.025,.03,.035,.04,.05])),{fireRate:.2}],['stat.pierce',merge(series('weaponDamage',weapon),series('criticalChance',crit)),{pierce:3}]],
  tank:[['stat.extraShots',merge(series('weaponDamage',weapon),series('reloadReduction',[.02,.025,.03,.035,.04,.05])),{extraShots:2}],['stat.fireRate',merge(series('fireRate',rate),series('magazine',[0,1,0,1,0,2])),{pierce:2}]],
  medic:[['stat.healOnHit',merge(series('weaponDamage',[.03,.04,.05,.06,.08,.12]),series('healOnHit',[.1,.15,.2,.25,.3,.5])),{healOnHit:1}],['stat.criticalChance',merge(series('weaponDamage',weapon),series('criticalChance',crit)),{fireRate:.15}]],
  mage:[['stat.pierce',merge(series('weaponDamage',weapon),series('reloadReduction',[.02,.025,.03,.035,.04,.05])),{pierce:3}],['stat.extraShots',merge(series('fireRate',rate),series('magazine',[0,1,0,1,0,2])),{extraShots:1}]],
  engineer:[['stat.turretDamage',merge(series('weaponDamage',[.03,.04,.05,.06,.08,.12]),series('turretDamage',[.04,.05,.06,.08,.1,.12])),{turretDamage:.2}],['stat.fireRate',merge(series('fireRate',rate),series('magazine',[1,1,2,2,3,4])),{extraShots:1}]],
  assassin:[['stat.criticalChance',merge(series('weaponDamage',weapon),series('criticalChance',crit)),{criticalChance:.15}],['stat.pierce',merge(series('fireRate',rate),series('reloadReduction',[.02,.025,.03,.035,.04,.05])),{pierce:3}]],
};
const abilitySpecial={
  soldier:['rallyRadius',[.03,.04,.05,.07,.1,.16],{ultimateShield:30}],
  heavy:['suppressionDuration',[.03,.04,.05,.07,.1,.16],{pierce:2}],
  tank:['barrierHealth',[.04,.05,.07,.1,.14,.2],{maxHealth:25}],
  medic:['reviveRate',[.04,.06,.08,.12,.2,.3],{healOnHit:1}],
  mage:['sigilRadius',[.03,.04,.05,.07,.1,.16],{ultimatePulses:1}],
  engineer:['turretDamage',[.04,.05,.06,.08,.1,.12],{extraTurrets:1}],
  assassin:['veilDuration',[.03,.04,.05,.07,.1,.16],{ultimateCharges:1}],
};
const ultimateCap={soldier:{ultimateDuration:2},heavy:{ultimateDuration:2},tank:{ultimatePotency:.25},medic:{ultimateRadius:80},mage:{ultimatePulses:1},engineer:{ultimateDuration:6},assassin:{ultimateCharges:1}};
const mainFocus=['stat.weaponDamage','stat.abilityPotency','stat.maxHealth'];
function effectsDescription(effects){return Object.entries(effects).filter(([,v])=>v).map(([key,value])=>`${key}: ${value>=0?'+':''}${value}${['maxHealth','healOnHit','ultimateShield'].includes(key)?' HP':key==='regeneration'?' HP/s':key==='ultimateDuration'?' s':key==='ultimateRadius'?' world px':['pierce','magazine','extraShots','extraTurrets','ultimateCharges','ultimatePulses','selfRevives'].includes(key)?' count':' ratio'}`).join('; ')+'. Additive bonuses; shared modifier limits apply.';}
export function expandSkills(base,classes,grades){
  const output=[];
  for(const cl of classes)for(const [branchIndex,branch]of cl.branches.entries()){
    const original=base.filter(s=>s.classId===cl.id&&s.branchId===branch.id).sort((a,b)=>a.depth-b.depth);
    const [abilityKey,abilityValues,abilityCap]=abilitySpecial[cl.id];
    const extras=branchIndex===0?weaponLanes[cl.id]:branchIndex===1?[
      ['ability.'+cl.ultimate.id+'.name',merge(series('ultimateCooldownReduction',[.015,.02,.025,.03,.035,.05]),series('ultimatePotency',[.025,.03,.035,.04,.05,.07])),ultimateCap[cl.id]],
      ['ability.'+cl.abilities[0].id+'.name',merge(series('abilityPotency',potency),series('cooldownReduction',cdr),series(abilityKey,abilityValues)),abilityCap]
    ]:[
      ['stat.dodgeCooldown',merge(series('moveSpeed',[.015,.02,.025,.03,.04,.05]),series('dodgeCooldown',[-.02,-.025,-.03,-.035,-.04,-.05])),{armor:.08}],
      ['stat.reviveRate',merge(series('maxHealth',health),series('regeneration',regen),series('reviveRate',[.02,.03,.04,.06,.08,.12])),{selfRevives:1}]
    ];
    branch.subbranches=[{id:branch.id+'-foundation',nameKey:mainFocus[branchIndex],name:mainFocus[branchIndex].slice(5)},...extras.map(([key],i)=>({id:branch.id+'-path-'+(i+1),nameKey:key,name:key==='ability.'+cl.ultimate.id+'.name'?cl.ultimate.name:key.startsWith('ability.')?cl.abilities[0].name:key.slice(5)}))];
    for(const [lane,subbranch]of branch.subbranches.entries())for(const [index,core]of original.entries()){
      const id=lane===0?core.id:cl.id+'-'+subbranch.id+'-'+core.depth;
      const effects=lane===0?{...core.effects}:{...extras[lane-1][1][index],...(index===5?extras[lane-1][2]:{})};
      output.push({...core,id,sourceSkillId:core.id,subbranchId:subbranch.id,subbranchName:subbranch.name,subbranchNameKey:subbranch.nameKey,lane,grade:grades[index*3+lane],name:lane===0?core.name:core.name+' · '+subbranch.name,prerequisite:index===0?null:lane===0?original[index-1].id:cl.id+'-'+subbranch.id+'-'+index,effects,description:effectsDescription(effects)});
    }
  }
  return output;
}
