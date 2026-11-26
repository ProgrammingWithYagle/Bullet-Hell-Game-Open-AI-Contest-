import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/shared/game.ts';
import { idleInput, implementedClassIds, type ClassId } from '../src/shared/protocol.ts';
import { distance } from '../src/shared/geometry.ts';
import { inspectLocalChapterCheckpoint } from '../src/shared/chapter-transfer.ts';
import { decodeChapterTransfer, encodeChapterTransfer, CHAPTER_TRANSFER_KIND } from '../src/shared/chapter-transfer-format.ts';
import { installChapterCheckpoint, localChapterCandidate } from '../src/client/chapter-transfer.ts';
import { OFFLINE_BOUNDARY_KEY } from '../src/client/storage.ts';
function fresh(classId:ClassId='soldier'){
 const g=new Game({mode:'story',maxPlayers:1,seed:41,runId:'transfer-story'});g.addPlayer('solo','Named traveller',classId);return g;
}
function leave(g:Game,phase:string){
 for(let n=0;g.phase===phase&&n<250;n++)g.step();
 assert.notEqual(g.phase,phase);
}
function ready(g:Game){assert(g.vote('solo',1));leave(g,g.phase);}
function earnedBoundary(){
 const g=fresh(),p=g.players.get('solo')!;
 const fighting=()=>g.phase==='combat';
 assert(g.start());g.boss.health=0;g.step();ready(g);
 assert.equal(g.phase,'contractVote');g.vote(p.id,2);leave(g,'contractVote');
 assert(g.transact(p.id,{id:'study',kind:'study',item:'soldier-command-1'}).ok);
 ready(g);leave(g,'loading');p.invulnerableUntil=1e9;
 // Deliberate gate defeat isolates transfer rules. The ordinary proof below is
 // earned by actual primary hits in an actual owned Rally Field and a real clear.
 for(let n=0;fighting()&&n<5400;n++){
  const target=[...g.minions.actors.values()].sort((a,b)=>distance(a,p)-distance(b,p))[0];
  g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,aim:target?Math.atan2(target.y-p.y,target.x-p.x):0,fire:!!target,q:!!target&&distance(target,p)<450});
  g.step();
 }
 assert.equal(g.phase,'storyScene');assert.equal(g.trainingFor(p.id)!.proofs.length,1);
 ready(g);assert.equal(g.phase,'shop');
 assert(g.transact(p.id,{id:'prepare',kind:'prepare',item:'soldier-command-1'}).ok);
 assert(g.transact(p.id,{id:'gear',kind:'upgrade',item:'damage'}).ok);
 return g;
}
test('A portable local chapter preserves an actual earned proof, preparation, route, scarce equipment money and identity without adding SP',()=>{
 const g=earnedBoundary(),issued=g.offlineCheckpoint()!,before=JSON.stringify(issued);
 const inspected=inspectLocalChapterCheckpoint(issued);
 assert.equal(JSON.stringify(issued),before);
 assert.deepEqual(inspected.summary,{classId:'soldier',name:'Named traveller',difficulty:'normal',chapterId:'one-place-left',stage:'prepare',completedObjectives:2,learned:1,proven:1,prepared:1});
 const round=inspectLocalChapterCheckpoint(decodeChapterTransfer(encodeChapterTransfer(inspected)));
 assert.deepEqual(round,inspected);
 const restored=Game.restoreOffline(round.checkpoint),p=restored.players.get('solo')!;
 assert.deepEqual(restored.chapter,g.chapter);assert.deepEqual(restored.trainingFor(p.id),g.trainingFor('solo'));
 assert.equal(p.totalSp,0);assert.equal(p.coins,issued.player.coins);
 assert.equal(p.upgrades.damage,1);assert.equal(restored.stats(p).ability,g.stats(g.players.get('solo')!).ability);
 assert.deepEqual(restored.mutations,[]);
});
test('All twelve identities can transfer local chapters; issued Ranger-era chapters migrate without admitting a later Alchemist forgery',()=>{
 for(const id of implementedClassIds)assert.equal(inspectLocalChapterCheckpoint(fresh(id).offlineCheckpoint()).summary.classId,id);
 const old=fresh('ranger').offlineCheckpoint()!;
 old.protocolVersion=48;
 old.contentRevision='8bda5e247f3df132a9c80f244fd8a7c2b3eaf468e2c6a8927f87a35937fbe110';
 assert.equal(inspectLocalChapterCheckpoint(old).summary.classId,'ranger');
 const forged=fresh('alchemist').offlineCheckpoint()!;forged.contentRevision=old.contentRevision;forged.protocolVersion=48;
 assert.throws(()=>inspectLocalChapterCheckpoint(forged));
});
test('Transfer framing and complete restore checks reject wrong formats, combat, Free Play, legacy SP Story and inconsistent training',()=>{
 const initial=fresh().offlineCheckpoint()!,raw=encodeChapterTransfer(inspectLocalChapterCheckpoint(initial));
 for(const value of ['{bad',JSON.stringify(initial),JSON.stringify({schemaVersion:1,kind:CHAPTER_TRANSFER_KIND,checkpoint:initial,extra:true}),raw+' '.repeat(65536)])
  assert.throws(()=>decodeChapterTransfer(value));
 const free=new Game();free.addPlayer('solo','Mara','soldier');
 const legacy=new Game({mode:'story'},true);legacy.addPlayer('solo','Mara','soldier');
 for(const value of [free.offlineCheckpoint(),legacy.offlineCheckpoint(),{...initial,phase:'combat'}, {...initial,player:{...initial.player,totalSp:27}}, {...initial,player:{...initial.player,training:{...initial.player.training,characterId:'perrin-moss'}}}])
  assert.throws(()=>inspectLocalChapterCheckpoint(value));
 const owned=earnedBoundary().offlineCheckpoint()!;
 owned.chapter!.participation.solo=[];
 assert.throws(()=>inspectLocalChapterCheckpoint(owned));
});
test('Explicit installation is one local write; stale or failed writes preserve the previous resume slot and unrelated journal/profile bytes',()=>{
 const values=new Map([[OFFLINE_BOUNDARY_KEY,'earlier-save'],['ga-story-chapters-v1','journal-bytes'],['profile','profile-bytes']]);
 const store={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const inspected=inspectLocalChapterCheckpoint(fresh('alchemist').offlineCheckpoint());
 assert.throws(()=>installChapterCheckpoint(inspected,'stale-save',store),/chapterCheckpointChanged/);
 assert.equal(values.get(OFFLINE_BOUNDARY_KEY),'earlier-save');
 assert.throws(()=>installChapterCheckpoint(inspected,'earlier-save',{...store,setItem:()=>{throw Error('quota');}}));
 assert.equal(values.get(OFFLINE_BOUNDARY_KEY),'earlier-save');
 installChapterCheckpoint(inspected,'earlier-save',store);
 assert.equal((localChapterCandidate(store) as any).player.classId,'alchemist');
 assert.equal(values.get('ga-story-chapters-v1'),'journal-bytes');assert.equal(values.get('profile'),'profile-bytes');
});
