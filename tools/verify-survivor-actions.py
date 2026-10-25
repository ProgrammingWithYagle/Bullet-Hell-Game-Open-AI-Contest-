"""Independently reconstruct survivor clips from immutable native RGBA and whole-pose ownership."""
from pathlib import Path
from PIL import Image
import hashlib,json
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def verify_class(name,provenance,review_path,native_count):
 library=json.loads((ROOT/'assets/production/motion/survivor-actions/library.json').read_text(encoding='utf-8'))
 batch=json.loads((ROOT/provenance).read_text(encoding='utf-8'));library['entries']=[e for e in library['entries']if e['classId']==name]
 review=ROOT/review_path;packing=json.loads((review/'packing.json').read_text(encoding='utf-8'))
 assert len(library['entries'])==20 and len(batch['requests'])==native_count and len(packing['clips'])==20
 for request in batch['requests']:
  assert sha(ROOT/request['file'])==request['sha256'] and sha(ROOT/request['request'])==request['requestSha256']
  for binding in request['inputBindings']:assert sha(ROOT/binding['projectPath'])==binding['sha256']
 count=0;results=[];whole_pose_count=0
 for entry in library['entries']:
  receipt=next(c for c in packing['clips']if c['id']==entry['id'])
  assert sha(ROOT/entry['source'])==entry['sourceSha256']==receipt['nativeSha256']
  assert sha(ROOT/entry['atlas'])==entry['atlasSha256']==receipt['atlasSha256']
  native=Image.open(ROOT/entry['source']);actual=Image.open(ROOT/entry['atlas']);assert native.mode==actual.mode=='RGBA'
  owners=None;mask_record=receipt.get('sourceOwnershipMask')
  if mask_record:
   whole_pose_count+=1;assert sha(ROOT/mask_record['path'])==mask_record['sha256']
   mask_image=Image.open(ROOT/mask_record['path']);assert mask_image.mode=='L'and mask_image.size==native.size
   owners=np.array(mask_image);alpha=np.array(native.getchannel('A'));visible=alpha>0
   assert np.array_equal(owners>0,visible),'All original nonzero-alpha pixels must have exactly one owner'
   assert set(np.unique(owners))==set(range(entry['frames']+1))
   # Every original eight-connected figure remains intact. A connected limb or prop cannot be split off.
   for dy,dx in [(0,1),(1,0),(1,1),(1,-1)]:
    ya=slice(0,native.height-dy);yb=slice(dy,native.height)
    xa=slice(max(0,-dx),native.width-max(0,dx));xb=slice(max(0,dx),native.width-max(0,-dx))
    adjacent=visible[ya,xa]&visible[yb,xb]
    assert np.all(owners[ya,xa][adjacent]==owners[yb,xb][adjacent]),'A connected original figure was split'
   assert all(np.count_nonzero(owners==n)>=np.count_nonzero(visible)/(entry['frames']*4)for n in range(1,entry['frames']+1))
   rgba=np.array(native);background=rgba.copy();background[visible]=0;restored=Image.fromarray(background)
  else:restored=Image.new('RGBA',native.size)
  coverage=bytearray(native.width*native.height);predicted=Image.new('RGBA',actual.size);size=entry['cellSize'];padding=[]
  assert len(receipt['frames'])==entry['frames']
  for n,frame in enumerate(receipt['frames']):
   assert frame['uniformScale']==receipt['uniformScale'] and frame['uniformScale']>0
   assert frame['targetGroundAnchor']==[192,320]
   x0,y0,x1,y1=frame['sourceRect'];assert 0<=x0<x1<=native.width and 0<=y0<y1<=native.height
   source=native.crop((x0,y0,x1,y1))
   if owners is None:
    for y in range(y0,y1):
     start=y*native.width+x0;end=y*native.width+x1;assert not any(coverage[start:end]);coverage[start:end]=b'\1'*(x1-x0)
    restored.paste(source,(x0,y0))
   else:
    ys,xs=np.where(owners==n+1);assert [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]==frame['sourceRect']
    mask=owners[y0:y1,x0:x1]==n+1;pixels=np.array(source);pixels[~mask]=0;source=Image.fromarray(pixels)
    restored.paste(source,(x0,y0),Image.fromarray(mask.astype(np.uint8)*255))
   bounds=source.getchannel('A').getbbox();assert list(bounds)==frame['sourceAlphaBounds']
   visible_bounds=source.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();assert list(visible_bounds)==frame['sourceAlpha16Bounds']
   crop=source.crop(bounds);scale=receipt['uniformScale'];expected=[round(crop.width*scale),round(crop.height*scale)]
   assert frame['resizedCrop']==expected
   tile=Image.new('RGBA',(size,size));tile.alpha_composite(crop.resize(expected,Image.Resampling.LANCZOS),frame['offset'])
   target=tile.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();assert list(target)==frame['targetAlpha16Bounds']
   clearance=min(target[0],target[1],size-target[2],size-target[3]);assert clearance>=16;padding.append(clearance)
   predicted.alpha_composite(tile,(n%entry['columns']*size,n//entry['columns']*size));count+=1
  assert (owners is not None or all(coverage))and restored.tobytes()==native.tobytes(),'Native RGBA partition mismatch'
  assert predicted.tobytes()==actual.tobytes(),'Packed pixels differ from unflipped source reconstruction'
  calibration=receipt['frames'][receipt['calibrationFrame']]['targetAlpha16Bounds'];world_height=(calibration[3]-calibration[1])*entry['displayCell']/size
  assert abs(world_height-56)<1 and entry['origin']==[.5,320/384]
  result={'id':entry['id'],'frames':entry['frames'],'minimumAlpha16Padding':min(padding),'calibratedWorldHeight':world_height,'sourceRgbaPartitionExact':True,'packedRgbaReconstructed':True,'singleScale':True}
  if owners is not None:result['allConnectedSourceFiguresUnsplit']=True
  results.append(result)
 assert count==88
 report={'passed':True,'clips':20,'drawnFrames':count,'nativeReturns':native_count,'creativePixelEditsPerformed':False,'mirroringPerformed':False,'alphaErasurePerformed':False,'results':results,'limits':['Independent native-byte/atlas reconstruction and geometric checks only.','Assistant native/contact-sheet candidates; rendered Phaser transitions, device and human acceptance remain open.']}
 if whole_pose_count:report['wholePoseOwnershipMasks']=whole_pose_count;report['wholePoseNote']='Whole-figure extraction assigns every nonzero-alpha source pixel once and proves connected source figures remain intact. Original alpha-zero RGB remains preserved in immutable natives; no source alpha is erased.'
 (review/'verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps({'passed':True,'clips':20,'drawnFrames':88,'nativeReturns':native_count,'renderedAccepted':False,'wholePoseOwnershipMasks':whole_pose_count}))
if __name__=='__main__':
 verify_class('tank','docs/survivor-actions-2026-10-24.json','reviews/survivor-actions-2026-10-24',25)
 verify_class('engineer','docs/engineer-actions-2026-10-24.json','reviews/engineer-actions-2026-10-24',23)
 verify_class('mage','docs/mage-actions-2026-10-24.json','reviews/mage-actions-2026-10-24',25)
