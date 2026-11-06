// Three original identities. Their explicit director owns every attack; these rows supply budgets.
export const earlyWatchIds = ['ashen-usher','brass-toad','ragpicker-kite'];
const specs = [
 ['ashen-usher','Ashen Usher','Still seats visitors in a hall no one can find.',.75,42,
  'Breakable ticket stands release staggered aisle volleys. Dismissal crosses the rows; Final Call adds a second sweep while the usher walks between calls.',
  'Read the locked rays and cross after a volley, or destroy a ticket stand to cancel every pending shot from that stand.',
  {ticketStandHealth:32,warningSeconds:1.3,walkingSpeed:30},
  ['fan','cross','lanes'],[5,6,7]],
 ['brass-toad','Brass Toad','The abandoned fountain learned to drink the rain.',.82,50,
  'Locked landing circles precede physical hops and gapped ripple projectiles. Downpour adds a second landing; Dry Mouth follows with a narrow tongue lane.',
  'Leave the landing circles, cross the broad ripple wedge and sidestep the locked tongue line. Breaking the drain plug cancels its tongue jet.',
  {drainPlugHealth:44,hopSeconds:.65,rippleGapDegrees:109,landingRadius:66},
  ['ring','ring','hook'],[12,14,16]],
 ['ragpicker-kite',"Ragpicker's Kite",'Its tether still pulls above a deserted street.',.9,46,
  'A floating orbit surrounds warned wind corridors. Crosswind adds opposing corridors with a quiet center; Unravelling staggers three wing fans.',
  'Use the quiet center, steer against the marked arrows or break a cloth pin to remove its wind. Dodge briefly suppresses wind force.',
  {clothPinHealth:44,windSpeed:48,maximumWindSpeed:65,quietCenterPixels:170},
  ['fan','cross','lanes'],[5,6,7]],
];
export function addEarlyWatch(bosses,pools) {
 for(const [id,name,lore,healthFactor,radius,behavior,counterplay,mechanics,kinds,counts] of specs) {
  if(bosses.some(b=>b.id===id))throw Error('Early Watch identity already exists: '+id);
  const phases=[1,.75,.4].map((healthThreshold,i)=>({healthThreshold,accordBreak:i>0,
    attacks:[{kind:kinds[i],count:counts[i],speed:id==='brass-toad'?120:135,damage:9+i,interval:8,telegraph:1.3}]}));
  bosses.push({id,name,lore,minThreat:1,timer:120,healthFactor,radius,secret:false,route:'short',finale:false,
    preferredArena:'gatehouse',arenaIds:['gatehouse','triage-yard','sunken-chapel','bell-foundry','crown-crypt'],damageWindowFraction:1,
    mechanics,signature:{id,behavior,counterplay,parameters:mechanics},artBrief:lore+' Preserve the issued original concept and complete motion poses.',phases,
    variants:{normal:{healthMultiplier:1,damageMultiplier:1,deadlineMultiplier:1,bountyMultiplier:1},
      brutal:{healthMultiplier:2,damageMultiplier:2,deadlineMultiplier:1.5,bountyMultiplier:1.75,identity:id+'-brutal',signature:id,
        phases:[...phases,{...phases[2],healthThreshold:.25}].map((p,i)=>({...p,healthThreshold:[1,.75,.5,.25][i],signatureRepeatOffsetSeconds:i===3?1.25:0,
          attacks:p.attacks.map(a=>({...a,comboOffsetSeconds:0}))}))}}});
  pools.short.regular.push(id);
  pools.endless.openingPool.push(id);
 }
}
