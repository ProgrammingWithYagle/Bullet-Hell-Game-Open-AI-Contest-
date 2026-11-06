"""Crop/scale whole generated frames only; no painting, mirroring or pose synthesis."""
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
def bound(im):return im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
source=SOURCE/'iven-run-v2.png';image=Image.open(source);assert image.mode=='RGBA'
cells=[]
for row in range(4):
 cells.append([image.crop((round(col*image.width/4),round(row*image.height/4),round((col+1)*image.width/4),round((row+1)*image.height/4))) for col in range(4)])
scale=150/max(bound(cell)[3]-bound(cell)[1] for row in cells for cell in row)
motion=[];delivery=[]
for row,(facing,frames) in enumerate(zip(['south','east','north','west'],cells)):
 atlas=Image.new('RGBA',(1024,256));details=[]
 for col,frame in enumerate(frames):
  visible=bound(frame);alpha=frame.getchannel('A').getbbox();assert visible and alpha
  crop=frame.crop(alpha);size=[round(crop.width*scale),round(crop.height*scale)]
  offset=[128-round(((visible[0]+visible[2])/2-alpha[0])*scale),220-round((visible[3]-alpha[1])*scale)]
  assert min(offset)>=5 and offset[0]+size[0]<=251 and offset[1]+size[1]<=251,(facing,col,size,offset)
  atlas.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),(col*256+offset[0],offset[1]))
  details.append({'sourceRect':[round(col*image.width/4),round(row*image.height/4),round((col+1)*image.width/4),round((row+1)*image.height/4)],'alpha16Bounds':visible,'offset':offset})
 path=ROOT/f'assets/production/motion/bard-run-{facing}-v1-atlas.png';save(path,atlas)
 entry={'id':'bard-run-'+facing,'classId':'bard','direction':facing,'name':'Bard Run '+facing.title(),'family':'survivors','kind':'animation','source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':sha(path),'cellSize':256,'columns':4,'frames':4,'labels':['Contact','Passing','Opposite contact','Opposite passing'],'origin':[.5,.859375],'displayHeight':56,'displayCell':56*256/150,'fps':8,'frameDurationsMs':[125]*4,'uniformScale':scale,'normalization':details,'status':'Four-frame candidate; native inspection only. In-engine motion, transitions and human acceptance remain open.'}
 motion.append(entry)
 # 256px already meets the established 2x runtime density for this display size.
 dest=ROOT/f'assets/delivery/survivor-motion-v1/bard-run-{facing}-v1-atlas.png';save(dest,atlas)
 delivery.append({'id':entry['id'],'source':entry['atlas'],'sourceSha256':sha(path),'sourceCellSize':256,'sourceColumns':4,'sourceFrames':4,'sourcePngBytes':path.stat().st_size,'sourceDecodedBytes':1024*256*4,'atlas':dest.relative_to(ROOT).as_posix(),'atlasSha256':sha(dest),'cellSize':256,'columns':4,'frames':4,'fps':8,'origin':entry['origin'],'displayCell':entry['displayCell'],'uniformScale':1,'deliveryPngBytes':dest.stat().st_size,'deliveryDecodedBytes':1024*256*4,'pixelDensity':256/entry['displayCell'],'excludedSourceFrames':0,'operation':'Exact PNG copy of geometrically normalized four-frame candidate'})
path=ROOT/'assets/production/motion/bard-library.json';write(path,{'schemaVersion':1,'entries':motion,'sourceTool':'tools/build-bard-motion-items.py','sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False})
library=ROOT/'assets/delivery/survivor-motion-v1/library.json';value=json.loads(library.read_text(encoding='utf-8'));value['entries']=[e for e in value['entries'] if e['id'] not in {entry['id'] for entry in delivery}]+delivery
value['inputLibraries']=[e for e in value['inputLibraries'] if e['path']!='assets/production/motion/bard-library.json']+[{'path':'assets/production/motion/bard-library.json','sha256':sha(path)}]
before=sum(e['sourceDecodedBytes'] for e in value['entries']);after=sum(e['deliveryDecodedBytes'] for e in value['entries'])
value['summary']={'atlases':len(value['entries']),'selectedPoses':sum(e['frames'] for e in value['entries']),'sourceDecodedBytes':before,'deliveryDecodedBytes':after,'decodedBytesSaved':before-after,'decodedReductionPercent':100*(1-after/before),'sourcePngBytes':sum(e['sourcePngBytes'] for e in value['entries']),'deliveryPngBytes':sum(e['deliveryPngBytes'] for e in value['entries'])}
value['extensions']=[{'classId':'bard','sourceTool':'tools/build-bard-motion-items.py','sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False}];write(library,value)
source=SOURCE/'bard-items-v1.png';image=Image.open(source);assert image.mode=='RGBA'
ids=[('weapon','bard-'+str(i),0,i) for i in range(4)]+[('skill',branch+suffix,row,col) for row,branch in enumerate(['notecraft','performance','company'],1) for col,suffix in enumerate(['-foundation','-path-1','-path-2'])]
items=[]
for kind,ident,row,col in ids:
 rect=[round(col*image.width/4),round(row*image.height/4),round((col+1)*image.width/4),round((row+1)*image.height/4)]
 cell=image.crop(rect);alpha=cell.getchannel('A').getbbox();assert alpha
 crop=cell.crop(alpha);factor=224/max(crop.size);size=[round(crop.width*factor),round(crop.height*factor)];offset=[(256-size[0])//2,(256-size[1])//2]
 icon=Image.new('RGBA',(256,256));icon.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
 path=ROOT/f'assets/production/items/icons/{kind}/{ident}.png';save(path,icon)
 items.append({'id':kind+'-'+ident,'itemId':ident,'itemKind':kind,'name':ident,'family':'items','kind':'item','atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':sha(path),'source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'sourceRect':rect,'sourceAlphaBounds':list(alpha),'uniformScale':factor,'size':size,'offset':offset,'cellSize':256,'columns':1,'frames':1,'labels':[ident],'origin':[.5,.5],'displayHeight':64,'displayCell':64,'fps':0,'status':'Native icon review; rendered UI and human acceptance pending'})
library=ROOT/'assets/production/items/library.json';value=json.loads(library.read_text(encoding='utf-8'));newids={e['id'] for e in items};value['entries']=[e for e in value['entries'] if e['id'] not in newids]+items;write(library,value)
print(json.dumps({'runDirections':len(motion),'runFrames':sum(e['frames'] for e in motion),'newItemIcons':len(items),'commonMotionScale':scale,'humanAcceptance':False}))
