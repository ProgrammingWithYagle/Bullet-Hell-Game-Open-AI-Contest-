// Real clients against a frozen server. No browser or privileged scene manipulation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Session } from '../src/client/session.ts';
import { idleInput } from '../src/shared/protocol.ts';
import motion from '../assets/delivery/survivor-motion-v1/library.json' with {type:'json'};
import portraits from '../assets/delivery/selection-portraits-v1/library.json' with {type:'json'};
import items from '../assets/production/items/library.json' with {type:'json'};
const [audience,scope]=process.argv.slice(2);
assert(['testing','public'].includes(audience));assert(/^reviews\/[a-z0-9-]+$/.test(scope));
const manifest=JSON.parse(fs.readFileSync(scope+'/preview-'+audience+'.json','utf8'));
const files=JSON.parse(fs.readFileSync(manifest.manifestPath,'utf8')).members as {path:string;sha256:string}[];
const wait=async(check:()=>boolean,label:string)=>{
 const end=Date.now()+10000;while(!check()){assert(Date.now()<end,label);await new Promise(r=>setTimeout(r,15));}
};
const sampled=[
 ...['alchemist-run-south','alchemist-brew-north','alchemist-throw-east','alchemist-attack-west','alchemist-downed-west'].map(id=>motion.entries.find(e=>e.id===id)!.atlasSha256),
 portraits.entries.find(e=>e.classId==='alchemist')!.imageSha256,
 ...['alchemist-0','alchemist-sample-case','mixtures-path-2'].map(id=>items.entries.find(e=>e.itemId===id)!.atlasSha256),
 createHash('sha256').update(fs.readFileSync('assets/production/ui/resources/alchemist-samples-v1.png')).digest('hex'),
];
const a=new Session(manifest.endpoint),b=new Session(manifest.endpoint),late=new Session(manifest.endpoint),story=new Session(manifest.endpoint);
let sequence=1;
try{
 for(const hash of sampled){
  const file=files.find(f=>f.sha256===hash);assert(file);
  const response=await fetch(new URL(file.path,manifest.url));assert(response.ok);
  assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),hash);
 }
 const options={name:'Perrin review',classId:'alchemist' as const,mode:'raid' as const,difficulty:'normal'};
 await a.connect(options);await b.connect({...options,name:'Another maker'},{roomId:a.room!.roomId,kind:'freeplay'});
 await wait(()=>b.view?.players.length===2,'Alchemist roster missing');
 assert(b.view!.players.every(p=>p.weapon==='alchemist-0'&&p.sp===12));
 a.purchase({kind:'skill',item:'alchemist-mixtures-1'});
 await wait(()=>b.view?.players.find(p=>p.id===a.id)?.skills.includes('alchemist-mixtures-1')===true,'Owned mixture purchase missing');
 assert.equal(b.view!.players.find(p=>p.id===b.id)!.sp,12);
 a.start();await wait(()=>b.view?.phase==='combat','Alchemist combat missing');
 a.input({...idleInput(),sequence:sequence++,q:true});
 await wait(()=>(b.view?.players.find(p=>p.id===a.id)?.kit.alchemyBrewUntil??0)>b.view!.combatTick,'Brew commitment missing');
 const stock=b.view!.players.find(p=>p.id===a.id)!.kit;
 assert.equal(stock.alchemyCinder,2);assert.equal(stock.alchemyChalk,2);
 assert.equal(b.view!.players.find(p=>p.id===b.id)!.kit.alchemyCinder,3);
 await wait(()=>b.view?.players.find(p=>p.id===a.id)?.kit.alchemyPrepared?.[0]==='flare','Recipe-locked vial missing');
 a.selectAlchemy('binding');
 await wait(()=>b.view?.players.find(p=>p.id===a.id)?.kit.alchemyRecipe==='binding','Owned recipe selection missing');
 assert.deepEqual(b.view!.players.find(p=>p.id===a.id)!.kit.alchemyPrepared,['flare'],'Selection cannot transmute an existing vial');
 const p=b.view!.players.find(p=>p.id===a.id)!;
 a.throwAlchemy({x:p.x,y:p.y});
 await wait(()=>b.view?.classCues.some(c=>c.owner===a.id&&c.kind==='alchemy-flask')===true,'Actual flask flight missing');
 const flight=b.view!.classCues.find(c=>c.owner===a.id&&c.kind==='alchemy-flask')!;
 assert(flight.kind==='alchemy-flask');assert.equal(flight.recipe,'flare');
 assert(Math.hypot(flight.x2-p.x,flight.y2-p.y)<.01,'Self placement must remain intentional');
 a.input({...idleInput(),sequence:sequence++,aim:Math.PI});
 await wait(()=>b.view?.classCues.some(c=>c.owner===a.id&&c.kind==='alchemy-pool')===true,'Actual owned pool missing');
 const pool=b.view!.classCues.find(c=>c.owner===a.id&&c.kind==='alchemy-pool')!;
 assert(pool.kind==='alchemy-pool');assert.equal(pool.recipe,'flare');
 assert.equal(pool.x,flight.x2);assert.equal(pool.y,flight.y2);
 assert.equal(b.view!.players.find(p=>p.id===a.id)!.kit.alchemyPrepared!.length,0);
 a.input({...idleInput(),sequence:sequence++,ultimate:true});
 await wait(()=>b.view?.players.find(p=>p.id===a.id)?.kit.alchemyBatchCharges===3,'Finite batch charges missing');
 assert.equal(b.view!.players.find(p=>p.id===b.id)!.kit.alchemyBatchCharges,0);
 a.setMatchPaused(true);await wait(()=>b.view?.matchPaused===true,'Alchemist pause missing');
 const state=structuredClone(b.view!.players.find(p=>p.id===a.id)!.kit),before=JSON.stringify({tick:b.view!.combatTick,cues:b.view!.classCues,state});
 a.selectAlchemy('mending');a.throwAlchemy({x:p.x,y:p.y});
 a.input({...idleInput(),sequence:sequence++,fire:true,q:true,e:true,ultimate:true});
 await new Promise(r=>setTimeout(r,180));
 assert.equal(JSON.stringify({tick:b.view!.combatTick,cues:b.view!.classCues,state:b.view!.players.find(p=>p.id===a.id)!.kit}),before);
 await late.connect({...options,name:'Late observer',classId:'soldier'},{roomId:a.room!.roomId,kind:'freeplay'});
 await wait(()=>late.view?.players.length===3&&late.view.matchPaused===true,'Alchemist late observer missing');
 assert.deepEqual(late.view!.players.find(p=>p.id===a.id)!.kit,state);
 assert(late.view!.classCues.some(c=>c.owner===a.id&&c.kind==='alchemy-pool'));
 await a.close();await wait(()=>b.view?.classCues.every(c=>c.owner!==a.id)===true,'Disconnected mixtures retained');
 await b.close();await late.close();
 await story.connect({...options,mode:'story'});
 await wait(()=>story.view?.players.length===1,'Alchemist chapter missing');
 const chapter=story.view!.players[0];assert(story.view!.chapter);assert.equal(chapter.sp,0);
 assert.equal(chapter.training?.characterId,'perrin-moss');assert.equal(chapter.training?.proofs.length,0);
 await story.close();
 const receipt={checkedAt:new Date().toISOString(),passed:true,audience,sourceCommit:manifest.sourceCommit,endpoint:manifest.endpoint,actualHttpArtSamples:sampled.length,peers:3,ownerOnlySpPurchase:true,actualStockReservation:true,recipeLockedVial:true,intentionalSelfPlacement:true,immutableActualFlightAndPool:true,finiteOwnedBatchCharges:true,pauseFreezesStockPoolsAndCharges:true,lateObserverReceivesActualState:true,disconnectClearsOwnership:true,storySpZero:true,storyCharacterIdentity:true,noFabricatedProof:true,probeRoomsClosed:true,limits:[
  'Frozen asset/entry/recipe/commitment/landing/pool/ownership/pause/observer/cleanup checks. Actual useful damage/healing, legal combinations, charge spending and earned ordinary proofs are separate source/Game/network evidence.',
  'No rendered clients, listening, device, native-language, personally played clear or final balance acceptance.'
 ]};
 fs.writeFileSync(scope+'/alchemist-smoke-'+audience+'.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{await Promise.allSettled([a.close(),b.close(),late.close(),story.close()]);}
