// Preproduction acceptance model, not gameplay integration evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const c=JSON.parse(fs.readFileSync('content/catalog.json','utf8'));
const prng=seed=>()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const shuffle=(items,rng)=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
let routes=0,contractCards=0,endlessEncounters=0,exclusiveEncounters=0;
for(let seed=1;seed<=1000;seed++)for(const mode of c.modes.filter(m=>m.kind!=='endless')){
 const rng=prng(seed),seen=new Set(),pool=c.bossPools[mode.id];
 for(let fight=0;fight<mode.encounters;fight++){
  const ids=pool[fight===mode.encounters-1?'finale':'regular'].filter(id=>!seen.has(id));assert(ids.length>=3);
  const cards=shuffle(ids,rng).slice(0,3);assert.equal(new Set(cards).size,3);assert(cards.every(id=>!seen.has(id)));contractCards+=3;
  seen.add(cards[Math.floor(rng()*3)]);
 }assert.equal(seen.size,mode.encounters);routes++;
}
for(let seed=1;seed<=200;seed++){
 const rng=prng(seed),routeIds=Object.entries(c.bossPools).filter(([id])=>id!=='endless').flatMap(([,p])=>[...p.regular,...p.finale]),exclusive=c.bossPools.endless.exclusive;
 const history=[],bags={route:new Set(routeIds),exclusive:new Set(exclusive)};
 for(let encounter=1;encounter<=200;encounter++){
  const isExclusive=encounter>=4&&encounter%4===0,kind=isExclusive?'exclusive':'route',pool=isExclusive?exclusive:encounter<=3?c.bossPools.endless.openingPool:routeIds;
  const recent=new Set(history.slice(-12));const eligible=pool.filter(id=>!recent.has(id));assert(eligible.length>=3);
  const current=eligible.filter(id=>bags[kind].has(id));const remaining=eligible.filter(id=>!bags[kind].has(id));
  // At a bag boundary, complete the three distinct contracts from the next bag;
  // the deterministic winner prioritizes unseen identities for this model.
  const cards=[...shuffle(current,rng),...shuffle(remaining,rng)].slice(0,3);assert.equal(new Set(cards).size,3);assert(cards.every(id=>!recent.has(id)));
  const chosen=current.length?cards[0]:cards[Math.floor(rng()*cards.length)];if(!current.length)bags[kind]=new Set(isExclusive?exclusive:routeIds);
  bags[kind].delete(chosen);assert(chosen!=='uncounted');history.push(chosen);endlessEncounters++;if(isExclusive){assert(exclusive.includes(chosen));exclusiveEncounters++;}
 }
}
const report={schemaVersion:1,passed:true,kind:'Deterministic design acceptance model; not playable runtime evidence',timedRoutes:routes,concealedCardsValidated:contractCards,endlessEncounters,guaranteedExclusiveEncounters:exclusiveEncounters,seeds:{timed:1000,endless:200},repeatProtectionEncounters:12,limits:['The model checks pool arithmetic, uniqueness and selected sequence constraints. Actual vote/reconnect/server integration remains a gameplay check.','An exclusive slot offers three exclusive identities, so any vote result produces an exclusive boss.']};
report.contentRevision=JSON.parse(fs.readFileSync('content/revision.json','utf8')).sha256;
fs.writeFileSync('reviews/gauntlet-model-review.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
