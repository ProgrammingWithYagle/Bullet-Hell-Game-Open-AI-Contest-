"""Create technical runtime delivery copies while preserving immutable production atlases."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import hashlib,json,math,shutil,sys
r=Path(sys.argv[1]).resolve()if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
libraries=['assets/production/motion/heavy-library.json','assets/production/motion/survivor-library.json','assets/production/motion/legacy-survivor-library.json','assets/production/motion/survivor-actions/library.json']
original=[]
for file in libraries:original.extend(json.loads((r/file).read_text())['entries'])
assert len(original)==168 and len({e['id']for e in original})==168 and sum(e['frames']for e in original)==820
out=r/'assets/delivery/survivor-motion-v1';out.mkdir(parents=True,exist_ok=True);review=r/'reviews/survivor-texture-delivery-2026-10-25';review.mkdir(parents=True,exist_ok=True)
entries=[]
def preserve(path,data):
 if path.exists():assert path.read_bytes()==data,'Use a new delivery version rather than replacing issued bytes: '+str(path)
 else:path.write_bytes(data)
for entry in original:
 source=r/entry['atlas'];assert sha(source)==entry['atlasSha256'];native=Image.open(source);assert native.mode=='RGBA';size=entry['cellSize'];columns=entry['columns'];rows=math.ceil(entry['frames']/columns);assert native.width==columns*size and native.height>=rows*size and native.height%size==0
 target=min(size,max(128,math.ceil(2*entry['displayCell']/32)*32));assert target<=size and target>=min(size,2*entry['displayCell'])
 packed=Image.new('RGBA',(columns*target,rows*target))
 for n in range(entry['frames']):
  tile=native.crop((n%columns*size,n//columns*size,(n%columns+1)*size,(n//columns+1)*size))
  if target!=size:tile=tile.resize((target,target),Image.Resampling.LANCZOS)
  packed.paste(tile,(n%columns*target,n//columns*target))
 path=out/(entry['id']+'-v1-atlas.png')
 if target==size and native.size==packed.size:preserve(path,source.read_bytes())
 else:
  import io
  buffer=io.BytesIO();packed.save(buffer,format='PNG');preserve(path,buffer.getvalue())
 assert sha(source)==entry['atlasSha256']
 entries.append({'id':entry['id'],'source':entry['atlas'],'sourceSha256':sha(source),'sourceCellSize':size,'sourceStoredFrames':native.width//size*(native.height//size),'excludedSourceFrames':native.width//size*(native.height//size)-entry['frames'],'sourcePngBytes':source.stat().st_size,'sourceDecodedBytes':native.width*native.height*4,'atlas':path.relative_to(r).as_posix(),'atlasSha256':sha(path),'cellSize':target,'columns':columns,'frames':entry['frames'],'fps':entry['fps'],'origin':entry['origin'],'displayCell':entry['displayCell'],'deliveryPngBytes':path.stat().st_size,'deliveryDecodedBytes':packed.width*packed.height*4,'pixelDensity':target/entry['displayCell'],'operation':'Unchanged exact PNG copy'if target==size and native.size==packed.size else'Complete selected-cell RGBA Lanczos downsample; inactive cells omitted, no pose crop, mirror, alpha keying or pose edits'})
before=sum(e['sourceDecodedBytes']for e in entries);after=sum(e['deliveryDecodedBytes']for e in entries)
manifest={'schemaVersion':1,'sourceTool':'tools/build-survivor-delivery.py','sourceToolSha256':sha(Path(__file__)),'inputLibraries':[{'path':p,'sha256':sha(r/p)}for p in libraries],'policy':{'minimumPixelsPerDisplayedPixel':2,'cellQuantum':32,'minimumCell':128,'neverUpscale':True,'displaySizeAndOriginUnchanged':True,'fullProductionSourcesUnchanged':True},'entries':entries,'summary':{'atlases':len(entries),'selectedPoses':sum(e['frames']for e in entries),'sourceDecodedBytes':before,'deliveryDecodedBytes':after,'decodedBytesSaved':before-after,'decodedReductionPercent':100*(1-after/before),'sourcePngBytes':sum(e['sourcePngBytes']for e in entries),'deliveryPngBytes':sum(e['deliveryPngBytes']for e in entries)},'limits':['Theoretical decoded RGBA storage from exact PNG dimensions, not measured GPU/driver memory or device FPS.','Original production/natives and their provenance remain immutable. Delivery images are technical resampling derivatives.','Contact comparison and software verification do not establish rendered Phaser, physical-device or human acceptance.']}
data=(json.dumps(manifest,indent=2)+'\n').encode();preserve(out/'library.json',data)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',16);byid={e['id']:e for e in entries}
for name in ['soldier','medic','heavy','tank','mage','engineer','assassin']:
 sheet=Image.new('RGB',(1560,460),'#172b29');d=ImageDraw.Draw(sheet)
 for col,(action,direction,index)in enumerate([('idle','south',0),('attack','east',1),('hurt','north',0),('dash','west',3),('downed','south',5),('run','east',2)]):
  e=byid[f'{name}-{action}-{direction}'];x=col*260
  for row,(file,cell,label)in enumerate([(e['source'],e['sourceCellSize'],'Production'),(e['atlas'],e['cellSize'],'Delivery')]):
   image=Image.open(r/file);tile=image.crop((index%e['columns']*cell,index//e['columns']*cell,(index%e['columns']+1)*cell,(index//e['columns']+1)*cell));baseline=row*230+205
   d.text((x+8,row*230+6),f'{label}: {action} {direction}',font=font,fill='#e7ddc3')
   for factor,offset in [(1,60),(2,175)]:
    span=round(e['displayCell']*factor);sprite=tile.resize((span,span),Image.Resampling.LANCZOS);sheet.paste(sprite,(round(x+offset-span*e['origin'][0]),round(baseline-span*e['origin'][1])),sprite)
    d.line((x+offset-18,baseline,x+offset+18,baseline),fill='#729689')
  d.line((x,229,x+259,229),fill='#536d59')
 sheet.save(review/(name+'-delivery-comparison.png'))
print(json.dumps(manifest['summary'],indent=2))
