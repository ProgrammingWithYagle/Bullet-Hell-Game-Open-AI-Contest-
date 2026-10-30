import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,data} from '../src/shared/game.ts';
import {PROTOCOL} from '../src/shared/protocol.ts';
import {chatDeliveryText} from '../src/client/chat-delivery-text.ts';
import {formatMessage,type Message} from '../src/shared/messages.ts';
test('issued41local saves retain exact map/economy/build identity while unknown and authoritative envelopes stay strict',()=>{
 const g=new Game({mode:'endless',maxPlayers:1,openingArenaId:'triage-yard',arenaSelection:'randomRun'});g.addPlayer('solo','Mara','medic').coins=837;
 const old=g.offlineCheckpoint()!;old.protocolVersion=41;const copy=Game.restoreOffline(old).offlineCheckpoint()!;
 assert.equal(copy.protocolVersion,PROTOCOL);assert.deepEqual(copy.settings,old.settings);assert.deepEqual(copy.player,old.player);assert.equal(copy.arenaId,old.arenaId);
 assert.throws(()=>Game.restoreOffline({...old,contentRevision:'unknown'}),/versionMismatch/);assert.throws(()=>Game.restoreOffline({...old,serverOnly:true}),/versionMismatch/);
 assert.throws(()=>Game.restoreAuthoritative({...g.authoritativeCheckpoint(),protocolVersion:41}),/versionMismatch/);
});
test('every delivery state has a source-backed notice in all fifteen catalogs, with bounded cooldown formatting',()=>{
 for(const locale of data.locales){const catalog=JSON.parse(readFileSync('locales/'+locale.id+'.json','utf8'));const t=(key:string,args:Record<string,string|number>={})=>{assert(catalog.messages[key],key);return formatMessage(catalog.messages[key] as Message,locale.id,args);};
  for(const status of ['sending','sent','invalid','disabled','cooldown','unavailable','offline','uncertain'] as const){const text=chatDeliveryText({status,requestId:'',draft:'',retryAfterMs:1500},t);assert(text.length>0);assert(!text.includes('undefined'));assert(!text.includes('{seconds}'));}
 }
});
