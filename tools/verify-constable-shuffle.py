"""Independently reconstruct the new atlas, whole native, bounds and unchanged historical clips."""
from pathlib import Path
from PIL import Image
import hashlib, json
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
contract=json.loads((ROOT/'assets/production/motion/constable-shuffle-library.json').read_text())
packing=json.loads((ROOT/'reviews/constable-pressure-2026-10-25/shuffle-packing.json').read_text())
provenance=json.loads((ROOT/'docs/constable-pressure-2026-10-25.json').read_text())
assert sha(ROOT/contract['retainedContract']['path'])==contract['retainedContract']['sha256']
retained=json.loads((ROOT/contract['retainedContract']['path']).read_text())
for clip in retained['entries']: assert sha(ROOT/clip['atlas'])==clip['atlasSha256']
for item in provenance['requests']:
    assert sha(ROOT/item['file'])==item['sha256'] and sha(ROOT/item['request'])==item['requestSha256']
    args=json.loads((ROOT/item['request']).read_text()); assert args['transparent_background']
    assert args['referenced_image_paths']==[b['argument'] for b in item['inputBindings']]
    for b in item['inputBindings']: assert sha(ROOT/b['projectPath'])==b['sha256']
entry=contract['clips']['shuffle']; native=Image.open(ROOT/entry['source']); atlas=Image.open(ROOT/entry['atlas'])
assert native.mode==atlas.mode=='RGBA' and sha(ROOT/entry['atlas'])==entry['atlasSha256']
predicted=Image.new('RGBA',atlas.size); restored=Image.new('RGBA',native.size)
coverage=np.zeros((native.height,native.width),np.uint8)
for n,record in enumerate(packing['frames']):
    x0,y0,x1,y1=record['sourceRect']; coverage[y0:y1,x0:x1]+=1
    part=native.crop((x0,y0,x1,y1)); restored.paste(part,(x0,y0))
    if x0: assert not np.any(np.array(native.getchannel('A'))[:,x0])
    bounds=part.getchannel('A').getbbox(); assert list(bounds)==record['sourceAlphaBounds']
    visible=part.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
    assert list(visible)==record['sourceAlpha16Bounds']
    scale=packing['oneScaleAcrossClip']; assert scale==record['uniformScale']
    if n==0: assert abs((visible[3]-visible[1])*scale-288)<1e-10
    crop=part.crop(bounds); dims=[round(crop.width*scale),round(crop.height*scale)]
    assert dims==record['resizedCrop']
    size=entry['cellSize']; padding=(size-384)//2; pivot=[192+padding,320+padding]
    anchor=record['sourceGroundAnchor']; offset=[pivot[0]-round((anchor[0]-bounds[0])*scale),pivot[1]-round((anchor[1]-bounds[1])*scale)]
    assert offset==record['offset']
    assert min(offset)>=16 and offset[0]+dims[0]<=size-16 and offset[1]+dims[1]<=size-16
    frame=Image.new('RGBA',(size,size)); frame.alpha_composite(crop.resize(dims,Image.Resampling.LANCZOS),offset)
    predicted.alpha_composite(frame,(n*size,0))
assert np.all(coverage==1) and restored.tobytes()==native.tobytes()
assert predicted.tobytes()==atlas.tobytes()
assert entry['origin']==[.5,pivot[1]/size]
assert abs(entry['displayCell']/size-retained['clips']['idle']['displayCell']/384)<1e-12
assert sha(ROOT/packing['contactSheet'])==packing['contactSheetSha256']
report={'passed':True,'wholeNativeRgbaConserved':True,'allFourPackedFramesReconstructed':True,
    'retained27PosesUnchanged':True,'renderedAccepted':False,'verifier':'tools/verify-constable-shuffle.py',
    'verifierSha256':sha(Path(__file__)),
    'inputs':[{'path':path,'sha256':sha(ROOT/path)} for path in [
        'assets/production/motion/constable-library.json','assets/production/motion/constable-shuffle-library.json',
        'reviews/constable-pressure-2026-10-25/shuffle-packing.json','docs/constable-pressure-2026-10-25.json',
        entry['source'],entry['atlas'],*sum(([item['request'],*[b['projectPath'] for b in item['inputBindings']]] for item in provenance['requests']),[])]],
    'limits':['Independent PIL/NumPy reconstruction executed separately; portable Node tests bind this receipt to the exact current inputs.','No browser, rendered, device or human approval is claimed.']}
(ROOT/'reviews/constable-pressure-2026-10-25/shuffle-reconstruction.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({k:report[k] for k in ['passed','wholeNativeRgbaConserved','allFourPackedFramesReconstructed','retained27PosesUnchanged','renderedAccepted']}))
