import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Game,data} from '../src/shared/game.ts';
import {viewOf} from '../src/shared/view.ts';
import {PROTOCOL,CONTENT_REVISION,idleInput} from '../src/shared/protocol.ts';
import {runResultModel} from '../src/client/ui/run-results.ts';
import {passwordToggleMarkup,hostPasswordMarkup,bindPasswordVisibility} from '../src/client/ui/password-visibility.ts';
import {HostMatchUI} from '../src/client/host-match-ui.ts';
import {RoomInviteUI} from '../src/client/room-invite-ui.ts';
import {waitingRoomMarkup} from '../src/client/ui/waiting-room.ts';
import {menuEnvironment} from './helpers/menu-fixture.ts';
import {promptRoomPassword} from '../src/client/ui/room-password.ts';
import type {Session} from '../src/client/session.ts';
const t=(key:string)=>key;

test('password eye buttons reveal exact typed text without submitting or changing it; cancel clears the form',context=>{
 const env=menuEnvironment(context),joins:string[]=[];promptRoomPassword(env.host as unknown as HTMLElement,t,password=>joins.push(password));
 const input=env.host.querySelector('#join-room-password')!,eye=env.host.querySelector('[data-password-toggle]')!;
 input.value=' Case 密碼 ';input.setSelectionRange(2,4);assert.equal(input.type,'password');assert.equal(eye.type,'button');eye.click();
 assert.equal(input.type,'text');assert.equal(input.value,' Case 密碼 ');assert.equal(eye.getAttribute('aria-label'),'ui.hidePassword');assert.equal(eye.getAttribute('aria-pressed'),'true');assert.equal(input.selectionStart,2);assert.equal(joins.length,0);
 eye.click();assert.equal(input.type,'password');assert.equal(input.value,' Case 密碼 ');env.host.querySelector('[data-password-cancel]')!.click();assert.equal(input.value,'');assert.equal(env.host.querySelector('dialog'),null);
});

test('host invite and waiting-room password controls render only the authorized value and clear it on owner change',context=>{
 const env=menuEnvironment(context),g=new Game();g.addPlayer('host','Mara','soldier');g.addPlayer('guest','Fin','medic');const view=viewOf(g,'host'),secret=' <Host & password> ';
 assert.equal(hostPasswordMarkup(undefined,'private',t),'');assert(passwordToggleMarkup('private',t).includes('aria-controls="private"'));
 const guest=waitingRoomMarkup(view,'guest','ABCDEF',t,String,undefined,true,secret);assert(!guest.includes('Host &amp; password'));assert(!guest.includes('waiting-room-password'));
 const host=waitingRoomMarkup(view,'host','ABCDEF',t,String,undefined,true,secret);assert(host.includes('waiting-room-password'));assert(host.includes('&lt;Host &amp; password&gt;'));
 const invite=new RoomInviteUI(env.host as unknown as HTMLElement,t,()=>{});context.after(()=>invite.destroy());invite.update('ABCDEF',secret);
 const input=env.host.querySelector('#invite-room-password')!;assert.equal(input.type,'password');assert.equal(input.value,secret);env.host.querySelector('[data-password-toggle]')!.click();assert.equal(input.type,'text');
 invite.update('ABCDEF');assert.equal(env.host.querySelector('#invite-room-password'),null);assert(!invite.root.innerHTML.includes(secret));
});

test('explicit host buttons send Pause/Continue, menu state alone sends nothing, and ending needs confirmation',context=>{
 const env=menuEnvironment(context),menuButton=env.document.createElement('button'),menu=env.document.createElement('section');env.host.append(menuButton,menu);
 const commands:unknown[]=[];const g=new Game();g.addPlayer('host','Mara','soldier');g.start();
 const session={isHost:true,view:viewOf(g,'host'),setMatchPaused:(value:boolean)=>commands.push(['pause',value]),endMatch:()=>commands.push(['end'])};
 const ui=new HostMatchUI(session as unknown as Session,env.host as unknown as HTMLElement,menuButton as unknown as HTMLElement,menu as unknown as HTMLElement,t);context.after(()=>ui.destroy());ui.update();
 assert.deepEqual(commands,[]);env.host.querySelector('#host-pause-match')!.click();assert.deepEqual(commands,[['pause',true]]);
 session.view.matchPaused=true;ui.update();env.host.querySelector('[data-host-pause]')!.click();assert.deepEqual(commands.at(-1),['pause',false]);
 env.host.querySelector('[data-host-end]')!.click();assert.equal(commands.length,2);assert.equal(env.document.activeElement?.attrs['data-end-cancel'],'');env.host.querySelector('[data-end-cancel]')!.click();assert.equal(commands.length,2);
 env.host.querySelector('[data-host-end]')!.click();env.host.querySelector('[data-end-confirm]')!.click();assert.deepEqual(commands.at(-1),['end']);
 session.isHost=false;ui.update();assert.equal(env.host.querySelector('#host-pause-match')!.hidden,true);assert.equal(env.host.querySelector('.host-match-controls')!.hidden,true);
});

test('ending an encounter clears queued actions without inventing a clear or a player-down reason',()=>{
 const g=new Game(),p=g.addPlayer('host','Mara','soldier');g.start();g.submitInput(p.id,{...idleInput(),sequence:1,fire:true,moveX:1});g.clearInputs();assert.equal(p.pending.length,0);assert.equal(p.ack,1);assert.equal(p.input.fire,false);assert.equal(g.encounter,0);
 const health=p.health;assert(g.endByHost());assert.equal(g.phase,'defeat');assert.equal(g.encounter,0);assert.equal(p.progress.clears,0);assert.equal(p.health,health);assert.equal(g.endByHost(),false);
 const view=viewOf(g,p.id);view.endedByHost=true;assert.equal(runResultModel(view,view.players[0]).reason,null);
});

test('issued42local Practice keeps build/map/economy identity while server checkpoints remain strict',()=>{
 assert.equal(PROTOCOL,43);const g=new Game({mode:'endless',arenaSelection:'randomRun',openingArenaId:'triage-yard'});g.addPlayer('solo','Mara','medic').coins=731;
 const old=g.offlineCheckpoint()!;old.protocolVersion=42;const current=Game.restoreOffline(old).offlineCheckpoint()!;assert.equal(current.protocolVersion,43);assert.deepEqual(current.player,old.player);assert.deepEqual(current.settings,old.settings);assert.equal(current.arenaId,old.arenaId);
 assert.throws(()=>Game.restoreOffline({...old,contentRevision:'unknown'}),/versionMismatch/);assert.throws(()=>Game.restoreOffline({...old,serverOnly:true}),/versionMismatch/);assert.throws(()=>Game.restoreAuthoritative({...g.authoritativeCheckpoint(),protocolVersion:42}),/versionMismatch/);assert.equal(old.contentRevision,CONTENT_REVISION);
});

test('all fifteen catalogs include the exact authored host-control and password notices',async()=>{
 const {hostControlMessages}=await import(pathToFileURL(resolve('locales/source/host-controls.mjs')).href);
 for(const {id} of data.locales){const messages=JSON.parse(readFileSync('locales/'+id+'.json','utf8')).messages;for(const [key,value] of Object.entries(hostControlMessages(id)))assert.equal(messages[key],value);}
});
