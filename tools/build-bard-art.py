"""Geometric normalization only. Preserve generated sources and existing roster art."""
from pathlib import Path
from PIL import Image
import hashlib, io, json
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/production/generated/bard-2026-11-01'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(path,image):
 path.parent.mkdir(parents=True,exist_ok=True)
 out=io.BytesIO();image.save(out,format='PNG');data=out.getvalue()
 if path.exists():assert path.read_bytes()==data, str(path)
 else:path.write_bytes(data)
def write(path,value):path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8',newline='\n')
def bounds(im):return im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
source=SOURCE/'iven-selection-v1.png';native=Image.open(source);assert native.mode=='RGBA'
visible=bounds(native);alpha=native.getchannel('A').getbbox();assert visible and alpha
scale=576/(visible[3]-visible[1]);crop=native.crop(alpha)
size=[round(crop.width*scale),round(crop.height*scale)]
ground=[(visible[0]+visible[2])/2,visible[3]]
offset=[240-round((ground[0]-alpha[0])*scale),608-round((ground[1]-alpha[1])*scale)]
assert min(offset)>=8 and offset[0]+size[0]<=472 and offset[1]+size[1]<=632,(size,offset)
target=Image.new('RGBA',(480,640));target.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
path=ROOT/'assets/delivery/selection-portraits-v1/bard-selection-v1.png';save(path,target)
entry={'classId':'bard','source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'sourceSize':list(native.size),'sourceAlphaBounds':list(alpha),'sourceAlpha16Bounds':list(visible),'uniformScale':scale,'resizedCrop':size,'offset':offset,'targetAlpha16Bounds':list(bounds(target)),'image':path.relative_to(ROOT).as_posix(),'imageSha256':sha(path),'imageSize':[480,640],'newPose':True,'sourceTool':'tools/build-bard-art.py'}
library=ROOT/'assets/delivery/selection-portraits-v1/library.json';value=json.loads(library.read_text(encoding='utf-8'))
value['entries']=[e for e in value['entries'] if e['classId']!='bard']+[entry]
value['extensions']=[{'classId':'bard','sourceTool':'tools/build-bard-art.py','sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False}]
write(library,value)
source=SOURCE/'iven-four-view-v1.png';native=Image.open(source);assert native.mode=='RGBA'
cells=[native.crop((round(i*native.width/4),0,round((i+1)*native.width/4),native.height)) for i in range(4)]
visible=[bounds(c) for c in cells];assert all(visible)
scale=150/max(v[3]-v[1] for v in visible)
atlas=Image.new('RGBA',(1024,256));details=[]
outdir=ROOT/'assets/production/normalized/survivors/bard'
for i,(cell,v) in enumerate(zip(cells,visible)):
 alpha=cell.getchannel('A').getbbox();crop=cell.crop(alpha);size=(round(crop.width*scale),round(crop.height*scale))
 offset=(128-round(((v[0]+v[2])/2-alpha[0])*scale),220-round((v[3]-alpha[1])*scale))
 assert min(offset)>=5 and offset[0]+size[0]<=251 and offset[1]+size[1]<=251,(i,size,offset)
 frame=Image.new('RGBA',(256,256));frame.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
 atlas.alpha_composite(frame,(i*256,0));save(outdir/(['south','east','north','west'][i]+'-seed-v1.png'),frame)
 details.append({'sourceCell':[round(i*native.width/4),0,round((i+1)*native.width/4),native.height],'alpha16Bounds':list(v),'uniformScale':scale,'offset':list(offset)})
path=outdir/'reference-atlas-v1.png';save(path,atlas)
portrait=outdir/'portrait-south-v1.png';save(portrait,cells[0])
entry={'id':'bard','name':'Bard','family':'survivors','kind':'static-reference','atlas':path.relative_to(ROOT).as_posix(),'source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'atlasSha256':sha(path),'cellSize':256,'columns':4,'frames':4,'labels':['south','east','north','west'],'origin':[.5,.859375],'displayHeight':56,'displayCell':56*256/150,'fps':0,'status':'Candidate integrated reference; rendered and human acceptance pending','portrait':portrait.relative_to(ROOT).as_posix(),'portraitSha256':sha(portrait),'normalization':details,'sourceTool':'tools/build-bard-art.py'}
library=ROOT/'assets/production/normalized/library.json';value=json.loads(library.read_text(encoding='utf-8'));value['entries']=[e for e in value['entries'] if e['id']!='bard']+[entry];write(library,value)
print(json.dumps({'portraitAlpha16Bounds':bounds(target),'referenceSize':atlas.size,'sourceSize':native.size,'sharedScale':scale,'directions':4}))
