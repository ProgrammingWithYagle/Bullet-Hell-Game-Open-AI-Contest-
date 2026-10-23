"""Independent pixel/hash/attachment audit for the local Warden rehearsal."""
from pathlib import Path
from PIL import Image
from datetime import datetime, timezone
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]


def file(value):
    path = (ROOT / value).resolve()
    assert path.is_relative_to(ROOT) and path.is_file(), 'Missing or unsafe project file: ' + value
    return path


def read(value):
    return json.loads(file(value).read_text(encoding='utf8'))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify():
    contract = read('assets/production/motion/warden-rehearsal.json')
    packing = read('reviews/warden-signature-2026-10-23/packing.json')
    assert contract['origin'] == [.5,430/512] and contract['cellSize'] == 512
    assert set(contract['clips']) == {'idle','attack','channel'}
    attack = contract['clips']['attack']
    old_motion = read('docs/production-motion-2026-10-23.json')
    old_natives = read('reviews/art-production-2026-10-23/inventory.json')['nativeSources']
    for native in old_natives:
        assert sha(file(native['file'])) == native['sha256']
    for native in old_motion['requests']:
        assert sha(file(native['file'])) == native['sha256']
    total = 0
    for name,clip in contract['clips'].items():
        assert clip['displayCell'] == contract['displayCell']
        assert clip['origin'] == contract['origin']
        assert sha(file(clip['atlas'])) == clip['atlasSha256']
        assert sha(file(clip['source'])) == clip['sourceSha256']
        atlas = Image.open(file(clip['atlas']))
        assert atlas.mode == 'RGBA' and atlas.getchannel('A').getextrema() == (0,255)
        assert clip['frames'] == len(clip['lanternCenters']) == len(clip['frameDurationsMs'])
        for index,point in enumerate(clip['lanternCenters']):
            assert len(point)==2 and all(isinstance(n,int) and 0<=n<512 for n in point)
            cell = atlas.crop((index%clip['columns']*512,index//clip['columns']*512,
                (index%clip['columns']+1)*512,(index//clip['columns']+1)*512))
            assert cell.getpixel(tuple(point))[3] >= 128, 'Lantern attachment is outside opaque art'
            bounds = cell.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
            assert bounds and min(bounds[0],bounds[1],512-bounds[2],512-bounds[3])>=25
        total += clip['frames']
    assert total == 16 and sum(attack['frameDurationsMs'][:4]) == 1200
    for receipt in packing['clips']:
        native = Image.open(file(receipt['source']))
        atlas = Image.open(file(receipt['atlas']))
        reconstructed = Image.new('RGBA',native.size)
        coverage = Image.new('L',native.size)
        heights=[]
        for item in receipt['frames']:
            rect=item['sourceRect']
            assert coverage.crop(rect).getextrema()==(0,0)
            coverage.paste(255,rect)
            source=native.crop(rect)
            reconstructed.paste(source,rect[:2])
            assert item['uniformScale']==receipt['uniformScale']
            assert item['targetFootAnchor']==[256,430]
            crop=source.crop(item['sourceAlphaBounds'])
            scale=receipt['uniformScale']
            expected=Image.new('RGBA',(512,512))
            expected.alpha_composite(crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS),item['offset'])
            index=item['frame']
            actual=atlas.crop((index%2*512,index//2*512,(index%2+1)*512,(index//2+1)*512))
            assert expected.tobytes()==actual.tobytes(), 'Packed pixels differ from documented source transform'
            point=item['sourceLanternCenter']; bounds=item['sourceAlphaBounds']; offset=item['offset']
            assert item['targetLanternCenter']==[offset[0]+round((point[0]-bounds[0])*scale),offset[1]+round((point[1]-bounds[1])*scale)]
            heights.append(item['targetAlpha16Bounds'][3]-item['targetAlpha16Bounds'][1])
        assert coverage.getextrema()==(255,255) and native.tobytes()==reconstructed.tobytes()
        assert max(heights)-min(heights)<=6, 'Source body-size drift requires visual review'
        gif=Image.open(file(f"assets/production/motion/lantern-warden-{receipt['clip']}-v1-preview.gif"))
        assert gif.n_frames==4
        duration=0
        for index in range(gif.n_frames):
            gif.seek(index); duration+=gif.info['duration']
        assert duration==800
    provenance=read('docs/warden-motion-2026-10-23.json')
    for request in provenance['requests']:
        assert sha(file(request['file']))==request['sha256']
        original=Path(request['original'])
        if original.is_file(): assert sha(original)==request['sha256']
        for reference in request['portableReferences']:
            assert sha(file(reference['file']))==reference['sha256']
        seed=request['sourceSeed']
        atlas=Image.open(file(seed['atlas'])); index=seed['frame']
        expected=atlas.crop((index%4*512,index//4*512,(index%4+1)*512,(index//4+1)*512))
        assert Image.open(file(seed['file'])).tobytes()==expected.tobytes()
    # Production entry points must keep the study out of normal/public matches.
    for path in ['src/shared/game.ts','src/client/scene.ts','src/client/main.ts','src/server/index.ts']:
        source=file(path).read_text(encoding='utf8')
        assert 'warden-rehearsal' not in source and 'warden-signature' not in source
    report={'schemaVersion':1,'createdAt':datetime.now(timezone.utc).isoformat(), 'passed':True,
        'newNativeSheets':2,'newFrames':8,'totalWardenMotionFrames':total,
        'olderNativesUnchanged':len(old_natives)+len(old_motion['requests']),
        'sourceRectanglesConserveEveryRGBAPixel':True,'packedPixelsMatchDocumentedTransforms':True,
        'opaqueMeasuredLanternAttachments':total,'sharedDisplayCell':contract['displayCell'],
        'productionGameStillSeparate':True,'phaserMotionAccepted':False,'humanReviewPerformed':False,
        'hashes':{path:sha(file(path)) for path in ['assets/production/motion/warden-rehearsal.json',
            'docs/warden-motion-2026-10-23.json','reviews/warden-signature-2026-10-23/packing.json',
            'reviews/warden-signature-2026-10-23/action-contact-sheet.png']},
        'limits':['Structural and pixel evidence only; final Phaser motion review is pending.',
            'No complete boss encounter, public deployment, physical-device, human or language approval.']}
    (ROOT/'reviews/warden-signature-2026-10-23/art-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8',newline='\n')
    print(json.dumps(report))


if __name__=='__main__': verify()
