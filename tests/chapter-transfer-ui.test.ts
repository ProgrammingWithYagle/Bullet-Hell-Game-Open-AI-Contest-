import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/shared/game.ts';
import type { ClassId } from '../src/shared/protocol.ts';
import catalog from '../content/catalog.json';
import editions from '../src/client/chapter-transfer-copy.json';
import { chapterTransferText } from '../src/client/chapter-transfer-text.ts';
import { inspectLocalChapterCheckpoint } from '../src/shared/chapter-transfer.ts';
import { encodeChapterTransfer, decodeChapterTransfer } from '../src/shared/chapter-transfer-format.ts';
import { OFFLINE_BOUNDARY_KEY } from '../src/client/storage.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';
function inspection(classId:ClassId='alchemist'){
 const g=new Game({mode:'story',maxPlayers:1,seed:41});g.addPlayer('solo','<b>Perrin</b>',classId);
 return inspectLocalChapterCheckpoint(g.offlineCheckpoint());
}
async function mounted(context:any,inspect:any=async(value:any)=>inspectLocalChapterCheckpoint(value),writeError=false){
 const env=menuEnvironment(context),ui=await menuBundle(context,'src/client/ui/chapter-transfer.ts');
 const old=JSON.stringify(inspection('soldier').checkpoint);env.saved.set(OFFLINE_BOUNDARY_KEY,old);
 env.host.innerHTML=ui.chapterTransferMarkup();let resumes=0;
 const store={getItem:(k:string)=>env.saved.get(k)??null,setItem:(k:string,v:string)=>{if(writeError)throw Error('quota');env.saved.set(k,v);}};
 const dispose=ui.bindChapterTransfer(env.host,()=>resumes++,store,inspect);env.cleanup.push(dispose);
 const q=(selector:string)=>env.host.querySelector(selector)! as any;
 const file=(text:()=>Promise<string>,size=1000)=>{
  const input=q('[data-checkpoint-import]');Object.defineProperty(input,'files',{configurable:true,value:[{size,text}]});
  return input.onchange();
 };
 return {...env,old,ui,dispose,q,file,resumes:()=>resumes};
}
test('Actual checkpoint controls preview a validated identity and training without writing, escape names, and resume only after explicit use',async context=>{
 const env=await mounted(context),incoming=inspection();
 await env.file(async()=>encodeChapterTransfer(incoming));
 assert.equal(env.saved.get(OFFLINE_BOUNDARY_KEY),env.old);assert.equal(env.resumes(),0);
 assert(env.q('[data-checkpoint-preview]').innerHTML.includes('&lt;b&gt;Perrin&lt;/b&gt;'));
 assert.equal(env.q('[data-checkpoint-preview]').querySelector('b'),null);
 assert.equal(env.q('[data-checkpoint-use]').disabled,false);
 env.q('[data-checkpoint-use]').click();assert.equal(env.resumes(),1);
 assert.equal(JSON.parse(env.saved.get(OFFLINE_BOUNDARY_KEY)!).player.classId,'alchemist');
 env.q('[data-checkpoint-use]').click();assert.equal(env.resumes(),1);
});
test('Malformed and oversized files never inspect or overwrite; stale and storage-failed uses preserve exact prior bytes and do not resume',async context=>{
 let inspected=0;
 const env=await mounted(context,async(value:any)=>{inspected++;return inspectLocalChapterCheckpoint(value);});
 await env.file(async()=>'{bad');assert.equal(inspected,0);
 await env.file(async()=>encodeChapterTransfer(inspection()),65537);assert.equal(inspected,0);
 assert.equal(env.saved.get(OFFLINE_BOUNDARY_KEY),env.old);assert.equal(env.q('[data-checkpoint-use]').disabled,true);
 await env.file(async()=>encodeChapterTransfer(inspection()));
 env.saved.set(OFFLINE_BOUNDARY_KEY,'newer-save');env.q('[data-checkpoint-use]').click();
 assert.equal(env.saved.get(OFFLINE_BOUNDARY_KEY),'newer-save');assert.equal(env.resumes(),0);
 assert.equal(env.q('[data-checkpoint-status]').textContent,chapterTransferText('en').changed);
 const failed=await mounted(context,async(value:any)=>inspectLocalChapterCheckpoint(value),true);
 await failed.file(async()=>encodeChapterTransfer(inspection()));failed.q('[data-checkpoint-use]').click();
 assert.equal(failed.saved.get(OFFLINE_BOUNDARY_KEY),failed.old);assert.equal(failed.resumes(),0);
 assert.equal(failed.q('[data-checkpoint-status]').textContent,chapterTransferText('en').storage);
});
test('A newer selected file wins over late reads; cancel and disposal prevent late inspection from exposing or installing a checkpoint',async context=>{
 let release!:(raw:string)=>void;const delayed=new Promise<string>(resolve=>{release=resolve;});
 const env=await mounted(context),old=env.file(()=>delayed);
 await env.file(async()=>encodeChapterTransfer(inspection('mage')));
 release(encodeChapterTransfer(inspection('alchemist')));await old;
 env.q('[data-checkpoint-use]').click();
 assert.equal(JSON.parse(env.saved.get(OFFLINE_BOUNDARY_KEY)!).player.classId,'mage');
 let inspectDone!:(value:any)=>void;
 const pending=await mounted(context,()=>new Promise(resolve=>{inspectDone=resolve;}));
 const read=pending.file(async()=>encodeChapterTransfer(inspection()));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(pending.q('[data-checkpoint-file-actions]').hidden,false);
 pending.q('[data-checkpoint-cancel]').click();pending.dispose();
 inspectDone(inspection());await read;
 assert.equal(pending.saved.get(OFFLINE_BOUNDARY_KEY),pending.old);assert.equal(pending.resumes(),0);
 assert.equal(pending.q('[data-checkpoint-preview]').hidden,true);
});
test('Export creates the actual validated local packet without mutating storage, and a disposed resume validation cannot launch',async context=>{
 const env=await mounted(context),descriptor=Object.getOwnPropertyDescriptor(URL,'createObjectURL'),revoke=URL.revokeObjectURL;
 let blob:Blob|undefined;Object.defineProperty(URL,'createObjectURL',{configurable:true,value:(value:Blob)=>{blob=value;return 'blob:checkpoint-test';}});
 URL.revokeObjectURL=()=>{};
 context.after(()=>{descriptor?Object.defineProperty(URL,'createObjectURL',descriptor):Reflect.deleteProperty(URL,'createObjectURL');URL.revokeObjectURL=revoke;});
 await env.q('[data-checkpoint-export]').onclick();
 assert(blob);const packet=decodeChapterTransfer(await blob.text()) as any;
 assert.equal(packet.player.classId,'soldier');assert.equal(env.saved.get(OFFLINE_BOUNDARY_KEY),env.old);
 let release!:(value:any)=>void;
 const pending=await mounted(context,()=>new Promise(resolve=>{release=resolve;}));
 const promise=pending.q('[data-checkpoint-resume]').onclick();pending.dispose();release(inspection('soldier'));await promise;
 assert.equal(pending.resumes(),0);assert.equal(pending.saved.get(OFFLINE_BOUNDARY_KEY),pending.old);
});
test('Transfer guidance has all fifteen editions, matching placeholders and explicit local-only scope',()=>{
 assert.deepEqual(Object.keys(editions).sort(),catalog.locales.map(l=>l.id).sort());
 const placeholders=(s:string)=>[...s.matchAll(/\{([A-Za-z]+)\}/g)].map(m=>m[1]).sort();
 for(const {id}of catalog.locales){
  const copy=chapterTransferText(id),english=chapterTransferText('en');
  assert.equal(Object.keys(copy).length,18);
  for(const key of Object.keys(english)as(keyof typeof english)[]){
   assert.equal(typeof copy[key],'string');assert(copy[key].trim().length>0);
   assert.deepEqual(placeholders(copy[key]),placeholders(english[key]));
  }
 }
 assert(chapterTransferText('en').replace.includes('replaces'));
 assert(chapterTransferText('en').local.includes('no online progress'));
});
