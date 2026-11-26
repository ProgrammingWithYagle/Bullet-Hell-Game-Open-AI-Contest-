from pathlib import Path
from PIL import Image,ImageDraw
from runpy import run_path
from statistics import median
import json,hashlib,shutil
R=Path(__file__).resolve().parents[1]
D=R/'assets/production/generated/warden-patrol-2026-10-25';V=R/'reviews/warden-patrol-2026-10-25';native=D/'warden-patrol-v1.png';assert native.exists()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v):p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf8',newline='\n')
issued=json.loads((V/'packing.json').read_text(encoding='utf8'))
assert sha(native)==issued['sourceSha256']
for item in issued['preserved']:assert sha(R/item['path'])==item['sha256']
prior=json.loads((R/'assets/production/motion/warden-rehearsal.json').read_text(encoding='utf8'))
preserved=[{'path':p.relative_to(R).as_posix(),'sha256':sha(p)} for p in (R/'assets/production/bosses/lantern-warden').rglob('*.png')]
preserved += [{'path':'assets/production/motion/warden-rehearsal.json','sha256':sha(R/'assets/production/motion/warden-rehearsal.json')}]
im=Image.open(native);assert im.mode=='RGBA' and im.size==(1254,1254)
anchor=run_path(str(R/'tools/normalize-production-art.py'))['feet_anchor']
parts=[];reconstructed=Image.new('RGBA',im.size)
for i,rect in enumerate([[0,0,627,627],[627,0,1254,627],[0,627,700,1254],[700,627,1254,1254]]):
 cell=im.crop(rect);reconstructed.paste(cell,rect[:2]);bounds=cell.getchannel('A').getbbox();visible=cell.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();assert bounds and visible
 assert min(visible[0],visible[1],cell.width-visible[2],cell.height-visible[3])>=8
 parts.append((cell,bounds,visible,anchor(cell,visible),rect))
assert reconstructed.tobytes()==im.tobytes();scale=256/median(v[3]-v[1] for _,_,v,_,_ in parts)
atlas=Image.new('RGBA',(1024,1024));proof=Image.new('RGB',(1024,1024),(33,40,43));frames=[];receipt=[]
for i,(cell,bounds,visible,foot,rect) in enumerate(parts):
 crop=cell.crop(bounds);size=[round(crop.width*scale),round(crop.height*scale)];offset=[256-round((foot[0]-bounds[0])*scale),430-round((foot[1]-bounds[1])*scale)]
 assert min(offset)>=0 and offset[0]+size[0]<=512 and offset[1]+size[1]<=512
 frame=Image.new('RGBA',(512,512));frame.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset);atlas.paste(frame,((i%2)*512,(i//2)*512));proof.paste(frame,((i%2)*512,(i//2)*512),frame);frames.append(frame)
 receipt.append({'frame':i,'sourceRect':rect,'sourceAlphaBounds':bounds,'sourceAlpha16Bounds':visible,'sourceFootAnchor':foot,'uniformScale':scale,'resizedSize':size,'offset':offset,'targetFootAnchor':[256,430]})
out=R/'assets/production/motion/lantern-warden-patrol-v1-atlas.png';atlas.save(out);proof.save(V/'patrol-contact.png')
entry={'id':'lantern-warden-patrol','name':'Lantern Warden · Patrol shuffle','family':'bosses','kind':'animation','atlas':out.relative_to(R).as_posix(),'source':native.relative_to(R).as_posix(),'sourceSha256':sha(native),'atlasSha256':sha(out),'cellSize':512,'columns':2,'frames':4,'labels':['plant left','pass right','plant right','pass left'],'origin':[.5,430/512],'displayHeight':150,'displayCell':prior['displayCell']*344/256,'fps':5,'frameDurationsMs':[200]*4,'status':'Native identity/motion inspected by assistant; actual shared-authority patrol integration; rendered/device/human acceptance pending','notes':'Four drawn grounded shuffle poses, one physical-left lantern, no reflection. One scale for the whole clip; alpha-bearing pixels retained including faint native margins. Median 256-pixel body maps to the same 150-pixel world height as the original 344-pixel Warden body. Rest-only relocation, never a moving active cone.'}
write(R/'assets/production/motion/warden-patrol.json',entry)
for name in ['assets/production/motion/library.json','assets/production/normalized/library.json']:
 p=R/name;data=json.loads(p.read_text(encoding='utf8'));data['entries']=[e for e in data['entries'] if e['id']!=entry['id']];data['entries'].append(entry);write(p,data)
write(V/'packing-attempt-1.json',{'packed':False,'reason':'Equal 627-pixel cells cross the third pose lantern. Alpha-1 native margins also reach the nominal cell edge. No source pixels changed; use explicit ownership rectangles and lower packing resolution with compensated world scale.','sourceSha256':sha(native)})
write(V/'packing.json',{'source':entry['source'],'sourceSha256':sha(native),'sourceSize':list(im.size),'atlas':entry['atlas'],'atlasSha256':sha(out),'oneScale':scale,'calibratedBodyHeight':256,'sourceRectsConserveRGBA':True,'frames':receipt,'preserved':preserved,'nativeInspection':{'identity':True,'fourDifferentPoses':True,'onePhysicalLeftLantern':True,'fullBootsCoatLantern':True,'noMirroring':True,'renderedAccepted':False}})
print(json.dumps({'frames':4,'native':str(native),'sha256':sha(native),'atlas':str(out),'scale':scale,'displayCell':entry['displayCell']}))
