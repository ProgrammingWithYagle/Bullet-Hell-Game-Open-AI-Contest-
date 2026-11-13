"""Independent full RGBA reconstruction from retained native crops and contracts."""
from pathlib import Path
from PIL import Image
import hashlib,json
r=Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads((r/p).read_text(encoding='utf-8'))
receipt=read('reviews/swordsman-2026-11-01/art-provenance.json')
assert receipt['generatedNatives']==len(receipt['requests'])==13
for request in receipt['requests']:
 assert sha(r/request['file'])==request['sha256']
 assert sha(r/request['request'])==request['requestSha256']
 for binding in request['inputBindings']:assert sha(r/binding['projectPath'])==binding['sha256']
delivery={e['id']:e for e in read('assets/delivery/survivor-motion-v1/library.json')['entries']}
entries=[]
for p in ['assets/production/motion/swordsman-library.json','assets/production/motion/swordsman-actions/library.json']:
 lib=read(p);assert sha(r/lib['sourceTool'])==lib['sourceToolSha256'];entries+=lib['entries']
assert len(entries)==28 and sum(e['frames'] for e in entries)==88
for e in entries:
 assert sha(r/e['source'])==e['sourceSha256'] and sha(r/e['atlas'])==e['atlasSha256']
 source=Image.open(r/e['source']);actual=Image.open(r/e['atlas']);cell=e['cellSize'];expected=Image.new('RGBA',(cell*e['frames'],cell))
 if e['action']=='idle':expected.alpha_composite(source,(0,0))
 else:
  assert len(e['normalization'])==e['frames']
  for i,n in enumerate(e['normalization']):
   crop=source.crop(n['sourceRect']);size=[round(crop.width*e['uniformScale']),round(crop.height*e['uniformScale'])];off=n['offset']
   assert min(off)>=5 and off[0]+size[0]<=cell-5 and off[1]+size[1]<=cell-5
   expected.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),(i*cell+off[0],off[1]))
 assert actual.mode=='RGBA' and expected.size==actual.size and actual.tobytes()==expected.tobytes(),e['id']
 d=delivery[e['id']];assert (r/d['atlas']).read_bytes()==(r/e['atlas']).read_bytes();assert sha(r/d['atlas'])==d['atlasSha256'];assert d['origin']==e['origin'] and d['displayCell']==e['displayCell']
icons=[e for e in read('assets/production/items/library.json')['entries'] if e['itemId'].startswith('swordsman-') or e['itemId'].split('-')[0] in ['edgework','measure','footwork']]
assert len(icons)==18
for e in icons:
 assert sha(r/e['source'])==e['sourceSha256'] and sha(r/e['atlas'])==e['atlasSha256']
 source=Image.open(r/e['source']);crop=source.crop(e['sourceRect']);expected=Image.new('RGBA',(256,256));expected.alpha_composite(crop.resize(e['size'],Image.Resampling.LANCZOS),e['offset']);actual=Image.open(r/e['atlas'])
 assert actual.mode=='RGBA' and expected.size==actual.size and expected.tobytes()==actual.tobytes(),e['id']
result={'passed':True,'verifier':'tools/verify-swordsman-art.py','verifierSha256':sha(Path(__file__)),'generatedNatives':13,'selectedClips':28,'selectedPoses':88,'itemIcons':18,'sourcePromptsAndInputsHashed':True,'unflippedNativeCropRgbaReconstructed':True,'exactSelectedDeliveryCopies':True,'renderedAccepted':False,'humanAccepted':False,'limits':['Pixel reconstruction proves retained crop/scale/translation and selected delivery bytes. It does not prove stride, all handedness, animation quality, device rendering or human acceptance.']}
(r/'reviews/swordsman-2026-11-01/art-reconstruction.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(result))
