"""Independent reconstruction of the Warden patrol's complete native RGBA and atlas."""
from pathlib import Path
from PIL import Image
from statistics import median
import json,hashlib,datetime
R=Path(__file__).resolve().parents[1]
def path(p):
 result=(R/p).resolve();assert result.is_relative_to(R) and result.is_file();return result
def read(p):return json.loads(path(p).read_text(encoding='utf8'))
def sha(p):return hashlib.sha256(path(p).read_bytes()).hexdigest()
V='reviews/warden-patrol-2026-10-25/'
r=read(V+'packing.json');clip=read('assets/production/motion/warden-patrol.json');native=Image.open(path(r['source']));assert native.mode=='RGBA'
assert sha(r['source'])==r['sourceSha256']==clip['sourceSha256'];assert list(native.size)==r['sourceSize'];assert sha(r['atlas'])==r['atlasSha256']==clip['atlasSha256']
coverage=Image.new('L',native.size);restored=Image.new('RGBA',native.size);target=Image.new('RGBA',(1024,1024));heights=[]
for f in r['frames']:
 rect=f['sourceRect'];cell=native.crop(rect);assert coverage.crop(rect).getbbox() is None;coverage.paste(255,rect);restored.paste(cell,rect[:2])
 bounds=cell.getchannel('A').getbbox();visible=cell.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();assert list(bounds)==f['sourceAlphaBounds'];assert list(visible)==f['sourceAlpha16Bounds'];heights.append(visible[3]-visible[1]);assert min(visible[0],visible[1],cell.width-visible[2],cell.height-visible[3])>=8
 # Independently remeasure the lower-ten-percent boot centroid.
 top=visible[3]-max(2,round((visible[3]-visible[1])*.10));weights=0;moments=0
 for y in range(top,visible[3]):
  for x in range(visible[0],visible[2]):
   a=cell.getpixel((x,y))[3]
   if a>=16:weights+=a;moments+=(x+.5)*a
 foot=[round(moments/weights),visible[3]];assert foot==f['sourceFootAnchor'];scale=r['oneScale'];assert scale==f['uniformScale']
 crop=cell.crop(bounds);size=[round(crop.width*scale),round(crop.height*scale)];assert size==f['resizedSize'];offset=[256-round((foot[0]-bounds[0])*scale),430-round((foot[1]-bounds[1])*scale)];assert offset==f['offset']
 frame=Image.new('RGBA',(512,512));frame.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset);i=f['frame'];target.paste(frame,((i%2)*512,(i//2)*512))
assert coverage.getextrema()==(255,255) and restored.tobytes()==native.tobytes();assert r['oneScale']==256/median(heights);assert target.tobytes()==Image.open(path(r['atlas'])).tobytes()
prior=read('assets/production/motion/warden-rehearsal.json');assert abs(256*clip['displayCell']/512-344*prior['displayCell']/512)<1e-9
for f in r['preserved']:assert sha(f['path'])==f['sha256']
result=read('assets/production/generated/warden-patrol-2026-10-25/native-result.json')
for binding in read('assets/production/generated/warden-patrol-2026-10-25/portable-bindings.json')['bindings']:assert sha(binding['portablePath'])==binding['sha256']
for f in result['portableReferences']:assert sha(f['file'])==f['sha256']
for library in ['assets/production/motion/library.json','assets/production/normalized/library.json']:
 assert next(e for e in read(library)['entries'] if e['id']==clip['id'])==clip
report={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'frames':4,'sourceSha256':r['sourceSha256'],'atlasSha256':r['atlasSha256'],'sourceRGBAConserved':True,'alphaThresholdNotAppliedToArtwork':True,'oneScalePerNative':True,'identicalWorldBodyHeight':True,'preservedFiles':len(r['preserved']),'renderedAccepted':False,'humanAccepted':False,'limits':['Independent file/math verification, not rendered motion or physical-device acceptance.','Assistant inspected native identity, lantern ownership, whole figures and four different poses; native-language/listening/human balance acceptance remains separate.']}
(R/(V+'art-verification.json')).write_text(json.dumps(report,indent=2)+'\n',encoding='utf8',newline='\n');print(json.dumps(report))
