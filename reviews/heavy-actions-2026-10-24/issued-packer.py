from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from statistics import median
import hashlib,json,sys,importlib.util,math
import numpy as np

W=Path(__file__).resolve().parent;NAME=sys.argv[1];assert NAME in ['engineer','mage','heavy','assassin'];OUT=W/NAME/'packed';OUT.mkdir(exist_ok=True)
manifest=json.loads((W/NAME/'native-returns.json').read_text(encoding='utf-8'))
selection_path=W/NAME/'selection.json'
selection=json.loads(selection_path.read_text(encoding='utf-8'))if selection_path.exists()else{}
component_spec=importlib.util.spec_from_file_location('whole_pose',W/'whole-pose-components.py')
component_module=importlib.util.module_from_spec(component_spec);component_spec.loader.exec_module(component_module)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',16)
cell=384;pivot=[192,320];display=56*cell/180
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def cuts(count,length,counts):
 result=[0]
 for index in range(1,count):
  expected=round(length*index/count);radius=round(length/count*.35)
  options=[n for n in range(max(result[-1]+1,expected-radius),min(length,expected+radius))if counts[n]==0]
  assert options,(count,index,'No alpha16-free gutter')
  result.append(min(options,key=lambda n:abs(n-expected)))
 return result+[length]
entries=[];receipts=[];proofs={}
for action,(frames,columns,rows,fps) in {'idle':(4,4,1,5),'attack':(4,4,1,12),'hurt':(2,2,1,8),'dash':(6,3,2,20),'downed':(6,3,2,6)}.items():
 proof=Image.new('RGB',(6*260,4*230),'#172b29');proofs[action]=proof
 for direction_index,direction in enumerate(['south','east','north','west']):
  version=selection.get(action+'-'+direction,2 if NAME=='engineer' and action=='downed' and direction in ['east','north','west'] else 1)
  item=next(e for e in manifest['requests']if e['action']==action and e['direction']==direction and e['version']==version)
  source=W/item['file'];assert sha(source)==item['sha256']
  native=Image.open(source);assert native.mode=='RGBA'
  a=np.array(native.getchannel('A'));opaque=a>=16
  rectangles=[];source_frames=[];ownership=None;ownership_record=None
  try:
   ycuts=cuts(rows,native.height,opaque.sum(axis=1));reconstruction=Image.new('RGBA',native.size)
   for row in range(rows):
    y0,y1=ycuts[row:row+2];xcuts=cuts(columns,native.width,opaque[y0:y1,:].sum(axis=0))
    for col in range(columns):
     rect=[xcuts[col],y0,xcuts[col+1],y1];frame=native.crop(rect)
     reconstruction.paste(frame,rect[:2]);rectangles.append(rect);source_frames.append(frame)
   assert reconstruction.tobytes()==native.tobytes(),'Native partition lost RGBA pixels'
  except AssertionError:
   ownership,source_frames,rectangles,major=component_module.extract(native,columns,rows)
   mask_path=OUT/f'{NAME}-{action}-{direction}-ownership.png';Image.fromarray(ownership).save(mask_path)
   original=np.array(native);restored=original.copy();restored[ownership>0]=0
   for n,(frame,rect)in enumerate(zip(source_frames,rectangles)):
    x0,y0,x1,y1=rect;region=restored[y0:y1,x0:x1];mask=ownership[y0:y1,x0:x1]==n+1;region[mask]=np.array(frame)[mask]
   assert np.array_equal(restored,original),'Whole-pose partition lost source RGBA'
   ownership_record={'path':mask_path.name,'sha256':sha(mask_path),'completeFigureCount':frames,'method':'Eight-connected whole-figure extraction; intact major bodies plus their original disconnected ink, no limb repositioning. Every nonzero-alpha source pixel is assigned once; alpha-zero RGB remains in the immutable native.','majorFigures':major}
  visible=[f.getchannel('A').point(lambda p:255 if p>=16 else 0).getbbox()for f in source_frames]
  calibration=1 if action=='hurt' else 0
  scale=180/(visible[calibration][3]-visible[calibration][1])
  cell=384;pivot=[192,320];plans=[];expansion=0
  for index,frame in enumerate(source_frames):
   bounds=frame.getchannel('A').getbbox();v=visible[index];assert bounds and v
   alpha=np.array(frame.getchannel('A'));top=v[3]-max(2,round((v[3]-v[1])*.1));low=alpha[top:v[3],v[0]:v[2]].copy();low[low<16]=0
   weight=low.sum(axis=0).astype(np.float64);assert weight.sum()>0
   anchor=[round(float(np.dot(np.arange(v[0],v[2])+.5,weight)/weight.sum())),v[3]]
   crop=frame.crop(bounds);size=[round(crop.width*scale),round(crop.height*scale)]
   offset=[pivot[0]-round((anchor[0]-bounds[0])*scale),pivot[1]-round((anchor[1]-bounds[1])*scale)]
   expansion=max(expansion,16-offset[0],16-offset[1],offset[0]+size[0]-(cell-16),offset[1]+size[1]-(cell-16))
   plans.append((bounds,v,anchor,crop,size,offset))
  extra=math.ceil(expansion/32)*32 if expansion>0 else 0
  cell+=2*extra;pivot=[192+extra,320+extra];display=56*cell/180
  assert cell<=640,(action,direction,'Source layout needs regeneration rather than an excessive texture cell',cell)
  atlas=Image.new('RGBA',(columns*cell,rows*cell));packed_frames=[];measurements=[]
  for index,(bounds,v,anchor,crop,size,old_offset)in enumerate(plans):
   offset=[old_offset[0]+extra,old_offset[1]+extra]
   assert min(offset)>=0 and offset[0]+size[0]<=cell and offset[1]+size[1]<=cell,(action,direction,index,'Cell overflow',size,offset)
   target=Image.new('RGBA',(cell,cell));target.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
   target_bounds=target.getchannel('A').point(lambda p:255 if p>=16 else 0).getbbox()
   assert min(target_bounds[0],target_bounds[1],cell-target_bounds[2],cell-target_bounds[3])>=16,(action,direction,index,target_bounds)
   atlas.alpha_composite(target,(index%columns*cell,index//columns*cell));packed_frames.append(target)
   measurements.append({'frame':index,'sourceRect':rectangles[index],'sourceAlphaBounds':list(bounds),'sourceAlpha16Bounds':list(v),'sourceGroundAnchor':anchor,'targetGroundAnchor':pivot,'uniformScale':scale,'offset':offset,'resizedCrop':size,'targetAlpha16Bounds':list(target_bounds)})
  name=f'{NAME}-{action}-{direction}';path=OUT/(name+'-v1-atlas.png');atlas.save(path)
  entry={'id':name,'classId':NAME,'action':action,'direction':direction,'name':NAME.title()+' '+action.title()+' '+direction.title(),'family':'survivors','kind':'animation','source':item['file'],'sourceSha256':sha(source),'atlas':path.name,'atlasSha256':sha(path),'cellSize':cell,'columns':columns,'frames':frames,'fps':fps,'origin':[.5,pivot[1]/cell],'displayHeight':56,'displayCell':display,'frameDurationsMs':[1000/fps]*frames,'loop':action=='idle','calibrationFrame':calibration,'status':'Assistant native/size/motion candidate; rendered Phaser transitions and human/device review pending'}
  entries.append(entry);previews=[]
  for index,target in enumerate(packed_frames):
   panel=Image.new('RGB',(260,230),'#172b29');draw=ImageDraw.Draw(panel)
   draw.text((8,6),f'{direction} {action} {index+1}/{frames}',font=font,fill='#e7ddc3')
   for factor,x in [(1,60),(2,175)]:
    span=round(display*factor);sprite=target.resize((span,span),Image.Resampling.LANCZOS)
    panel.paste(sprite,(round(x-span*.5),round(205-span*pivot[1]/cell)),sprite)
    draw.line((x-18,205,x+18,205),fill='#729689');draw.line((x,201,x,209),fill='#729689')
   proof.paste(panel,(index*260,direction_index*230));previews.append(panel)
  preview=OUT/(name+'-v1-preview.gif');previews[0].save(preview,save_all=True,append_images=previews[1:],duration=[round(1000/fps)]*(frames-1)+[round(1000/fps) if action=='idle' else 800],loop=0,disposal=2)
  receipt={'id':name,'source':item['file'],'nativeSha256':sha(source),'sourceSize':list(native.size),'sourceRectanglesConserveEveryRGBAPixel':ownership is None,'sourceRgbaPartitionExact':True,'calibrationFrame':calibration,'uniformScale':scale,'sharedScaleAcrossWholeClip':True,'frames':measurements,'atlas':path.name,'atlasSha256':sha(path),'preview':preview.name,'previewSha256':sha(preview)}
  if ownership_record:receipt['sourceOwnershipMask']=ownership_record
  receipts.append(receipt)
 for item in manifest['requests']:
  if item['action']==action:
   selected=any(e['source']==item['file']for e in entries)
   if selected:item['status']='selected native/size candidate; rendered review pending'
 for direction in ['south','east','north','west']:
  pass
for action,proof in proofs.items():proof.save(OUT/f'{NAME}-{action}-contact-sheet.png')
(OUT/(NAME+'-action-library.json')).write_text(json.dumps({'schemaVersion':1,'entries':entries},indent=2)+'\n',encoding='utf-8')
(OUT/'packing.json').write_text(json.dumps({'schemaVersion':1,'clips':receipts,'creativePixelEditsPerformed':False,'alphaErasurePerformed':False,'facingsMirrored':False,'renderedAccepted':False,'limits':['Native/contact-sheet candidates only; final Phaser transitions, physical devices and human acceptance remain open.','A fixed upright calibration scale is shared across every frame of each strip; crouched/lying frames are never fitted individually.','Native alpha compositing, contact sheets and exact reconstruction remain separate from rendered engine acceptance.']},indent=2)+'\n',encoding='utf-8')
(W/NAME/'native-returns.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'clips':len(entries),'drawnFrames':sum(e['frames']for e in entries),'nativeReturns':len(manifest['requests']),'selected':len(entries),'renderedAccepted':False}))
