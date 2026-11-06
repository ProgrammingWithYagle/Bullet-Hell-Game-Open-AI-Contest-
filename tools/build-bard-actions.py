"""Normalize whole drawn Bard action cells; retain alpha and use no reflection/rigging."""
from pathlib import Path
from PIL import Image
import hashlib,io,json
ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'assets/production/generated/bard-2026-11-01'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(path,image):
 path.parent.mkdir(parents=True,exist_ok=True);out=io.BytesIO();image.save(out,format='PNG');data=out.getvalue()
 if path.exists():assert path.read_bytes()==data,str(path)
 else:path.write_bytes(data)
def write(path,value):path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8',newline='\n')
def bounds(im):return im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
entries=[];delivery=[]
for action,fps,standingFrame in [('idle',1,0),('attack',10,0),('hurt',12,3),('dash',16,3),('downed',8,0)]:
 native=Image.open(SOURCE/('iven-'+action+'-v1.png')) if action!='idle' else None
 cells=[]
 for row,facing in enumerate(['south','east','north','west']):
  if action=='idle':cells.append([Image.open(ROOT/f'assets/production/normalized/survivors/bard/{facing}-seed-v1.png')])
  else:cells.append([native.crop((round(col*native.width/4),round(row*native.height/4),round((col+1)*native.width/4),round((row+1)*native.height/4))) for col in range(4)])
 scale=1 if action=='idle' else 150/max(bounds(row[standingFrame])[3]-bounds(row[standingFrame])[1] for row in cells)
 for row,(facing,frames) in enumerate(zip(['south','east','north','west'],cells)):
  count=len(frames);atlas=Image.new('RGBA',(256*count,256));details=[]
  source=ROOT/f'assets/production/normalized/survivors/bard/{facing}-seed-v1.png' if action=='idle' else SOURCE/('iven-'+action+'-v1.png')
  for col,frame in enumerate(frames):
   if action=='idle':atlas.alpha_composite(frame,(0,0));continue
   v=bounds(frame);alpha=frame.getchannel('A').getbbox();assert v and alpha
   crop=frame.crop(alpha);size=[round(crop.width*scale),round(crop.height*scale)]
   offset=[128-round(((v[0]+v[2])/2-alpha[0])*scale),220-round((v[3]-alpha[1])*scale)]
   assert min(offset)>=5 and offset[0]+size[0]<=251 and offset[1]+size[1]<=251,(action,facing,col,size,offset)
   atlas.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),(col*256+offset[0],offset[1]))
   details.append({'sourceRect':[round(col*native.width/4),round(row*native.height/4),round((col+1)*native.width/4),round((row+1)*native.height/4)],'alpha16Bounds':v,'offset':offset})
  ident=f'bard-{action}-{facing}';path=ROOT/f'assets/production/motion/bard-actions/{ident}-v1-atlas.png';save(path,atlas)
  entry={'id':ident,'classId':'bard','direction':facing,'action':action,'family':'survivors','kind':'animation' if count>1 else 'static-reference','source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':sha(path),'cellSize':256,'columns':count,'frames':count,'origin':[.5,.859375],'displayHeight':56,'displayCell':56*256/150,'fps':fps,'uniformScale':scale,'normalization':details,'status':'Drawn action candidate; native/contract checks only. Rendered transitions and human acceptance remain open.'}
  entries.append(entry)
  dest=ROOT/f'assets/delivery/survivor-motion-v1/{ident}-v1-atlas.png';save(dest,atlas)
  delivery.append({'id':ident,'source':entry['atlas'],'sourceSha256':sha(path),'sourceCellSize':256,'sourceColumns':count,'sourceFrames':count,'sourcePngBytes':path.stat().st_size,'sourceDecodedBytes':count*256*256*4,'atlas':dest.relative_to(ROOT).as_posix(),'atlasSha256':sha(dest),'cellSize':256,'columns':count,'frames':count,'fps':fps,'origin':entry['origin'],'displayCell':entry['displayCell'],'uniformScale':1,'deliveryPngBytes':dest.stat().st_size,'deliveryDecodedBytes':count*256*256*4,'pixelDensity':256/entry['displayCell'],'excludedSourceFrames':0,'operation':'Exact PNG copy of normalized drawn Bard action'})
path=ROOT/'assets/production/motion/bard-actions/library.json';write(path,{'schemaVersion':1,'entries':entries,'sourceTool':'tools/build-bard-actions.py','sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False})
library=ROOT/'assets/delivery/survivor-motion-v1/library.json';value=json.loads(library.read_text(encoding='utf-8'));ids={e['id'] for e in entries};value['entries']=[e for e in value['entries'] if e['id'] not in ids]+delivery
value['inputLibraries']=[e for e in value['inputLibraries'] if e['path']!='assets/production/motion/bard-actions/library.json']+[{'path':'assets/production/motion/bard-actions/library.json','sha256':sha(path)}]
before=sum(e['sourceDecodedBytes'] for e in value['entries']);after=sum(e['deliveryDecodedBytes'] for e in value['entries'])
value['summary']={'atlases':len(value['entries']),'selectedPoses':sum(e['frames'] for e in value['entries']),'sourceDecodedBytes':before,'deliveryDecodedBytes':after,'decodedBytesSaved':before-after,'decodedReductionPercent':100*(1-after/before),'sourcePngBytes':sum(e['sourcePngBytes'] for e in value['entries']),'deliveryPngBytes':sum(e['deliveryPngBytes'] for e in value['entries'])}
value['extensions']=[e for e in value.get('extensions',[]) if e.get('sourceTool')!='tools/build-bard-actions.py']+[{'classId':'bard','sourceTool':'tools/build-bard-actions.py','sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False}];write(library,value)
print(json.dumps({'actionClips':len(entries),'actionFrames':sum(e['frames'] for e in entries),'totalDelivery':value['summary']}))
