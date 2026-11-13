"""Conserve new native sheets, pack one scale per clip, and expose attachments.

The installed sprite helper supplies the reference canvases. Its strip normalizer
assumes a horizontal pixel-art strip and bounding-box centers. These generated
2x2 gouache sheets instead use conservative cells, alpha-weighted planted feet,
Lanczos scaling, and a common calibrated body height. No creative pixel edits.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from runpy import run_path
from statistics import median
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/production/motion'
REVIEW = ROOT / 'reviews/warden-signature-2026-10-23'
CELL, PIVOT, BODY_HEIGHT = 512, (256, 430), 344
feet_anchor = run_path(str(ROOT / 'tools/normalize-production-art.py'))['feet_anchor']
SPECS = {
    'idle': {'points': [(490,430),(433,430),(514,393),(443,393)],
             'labels': ['neutral breath', 'inhale', 'exhale', 'return'], 'durations': [200]*4},
    'channel': {'points': [(545,226),(543,220),(544,213),(513,213)],
                'labels': ['hold', 'inhale hold', 'exhale hold', 'return hold'], 'durations': [200]*4},
}
ATTACK_POINTS = [(377,331),(398,294),(398,224),(414,171),
                 (421,176),(400,217),(395,289),(378,327)]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf8', newline='\n')


def clip_frames(entry):
    image = Image.open(ROOT / entry['atlas'])
    return [image.crop((i%entry['columns']*CELL, i//entry['columns']*CELL,
                        (i%entry['columns']+1)*CELL, (i//entry['columns']+1)*CELL))
            for i in range(entry['frames'])]


def pack():
    REVIEW.mkdir(parents=True, exist_ok=True)
    motion = json.loads((OUT / 'library.json').read_text(encoding='utf8'))
    attack = next(entry for entry in motion['entries'] if entry['id'] == 'lantern-warden-attack')
    display_cell = attack['displayCell']
    entries, receipts = [], []
    for name, spec in SPECS.items():
        source = ROOT / f'assets/production/bosses/lantern-warden/{name}-sheet-v1.png'
        native = Image.open(source)
        assert native.mode == 'RGBA' and native.size == (1254,1254)
        source_hash = sha(source)
        cells, measurements = [], []
        reconstructed = Image.new('RGBA', native.size)
        for index in range(4):
            rect = [index%2*627,index//2*627,(index%2+1)*627,(index//2+1)*627]
            cell = native.crop(rect)
            reconstructed.paste(cell, rect[:2])
            bounds = cell.getchannel('A').getbbox()
            visible = cell.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
            assert bounds and visible and min(visible[0],visible[1],627-visible[2],627-visible[3]) > 0
            anchor = feet_anchor(cell, visible)
            point = spec['points'][index]
            assert cell.getpixel(point)[3] >= 128, 'Attachment must lie on opaque lantern artwork'
            cells.append((cell,bounds,visible,anchor,point,rect))
        assert native.tobytes() == reconstructed.tobytes()
        scale = BODY_HEIGHT / median(visible[3]-visible[1] for _,_,visible,_,_,_ in cells)
        atlas = Image.new('RGBA', (CELL*2,CELL*2))
        points = []
        for index,(cell,bounds,visible,anchor,point,rect) in enumerate(cells):
            crop = cell.crop(bounds)
            size = (round(crop.width*scale), round(crop.height*scale))
            offset = [PIVOT[0]-round((anchor[0]-bounds[0])*scale),
                      PIVOT[1]-round((anchor[1]-bounds[1])*scale)]
            assert min(offset) >= 0 and offset[0]+size[0] <= CELL and offset[1]+size[1] <= CELL
            frame = Image.new('RGBA', (CELL,CELL))
            frame.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS), offset)
            target = frame.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
            assert target and min(target[0],target[1],CELL-target[2],CELL-target[3]) >= 25
            target_point = [offset[0]+round((point[0]-bounds[0])*scale),
                            offset[1]+round((point[1]-bounds[1])*scale)]
            assert frame.getpixel(tuple(target_point))[3] >= 128
            atlas.alpha_composite(frame,(index%2*CELL,index//2*CELL))
            points.append(target_point)
            measurements.append({'frame':index,'sourceRect':rect,'sourceAlphaBounds':bounds,
                'sourceAlpha16Bounds':visible,'sourceFootAnchor':anchor,'targetFootAnchor':PIVOT,
                'sourceLanternCenter':point,'targetLanternCenter':target_point,
                'uniformScale':scale,'offset':offset,'targetAlpha16Bounds':target})
        path = OUT / f'lantern-warden-{name}-v1-atlas.png'
        atlas.save(path)
        entry = {'id':f'lantern-warden-{name}','name':f'Lantern Warden · {name.title()}',
            'family':'bosses','kind':'animation','atlas':path.relative_to(ROOT).as_posix(),
            'source':source.relative_to(ROOT).as_posix(),'sourceSha256':source_hash,'atlasSha256':sha(path),
            'cellSize':CELL,'columns':2,'frames':4,'labels':spec['labels'],'origin':[.5,PIVOT[1]/CELL],
            'displayHeight':150,'displayCell':display_cell,'fps':5,'frameDurationsMs':spec['durations'],
            'status':'Assistant motion candidate; local Phaser rehearsal available, final motion acceptance pending',
            'notes':f'Four drawn {name} frames, common clip scale calibrated to the attack study body height. '
                    'Physical-left lantern centers and foot anchors are exposed in the rehearsal contract. '
                    'Local signature exercise only; full encounter, hurt/defeat states and final Phaser acceptance remain open.'}
        entries.append(entry)
        receipts.append({'clip':name, 'source':entry['source'],'sourceSha256':source_hash,
            'sourceSize':list(native.size),'sourceRectanglesConserveEveryRGBAPixel':True,
            'uniformScale':scale,'calibratedBodyHeightPixels':BODY_HEIGHT,
            'atlas':entry['atlas'],'atlasSha256':sha(path),'frames':measurements})
        assert sha(source) == source_hash
    motion['entries'] = [entry for entry in motion['entries'] if entry['id'] not in {e['id'] for e in entries}] + entries
    write(OUT / 'library.json', motion)
    library_path = ROOT / 'assets/production/normalized/library.json'
    library = json.loads(library_path.read_text(encoding='utf8'))
    library['entries'] = [entry for entry in library['entries'] if entry['kind'] != 'animation'] + motion['entries']
    write(library_path,library)
    prior = json.loads((OUT/'warden-rehearsal.json').read_text(encoding='utf8')) if (OUT/'warden-rehearsal.json').is_file() else {}
    clips = {name:clip for name,clip in prior.get('clips',{}).items() if name not in ['attack','idle','channel']}
    clips['attack'] = {**attack,'lanternCenters':ATTACK_POINTS}
    for entry,receipt in zip(entries,receipts):
        clips[receipt['clip']] = {**entry,'lanternCenters':[frame['targetLanternCenter'] for frame in receipt['frames']]}
    contract = {'schemaVersion':1,'cellSize':CELL,'origin':[.5,PIVOT[1]/CELL],
        'displayCell':display_cell,'bodyHeightPixels':BODY_HEIGHT,'clips':clips,
        'attachmentMethod':'Assistant measured lantern cage center per native frame, transformed with the exact packing scale and translation. Points lie on opaque art; they are not a skeletal rig.',
        'groundProjection':{'offsetFromFeet':[55,0], 'fixedDuringCycle':True,
            'note':'Explicit 2.5D gameplay socket. Animated lantern center is a visual attachment, never the collision source.'},
        'limits':['Rehearsal only; the production Game does not import this contract.',
            'Hurt, defeat, full encounter and network replication are pending.',
            'Final Phaser motion approval, physical-device and human review are pending.']}
    if 'runtimeIntegration' in prior:
        contract['runtimeIntegration'] = prior['runtimeIntegration']
        contract['limits'] = prior['limits']
    write(OUT / 'warden-rehearsal.json',contract)
    report = {'schemaVersion':1,'clips':receipts,'oldAttackAtlasUnchanged':sha(ROOT/attack['atlas'])==attack['atlasSha256'],
        'oneScalePerClip':True,'allClipsShareDisplayCell':display_cell,
        'operations':'Conservative equal-grid extraction preserving the complete native; one calibrated scale per clip, planted-foot translations, transparent padding, and measured lantern center transforms. No alpha erasure, mirror, recolor, generated in-betweens or paint.',
        'assistantNativeReview':'Two 4-frame natives inspected. Same physical-left lantern, attached sleeves/arms, planted boots and quiet finish. Small generated shape variation remains; final in-engine motion review is pending.',
        'phaserMotionAccepted':False,'humanReviewPerformed':False}
    write(REVIEW/'packing.json',report)
    provenance_path = ROOT/'docs/warden-motion-2026-10-23.json'
    provenance = json.loads(provenance_path.read_text(encoding='utf8'))
    for request in provenance['requests']:
        name = 'idle' if 'idle' in request['id'] else 'channel'
        request['sha256'] = sha(ROOT/request['file'])
        request['portableReferences'] = [{'argument':request['args']['referenced_image_paths'][0],
            'file':f'assets/production/bosses/lantern-warden/references/rehearsal/{name}-edit-canvas.png',
            'sha256':sha(ROOT/f'assets/production/bosses/lantern-warden/references/rehearsal/{name}-edit-canvas.png')}]
        request['sourceSeed'] = {'atlas':attack['atlas'],'frame':0 if name=='idle' else 4,
            'file':f'assets/production/bosses/lantern-warden/references/rehearsal/{name}-seed.png',
            'sha256':sha(ROOT/f'assets/production/bosses/lantern-warden/references/rehearsal/{name}-seed.png')}
        assert sha(Path(request['original'])) == request['sha256']
    write(provenance_path,provenance)
    render_previews(contract)
    print(json.dumps({'newMotionFrames':8,'totalWardenMotionFrames':sum(clip['frames'] for clip in clips.values()),
        'contract':'assets/production/motion/warden-rehearsal.json','packing':'reviews/warden-signature-2026-10-23/packing.json'}))


def render_previews(contract):
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
    sheet = Image.new('RGB',(2080,970),'#e7ddc3')
    draw = ImageDraw.Draw(sheet)
    draw.text((18,14),'LANTERN WARDEN | idle and channel | 150px and 300px | feet + lantern centers',font=font,fill='#233b2e')
    draw.text((18,40),'One calibrated scale per clip. Native shape variation remains. Final Phaser motion acceptance pending.',font=font,fill='#536249')
    clip_images = {name:clip_frames(entry) for name,entry in contract['clips'].items()}
    for row,name in enumerate(['idle','channel']):
        entry = contract['clips'][name]
        for index,frame in enumerate(clip_images[name]):
            x,y = index*520,80+row*440
            draw.text((x+15,y),f'{name.upper()} {index+1} / 200 ms',font=font,fill='#233b2e')
            for multiple,center in [(1,x+96),(2,x+340)]:
                size=round(contract['displayCell']*multiple)
                left,top=round(center-size*.5),round(y+405-size*430/512)
                sprite=frame.resize((size,size),Image.Resampling.LANCZOS)
                sheet.paste(sprite,(left,top),sprite)
                point=entry['lanternCenters'][index]
                px,py=left+point[0]*size/512,top+point[1]*size/512
                draw.line((center-5,y+405,center+5,y+405),fill='#9b583c',width=1)
                draw.line((px-4,py,px+4,py),fill='#9b583c',width=1)
                draw.line((px,py-4,px,py+4),fill='#9b583c',width=1)
    sheet.save(REVIEW/'action-contact-sheet.png')
    for name in ['idle','channel']:
        frames=[]
        for index,frame in enumerate(clip_images[name]):
            image=Image.new('RGB',(640,430),'#142e29')
            d=ImageDraw.Draw(image)
            d.text((16,14),f'Warden {name} / {index+1} / motion candidate',font=font,fill='#e7ddc3')
            for multiple,center in [(1,155),(2,450)]:
                size=round(contract['displayCell']*multiple)
                sprite=frame.resize((size,size),Image.Resampling.LANCZOS)
                image.paste(sprite,(round(center-size*.5),round(385-size*430/512)),sprite)
            frames.append(image)
        frames[0].save(OUT/f'lantern-warden-{name}-v1-preview.gif',save_all=True,append_images=frames[1:],duration=[200]*4,loop=0,disposal=2)


if __name__ == '__main__':
    pack()
