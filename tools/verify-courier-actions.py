"""Independent source partition, retained-prefix and every-pixel reconstruction."""
from pathlib import Path
from PIL import Image
import hashlib,json
import numpy as np
ROOT=Path(__file__).resolve().parents[1];REVIEW=ROOT/'reviews/courier-actions-2026-10-25';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
library=read(ROOT/'assets/production/motion/courier-library.json');entry=library['entries'][0];inputs=read(REVIEW/'input-contract.json');pack=read(REVIEW/'packing.json');batch=read(ROOT/'docs/courier-actions-2026-10-25.json')
assert sha(ROOT/library['sourceTool'])==library['sourceToolSha256'];assert len(batch['requests'])==3
for request in batch['requests']:
    assert sha(ROOT/request['file'])==request['sha256'];assert sha(ROOT/request['request'])==request['requestSha256']
    for binding in request['inputBindings']:assert sha(ROOT/binding['projectPath'])==binding['sha256']
old=inputs['base'];assert entry['baseAtlas']==old['atlas'] and sha(ROOT/old['atlas'])==old['atlasSha256']==entry['baseAtlasSha256']
assert entry['cellSize']==old['cellSize']==384 and entry['origin']==old['origin'] and entry['displayCell']==old['displayCell']
assert entry['frames']==28 and entry['preservedFrames']==16
actual=Image.open(ROOT/entry['atlas']);base=Image.open(ROOT/old['atlas']);assert actual.mode==base.mode=='RGBA';assert actual.size==(1536,2688)
predicted=Image.new('RGBA',actual.size);predicted.paste(base,(0,0));assert actual.crop((0,0,1536,1536)).tobytes()==base.tobytes()
results=[];pivot=[round(v*384)for v in old['origin']]
for order,receipt in enumerate(pack['motions']):
    motion=receipt['motion'];request=next(e for e in batch['requests']if e['motion']==motion);assert request['file']==receipt['source'];assert sha(ROOT/receipt['source'])==receipt['sourceSha256']
    native=Image.open(ROOT/receipt['source']);assert native.mode=='RGBA';coverage=np.zeros((native.height,native.width),np.uint8);restored=Image.new('RGBA',native.size);alpha=np.array(native.getchannel('A'));fixed_x=None
    for n,record in enumerate(receipt['frames']):
        x0,y0,x1,y1=record['sourceRect'];assert 0<=x0<x1<=native.width and y0==0 and y1==native.height;coverage[y0:y1,x0:x1]+=1;piece=native.crop((x0,y0,x1,y1));restored.paste(piece,(x0,y0));assert x0==0 or not np.any(alpha[:,x0])
        bounds=piece.getchannel('A').getbbox();visible=piece.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();assert list(bounds)==record['sourceAlphaBounds'] and list(visible)==record['sourceAlpha16Bounds']
        if n==0:
            expected_scale=inputs['standingCalibrationHeight']/(visible[3]-visible[1]);assert expected_scale==receipt['uniformScale'];v=visible;weights=np.array(piece.getchannel('A'))[max(v[1],v[3]-round((v[3]-v[1])*.1)):v[3],v[0]:v[2]].copy();weights[weights<16]=0;weights=weights.sum(axis=0).astype(float);fixed_x=round(float(np.dot(np.arange(v[0],v[2])+.5,weights)/weights.sum()))+x0
        scale=record['uniformScale'];assert scale==receipt['uniformScale'];ground=[fixed_x+n*native.width/4-x0,visible[3]];assert ground==record['sourceGroundAnchor'] and pivot==record['targetGroundAnchor'];crop=piece.crop(bounds);resized=[round(crop.width*scale),round(crop.height*scale)];assert resized==record['resizedCrop'];offset=[pivot[0]-round((ground[0]-bounds[0])*scale),pivot[1]-round((ground[1]-bounds[1])*scale)];assert offset==record['offset'];assert min(offset)>=16 and offset[0]+resized[0]<=368 and offset[1]+resized[1]<=368
        frame=16+order*4+n;assert frame==record['runtimeFrame'];target=Image.new('RGBA',(384,384));target.alpha_composite(crop.resize(resized,Image.Resampling.LANCZOS),offset);predicted.paste(target,(frame%4*384,frame//4*384))
    assert np.all(coverage==1) and restored.tobytes()==native.tobytes()
    for name in ['preview','contactSheet']:assert sha(ROOT/receipt[name])==receipt[name+'Sha256']
    results.append({'motion':motion,'completePoses':4,'wholeNativeRgbaPartitionExact':True,'oneUprightCalibratedScale':True,'allDeliveredPixelsReconstructed':True})
assert predicted.tobytes()==actual.tobytes();assert sha(ROOT/entry['atlas'])==entry['atlasSha256']==pack['atlasSha256']
report={'passed':True,'verifier':'tools/verify-courier-actions.py','verifierSha256':sha(Path(__file__)),'librarySha256':sha(ROOT/'assets/production/motion/courier-library.json'),'nativeReturns':3,'newCompletePoses':12,'preservedEarlierActionAndDefeatPoses':16,'originalWorldTransformUnchanged':True,'results':results,'renderedAccepted':False,'limits':['Independent complete-native, packed-pixel and original-prefix reconstruction.','Native/contact-sheet inspection is separate from rendered/device/human anatomy and transition review.']}
(REVIEW/'reconstruction.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({k:report[k]for k in ['passed','newCompletePoses','preservedEarlierActionAndDefeatPoses']}))
