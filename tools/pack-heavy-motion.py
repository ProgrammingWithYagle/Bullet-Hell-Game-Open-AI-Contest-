"""Preserve whole generated run strips and pack measured, padded runtime atlases."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from runpy import run_path
from statistics import median
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/production/motion'
SOURCES=ROOT/'assets/production/survivors/heavy'
REVIEW=ROOT/'reviews/heavy-2026-10-23'
feet=run_path(str(ROOT/'tools/normalize-production-art.py'))['feet_anchor']
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,value):path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf8',newline='\n')

def pack():
    SOURCES.mkdir(parents=True,exist_ok=True);REVIEW.mkdir(parents=True,exist_ok=True)
    refs=SOURCES/'references';refs.mkdir(exist_ok=True)
    requests=json.loads((ROOT/'docs/heavy-motion-2026-10-23.json').read_text(encoding='utf8'))['requests']
    entries=[];receipts=[]
    reference=json.loads((ROOT/'assets/production/normalized/library.json').read_text(encoding='utf8'))
    reference=next(entry for entry in reference['entries'] if entry['id']=='heavy')
    for request in requests:
        direction=request['direction'];source=ROOT/request['file']
        assert sha(source)==request['sha256']
        native=Image.open(source);assert native.mode=='RGBA'
        restored=Image.new('RGBA',native.size);source_frames=[];rects=[]
        for index in range(8):
            col=index%4;row=index//4
            cuts=[0,425,852,1291,1774] if direction=='west' else [i*native.width//4 for i in range(5)]
            rect=[cuts[col],row*native.height//2,cuts[col+1],(row+1)*native.height//2]
            cell=native.crop(rect);restored.paste(cell,rect[:2]);rects.append(rect)
            bounds=cell.getchannel('A').getbbox()
            visible=cell.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
            assert bounds and visible and min(visible[0],visible[1],cell.width-visible[2],cell.height-visible[3])>0,(direction,index,visible)
            source_frames.append((cell,bounds,visible,feet(cell,visible)))
        assert native.tobytes()==restored.tobytes()
        scale=118/median(item[2][3]-item[2][1] for item in source_frames)
        # Pad the cell, rather than shrinking a long weapon or a wide stride.
        cell_size=320;pivot=[160,275]
        atlas=Image.new('RGBA',(4*cell_size,2*cell_size));frames=[];measurements=[]
        for index,(cell,bounds,visible,anchor) in enumerate(source_frames):
            crop=cell.crop(bounds);size=(round(crop.width*scale),round(crop.height*scale))
            offset=[pivot[0]-round((anchor[0]-bounds[0])*scale),pivot[1]-round((anchor[1]-bounds[1])*scale)]
            assert min(offset)>=0 and offset[0]+size[0]<=cell_size and offset[1]+size[1]<=cell_size,(direction,index,offset,size)
            frame=Image.new('RGBA',(cell_size,cell_size));frame.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
            target=frame.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
            assert min(target[0],target[1],cell_size-target[2],cell_size-target[3])>=16,(direction,index,target)
            atlas.alpha_composite(frame,(index%4*cell_size,index//4*cell_size));frames.append(frame)
            measurements.append({'frame':index,'sourceRect':rects[index],'sourceAlphaBounds':bounds,
                'sourceAlpha16Bounds':visible,'sourceGroundAnchor':anchor,'targetGroundAnchor':pivot,
                'uniformScale':scale,'offset':offset,'targetAlpha16Bounds':target})
        path=OUT/f'heavy-run-{direction}-v1-atlas.png';atlas.save(path)
        entry={'id':'heavy-run-'+direction,'name':'Heavy · Run '+direction.title(),'family':'survivors','kind':'animation',
            'atlas':path.relative_to(ROOT).as_posix(),'source':request['file'],'sourceSha256':sha(source),'atlasSha256':sha(path),
            'cellSize':cell_size,'columns':4,'frames':8,'labels':[direction+' stride '+str(i+1) for i in range(8)],
            'origin':[.5,pivot[1]/cell_size],'displayHeight':56,'displayCell':reference['displayCell']*cell_size/256,'fps':10,
            'frameDurationsMs':[100]*8,'status':'Assistant native/contact-sheet movement candidate; final engine review pending',
            'notes':'Eight drawn directional run poses from the matching reference. No mirroring or painted edits. One median-height action scale and measured foot anchors. Idle uses the original distinct static facing, never a reference-pose animation.'}
        entries.append(entry)
        previews=[]
        for index,frame in enumerate(frames):
            image=Image.new('RGB',(420,300),'#142e29');draw=ImageDraw.Draw(image)
            font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',13)
            draw.text((12,12),f'Heavy {direction} / {index+1} / motion review pending',font=font,fill='#e7ddc3')
            for multiple,center in [(1,110),(2,300)]:
                size=round(entry['displayCell']*multiple);sprite=frame.resize((size,size),Image.Resampling.LANCZOS)
                image.paste(sprite,(round(center-size*.5),round(270-size*entry['origin'][1])),sprite)
                draw.line((center-20,270,center+20,270),fill='#8ba89c')
            previews.append(image)
        gif=OUT/f'heavy-run-{direction}-v1-preview.gif'
        previews[0].save(gif,save_all=True,append_images=previews[1:],duration=100,loop=0,disposal=2)
        proof=Image.new('RGB',(1680,600),'#142e29')
        for index,image in enumerate(previews):proof.paste(image,(index%4*420,index//4*300))
        proof.save(REVIEW/f'run-{direction}-contact-sheet.png')
        receipts.append({'direction':direction,'source':request['file'],'sourceSha256':sha(source),'sourceSize':list(native.size),
            'atlas':entry['atlas'],'atlasSha256':sha(path),'uniformScale':scale,'frames':measurements,
            'preview':gif.relative_to(ROOT).as_posix(),'previewSha256':sha(gif),'sourceRectanglesConserveEveryRGBAPixel':True})
    write(OUT/'heavy-library.json',{'schemaVersion':1,'reference':reference,'entries':entries})
    write(REVIEW/'motion-packing.json',{'schemaVersion':1,'clips':receipts,'nativeRGBAConservation':True,
        'creativePixelEditsPerformed':False,'phaserMotionAccepted':False,'limits':['Movement candidates only; attack, hurt, dodge and downed action clips remain in production.','No current supported Phaser animation acceptance or physical-device review.']})
    print(json.dumps({'clips':4,'frames':32,'creativePixelEdits':False,'phaserMotionAccepted':False}))

if __name__=='__main__':pack()
