import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {createServer, type RequestListener} from 'node:http';
import {randomUUID} from 'node:crypto';
import {menuBundle,menuEnvironment} from './helpers/menu-fixture.ts';
import {CONTENT_REVISION,PROTOCOL} from '../src/shared/protocol.ts';
import {RECORD_RULES,RECORD_SEASON,type RankedTeamRecord} from '../src/shared/team-records.ts';
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
async function until(check:()=>boolean){const deadline=Date.now()+2500;while(!check()){if(Date.now()>deadline)throw Error('Timed out');await tick();}}
async function http(t:TestContext,handler:RequestListener){const server=createServer(handler);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert(address&&typeof address!=='string');t.after(async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});return 'http://127.0.0.1:'+address.port;}
const health={protocolVersion:PROTOCOL,contentRevision:CONTENT_REVISION,audience:'public'};
const hooks=(launches:unknown[][])=>({resume(){},launch:(...args:unknown[])=>launches.push(args),profileChanged:async()=>{},settingsHTML:()=>'<details></details>',bindSettings(){}});

test('compiled room search shows the version error, retries, then aborts when the player goes back',{timeout:12000},async t=>{
 const env=menuEnvironment(t);let version=PROTOCOL-1,hold=false,pending=false,aborted=false;
 const endpoint=await http(t,(request,response)=>{
  if(hold){pending=true;response.on('close',()=>{aborted=true;});return;}
  response.setHeader('Content-Type','application/json');response.end(JSON.stringify(request.url==='/api/health'?{...health,protocolVersion:version}:[]));
 });
 const launches:unknown[][]=[];
 // The LAN selection supplies a real temporary endpoint; it is not a public game server.
 const lanStubs={'lan.ts':`export const desktopText=key=>key;export function mountLan(host,back,connected){host.innerHTML='<button id="fixture-server">Server</button>';host.querySelector('#fixture-server').onclick=()=>connected(${JSON.stringify(endpoint)});return ()=>{};}`,'desktop.ts':`export const desktopBridge=()=>({});`};
 const setup=await menuBundle(t,'src/client/ui/setup.ts',lanStubs);
 const dispose=setup.mountSetup(env.host,hooks(launches));env.cleanup.push(dispose);
 env.host.querySelector('#lan')!.click();env.host.querySelector('#fixture-server')!.click();
 await until(()=>env.host.querySelector('#rooms')?.textContent==='ui.errorVersion');
 const name=env.host.querySelector('#name')!;name.value='Preserved name';name.dispatch('input');
 const classPick=env.host.querySelector('#join-class')!;classPick.value='medic';
 version=PROTOCOL;env.host.querySelector('#refresh')!.click();await until(()=>env.host.querySelector('#rooms')?.textContent==='ui.noRooms');
 assert.equal(name.value,'Preserved name');assert.equal(classPick.value,'medic');assert.equal(launches.length,0);
 hold=true;env.host.querySelector('#refresh')!.click();await until(()=>pending);env.host.querySelector('#back-home')!.click();
 await until(()=>aborted);assert(env.host.querySelector('#new-run'));assert.equal(launches.length,0);
});

test('code lookup keeps actionable errors and disposal cancels without a late launch',{timeout:12000},async t=>{
 const env=menuEnvironment(t);let codeStatus=503,hold=false,pending=false,aborted=false;
 const endpoint=await http(t,(request,response)=>{
  response.setHeader('Content-Type','application/json');
  if(request.url==='/api/health')return response.end(JSON.stringify(health));
  if(request.url==='/api/rooms')return response.end('[]');
  if(hold){pending=true;response.on('close',()=>{aborted=true;});return;}
  response.writeHead(codeStatus).end('{}');
 });
 const setup=await menuBundle(t,'src/client/ui/setup.ts',{'lan.ts':`export const desktopText=key=>key;export function mountLan(host,back,connected){host.innerHTML='<button id="fixture-server">Server</button>';host.querySelector('#fixture-server').onclick=()=>connected(${JSON.stringify(endpoint)});return ()=>{};}`,'desktop.ts':`export const desktopBridge=()=>({});`});
 const launches:unknown[][]=[],dispose=setup.mountSetup(env.host,hooks(launches));env.cleanup.push(dispose);
 env.host.querySelector('#lan')!.click();env.host.querySelector('#fixture-server')!.click();await until(()=>env.host.querySelector('#rooms')?.textContent==='ui.noRooms');
 env.host.querySelector('#code')!.value='ABCDEF';env.host.querySelector('#join-code')!.click();await until(()=>env.host.querySelector('#notice')?.textContent==='ui.errorServer');
 codeStatus=404;env.host.querySelector('#join-code')!.click();await until(()=>env.host.querySelector('#notice')?.textContent==='ui.errorCode');
 hold=true;env.host.querySelector('#join-code')!.click();await until(()=>pending);dispose();await until(()=>aborted);
 assert.equal(launches.length,0);assert.equal(env.host.querySelector('#notice')!.textContent,'ui.errorCode');
});

test('leaving the online records tab aborts its real pending board request',{timeout:10000},async t=>{
 const env=menuEnvironment(t);let pending=false,aborted=false;
 const endpoint=await http(t,(_request,response)=>{pending=true;response.on('close',()=>{aborted=true;});});
 const ui=await menuBundle(t,'src/client/ui/leaderboards.ts');const dispose=ui.mountLeaderboards(env.host,()=>{},endpoint);env.cleanup.push(dispose);
 env.host.querySelector('#records-online')!.click();await until(()=>pending);env.host.querySelector('#records-local')!.click();await until(()=>aborted);
 assert(env.host.querySelector('#records-mode'));assert.equal(env.host.querySelector('[data-record-status]'),null);
});

test('existing rows still open after pagination and changing filters aborts roster requests',{timeout:10000},async t=>{
 const env=menuEnvironment(t);let rosterPending=false,rosterAborted=false,rosterCalls=0;
 const record=():RankedTeamRecord=>({runId:randomUUID(),rank:1,score:900000,mode:'short',difficulty:'normal',contentRevision:CONTENT_REVISION,rules:RECORD_RULES,season:RECORD_SEASON,peakPlayers:1,sizeBand:'solo',clears:5,combatTicks:100,lastClearTicks:100,deadlineTicks:200,damageMilli:0,healthMilli:100000,lastClearDamageMilli:0,lastClearHealthMilli:100000,survivors:1,rosterCount:1,endedAt:Date.now(),secretCleared:false});
 const first=record(),second=record();
 const endpoint=await http(t,(request,response)=>{
  const url=new URL(request.url!,'http://fixture');response.setHeader('Content-Type','application/json');
  if(url.pathname!=='/api/leaderboards'){rosterCalls++;rosterPending=true;response.on('close',()=>{rosterAborted=true;});return;}
  const offset=Number(url.searchParams.get('offset')),week=url.searchParams.has('week');
  response.end(JSON.stringify({scope:'server',persistent:true,contentRevision:CONTENT_REVISION,season:RECORD_SEASON,rules:RECORD_RULES,mode:'short',difficulty:'normal',sizeBand:'solo',total:week?0:2,offset,nextOffset:week||offset?null:1,rows:week?[]:offset?[second]:[first]}));
 });
 const ui=await menuBundle(t,'src/client/ui/team-records.ts');const dispose=ui.mountTeamRecords(env.host,endpoint,'short','normal');env.cleanup.push(dispose);
 await until(()=>env.host.querySelector('[data-record-more]')?.hidden===false);env.host.querySelector('[data-record-more]')!.click();
 await until(()=>env.host.querySelectorAll('[data-team-run]').length===2);
 const details=env.host.querySelector(`[data-team-run="${first.runId}"]`)!;details.open=true;details.dispatch('toggle');await until(()=>rosterPending);details.dispatch('toggle');assert.equal(rosterCalls,1);
 env.host.querySelector('[data-record-week]')!.click();await until(()=>rosterAborted);await until(()=>env.host.querySelector('[data-record-status]')?.textContent==='ui.recordsEmpty');
 assert.equal(details.isConnected,false);assert.equal(env.host.querySelectorAll('[data-team-run]').length,0);
});
