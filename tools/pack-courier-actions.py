"""Append three complete four-pose strips without modifying earlier action or defeat pixels."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import hashlib,json,io
import numpy as np
ROOT=Path(__file__).resolve().parents[1]; REVIEW=ROOT/'reviews/courier-actions-2026-10-25';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
write=lambda p,x:p.write_text(json.dumps(x,indent=2)+'\n',encoding='utf-8',newline='\n')
inputs=json.loads((REVIEW/'input-contract.json').read_text(encoding='utf-8'));old=inputs['base'];base=ROOT/old['atlas'];assert sha(base)==old['atlasSha256']
requests=json.loads((ROOT/'docs/courier-actions-2026-10-25.json').read_text(encoding='utf-8'))['requests']
size=old['cellSize'];assert size==384 and old['frames']==16
atlas=Image.new('RGBA',(4*size,7*size));original=Image.open(base);assert original.mode=='RGBA' and original.size==(4*size,4*size);atlas.paste(original,(0,0))
pivot=[round(old['origin'][0]*size),round(old['origin'][1]*size)];receipts=[];motion_sources=[];new_frames=[]
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
def save(image,path,**options):
    buf=io.BytesIO();image.save(buf,format='GIF'if path.suffix=='.gif'else'PNG',**options);data=buf.getvalue()
    if path.exists():assert path.read_bytes()==data,'Preserve previous derived image: '+str(path)
    else:path.write_bytes(data)
for order,motion in enumerate(['idle','hurt','stagger']):
    req=next(e for e in requests if e['motion']==motion);source=ROOT/req['file'];assert sha(source)==req['sha256'];native=Image.open(source);assert native.mode=='RGBA'
    alpha=np.array(native.getchannel('A'));occupied=(alpha>0).sum(axis=0);cuts=[0]
    for boundary in range(1,4):
        center=round(native.width*boundary/4);radius=round(native.width/4*.3);options=[x for x in range(center-radius,center+radius)if occupied[x]==0];assert options,'Regenerate touching figures';cuts.append(min(options,key=lambda x:abs(x-center)))
    cuts.append(native.width);rectangles=[[cuts[n],0,cuts[n+1],native.height]for n in range(4)];pieces=[native.crop(rect)for rect in rectangles]
    restored=Image.new('RGBA',native.size)
    for rect,piece in zip(rectangles,pieces):restored.paste(piece,rect[:2])
    assert restored.tobytes()==native.tobytes()
    visible=[piece.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()for piece in pieces];assert all(visible)
    scale=inputs['standingCalibrationHeight']/(visible[0][3]-visible[0][1]);v=visible[0];weights=np.array(pieces[0].getchannel('A'))[max(v[1],v[3]-round((v[3]-v[1])*.1)):v[3],v[0]:v[2]].copy();weights[weights<16]=0;weights=weights.sum(axis=0).astype(float)
    center_x=round(float(np.dot(np.arange(v[0],v[2])+.5,weights)/weights.sum()))+rectangles[0][0]
    frames=[];measurements=[]
    for n,piece in enumerate(pieces):
        bounds=piece.getchannel('A').getbbox();ground=[center_x+n*native.width/4-rectangles[n][0],visible[n][3]];crop=piece.crop(bounds);resized=[round(crop.width*scale),round(crop.height*scale)];offset=[pivot[0]-round((ground[0]-bounds[0])*scale),pivot[1]-round((ground[1]-bounds[1])*scale)]
        assert min(offset)>=16 and offset[0]+resized[0]<=size-16 and offset[1]+resized[1]<=size-16,'Regenerate excessive envelope instead of clipping'
        target=Image.new('RGBA',(size,size));target.alpha_composite(crop.resize(resized,Image.Resampling.LANCZOS),offset);frame=16+order*4+n;atlas.paste(target,(frame%4*size,frame//4*size));frames.append(target);new_frames.append(target)
        measurements.append({'frame':n,'runtimeFrame':frame,'sourceRect':rectangles[n],'sourceAlphaBounds':list(bounds),'sourceAlpha16Bounds':list(visible[n]),'sourceGroundAnchor':ground,'targetGroundAnchor':pivot,'uniformScale':scale,'offset':offset,'resizedCrop':resized})
    sheet=Image.new('RGB',(1280,300),'#19372f');previews=[]
    for n,frame in enumerate(frames):
        panel=Image.new('RGB',(320,300),'#19372f');d=ImageDraw.Draw(panel);d.text((10,10),f'Courier / {motion} / {n+1}',font=font,fill='#eee1c2');d.text((10,32),'World size; rendered review pending',font=font,fill='#bacbb8');span=round(old['displayCell']);sprite=frame.resize((span,span),Image.Resampling.LANCZOS);panel.paste(sprite,(round(160-span*old['origin'][0]),round(275-span*old['origin'][1])),sprite);sheet.paste(panel,(n*320,0));previews.append(panel)
    contact=REVIEW/f'{motion}-contact-sheet.png';save(sheet,contact);gif=REVIEW/f'{motion}-preview.gif';save(previews[0],gif,save_all=True,append_images=previews[1:],duration=250 if motion=='idle'else 80 if motion=='hurt'else 165,loop=0,disposal=2)
    receipts.append({'motion':motion,'source':req['file'],'sourceSha256':sha(source),'sourceSize':list(native.size),'uniformScale':scale,'calibration':'Frame zero is an upright calibration pose. One scale for all four poses; stooped poses are never fitted to standing height.','wholeRgbaPartitionExact':True,'transparentNonzeroAlphaGutters':True,'frames':measurements,'contactSheet':contact.relative_to(ROOT).as_posix(),'contactSheetSha256':sha(contact),'preview':gif.relative_to(ROOT).as_posix(),'previewSha256':sha(gif)})
    motion_sources.append({'motion':motion,'file':req['file'],'sha256':sha(source),'startFrame':16+order*4,'frames':4})
target=ROOT/'assets/production/motion/courier-action-v3-atlas.png';save(atlas,target)
entry={**old,'atlas':target.relative_to(ROOT).as_posix(),'atlasSha256':sha(target),'frames':28,'labels':old['labels']+[f'{motion.title()} {n+1}'for motion in ['idle','hurt','stagger']for n in range(4)],'frameDurationsMs':old['frameDurationsMs']+[250]*4+[1000/12]*4+[1000/6]*4,'baseAtlas':old['atlas'],'baseAtlasSha256':sha(base),'preservedFrames':16,'motionSources':motion_sources,'idleStartFrame':16,'idleFrames':4,'idleFps':4,'hurtStartFrame':20,'hurtFrames':4,'hurtFps':12,'staggerStartFrame':24,'staggerFrames':4,'staggerFps':6,'staggerIntroFrames':1,'status':'Twelve complete new idle/hurt/stagger poses; sixteen earlier action/defeat cells unchanged; rendered/device/human acceptance pending'}
write(ROOT/'assets/production/motion/courier-library.json',{'schemaVersion':1,'sourceTool':'tools/pack-courier-actions.py','sourceToolSha256':sha(Path(__file__)),'entries':[entry],'newCompletePoses':12,'preservedEarlierPoses':16,'renderedAccepted':False})
write(REVIEW/'packing.json',{'schemaVersion':1,'originalAtlas':old['atlas'],'originalAtlasSha256':sha(base),'originalFrames':16,'originalRgbaAndWorldTransformUnchanged':True,'atlas':entry['atlas'],'atlasSha256':sha(target),'motions':receipts,'creativePixelEditsPerformed':False,'alphaErasurePerformed':False,'facingsMirrored':False,'renderedAccepted':False})
print(json.dumps({'boss':'courier','newPoses':12,'preservedPoses':16,'atlasFrames':28,'cellSize':size}))
