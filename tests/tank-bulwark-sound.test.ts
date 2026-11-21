import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {bulwarkSoundIds,isTankBulwarkSound,tankBulwarkDuration,tankBulwarkSample,playTankBulwarkSound} from '../src/client/tank-bulwark-sound.ts';

test('all five Tank reports produce bounded distinct finite PCM at three native rates',()=>{
  assert.equal(isTankBulwarkSound('heavy-linework-haul'),false);assert.equal(bulwarkSoundIds.length,5);
  for(const rate of [22050,44100,48000]){
    const hashes=new Set<string>();
    for(const id of bulwarkSoundIds){
      assert(isTankBulwarkSound(id));const duration=tankBulwarkDuration(id);
      const pcm=Float32Array.from({length:Math.ceil(rate*duration)},(_,i)=>tankBulwarkSample(id,i/rate));
      assert(pcm.every(Number.isFinite));assert(Math.max(...pcm.map(Math.abs))<.4);assert(pcm.some(v=>Math.abs(v)>.015));
      assert.equal(tankBulwarkSample(id,0),0);assert.equal(tankBulwarkSample(id,duration),0);
      hashes.add(createHash('sha256').update(new Uint8Array(pcm.buffer)).digest('hex'));
    }assert.equal(hashes.size,5);
  }
});
test('each finite Tank voice disconnects both nodes and releases its voice accounting on completion',()=>{
  for(const id of bulwarkSoundIds){
    let disconnected=0,released=0;
    const source={onended:undefined as undefined|(()=>void),buffer:undefined as unknown,connect(){},disconnect(){disconnected++;},start(){this.onended!();}};
    const gain={gain:{value:0},connect(){},disconnect(){disconnected++;}};
    const context={sampleRate:22050,destination:{},createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)};},createBufferSource:()=>source,createGain:()=>gain};
    playTankBulwarkSound(context as unknown as AudioContext,id,.7,()=>released++);
    assert.equal(disconnected,2);assert.equal(released,1);assert.equal(gain.gain.value,.7);
  }
});
