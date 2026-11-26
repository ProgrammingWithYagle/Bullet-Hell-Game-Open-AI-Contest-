import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root = 'C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)';
const scope = 'reviews/heavy-tethered-traverse-2026-11-10';
process.chdir(root);
const [audience, group, variant] = process.argv.slice(2);
assert(['testing', 'public'].includes(audience)); assert(['guide', 'worker', 'room'].includes(group));
const read = (f:string) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = (b:Buffer|string) => createHash('sha256').update(b).digest('hex');
const sourceImport = (f:string) => import(pathToFileURL(root + '/' + f).href);
const source = fs.readFileSync(new URL('source-commit.txt', import.meta.url), 'utf8').trim();
const preview = read(scope + '/preview-' + audience + '.json'), manifest = read(preview.manifestPath);
assert.equal(preview.sourceCommit, source); assert.equal(preview.protocol, 73);
assert.equal(sha(fs.readFileSync(preview.manifestPath)), preview.manifestSha256);
const health = await fetch(preview.endpoint + '/api/health').then(r => r.json());
assert.equal(health.sourceCommit, source); assert.equal(health.protocolVersion, 73);
async function served(member:any) {
  assert(member); const response = await fetch(new URL(member.path, preview.url), {signal: AbortSignal.timeout(10000)});
  assert.equal(response.status, 200); const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(sha(bytes), member.sha256); return bytes;
}
let report:any;
if (group === 'guide') {
  const bindings:any[] = [];
  const main = manifest.members.find((m:any) => /\/index-.*\.js$/.test(m.path));
  const css = manifest.members.find((m:any) => /\/index-.*\.css$/.test(m.path));
  const english = manifest.members.filter((m:any) => /^assets\/en-.*\.js$/.test(m.path)).find((m:any) => /ui\.(?:errorLanguage|loadingLanguage)/.test(fs.readFileSync(path.join(manifest.root,m.path),'utf8')));
  for (const member of [main, css, english]) bindings.push({path: member.path, sha256: sha(await served(member))});
  const emblems:any[] = [];
  for (const folder of ['engineer-tree-2026-11-03','soldier-tree-2026-11-04','heavy-tree-2026-11-06']) {
    for (const asset of read('assets/production/ui/' + folder + '/provenance.json').assets) {
      const member = manifest.members.find((m:any) => m.sha256 === asset.sha256);
      emblems.push({id: asset.id, path: member?.path, sha256: sha(await served(member))});
    }
  }
  assert.equal(emblems.length, 64);
  const bodyLibrary = read('assets/production/motion/heavy-post-2026-11-10/library.json'), bodyTextures:any[] = [];
  for (const asset of [...bodyLibrary.textures, {...bodyLibrary.weapon,frames:[{index:0}]}]) {
    const member = manifest.members.find((m:any) => m.sha256 === asset.sha256);
    bodyTextures.push({key: asset.key, path: member?.path, sha256: sha(await served(member)), frames: asset.frames.length});
  }
  assert.equal(bodyTextures.length, 7);
  assert.equal(bodyLibrary.textures.reduce((n:number,t:any)=>n+t.frames.length,0),44);
  const proof = read(scope + '/source-verification.json');
  assert.equal(preview.sourceSnapshotSha256, proof.sourceSnapshotSha256);
  assert.equal(preview.runtimeSourceSha256, proof.runtimeSourceSha256);
  const files = [
    'heavy-flak-ui','heavy-flak-handling-ui','heavy-seam-ui','heavy-seam-presentation','heavy-traverse-ui','heavy-traverse-presentation',
    'heavy-clutch-ui','heavy-clutch-presentation','heavy-clutch-sound','heavy-clutch-handling-ui','heavy-clutch-handling-prediction','heavy-clutch-handling-presentation',
    'heavy-post-menu','heavy-post-controls','heavy-post-prediction','heavy-post-presentation','heavy-post-renderer','heavy-post-scene','heavy-post-feedback',
  ].map(n => 'tests/' + n + '.test.ts');
  const result = spawnSync(process.execPath, ['--import','tsx','--test',...files], {encoding:'utf8',maxBuffer:8*1024*1024});
  const log = (result.stdout ?? '') + (result.stderr ?? '');
  fs.writeFileSync(scope + '/guide-source-dom-' + audience + '.log', log, {flag:'wx'});
  assert.equal(result.status, 0, log.slice(-4000));
  const counts = Object.fromEntries(['tests','pass','fail','cancelled','skipped'].map(k=>[k,Number(log.match(new RegExp('ℹ '+k+'\\s+(\\d+)'))?.[1])]));
  assert.deepEqual(counts,{tests:84,pass:84,fail:0,cancelled:0,skipped:0});
  report = {
    passed:true, ...counts, sourceBoundNativeMenuDOM:true, sourceBoundUIControlCases:84, retainedSourceUICases:63, newPostSourceUICases:21,
    actualShort3SPAndTwoPurchases:true, actualRaid12SPAndFourPurchases:true, remappedKeyboardAndGamepad:true, inspectionDoesNotBuy:true,
    bindings, servedEmblemHashes:emblems, servedPostTextures:bodyTextures,
    limits:[
      'Exact served main/CSS/English, all64 emblems and seven native post textures are HTTP hash-bound. The84 source tests run their actual bound MenuDOM, controls, prediction, presentation, Scene adapter and finite sound fixtures.',
      'Late15/19/21/27SP and body/cover/boss state in controlled UI/Game fixtures remain controlled. Actual earned Short3→9→15→21 purchases are separately proved in the whole optimized-worker and real-peer cases.',
      'Source MenuDOM uses explicit asset/i18n stubs. It does not execute rendered optimized main UI or claim browser/device/native-language/listening/motion/human/final-balance acceptance.',
    ],
  };
} else {
  const allowed = ['cover',group==='worker'?'fuse':'exit','compact','frontal','running','hanging','seam-manual','seam-running','seam-hanging','traverse-loose','traverse-spade','traverse-floating','clutch-loose','clutch-spade','clutch-floating','handling-keyed-loose','handling-keyed-spade','handling-keyed-floating','handling-open-loose','handling-open-spade','handling-open-floating',
    ...['standard','keyed','open'].flatMap(h=>['loose','spade','floating'].map(m=>'post-'+h+'-'+m))];
  assert(allowed.includes(variant));
  const [prefix, choice, mode] = variant.split('-');
  const ids = await sourceImport('src/shared/heavy-traverse.ts');
  const handling = choice === 'keyed' ? ids.keyedId : choice === 'open' ? ids.openId : undefined;
  let code:string|undefined, worker:any;
  if(group==='worker') { worker=manifest.members.find((m:any)=>/offline\.worker-.*\.js$/.test(m.path));code=(await served(worker)).toString(); }
  const input = group === 'worker' ? code : preview.endpoint;
  if(prefix==='post') report=await(await sourceImport('tests/helpers/heavy-post-'+(group==='worker'?'worker':'peer')+'-flow.ts'))[group==='worker'?'earnedPostWorkerFlow':'earnedPostPeerFlow'](input,mode,handling,'short');
  else if(prefix==='handling') report=await(await sourceImport('tests/helpers/heavy-clutch-handling-'+(group==='worker'?'worker':'peer')+'-flow.ts'))[group==='worker'?'earnedClutchHandlingWorkerFlow':'earnedClutchHandlingPeerFlow'](input,mode,handling,'short');
  else if(prefix==='clutch') report=await(await import(new URL('retained-clutch-'+(group==='worker'?'worker':'peer')+'.mts',import.meta.url).href))[group==='worker'?'earnedClutchWorkerFlow':'earnedClutchPeerFlow'](input,choice);
  else if(prefix==='traverse') report=await(await import(new URL('retained-traverse-'+(group==='worker'?'worker':'peer')+'05.mts',import.meta.url).href))[group==='worker'?'earnedTraverseWorkerFlow':'earnedTraversePeerFlow'](input,choice);
  else if(prefix==='seam') report=await(await import(new URL('retained-seam-'+(group==='worker'?'worker':'peer')+'.mts',import.meta.url).href))[group==='worker'?'seamWorkerFlow':'seamPeerFlow'](input,choice);
  else if(['running','hanging'].includes(variant)) report=group==='worker'?await(await sourceImport('tests/helpers/heavy-flak-handling-worker-flow.ts')).heavyFlakHandlingWorkerFlow(input,variant):await(await import(new URL('earned-menu-flow.mts',import.meta.url).href)).earnedMenuPeerFlow(input,variant);
  else report=await(await sourceImport('tests/helpers/heavy-flak-'+(group==='worker'?'worker':'peer')+'-flow.ts'))[group==='worker'?'heavyFlakWorkerFlow':'heavyFlakPeerFlow'](input,variant);
  assert(report.passed);
  if(group==='worker') { assert.equal(report.workerPatched,false);report={...report,wholeExactServedOptimizedWorker:true,servedWorker:{path:worker.path,sha256:worker.sha256}}; }
  else assert(report.noCheckpointUploaded&&(report.ownerOnlyFriendlyFlightAndRemoval||report.ownerOnlyFriendlyStreamsAndStoppedUpdates||report.ownerOnlyFriendlyFlightsStopsAndRemovals||report.ownerOnlyFriendlyFlightsAndRemovals));
}
report={checkedAt:new Date().toISOString(),audience,sourceCommit:source,protocol:73,contentRevision:preview.contentRevision,group,...(variant?{variant}:{}),...report};
fs.writeFileSync(scope+'/native01-'+group+'-'+audience+(variant?'-'+variant:'')+'.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,audience,group,variant,sourceCommit:source,...(group==='guide'?{cases:84,servedEmblems:64,servedPostTextures:7}:{actualPurchases:report.actualAcceptedPurchases})}));
