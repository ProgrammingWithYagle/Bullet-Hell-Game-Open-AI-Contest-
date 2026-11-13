/** Original damped glass and filtered bellows air. No sampled voice or external recording. */
const specs={
  'alchemy-dose':{duration:.1,frequency:155,glass:.12,air:.88},
  'alchemy-refill':{duration:.18,frequency:180,glass:.08,air:.92},
  'alchemy-brew':{duration:.16,frequency:390,glass:.65,air:.35},
  'alchemy-ready':{duration:.18,frequency:720,glass:.9,air:.1},
  'alchemy-throw':{duration:.12,frequency:280,glass:.25,air:.75},
  'alchemy-impact':{duration:.16,frequency:510,glass:.7,air:.3},
  'alchemy-react':{duration:.23,frequency:250,glass:.35,air:.65},
  'alchemy-quench':{duration:.2,frequency:360,glass:.2,air:.8},
  'alchemy-batch':{duration:.28,frequency:430,glass:.85,air:.15},
} as const;
export function isAlchemySound(id:string):id is keyof typeof specs{return Object.hasOwn(specs,id);}
export function playAlchemySound(context:AudioContext,id:keyof typeof specs,volume:number,ended:()=>void){
  const spec=specs[id],buffer=context.createBuffer(1,Math.ceil(context.sampleRate*spec.duration),context.sampleRate),samples=buffer.getChannelData(0);
  let seed=24617,air=0;
  for(let i=0;i<samples.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    air=.8*air+.2*(2*seed/0x100000000-1);
    const t=i/context.sampleRate,envelope=Math.exp(-t*4/spec.duration);
    const glass=Math.sin(2*Math.PI*spec.frequency*t)+.28*Math.sin(2*Math.PI*spec.frequency*2.73*t)*Math.exp(-t*24);
    samples[i]=(glass*.7*spec.glass+air*spec.air)*envelope;
  }
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;
  gain.gain.value=Math.max(0,Math.min(1,volume))*.045;
  source.connect(gain).connect(context.destination);
  source.onended=()=>{source.disconnect();gain.disconnect();ended();};source.start(context.currentTime);
}
