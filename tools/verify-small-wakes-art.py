"""Independent Pillow-only reconstruction; does not import the packer or its component algorithm."""
from pathlib import Path
from PIL import Image
from statistics import median
import hashlib,json,datetime,sys
R=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
B='assets/production/generated/small-wakes-2026-10-26/'
def path(p):
 f=(R/p).resolve();assert f.is_relative_to(R) and f.is_file(),p;return f
def read(p):return json.loads(path(p).read_text(encoding='utf8'))
def sha(p):return hashlib.sha256(path(p).read_bytes()).hexdigest()
def foot(im):
 a=im.getchannel('A');v=a.point(lambda x:255 if x>=16 else 0).getbbox();bottom=v[3];top=bottom-max(2,round((bottom-v[1])*.1));weights=0;moments=0;data=a.tobytes()
 for y in range(top,bottom):
  for x in range(im.width):
   value=data[y*im.width+x]
   if value>=16:weights+=value;moments+=(x+.5)*value
 return [round(moments/weights),bottom]
p=read(B+'packing-v2.json');lib=read('assets/production/motion/small-wakes-library.json');assert len(lib['entries'])==3
reports=[];firstHeights={};scales={}
for e in lib['entries']:
 atlas=Image.open(path(e['atlas']));assert atlas.mode=='RGBA' and atlas.size==(2048,1536);assert sha(e['atlas'])==e['atlasSha256'];assert e['defeatStartFrame']==8 and e['defeatFrames']==4 and e['defeatFps']==5
 rebuiltAtlas=Image.new('RGBA',atlas.size);clips=[c for c in p['clips'] if c['bossId']==e['bossId']];assert [c['clip'] for c in clips]==['idle','attack','defeat']
 for row,c in enumerate(clips):
  native=Image.open(path(c['native']));assert native.mode=='RGBA' and list(native.size)==c['sourceSize'];assert sha(c['native'])==c['nativeSha256']
  owner=Image.open(path(c['owner']));assert owner.mode=='L' and owner.size==native.size and sha(c['owner'])==c['ownerSha256']
  alpha=native.getchannel('A').tobytes();who=owner.tobytes();w,h=native.size;counts=[0]*5;splitFaintEdges=0
  for i,a in enumerate(alpha):
   n=who[i];assert 0<=n<=4 and bool(n)==bool(a);counts[n]+=1
   if a>=16:
    x=i%w
    neighbors=([i-1] if x else [])+([i-w] if i>=w else [])+([i-w-1] if i>=w and x else [])+([i-w+1] if i>=w and x+1<w else [])
    assert all(alpha[j]<16 or who[j]==n for j in neighbors),'Readable native connected figure split'
   elif a and i%w and alpha[i-1] and who[i-1]!=n:splitFaintEdges+=1
  assert all(n>40000 for n in counts[1:])
  restored=Image.new('RGBA',native.size);heights=[]
  for col,f in enumerate(c['frames']):
   mask=owner.point(lambda n:255 if n==col+1 else 0);assert list(mask.getbbox())==f['sourceRect'];rect=f['sourceRect'];localMask=mask.crop(rect)
   piece=Image.new('RGBA',(rect[2]-rect[0],rect[3]-rect[1]));piece.paste(native.crop(rect),(0,0),localMask);restored.paste(piece,rect[:2],localMask)
   visible=piece.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();heights.append(visible[3]-visible[1]);sourceFoot=foot(piece);assert sourceFoot==f['sourceFootAnchor']
   scale=c['oneScalePerIdentity'];scales.setdefault(e['bossId'],set()).add(scale);size=[round(piece.width*scale),round(piece.height*scale)];offset=[p['anchor'][0]-round(sourceFoot[0]*scale),p['anchor'][1]-round(sourceFoot[1]*scale)]
   assert size==f['resizedSize'] and offset==f['offset'],(e['bossId'],c['clip'],col,size,f['resizedSize'],offset,f['offset'],p['anchor']);assert min(*offset,512-offset[0]-size[0],512-offset[1]-size[1])>=4
   frame=Image.new('RGBA',(512,512));frame.paste(piece.resize(size,Image.Resampling.LANCZOS),offset);actual=Image.open(path(f['path']));assert frame.tobytes()==actual.tobytes() and sha(f['path'])==f['sha256']
   assert frame.tobytes()==atlas.crop((col*512,row*512,(col+1)*512,(row+1)*512)).tobytes();rebuiltAtlas.paste(frame,(col*512,row*512))
  firstHeights.setdefault(e['bossId'],[]).append(heights[0]);expected=native.copy();expected.paste((0,0,0,0),(0,0),owner.point(lambda n:0 if n else 255));assert restored.tobytes()==expected.tobytes()
  if c['clip']=='attack' and e['bossId']=='mourning-kettle':assert c['method']['faintBridgeLabels'] and splitFaintEdges>0
  reports.append({'bossId':e['bossId'],'clip':c['clip'],'poses':4,'alphaBearingPixels':sum(counts[1:]),'allAlphaBearingRGBAReconstructed':True,'readableConnectedFiguresUnsplit':True,'faintOwnershipEdges':splitFaintEdges})
 assert rebuiltAtlas.tobytes()==atlas.tobytes()
for e in lib['entries']:
 clips=[c for c in p['clips'] if c['bossId']==e['bossId']];assert len(scales[e['bossId']])==1
 for c in clips:assert c['calibrationFirstPoseHeights']==firstHeights[e['bossId']] and abs(c['oneScalePerIdentity']-c['calibrationPixels']/median(firstHeights[e['bossId']]))<1e-12
records=[]
for name in ['initial-native-receipts.json','action-native-receipts.json','kettle-action-native-receipts.json']:
 for r in read(B+name)['records']:
  assert sha(r['native'])==r['nativeSha256'] and sha(r['request'])==r['requestSha256'];request=read(r['request']);assert request['transparent_background'];assert r['renderedAccepted'] is False and r['humanAccepted'] is False
  for ref in request.get('references',[]):path(ref)
  records.append(r)
assert len(records)==10 and len({r['nativeSha256'] for r in records})==10
bindingsPath=R/(B+'portable-bindings.json')
if bindingsPath.exists():
 for binding in read(B+'portable-bindings.json')['bindings']:assert sha(binding['portablePath'])==binding['sha256']
loadingPath=R/'assets/delivery/boss-loading-v5/library.json'
if loadingPath.exists():
 loading=read('assets/delivery/boss-loading-v5/library.json');prior=read(loading['previousManifest']['path']);assert sha(loading['previousManifest']['path'])==loading['previousManifest']['sha256']
 assert loading['entries'][:len(prior['entries'])]==prior['entries'] and loading['settledReferences'][:len(prior['settledReferences'])]==prior['settledReferences']
 for ref in loading['entries']+loading['settledReferences']:
  assert sha(ref['reference'])==ref['referenceSha256'] and sha(ref['sourceAtlas'])==ref['sourceAtlasSha256'];atlas=Image.open(path(ref['sourceAtlas']));n=ref['sourceFrame'];s=ref['sourceCellSize'];cols=atlas.width//s
  original=atlas.crop((n%cols*s,n//cols*s,(n%cols+1)*s,(n//cols+1)*s));rebuilt=Image.new('RGBA',(s,s));rebuilt.paste(Image.open(path(ref['reference'])),ref['sourceRect'][:2]);assert original.tobytes()==rebuilt.tobytes()
report={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'identities':3,'selectedPoses':36,'immutableNatives':10,'oneScalePerIdentity':True,'clips':reports,'renderedAccepted':False,'humanAccepted':False,'limits':['Independent file/pixel/anchor/cache reconstruction, not rendered motion, physical-device, native-language, listening or final human balance acceptance.','Alpha16 defines ownership seeds and foot measurements only; every source alpha-bearing RGBA pixel is retained. Invisible alpha0 RGB is preserved in each immutable native.','The single kettle lower-row faint bridge has an explicit ownership partition; no readable connected figure is split.']}
out=R/'reviews/small-wakes-2026-10-26/art-verification.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf8',newline='\n');print(json.dumps({k:report[k] for k in ['passed','identities','selectedPoses','immutableNatives','oneScalePerIdentity','renderedAccepted']}))
