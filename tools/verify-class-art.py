"""Independently reconstruct every shipped sprite from preserved native RGBA."""
from pathlib import Path
from PIL import Image
import json,hashlib
R=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
packing=json.loads((R/'reviews/class-completion-2026-10-23/packing.json').read_text(encoding='utf8'));count=0;motion=0
for e in packing['entries']:
 native=Image.open(R/e['source']).convert('RGBA');assert sha(R/e['source'])==e['sourceSha256'];target=Image.open(R/e['atlas']).convert('RGBA');assert sha(R/e['atlas'])==e['atlasSha256'];assert native.getchannel('A').getextrema()==(0,255)
 if 'rectangles' in e:
  reconstructed=Image.new('RGBA',native.size)
  for rect in e['rectangles']:reconstructed.paste(native.crop(tuple(rect)),tuple(rect[:2]))
  for i,(rect,f) in enumerate(zip(e['rectangles'],e['frames'])):
   cell=native.crop(tuple(rect));reconstructed.paste(cell,tuple(rect[:2]));assert list(cell.getchannel('A').getbbox())==f['sourceAlphaBounds']
   expected=Image.new('RGBA',(384,384));expected.alpha_composite(cell.crop(tuple(f['sourceAlphaBounds'])).resize(tuple(f['size']),Image.Resampling.LANCZOS),tuple(f['offset']));actual=target.crop((i%4*384,i//4*384,(i%4+1)*384,(i//4+1)*384));assert actual.tobytes()==expected.tobytes(),(e['id'],i)
   box=actual.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox();assert box and min(box[:2])>=12 and max(box[2:])<=372;count+=1;motion+=1
  assert reconstructed.tobytes()==native.tobytes()
 else:
  cell=native.crop(tuple(e['sourceRect']));assert list(cell.getchannel('A').getbbox())==e['sourceAlphaBounds'];expected=Image.new('RGBA',(256,256));expected.alpha_composite(cell.crop(tuple(e['sourceAlphaBounds'])).resize(tuple(e['size']),Image.Resampling.LANCZOS),tuple(e['offset']));assert target.tobytes()==expected.tobytes(),e['id'];count+=1
assert motion==124 and count==192
report={'passed':True,'nativeMotionFrames':motion,'itemAndPropIllustrations':count-motion,'exactReconstructedPixels':True,'allSourceAndAtlasHashes':True,'allNativeAlphaExtrema':[0,255],'visiblePaddingAtLeastPixels':12,'creativePixelEdits':False,'renderedHumanAcceptance':False}
(R/'reviews/class-completion-2026-10-23/independent-art-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(report))
