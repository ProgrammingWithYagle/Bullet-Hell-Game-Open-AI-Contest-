"""Original editable boss scores. No samples or external music service.
Circular synthesis wraps complete notes and room tails across the loop seam.
Run this file from tools/ to regenerate; --verify-only checks delivered PCM.
"""
from pathlib import Path
from runpy import run_path
import json, hashlib, sys, math, html
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
base=run_path(str(ROOT/'tools/synthesize-audio.py'))
RATE=base['RATE']; OUT=ROOT/'assets/production/audio/boss-themes'
THEMES=[
 {'bossId':'constable','id':'hollow-muster','title':'Hollow Muster','bpm':108,'beatsPerBar':4,'meter':'4/4','root':38,
  'roots':[0,0,-4,-2,0,3,7,0], 'motif':[0,0,7,3,2,0,-1,2], 'lead':'brass',
  'intent':'A stiff D-minor funeral march: low brass calls, clipped snare and squared bass. A four-bar answer opens the second half.'},
 {'bossId':'lantern-warden','id':'last-light','title':'Last Light','bpm':72,'beatsPerBar':3,'meter':'3/4','root':40,
  'roots':[0,-1,3,0,-5,-1,7,0], 'motif':[12,7,11,8,7,3,2,7], 'lead':'bells',
  'intent':'Sparse E-Phrygian bell waltz over slowly bowed fifths; long decays and open beats mirror the lantern sweep and rest.'},
 {'bossId':'courier','id':'undelivered','title':'Undelivered','bpm':144,'beatsPerBar':4,'meter':'4/4','root':45,
  'roots':[0,0,5,3,-2,-2,7,0], 'motif':[0,3,7,10,7,3,2,-1], 'lead':'pluck',
  'intent':'Hurried A-minor ostinato, pizzicato running eighths and syncopated rim taps. A rising counterline answers the descending delivery motif.'},
 {'bossId':'ratcatcher','id':'crooked-procession','title':'Crooked Procession','bpm':126,'beatsPerBar':3.5,'meter':'7/8','root':43,
  'roots':[0,-1,3,0,5,3,-1,0], 'motif':[12,13,7,10,6,7,3,1], 'lead':'reed',
  'intent':'A lopsided 2+2+3 G-Phrygian reed dance, plucked bass and dry wood taps. The asymmetric phrase keeps the packs restless without high-frequency chatter.'},
 {'bossId':'quarantine-clerk','id':'final-entry','title':'Final Entry','bpm':100,'beatsPerBar':5,'meter':'5/4','root':36,
  'roots':[0,3,-1,0,-5,-1,7,0], 'motif':[0,7,3,2,-1,0,10,7], 'lead':'keys',
  'intent':'A C-minor prepared-key ledger in 3+2, with a low stamping pulse and restrained rising harmonies. Three clipped answers leave a two-beat gap.'},
]
THEMES += [
 {'bossId':'tollkeeper','id':'copper-debt','title':'Copper Debt','bpm':94,'beatsPerBar':4,'meter':'4/4','root':38,
  'roots':[0,-2,3,0,5,3,-2,0], 'motif':[0,7,2,10,3,2,-2,0], 'lead':'keys',
  'intent':'D-minor counting ostinato on low prepared keys, a falling bronze-bell answer and a single offbeat wheel tap. Wide rests separate each return.'},
 {'bossId':'chain-marshal','id':'iron-jurisdiction','title':'Iron Jurisdiction','bpm':88,'beatsPerBar':6,'meter':'6/4','root':34,
  'roots':[0,0,1,-2,5,1,7,0], 'motif':[0,1,7,6,3,1,-2,0], 'lead':'brass',
  'intent':'B-flat Phrygian low-brass decree in six, two weighty three-beat chain phrases, bowed fifths and deep alternating toms. No relentless high percussion.'},
 {'bossId':'gate-widow','id':'third-latch','title':'Third Latch','bpm':66,'beatsPerBar':3,'meter':'3/4','root':40,
  'roots':[0,3,5,0,-2,3,7,0], 'motif':[12,7,3,2,0,-2,3,7], 'lead':'reed',
  'intent':'A restrained E-minor funeral waltz. A sustained reed line passes between three low key chords; the third latch falls silent before the next phrase.'},
 {'bossId':'black-ambulance','id':'last-carriage','title':'Last Carriage','bpm':156,'beatsPerBar':3,'meter':'6/8','root':42,'bars':32,
  'roots':[0,0,3,5,7,3,1,0], 'motif':[0,7,12,10,7,3,1,-1], 'lead':'pluck',
  'intent':'F-sharp minor carriage gallop in two groups of three eighths, muted strings, a distant single roof bell and a held driver phrase after each rush.'},
]

def voice(kind,note,seconds):
 if kind=='bells':return base['bell'](note,max(1.8,seconds))
 if kind=='pluck':return base['pluck'](note,seconds)
 t=base['times'](seconds);freq=base['midi'](note)
 if kind=='reed':
  y=sum(np.sin(2*np.pi*freq*h*t+.15*h)/h**1.5 for h in (1,3,5,7))
  return .4*y*base['envelope'](t,.04,.13)*(1+.025*np.sin(2*np.pi*5*t))
 if kind=='brass':
  y=sum(np.sin(2*np.pi*freq*h*t)/h**1.8 for h in range(1,7))
  return .4*y*base['envelope'](t,.065,.18)
 if kind=='keys':
  y=sum(g*np.sin(2*np.pi*freq*r*t)*np.exp(-t/d) for r,g,d in [(1,1,.65),(2.004,.25,.3),(3.11,.14,.18)])
  return .5*y*base['envelope'](t,.006,.15)
 raise ValueError(kind)
def compose(theme):
 beats=theme['beatsPerBar']*theme.get('bars',16);n=round(RATE*beats*60/theme['bpm']);spb=n/RATE/beats
 rng=np.random.default_rng(20261023+theme['root'])
 buses={key:np.zeros((n,2)) for key in ['lead','strings','bass','percussion']};score=[]
 def add(bus,beat,note,length,gain,pan=0,kind=None):
  sec=length*spb
  if bus=='lead':v=voice(kind or theme['lead'],note,sec)
  elif bus=='strings':v=base['bowed'](note,sec,short=theme['bossId']=='courier')
  elif bus=='bass':v=base['pluck'](note,sec)
  else:v=base['drum'](note,rng)
  base['circular_add'](buses[bus],v,round(beat*spb*RATE),gain,pan)
  score.append({'bus':bus,'beat':beat,'note':note,'lengthBeats':length,'gain':gain,'pan':pan,'voice':kind or (theme['lead'] if bus=='lead' else bus)})
 barlen=theme['beatsPerBar'];root=theme['root']
 for bar in range(theme.get('bars',16)):
  at=bar*barlen;r=root+theme['roots'][bar%8]
  chord=[r+12,r+19,r+15] if bar%8!=6 else [r+12,r+19,r+16]
  for k,note in enumerate(chord):add('strings',at,note,barlen+.9,.13 if theme['bossId']=='lantern-warden' else .085,(-.45,0,.45)[k])
  add('bass',at,r,1.4,.3);add('bass',at+barlen-.75,r+7,.7,.19,.08)
  if theme['bossId']=='constable':
   for b in (0,2):add('percussion',at+b,'kick',.4,.3)
   for b in (1,3):add('percussion',at+b,'rim',.3,.26,-.12)
   if bar%4==3:
    for b in (3.25,3.5,3.75):add('percussion',at+b,'tick',.2,.14,.2)
   for b,i in [(0,0),(1.5,1),(2,2),(3,3)]:add('lead',at+b,root+24+theme['motif'][(bar*2+i)%8],.72,.27, -.18 if i%2 else .18)
  elif theme['bossId']=='lantern-warden':
   add('lead',at,root+24+theme['motif'][bar%8],3.8,.29,-.25 if bar%2 else .25)
   if bar%2: add('lead',at+2,root+19,.9,.1,-.1)
   if bar%4==0:add('percussion',at,'tom',.5,.13)
  elif theme['bossId']=='courier':
   for k in range(8):add('lead',at+k*.5,root+12+theme['motif'][(k+bar)%8],.42,.25 if k%2 else .3,-.23 if k%2 else .23)
   for b in (0,1.5,2.75):add('percussion',at+b,'kick',.4,.24)
   for b in (1,3):add('percussion',at+b,'rim',.2,.21,.15)
   if bar>=8:add('lead',at+2,root+36+[0,2,3,7][bar%4],1.25,.11,.32,kind='keys')
  elif theme['bossId']=='ratcatcher':
   for b,i in [(0,0),(.5,1),(1,2),(2,3),(2.5,4),(3,5)]:add('lead',at+b,root+12+theme['motif'][(i+bar)%8],.39 if b!=2 else .7,.23,-.2 if i%2 else .2)
   for b in (0,1,2):add('percussion',at+b,'rim',.2,.2)
   add('percussion',at+3,'tick',.2,.12,.3)
  elif theme['bossId']=='quarantine-clerk':
   for b,i in [(0,0),(1,1),(2,2),(3,3)]:add('lead',at+b,root+24+theme['motif'][(bar+i)%8],.7,.25,-.18 if i%2 else .18)
   for b in (0,1,2):add('percussion',at+b,'rim',.2,.21)
   add('percussion',at+3,'kick',.4,.31)
   if bar%4==3:add('lead',at+4,root+35,1.7,.12,.24,kind='bells')
  elif theme['bossId']=='tollkeeper':
   for b,i in [(0,0),(.75,1),(1.5,2),(2.5,3)]:add('lead',at+b,root+19+theme['motif'][(bar+i)%8],.48,.27,-.2 if i%2 else .2)
   add('lead',at+3,root+31+theme['motif'][bar%8],1.6,.11,.3,kind='bells')
   add('percussion',at,'tom',.4,.25);add('percussion',at+2.5,'rim',.2,.2)
  elif theme['bossId']=='chain-marshal':
   for b,i in [(0,0),(2,1),(3,2),(5,3)]:add('lead',at+b,root+12+theme['motif'][(bar+i)%8],1.55 if b in (0,3) else .55,.3,-.12 if i%2 else .12)
   for b in (0,3):add('percussion',at+b,'tom',.6,.35)
   for b in (2.5,5.5):add('percussion',at+b,'rim',.2,.18,.25)
  elif theme['bossId']=='gate-widow':
   add('lead',at,root+24+theme['motif'][bar%8],2.7,.25,(-.25,0,.25)[bar%3])
   for b in (0,1):add('lead',at+b,root+12+[0,3,7][(bar+b)%3],.9,.14,-.3,kind='keys')
   if bar%2==0:add('percussion',at,'tom',.4,.12)
  elif theme['bossId']=='black-ambulance':
   for k in range(6):add('lead',at+k*.5,root+12+theme['motif'][(bar*2+k)%8],.38,.25,-.22 if k%2 else .22)
   for b in (0,1.5):add('percussion',at+b,'kick',.4,.27)
   for b in (.5,1,2,2.5):add('percussion',at+b,'rim',.2,.15)
   if bar%4==0:add('lead',at,root+36,2.5,.12,.32,kind='bells')
 for bus in buses:
  buses[bus]=base['circular_room'](buses[bus],.28 if bus=='lead' else .16)
 master=sum(buses.values());master-=master.mean(axis=0)
 master*=.68/max(abs(master).max(),1e-10)
 # Equal long-term RMS across bosses preserves room for warning cues.
 master*=min(1,.135/max(np.sqrt(np.mean(master**2)),1e-10))
 return master,score
def verify(manifest):
 results=[]
 for track in manifest['tracks']:
  m=base['metrics'](ROOT/track['path'],True)
  assert m['passed'] and m['sha256']==track['sha256'],track['id']
  results.append(m)
 assert len({t['sha256'] for t in manifest['tracks']})==len(THEMES)
 assert len({tuple((e['beat'],e['note'],e['bus']) for e in t['score']) for t in manifest['tracks']})==len(THEMES)
 report={'schemaVersion':1,'passed':True,'tracks':results,'distinctBossThemes':len(THEMES),'humanListeningAccepted':False,
  'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
  'limits':['Objective PCM/clipping/DC/seam verification only. Human listening, device playback and final perceptual mix remain open.']}
 (ROOT/'reviews/boss-themes-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
 return report
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 if '--verify-only' in sys.argv:
  manifest=json.loads((OUT/'library.json').read_text(encoding='utf8'));verify(manifest);print('All distinct boss themes verified.');return
 tracks=[]
 for theme in THEMES:
  signal,score=compose(theme);path=OUT/(theme['id']+'.wav');base['write_wav'](path,signal)
  metrics=base['metrics'](path,True)
  tracks.append({**theme,**metrics,'score':score,'loopStartFrame':0,'loopEndFrameExclusive':len(signal),'loop':True})
  print(theme['id'],metrics['durationSeconds'],metrics['rmsDbfs'],flush=True)
 manifest={'schemaVersion':1,'originalComposition':True,'samplesUsed':False,'synthesisSource':'tools/compose-boss-themes.py',
  'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'tracks':tracks}
 (OUT/'library.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8');verify(manifest)
 cards=''.join('<article><h2>'+html.escape(t['title'])+'</h2><p>'+html.escape(t['bossId']+' · '+str(t['bpm'])+' BPM · '+t['meter'])+'</p><p>'+html.escape(t['intent'])+'</p><audio controls loop preload="none" src="'+t['id']+'.wav"></audio></article>' for t in tracks)
 (OUT/'preview.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grave Accord · Boss Themes</title><style>body{background:#142b27;color:#e8dcc5;max-width:1000px;margin:40px auto;padding:24px;font:17px/1.6 Georgia}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}article{padding:24px;border:1px solid #63786c}h2{color:#d8b278}audio{width:100%}</style><h1>Nine watches of the city</h1><p>Original boss compositions. Play one at a time; objective audio checks passed, listening review remains open.</p><main>'+cards+'</main></html>',encoding='utf8')
if __name__=='__main__':main()
