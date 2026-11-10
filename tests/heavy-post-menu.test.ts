import test from'node:test';import assert from'node:assert/strict';
import{handlingMenuFixture as setup}from'./helpers/heavy-clutch-handling-menu-fixture.ts';
import{data}from'../src/shared/game.ts';import{lanyardId,traverseIds as ids,clutchId,keyedId,openId}from'../src/shared/heavy-traverse.ts';
test('controlled source MenuDOM respects the19-earned gate, makes one real capstone purchase at21, and retains five independently remapped owned rows across nine combinations',async t=>{
 for(const mode of['loose','spade','floating']as const)for(const handling of[undefined,keyedId,openId]){
  const f=await setup(t);f.foundation();f.buy(ids.entry);assert.equal(f.player().sp,0);assert.equal(f.requests.filter(r=>r.kind==='skill').length,2);
  // Controlled shop inspection budgets; ordinary earned3→9→15→21 is a separate transport proof.
  f.p.totalSp=9;f.render();if(mode!=='loose')f.buy(ids[mode]);f.p.totalSp=15;f.render();f.buy(clutchId);if(handling)f.buy(handling);
  f.inspect(lanyardId);const before=f.requests.length,sp=f.player().sp;assert(sp>=4);assert(f.host.querySelector('#buy-selected')!.disabled);f.host.querySelector('#buy-selected')!.click();assert.equal(f.requests.length,before);assert.equal(f.player().sp,sp);
  f.p.totalSp=21;f.render();f.inspect(lanyardId);assert(!f.host.querySelector('#buy-selected')!.disabled);const available=f.player().sp;f.buy(lanyardId);assert.equal(f.requests.length,before+1);assert.equal(f.player().sp,available-4);assert(f.p.skills.includes(lanyardId));
  const spent=6+(mode==='loose'?0:2)+(handling?3:0)+4;assert.equal(f.player().sp,21-spent);assert.equal(f.p.skills.filter((id:string)=>[...data.skills,...data.generalSkills,...data.specializationSkills].find(n=>n.id===id)!.capstone).length,1);
  f.inspect(lanyardId);assert(f.host.querySelector('#buy-selected')!.disabled);f.host.querySelector('#buy-selected')!.click();assert.equal(f.requests.length,before+1);assert.equal(f.player().sp,21-spent);
  f.host.innerHTML=f.guide.heavyKitMarkup(f.player(),f.controls,true);assert.equal(f.host.querySelectorAll('[data-kit-action]').length,5);const b=f.host.querySelector('[data-kit-action="technique2"]')!;for(const text of['Tethered Traverse','N','Y','9'])assert(b.textContent.includes(text));assert.equal(f.controls.bindings.e[0],'KeyE');assert.equal(f.controls.gamepad.technique1,8);
 }
});
