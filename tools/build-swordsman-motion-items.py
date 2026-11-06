"""Whole-figure crop, uniform scale and translation only; no painting, mirroring or rigs.

Source sheets have uneven gutters. Explicit full-figure rectangles were inspected
instead of slicing equal cells through blades/boots. Alpha is preserved inside
each recorded crop. These remain drawn candidates pending rendered/human review.
"""
from pathlib import Path
from PIL import Image
import hashlib,io,json
ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'assets/production/generated/swordsman-2026-11-01'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8',newline='\n')
def save(p,im):
 p.parent.mkdir(parents=True,exist_ok=True);out=io.BytesIO();im.save(out,format='PNG');data=out.getvalue()
 if p.exists():assert p.read_bytes()==data,str(p)
 else:p.write_bytes(data)
def bounds(im):return im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
rectangles={
 'run':[[81,16,274,309],[368,16,573,302],[673,22,857,309],[951,18,1151,304],[63,327,292,617],[366,322,593,617],[676,327,904,618],[981,325,1200,617],[119,630,306,914],[421,631,617,908],[723,633,908,919],[1021,633,1211,914],[78,937,304,1222],[406,935,625,1220],[692,936,911,1223],[989,934,1211,1218]],
 'attack':[[65,12,240,321],[365,66,579,320],[671,65,931,321],[1009,12,1178,320],[63,325,257,626],[372,373,625,626],[674,371,996,626],[1023,325,1205,627],[63,627,251,925],[348,670,626,925],[659,671,979,926],[1016,626,1202,925],[56,929,229,1222],[308,973,556,1227],[565,970,897,1222],[1017,933,1187,1224]],
 'hurt':[[108,38,313,316],[402,68,582,319],[668,40,851,322],[951,23,1122,321],[114,331,316,622],[393,366,579,619],[686,333,870,625],[963,325,1135,628],[163,639,382,926],[440,675,608,928],[713,653,898,929],[987,630,1189,934],[167,939,313,1226],[446,974,627,1218],[706,941,887,1222],[960,939,1128,1234]],
 'dash':[[36,57,288,317],[346,64,612,316],[653,64,909,313],[971,47,1194,318],[35,354,269,627],[341,350,618,612],[662,359,918,614],[1008,340,1195,630],[70,669,299,928],[353,668,636,925],[688,668,936,925],[1007,655,1214,943],[75,951,304,1210],[368,947,634,1205],[694,954,942,1212],[1032,944,1191,1224]],
 'downed':[[33,15,253,322],[348,49,555,323],[648,117,880,323],[954,154,1204,325],[38,324,245,627],[339,352,561,627],[655,427,902,627],[964,469,1221,627],[87,626,305,925],[397,652,622,920],[672,729,918,934],[976,754,1237,930],[81,921,289,1232],[411,938,622,1226],[681,1015,920,1223],[980,1050,1227,1233]],
 'guard':[[36,71,422,709],[512,72,971,715],[1139,71,1513,704],[1638,72,2013,715]]
}
specs={'idle':(1,1),'run':(8,150/295),'attack':(12,150/255),'hurt':(12,150/303),'dash':(16,150/290),'downed':(8,150/311),'guard':(1,150/615)}
actions=[];runs=[];delivered=[]
for action,(fps,scale) in specs.items():
 source=SOURCE/('dara-'+action+('-v2.png' if action=='downed' else '-v1.png')) if action!='idle' else None
 native=Image.open(source) if source else None
 for row,facing in enumerate(['south','east','north','west']):
  count=1 if action in ['idle','guard'] else 4;cell=320 if action=='attack' else 256;ground=round(cell*.859375);atlas=Image.new('RGBA',(cell*count,cell));details=[]
  for col in range(count):
   if action=='idle':
    source=ROOT/f'assets/production/normalized/survivors/swordsman/{facing}-seed-v1.png';atlas.alpha_composite(Image.open(source),(0,0));continue
   r=rectangles[action][row*count+col];rect=[max(0,r[0]-1),max(0,r[1]-1),min(native.width,r[2]+1),min(native.height,r[3]+1)];crop=native.crop(rect)
   v=bounds(crop);assert v
   # A low boot/support band anchors body rather than off-center blade extents.
   top=max(0,v[3]-max(10,round((v[3]-v[1])*.06)));boot=bounds(crop.crop((0,top,crop.width,v[3])));assert boot
   anchor=[(boot[0]+boot[2])/2,v[3]];offset=[cell//2-round(anchor[0]*scale),ground-round(anchor[1]*scale)];size=[round(crop.width*scale),round(crop.height*scale)]
   assert min(offset)>=5 and offset[0]+size[0]<=cell-5 and offset[1]+size[1]<=cell-5,(action,facing,col,offset,size)
   atlas.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),(col*cell+offset[0],offset[1]));details.append({'sourceRect':rect,'bodyGroundAnchor':anchor,'offset':offset})
  ident=f'swordsman-{action}-{facing}';version='v2' if action=='attack' else 'v1';path=ROOT/f'assets/production/motion/swordsman-{action}s/{ident}-{version}-atlas.png';save(path,atlas)
  entry={'id':ident,'classId':'swordsman','direction':facing,'action':action,'family':'survivors','kind':'animation' if count>1 else 'static-reference','source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':sha(path),'cellSize':cell,'columns':count,'frames':count,'origin':[.5,.859375],'displayHeight':56,'displayCell':56*cell/150,'fps':fps,'uniformScale':scale,'normalization':details,'status':'Drawn candidate; native crop/contract review only. Rendered stride, transitions, handedness and human acceptance remain open.'}
  (runs if action=='run' else actions).append(entry)
  dest=ROOT/f'assets/delivery/survivor-motion-v1/{ident}-{version}-atlas.png';save(dest,atlas)
  delivered.append({'id':ident,'source':entry['atlas'],'sourceSha256':sha(path),'sourceCellSize':cell,'sourceColumns':count,'sourceFrames':count,'sourcePngBytes':path.stat().st_size,'sourceDecodedBytes':count*cell*cell*4,'atlas':dest.relative_to(ROOT).as_posix(),'atlasSha256':sha(dest),'cellSize':cell,'columns':count,'frames':count,'fps':fps,'origin':entry['origin'],'displayCell':entry['displayCell'],'uniformScale':1,'deliveryPngBytes':dest.stat().st_size,'deliveryDecodedBytes':count*cell*cell*4,'pixelDensity':cell/entry['displayCell'],'excludedSourceFrames':0,'operation':'Exact PNG copy of normalized drawn Swordsman candidate'})
inputs=[]
for path,entries in [(ROOT/'assets/production/motion/swordsman-library.json',runs),(ROOT/'assets/production/motion/swordsman-actions/library.json',actions)]:
 write(path,{'schemaVersion':1,'entries':entries,'sourceTool':'tools/build-swordsman-motion-items.py','sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False});inputs.append({'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path)})
library=ROOT/'assets/delivery/survivor-motion-v1/library.json';value=json.loads(library.read_text(encoding='utf-8'));ids={e['id'] for e in delivered};value['entries']=[e for e in value['entries'] if e['id'] not in ids]+delivered
value['inputLibraries']=[e for e in value['inputLibraries'] if e['path'] not in {p['path'] for p in inputs}]+inputs
before=sum(e['sourceDecodedBytes'] for e in value['entries']);after=sum(e['deliveryDecodedBytes'] for e in value['entries']);value['summary']={'atlases':len(value['entries']),'selectedPoses':sum(e['frames'] for e in value['entries']),'sourceDecodedBytes':before,'deliveryDecodedBytes':after,'decodedBytesSaved':before-after,'decodedReductionPercent':100*(1-after/before),'sourcePngBytes':sum(e['sourcePngBytes'] for e in value['entries']),'deliveryPngBytes':sum(e['deliveryPngBytes'] for e in value['entries'])}
value['extensions']=[e for e in value.get('extensions',[]) if e.get('classId')!='swordsman']+[{'classId':'swordsman','sourceTool':'tools/build-swordsman-motion-items.py','sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False}];write(library,value)
source=SOURCE/'swordsman-items-v1.png';native=Image.open(source)
ids=[('weapon','swordsman-'+str(i)) for i in range(4)]+[('skill',branch+suffix) for branch in ['edgework','measure','footwork'] for suffix in ['-foundation','-path-1','-path-2']]
rects=[[42,88,291,301],[343,47,606,298],[647,44,923,305],[943,29,1233,303],[18,393,316,628],[381,351,594,623],[650,368,920,614],[54,658,293,919],[353,658,607,924],[634,664,937,909],[18,965,330,1203],[384,958,573,1203],[651,972,934,1230]]
items=[]
def item(kind,ident,r,source,native):
 rect=[max(0,r[0]-1),max(0,r[1]-1),min(native.width,r[2]+1),min(native.height,r[3]+1)];crop=native.crop(rect);scale=224/max(crop.size);size=[round(crop.width*scale),round(crop.height*scale)];offset=[(256-size[0])//2,(256-size[1])//2];im=Image.new('RGBA',(256,256));im.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset);path=ROOT/f'assets/production/items/icons/{kind}/{ident}.png';save(path,im)
 items.append({'id':kind+'-'+ident,'itemId':ident,'itemKind':kind,'name':ident,'family':'items','kind':'item','atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':sha(path),'source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'sourceRect':rect,'uniformScale':scale,'size':size,'offset':offset,'cellSize':256,'columns':1,'frames':1,'labels':[ident],'origin':[.5,.5],'displayHeight':64,'displayCell':64,'fps':0,'status':'Native candidate; rendered UI and human acceptance pending'})
for (kind,ident),rect in zip(ids,rects):item(kind,ident,rect,source,native)
source=SOURCE/'swordsman-gear-v2.png';native=Image.open(source)
for ident,rect in zip(['honed-edge','balanced-hilt','wrapped-grip','easy-harness','canteen'],[[44,262,366,559],[442,212,737,572],[822,273,1124,569],[1203,225,1532,571],[1626,230,1939,570]]):item('supply' if ident=='canteen' else 'upgrade','swordsman-'+ident,rect,source,native)
library=ROOT/'assets/production/items/library.json';value=json.loads(library.read_text(encoding='utf-8'));ids={e['id'] for e in items};value['entries']=[e for e in value['entries'] if e['id'] not in ids]+items;write(library,value)
print(json.dumps({'clips':len(delivered),'poses':sum(e['frames'] for e in delivered),'actionClips':len(actions),'itemIcons':len(items),'totalDelivery':json.loads((ROOT/'assets/delivery/survivor-motion-v1/library.json').read_text(encoding='utf-8'))['summary'],'renderedAccepted':False}))
