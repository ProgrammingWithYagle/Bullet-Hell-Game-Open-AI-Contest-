"""Pack intact Constable poses; no repainting, alpha repair, mirroring or per-pose fitting."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import hashlib,importlib.util,json,math
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
REVIEW=ROOT/'reviews/constable-motion-2026-10-25'
OUT=ROOT/'assets/production/motion'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
write=lambda p,v:p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8',newline='\n')
provenance=json.loads((ROOT/'docs/constable-motion-2026-10-25.json').read_text())
calibration=json.loads((REVIEW/'seed-calibration.json').read_text())
module_spec=importlib.util.spec_from_file_location('whole_pose',REVIEW/'whole-pose-components.py')
whole_pose=importlib.util.module_from_spec(module_spec);module_spec.loader.exec_module(whole_pose)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',16)

def cuts(count,length,counts):
 result=[0]
 for n in range(1,count):
  expected=round(length*n/count);radius=round(length/count*.35)
  candidates=[v for v in range(max(result[-1]+1,expected-radius),min(length,expected+radius))if counts[v]==0]
  assert candidates,'No complete transparent gutter'
  result.append(min(candidates,key=lambda v:abs(v-expected)))
 return result+[length]

def ground(frame,bounds):
 alpha=np.array(frame.getchannel('A'));x0,y0,x1,y1=bounds
 low=alpha[max(y0,y1-round((y1-y0)*.1)):y1,x0:x1].copy();low[low<16]=0
 weights=low.sum(axis=0).astype(np.float64);assert weights.sum()>0
 return [round(float(np.dot(np.arange(x0,x1)+.5,weights)/weights.sum())),y1]

entries=[];receipts=[];idle_scale=None;idle_source_size=None;world_pixel=calibration['bodyWorldHeight']/288
for action,count,columns,rows,fps,calibration_frame in [('idle',4,2,2,5,0),('hurt',3,3,1,10,2),('stagger',4,2,2,5,0),('defeat',8,4,2,8,0)]:
 item=next(v for v in provenance['requests']if v['clip']==action);source=ROOT/item['file'];assert sha(source)==item['sha256']
 native=Image.open(source);assert native.mode=='RGBA';alpha=np.array(native.getchannel('A'));ownership=None;mask_record=None
 try:
  ycuts=cuts(rows,native.height,(alpha>0).sum(axis=1));source_frames=[];rectangles=[];restored=Image.new('RGBA',native.size)
  for row in range(rows):
   y0,y1=ycuts[row:row+2];xcuts=cuts(columns,native.width,(alpha[y0:y1]>0).sum(axis=0))
   for col in range(columns):
    rect=[xcuts[col],y0,xcuts[col+1],y1];frame=native.crop(rect);source_frames.append(frame);rectangles.append(rect);restored.paste(frame,rect[:2])
  assert restored.tobytes()==native.tobytes()
 except AssertionError:
  ownership,source_frames,rectangles,major=whole_pose.extract(native,columns,rows)
  path=REVIEW/f'constable-{action}-ownership.png';Image.fromarray(ownership).save(path)
  mask_record={'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path),'completeFigureCount':count,'majorFigures':major}
 visible=[frame.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()for frame in source_frames];assert all(visible)
 scale=288/(visible[calibration_frame][3]-visible[calibration_frame][1])
 if action=='idle':idle_scale=scale;idle_source_size=native.size
 if action=='stagger':
  assert native.size==idle_source_size,'The stooped loop must share the upright sheet canvas scale'
  scale=idle_scale
 fixed_x=ground(source_frames[0],visible[0])[0]+rectangles[0][0]
 plans=[];expansion=0
 for index,frame in enumerate(source_frames):
  bounds=frame.getchannel('A').getbbox();v=visible[index];anchor=ground(frame,v)
  if action=='defeat':anchor[0]=fixed_x+(index%columns)*native.width/columns-rectangles[index][0]
  crop=frame.crop(bounds);resized=[round(crop.width*scale),round(crop.height*scale)]
  offset=[192-round((anchor[0]-bounds[0])*scale),320-round((anchor[1]-bounds[1])*scale)]
  expansion=max(expansion,16-offset[0],16-offset[1],offset[0]+resized[0]-368,offset[1]+resized[1]-368)
  plans.append((bounds,v,anchor,crop,resized,offset))
 extra=math.ceil(expansion/32)*32 if expansion>0 else 0;size=384+2*extra;pivot=[192+extra,320+extra];assert size<=640
 atlas=Image.new('RGBA',(columns*size,rows*size));frames=[];measurements=[];display=size*world_pixel
 for index,(bounds,v,anchor,crop,resized,old_offset)in enumerate(plans):
  offset=[v+extra for v in old_offset];assert min(offset)>=16 and offset[0]+resized[0]<=size-16 and offset[1]+resized[1]<=size-16
  target=Image.new('RGBA',(size,size));target.alpha_composite(crop.resize(resized,Image.Resampling.LANCZOS),offset)
  packed=target.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();assert packed and min(packed[0],packed[1],size-packed[2],size-packed[3])>=16
  atlas.alpha_composite(target,(index%columns*size,index//columns*size));frames.append(target)
  measurements.append({'frame':index,'sourceRect':rectangles[index],'sourceAlphaBounds':list(bounds),'sourceAlpha16Bounds':list(v),'sourceGroundAnchor':anchor,'targetGroundAnchor':pivot,'uniformScale':scale,'offset':offset,'resizedCrop':resized,'targetAlpha16Bounds':list(packed)})
 path=OUT/f'constable-{action}-v1-atlas.png';assert not path.exists();atlas.save(path)
 entry={'id':'constable-'+action,'name':'Hollow Constable '+action.title(),'bossId':'constable','family':'bosses','kind':'animation','action':action,'source':item['file'],'sourceSha256':sha(source),'atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':sha(path),'cellSize':size,'columns':columns,'frames':count,'fps':fps,'frameDurationsMs':[1000/fps]*count,'origin':[pivot[0]/size,pivot[1]/size],'displayHeight':calibration['bodyWorldHeight'],'displayCell':display,'loop':action in ['idle','stagger'],'labels':[str(n+1)for n in range(count)],'status':'Assistant native/contact-sheet candidate; rendered transitions, physical devices and human review pending'}
 entries.append(entry);previews=[];proof=Image.new('RGB',(380*min(4,count),350*math.ceil(count/4)),'#142e29')
 for n,frame in enumerate(frames):
  panel=Image.new('RGB',(380,350),'#142e29');draw=ImageDraw.Draw(panel);draw.text((12,10),f'Constable {action} {n+1}/{count}',font=font,fill='#e7ddc3');draw.text((12,32),'World size / rendered review pending',font=font,fill='#9db5aa')
  span=round(display);sprite=frame.resize((span,span),Image.Resampling.LANCZOS);x=round(190-span*pivot[0]/size);y=round(320-span*pivot[1]/size);panel.paste(sprite,(x,y),sprite)
  draw.line((170,320,210,320),fill='#729689');draw.line((190,316,190,324),fill='#729689');proof.paste(panel,(n%4*380,n//4*350));previews.append(panel)
 proof_path=REVIEW/f'{action}-contact-sheet.png';proof.save(proof_path)
 preview=REVIEW/f'{action}-preview.gif';durations=[round(1000/fps/10)*10]*count
 if action=='defeat':durations=[120,130]*4
 previews[0].save(preview,save_all=True,append_images=previews[1:],duration=durations,loop=0,disposal=2)
 receipt={'id':entry['id'],'source':entry['source'],'nativeSha256':sha(source),'sourceSize':list(native.size),'sourceRgbaPartitionExact':True,'sourceRectanglesConserveEveryRGBAPixel':ownership is None,'calibrationFrame':calibration_frame,'uniformScale':scale,'sharedScaleAcrossWholeClip':True,'calibrationPolicy':'Same source-canvas scale as upright idle, preserving the stooped silhouette'if action=='stagger'else'One upright calibration frame; never fit shortened poses independently','groundXPolicy':'Fixed first-column standing ground X carried to every source column'if action=='defeat'else'Alpha-weighted lower ten percent of the complete pose','frames':measurements,'atlas':entry['atlas'],'atlasSha256':sha(path),'preview':preview.relative_to(ROOT).as_posix(),'previewSha256':sha(preview),'previewDurationsMs':durations,'contactSheet':proof_path.relative_to(ROOT).as_posix(),'contactSheetSha256':sha(proof_path)}
 if mask_record:receipt['sourceOwnershipMask']=mask_record
 receipts.append(receipt)
old=provenance['priorAttack'];metadata=json.loads((ROOT/old['metadata']).read_text());assert sha(ROOT/old['atlas'])==old['atlasSha256']
attack={'id':'constable-attack','name':'Hollow Constable Attack (retained)','bossId':'constable','family':'bosses','kind':'animation','action':'attack','atlas':old['atlas'],'atlasSha256':old['atlasSha256'],'source':'assets/proofs/boss-attack-v1.png','sourceSha256':sha(ROOT/'assets/proofs/boss-attack-v1.png'),'cellSize':512,'columns':4,'frames':8,'fps':10,'frameDurationsMs':[100]*8,'origin':metadata['origin'],'displayHeight':calibration['bodyWorldHeight'],'displayCell':300,'loop':False,'labels':['idle','prepare','raise','hold','release','recover','settle','idle'],'status':'Original shipped attack art preserved; timing now follows authoritative cast release'}
contract={'schemaVersion':1,'bossId':'constable','groundOffsetY':65,'sourceTool':'tools/pack-constable-motion.py','sourceToolSha256':sha(Path(__file__)),'calibration':calibration,'clips':{e['action']:e for e in entries+[attack]},'entries':entries+[attack],'selectedNewPoses':19,'retainedAttackPoses':8,'renderedAccepted':False}
write(OUT/'constable-library.json',contract)
write(REVIEW/'packing.json',{'schemaVersion':1,'clips':receipts,'creativePixelEditsPerformed':False,'alphaErasurePerformed':False,'facingsMirrored':False,'renderedAccepted':False,'limits':['Original complete poses only; one shared scale within every clip.','Stagger shares the upright idle native-canvas scale instead of being stretched upright.','Defeat holds a fixed horizontal ground origin and preserves naturally short/wide fallen poses.','Native/contact-sheet review and exact reconstruction are separate from rendered/device/human acceptance.']})
print(json.dumps({'clips':5,'newPoses':19,'retainedAttackPoses':8,'cellSizes':{e['action']:e['cellSize']for e in entries},'ownershipMasks':sum('sourceOwnershipMask'in e for e in receipts)}))
