"""Independent local verification of art-only candidates; requires Pillow and NumPy."""
from pathlib import Path
from PIL import Image
import hashlib, importlib.util, json
import numpy as np

repo=Path(__file__).resolve().parents[1]
doc_path=repo/'docs/early-watch-motion-checkpoint-2026-10-25.json'
doc=json.loads(doc_path.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for f in doc['files']:
    p=repo/f['path'];assert p.stat().st_size==f['bytes'] and sha(p)==f['sha256'],f['path']
assert len(doc['requests'])==11 and sum(r['executed'] for r in doc['requests'])==4
for r in doc['requests']:
    assert sha(repo/r['path'])==r['sha256']
    args=json.loads((repo/r['path']).read_text(encoding='utf-8'));assert args['transparent_background'] is True
    for ref in args['referenced_image_paths']:
        assert (repo/doc['portableBindings'][ref]).is_file()
base=repo/'assets/production/generated/early-watch-motion-2026-10-25'
packing=json.loads((repo/doc['packing']).read_text(encoding='utf-8'))
extractor=repo/'reviews/early-watch-motion-2026-10-25/whole-pose-components.py'
assert sha(extractor)==packing['extractorSha256']
spec=importlib.util.spec_from_file_location('whole_components',extractor);whole=importlib.util.module_from_spec(spec);spec.loader.exec_module(whole)
cell=packing['cellSize'];atlas=np.array(Image.open(base/'normalized/brass-toad-candidate-atlas.png'))
assert atlas.shape==(cell*3,cell*4,4)
checks=[]
for row,clip in enumerate(packing['clips']):
    p=base/'natives'/clip['native'];assert sha(p)==clip['nativeSha256']
    native=np.array(Image.open(p).convert('RGBA'));owner=np.load(base/'normalized'/f'brass-toad-{clip["clip"]}-owners.npz')['owner']
    assert np.array_equal(owner>0,native[:,:,3]>0)
    assert set(np.unique(owner))=={0,1,2,3,4}
    labels,components=whole.components(native[:,:,3]>0)
    # Each connected source component belongs to one complete pose, never split into limbs.
    pairs=np.unique(labels.astype(np.int64)*5+owner)
    positive=pairs//5>0;connected_labels=pairs[positive]//5
    assert len(np.unique(connected_labels))==len(connected_labels)
    largest=[]
    for component in components[:4]:
        values=np.unique(owner[labels==component['label']]);assert len(values)==1
        largest.append(int(values[0]))
    assert sorted(largest)==[1,2,3,4]
    reconstruction=np.zeros_like(native)
    for col,f in enumerate(clip['frames']):
        x0,y0,x1,y1=f['sourceRect'];piece=native[y0:y1,x0:x1].copy();mask=owner[y0:y1,x0:x1]==col+1
        piece[~mask]=0;reconstruction[y0:y1,x0:x1][mask]=piece[mask]
        image=Image.fromarray(piece);calibration=image.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
        if col==0:assert abs(clip['uniformScale']-packing['uprightBodyHeight']/(calibration[3]-calibration[1]))<1e-12
        size=[round(image.width*clip['uniformScale']),round(image.height*clip['uniformScale'])]
        assert size==f['resizedSize']
        resized=image.resize(size,Image.Resampling.LANCZOS)
        readable=resized.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
        paste=[packing['anchor'][0]-(readable[0]+readable[2])//2,packing['anchor'][1]-readable[3]]
        assert paste==f['paste'];assert min(*paste,cell-paste[0]-size[0],cell-paste[1]-size[1])>=16
        expected=Image.new('RGBA',(cell,cell));expected.paste(resized,paste)
        actual=Image.open(base/'normalized'/f['file']).convert('RGBA')
        assert np.array_equal(np.array(expected),np.array(actual))
        assert sha(base/'normalized'/f['file'])==f['sha256']
        assert np.array_equal(atlas[row*cell:(row+1)*cell,col*cell:(col+1)*cell],np.array(actual))
    live=native[:,:,3]>0
    assert np.array_equal(reconstruction[:,:,3],native[:,:,3])
    assert np.array_equal(reconstruction[live],native[live])
    checks.append({'clip':clip['clip'],'frames':4,'sourceAlphaPixels':int(live.sum()),'componentOwnershipIntact':True,'allNonzeroAlphaRgbaExact':True,'sharedScaleAndAnchor':True})
catalog=json.loads((repo/'content/catalog.json').read_text(encoding='utf-8'))
assert len(catalog['bosses'])==60
assert not any(b['id'] in doc['concepts'] for b in catalog['bosses'])
assert doc['runtimeAdmitted'] is False and doc['playableBossesAdded']==0
assert sha(repo/doc['contactSheet'])==sha(base/'normalized/brass-toad-motion-checkpoint.jpg')
report={'passed':True,'stage':'early-watch-motion-2026-10-25','manifestSha256':sha(doc_path),'filesChecked':len(doc['files']),
        'generatedSheets':4,'candidatePoses':12,'playableBossesAdded':0,'runtimeAdmitted':False,'renderedAccepted':False,
        'atlasSize':[cell*4,cell*3],'clips':checks,
        'limits':['Independent local file, alpha-bearing RGBA, ownership, proportional packing and atlas reconstruction only.',
                  'Generated native hashes also preserve hidden RGB under alpha zero. No browser, timing, device or human acceptance.']}
(repo/'reviews/early-watch-motion-2026-10-25/verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(report))
