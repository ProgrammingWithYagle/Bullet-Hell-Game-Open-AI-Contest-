"""Independent whole-pose RGBA and runtime-binding audit. No engine or human acceptance."""
from pathlib import Path
from PIL import Image
import hashlib,importlib.util,json,numpy as np
R=Path(__file__).resolve().parents[1]
B=R/'assets/production/generated/early-watch-integration-2026-10-25'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
packing=json.loads((B/'packing.json').read_text(encoding='utf-8'))
tool=R/'reviews/early-watch-motion-2026-10-25/whole-pose-components.py'
assert sha(tool)==packing['extractorSha256']
spec=importlib.util.spec_from_file_location('whole',tool);whole=importlib.util.module_from_spec(spec);spec.loader.exec_module(whole)
library=json.loads((R/'assets/production/motion/early-watch-library.json').read_text(encoding='utf-8'))
report=[];cell=packing['cellSize']
manifest=R/'docs/early-watch-integration-2026-10-25.json'
if manifest.exists():
 for f in json.loads(manifest.read_text(encoding='utf-8'))['files']:
  p=R/f['path'];assert p.stat().st_size==f['bytes'] and sha(p)==f['sha256'],f['path']
for e in library['entries']:
 atlas=np.array(Image.open(R/e['atlas']));assert atlas.shape==(cell*3,cell*4,4);assert sha(R/e['atlas'])==e['atlasSha256']
 assert e['defeatStartFrame']==8 and e['defeatFrames']==4
 clips=[c for c in packing['clips'] if c['bossId']==e['bossId']];assert len(clips)==3
 for row,c in enumerate(clips):
  p=R/c['native'];assert sha(p)==c['nativeSha256'];native=np.array(Image.open(p).convert('RGBA'));owner=np.load(R/c['owner'])['owner']
  assert np.array_equal(owner>0,native[:,:,3]>0);assert set(np.unique(owner))=={0,1,2,3,4}
  labels,stats=whole.components(native[:,:,3]>0)
  # Every connected native component has exactly one owner, including faint fragments.
  pairs=np.unique(labels.astype(np.int64)*5+owner);ids=pairs[pairs//5>0]//5;assert len(np.unique(ids))==len(ids)
  assert sorted(int(np.unique(owner[labels==s['label']])[0]) for s in stats[:4])==[1,2,3,4]
  reconstructed=np.zeros_like(native)
  for col,f in enumerate(c['frames']):
   x,y,z,w=f['sourceRect'];mask=owner[y:w,x:z]==col+1;piece=native[y:w,x:z].copy();piece[~mask]=0
   reconstructed[y:w,x:z][mask]=piece[mask];im=Image.fromarray(piece)
   if col==0:
    readable=im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();axis=c['calibrationAxis']
    assert abs(c['uniformScale']-c['calibrationPixels']/(readable[axis+2]-readable[axis]))<1e-12
   size=[round(im.width*c['uniformScale']),round(im.height*c['uniformScale'])];assert size==f['resizedSize']
   scaled=im.resize(size,Image.Resampling.LANCZOS);readable=scaled.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
   paste=[packing['anchor'][0]-(readable[0]+readable[2])//2,packing['anchor'][1]-readable[3]];assert paste==f['paste'], (c['bossId'],c['clip'],col,paste,f['paste'],size,readable)
   expected=Image.new('RGBA',(cell,cell));expected.paste(scaled,paste);actual=Image.open(R/f['path'])
   assert np.array_equal(np.array(expected),np.array(actual));assert sha(R/f['path'])==f['sha256']
   assert np.array_equal(np.array(actual),atlas[row*cell:(row+1)*cell,col*cell:(col+1)*cell])
  live=native[:,:,3]>0;assert np.array_equal(reconstructed[:,:,3],native[:,:,3]);assert np.array_equal(reconstructed[live],native[live])
  report.append({'bossId':c['bossId'],'clip':c['clip'],'frames':4,'sourceAlphaPixels':int(live.sum()),'allAlphaBearingRgbaReconstructed':True,'oneScalePerNative':True})
# Exact original files stay bound, without rewriting the checkpoint's issued requests.
bindings={}
for ret in json.loads((B/'returns.json').read_text(encoding='utf-8'))['returns']:
 assert sha(R/ret['native'])==ret['nativeSha256'] and sha(R/ret['request'])==ret['requestSha256']
 args=json.loads((R/ret['request']).read_text(encoding='utf-8'));assert args['transparent_background']
 for ref in args['referenced_image_paths']:
  p=Path(ref);assert p.is_file();bindings[ref]=p.relative_to(R).as_posix()
 assert ret['renderedAccepted'] is False
loading=json.loads((R/'assets/delivery/boss-loading-v4/library.json').read_text(encoding='utf-8'))
previous=loading['previousManifest'];assert sha(R/previous['path'])==previous['sha256']
for ref in loading['entries']+loading['settledReferences']:
 assert sha(R/ref['reference'])==ref['referenceSha256'] and sha(R/ref['sourceAtlas'])==ref['sourceAtlasSha256']
 atlas=Image.open(R/ref['sourceAtlas']).convert('RGBA');n=ref['sourceFrame'];s=ref['sourceCellSize'];columns=atlas.width//s
 original=atlas.crop((n%columns*s,n//columns*s,(n%columns+1)*s,(n//columns+1)*s))
 rebuilt=Image.new('RGBA',(s,s));rebuilt.paste(Image.open(R/ref['reference']),ref['sourceRect'][:2]);assert np.array_equal(np.array(original),np.array(rebuilt))
catalog=json.loads((R/'content/catalog.json').read_text(encoding='utf-8'));assert len(catalog['bosses'])>=63
assert all(any(b['id']==e['bossId'] for b in catalog['bosses']) for e in library['entries'])
summary={'passed':True,'completePoses':36,'runtimeAdmitted':True,'renderedAccepted':False,'humanAccepted':False,'clips':report,'portableBindings':bindings,
 'limits':['Exact alpha-bearing native RGBA, connected ownership, uniform scaling, complete atlas and fallback reconstruction only.','Runtime admission is checked in source and automated tests, not rendered engine, device, timing perception, listening or human balance acceptance.']}
(R/'reviews/early-watch-integration-2026-10-25/art-verification.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'passed':True,'completePoses':36,'runtimeAdmitted':True,'renderedAccepted':False}))
