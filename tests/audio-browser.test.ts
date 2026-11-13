import test from 'node:test';
import assert from 'node:assert/strict';
import {audioFixture} from './helpers/audio-fixture.ts';
import {bossThemes} from '../src/client/boss-music.ts';

for(const support of ['missing','supported','throws'] as const) {
  test('actual music changes from equipment through all66boss themes and back with hold API '+support,async t=>{
    const f=await audioFixture(t,support);await f.audio.loop(false);
    assert.equal(f.loops().length,1);assert.match(f.loops()[0].buffer.url,/city-wake/);
    for(const boss of Object.keys(bossThemes) as Array<keyof typeof bossThemes>) {
      const theme=bossThemes[boss];
      await f.audio.loop(true,boss);f.advance(1);
      const current=f.loops().at(-1)!;assert.match(current.buffer.url,new RegExp(theme));
      assert.equal(f.loops().filter(s=>!s.ended).length,1,'one surviving loop after the fade');
      const before=f.loops().length;await f.audio.loop(true,boss);assert.equal(f.loops().length,before,'same theme does not restart');
    }
    await f.audio.loop(false);f.advance(1);assert.match(f.loops().at(-1)!.buffer.url,/city-wake/);
    assert(f.params.some(p=>p.events.some(e=>e[0]==='ramp'&&e[1]===0)),'old music fades out');
  });
}

test('leaving during decode cancels the pending theme instead of starting music on the menu',async t=>{
  const f=await audioFixture(t,'missing');await f.audio.loop(false);f.delay();
  const request=f.audio.loop(true,'constable');await Promise.resolve();f.audio.stop();
  for(const resume of f.pending.values())resume();await request;
  assert.equal(f.loops().length,1,'no late combat loop starts after stop');
});
