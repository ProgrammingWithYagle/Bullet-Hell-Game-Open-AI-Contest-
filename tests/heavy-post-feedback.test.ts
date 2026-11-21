import test from'node:test';import assert from'node:assert/strict';
import{heavyPostDuration,heavyPostSample,isHeavyPostSound,playHeavyPostSound}from'../src/client/heavy-post-sound.ts';
import{traverseHandlingIndicator}from'../src/client/heavy-traverse-handling-presentation.ts';
import{keyedId,openId}from'../src/shared/heavy-traverse.ts';import{viewOf}from'../src/shared/view.ts';import{fixture}from'./helpers/heavy-post-game-fixture.ts';
test('only the admitted post event has a finite bounded non-firing clamp cue with silent boundaries',()=>{
 assert(isHeavyPostSound('heavy-traverse-post'));for(const id of['heavy-clutch-lift','heavy-clutch-engage','heavy-traverse-shot','heavy-traverse-release','unknown'])assert(!isHeavyPostSound(id));
 assert(heavyPostDuration>0&&heavyPostDuration<.15);for(const t of[-1,0,heavyPostDuration,1])assert.equal(heavyPostSample(t),0);
 const pcm=Array.from({length:Math.ceil(44100*heavyPostDuration)},(_,i)=>heavyPostSample(i/44100));assert(pcm.every(v=>Number.isFinite(v)&&Math.abs(v)<=.28));assert(pcm.some(v=>Math.abs(v)>.005));
});
test('the actual post cue clamps volume and disconnects both native audio nodes exactly when it ends',()=>{
 const samples=new Float32Array(Math.ceil(48000*heavyPostDuration));let played=0,sourceDisconnected=0,gainDisconnected=0,done=0;
 const source={buffer:undefined as unknown,onended:undefined as undefined|(()=>void),connect(){},disconnect(){sourceDisconnected++;},start(){played++;}},gain={gain:{value:0},connect(){},disconnect(){gainDisconnected++;}};
 const context={sampleRate:48000,destination:{},createBuffer(ch:number,n:number,rate:number){assert.equal(ch,1);assert.equal(n,samples.length);assert.equal(rate,48000);return{getChannelData(){return samples;}};},createBufferSource(){return source;},createGain(){return gain;}};
 playHeavyPostSound(context as unknown as AudioContext,'heavy-traverse-post',4,()=>done++);assert.equal(gain.gain.value,1);assert.equal(played,1);assert.equal(done,0);assert(samples.some(v=>v!==0));source.onended!();assert.equal(sourceDisconnected,1);assert.equal(gainDisconnected,1);assert.equal(done,1);
});
test('the body-centred carried-bearing marker yields to the actual fixed gun once posted, across both optional handlings and all carriages',()=>{
 for(const mode of['loose','spade','floating']as const)for(const handling of[keyedId,openId]){
  const f=fixture(mode,true,handling);f.step({technique1:true});f.step({technique2:true});f.step({technique2:true});let v=viewOf(f.g,f.p.id);assert(traverseHandlingIndicator(v.players,f.p.id,v.phase,v.combatTick));
  f.step({technique2:true});v=viewOf(f.g,f.p.id);assert(v.players[0].kit.heavyLanyardAt!>0);assert.equal(traverseHandlingIndicator(v.players,f.p.id,v.phase,v.combatTick),undefined);
 }
});
