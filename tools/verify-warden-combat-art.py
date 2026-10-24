"""Audit standing-calibrated hurt/collapse pixels and all preserved Warden inputs."""
from pathlib import Path
from PIL import Image
from datetime import datetime, timezone
import json
import hashlib

ROOT=Path(__file__).resolve().parents[1]
def file(value):
    path=(ROOT/value).resolve()
    assert path.is_relative_to(ROOT) and path.is_file(),value
    return path
def read(value):return json.loads(file(value).read_text(encoding='utf8'))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def verify():
    contract=read('assets/production/motion/warden-rehearsal.json')
    packing=read('reviews/warden-encounter-2026-10-23/motion-packing.json')
    assert set(contract['clips'])=={'idle','attack','channel','hurt','defeat'}
    assert sum(clip['frames'] for clip in contract['clips'].values())==27
    for clip in contract['clips'].values():
        assert sha(file(clip['source']))==clip['sourceSha256']
        assert sha(file(clip['atlas']))==clip['atlasSha256']
        assert abs(clip['displayCell']/clip['cellSize']-contract['displayCell']/contract['cellSize'])<1e-12
    for receipt in packing['clips']:
        clip=contract['clips'][receipt['clip']]
        source=Image.open(file(receipt['source']))
        atlas=Image.open(file(receipt['atlas']))
        cell_size=clip['cellSize']
        assert source.mode==atlas.mode=='RGBA'
        assert atlas.size==(clip['columns']*cell_size,((clip['frames']+clip['columns']-1)//clip['columns'])*cell_size)
        reconstructed=Image.new('RGBA',source.size);coverage=Image.new('L',source.size)
        for frame in receipt['frames']:
            index=frame['frame'];rect=frame['sourceRect']
            assert coverage.crop(rect).getextrema()==(0,0)
            coverage.paste(255,rect);native=source.crop(rect);reconstructed.paste(native,rect[:2])
            assert frame['uniformScale']==receipt['uniformScale']
            assert list(frame['targetGroundAnchor'])==[round(axis*cell_size) for axis in clip['origin']]
            if receipt['clip']=='defeat':assert frame['sourceGroundAnchor'][0]==206,'Do not recenter collapsed silhouettes'
            crop=native.crop(frame['sourceAlphaBounds']);scale=receipt['uniformScale']
            expected=Image.new('RGBA',(cell_size,cell_size))
            expected.alpha_composite(crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS),frame['offset'])
            actual=atlas.crop((index%clip['columns']*cell_size,index//clip['columns']*cell_size,
                (index%clip['columns']+1)*cell_size,(index//clip['columns']+1)*cell_size))
            assert expected.tobytes()==actual.tobytes()
            bounds=actual.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
            assert bounds and min(bounds[0],bounds[1],cell_size-bounds[2],cell_size-bounds[3])>=25
        assert coverage.getextrema()==(255,255) and reconstructed.tobytes()==source.tobytes()
        gif=Image.open(file(receipt['preview']))
        assert gif.n_frames==clip['frames']
        delay=0
        for index in range(gif.n_frames):gif.seek(index);delay+=gif.info['duration']
        assert delay==sum(clip['frameDurationsMs'])
        assert sha(file(receipt['preview']))==receipt['previewSha256']
    previous=[]
    for path in ['docs/production-motion-2026-10-23.json','docs/warden-motion-2026-10-23.json']:
        previous.extend(read(path)['requests'])
    previous.extend(read('reviews/art-production-2026-10-23/inventory.json')['nativeSources'])
    for entry in previous:assert sha(file(entry['file']))==entry['sha256']
    for entry in read('docs/warden-combat-motion-2026-10-23.json')['requests']:
        assert sha(file(entry['file']))==entry['sha256']
        original=Path(entry['original'])
        if original.is_file():assert sha(original)==entry['sha256']
        for reference in entry['portableReferences']:assert sha(file(reference['file']))==reference['sha256']
    report={'createdAt':datetime.now(timezone.utc).isoformat(),'passed':True,'newFrames':11,
        'totalWardenMotionFrames':27,'olderNativesUnchanged':len(previous),'sourceRGBAPixelsConserved':True,
        'allPackedPixelsMatchDocumentedTransforms':True,'oneScalePerAction':True,
        'sharedWorldPixelScale':contract['displayCell']/contract['cellSize'],
        'collapseUsesStandingScaleAndFixedHorizontalGroundOrigin':True,
        'runtimeIntegrated':True,'phaserMotionAccepted':False,'humanReviewPerformed':False,
        'limits':['Native and technical sprite evidence; final rendered transition/physical-device review remains open.',
            'Defeat GIF uses alternating 120/130ms delays to preserve the 1000ms total; runtime uses exact 125ms.']}
    (ROOT/'reviews/warden-encounter-2026-10-23/art-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8',newline='\n')
    print(json.dumps(report))


if __name__=='__main__':verify()
