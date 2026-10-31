import {build} from 'esbuild';
import {readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {TestContext} from 'node:test';
import library from '../../assets/production/audio/delivery/library.json';

// Replace Vite's asset URL plumbing, while executing the real AudioBus and decoder policy.
export async function audioFixture(t: TestContext, hold: 'supported' | 'missing' | 'throws') {
  const bundle = await build({entryPoints:['src/client/audio.ts'],bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',plugins:[{
    name:'audio-asset-urls',setup(b) {
      b.onResolve({filter:/\?url$/},a=>({path:a.path.replace('?url',''),namespace:'audio-url'}));
      b.onLoad({filter:/.*/,namespace:'audio-url'},a=>({contents:'export default '+JSON.stringify(a.path),loader:'js'}));
      b.onLoad({filter:/[\\/]src[\\/]client[\\/]audio\.ts$/},a=>{
        const paths = [Object.fromEntries(library.tracks.map(x=>['../../'+x.deliveryPath,'../../'+x.deliveryPath])),{},Object.fromEntries(library.tracks.map(x=>['../../'+x.masterPath,'../../'+x.masterPath]))];
        let n=0;
        return {contents:readFileSync(a.path,'utf8').replace(/import\.meta\.glob\([\s\S]*?\) as Record<string, string>/g,()=>JSON.stringify(paths[n++])),loader:'ts'};
      });
    },
  }]});
  const directory=mkdtempSync(join(tmpdir(),'grave-audio-')),file=join(directory,'audio.mjs');
  writeFileSync(file,bundle.outputFiles[0].text);
  const sources:Source[]=[],params:Param[]=[],fetches:string[]=[],pending=new Map<string,()=>void>();
  let now=2,delayed=false;
  class Param {
    value=0; events:unknown[][]=[];
    cancelAndHoldAtTime:((time:number)=>void)|undefined=hold==='missing'?undefined:(time)=>{if(hold==='throws')throw Error('Not supported');this.events.push(['hold',time]);};
    cancelScheduledValues(time:number){this.events.push(['cancel',time]);}
    setValueAtTime(value:number,time:number){this.value=value;this.events.push(['set',value,time]);}
    linearRampToValueAtTime(value:number,time:number){this.value=value;this.events.push(['ramp',value,time]);}
    setTargetAtTime(value:number,time:number,constant:number){this.value=value;this.events.push(['target',value,time,constant]);}
  }
  class Gain {gain=new Param();constructor(){params.push(this.gain);}connect(){return this;}disconnect(){}}
  class Source {
    buffer:any;loop=false;started=false;ended=false;stoppedAt=Infinity;onended?:()=>void;
    connect(gain:Gain){return gain;}disconnect(){}start(){this.started=true;}stop(at=now){this.stoppedAt=at;}
  }
  const context={state:'running',sampleRate:48000,destination:{},get currentTime(){return now;},resume:async()=>{},
    createGain:()=>new Gain(),createBufferSource:()=>{const s=new Source();sources.push(s);return s;},
    createBuffer:(_channels:number,length:number,sampleRate:number)=>({length,sampleRate,copyToChannel(){}}),
    decodeAudioData:async(bytes:ArrayBuffer)=>{const url=new TextDecoder().decode(bytes),track=library.tracks.find(x=>url.endsWith(x.deliveryPath)||url.endsWith(x.masterPath))!;return {length:Math.round(track.frames*48000/track.sampleRate),sampleRate:48000,url};},
  };
  const originals=['AudioContext','fetch','document'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)] as const);
  Object.defineProperties(globalThis,{
    AudioContext:{configurable:true,value:function(){return context;}},document:{configurable:true,value:{hidden:false}},
    fetch:{configurable:true,value:async(url:string)=>{fetches.push(url);if(delayed)await new Promise<void>(resolve=>pending.set(url,resolve));return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer};}},
  });
  const {AudioBus}=await import(pathToFileURL(file).href),audio=new AudioBus();await audio.unlock();
  t.after(()=>{audio.stop();for(const[k,d]of originals)d?Object.defineProperty(globalThis,k,d):Reflect.deleteProperty(globalThis,k);unlinkSync(file);rmdirSync(directory);});
  return {audio,params,fetches,pending,delay:()=>{delayed=true;},loops:()=>sources.filter(s=>s.loop&&s.started),
    advance:(seconds:number)=>{now+=seconds;for(const s of sources)if(!s.ended&&s.stoppedAt<=now){s.ended=true;s.onended?.();}},
  };
}
