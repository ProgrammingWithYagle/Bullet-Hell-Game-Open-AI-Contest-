from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import hashlib,importlib.util,json,numpy as np,shutil
R=Path(r'C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)')
B=R/'assets/production/generated/early-watch-integration-2026-10-25'
O=B/'normalized';O.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('whole',R/'reviews/early-watch-motion-2026-10-25/whole-pose-components.py')
whole=importlib.util.module_from_spec(spec);spec.loader.exec_module(whole)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
records=[];entries=[];cell=512;anchor=(256,420)
contact=Image.new('RGB',(1320,1810),'#18282d');draw=ImageDraw.Draw(contact)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',18)
draw.text((20,12),'EARLY WATCH / 36 whole-pose runtime candidates / local composite, not engine capture',font=font,fill='#ead9b1')
for bi,(boss,clips) in enumerate([('ashen-usher',['walk','call','defeat']),('brass-toad',['idle','hop','defeat']),('ragpicker-kite',['float','gust','defeat'])]):
 atlas=Image.new('RGBA',(cell*4,cell*3));bossclips=[]
 for row,clip in enumerate(clips):
  if boss=='brass-toad':
   old=R/'assets/production/generated/early-watch-motion-2026-10-25'
   version=1 if clip=='defeat' else 2;p=old/'natives'/f'{boss}-{clip}-v{version}.png'
   im=Image.open(p).convert('RGBA');a=np.array(im);owner=np.load(old/'normalized'/f'{boss}-{clip}-owners.npz')['owner']
   pieces=[];rects=[]
   for n in range(1,5):
    ys,xs=np.where(owner==n);box=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)];x,y,z,w=box
    part=a[y:w,x:z].copy();part[owner[y:w,x:z]!=n]=0;pieces.append(Image.fromarray(part));rects.append(box)
  else:
   p=B/'natives'/f'{boss}-{clip}-v2.png';im=Image.open(p).convert('RGBA');a=np.array(im)
   owner,pieces,rects,_=whole.extract(im,2 if clip=='defeat' else 4,2 if clip=='defeat' else 1)
  assert np.array_equal(owner>0,a[:,:,3]>0)
  np.savez_compressed(O/f'{boss}-{clip}-owners.npz',owner=owner)
  readable=pieces[0].getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox()
  axis=0 if boss=='ragpicker-kite' else 1
  desired=260 if axis==0 else 148 if boss=='brass-toad' else 196
  scale=desired/(readable[axis+2]-readable[axis]);frames=[]
  for col,(piece,rect) in enumerate(zip(pieces,rects)):
   resized=piece.resize((round(piece.width*scale),round(piece.height*scale)),Image.Resampling.LANCZOS)
   vis=resized.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox()
   paste=[anchor[0]-(vis[0]+vis[2])//2,anchor[1]-vis[3]]
   assert min(*paste,cell-paste[0]-resized.width,cell-paste[1]-resized.height)>=8,(boss,clip,col,paste,resized.size)
   frame=Image.new('RGBA',(cell,cell));frame.paste(resized,paste)
   path=O/f'{boss}-{clip}-{col}.png';frame.save(path);atlas.paste(frame,(col*cell,row*cell))
   frames.append({'sourceRect':rect,'resizedSize':list(resized.size),'paste':paste[:2],'path':path.relative_to(R).as_posix(),'sha256':sha(path)})
   thumb=frame.resize((220,220),Image.Resampling.LANCZOS)
   contact.paste(thumb,(390+col*225,50+(bi*3+row)*192),thumb)
  draw.text((20,110+(bi*3+row)*192),boss+' / '+clip,font=font,fill='#d7c7a6')
  records.append({'bossId':boss,'clip':clip,'native':p.relative_to(R).as_posix(),'nativeSha256':sha(p),'columns':2 if boss=='brass-toad' or clip=='defeat' else 4,'rows':2 if boss=='brass-toad' or clip=='defeat' else 1,'uniformScale':scale,'calibrationAxis':axis,'calibrationPixels':desired,'owner':(O/f'{boss}-{clip}-owners.npz').relative_to(R).as_posix(),'frames':frames})
  bossclips.append({'id':clip,'startFrame':row*4,'frames':4,'fps':5 if clip=='defeat' else 5.5,'loop':clip!='defeat'})
 ap=R/'assets/production/motion'/f'{boss}-action-v1-atlas.png';assert not ap.exists();atlas.save(ap)
 entries.append({'bossId':boss,'atlas':ap.relative_to(R).as_posix(),'atlasSha256':sha(ap),'cellSize':cell,'columns':4,'frames':12,'origin':[.5,anchor[1]/cell],'displayCell':400,'clips':bossclips,'defeatStartFrame':8,'defeatFrames':4,'defeatFps':5,'fps':5.5,'source':'whole-pose RGBA extraction; no articulated editing','renderedAccepted':False,'humanAccepted':False})
contact.save(O/'early-watch-motion.jpg',quality=94)
(R/'assets/production/motion/early-watch-library.json').write_text(json.dumps({'schemaVersion':1,'entries':entries},indent=2)+'\n',encoding='utf-8',newline='\n')
(B/'packing.json').write_text(json.dumps({'cellSize':cell,'anchor':anchor,'extractorSha256':sha(R/'reviews/early-watch-motion-2026-10-25/whole-pose-components.py'),'clips':records},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'identities':3,'completePoses':36,'atlasSize':[2048,1536],'contact':str(O/'early-watch-motion.jpg')}))
