"""Independently reconstruct normalized survivor clips from immutable native RGBA."""
from pathlib import Path
from PIL import Image
import hashlib,json,math,sys

ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def verify_class(name,provenance,review_path,native_count):
 library=json.loads((ROOT/'assets/production/motion/survivor-actions/library.json').read_text(encoding='utf-8'))
 batch=json.loads((ROOT/provenance).read_text(encoding='utf-8'))
 library['entries']=[entry for entry in library['entries']if entry['classId']==name]
 review=ROOT/review_path;packing=json.loads((review/'packing.json').read_text(encoding='utf-8'))
 assert len(library['entries'])==20 and len(batch['requests'])==native_count and len(packing['clips'])==20
 for request in batch['requests']:
  assert sha(ROOT/request['file'])==request['sha256']
  assert sha(ROOT/request['request'])==request['requestSha256']
  for binding in request['inputBindings']:assert sha(ROOT/binding['projectPath'])==binding['sha256']
 count=0;results=[]
 for entry in library['entries']:
  receipt=next(c for c in packing['clips']if c['id']==entry['id'])
  assert sha(ROOT/entry['source'])==entry['sourceSha256']==receipt['nativeSha256']
  assert sha(ROOT/entry['atlas'])==entry['atlasSha256']==receipt['atlasSha256']
  native=Image.open(ROOT/entry['source']);actual=Image.open(ROOT/entry['atlas']);assert native.mode==actual.mode=='RGBA'
  restored=Image.new('RGBA',native.size);coverage=bytearray(native.width*native.height)
  predicted=Image.new('RGBA',actual.size);size=entry['cellSize'];padding=[]
  assert len(receipt['frames'])==entry['frames']
  for n,frame in enumerate(receipt['frames']):
   assert frame['uniformScale']==receipt['uniformScale'] and frame['uniformScale']>0
   assert frame['targetGroundAnchor']==[192,320]
   x0,y0,x1,y1=frame['sourceRect'];assert 0<=x0<x1<=native.width and 0<=y0<y1<=native.height
   for y in range(y0,y1):
    start=y*native.width+x0;end=y*native.width+x1
    assert not any(coverage[start:end]);coverage[start:end]=b'\1'*(x1-x0)
   source=native.crop((x0,y0,x1,y1));restored.paste(source,(x0,y0))
   bounds=source.getchannel('A').getbbox();assert list(bounds)==frame['sourceAlphaBounds']
   visible=source.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();assert list(visible)==frame['sourceAlpha16Bounds']
   crop=source.crop(bounds);scale=receipt['uniformScale'];expected=[round(crop.width*scale),round(crop.height*scale)]
   assert frame['resizedCrop']==expected
   tile=Image.new('RGBA',(size,size));tile.alpha_composite(crop.resize(expected,Image.Resampling.LANCZOS),frame['offset'])
   target=tile.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();assert list(target)==frame['targetAlpha16Bounds']
   clearance=min(target[0],target[1],size-target[2],size-target[3]);assert clearance>=16;padding.append(clearance)
   predicted.alpha_composite(tile,(n%entry['columns']*size,n//entry['columns']*size));count+=1
  assert all(coverage) and restored.tobytes()==native.tobytes(),'Native RGBA partition mismatch'
  assert predicted.tobytes()==actual.tobytes(),'Packed pixels differ from unflipped source reconstruction'
  calibration=receipt['frames'][receipt['calibrationFrame']]['targetAlpha16Bounds']
  world_height=(calibration[3]-calibration[1])*entry['displayCell']/size
  assert abs(world_height-56)<1 and entry['origin']==[.5,320/384]
  results.append({'id':entry['id'],'frames':entry['frames'],'minimumAlpha16Padding':min(padding),'calibratedWorldHeight':world_height,'sourceRgbaPartitionExact':True,'packedRgbaReconstructed':True,'singleScale':True})
 assert count==88
 report={'passed':True,'clips':20,'drawnFrames':count,'nativeReturns':native_count,'creativePixelEditsPerformed':False,'mirroringPerformed':False,'alphaErasurePerformed':False,'results':results,'limits':['Independent native-byte/atlas reconstruction and geometric checks only.','Assistant native/contact-sheet candidates; rendered Phaser transitions, device and human acceptance remain open.']}
 (review/'verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps({'passed':True,'clips':20,'drawnFrames':88,'nativeReturns':native_count,'renderedAccepted':False}))
if __name__=='__main__':
 verify_class('tank','docs/survivor-actions-2026-10-24.json','reviews/survivor-actions-2026-10-24',25)
 verify_class('engineer','docs/engineer-actions-2026-10-24.json','reviews/engineer-actions-2026-10-24',23)
