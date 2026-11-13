"""Pack complete hurt/defeat sheets without repainting or per-frame size fits."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from runpy import run_path
from statistics import median
import json
import hashlib

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/production/motion'
REVIEW=ROOT/'reviews/warden-encounter-2026-10-23'
feet=run_path(str(ROOT/'tools/normalize-production-art.py'))['feet_anchor']


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,value): path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf8',newline='\n')


def pack():
    REVIEW.mkdir(parents=True,exist_ok=True)
    contract=json.loads((OUT/'warden-rehearsal.json').read_text(encoding='utf8'))
    entries=[]; receipts=[]
    for name,count,columns,durations in [('hurt',3,3,[100]*3),('defeat',8,4,[125]*8)]:
        source=ROOT/f'assets/production/bosses/lantern-warden/{name}-sheet-v1.png'
        native=Image.open(source)
        assert native.mode=='RGBA'
        rects=([[i*724,0,(i+1)*724,724] for i in range(3)] if name=='hurt' else
               [[i%4*1774//4,0 if i<4 else 550,(i%4+1)*1774//4,550 if i<4 else 887] for i in range(8)])
        assert native.size==((2172,724) if name=='hurt' else (1774,887))
        size_px=512 if name=='hurt' else 640
        pivot=(256,430) if name=='hurt' else (320,538)
        source_frames=[]
        restored=Image.new('RGBA',native.size)
        for index,rect in enumerate(rects):
            cell=native.crop(rect); restored.paste(cell,rect[:2])
            bounds=cell.getchannel('A').getbbox()
            visible=cell.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
            assert bounds and visible and min(visible[0],visible[1],cell.width-visible[2],cell.height-visible[3])>0
            # A collapse changes anatomy and silhouette extent. Ground anchors
            # keep one fixed X origin; do not recenter the falling body's mass.
            anchor=feet(cell,visible) if name=='hurt' else [206,visible[3]]
            source_frames.append((cell,bounds,visible,anchor))
        assert restored.tobytes()==native.tobytes()
        height=median(frame[2][3]-frame[2][1] for frame in source_frames) if name=='hurt' else source_frames[0][2][3]-source_frames[0][2][1]
        scale=344/height
        atlas=Image.new('RGBA',(columns*size_px,((count+columns-1)//columns)*size_px))
        frames=[]; measurements=[]
        for index,(cell,bounds,visible,anchor) in enumerate(source_frames):
            crop=cell.crop(bounds)
            size=(round(crop.width*scale),round(crop.height*scale))
            offset=[pivot[0]-round((anchor[0]-bounds[0])*scale),pivot[1]-round((anchor[1]-bounds[1])*scale)]
            assert min(offset)>=0 and offset[0]+size[0]<=size_px and offset[1]+size[1]<=size_px,(name,index,offset,size)
            frame=Image.new('RGBA',(size_px,size_px));frame.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
            target=frame.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
            assert target and min(target[0],target[1],size_px-target[2],size_px-target[3])>=25
            atlas.alpha_composite(frame,(index%columns*size_px,index//columns*size_px));frames.append(frame)
            measurements.append({'frame':index,'sourceRect':rects[index],'sourceAlphaBounds':bounds,
                'sourceAlpha16Bounds':visible,'sourceGroundAnchor':anchor,'targetGroundAnchor':pivot,
                'uniformScale':scale,'offset':offset,'targetAlpha16Bounds':target})
        path=OUT/f'lantern-warden-{name}-v1-atlas.png';atlas.save(path)
        labels=['flinch','recoil','recover'] if name=='hurt' else ['standing','slump','one knee','kneel','lean','brace','fallen','settled']
        entry={'id':'lantern-warden-'+name,'name':'Lantern Warden · '+name.title(),'family':'bosses','kind':'animation',
            'atlas':path.relative_to(ROOT).as_posix(),'source':source.relative_to(ROOT).as_posix(),
            'sourceSha256':sha(source),'atlasSha256':sha(path),'cellSize':size_px,'columns':columns,'frames':count,
            'labels':labels,'origin':[pivot[0]/size_px,pivot[1]/size_px],'displayHeight':150,'displayCell':contract['displayCell']*size_px/512,
            'fps':10 if name=='hurt' else 8,'frameDurationsMs':durations,
            'status':'Assistant native/contact-sheet candidate; full engine transition review pending',
            'notes':('Brief planted hurt recoil; never interrupts a warning or active sweep.' if name=='hurt' else
                'One continuous collapse. One standing-calibrated scale; fixed horizontal ground origin, measured floor contact. A 640px padded cell preserves complete faint alpha above and below the first-row baseline. Per-clip origin/display size preserves the exact shared world scale.')}
        entries.append(entry);contract['clips'][name]=entry
        receipt={'clip':name,'source':entry['source'],'sourceSha256':sha(source),'sourceSize':list(native.size),
            'atlas':entry['atlas'],'atlasSha256':sha(path),'uniformScale':scale,
            'sourceRectanglesConserveEveryRGBAPixel':True,'calibration':'Median standing height' if name=='hurt' else 'Frame 01 standing height; never scale collapsed poses independently',
            'frames':measurements}
        receipts.append(receipt)
        previews=[]
        for index,frame in enumerate(frames):
            image=Image.new('RGB',(640,430),'#142e29');d=ImageDraw.Draw(image)
            font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
            d.text((15,12),f'Warden {name} / {index+1} / transition review pending',font=font,fill='#e7ddc3')
            for multiple,center in [(1,150),(2,440)]:
                size=round(entry['displayCell']*multiple);sprite=frame.resize((size,size),Image.Resampling.LANCZOS)
                image.paste(sprite,(round(center-size*.5),round(385-size*entry['origin'][1])),sprite)
            previews.append(image)
        gif=OUT/f'lantern-warden-{name}-v1-preview.gif'
        # GIF delays have 10ms units; explicit 120/130ms alternation preserves
        # the 1000ms defeat total. Runtime uses exact 125ms frame durations.
        gif_durations=durations if name=='hurt' else [120,130]*4
        previews[0].save(gif,save_all=True,append_images=previews[1:],duration=gif_durations,loop=0,disposal=2)
        proof=Image.new('RGB',(640*min(4,count),430*((count+3)//4)),'#142e29')
        for index,image in enumerate(previews):proof.paste(image,(index%4*640,index//4*430))
        proof.save(REVIEW/f'{name}-contact-sheet.png')
        receipt['preview']=gif.relative_to(ROOT).as_posix();receipt['previewSha256']=sha(gif)
        receipt['previewDurationsMs']=gif_durations
    write(OUT/'warden-rehearsal.json',contract)
    for file in [OUT/'library.json',ROOT/'assets/production/normalized/library.json']:
        library=json.loads(file.read_text(encoding='utf8'))
        ids={entry['id'] for entry in entries}
        library['entries']=[entry for entry in library['entries'] if entry['id'] not in ids]+entries
        write(file,library)
    write(REVIEW/'motion-packing.json',{'schemaVersion':1,'clips':receipts,
        'nativeRGBAConservation':True,'creativePixelEditsPerformed':False,'phaserMotionAccepted':False,
        'limits':['Generated anatomy and transitions still need supported in-engine review.','Defeat uses 640px padding to preserve complete faint alpha; per-clip origin/display size maps every ground anchor to the same world position at the shared world scale.']})
    provenance=ROOT/'docs/warden-combat-motion-2026-10-23.json'
    data=json.loads(provenance.read_text(encoding='utf8'))
    for request in data['requests']:
        name='hurt' if 'hurt' in request['id'] else 'defeat'
        request['sha256']=sha(ROOT/request['file'])
        request['portableReferences']=[{'argument':request['args']['referenced_image_paths'][0],
            'file':f'assets/production/bosses/lantern-warden/references/encounter/{name}-edit-canvas.png',
            'sha256':sha(ROOT/f'assets/production/bosses/lantern-warden/references/encounter/{name}-edit-canvas.png')}]
        assert sha(Path(request['original']))==request['sha256']
    write(provenance,data)
    print(json.dumps({'newFrames':11,'totalWardenMotionFrames':27,'clips':5}))


if __name__=='__main__':pack()
