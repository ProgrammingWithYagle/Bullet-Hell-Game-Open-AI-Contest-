"""Deterministic whole-pose extraction and atlas packing; no flips, rigs or repainting."""
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw,ImageFilter
import hashlib,io,json,shutil
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
crops=read('tools/alchemist-art-crops.json')
facings=['south','east','north','west'];pending={}
def write(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8',newline='\n')
def stage(path,im):
 out=io.BytesIO();im.save(out,format='PNG');raw=out.getvalue()
 if path.exists():assert path.read_bytes()==raw,str(path)
 pending[path]=raw;return hashlib.sha256(raw).hexdigest()
def visible(im):return im.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox()
native_cache={}
def native(name):
 if name in native_cache:return native_cache[name]
 spec=crops[name];path=ROOT/spec['source'];assert sha(path)==spec['sha256'];im=Image.open(path);assert im.mode=='RGBA' and list(im.size)==spec['size'];native_cache[name]=(im,spec);return im,spec
def extract(name,index):
 im,spec=native(name);rect=spec['rectangles'][index];crop=im.crop(rect);width,height=crop.size
 raw=bytes(crop.getchannel('A').point(lambda v:255 if v>=spec['alphaThreshold'] else 0).tobytes());seen=bytearray(width*height);mask=Image.new('L',crop.size);draw=ImageDraw.Draw(mask)
 stack=[(x-rect[0],y-rect[1]) for x,y in spec['componentSeeds'][index]]
 while stack:
  x,y=stack.pop();pos=y*width+x
  if not(0<=x<width and 0<=y<height)or seen[pos]or not raw[pos]:continue
  left=x
  while left>0 and raw[y*width+left-1]and not seen[y*width+left-1]:left-=1
  right=x
  while right+1<width and raw[y*width+right+1]and not seen[y*width+right+1]:right+=1
  seen[y*width+left:y*width+right+1]=b'\1'*(right-left+1);draw.line((left,y,right,y),fill=255)
  for yy in [y-1,y+1]:
   if yy<0 or yy>=height:continue
   xx=max(0,left-1)
   while xx<=min(width-1,right+1):
    j=yy*width+xx
    if raw[j]and not seen[j]:
     stack.append((xx,yy))
     while xx<=min(width-1,right+1)and raw[yy*width+xx]and not seen[yy*width+xx]:xx+=1
    else:xx+=1
 margin=spec['antialiasMargin'];mask=mask.filter(ImageFilter.MaxFilter(margin*2+1));crop.putalpha(ImageChops.multiply(crop.getchannel('A'),mask))
 return crop,{'sourceRect':rect,'componentSeeds':spec['componentSeeds'][index],'alphaThreshold':spec['alphaThreshold'],'antialiasMargin':margin}
def frame(name,index,scale):
 im,spec=native(name)
 crop,detail=extract(name,index);v=visible(crop);assert v
 band=max(8,round((v[3]-v[1])*.06));feet=visible(crop.crop((0,v[3]-band,crop.width,v[3])));assert feet
 anchor=[(feet[0]+feet[2])/2,v[3]];size=[round(crop.width*scale),round(crop.height*scale)];offset=[128-round(anchor[0]*scale),220-round(anchor[1]*scale)]
 assert min(offset)>=5 and offset[0]+size[0]<=251 and offset[1]+size[1]<=251,(name,index,size,offset)
 result=Image.new('RGBA',(256,256));result.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
 return result,{**detail,'source':spec['source'],'sourceSha256':spec['sha256'],'sourceSize':spec['size'],'uniformScale':scale,'anchor':anchor,'offset':offset,'resizedCrop':size}
def extension(path,entries,key,ident):
 v=read(path);v['entries']=[e for e in v['entries']if e[key]!=ident]+entries;write(ROOT/path,v)

TOOL='tools/build-alchemist-art.py'
F='assets/production/generated/alchemist-class-2026-11-02/'
def height(name,index):
 crop,_=extract(name,index);v=visible(crop);return v[3]-v[1]
def pose(name,index,reference=None,target=150):
 return {'name':name,'index':index,'scale':target/height(name,index if reference is None else reference)}

# Selection portrait and static facings are newly drawn assets; no existing entry is replaced.
im,spec=native('perrin-selection-v1');crop,detail=extract('perrin-selection-v1',0);v=visible(crop);scale=576/(v[3]-v[1])
ground=[(v[0]+v[2])/2,v[3]];size=[round(crop.width*scale),round(crop.height*scale)];offset=[240-round(ground[0]*scale),608-round(ground[1]*scale)]
assert min(offset)>=8 and offset[0]+size[0]<=472 and offset[1]+size[1]<=632,(size,offset)
portrait=Image.new('RGBA',(480,640));portrait.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
path=ROOT/'assets/delivery/selection-portraits-v1/alchemist-selection-v1.png'
portraitEntry={'classId':'alchemist','source':spec['source'],'sourceSha256':spec['sha256'],'sourceSize':spec['size'],**detail,'uniformScale':scale,'resizedCrop':size,'offset':offset,'bodyGroundAnchor':ground,'image':path.relative_to(ROOT).as_posix(),'imageSha256':stage(path,portrait),'imageSize':[480,640],'targetAlpha16Bounds':list(visible(portrait)),'newPose':True,'sourceTool':TOOL}

name='perrin-four-view-v1';im,spec=native(name);scale=150/height(name,0);atlas=Image.new('RGBA',(1024,256));details=[]
for i,facing in enumerate(facings):
 cell,detail=frame(name,i,scale);atlas.alpha_composite(cell,(i*256,0));details.append(detail);stage(ROOT/f'assets/production/normalized/survivors/alchemist/{facing}-seed-v1.png',cell)
path=ROOT/'assets/production/normalized/survivors/alchemist/reference-atlas-v1.png'
reference={'id':'alchemist','name':'Alchemist','family':'survivors','kind':'static-reference','atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':stage(path,atlas),'source':spec['source'],'sourceSha256':spec['sha256'],'cellSize':256,'columns':4,'frames':4,'labels':facings,'origin':[.5,.859375],'displayCell':56*256/150,'fps':0,'uniformScale':scale,'normalization':details,'status':'Drawn candidate; rendered and human acceptance pending','sourceTool':TOOL}

def selection(action,row):
 facing=facings[row]
 if action=='run':
  if facing=='south':return [pose('perrin-run-south-v2',i,0)for i in [0,1]]+[pose('perrin-run-south-left-v1',i,0)for i in [0,1]]
  if facing=='north':return [pose('perrin-run-north-south-v1',i,4)for i in [4,5,6,7]]
  return [pose('perrin-run-v1',row*4+i,row*4)for i in range(4)]
 if action=='idle':return [pose('perrin-idle-v2',row*2+i,row*2)for i in range(2)]
 if action=='attack':return [pose('perrin-attack-v1',row*4+i,row*4)for i in ([0,1,3]if facing in ['east','west']else range(4))]
 if action=='dash':return [pose('perrin-dash-v1',row*4+i,row*4,120)for i in ([0,3]if facing=='south'else range(4))]
 if action=='hurt':return [pose('perrin-hurt-v2',row*2+i,row*2)for i in range(2)]
 if action=='downed':return [pose('perrin-reactions-v1',row*4+i,row*4+1)for i in [2,3]]
 if action=='brew':return [pose('perrin-brew-v1',row*3+i,row*3)for i in ([0,1]if facing=='west'else range(3))]
 if action=='throw':
  if facing=='north':return [pose('perrin-throw-north-east-v2',i,0)for i in range(4)]
  if facing=='east':return [pose('perrin-throw-north-east-v2',i,4)for i in [4,5,6]]
  return [pose('perrin-throw-v1',row*4+i,row*4)for i in range(4)]
 raise AssertionError(action)

runs=[];actions=[];review=Image.new('RGBA',(4*256*4,8*256),(24,29,29,255));reviewDraw=ImageDraw.Draw(review)
for actionIndex,action in enumerate(['run','idle','attack','dash','hurt','downed','brew','throw']):
 for row,facing in enumerate(facings):
  chosen=selection(action,row);atlas=Image.new('RGBA',(256*len(chosen),256));details=[]
  for col,chosenPose in enumerate(chosen):
   cell,detail=frame(chosenPose['name'],chosenPose['index'],chosenPose['scale']);atlas.alpha_composite(cell,(col*256,0));details.append(detail)
   review.alpha_composite(cell,(row*1024+col*256,actionIndex*256));reviewDraw.line((row*1024+col*256,actionIndex*256+220,row*1024+(col+1)*256,actionIndex*256+220),fill=(80,100,90))
  ident='alchemist-'+action+'-'+facing;path=ROOT/f'assets/production/motion/alchemist/{ident}-v1-atlas.png';fps={'run':8,'idle':1,'attack':len(chosen)*3,'dash':len(chosen)*4,'hurt':10,'downed':6,'brew':len(chosen)*2.5,'throw':len(chosen)*2}[action]
  entry={'id':ident,'classId':'alchemist','action':action,'direction':facing,'source':details[0]['source'],'sourceSha256':details[0]['sourceSha256'],'atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':stage(path,atlas),'cellSize':256,'columns':len(chosen),'frames':len(chosen),'fps':fps,'origin':[.5,.859375],'displayCell':56*256/150,'uniformScale':details[0]['uniformScale'],'normalization':details,'normalizationRule':'Each whole figure uses its recorded source binding and uniformScale; no mirroring, deformation, rigs or repainting.','renderedAccepted':False}
  (runs if action=='run'else actions).append(entry)

icons=[];ids=[('weapon','alchemist-'+str(i))for i in range(4)]+[('skill',branch+suffix)for branch in ['reagents','mixtures','dyehouse']for suffix in ['-foundation','-path-1','-path-2']]+[('upgrade','alchemist-'+i)for i in ['damage','fire-rate','magazine','reload']]+[('supply','alchemist-sample-case')]
im,spec=native('alchemist-items-v1')
for i,(kind,ident)in enumerate(ids):
 crop,detail=extract('alchemist-items-v1',i);scale=224/max(crop.size);size=[round(crop.width*scale),round(crop.height*scale)];offset=[(256-size[0])//2,(256-size[1])//2];target=Image.new('RGBA',(256,256));target.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset);path=ROOT/f'assets/production/items/icons/{kind}/{ident}.png'
 icons.append({'id':kind+'-'+ident,'itemId':ident,'itemKind':kind,'name':ident,'family':'items','kind':'item','atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':stage(path,target),'source':spec['source'],'sourceSha256':spec['sha256'],**detail,'uniformScale':scale,'size':size,'offset':offset,'cellSize':256,'columns':1,'frames':1,'labels':[ident],'origin':[.5,.5],'displayHeight':64,'displayCell':64,'fps':0,'status':'Drawn candidate; rendered and human acceptance pending'})
 if ident=='alchemist-magazine':stage(ROOT/'assets/production/ui/resources/alchemist-samples-v1.png',target)

for path,raw in pending.items():path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
extension('assets/production/normalized/library.json',[reference],'id','alchemist')
extension('assets/delivery/selection-portraits-v1/library.json',[portraitEntry],'classId','alchemist')
v=read('assets/production/items/library.json');newIds={e['id']for e in icons};v['entries']=[e for e in v['entries']if e['id']not in newIds]+icons;write(ROOT/'assets/production/items/library.json',v)
inputs=[]
for name,entries in [('alchemist-library',runs),('alchemist-actions/library',actions)]:
 path='assets/production/motion/'+name+'.json';write(ROOT/path,{'schemaVersion':1,'entries':entries,'sourceTool':TOOL,'sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False});inputs.append(path)
new=[]
for e in runs+actions:
 source=ROOT/e['atlas'];path=ROOT/f'assets/delivery/survivor-motion-v1/{e["id"]}-v1-atlas.png'
 if path.exists():assert path.read_bytes()==source.read_bytes()
 else:shutil.copyfile(source,path)
 new.append({'id':e['id'],'source':e['atlas'],'sourceSha256':sha(source),'sourceCellSize':256,'sourceColumns':e['columns'],'sourceFrames':e['frames'],'sourcePngBytes':source.stat().st_size,'sourceDecodedBytes':e['frames']*256*256*4,'atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':sha(path),'cellSize':256,'columns':e['columns'],'frames':e['frames'],'fps':e['fps'],'origin':e['origin'],'displayCell':e['displayCell'],'uniformScale':1,'deliveryPngBytes':path.stat().st_size,'deliveryDecodedBytes':e['frames']*256*256*4,'pixelDensity':256/e['displayCell'],'excludedSourceFrames':0,'operation':'Exact PNG copy of normalized drawn Alchemist candidate; native frame selection is retained in source normalization.'})
v=read('assets/delivery/survivor-motion-v1/library.json');newIds={e['id']for e in new};v['entries']=[e for e in v['entries']if e['id']not in newIds]+new;v['inputLibraries']=[e for e in v['inputLibraries']if e['path']not in inputs]+[{'path':p,'sha256':sha(ROOT/p)}for p in inputs]
before=sum(e['sourceDecodedBytes']for e in v['entries']);after=sum(e['deliveryDecodedBytes']for e in v['entries']);v['summary']={'atlases':len(v['entries']),'selectedPoses':sum(e['frames']for e in v['entries']),'sourceDecodedBytes':before,'deliveryDecodedBytes':after,'decodedBytesSaved':before-after,'decodedReductionPercent':100*(1-after/before),'sourcePngBytes':sum(e['sourcePngBytes']for e in v['entries']),'deliveryPngBytes':sum(e['deliveryPngBytes']for e in v['entries'])};write(ROOT/'assets/delivery/survivor-motion-v1/library.json',v)
review.save(ROOT/'reviews/alchemist-class-2026-11-02/normalized-poses-v1.png')
print(json.dumps({'clips':len(new),'poses':sum(e['frames']for e in new),'icons':len(icons),'renderedAccepted':False}))
