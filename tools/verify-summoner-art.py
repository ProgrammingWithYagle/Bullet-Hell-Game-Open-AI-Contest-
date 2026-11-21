"""Independent full RGBA reconstruction; no renderer or human acceptance inference."""
from pathlib import Path
from PIL import Image
import hashlib,json
r=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads((r/p).read_text(encoding='utf-8'))
receipt=read('reviews/summoner-2026-11-01/art-provenance.json')
assert receipt['generatedNatives']==len(receipt['requests'])==22
assert sha(r/receipt['sourceCrops'])==receipt['sourceCropsSha256']
for request in receipt['requests']:
 assert sha(r/request['file'])==request['sha256'] and sha(r/request['request'])==request['requestSha256']
 for binding in request['inputBindings']:assert sha(r/binding['projectPath'])==binding['sha256']
 native=Image.open(r/request['file']);assert native.mode=='RGBA';lo,hi=native.getchannel('A').getextrema();assert lo==0 and hi>=200

def reconstruct(e,columns,frames):
 assert sha(r/e['source'])==e['sourceSha256'] and sha(r/e['atlas'])==e['atlasSha256']
 source=Image.open(r/e['source']);actual=Image.open(r/e['atlas']);size=e['cellSize'];expected=Image.new('RGBA',(columns*size,size))
 if e.get('action')=='idle':expected.alpha_composite(source,(0,0))
 else:
  assert len(e['normalization'])==frames
  for i,n in enumerate(e['normalization']):
   crop=source.crop(n['sourceRect']);scaled=[round(crop.width*e['uniformScale']),round(crop.height*e['uniformScale'])];off=n['offset']
   assert scaled==n['resizedCrop'] and min(off)>=5 and off[0]+scaled[0]<=size-5 and off[1]+scaled[1]<=size-5
   expected.alpha_composite(crop.resize(scaled,Image.Resampling.LANCZOS),(i*size+off[0],off[1]))
 assert actual.mode=='RGBA' and actual.size==expected.size and actual.tobytes()==expected.tobytes(),e['id']
 return expected

references=[e for e in read('assets/production/normalized/library.json')['entries'] if e['id']=='summoner']+read('assets/production/normalized/retinue/library.json')['entries']
assert len(references)==4
for e in references:
 expected=reconstruct(e,4,4)
 for i,facing in enumerate(['south','east','north','west']):
  folder='survivors' if e['id']=='summoner' else 'retinue'
  seed=Image.open(r/f'assets/production/normalized/{folder}/{e["id"]}/{facing}-seed-v1.png')
  assert seed.tobytes()==expected.crop((i*256,0,(i+1)*256,256)).tobytes()

survivors=[]
for path in ['assets/production/motion/summoner-library.json','assets/production/motion/summoner-actions/library.json']:
 lib=read(path);assert sha(r/lib['sourceTool'])==lib['sourceToolSha256'];survivors+=lib['entries']
pets=read('assets/production/motion/retinue/library.json');assert sha(r/pets['sourceTool'])==pets['sourceToolSha256'];pets=pets['entries']
assert len(survivors)==24 and sum(e['frames'] for e in survivors)==84
assert len(pets)==60 and sum(e['frames'] for e in pets)==132
deliveries={e['id']:e for e in read('assets/delivery/survivor-motion-v1/library.json')['entries']+read('assets/delivery/retinue-motion-v1/library.json')['entries']}
for e in survivors+pets:
 reconstruct(e,e['columns'],e['frames']);d=deliveries[e['id']]
 assert (r/e['atlas']).read_bytes()==(r/d['atlas']).read_bytes() and sha(r/d['atlas'])==d['atlasSha256']
 for field in ['origin','displayCell','frames','fps','columns']:assert d[field]==e[field]
 assert e['cellSize']/e['displayCell']>=2

icons=[e for e in read('assets/production/items/library.json')['entries'] if e['itemId'].startswith('summoner-') or e['itemId'].split('-')[0] in ['beaconwork','bonds','waykeeping']]
assert len(icons)==18
for e in icons:
 assert sha(r/e['source'])==e['sourceSha256'] and sha(r/e['atlas'])==e['atlasSha256']
 crop=Image.open(r/e['source']).crop(e['sourceRect']);expected=Image.new('RGBA',(256,256));expected.alpha_composite(crop.resize(e['size'],Image.Resampling.LANCZOS),e['offset'])
 actual=Image.open(r/e['atlas']);assert actual.mode=='RGBA' and actual.size==expected.size and actual.tobytes()==expected.tobytes()
spool=next(e for e in icons if e['itemId']=='summoner-thread-spool');assert (r/spool['atlas']).read_bytes()==(r/'assets/production/ui/resources/summoner-focus-v1.png').read_bytes()
portrait=next(e for e in read('assets/delivery/selection-portraits-v1/library.json')['entries'] if e['classId']=='summoner')
assert sha(r/portrait['source'])==portrait['sourceSha256'] and sha(r/portrait['image'])==portrait['imageSha256']
crop=Image.open(r/portrait['source']).crop(portrait['sourceAlphaBounds']);expected=Image.new('RGBA',(480,640));expected.alpha_composite(crop.resize(portrait['resizedCrop'],Image.Resampling.LANCZOS),portrait['offset']);assert expected.tobytes()==Image.open(r/portrait['image']).tobytes()
result={'passed':True,'verifier':'tools/verify-summoner-art.py','verifierSha256':sha(Path(__file__)),'generatedNatives':22,'survivorClips':24,'survivorPoses':84,'companionClips':60,'companionPoses':132,'itemIcons':18,'allNativePromptInputHashesChecked':True,'completeUnflippedRgbaReconstruction':True,'exactDeliveryCopies':True,'renderedAccepted':False,'humanAccepted':False,'limits':['Reconstruction verifies retained image crops, uniform scales, anchor translations and delivery bytes. It does not prove motion quality, all handedness, rendering, literary quality, device performance or human acceptance.']}
(r/'reviews/summoner-2026-11-01/art-reconstruction.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(result))
