"""Independently reconstruct ground deliveries and check native/request/geometry bindings."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();review=ROOT/'reviews/arena-ground-2026-10-25'
library=json.loads((ROOT/'assets/production/arenas/library.json').read_text());batch=json.loads((ROOT/'docs/arena-ground-2026-10-25.json').read_text());packing=json.loads((review/'packing.json').read_text());arenas=json.loads((review/'runtime-arenas.json').read_text(encoding='utf-8-sig'))
assert len(library['entries'])==6 and len(batch['requests'])==len(packing['entries'])==5
assert sha(ROOT/library['sourceTool'])==library['sourceToolSha256'] and sha(ROOT/library['geometrySource'])==library['geometrySourceSha256']
for request in batch['requests']:
 assert sha(ROOT/request['file'])==request['sha256'] and sha(ROOT/request['request'])==request['requestSha256']
 args=json.loads((ROOT/request['request']).read_text());assert args['transparent_background']is False and args['referenced_image_paths']==[b['argument']for b in request['inputBindings']]
 for binding in request['inputBindings']:assert sha(ROOT/binding['projectPath'])==binding['sha256']
results=[];total=0;minimum=1
for entry in library['entries']:
 arena=next(a for a in arenas if a['id']==entry['id']);assert entry['worldBounds']==arena['bounds']
 original=Image.open(ROOT/entry['source']);actual=Image.open(ROOT/entry['image']);assert sha(ROOT/entry['source'])==entry['sourceSha256'] and sha(ROOT/entry['image'])==entry['imageSha256'];assert list(actual.size)==entry['imageSize']
 assert actual.convert('RGBA').getchannel('A').getextrema()==(255,255)
 assert entry['decodedRgbaBytes']==actual.width*actual.height*4;total+=entry['decodedRgbaBytes']
 if entry['unchangedOriginal']:
  assert entry['id']=='gatehouse'and entry['source']==entry['image']
 else:
  receipt=next(p for p in packing['entries']if p['arenaId']==entry['id']);assert sha(ROOT/receipt['source'])==receipt['sourceSha256'] and sha(ROOT/receipt['delivery'])==receipt['deliverySha256']
  x0,y0,x1,y1=receipt['sourceCrop'];assert 0<=x0<x1<=original.width and 0<=y0<y1<=original.height
  assert abs(x0-(original.width-(x1-x0))/2)<=.5 and abs(y0-(original.height-(y1-y0))/2)<=.5
  assert (x1-x0)*actual.height==(y1-y0)*actual.width
  assert (x1-x0)*(y1-y0)/(original.width*original.height)==receipt['cropRetainedPixelFraction']
  predicted=original.convert('RGBA').crop((x0,y0,x1,y1)).resize(actual.size,Image.Resampling.LANCZOS)
  assert predicted.tobytes()==actual.convert('RGBA').tobytes()
  assert actual.size==(arena['bounds']['width'],arena['bounds']['height']);minimum=min(minimum,receipt['cropRetainedPixelFraction'])
 results.append({'arenaId':entry['id'],'exactSourceAndDeliveryHashes':True,'opaque':True,'exactWorldFootprint':True,'allDeliveryRgbaPixelsReconstructed':True})
assert total==library['allSixGroundDecodedRgbaBytes'] and library['newDecodedRgbaBytes']==25576800
report={'passed':True,'verifier':'tools/verify-arena-ground.py','verifierSha256':sha(Path(__file__)),'librarySha256':sha(ROOT/'assets/production/arenas/library.json'),'newNativePaintings':5,'newDecodedRgbaBytes':library['newDecodedRgbaBytes'],'allSixGroundDecodedRgbaBytes':total,'minimumOriginalCropRetained':minimum,'results':results,'renderedAccepted':False,'limits':['Exact technical aspect crop/resample reconstruction and native review.','Collision cover, walkable footprints and spawns are unchanged; no gameplay or rendered readability acceptance claimed.','Dimension-based decoded bytes are separate from actual driver/device/FPS budgets.']}
(review/'reconstruction.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({k:report[k]for k in ['passed','newNativePaintings','newDecodedRgbaBytes','allSixGroundDecodedRgbaBytes','minimumOriginalCropRetained']}))
