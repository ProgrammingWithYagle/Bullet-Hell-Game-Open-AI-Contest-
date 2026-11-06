from pathlib import Path
import math,wave,struct,hashlib,io,sys,json
ROOT=Path(__file__).resolve().parents[1]
# A wholly original two-strike bell with a rising overtone and a short low impact.
rate=44100;seconds=1.36;count=round(rate*seconds);signal=[]
for n in range(count):
 t=n/rate;v=0.0
 for onset,hz,gain in [(0,146.832,.43),(.19,220,.34),(.19,293.665,.2),(.39,440,.10)]:
  age=t-onset
  if age>=0:
   env=(1-math.exp(-age*120))*math.exp(-age*4.4)
   v+=gain*env*(math.sin(2*math.pi*hz*age)+.28*math.sin(2*math.pi*hz*2.756*age))
 v+=.12*math.sin(2*math.pi*(66*t-16*t*t))*math.exp(-t*14)*(1-math.exp(-t*200))
 v*=min(1,t/.006,max(0,(seconds-t)/.06));signal.append(v)
mean=sum(signal)/count;signal=[v-mean for v in signal];peak=max(map(abs,signal));signal=[v*.8/peak*min(1,n/100,(count-1-n)/350) for n,v in enumerate(signal)]
target=ROOT/'assets/production/audio/cues/phase-turn-v1.wav';target.parent.mkdir(parents=True,exist_ok=True)
pcm=b''.join(struct.pack('<hh',round(v*32767),round(v*32767)) for v in signal)
buffer=io.BytesIO()
with wave.open(buffer,'wb') as out:
 out.setnchannels(2);out.setsampwidth(2);out.setframerate(rate);out.writeframes(pcm)
predicted=buffer.getvalue()
if '--write' in sys.argv and not target.exists():target.write_bytes(predicted)
assert target.read_bytes()==predicted,'Phase cue bytes differ from their original synthesis'
print(json.dumps({'passed':True,'frames':count,'sha256':hashlib.sha256(predicted).hexdigest(),'listeningAccepted':False}))
