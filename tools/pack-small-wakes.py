"""Preserve whole native poses, including faint alpha; normalize one scale per identity."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from statistics import median
from io import BytesIO
import hashlib,importlib.util,json,sys
import numpy as np
R=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
B=R/'assets/production/generated/small-wakes-2026-10-26';O=B/'normalized';O.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('whole',R/'reviews/early-watch-motion-2026-10-25/whole-pose-components.py');whole=importlib.util.module_from_spec(spec);spec.loader.exec_module(whole)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save_image(im,p,**kwargs):
 stream=BytesIO();im.save(stream,format='PNG' if p.suffix=='.png' else 'JPEG',**kwargs);data=stream.getvalue()
 if p.exists():assert p.read_bytes()==data,'Refusing to replace different generated artifact: '+str(p)
 else:p.write_bytes(data)
def save_json(value,p):
 data=(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf8')
 if p.exists():assert p.read_bytes()==data,'Refusing to replace different contract: '+str(p)
 else:p.write_bytes(data)
def extract(im,boss,clip):
 a=np.array(im);labels,stats=whole.components(a[:,:,3]>0);core,cs=whole.components(a[:,:,3]>=16)
 major=cs[:4];assert major[-1]['area']>=major[0]['area']*.2
 major.sort(key=lambda s:s['centroid'][1]);ordered=[]
 for row in range(2):ordered.extend(sorted(major[row*2:row*2+2],key=lambda s:s['centroid'][0]))
 lut=np.zeros(int(core.max())+1,np.uint8)
 for i,s in enumerate(ordered):lut[s['label']]=i+1
 coreOwner=lut[core];mapping={}
 for code in np.unique(labels.astype(np.int64)*5+coreOwner):
  label,own=divmod(int(code),5)
  if label and own:mapping.setdefault(label,set()).add(own)
 owners=np.zeros(int(labels.max())+1,np.uint8);bridges=[]
 for s in stats:
  values=mapping.get(s['label'],set())
  if len(values)==1:owners[s['label']]=next(iter(values))
  elif not values:
   x,y=s['centroid']
   def distance(m):
    l,t,r,b=m['bounds'];dx=max(l-x,0,x-r);dy=max(t-y,0,y-b);return dx*dx+dy*dy
   owners[s['label']]=1+min(range(4),key=lambda i:distance(ordered[i]))
  else:
   # The kettle's two lower figures are connected only by alpha<16 between x669 and671.
   assert boss=='mourning-kettle' and clip=='attack' and values=={3,4},(boss,clip,values)
   bridges.append(s['label'])
 owner=owners[labels]
 for label in bridges:
  ys,xs=np.where(labels==label);owner[ys,xs]=np.where(xs<670,3,4)
 assert np.array_equal(owner>0,a[:,:,3]>0)
 # No alpha>=16 connected figure or detail may be split by the exceptional faint bridge.
 codes=np.unique(core.astype(np.int64)*5+owner);live=codes[codes//5>0]//5;assert len(np.unique(live))==len(live)
 pieces=[];rects=[]
 for n in range(1,5):
  ys,xs=np.where(owner==n);box=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)];l,t,r,b=box
  piece=a[t:b,l:r].copy();piece[owner[t:b,l:r]!=n]=0;pieces.append(Image.fromarray(piece));rects.append(box)
 return owner,pieces,rects,{'threshold16UsedOnlyForIdentityOwnership':True,'thresholdNotAppliedToArtwork':True,'faintBridgeLabels':bridges,'faintBridgeRule':'lower-row x<670 belongs to pose3, x>=670 pose4; every alpha-bearing source RGBA retained' if bridges else None}
def foot(im):
 a=np.array(im);ys,xs=np.where(a[:,:,3]>=16);bottom=int(ys.max()+1);top=bottom-max(2,round((bottom-int(ys.min()))*.1));weights=a[top:bottom,:,3].astype(np.float64);weights[weights<16]=0
 return [round(float((weights*(np.arange(im.width)+.5)).sum()/weights.sum())),bottom]

records=[];entries=[];cell=512;anchor=[256,430]
contact=Image.new('RGB',(1320,1810),'#18282d');draw=ImageDraw.Draw(contact);font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',18)
draw.text((20,12),'SMALL WAKES / 36 whole-pose motion candidates / composite, not engine capture',font=font,fill='#ead9b1')
for bi,boss in enumerate(['candle-snail','cobble-crab','mourning-kettle']):
 clips=[];calibrations=[]
 for clip in ['idle','attack','defeat']:
  version=2 if boss=='mourning-kettle' and clip=='idle' else 1;p=B/f'{boss}-{clip}-v{version}.png';im=Image.open(p);assert im.mode=='RGBA'
  owner,pieces,rects,method=extract(im,boss,clip);bbox=pieces[0].getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();calibrations.append(bbox[3]-bbox[1]);clips.append((clip,p,im,owner,pieces,rects,method))
 desired={'candle-snail':200,'cobble-crab':190,'mourning-kettle':220}[boss];scale=desired/median(calibrations);atlas=Image.new('RGBA',(2048,1536));bossclips=[]
 for row,(clip,p,im,owner,pieces,rects,method) in enumerate(clips):
  op=O/f'{boss}-{clip}-owners.png';save_image(Image.fromarray(owner),op);frames=[]
  for col,(piece,rect) in enumerate(zip(pieces,rects)):
   sourceFoot=foot(piece);size=[round(piece.width*scale),round(piece.height*scale)];offset=[anchor[0]-round(sourceFoot[0]*scale),anchor[1]-round(sourceFoot[1]*scale)]
   assert min(*offset,cell-offset[0]-size[0],cell-offset[1]-size[1])>=4,(boss,clip,col,offset,size)
   frame=Image.new('RGBA',(cell,cell));frame.paste(piece.resize(size,Image.Resampling.LANCZOS),offset);fp=O/f'{boss}-{clip}-{col}.png';save_image(frame,fp);atlas.paste(frame,(col*cell,row*cell))
   frames.append({'frame':row*4+col,'sourceRect':rect,'sourceFootAnchor':sourceFoot,'resizedSize':size,'offset':offset[:2],'path':fp.relative_to(R).as_posix(),'sha256':sha(fp)})
   thumb=frame.resize((220,220),Image.Resampling.LANCZOS);contact.paste(thumb,(390+col*225,50+(bi*3+row)*192),thumb)
  draw.text((20,110+(bi*3+row)*192),boss+' / '+clip,font=font,fill='#d7c7a6')
  records.append({'bossId':boss,'clip':clip,'native':p.relative_to(R).as_posix(),'nativeSha256':sha(p),'sourceSize':list(im.size),'owner':op.relative_to(R).as_posix(),'ownerSha256':sha(op),'oneScalePerIdentity':scale,'calibrationFirstPoseHeights':calibrations,'calibrationPixels':desired,'method':method,'frames':frames})
  bossclips.append({'id':clip,'startFrame':row*4,'frames':4,'fps':5 if clip=='defeat' else 5.5,'loop':clip!='defeat'})
 ap=R/'assets/production/motion'/f'{boss}-action-v1-atlas.png';save_image(atlas,ap)
 entries.append({'bossId':boss,'atlas':ap.relative_to(R).as_posix(),'atlasSha256':sha(ap),'cellSize':cell,'columns':4,'frames':12,'origin':[.5,anchor[1]/cell],'displayCell':400,'clips':bossclips,'defeatStartFrame':8,'defeatFrames':4,'defeatFps':5,'fps':5.5,'source':'Complete alpha-bearing native RGBA ownership, one scale per identity; no articulated edits','renderedAccepted':False,'humanAccepted':False})
save_image(contact,O/'small-wakes-motion.jpg',quality=94)
save_json({'schemaVersion':1,'entries':entries},R/'assets/production/motion/small-wakes-library.json')
save_json({'schemaVersion':1,'cellSize':cell,'anchor':anchor,'extractorSha256':sha(R/'reviews/early-watch-motion-2026-10-25/whole-pose-components.py'),'clips':records,'limits':['Native alpha>=16 is used only for ownership seeds and anchor measurement, never to remove source alpha.','Kettle attack lower-row alpha<16 bridge is explicitly partitioned; no readable connected figure is split.','All alpha-bearing original RGBA is reconstructed independently; invisible RGB with alpha0 stays in the immutable native.','This is technical normalization and assistant static inspection, not engine/human/device acceptance.']},B/'packing-v2.json')
print(json.dumps({'identities':3,'completePoses':36,'oneScalePerIdentity':True,'contact':str(O/'small-wakes-motion.jpg')}))
