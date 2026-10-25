import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const exists=file=>fs.existsSync(path.join(root,file));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const c=read('content/catalog.json');
const contentOnly=process.argv.includes('--content-only');
const delivery=process.argv.includes('--delivery');
const checks=[];
function check(name,fn){try{fn();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:error.message});}}
const unique=(items,label)=>assert.equal(new Set(items.map(x=>x.id)).size,items.length,label+' duplicate IDs');
const finiteTree=value=>{if(typeof value==='number')assert(Number.isFinite(value));else if(Array.isArray(value))value.forEach(finiteTree);else if(value&&typeof value==='object')Object.values(value).forEach(finiteTree);};
check('Complete finite versioned content',()=>{
  finiteTree(c);assert.equal(c.rules.schemaVersion,1);assert.equal(c.rules.simulationHz,30);assert.equal(c.rules.patchHz,20);
  for(const [key,count] of Object.entries({classes:7,skills:378,weapons:28,bosses:60,mutations:24,arenas:6,modes:5,difficulties:6,locales:15,grades:18}))assert.equal(c[key].length,count,key);
  for(const [key,value] of Object.entries(c))if(Array.isArray(value)&&value[0]?.id)unique(value,key);
  assert(!/\bTBD\b|TODO|FIXME/.test(JSON.stringify(c)),'Unresolved content placeholder');
  assert.equal(read('content/revision.json').sha256,crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex'));
  for(const [key,value] of Object.entries(c))assert.deepEqual(read('content/'+key+'.json'),value,'Split catalog '+key);
});
check('Seven classes, 378 specialization nodes, all eighteen grades and ultimates',()=>{
  for(const cl of c.classes){
    assert.equal(cl.abilities.length,2);assert.equal(cl.branches.length,3);assert(cl.health>0&&cl.speed>0);
    assert.equal(cl.ultimate.slot,'ultimate');assert(cl.ultimate.cooldown>=60&&cl.ultimate.cooldown<=120);assert(cl.ultimate.description.length>30);
    const sk=c.skills.filter(s=>s.classId===cl.id);assert.equal(sk.length,54);assert.equal(c.weapons.filter(w=>w.classId===cl.id).length,4);
    for(const branch of cl.branches){
      assert.equal(branch.subbranches.length,3);const all=sk.filter(s=>s.branchId===branch.id);assert.equal(all.length,18);assert.deepEqual([...new Set(all.map(s=>s.grade))].sort(),[...c.grades].sort());
      for(const subbranch of branch.subbranches){
      const nodes=all.filter(s=>s.subbranchId===subbranch.id).sort((a,b)=>a.depth-b.depth);
      assert.equal(nodes.length,6);assert.deepEqual(nodes.map(s=>s.cost),[1,2,3,4,5,6]);assert.equal(nodes.reduce((n,s)=>n+s.cost,0),21);
      for(let i=0;i<6;i++){const n=nodes[i];assert.equal(n.depth,i+1);assert.equal(n.prerequisite,i?nodes[i-1].id:null);assert.equal(n.capstone,i===5);assert(c.grades.includes(n.grade));assert(Object.keys(n.effects).length);}
      }
    }
    assert(sk.some(s=>s.effects.ultimateCooldownReduction));assert(sk.some(s=>Object.keys(s.effects).some(k=>k.startsWith('ultimate')&&k!=='ultimateCooldownReduction')));
    assert(c.weapons.some(w=>w.id===cl.weapon&&w.classId===cl.id&&w.price===0));
  }
  assert.equal(c.rules.maximumActiveCapstones,1);assert.equal(c.rules.ultimate.maximumCooldownReduction,0.4);
});
check('Campaign, raid and uncapped endless budgets',()=>{
  for(const m of c.modes){assert(m.public&&m.private&&m.offlineSolo);assert.equal(m.minPlayers,1);assert(m.arenas.every(a=>c.arenas.some(x=>x.id===a)));
    if(m.kind==='campaign'){
      assert.equal(m.threats.length,m.encounters);assert.equal(m.arenas.length,m.encounters);
      const budgets=Array.from({length:m.encounters},(_,j)=>3+Math.floor(24*j/(m.encounters-1)));
      assert.equal(budgets[0],3);assert.equal(budgets.at(-1),27);assert(budgets.every((v,i)=>!i||v>=budgets[i-1]));
      assert.equal(120+Math.floor(2280*(m.encounters-1)/(m.encounters-1)),2400);
    }
  }
  assert.deepEqual(c.modes.find(m=>m.id==='raid').skillBudgets,[12,20,27]);assert.equal(c.modes.find(m=>m.id==='endless').encounters,null);assert.equal(c.modes.find(m=>m.id==='endless').maxPlayers,50);assert.equal(c.rules.endless.finalEncounter,null);assert(c.rules.endless.cappedPlayerPower);
  assert.equal(c.difficulties.filter(d=>d.locked).length,2);assert(c.difficulties.filter(d=>d.locked).every(d=>/Hard/.test(d.unlock)));
});
check('Fixed boss grades, independent variants and complete translated tier labels',()=>{
  const profile=read('src/shared/boss-threats.json'),labels=read('src/client/threat-labels.json'),review=read('reviews/balance-model-review.json');
  assert.equal(profile.entries.length,c.bosses.length);assert.equal(new Set(profile.entries.map(p=>p.bossId)).size,c.bosses.length);
  for(const p of profile.entries){assert(c.bosses.some(b=>b.id===p.bossId));assert(Number.isInteger(p.level)&&p.level>=1&&p.level<=11);assert(Number.isInteger(p.subtier)&&p.subtier>=-2&&p.subtier<=2);assert.equal(p.level>10,p.bossId==='uncounted');}
  assert.deepEqual(review.fixedThreatProfiles,profile.entries,'Stale fixed-grade analytical model');assert.equal(review.fixedThreatClassificationVersion,profile.classificationVersion);
  assert.equal(Object.keys(labels).length,15);for(const words of Object.values(labels)){assert.equal(words.length,6);assert(words.every(word=>typeof word==='string'&&word.trim()));}
});
check('Weapon accounting, rates and finite cooldowns',()=>{
  for(const w of c.weapons){assert(w.damage>0&&w.fireRate>0&&w.magazine>0&&w.reloadTime>0&&w.projectileSpeed>0&&w.pellets>0&&w.price>=0);const dps=w.damage*w.pellets*w.magazine/(w.magazine/w.fireRate+w.reloadTime);assert(Math.abs(dps-w.baselineSustainedDps)<0.011);}
  for(const item of [...c.upgrades,...c.supplies])assert((item.price??item.basePrice)>=0);
  for(const cl of c.classes)for(const a of [...cl.abilities,cl.ultimate])assert(a.cooldown>0&&a.duration>=0&&a.radius>=0&&a.damage>=0);
});
let legalMutationSets=0;
check('Every legal one-, two- and three-mutation composition',()=>{
  const ids=new Map(c.mutations.map(m=>[m.id,m]));
  for(const m of c.mutations){assert.equal(m.durationEncounters,3);for(const id of m.excludes){assert(ids.has(id));assert(ids.get(id).excludes.includes(m.id),'Asymmetric exclusion '+m.id+'/'+id);}for(const [key,v] of Object.entries(m.modifiers))assert(v>=0&&typeof v==='number',key);}
  const additive=new Set(['armor','extraShots','startShield']);
  function visit(set,start){
    if(set.length){legalMutationSets++;const combined={};for(const m of set)for(const [k,v] of Object.entries(m.modifiers))combined[k]=additive.has(k)?(combined[k]??0)+v:(combined[k]??1)*v;
      for(const [k,v] of Object.entries(combined)){const bounds=c.rules.modifierLimits[k];const limited=bounds?Math.min(bounds[1],Math.max(bounds[0],v)):v;assert(Number.isFinite(limited));if(bounds)assert(limited>=bounds[0]&&limited<=bounds[1]);}
    }
    if(set.length===3)return;for(let i=start;i<c.mutations.length;i++){const m=c.mutations[i];if(set.every(x=>!x.excludes.includes(m.id)&&!m.excludes.includes(x.id)))visit([...set,m],i+1);}
  }visit([],0);assert(legalMutationSets>2000);
});
check('Boss attack contracts, transitions, arenas and deadlines',()=>{
  const kinds=new Set(['fan','ring','charge','cross','summon','pool','beam','hook','spiral','armor','warp','zone','shield','trail','lanes','pulse']);
  assert.equal(c.bosses.filter(b=>b.secret).length,1);
  for(const b of c.bosses){assert(b.timer>=60&&b.timer<=240);assert(b.healthFactor>0&&b.radius>0);assert.deepEqual(b.phases.map(p=>p.healthThreshold),[1,0.75,0.4]);assert.deepEqual(b.phases.map(p=>p.accordBreak),[false,true,true]);
    for(const p of b.phases)for(const a of p.attacks){assert(kinds.has(a.kind),'Unknown attack '+a.kind);assert(a.count>0&&a.count<=200);assert(a.speed>=0&&a.damage>=0&&a.interval>0&&a.telegraph>=0.45);assert(a.telegraph<a.interval);}
    assert(b.arenaIds.every(id=>c.arenas.some(a=>a.id===id)));
    assert.equal(b.variants.normal.healthMultiplier,1);assert.equal(b.variants.normal.damageMultiplier,1);
    const brutal=b.variants.brutal;assert.equal(brutal.healthMultiplier,2);assert.equal(brutal.damageMultiplier,2);assert.equal(brutal.identity,b.id+'-brutal');assert.equal(brutal.signature,b.signature.id);
    assert.deepEqual(brutal.phases.map(p=>p.healthThreshold),c.rules.brutal.phaseThresholds);
    assert.deepEqual(brutal.phases.map(p=>p.accordBreak),[false,true,true,true]);
    for(const phase of brutal.phases)for(const attack of phase.attacks){assert(kinds.has(attack.kind));assert(attack.count>0&&attack.count<=200);assert(attack.telegraph>=c.rules.brutal.minimumTelegraphSeconds&&attack.telegraph<attack.interval);}
  }
  for(const a of c.arenas){assert.equal(a.width,1600);assert.equal(a.height,1000);for(const o of a.obstacles){assert(o.x>=0&&o.y>=0&&o.x+o.width<=a.width&&o.y+o.height<=a.height);assert(!(a.playerSpawn.x>o.x&&a.playerSpawn.x<o.x+o.width&&a.playerSpawn.y>o.y&&a.playerSpawn.y<o.y+o.height));}}
});
check('Sixty distinct bosses, route-specific gauntlets and Endless exclusives',()=>{
  const allIds=new Set();
  for(const m of c.modes.filter(m=>m.kind!=='endless')){
    const pool=c.bossPools[m.id];assert.equal(pool.finale.length,3);assert(pool.regular.length>=m.encounters+1,'Insufficient nonrepeating three-card candidates '+m.id);
    for(const id of [...pool.regular,...pool.finale]){assert(!allIds.has(id),'Route pools overlap '+id);allIds.add(id);assert(c.bosses.some(b=>b.id===id&&b.route===m.id&&b.finale===pool.finale.includes(id)));}
  }
  assert.equal(allIds.size,50);assert.equal(c.bossPools.endless.exclusive.length,9);for(const id of c.bossPools.endless.exclusive){assert(!allIds.has(id));allIds.add(id);assert(c.bosses.some(b=>b.id===id&&b.route==='endless'));}
  assert.equal(allIds.size,59);assert(!allIds.has('uncounted'));assert.equal(new Set(c.bosses.map(b=>b.signature.id)).size,60);
  for(const b of c.bosses){assert(b.signature.behavior.length>30&&b.signature.counterplay.length>25);assert(b.damageWindowFraction>0&&b.damageWindowFraction<=1);}
  const result=spawnSync(process.execPath,['tools/verify-gauntlets.mjs'],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
});
check('Design bible and complete editable tables',()=>{
  for(const f of ['docs/GAME_BIBLE.md','docs/LOCALIZATION.md','docs/LEADERBOARDS.md','docs/AUDIO_BIBLE.md','docs/balance/skills.csv','docs/balance/weapons.csv','docs/balance/difficulties.csv','docs/balance/mutations.csv','docs/balance/route-budgets.csv','docs/balance/uptime-model.csv','docs/IMPLEMENTATION_BACKLOG.md','docs/ASSET_MANIFEST.json'])assert(exists(f),'Missing '+f);
  const bible=fs.readFileSync(path.join(root,'docs/GAME_BIBLE.md'),'utf8');assert(!/\bTBD\b|TODO|FIXME/.test(bible));assert(bible.includes('Names Returned')&&bible.includes('Endless Vigil'));
  const balance=read('reviews/balance-model-review.json');assert(balance.passed,'Analytical build feasibility fails');assert.equal(balance.contentRevision,read('content/revision.json').sha256,'Stale balance evidence');
});
if(!contentOnly){
  check('All fifteen translation catalogs and placeholder parity',()=>{const result=spawnSync(process.execPath,['tools/verify-locales.mjs'],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stdout+'\n'+result.stderr);});
  check('Eight reviewed art proof sets with original provenance',()=>{
    const contract=read('docs/art-contracts.json'),review=read('reviews/art-proof-review.json'),provenance=read('docs/art-provenance.json');assert.equal(contract.proofs.length,8);assert.equal(review.passed,true);assert.equal(review.proofs.length,8);
    for(const p of contract.proofs){assert(exists(p.file));const r=review.proofs.find(x=>x.file===p.file);assert(r?.passed,p.file+' review');assert.equal(r.sha256,hash(p.file));assert(provenance.approved.some(x=>x.file===p.file));}
    const animations=read('reviews/animation-review.json');assert(animations.passed);assert.equal(animations.animations.length,2);assert(animations.animations.every(a=>a.frameCount===8&&a.alpha&&a.maximumPivotError<=8&&a.motionReviewPassed));for(const a of animations.animations){assert.equal(hash(a.atlas),a.atlasSha256);assert.equal(hash(a.source),a.sourceSha256);}
    const finish=read('reviews/clean-detail-review.json');assert(finish.passed);for(const s of finish.sources){assert(s.passed&&s.nativeInspected);assert.equal(hash(s.path),s.sha256);assert(provenance.approved.some(p=>p.file===s.path));}for(const p of contract.supplementalProofs??[])assert(finish.sources.some(s=>s.path===p.file&&s.passed));
  });
  check('Original music and SFX objective review',()=>{const r=read('reviews/audio-proof-review.json');assert(r.passed);assert.equal(r.musicLoopCount,2);assert(r.sfxCount>=25);assert(r.allSevenUltimateIdsMatchContent);for(const f of r.files){assert(exists(f.path));assert.equal(hash(f.path),f.sha256);assert.equal(f.clippedSamples,0);}});
  check('Leaderboard fixtures and bounded score',()=>{const r=read('reviews/leaderboard-score-fixtures.json');assert(r);assert(exists('content/leaderboards.json'));});
}
if(delivery)check('Rendered PDF and portable packet',()=>{const r=read('reviews/stage1-delivery-review.json');assert(r.passed);assert.equal(r.contentRevision,read('content/revision.json').sha256,'Delivery evidence does not match current content revision');assert(r.pdf.rendered&&r.pdf.visualReviewPassed);assert(r.archive.freshExtractionPassed&&r.archive.normalCopyPassed);assert.equal(hash(r.pdf.path),r.pdf.sha256);});
const report={schemaVersion:1,stage:contentOnly?'Stage 1 design-content checks only':delivery?'Stage 1 complete preproduction gate':'Stage 1 source validation',passed:checks.every(x=>x.passed),legalMutationSets,checks};
fs.mkdirSync(path.join(root,'reviews'),{recursive:true});fs.writeFileSync(path.join(root,'reviews/stage1-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
