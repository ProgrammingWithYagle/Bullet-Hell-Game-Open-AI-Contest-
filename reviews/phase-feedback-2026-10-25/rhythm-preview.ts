import fs from 'node:fs';
import path from 'node:path';
import {rhythmHit,rhythmWave} from '../../src/client/combat-rhythm.ts';
const original=fs.readFileSync('assets/production/audio/boss-themes/hollow-muster.wav');
let at=12,pcm:Buffer|undefined;
while(at+8<=original.length){const id=original.toString('ascii',at,at+4),size=original.readUInt32LE(at+4);if(id==='data'){pcm=original.subarray(at+8,at+8+size);break;}at+=8+size+(size%2);}
if(!pcm)throw Error('Missing PCM');
const rate=44100,bpm=108,frames=pcm.length/4;
const sections=[{name:'Original',phase:-1,brutal:false},{name:'Patrol',phase:0,brutal:false},{name:'Lockdown',phase:2,brutal:false},{name:'Brutal Lockdown',phase:2,brutal:true}];
const segment=Math.round(16*60/bpm*rate),output=new Float64Array(segment*sections.length*2);
let peak=0,sum=0;
for(let section=0;section<sections.length;section++){
 const spec=sections[section],signal=new Float64Array(segment*2);
 for(let frame=0;frame<segment;frame++)for(let ch=0;ch<2;ch++)signal[frame*2+ch]=pcm.readInt16LE((frame%frames)*4+ch*2)/32768;
 if(spec.phase>=0)for(let step=0;step<32;step++){
  const hit=rhythmHit(step,4,spec.phase,spec.brutal);if(!hit)continue;
  const wave=rhythmWave(hit.kind,rate),start=Math.round(step*30/bpm*rate);
  for(let n=0;n<wave.length&&start+n<segment;n++)for(let ch=0;ch<2;ch++)signal[(start+n)*2+ch]+=wave[n]*hit.gain;
 }
 output.set(signal,section*segment*2);
}
const bytes=Buffer.alloc(output.length*2);
for(let n=0;n<output.length;n++){peak=Math.max(peak,Math.abs(output[n]));sum+=output[n]**2;bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,output[n]))*32767),n*2);}
if(peak>=1)throw Error('Comparison clipped');
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+bytes.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(bytes.length,40);
const task='C:/Users/yigal/Documents/Codex/2026-10-23/can-you-continue-with-the-development';
const dest=path.join(task,'outputs/Constable_Music_Intensity_Comparison_2026.10.25.wav');fs.writeFileSync(dest,Buffer.concat([header,bytes]));
const report={passed:true,preview:dest,peak,rmsDbfs:20*Math.log10(Math.sqrt(sum/output.length)),clippedSamples:0,sections:sections.map((s,i)=>({...s,atSeconds:i*segment/rate})),humanListeningAccepted:false};
fs.writeFileSync('reviews/phase-feedback-2026-10-25/rhythm-preview.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
