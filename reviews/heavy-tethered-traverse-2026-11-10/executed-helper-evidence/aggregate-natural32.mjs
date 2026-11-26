import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,stage,scope,read,sha,write,checkedGate} from './cycle-common11.mjs';
process.chdir(root);
const chat=path.resolve(stage,'../..'),source=fs.readFileSync(stage+'/source-commit.txt','utf8').trim(),{gate}=checkedGate();
const prior='reviews/heavy-clutch-handling-2026-11-09',families=[],bindings=[];
const plans=[['issued','issued01',9],['clutch','clutch01',9],['handling','policy01',18],['post','post18',27]];
let totalPairs=0;
for(const [family,suffix,expected]of plans){
  const rows=[];
  for(const [map,seed]of [['gatehouse',2209],['triage-yard',9027]]){
    const stem='Heavy-tethered-traverse-'+suffix+'-'+map+'-'+seed;
    const natural=read(chat+'/outputs/'+stem+'.json'),replay=read(chat+'/outputs/'+stem+'-restored.json'),comparison=read(family==='post'?scope+'/post-replay-comparison31-'+map+'-'+seed+'.json':chat+'/outputs/'+stem+'-comparison.json');
    assert(comparison.passed&&comparison.combatAndProgressionFieldsMatch);
    assert.equal(natural.rows.length,expected);assert.equal(replay.rows.length,expected);assert.equal(comparison.comparisons.length,expected);
    for(const report of [natural,replay,comparison]){assert.equal(report.runtimeSourceSha256,gate.runtimeSourceSha256);assert.equal(report.policySourceSha256,natural.policySourceSha256);assert.equal(report.map,map);assert.equal(report.seed,seed);}
    for(const report of[natural,replay]){assert.equal(report.sourceCommit,source);assert.equal(report.protocol,73);assert.equal(report.contentRevision,gate.contentRevision);}
    for(const edition of['natural','restore']){
      const execution=read(scope+'/'+family+'19-'+map+'-'+seed+'-'+edition+'-execution.json');
      assert(execution.sourceCommit===source&&execution.sourceAndTestBytesUnchanged&&execution.originalGameDeadlinesAndPolicyBoundsUnchanged);
      if(family==='post'&&edition==='restore')assert(!execution.passed&&execution.exitCode===1&&comparison.originalSimulationRowsComplete&&comparison.simulationRerun===false&&comparison.originalFailedComparisonPreserved&&comparison.originalExecutions.find(e=>e.edition==='restore').originalHelperExitCode===1);
      else assert(execution.passed&&execution.exitCode===0);
      assert.equal(execution.runtimeSourceSha256,gate.runtimeSourceSha256);assert.equal(execution.sourceSnapshotSha256,gate.sourceSnapshotSha256);assert.equal(execution.policySha256,natural.policySourceSha256);
      assert.equal(sha(fs.readFileSync(execution.log)),execution.logSha256);
    }
    for(const ending of['.json','-restored.json','-comparison.json']){const file=chat+'/outputs/'+stem+ending;bindings.push({file,sha256:sha(fs.readFileSync(file)),destination:scope+'/'+stem+ending});}
    if(family!=='post')for(const [ending,current]of[['.json',natural],['-restored.json',replay]]){
      const original=read(prior+'/Heavy-clutch-handling-'+suffix+'-'+map+'-'+seed+ending);
      assert.deepEqual(current.rows,original.rows,'Original72 '+family+' '+map+' '+ending+' measured values must stay exact.');
    }
    for(const handling of(family==='post'?['standard','keyed','open']:family==='handling'?['keyed','open']:[null])){
      const selected=natural.rows.filter(r=>handling===null||r.handling===handling),routes=new Set(selected.map(r=>r.route));
      const paired=comparison.comparisons.filter(c=>routes.has(c.route));assert.equal(selected.length,9);assert.equal(paired.length,9);
      const total=field=>selected.reduce((n,r)=>n+(r[field]?.length??0),0);
      let postMeasures={};
      if(family==='post'){
        let paidPostedCrounds=0,maximumObservedBodyTravel=0;
        for(const r of selected){
          assert(r.spentSP<=r.earnedSP&&r.earnedSP<=27);assert(Array.isArray(r.posts)&&Array.isArray(r.postedSamples));
          for(const cast of r.casts){assert(cast.rounds.length<=4);assert(cast.rounds.every(t=>[0,10,20,30].includes(t)));}
          for(const post of r.posts){
            assert(r.skills.includes('heavy-traverse-lanyard-1'));assert(post.clutchAt<post.postAt&&post.clutchSequence<post.postSequence&&post.postAt<post.originalUntil);
            const samples=r.postedSamples.filter(s=>s.encounter===post.encounter&&s.castAt===post.castAt&&s.postAt===post.postAt);
            for(const sample of samples){assert.deepEqual(sample.origin,post.origin);assert.equal(sample.bearing,post.bearing);assert.equal(sample.originalUntil,post.originalUntil);assert(sample.tick<sample.originalUntil);assert(Math.hypot(sample.body.x-post.origin.x,sample.body.y-post.origin.y)<=64+1e-6);maximumObservedBodyTravel=Math.max(maximumObservedBodyTravel,Math.hypot(sample.body.x-post.body.x,sample.body.y-post.body.y));}
            for(const shot of r.shots.filter(s=>s.encounter===post.encounter&&s.castAt===post.castAt&&s.admittedAt>=post.postAt)){
              paidPostedCrounds++;assert(Math.hypot(shot.shot.x-post.origin.x,shot.shot.y-post.origin.y)<1e-5);assert(Math.abs(Math.atan2(Math.sin(Math.atan2(shot.shot.vy,shot.shot.vx)-post.bearing),Math.cos(Math.atan2(shot.shot.vy,shot.shot.vx)-post.bearing)))<1e-5);
            }
          }
        }
        const acquired=selected.filter(r=>r.skills.includes('heavy-traverse-lanyard-1'));
        postMeasures={postAcquired:acquired.length,postUnacquired:selected.length-acquired.length,postAcquiredButUnused:acquired.filter(r=>!r.posts.length).length,actualPosts:total('posts'),actualPostedSamples:total('postedSamples'),paidPostedCrounds,maximumObservedPostedBodyTravel:maximumObservedBodyTravel,observedBodyTravelIncludesActualRecoil:true};
      }
      rows.push({map,seed,...(handling?{handling}:{}),pairs:9,wins:selected.filter(r=>r.phase==='victory').length,losses:selected.filter(r=>r.phase==='defeat').length,
        actualCasts:total('casts'),actualCrounds:total('shots'),actualReleases:total('releases'),actualClutchLifts:selected.reduce((n,r)=>n+(r.operations??[]).filter(o=>o.id==='heavy-clutch-lift').length,0),actualClutchEngagements:selected.reduce((n,r)=>n+(r.operations??[]).filter(o=>o.id==='heavy-clutch-engage').length,0),
        ...postMeasures,publishedConversionObservations:total('publishedConversionObservations'),issuedPrimaryReportsAtLiftedBoundary:total('primaryLiftReports'),
        rawTerminalShieldDifferences:paired.filter(c=>c.mismatches.includes('endingShield')).length,rawPostInputCounterDifferenceRows:family==='post'?paired.filter(c=>!c.rawAbsolutePostSequencesMatch).length:0,allCombatAndProgressionFieldsMatch:paired.every(c=>c.combatAndProgressionFieldsMatch),allMeasuredFieldsMatch:paired.every(c=>c.allMeasuredFieldsMatch)});
    }
    totalPairs+=expected;
  }
  families.push({family,pairs:expected*2,rows});
}
assert.equal(totalPairs,126);
for(const b of bindings){assert(!fs.existsSync(b.destination));fs.copyFileSync(b.file,b.destination,fs.constants.COPYFILE_EXCL);assert.equal(sha(fs.readFileSync(b.destination)),b.sha256);}
write(scope+'/natural-replay-summary.json',{
  passed:true,checkedAt:new Date().toISOString(),sourceCommit:source,runtimeSourceSha256:gate.runtimeSourceSha256,sourceSnapshotSha256:gate.sourceSnapshotSha256,protocol:73,contentRevision:gate.contentRevision,
  totalPairs:126,baselinePairs:72,newPostPairs:54,all126CombatAndProgressionFieldsMatch:true,all72OriginalNaturalRowsAnd72OriginalReplayRowsExact:true,
  rawPostInputCounterDifferencesRetained:true,originalPostComparisonHelpersRemainFailed:true,correctedIndependentPostComparisons:['gatehouse-2209','triage-yard-9027'].map(key=>({file:scope+'/post-replay-comparison31-'+key+'.json',sha256:sha(fs.readFileSync(scope+'/post-replay-comparison31-'+key+'.json'))})),controlledSourceTransportResetProof:'controlled-transport-reset31.json',
  families,bindings:bindings.map(({destination,sha256})=>({file:destination,sha256})),allMeasuredFieldsMatch:families.every(f=>f.rows.every(r=>r.allMeasuredFieldsMatch)),
  limits:[
    'Fresh source73 executions reproduce every measured value of all72 original source72 natural/replay pairs. The older executions keep their original runtime/source/test provenance.',
    'New54 pairs cover nine post carriage/optional-handling combinations beside three different legal27SP General plans on two seeded normal maps. Wins, losses, unacquired capstones and acquired-but-unused operations remain. One visible-state policy with conservative18px clearance against the actual9px body does not rank builds or isolate the cause of a win.',
    'Every measured combat/progression field, including combat-exit shield and new post positions/samples, is compared. A raw terminal shield difference is accepted only with an explicit observed issued final secretOffer Practice-reset provenance. Raw absolute post/clutch input sequences remain different and preserved: both must share one constant reset offset per combat encounter, with identical relative command gaps and every other post field. The actual source restore API separately restarts ack/input identity at0 in a labelled controlled lobby fixture; original natural ack boundaries were not recorded. These raw differences keep allMeasuredFieldsMatch false.',
    'All54 original post natural/restored simulations completed. Their original comparison helpers exited1 after comparing absolute input identities. Those failures, logs, raw rows and counters remain unchanged; independent comparison31 validates gameplay values without rewriting or rerunning the executions.',
    'Actual body travel while posted includes paid recoil and is not an isolated manual-evasion measure. Native whole-worker/peer tests separately measure more than5px of requested forward walking while the paid gun remains posted. Posted-round admissions do not independently attribute damage.',
    'Published conversion observations and lifted-boundary primary reports remain partial authoritative observations rather than complete conversion counters or damage attribution. No rendered/browser/device/native-language/listening/motion/human enjoyment/final-balance acceptance or class/game completion is claimed.',
  ],
});
console.log(JSON.stringify({passed:true,totalPairs:126,baselineRowsExact:72,newPostPairs:54,families}));
