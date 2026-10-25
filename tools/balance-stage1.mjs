import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const c=JSON.parse(fs.readFileSync(path.join(root,'content/catalog.json'),'utf8'));
const classifications=JSON.parse(fs.readFileSync(path.join(root,'src/shared/boss-threats.json'),'utf8'));
const ratings=new Map(classifications.entries.map(e=>[e.bossId,e]));
const rows=[];
const costs=[0,1,3,6,10,15,21];
const upgradeCost=(id,n)=>{const u=c.upgrades.find(x=>x.id===id);return n*u.basePrice+u.priceStep*n*(n-1)/2;};
const combinations=[];
for(let a=0;a<=6;a++)for(let b=0;b<=6;b++)for(let d=0;d<=6;d++)if([a,b,d].filter(x=>x===6).length<=1)combinations.push([a,b,d]);
function strongestWeaponModel(cl,sp,coins){
  let best={dps:0};
  for(const depths of combinations){
    const spent=depths.reduce((s,n)=>s+costs[n],0);if(spent>sp)continue;
    const effects={};for(let b=0;b<3;b++)for(const s of c.skills.filter(s=>s.classId===cl.id&&s.branchId===cl.branches[b].id&&s.lane===0&&s.depth<=depths[b]))for(const [k,v]of Object.entries(s.effects))effects[k]=(effects[k]??0)+v;
    for(const w of c.weapons.filter(x=>x.classId===cl.id))for(let damage=0;damage<=5;damage++)for(let rate=0;rate<=5;rate++){
      const spentCoins=w.price+upgradeCost('damage',damage)+upgradeCost('fire-rate',rate);if(spentCoins>coins)continue;
      const multiplier=Math.min(4,1+(effects.weaponDamage??0)+damage*0.14),fr=w.fireRate*Math.min(2.5,1+(effects.fireRate??0)+rate*0.07);
      const hitFraction=w.pellets>1?0.7:1,pellets=w.pellets+(effects.extraShots??0);
      const dps=w.damage*multiplier*pellets*hitFraction*w.magazine/(w.magazine/fr+w.reloadTime);
      if(dps>best.dps)best={dps,weapon:w.id,depths,damageUpgrades:damage,fireRateUpgrades:rate,spentCoins,spentSP:spent};
    }
  }return best;
}
const cache=new Map();
for(const mode of c.modes.filter(m=>m.kind!=='endless'))for(let j=0;j<mode.encounters;j++)for(const difficulty of c.difficulties)for(const cl of c.classes){
  const sp=mode.skillBudgets?.[j]??3+Math.floor(24*j/(mode.encounters-1)),coins=Math.floor((mode.coinIncomeBudgets?.[j]??120+Math.floor(2280*j/(mode.encounters-1)))*difficulty.coins);
  const key=[cl.id,sp,coins].join('/');if(!cache.has(key))cache.set(key,strongestWeaponModel(cl,sp,coins));const build=cache.get(key);
  const targetThreat=mode.threats[j];
  const ids=mode.id==='raid'?c.bossPools.raid[j===mode.encounters-1?'finale':'regular']:c.bosses.filter(b=>['short','standard','long','raid'].includes(b.route)&&b.finale===(j===mode.encounters-1)).map(b=>b.id);
  const distances=ids.map(id=>Math.abs(ratings.get(id).level-targetThreat));const nearest=Math.min(...distances);
  // Model every nearby fixed level that the ranked offer policy can choose; later depleted rosters are exercised by the full progression fixtures.
  const pool=c.bosses.filter(b=>ids.includes(b.id)&&(targetThreat===1?ratings.get(b.id).level===1:Math.abs(ratings.get(b.id).level-targetThreat)<=Math.max(1,nearest)));
  for(const boss of pool){
    const {level:threat,subtier}=ratings.get(boss.id);
    const armorAttack=boss.phases[2].attacks.find(a=>a.kind==='armor');const armorUptime=armorAttack?(armorAttack.duration/armorAttack.interval)*armorAttack.resistance:0;
    // A declared analytical assumption, not measured player accuracy or playtest evidence.
    const attackUptime=0.65*(boss.damageWindowFraction??1),armorMultiplier=1-armorUptime;
    const hp=c.rules.bossHealthBase*c.rules.bossHealthThreatGrowth**(Math.min(10,threat)-1)*(1+subtier*.08)*(boss.timer/120)*boss.healthFactor*difficulty.health*(mode.bossHealthMultiplier??1);
    const effectiveDps=build.dps*attackUptime*armorMultiplier,estimatedSeconds=hp/effectiveDps;
    rows.push({mode:mode.id,fight:j+1,classId:cl.id,difficulty:difficulty.id,boss:boss.id,threat,subtier,sp,coins,weapon:build.weapon,depths:build.depths.join('/'),spentCoins:build.spentCoins,sustainedDps:+build.dps.toFixed(2),attackUptime,armorMultiplier:+armorMultiplier.toFixed(4),bossHealth:+hp.toFixed(2),estimatedSeconds:+estimatedSeconds.toFixed(2),timer:boss.timer,deadlineRatio:+(estimatedSeconds/boss.timer).toFixed(4)});
  }
}
const fields=Object.keys(rows[0]);fs.mkdirSync(path.join(root,'docs/balance'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/balance/uptime-model.csv'),[fields.join(','),...rows.map(r=>fields.map(k=>r[k]).join(','))].join('\n')+'\n');
const misses=rows.filter(r=>r.deadlineRatio>1),worst=rows.toSorted((a,b)=>b.deadlineRatio-a.deadlineRatio).slice(0,20);
const report={schemaVersion:1,kind:'Analytical design model; not gameplay measurement',assumptions:{movementAndAimUptime:0.65,shotgunPelletHitFraction:0.7,abilitiesAndUltimatesExcluded:true,accordBreakBenefitsExcluded:true,mutationsExcluded:true,optimization:'Conservative legal foundation-path prefixes with one capstone; class weapons and affordable damage/fire-rate upgrades. Specialization alternatives are excluded here and validated separately. This is an offensive feasibility witness, not exhaustive optimization or a recommendation for every build.',armor:'Worst-phase repeated armor duty cycle; ignores weak-point bonus. Boss health is solo; group scaling is sublinear.'},rows:rows.length,deadlineMisses:misses.length,worst,passed:misses.length===0};
report.fixedThreatClassificationVersion=classifications.classificationVersion;
report.fixedThreatProfiles=classifications.entries;
report.contentRevision=JSON.parse(fs.readFileSync(path.join(root,'content/revision.json'),'utf8')).sha256;
fs.mkdirSync(path.join(root,'reviews'),{recursive:true});fs.writeFileSync(path.join(root,'reviews/balance-model-review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({rows:rows.length,deadlineMisses:misses.length,worst:worst.slice(0,3)},null,2));
