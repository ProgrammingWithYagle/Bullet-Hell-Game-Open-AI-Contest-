"""Technical crop, uniform resize and atlas packing. Never paints generated art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from runpy import run_path
from statistics import median
import hashlib,json,shutil
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
DOC=ROOT/'docs/encounter-item-art-2026-10-23.json'
OUT=ROOT/'assets/production/items';MOTION=ROOT/'assets/production/motion'
REVIEW=ROOT/'reviews/encounter-items-2026-10-23'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf8')
def rectangles(im,cols,rows):
 a=np.asarray(im)[:,:,3]>=128
 ycuts=[0]
 for k in range(1,rows):
  center=im.height*k/rows;radius=int(im.height/rows*.22);scores=a.sum(axis=1)
  ycuts.append(min(range(round(center)-radius,round(center)+radius),key=lambda y:(scores[y],abs(y-center))))
 ycuts.append(im.height);rects=[]
 for row in range(rows):
  strip=a[ycuts[row]:ycuts[row+1],:];xcuts=[0];scores=strip.sum(axis=0)
  for k in range(1,cols):
   center=im.width*k/cols;radius=int(im.width/cols*.23)
   xcuts.append(min(range(round(center)-radius,round(center)+radius),key=lambda x:(scores[x],abs(x-center))))
  xcuts.append(im.width)
  rects += [[xcuts[c],ycuts[row],xcuts[c+1],ycuts[row+1]] for c in range(cols)]
 return rects
def pack():
 OUT.mkdir(parents=True,exist_ok=True);REVIEW.mkdir(parents=True,exist_ok=True)
 doc=json.loads(DOC.read_text(encoding='utf8'));jobs={j['id']:j for j in doc['requests']}
 data=json.loads((ROOT/'content/catalog.json').read_text(encoding='utf8'));entries=[];partitions=[]
 feet=run_path(str(ROOT/'tools/normalize-production-art.py'))['feet_anchor']
 def native(id,cols,rows):
  job=jobs[id];p=ROOT/job['file'];assert sha(p)==job['sha256'];im=Image.open(p);assert im.mode=='RGBA'
  assert im.getchannel('A').getextrema()==(0,255),id
  rects=rectangles(im,cols,rows);restored=Image.new('RGBA',im.size)
  for rect in rects:restored.paste(im.crop(rect),rect[:2])
  assert im.tobytes()==restored.tobytes()
  partitions.append({'id':id,'source':job['file'],'sourceSha256':job['sha256'],'size':im.size,'rectangles':rects,'rgbaReconstruction':True})
  return im,rects,job
 def items(id,kind,ids,cols,rows):
  im,rects,job=native(id,cols,rows)
  for index,item in enumerate(ids):
   cell=im.crop(rects[index]);bounds=cell.getchannel('A').getbbox();assert bounds
   crop=cell.crop(bounds);scale=min(224/crop.width,224/crop.height);size=(max(1,round(crop.width*scale)),max(1,round(crop.height*scale)))
   frame=Image.new('RGBA',(256,256));offset=((256-size[0])//2,(256-size[1])//2)
   frame.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
   p=OUT/'icons'/kind/(item+'.png');p.parent.mkdir(parents=True,exist_ok=True);frame.save(p)
   entries.append({'id':kind+'-'+item,'itemId':item,'itemKind':kind,'name':item.replace('-',' ').title(),'family':'items','kind':'item',
    'atlas':p.relative_to(ROOT).as_posix(),'atlasSha256':sha(p),'source':job['file'],'sourceSha256':job['sha256'],
    'sourceRect':rects[index],'sourceAlphaBounds':bounds,'uniformScale':scale,'size':size,'offset':offset,
    'cellSize':256,'columns':1,'frames':1,'labels':[item],'origin':[.5,.5],'displayHeight':64,'displayCell':64,'fps':0,
    'status':'Assistant native and small-size review; rendered UI and human review remain open'})
 for c in ('soldier','heavy','medic'):
  items('weapon-'+c,'weapon',[w['id'] for w in data['weapons'] if w['classId']==c],2,2)
  cl=next(x for x in data['classes'] if x['id']==c)
  items('skill-'+c,'skill',[s['id'] for b in cl['branches'] for s in b['subbranches']],3,3)
 items('supply-items','supply',[s['id'] for s in data['supplies']],4,2)
 for n in range(3):items('mutation-eight-'+str(n+1),'mutation',[m['id'] for m in data['mutations'][8*n:8*n+8]],4,2)
 write(OUT/'library.json',{'schemaVersion':1,'entries':entries,'uniqueItemIllustrations':len(entries),'skillNodeReuse':'One illustration per specialization path; grade badges distinguish its six purchased nodes.'})
 # Whole generated actions use ONE scale per action and a measured foot anchor.
 clips=[];motionReceipts=[]
 for id,boss in [('ratcatcher-cast','ratcatcher'),('quarantine-clerk-cast-v3','quarantine-clerk'),('courier-charge','courier'),('rat-run','rat')]:
  im,rects,job=native(id,4,2);cells=[]
  for rect in rects:
   cell=im.crop(rect);bounds=cell.getchannel('A').getbbox();visible=cell.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
   anchor=[cell.width/2,cell.height/2] if boss=='rat' else feet(cell,visible)
   cells.append((cell,bounds,visible,anchor))
  scale=(210 if boss=='rat' else 185)/(cells[0][2][3]-cells[0][2][1]);size=384;pivot=[192,192 if boss=='rat' else 320]
  # Expand padding until every source RGBA crop fits at the common scale.
  while True:
   offsets=[[pivot[0]-round((a[0]-b[0])*scale),pivot[1]-round((a[1]-b[1])*scale)] for c,b,v,a in cells]
   if all(min(o)>=12 and o[0]+round((b[2]-b[0])*scale)<=size-12 and o[1]+round((b[3]-b[1])*scale)<=size-12 for (c,b,v,a),o in zip(cells,offsets)):break
   scale*=.96
  atlas=Image.new('RGBA',(size*4,size*2));frames=[];measurements=[]
  for index,((cell,bounds,visible,anchor),offset) in enumerate(zip(cells,offsets)):
   crop=cell.crop(bounds);target=(max(1,round(crop.width*scale)),max(1,round(crop.height*scale)))
   frame=Image.new('RGBA',(size,size));frame.alpha_composite(crop.resize(target,Image.Resampling.LANCZOS),offset)
   atlas.paste(frame,(index%4*size,index//4*size));frames.append(frame)
   measurements.append({'sourceRect':rects[index],'sourceAlphaBounds':bounds,'sourceGroundAnchor':anchor,'targetGroundAnchor':pivot,'uniformScale':scale,'size':target,'offset':offset})
  p=MOTION/(boss+'-action-v1-atlas.png');atlas.save(p)
  world=60 if boss=='rat' else 150*size/((cells[0][2][3]-cells[0][2][1])*scale)
  clip={'id':boss+'-action','bossId':boss,'name':boss.replace('-',' ').title()+' · '+('run' if boss=='rat' else 'signature'),
   'family':'minions' if boss=='rat' else 'bosses','kind':'animation','atlas':p.relative_to(ROOT).as_posix(),'atlasSha256':sha(p),'source':job['file'],'sourceSha256':job['sha256'],
   'cellSize':size,'columns':4,'frames':8,'labels':['Action '+str(i+1) for i in range(8)],'origin':[pivot[0]/size,pivot[1]/size],
   'displayHeight':60 if boss=='rat' else 150,'displayCell':world,'fps':10,'frameDurationsMs':[100]*8,
   'status':'Assistant native/action review candidate; final Phaser transition and directional acceptance pending',
   'notes':'Eight actual drawn action poses. One action scale; full native preserved. Courier has one view; rat is directly overhead and rotates as a whole.'}
  clips.append(clip);motionReceipts.append({'id':clip['id'],'frames':measurements,'atlasSha256':sha(p)})
  previews=[]
  for frame in frames:
   preview=Image.new('RGB',(380,300),'#18352f');display=round(world);sprite=frame.resize((display,display),Image.Resampling.LANCZOS)
   xy=(round(190-display*clip['origin'][0]),round((150 if boss=='rat' else 250)-display*clip['origin'][1]))
   preview.paste(sprite,xy,sprite);previews.append(preview)
  previews[0].save(MOTION/(boss+'-action-v1-preview.gif'),save_all=True,append_images=previews[1:],duration=100,loop=0,disposal=2)
 write(MOTION/'encounter-library.json',{'schemaVersion':1,'entries':clips})
 # A static size sheet is visual inspection evidence, never engine execution.
 sheet=Image.new('RGB',(1100,((len(entries)+9)//10)*128),'#18352f');draw=ImageDraw.Draw(sheet)
 font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',10)
 for i,item in enumerate(entries):
  icon=Image.open(ROOT/item['atlas']);icon.thumbnail((64,64));x=i%10*110+23;y=i//10*128+8
  sheet.paste(icon,(x,y),icon);draw.text((i%10*110+4,y+70),item['itemId'][:19],font=font,fill='#e7ddc5')
 sheet.save(REVIEW/'item-size-proof.png')
 write(REVIEW/'packing.json',{'schemaVersion':1,'sourcePartitions':partitions,'motion':motionReceipts,'items':entries,
  'nativeRGBAConserved':True,'creativePixelEditsPerformed':False,'itemIllustrations':len(entries),'motionFrames':32,'phaserMotionAccepted':False})
 print(json.dumps({'items':len(entries),'motionClips':len(clips),'motionFrames':32,'creativePixelEdits':False}))
if __name__=='__main__':pack()
