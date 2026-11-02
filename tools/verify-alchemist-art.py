"""Independent per-pixel extraction and full-RGBA reconstruction of retained Alchemist art."""
from pathlib import Path
from collections import deque
from PIL import Image,ImageFilter,ImageChops
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads((ROOT/p).read_text(encoding='utf-8'))

def extract(e,n):
 path=n.get('source',e['source']);source=Image.open(ROOT/path)
 assert sha(ROOT/path)==n.get('sourceSha256',e['sourceSha256'])
 if 'sourceSize'in n:assert list(source.size)==n['sourceSize']
 r=n['sourceRect'];crop=source.crop(r);w,h=crop.size;alpha=crop.getchannel('A').tobytes();chosen=bytearray(w*h)
 queue=deque((x-r[0],y-r[1])for x,y in n['componentSeeds'])
 while queue:
  x,y=queue.popleft()
  if x<0 or x>=w or y<0 or y>=h:continue
  p=y*w+x
  if chosen[p]or alpha[p]<n['alphaThreshold']:continue
  chosen[p]=255
  for dy in [-1,0,1]:
   for dx in [-1,0,1]:
    if dx or dy:queue.append((x+dx,y+dy))
 assert any(chosen)
 assert not any(chosen[:w])and not any(chosen[-w:])and not any(chosen[y*w]or chosen[y*w+w-1]for y in range(h)),'Clipped whole-figure component: '+path
 mask=Image.frombytes('L',(w,h),bytes(chosen)).filter(ImageFilter.MaxFilter(2*n['antialiasMargin']+1))
 crop.putalpha(ImageChops.multiply(crop.getchannel('A'),mask))
 return crop

def same(path,expected):
 actual=Image.open(ROOT/path);assert actual.mode=='RGBA'and actual.size==expected.size,path
 assert actual.tobytes()==expected.tobytes(),'Full RGBA mismatch: '+path

def normalize(e,n,size,offset,target):
 crop=extract(e,n);scale=n.get('uniformScale',e['uniformScale'])
 assert size==[round(crop.width*scale),round(crop.height*scale)],'Nonuniform or undocumented scale'
 result=Image.new('RGBA',target);result.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset);return result

receipt=read('reviews/alchemist-class-2026-11-02/art-provenance.json');assert len(receipt['requests'])==16
for r in receipt['requests']:
 assert sha(ROOT/r['file'])==r['sha256'];assert sha(ROOT/r['request'])==r['requestSha256']
 for b in r['inputBindings']:assert sha(ROOT/b['projectPath'])==b['sha256']
 source=Image.open(ROOT/r['file']);assert source.mode=='RGBA'and source.getchannel('A').getextrema()[0]==0
libs=[read('assets/production/motion/alchemist-library.json'),read('assets/production/motion/alchemist-actions/library.json')]
entries=[e for lib in libs for e in lib['entries']];assert len(entries)==32 and sum(e['frames']for e in entries)==94
for lib in libs:assert sha(ROOT/lib['sourceTool'])==lib['sourceToolSha256']
for e in entries:
 assert sha(ROOT/e['source'])==e['sourceSha256'];assert sha(ROOT/e['atlas'])==e['atlasSha256'];assert e['classId']=='alchemist'
 atlas=Image.new('RGBA',(e['frames']*256,256));poses=[]
 for i,n in enumerate(e['normalization']):
  assert n['alphaThreshold']==16 and n['antialiasMargin']==2
  cell=normalize(e,n,n['resizedCrop'],n['offset'],(256,256));atlas.alpha_composite(cell,(i*256,0));poses.append(hashlib.sha256(cell.tobytes()).hexdigest())
 assert len(set(poses))==e['frames'],'Repeated identical frame: '+e['id']
 same(e['atlas'],atlas)
ref=next(e for e in read('assets/production/normalized/library.json')['entries']if e['id']=='alchemist');atlas=Image.new('RGBA',(1024,256))
for i,n in enumerate(ref['normalization']):atlas.alpha_composite(normalize(ref,n,n['resizedCrop'],n['offset'],(256,256)),(i*256,0))
same(ref['atlas'],atlas);assert sha(ROOT/ref['atlas'])==ref['atlasSha256']
portrait=next(e for e in read('assets/delivery/selection-portraits-v1/library.json')['entries']if e['classId']=='alchemist')
same(portrait['image'],normalize(portrait,portrait,portrait['resizedCrop'],portrait['offset'],(480,640)));assert sha(ROOT/portrait['image'])==portrait['imageSha256']
icons=[e for e in read('assets/production/items/library.json')['entries']if e['source'].startswith('assets/production/generated/alchemist-class-2026-11-02/')];assert len(icons)==18
for e in icons:
 same(e['atlas'],normalize(e,e,e['size'],e['offset'],(256,256)));assert sha(ROOT/e['atlas'])==e['atlasSha256']
samples=next(e for e in icons if e['itemId']=='alchemist-magazine');assert (ROOT/samples['atlas']).read_bytes()==(ROOT/'assets/production/ui/resources/alchemist-samples-v1.png').read_bytes()
delivered=[e for e in read('assets/delivery/survivor-motion-v1/library.json')['entries']if e['id'].startswith('alchemist-')];assert len(delivered)==32
for e in delivered:assert (ROOT/e['source']).read_bytes()==(ROOT/e['atlas']).read_bytes()and sha(ROOT/e['atlas'])==e['atlasSha256']
result={'passed':True,'verifier':'tools/verify-alchemist-art.py','verifierSha256':sha(Path(__file__)),'generatedNatives':16,'survivorClips':32,'survivorPoses':94,'itemIcons':18,'allNativePromptInputHashesChecked':True,'independentWholeFigureExtractionAndFullRgbaReconstruction':True,'completeSourceComponentBoundsChecked':True,'noIdenticalRepeatedFrames':True,'exactDeliveryCopies':True,'renderedAccepted':False,'humanAccepted':False,'limits':['Verifies retained sources/prompts/references, complete component crops, uniform scaling, translations and exact RGBA/delivery. Distinct pixel frames do not prove animation quality, natural motion, final handedness, device rendering or human acceptance.']}
(ROOT/'reviews/alchemist-class-2026-11-02/art-reconstruction.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(result))
