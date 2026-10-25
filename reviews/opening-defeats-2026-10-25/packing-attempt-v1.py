"""Append complete boss collapse clips while retaining every original action pixel and world transform."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import hashlib,importlib.util,json,math
import numpy as np
ROOT=Path(__file__).resolve().parents[1];REVIEW=ROOT/'reviews/opening-defeats-2026-10-25';OUT=ROOT/'assets/production/motion';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
write=lambda p,v:p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8',newline='\n')
batch=json.loads((ROOT/'docs/opening-defeats-2026-10-25.json').read_text(encoding='utf-8'));inputs=json.loads((REVIEW/'input-contracts.json').read_text(encoding='utf-8'));old_entries=inputs['entries']
spec=importlib.util.spec_from_file_location('whole_pose',REVIEW/'whole-pose-components.py');whole=importlib.util.module_from_spec(spec);spec.loader.exec_module(whole)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
def cuts(count,length,counts):
 result=[0]
 for n in range(1,count):
  expected=round(length*n/count);radius=round(length/count*.35);options=[v for v in range(max(result[-1]+1,expected-radius),min(length,expected+radius))if counts[v]==0];assert options,'No fully transparent gutter';result.append(min(options,key=lambda v:abs(v-expected)))
 return result+[length]
def feet(frame,bounds):
 a=np.array(frame.getchannel('A'));x0,y0,x1,y1=bounds;low=a[max(y0,y1-round((y1-y0)*.1)):y1,x0:x1].copy();low[low<16]=0;weights=low.sum(axis=0).astype(np.float64);assert weights.sum()>0
 return [round(float(np.dot(np.arange(x0,x1)+.5,weights)/weights.sum())),y1]
entries=[];receipts=[]
for request in batch['requests']:
 ident=request['bossId'];old=next(e for e in old_entries if e['bossId']==ident);source=ROOT/request['file'];assert sha(source)==request['sha256']
 native=Image.open(source);assert native.mode=='RGBA';a=np.array(native.getchannel('A'));ownership=None;mask_record=None
 try:
  ycuts=cuts(2,native.height,(a>0).sum(axis=1));pieces=[];rects=[];restored=Image.new('RGBA',native.size)
  for row in range(2):
   y0,y1=ycuts[row:row+2];xcuts=cuts(4,native.width,(a[y0:y1]>0).sum(axis=0))
   for col in range(4):
    rect=[xcuts[col],y0,xcuts[col+1],y1];piece=native.crop(rect);pieces.append(piece);rects.append(rect);restored.paste(piece,rect[:2])
  assert restored.tobytes()==native.tobytes()
 except AssertionError:
  ownership,pieces,rects,major=whole.extract(native,4,2);mask=REVIEW/(ident+'-ownership.png');Image.fromarray(ownership).save(mask);mask_record={'path':mask.relative_to(ROOT).as_posix(),'sha256':sha(mask),'completeFigureCount':8,'majorFigures':major}
 visible=[p.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox()for p in pieces];assert all(visible)
 scale=old['standingCalibrationHeight']/(visible[0][3]-visible[0][1]);old_size=old['cellSize'];assert old_size==384
 pivot=[round(old['origin'][0]*old_size),round(old['origin'][1]*old_size)];fixed_x=feet(pieces[0],visible[0])[0]+rects[0][0];plans=[];expansion=0
 for index,piece in enumerate(pieces):
  bounds=piece.getchannel('A').getbbox();v=visible[index];anchor=[fixed_x+(index%4)*native.width/4-rects[index][0],v[3]];crop=piece.crop(bounds);resized=[round(crop.width*scale),round(crop.height*scale)];offset=[pivot[0]-round((anchor[0]-bounds[0])*scale),pivot[1]-round((anchor[1]-bounds[1])*scale)]
  expansion=max(expansion,16-offset[0],16-offset[1],offset[0]+resized[0]-(old_size-16),offset[1]+resized[1]-(old_size-16));plans.append((bounds,v,anchor,crop,resized,offset))
 extra=math.ceil(expansion/32)*32 if expansion>0 else 0;size=old_size+2*extra;assert size<=512,(ident,'Regenerate rather than creating an excessive cell',size)
 anchor=[pivot[0]+extra,pivot[1]+extra];atlas=Image.new('RGBA',(4*size,4*size));original=Image.open(ROOT/old['atlas']);assert sha(ROOT/old['atlas'])==old['atlasSha256']and original.mode=='RGBA';prefix=[]
 for n in range(8):
  cell=original.crop((n%old['columns']*old_size,n//old['columns']*old_size,(n%old['columns']+1)*old_size,(n//old['columns']+1)*old_size));target=Image.new('RGBA',(size,size));target.paste(cell,(extra,extra));atlas.paste(target,(n%4*size,n//4*size));prefix.append(target)
 measurements=[];frames=[]
 for n,(bounds,v,ground,crop,resized,offset)in enumerate(plans):
  offset=[v+extra for v in offset];assert min(offset)>=16 and offset[0]+resized[0]<=size-16 and offset[1]+resized[1]<=size-16
  target=Image.new('RGBA',(size,size));target.alpha_composite(crop.resize(resized,Image.Resampling.LANCZOS),offset);packed=target.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox();assert packed and min(packed[0],packed[1],size-packed[2],size-packed[3])>=16
  atlas.paste(target,((n+8)%4*size,(n+8)//4*size));frames.append(target)
  measurements.append({'frame':n,'runtimeFrame':n+8,'sourceRect':rects[n],'sourceAlphaBounds':list(bounds),'sourceAlpha16Bounds':list(v),'sourceGroundAnchor':ground,'targetGroundAnchor':anchor,'uniformScale':scale,'offset':offset,'resizedCrop':resized,'targetAlpha16Bounds':list(packed)})
 path=OUT/(ident+'-action-v2-atlas.png');assert not path.exists();atlas.save(path)
 entry={k:v for k,v in old.items()if k not in ['approvedReference','referenceAlpha16Bounds','standingCalibrationHeight']};entry.update({'atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':sha(path),'cellSize':size,'columns':4,'frames':16,'labels':old['labels']+[f'Defeat {n+1}'for n in range(8)],'frameDurationsMs':old['frameDurationsMs']+[125]*8,'origin':[anchor[0]/size,anchor[1]/size],'displayCell':old['displayCell']*size/old_size,'baseAtlas':old['atlas'],'baseAtlasSha256':old['atlasSha256'],'baseCellSize':old_size,'basePadding':extra,'defeatSource':request['file'],'defeatSourceSha256':sha(source),'liveFrames':8,'defeatStartFrame':8,'defeatFrames':8,'defeatFps':8,'status':'Original live action pixels preserved; complete new defeat candidate; rendered/device/human review pending','notes':'Eight unchanged live frames, symmetrically padded when needed, followed by eight complete new defeat poses. Collapse uses one standing-calibrated scale and fixed horizontal ground origin.'})
 entries.append(entry);proof=Image.new('RGB',(4*320,2*300),'#19372f');previews=[]
 for n,frame in enumerate(frames):
  panel=Image.new('RGB',(320,300),'#19372f');draw=ImageDraw.Draw(panel);draw.text((10,10),ident+f' defeat {n+1}/8',font=font,fill='#eee1c2');draw.text((10,31),'World size; rendered review pending',font=font,fill='#bacbb8');span=round(entry['displayCell']);sprite=frame.resize((span,span),Image.Resampling.LANCZOS);panel.paste(sprite,(round(160-span*entry['origin'][0]),round(275-span*entry['origin'][1])),sprite);draw.line((144,275,176,275),fill='#729689');proof.paste(panel,(n%4*320,n//4*300));previews.append(panel)
 proof_path=REVIEW/(ident+'-contact-sheet.png');proof.save(proof_path);preview=REVIEW/(ident+'-preview.gif');previews[0].save(preview,save_all=True,append_images=previews[1:],duration=[120,130]*4,loop=0,disposal=2)
 receipt={'bossId':ident,'source':request['file'],'nativeSha256':sha(source),'sourceSize':list(native.size),'sourceRgbaPartitionExact':True,'sourceRectanglesConserveEveryRGBAPixel':ownership is None,'uniformScale':scale,'calibration':'New frame 1 standing height matches the original frame-zero alpha16 height; no per-frame size fits','fixedHorizontalGroundOrigin':True,'originalAtlas':old['atlas'],'originalAtlasSha256':old['atlasSha256'],'originalCellSize':old_size,'symmetricPadding':extra,'originalLiveFrames':8,'originalLiveRgbaPixelsUnchanged':True,'originalLiveWorldTransformUnchanged':True,'atlas':entry['atlas'],'atlasSha256':sha(path),'frames':measurements,'preview':preview.relative_to(ROOT).as_posix(),'previewSha256':sha(preview),'contactSheet':proof_path.relative_to(ROOT).as_posix(),'contactSheetSha256':sha(proof_path)}
 if mask_record:receipt['sourceOwnershipMask']=mask_record
 receipts.append(receipt)
write(OUT/'opening-defeats-library.json',{'schemaVersion':1,'sourceTool':'tools/pack-opening-defeats.py','sourceToolSha256':sha(Path(__file__)),'entries':entries,'newCompletePoses':56,'preservedOriginalLivePoses':56,'renderedAccepted':False})
write(REVIEW/'packing.json',{'schemaVersion':1,'entries':receipts,'creativePixelEditsPerformed':False,'alphaErasurePerformed':False,'facingsMirrored':False,'renderedAccepted':False,'limits':['Every source pose stays intact; whole-pose partition only.','The original eight action frames retain exact RGBA pixels and world transforms inside the new sixteen-frame atlas.','Generated/native/contact-sheet candidates remain separate from rendered/device/human acceptance.']})
print(json.dumps({'bosses':7,'newPoses':56,'preservedLivePoses':56,'cells':{e['bossId']:e['cellSize']for e in entries},'ownershipMasks':sum('sourceOwnershipMask'in e for e in receipts)}))
