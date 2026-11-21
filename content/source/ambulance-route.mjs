export const ambulanceRules={gridSpacing:32,routeClearance:8,minimumPatrol:96,maximumPatrol:420,patrolWarningSeconds:.5,patrolSpeed:140,chargeOverrun:100,minimumCharge:64,betweenLegSeconds:.65,recoverySeconds:3,betweenSequencesSeconds:1.5,spokesPerWing:4,halfGap:.42,wingArc:.7,burstWarningSeconds:1.25,echoSeconds:.35,releaseCueSeconds:.2,departureGapSeconds:.5,crossingTurn:.3,shotSpeed:200,shotDamage:5,shotRadius:5};
export function applyAmbulanceRoute(catalog){
 const b=catalog.bosses.find(b=>b.id==='black-ambulance');if(!b)throw Error('Black Ambulance missing');
 b.signature.behavior='Last Call follows a connected, body-clear perimeter route before one locked rescue-lane charge. At half health, Second Dispatch patrols in the other direction and gives two separately warned headings. Brutal adds one dispatch per sequence and warned gapped door volleys at every stop. Crazed keeps the full Brutal sequence and adds a fourth late dispatch with crossing door repeats.';
 b.signature.counterplay='The gold patrol route is harmless. Leave the marked road during its full 1.4-second warning; aim locks before the body moves. Each late heading is warned from its actual new stop. Advanced door fans warn for at least 1.25 seconds and mark all distinct repeat headings; move through their gaps and read the remaining-wave marks before the next departure. The last stop exposes the driver for three seconds and grants the existing 25% boss-damage bonus. Actual map offsets, body width, cover and Hellish lava constrain both route and charge. No instant-kill attack or new art is added.';
 b.signature.parameters.lastDispatch=structuredClone(ambulanceRules);
 for(const [form,phases]of [['normal',b.phases],['brutal',b.variants.brutal.phases],['crazed',b.variants.crazed.phases]])for(const [i,p]of phases.entries()){
  p.phaseNameKey='boss.black-ambulance.phase.'+i;p.dispatchLegs=form==='normal'?i+1:2+i+(form==='crazed'&&i?1:0);p.connectedPatrol=true;p.freshHeadingWarnings=true;
 }
}
