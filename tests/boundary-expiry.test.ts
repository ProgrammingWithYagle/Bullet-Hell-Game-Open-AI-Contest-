import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/shared/game.ts';

// Controlled regression fixtures. Natural progression/replay evidence is recorded separately.
for(const remaining of [1,2])test('victory recomputes actual health/magazine after mutation expiry; remaining='+remaining,()=>{
  const g=new Game({mode:'short',maxPlayers:1,seed:41}),p=g.addPlayer('solo','Boundary','soldier');
  const original={health:g.stats(p).health,magazine:g.stats(p).magazine};assert(g.start());
  g.mutations.push({id:'open-veins',remaining},{id:'deep-pockets',remaining});(g as any).statsCache.clear();
  p.maxHealth=g.stats(p).health;p.health=1;p.ammo=1;
  const before={health:p.maxHealth,magazine:g.stats(p).magazine};assert(before.health<original.health);assert(before.magazine>original.magazine);
  g.boss.health=0;g.step();assert.equal(g.phase,'mutationVote');
  assert.equal(g.mutations.length,remaining===1?0:2);
  const expected=remaining===1?original:before;
  assert.equal(p.maxHealth,expected.health);assert.equal(p.health,expected.health);assert.equal(p.ammo,expected.magazine);
  assert.equal(g.stats(p).health,expected.health);
  const local=Game.restoreOffline(g.offlineCheckpoint()),q=local.players.get('solo')!;
  assert.equal(q.maxHealth,p.maxHealth);assert.equal(q.health,p.health);assert.equal(q.ammo,p.ammo);
  const online=Game.restoreAuthoritative(g.authoritativeCheckpoint()),r=online.players.get(p.id)!;
  assert.equal(r.maxHealth,p.maxHealth);assert.equal(r.health,p.health);assert.equal(r.ammo,p.ammo);
});
