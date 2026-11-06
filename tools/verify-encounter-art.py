"""Independent saved-byte and pixel audit for the new item/action library."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads((ROOT/p).read_text(encoding='utf8'))
report=load('reviews/encounter-items-2026-10-23/packing.json')
doc=load('docs/encounter-item-art-2026-10-23.json')
nativeCount=0
for job in doc['requests']:
 if job.get('file'):
  assert sha(ROOT/job['file'])==job['sha256'];nativeCount+=1
 for ref in job['portableReferences']:assert sha(ROOT/ref['file'])==ref['sha256']
for part in report['sourcePartitions']:
 im=Image.open(ROOT/part['source']);assert sha(ROOT/part['source'])==part['sourceSha256'];restored=Image.new('RGBA',im.size)
 for rect in part['rectangles']:restored.paste(im.crop(rect),rect[:2])
 assert restored.tobytes()==im.tobytes()
for entry in report['items']:
 source=Image.open(ROOT/entry['source']).crop(entry['sourceRect']).crop(entry['sourceAlphaBounds'])
 expected=Image.new('RGBA',(256,256));expected.alpha_composite(source.resize(tuple(entry['size']),Image.Resampling.LANCZOS),tuple(entry['offset']))
 actual=Image.open(ROOT/entry['atlas']);assert actual.tobytes()==expected.tobytes();assert sha(ROOT/entry['atlas'])==entry['atlasSha256']
 b=actual.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox();assert min(b[0],b[1],256-b[2],256-b[3])>=14
library=load('assets/production/motion/encounter-library.json');frameHashes=[]
for clip in report['motion']:
 entry=next(e for e in library['entries'] if e['id']==clip['id']);source=Image.open(ROOT/entry['source']);actual=Image.open(ROOT/entry['atlas'])
 expected=Image.new('RGBA',actual.size);scales=set()
 for i,frame in enumerate(clip['frames']):
  crop=source.crop(frame['sourceRect']).crop(frame['sourceAlphaBounds']);target=Image.new('RGBA',(entry['cellSize'],entry['cellSize']))
  target.alpha_composite(crop.resize(tuple(frame['size']),Image.Resampling.LANCZOS),tuple(frame['offset']))
  expected.paste(target,(i%4*entry['cellSize'],i//4*entry['cellSize']));scales.add(frame['uniformScale'])
  frameHashes.append(hashlib.sha256(target.tobytes()).hexdigest())
 assert len(scales)==1;assert expected.tobytes()==actual.tobytes();assert sha(ROOT/entry['atlas'])==entry['atlasSha256']
assert len(set(frameHashes))==32
result={'schemaVersion':1,'passed':True,'preservedNativeCount':nativeCount,'preservedRequests':len(doc['requests']),
 'nativeRGBAReconstruction':True,'itemPixelMatches':len(report['items']),'motionPixelMatches':len(frameHashes),'oneScalePerAction':True,
 'creativePixelEditsPerformed':False,'phaserMotionAccepted':False,'limits':['Saved-byte, crop, padding and pixel verification plus assistant native review. No rendered engine, physical-device or human acceptance claimed.']}
(ROOT/'reviews/encounter-items-2026-10-23/independent-audit.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print(json.dumps(result))
