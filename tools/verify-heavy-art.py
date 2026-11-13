"""Independently audit native preservation, complete crop coverage and packed pixels."""
from pathlib import Path
from PIL import Image
from datetime import datetime, timezone
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
def file(value):
    path=(ROOT/value).resolve();assert path.is_relative_to(ROOT) and path.is_file(),value
    return path
def read(value):return json.loads(file(value).read_text(encoding='utf8'))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def verify():
    library=read('assets/production/motion/heavy-library.json')
    packing=read('reviews/heavy-2026-10-23/motion-packing.json')
    provenance=read('docs/heavy-motion-2026-10-23.json')
    assert {entry['id'] for entry in library['entries']}=={'heavy-run-'+d for d in ['north','south','east','west']}
    assert len(provenance['rejectedAttempts'])==2
    for request in provenance['requests']+provenance['rejectedAttempts']:
        assert sha(file(request['file']))==request['sha256']
        original=Path(request['original'])
        if original.is_file():assert sha(original)==request['sha256']
        for reference in request['portableReferences']:assert sha(file(reference['file']))==reference['sha256']
    static=next(entry for entry in read('assets/production/normalized/library.json')['entries'] if entry['id']=='heavy')
    assert library['reference']==static and static['kind']=='static-reference' and static['fps']==0
    pixel_scale=static['displayCell']/static['cellSize']
    for clip,receipt in zip(library['entries'],packing['clips']):
        source=Image.open(file(clip['source']));atlas=Image.open(file(clip['atlas']));size=clip['cellSize']
        assert sha(file(clip['source']))==clip['sourceSha256']==receipt['sourceSha256']
        assert sha(file(clip['atlas']))==clip['atlasSha256']==receipt['atlasSha256']
        assert source.mode==atlas.mode=='RGBA' and atlas.size==(size*4,size*2)
        assert clip['frames']==len(receipt['frames'])==8
        assert abs(clip['displayCell']/size-pixel_scale)<1e-12
        assert clip['origin']==[.5,275/320]
        reconstruction=Image.new('RGBA',source.size);coverage=Image.new('L',source.size)
        for frame in receipt['frames']:
            rect=frame['sourceRect'];index=frame['frame'];native=source.crop(rect)
            assert coverage.crop(rect).getextrema()==(0,0)
            coverage.paste(255,rect);reconstruction.paste(native,rect[:2])
            assert frame['uniformScale']==receipt['uniformScale']
            assert frame['targetGroundAnchor']==[160,275]
            crop=native.crop(frame['sourceAlphaBounds']);scale=receipt['uniformScale']
            expected=Image.new('RGBA',(size,size))
            expected.alpha_composite(crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS),frame['offset'])
            packed=atlas.crop((index%4*size,index//4*size,(index%4+1)*size,(index//4+1)*size))
            assert expected.tobytes()==packed.tobytes(),'Packed pixels changed beyond documented crop/scale/translation'
            bounds=packed.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
            assert bounds and min(bounds[0],bounds[1],size-bounds[2],size-bounds[3])>=16
        assert coverage.getextrema()==(255,255) and reconstruction.tobytes()==source.tobytes()
        gif=Image.open(file(receipt['preview']));assert gif.n_frames==8
        elapsed=0
        for index in range(8):gif.seek(index);elapsed+=gif.info['duration']
        assert elapsed==800 and sha(file(receipt['preview']))==receipt['previewSha256']
    source=file('src/client/scene.ts').read_text(encoding='utf8')
    assert 'heavyPose' in source and 'setTexture(pose.texture,pose.frame).setFlipX(false)' in ''.join(source.split())
    assert packing['creativePixelEditsPerformed'] is False and packing['phaserMotionAccepted'] is False
    previous=[]
    for path in ['docs/production-motion-2026-10-23.json','docs/warden-motion-2026-10-23.json','docs/warden-combat-motion-2026-10-23.json']:
        previous.extend(read(path)['requests'])
    previous.extend(read('reviews/art-production-2026-10-23/inventory.json')['nativeSources'])
    for entry in previous:assert sha(file(entry['file']))==entry['sha256']
    report={'createdAt':datetime.now(timezone.utc).isoformat(),'passed':True,'directions':4,'drawnFrames':32,
        'preservedGeneratedNatives':6,'rejectedWestSheetsPreserved':2,'previousNativesUnchanged':len(previous),
        'completeNativeRGBAPixelConservation':True,'packedPixelsMatchTransforms':True,'oneScalePerAction':True,
        'sameWorldPixelScaleAsOriginalFacingReferences':True,'mirroredRuntimeSprites':False,
        'sourceRuntimeIntegrated':True,'phaserMotionAccepted':False,'humanReviewPerformed':False,
        'limits':['Native/contact-sheet and technical packing evidence only; supported rendered motion review remains open.',
            'Four run clips and original facing idles; firing/hurt/dodge/downed action libraries are unfinished.']}
    file('reviews/heavy-2026-10-23/motion-packing.json').with_name('art-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8',newline='\n')
    print(json.dumps(report))

if __name__=='__main__':verify()
