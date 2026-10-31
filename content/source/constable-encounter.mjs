// Applied after variant authoring, so rebuilding the catalog preserves this encounter.
export function reviseConstable(bosses) {
  const boss = bosses.find(b => b.id === 'constable');
  if (!boss) throw Error('Missing Hollow Constable');
  const fan = {kind:'fan',count:7,speed:160,damage:12,interval:3.2,telegraph:.85,arc:90};
  const zone = {kind:'zone',count:2,speed:0,damage:10,interval:7,telegraph:1.2,radius:65,duration:2.4,slow:.35};
  const cordon = {kind:'cross',count:9,speed:170,damage:12,interval:3.8,telegraph:1.05,arc:60};
  const ring = {kind:'ring',count:22,speed:150,damage:12,interval:4.4,telegraph:1.15,gap:95};
  const phases = [
    {healthThreshold:1,accordBreak:false,attacks:[fan,zone]},
    {healthThreshold:.75,accordBreak:true,attacks:[cordon,{...zone,count:3,interval:6.5,radius:60,duration:2.2}]},
    {healthThreshold:.4,accordBreak:true,attacks:[ring,{...zone,count:3,interval:6.2,telegraph:1.4,radius:60,duration:2}]},
  ];
  boss.phases = phases;
  boss.variants.brutal.phases = phases.map((p,i)=>({
    ...p, healthThreshold:[1,.75,.5][i], signatureRepeatOffsetSeconds:0,
    attacks:p.attacks.map(a=>({...a,interval:a.interval*.9,comboOffsetSeconds:0})),
  }));
  boss.variants.brutal.phases.push({
    healthThreshold:.25,accordBreak:true,signatureRepeatOffsetSeconds:1.25,
    attacks:[{...ring,count:26,speed:165,interval:4.1,gap:85,comboOffsetSeconds:0},
      {...zone,count:4,radius:60,interval:6,telegraph:1.4,duration:2,comboOffsetSeconds:1.25}],
  });
  boss.signature.behavior = 'Patrol shuffles between locked double volleys; Cordon fires crossing flank fans and a line of arrest stamps; Lockdown pursues while releasing staggered rings with a shared escape wedge. Brutal adds a third ring in Curfew.';
  boss.signature.counterplay = 'Move after aim locks. Cross between the Cordon fans, leave the arrest outlines, and follow the overlapping open wedge in the Lockdown rings. Casting plants his feet; successful Accords interrupt pending volleys and give a full stagger window.';
  boss.mechanics = {...boss.mechanics,zoneDuration:2.4,patrolSpeed:56,cordonSpeed:76,lockdownSpeed:96,curfewSpeed:108};
  boss.signature.parameters = {...boss.mechanics};
}
