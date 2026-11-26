"""Whole-figure normalization with a body/boot anchor independent of the blade extent."""
from pathlib import Path
from PIL import Image
import hashlib,io,json
ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'assets/production/generated/swordsman-2026-11-01'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(path,image):
 path.parent.mkdir(parents=True,exist_ok=True);out=io.BytesIO();image.save(out,format='PNG');data=out.getvalue()
 if path.exists():assert path.read_bytes()==data,str(path)
 else:path.write_bytes(data)
def write(path,value):path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8',newline='\n')
def visible(im):return im.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox()
source=SOURCE/'dara-selection-v1.png';native=Image.open(source);v=visible(native);alpha=native.getchannel('A').getbbox();assert native.mode=='RGBA' and v and alpha
scale=576/(v[3]-v[1]);crop=native.crop(alpha);size=[round(crop.width*scale),round(crop.height*scale)]
ground=[585,v[3]];offset=[240-round((ground[0]-alpha[0])*scale),608-round((ground[1]-alpha[1])*scale)]
assert min(offset)>=8 and offset[0]+size[0]<=472 and offset[1]+size[1]<=632,(size,offset)
target=Image.new('RGBA',(480,640));target.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
path=ROOT/'assets/delivery/selection-portraits-v1/swordsman-selection-v1.png';save(path,target)
entry={'classId':'swordsman','source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'sourceSize':list(native.size),'sourceAlphaBounds':list(alpha),'sourceAlpha16Bounds':list(v),'uniformScale':scale,'resizedCrop':size,'offset':offset,'targetAlpha16Bounds':list(visible(target)),'bodyGroundAnchor':ground,'image':path.relative_to(ROOT).as_posix(),'imageSha256':sha(path),'imageSize':[480,640],'newPose':True,'sourceTool':'tools/build-swordsman-art.py'}
path=ROOT/'assets/delivery/selection-portraits-v1/library.json';value=json.loads(path.read_text(encoding='utf-8'));value['entries']=[e for e in value['entries'] if e['classId']!='swordsman']+[entry];value['extensions']=[e for e in value.get('extensions',[]) if e['classId']!='swordsman']+[{'classId':'swordsman','sourceTool':'tools/build-swordsman-art.py','sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False}];write(path,value)
source=SOURCE/'dara-four-view-v2.png';native=Image.open(source);assert native.mode=='RGBA'
cells=[native.crop((round(i*native.width/4),0,round((i+1)*native.width/4),native.height)) for i in range(4)]
visibles=[visible(c) for c in cells];assert all(visibles);scale=150/max(v[3]-v[1] for v in visibles);atlas=Image.new('RGBA',(1024,256));details=[]
outdir=ROOT/'assets/production/normalized/survivors/swordsman'
for i,(cell,v) in enumerate(zip(cells,visibles)):
 alpha=cell.getchannel('A').getbbox();crop=cell.crop(alpha);size=[round(crop.width*scale),round(crop.height*scale)]
 top=v[3]-max(12,round((v[3]-v[1])*.06));boots=visible(cell.crop((0,top,cell.width,v[3])));assert boots
 anchor=[(boots[0]+boots[2])/2,v[3]];offset=[128-round((anchor[0]-alpha[0])*scale),220-round((anchor[1]-alpha[1])*scale)]
 assert min(offset)>=5 and offset[0]+size[0]<=251 and offset[1]+size[1]<=251,(i,size,offset)
 frame=Image.new('RGBA',(256,256));frame.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset);atlas.alpha_composite(frame,(i*256,0));save(outdir/(['south','east','north','west'][i]+'-seed-v1.png'),frame)
 details.append({'sourceCell':[round(i*native.width/4),0,round((i+1)*native.width/4),native.height],'alpha16Bounds':v,'bootAnchor':anchor,'uniformScale':scale,'offset':offset})
path=outdir/'reference-atlas-v1.png';save(path,atlas);portrait=outdir/'portrait-south-v1.png';save(portrait,cells[0])
entry={'id':'swordsman','name':'Swordsman','family':'survivors','kind':'static-reference','atlas':path.relative_to(ROOT).as_posix(),'source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'atlasSha256':sha(path),'cellSize':256,'columns':4,'frames':4,'labels':['south','east','north','west'],'origin':[.5,.859375],'displayHeight':56,'displayCell':56*256/150,'fps':0,'status':'Directional candidate; rendered and human acceptance pending','portrait':portrait.relative_to(ROOT).as_posix(),'portraitSha256':sha(portrait),'normalization':details,'sourceTool':'tools/build-swordsman-art.py'}
path=ROOT/'assets/production/normalized/library.json';value=json.loads(path.read_text(encoding='utf-8'));value['entries']=[e for e in value['entries'] if e['id']!='swordsman']+[entry];write(path,value)
print(json.dumps({'portraitSize':[480,640],'referenceSize':atlas.size,'bodyHeightTarget':576,'independentDirections':4,'renderedAccepted':False}))
