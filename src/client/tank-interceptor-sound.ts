export const interceptorSoundIds=['tank-intercept-set','tank-intercept-ready','tank-intercept-launch','tank-intercept-brake','tank-intercept-blocked','tank-intercept-impact'] as const;
export type InterceptorSoundId=typeof interceptorSoundIds[number];
export const isTankInterceptorSound=(id:string):id is InterceptorSoundId=>(interceptorSoundIds as readonly string[]).includes(id);
const pitches:Record<InterceptorSoundId,number>={'tank-intercept-set':155,'tank-intercept-ready':590,'tank-intercept-launch':225,'tank-intercept-brake':110,'tank-intercept-blocked':85,'tank-intercept-impact':390};
const durations:Record<InterceptorSoundId,number>={'tank-intercept-set':.16,'tank-intercept-ready':.075,'tank-intercept-launch':.12,'tank-intercept-brake':.1,'tank-intercept-blocked':.08,'tank-intercept-impact':.06};
export const tankInterceptorDuration=(id:InterceptorSoundId)=>durations[id];
/** Finite quiet mechanical cues. Objective sample checks do not establish listening acceptance. */
export function tankInterceptorSample(id:InterceptorSoundId,time:number){
 const duration=durations[id];if(time<=0||time>=duration)return 0;
 const progress=time/duration,envelope=Math.sin(Math.PI*progress)**2*(1-progress),pitch=pitches[id],fall=id==='tank-intercept-ready'?1:1-progress*.28;
 return envelope*(Math.sin(2*Math.PI*pitch*fall*time)*.19+Math.sin(2*Math.PI*pitch*2.71*time)*.06+Math.sin(2*Math.PI*pitch*6.13*time)*.02);
}
export function playTankInterceptorSound(context:AudioContext,id:InterceptorSoundId,volume:number,done:()=>void){
 const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*durations[id]),context.sampleRate),channel=buffer.getChannelData(0);
 for(let i=0;i<channel.length;i++)channel[i]=tankInterceptorSample(id,i/context.sampleRate);
 const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=Math.max(0,Math.min(1,volume));source.connect(gain);gain.connect(context.destination);
 source.onended=()=>{source.disconnect();gain.disconnect();done();};source.start();
}
