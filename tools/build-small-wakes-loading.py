"""Add exact Small Wakes identity/settled crops; every previous reference is retained."""
from pathlib import Path
from PIL import Image
from io import BytesIO
import hashlib,json
R=Path(__file__).resolve().parents[1];O=R/'assets/delivery/boss-loading-v5';O.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=R/'assets/delivery/boss-loading-v4/library.json';lib=json.loads(old.read_text(encoding='utf8'))
entries=json.loads((R/'assets/production/motion/small-wakes-library.json').read_text(encoding='utf8'))['entries'];extra=[];settled=[]
for e in entries:
 atlas=Image.open(R/e['atlas']);cell=e['cellSize']
 for frame,is_settled in [(0,False),(11,True)]:
  col,row=frame%4,frame//4;im=atlas.crop((col*cell,row*cell,(col+1)*cell,(row+1)*cell));box=im.getchannel('A').getbbox()
  rect=[max(0,box[0]-16),max(0,box[1]-16),min(cell,box[2]+16),min(cell,box[3]+16)];piece=im.crop(rect);p=O/(e['bossId']+('-defeat-reference-v2.png' if is_settled else '-reference-v3.png'))
  stream=BytesIO();piece.save(stream,format='PNG');data=stream.getvalue()
  if p.exists():assert p.read_bytes()==data
  else:p.write_bytes(data)
  ref={'bossId':e['bossId'],'sourceAtlas':e['atlas'],'sourceAtlasSha256':e['atlasSha256'],'sourceFrame':frame,'sourceCellSize':cell,'sourceRect':rect,'sourceOrigin':e['origin'],'sourceDisplayCell':e['displayCell'],'sourceFullDecodedBytes':atlas.width*atlas.height*4,'reference':p.relative_to(R).as_posix(),'referenceSha256':sha(p),'referenceWidth':piece.width,'referenceHeight':piece.height,'referenceDecodedBytes':piece.width*piece.height*4,'referencePngBytes':p.stat().st_size,'origin':[(e['origin'][0]*cell-rect[0])/piece.width,(e['origin'][1]*cell-rect[1])/piece.height],'displayWidth':piece.width*e['displayCell']/cell,'displayHeight':piece.height*e['displayCell']/cell}
  if is_settled:ref.update({'defeatStartFrame':8,'defeatFrames':4});settled.append(ref)
  else:extra.append(ref)
lib.update({'schemaVersion':5,'sourceTool':'tools/build-small-wakes-loading.py','sourceToolSha256':sha(Path(__file__)),'previousManifest':{'path':old.relative_to(R).as_posix(),'sha256':sha(old)}})
lib['entries']+=extra;lib['settledReferences']+=settled;lib['lazyBossIds'] += [e['bossId'] for e in entries]
s=lib['summary']
for key in ['encounterAtlases','lazyAtlases','mainReferences','settledReferences']:s[key]+=3
s['baselineDecodedBytes']+=sum(e['frames']*e['cellSize']**2*4 for e in entries)
s['mainReferenceDecodedBytes']+=sum(e['referenceDecodedBytes'] for e in extra);s['settledReferenceDecodedBytes']+=sum(e['referenceDecodedBytes'] for e in settled)
s['referenceDecodedBytes']=s['mainReferenceDecodedBytes']+s['settledReferenceDecodedBytes'];s['startupDecodedBytes']=s['alwaysLoadedDecodedBytes']+s['referenceDecodedBytes']
s['maximumTwoFullAtlasBytes']=sum(sorted((e['sourceFullDecodedBytes'] for e in lib['entries']),reverse=True)[:2]);s['maximumCachedDecodedBytes']=s['startupDecodedBytes']+s['maximumTwoFullAtlasBytes'];s['cachedReductionPercent']=100*(1-s['maximumCachedDecodedBytes']/s['baselineDecodedBytes']);s['referencePngBytes']+=sum(e['referencePngBytes'] for e in extra+settled)
lib['limits'].append('Version5 adds exact complete Small Wakes first/settled-frame crops and three lazy atlases; all previous reference and master bytes remain unchanged. This encounter subtotal retains its prior scope and excludes Warden/survivor/environment textures and actual GPU/device performance.')
(O/'library.json').write_text(json.dumps(lib,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps({'mainReferences':s['mainReferences'],'settledReferences':s['settledReferences'],'lazyAtlases':s['lazyAtlases'],'newFullAtlasDecodedBytes':sum(e['frames']*e['cellSize']**2*4 for e in entries)}))
