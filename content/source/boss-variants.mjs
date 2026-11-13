// Variants are orthogonal to Baby/Easy/Normal/Hard/Insane/Hellish.
export const brutalRules={healthMultiplier:2,damageMultiplier:2,deadlineMultiplier:1.5,bountyMultiplier:1.75,phaseThresholds:[1,.75,.5,.25],minimumTelegraphSeconds:.85,endlessTrigger:'A boss is eligible after its first completed appearance. The first-loop Constable repeat is always Brutal.',projectileCapUnchanged:true};
export function addBossVariants(bosses){
  const constable=bosses.find(b=>b.id==='constable');
  constable.phases[1].attacks.push({kind:'lanes',count:7,speed:150,damage:10,interval:8.5,telegraph:1.1,arc:65});
  constable.phases[2].attacks.push({kind:'ring',count:18,speed:130,damage:10,interval:8.2,telegraph:1.25,gap:70});
  for(const b of bosses){
    const attacks=b.phases.at(-1).attacks;
    b.variants={normal:{healthMultiplier:1,damageMultiplier:1,deadlineMultiplier:1,bountyMultiplier:1},brutal:{
      healthMultiplier:2,damageMultiplier:2,deadlineMultiplier:1.5,bountyMultiplier:1.75,
      identity:b.id+'-brutal',signature:b.signature.id,
      phases:brutalRules.phaseThresholds.map((healthThreshold,i)=>({
        healthThreshold,accordBreak:i>0,
        // Retain each boss's distinct signature kit; the fourth phase combines its attacks.
        signatureRepeatOffsetSeconds:i===3?1.25:0,
        attacks:(i<3?b.phases[i].attacks:attacks).map((a,n)=>({...a,telegraph:Math.max(.85,a.telegraph),interval:Math.max(a.interval*.9,Math.max(.85,a.telegraph)+1.2),comboOffsetSeconds:i===3?n*1.25:0})),
      })),
    }};
    if(b.id==='constable')b.variants.brutal.phases[3].attacks=[
      {kind:'lanes',count:9,speed:160,damage:12,interval:7.5,telegraph:1.1,arc:70,comboOffsetSeconds:0},
      {kind:'ring',count:22,speed:145,damage:11,interval:9,telegraph:1.25,gap:65,comboOffsetSeconds:1.25},
      {kind:'zone',count:4,speed:0,damage:10,interval:8.5,telegraph:1.4,radius:75,duration:3,comboOffsetSeconds:2.5},
    ];
  }
}
