"""Normalize opaque ground paintings to their existing map footprints, preserving all native returns."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
out=ROOT/'assets/production/arenas';review=ROOT/'reviews/arena-ground-2026-10-25';out.mkdir(parents=True,exist_ok=True);review.mkdir(parents=True,exist_ok=True)
batch=json.loads((ROOT/'docs/arena-ground-2026-10-25.json').read_text());arenas=json.loads((review/'runtime-arenas.json').read_text(encoding='utf-8-sig'))
entries=[];receipts=[]
for arena in arenas:
 ident=arena['id'];bounds=arena['bounds'];width,height=bounds['width'],bounds['height']
 if ident=='gatehouse':
  path=ROOT/'assets/proofs/arena-v1.png';im=Image.open(path)
  entry={'id':ident,'name':arena['name'],'texture':'arena-ground-'+ident,'source':path.relative_to(ROOT).as_posix(),'sourceSha256':sha(path),'image':path.relative_to(ROOT).as_posix(),'imageSha256':sha(path),'imageSize':list(im.size),'worldBounds':bounds,'origin':[.5,.5],'decodedRgbaBytes':im.width*im.height*4,'unchangedOriginal':True}
 else:
  request=next(v for v in batch['requests']if v['arenaId']==ident);path=ROOT/request['file'];assert sha(path)==request['sha256'];im=Image.open(path);assert im.mode in ['RGB','RGBA']
  rgba=im.convert('RGBA');assert rgba.getchannel('A').getextrema()==(255,255),'Floor must be opaque at every pixel'
  # Maximum centered native rectangle with the exact integer aspect, followed by one uniform LANCZOS resample.
  from math import gcd
  common=gcd(width,height);unit_x,unit_y=width//common,height//common;k=min(im.width//unit_x,im.height//unit_y);assert k>0
  crop_width,crop_height=unit_x*k,unit_y*k;left=(im.width-crop_width)//2;top=(im.height-crop_height)//2;rect=[left,top,left+crop_width,top+crop_height]
  delivered=rgba.crop(rect).resize((width,height),Image.Resampling.LANCZOS);image=out/(ident+'-ground-v1.png');assert not image.exists();delivered.save(image)
  entry={'id':ident,'name':arena['name'],'texture':'arena-ground-'+ident,'source':request['file'],'sourceSha256':sha(path),'image':image.relative_to(ROOT).as_posix(),'imageSha256':sha(image),'imageSize':[width,height],'worldBounds':bounds,'origin':[.5,.5],'decodedRgbaBytes':width*height*4,'unchangedOriginal':False}
  receipts.append({'arenaId':ident,'source':request['file'],'sourceSha256':sha(path),'sourceSize':list(im.size),'sourceMode':im.mode,'sourceCrop':rect,'uniformScale':width/crop_width,'delivery':entry['image'],'deliverySha256':sha(image),'deliverySize':[width,height],'deliveryOpaque':True,'cropRetainedPixelFraction':crop_width*crop_height/(im.width*im.height),'worldBounds':bounds,'method':'One centered exact-aspect geometric crop and proportional LANCZOS resize. No color, alpha, perspective, mirror or creative pixel edits. The complete uncropped native stays preserved.'})
 entries.append(entry)
library={'schemaVersion':1,'sourceTool':'tools/pack-arena-ground.py','sourceToolSha256':sha(Path(__file__)),'geometrySource':'src/shared/arena-layouts.ts','geometrySourceSha256':sha(ROOT/'src/shared/arena-layouts.ts'),'entries':entries,'newNativePaintings':5,'newDecodedRgbaBytes':sum(e['decodedRgbaBytes']for e in entries if not e['unchangedOriginal']),'allSixGroundDecodedRgbaBytes':sum(e['decodedRgbaBytes']for e in entries),'collisionAndSpawnGeometryUnchanged':True,'renderedAccepted':False,'limits':['Material-only ground paintings; real cover props and collision outlines remain separately placed.','Dimension-based RGBA estimates exclude other scene textures and actual driver/device allocations.','Native/static-layout review is separate from rendered/device/human readability acceptance.']}
(out/'library.json').write_text(json.dumps(library,indent=2)+'\n',encoding='utf-8',newline='\n')
(review/'packing.json').write_text(json.dumps({'schemaVersion':1,'entries':receipts,'creativePixelEditsPerformed':False,'renderedAccepted':False},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'newPaintings':5,'newDecodedRgbaBytes':library['newDecodedRgbaBytes'],'allSixGroundDecodedRgbaBytes':library['allSixGroundDecodedRgbaBytes'],'minNativeCropRetained':min(e['cropRetainedPixelFraction']for e in receipts)}))
