"""Independent native/provenance/whole-pose reconstruction of the Constable motion additions."""
from pathlib import Path
from PIL import Image
import hashlib,json
import numpy as np
ROOT=Path(__file__).resolve().parents[1];review=ROOT/'reviews/constable-motion-2026-10-25'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
contract=json.loads((ROOT/'assets/production/motion/constable-library.json').read_text())
provenance=json.loads((ROOT/'docs/constable-motion-2026-10-25.json').read_text())
packing=json.loads((review/'packing.json').read_text());assert len(provenance['requests'])==len(packing['clips'])==4
assert sum(e['frames']for e in contract['entries'])==27 and contract['selectedNewPoses']==19
assert contract['sourceToolSha256']==sha(ROOT/contract['sourceTool'])
for item in provenance['requests']:
 assert sha(ROOT/item['file'])==item['sha256'] and sha(ROOT/item['request'])==item['requestSha256']
 args=json.loads((ROOT/item['request']).read_text());assert args['transparent_background']
 assert args['referenced_image_paths']==[b['argument']for b in item['inputBindings']]
 for binding in item['inputBindings']:assert sha(ROOT/binding['projectPath'])==binding['sha256']
results=[];scales={};frames=0
for receipt in packing['clips']:
 action=receipt['id'].removeprefix('constable-');entry=contract['clips'][action];source=ROOT/entry['source'];atlas=ROOT/entry['atlas']
 assert sha(source)==entry['sourceSha256']==receipt['nativeSha256'] and sha(atlas)==entry['atlasSha256']==receipt['atlasSha256']
 native=Image.open(source);actual=Image.open(atlas);assert native.mode==actual.mode=='RGBA'
 assert list(native.size)==receipt['sourceSize'];assert actual.size==(entry['columns']*entry['cellSize'],entry['cellSize']*((entry['frames']+entry['columns']-1)//entry['columns']))
 restored=Image.new('RGBA',native.size);predicted=Image.new('RGBA',actual.size);coverage=np.zeros((native.height,native.width),np.uint8)
 assert receipt['sourceRectanglesConserveEveryRGBAPixel'] and 'sourceOwnershipMask'not in receipt
 for index,record in enumerate(receipt['frames']):
  assert record['uniformScale']==receipt['uniformScale']>0
  x0,y0,x1,y1=record['sourceRect'];assert 0<=x0<x1<=native.width and 0<=y0<y1<=native.height
  coverage[y0:y1,x0:x1]+=1;frame=native.crop((x0,y0,x1,y1));restored.paste(frame,(x0,y0))
  bounds=frame.getchannel('A').getbbox();visible=frame.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
  assert list(bounds)==record['sourceAlphaBounds'] and list(visible)==record['sourceAlpha16Bounds']
  # The partition boundary must be transparent at every alpha level; no connected figure can be cut.
  if x0>0:assert not np.any(np.array(native.getchannel('A'))[y0:y1,x0]>0)
  if y0>0:assert not np.any(np.array(native.getchannel('A'))[y0,x0:x1]>0)
  crop=frame.crop(bounds);scale=record['uniformScale'];resized=[round(crop.width*scale),round(crop.height*scale)];assert resized==record['resizedCrop']
  size=entry['cellSize'];padding=(size-384)/2;assert size>=384 and (size-384)%64==0
  pivot=[192+padding,320+padding];assert record['targetGroundAnchor']==pivot
  anchor=record['sourceGroundAnchor'];offset=[int(pivot[0])-round((anchor[0]-bounds[0])*scale),int(pivot[1])-round((anchor[1]-bounds[1])*scale)];assert offset==record['offset']
  target=Image.new('RGBA',(size,size));target.alpha_composite(crop.resize(resized,Image.Resampling.LANCZOS),offset)
  predicted.alpha_composite(target,(index%entry['columns']*size,index//entry['columns']*size))
  assert list(target.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox())==record['targetAlpha16Bounds']
 assert np.all(coverage==1) and restored.tobytes()==native.tobytes(),'Native partition must conserve every RGBA pixel exactly once'
 assert predicted.tobytes()==actual.tobytes(),'Independent atlas reconstruction differs'
 assert abs(entry['displayCell']/entry['cellSize']-contract['calibration']['bodyWorldHeight']/288)<1e-12
 assert entry['origin']==[.5,(320+(entry['cellSize']-384)/2)/entry['cellSize']]
 for key in ['preview','contactSheet']:assert sha(ROOT/receipt[key])==receipt[key+'Sha256']
 scales[action]=receipt['uniformScale'];frames+=entry['frames'];results.append({'clip':action,'frames':entry['frames'],'everyNativeRgbaPixelConserved':True,'allPackedRgbaPixelsReconstructed':True,'oneScaleForWholeClip':True})
assert scales['stagger']==scales['idle']
old=provenance['priorAttack'];assert sha(ROOT/old['atlas'])==old['atlasSha256']==contract['clips']['attack']['atlasSha256']
assert sha(ROOT/old['metadata'])==old['metadataSha256']
report={'passed':True,'verifier':'tools/verify-constable-motion.py','verifierSha256':sha(Path(__file__)),'contractSha256':sha(ROOT/'assets/production/motion/constable-library.json'),'nativeReturns':4,'newCompletePoses':frames,'retainedAttackPoses':8,'clips':results,'staggerSharesUprightIdleSourceScale':True,'attackAtlasAndMetadataBytesUnchanged':True,'renderedAccepted':False,'limits':['Independent native and packed RGBA verification only.','Natural collapsed silhouettes retain one upright-calibrated scale and a fixed horizontal ground origin.','Assistant contact-sheet review is separate from rendered/device/human acceptance.']}
(review/'reconstruction.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({k:report[k]for k in ['passed','nativeReturns','newCompletePoses','retainedAttackPoses','attackAtlasAndMetadataBytesUnchanged']}))
