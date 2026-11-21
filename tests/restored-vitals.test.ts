import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/shared/game.ts';
import { implementedClassIds } from '../src/shared/protocol.ts';
import { inspectLocalChapterCheckpoint } from '../src/shared/chapter-transfer.ts';
import { playerVitalsMarkup, ensurePlayerVitalsClass } from '../src/client/ui/player-vitals.ts';
import { menuEnvironment } from './helpers/menu-fixture.ts';
test('Every restored class replaces a different menu portrait/resource, preserves numeric fields, and keeps the same HUD nodes on subsequent views',context=>{
 const env=menuEnvironment(context),art={'alchemist-samples':'/samples.png','ranger-quiver':'/quiver.png','summoner-focus':'/focus.png'};
 for(const classId of implementedClassIds){
  const selected=classId==='soldier'?'medic':'soldier';
  env.host.innerHTML=playerVitalsMarkup(selected,'/'+selected+'.png','',key=>key,art);
  const g=new Game({mode:'story',maxPlayers:1,seed:41});g.addPlayer('solo','Restored character',classId);
  const restored=Game.restoreOffline(inspectLocalChapterCheckpoint(g.offlineCheckpoint()).checkpoint);
  const p=restored.players.get('solo')!;
  assert(ensurePlayerVitalsClass(env.host as unknown as HTMLElement,p.classId,'/'+p.classId+'.png','',key=>key,art));
  assert.equal(env.host.querySelector('.character-headshot image')!.getAttribute('href'),'/'+classId+'.png');
  const expected=classId==='alchemist'?'alchemist-samples':classId==='ranger'?'ranger-quiver':classId==='summoner'?'summoner-focus':null;
  const primary=env.host.querySelectorAll('.vital-resource')[2];
  assert.equal(primary.querySelector('[data-resource-art]')?.getAttribute('data-resource-art')??null,expected);
  const health=env.host.querySelector('#health')! as any;health.value=p.health;
  const ammo=env.host.querySelector('#ammo')!;ammo.textContent='12 / 12';
  assert.equal(ensurePlayerVitalsClass(env.host as unknown as HTMLElement,p.classId,'/'+p.classId+'.png','',key=>key,art),false);
  assert.equal(env.host.querySelector('#health'),health);assert.equal(Number(health.value),p.health);
  assert.equal(env.host.querySelector('#ammo'),ammo);assert.equal(ammo.textContent,'12 / 12');
  for(const id of ['health','player-shield','ammo','coins-value','skill-points-value'])assert.equal(env.host.querySelectorAll('#'+id).length,1);
 }
});
