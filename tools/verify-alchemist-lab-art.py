from pathlib import Path
from PIL import Image
import json,hashlib
R=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
contract=R/'assets/production/motion/alchemist-lab-library.json';m=json.loads(contract.read_text(encoding='utf-8'));e=m['entry'];native=R/m['nativeSource'];atlas=Image.open(R/e['atlas']);source=Image.open(native)
assert sha(native)==m['nativeSha256']==e['sourceSha256'];assert sha(R/e['atlas'])==e['atlasSha256'];assert sha(R/m['request'])==m['requestSha256'];assert sha(R/m['preservedActionAtlas'])==m['preservedActionAtlasSha256']
assert source.mode==atlas.mode=='RGBA';assert list(source.size)==m['nativeSize'];assert atlas.size==(1536,1536);assert m['walkFrames']==m['preservedActionFrames']==8 and e['frames']==16
old=Image.open(R/m['preservedActionAtlas']);assert atlas.crop((0,0,1536,768)).tobytes()==old.tobytes(),'Original action pixels changed'
sw,sh=source.size;seen=[];rows=[]
assert len(m['recipes'])==8 and len({r['uniformScale']for r in m['recipes']})==1
for i,r in enumerate(m['recipes']):
 rect=[round(n)for n in[(i%4)*sw/4,(i//4)*sh/2,(i%4+1)*sw/4,(i//4+1)*sh/2]];assert r['sourceCanvas']==rect and r['atlasFrame']==8+i
 raw=source.crop(tuple(rect));assert r['resizedSize']==[round(raw.width*r['uniformScale']),round(raw.height*r['uniformScale'])]
 assert r['offset']==[192-round(r['sourceAnchor'][0]*r['uniformScale']),320-round(r['sourceAnchor'][1]*r['uniformScale'])]
 expected=Image.new('RGBA',(384,384));expected.paste(raw.resize(tuple(r['resizedSize']),Image.Resampling.LANCZOS),tuple(r['offset']))
 actual=atlas.crop(((i%4)*384,(2+i//4)*384,(i%4+1)*384,(3+i//4)*384));assert expected.tobytes()==actual.tobytes()
 assert hashlib.sha256(actual.tobytes()).hexdigest()==r['packedRgbaSha256'];seen.append(hashlib.sha256(raw.tobytes()).hexdigest())
 visible=actual.getchannel('A').point(lambda v:255 if v>=16 else 0);b=visible.getbbox();assert b and min(b[0],b[1],384-b[2],384-b[3])>=6
 rows.append({'frame':8+i,'visibleBounds':b,'packedRgbaSha256':r['packedRgbaSha256'],'sourceCanvas':rect})
assert len(set(seen))==8
for row in range(2):assert len({tuple(r['sourceAnchor'])for r in m['recipes'][row*4:row*4+4]})==1
request=json.loads((R/m['request']).read_text());assert request['transparent_background']and request['tool']=='built-in image_gen'
report={'passed':True,'verifier':'tools/verify-alchemist-lab-art.py','verifierSha256':sha(Path(__file__)),'contractSha256':sha(contract),'newDrawnWalkFrames':8,'oldActionFramesPixelExact':8,'allSourceAlphaPreservedByRecordedCanvases':True,'oneUniformScale':True,'fixedRowAnchors':True,'nativeSha256':sha(native),'requestSha256':m['requestSha256'],'frames':rows,'renderedAccepted':False,'humanAccepted':False,'limits':['Independent raw native/atlas reconstruction and exact source hashes. Static pose/gait review is separate.','No browser playback, physical-device, native-language, listening or final balance acceptance.']}
out=R/'reviews/alchemist-lab-2026-10-27/art-verification.json';out.parent.mkdir(exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({k:v for k,v in report.items()if k!='frames'}))
