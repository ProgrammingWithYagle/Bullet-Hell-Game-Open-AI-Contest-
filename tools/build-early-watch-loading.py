from pathlib import Path
from PIL import Image
import hashlib,json
R=Path(r'C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)')
O=R/'assets/delivery/boss-loading-v4';O.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=R/'assets/delivery/boss-loading-v3/library.json';lib=json.loads(old.read_text(encoding='utf-8'))
new=json.loads((R/'assets/production/motion/early-watch-library.json').read_text(encoding='utf-8'))['entries']
extra=[];settled=[]
for e in new:
 atlas=Image.open(R/e['atlas']).convert('RGBA');cell=e['cellSize']
 for frame,is_settled in [(0,False),(11,True)]:
  col,row=frame%4,frame//4;im=atlas.crop((col*cell,row*cell,(col+1)*cell,(row+1)*cell))
  box=im.getchannel('A').getbbox();rect=[max(0,box[0]-16),max(0,box[1]-16),min(cell,box[2]+16),min(cell,box[3]+16)]
  piece=im.crop(rect);p=O/(e['bossId']+('-defeat-reference-v2.png' if is_settled else '-reference-v3.png'));assert not p.exists();piece.save(p)
  entry={'bossId':e['bossId'],'sourceAtlas':e['atlas'],'sourceAtlasSha256':e['atlasSha256'],'sourceFrame':frame,
   'sourceCellSize':cell,'sourceRect':rect,'sourceOrigin':e['origin'],'sourceDisplayCell':e['displayCell'],
   'sourceFullDecodedBytes':atlas.width*atlas.height*4,'reference':p.relative_to(R).as_posix(),'referenceSha256':sha(p),
   'referenceWidth':piece.width,'referenceHeight':piece.height,'referenceDecodedBytes':piece.width*piece.height*4,
   'referencePngBytes':p.stat().st_size,'origin':[(e['origin'][0]*cell-rect[0])/piece.width,(e['origin'][1]*cell-rect[1])/piece.height],
   'displayWidth':piece.width*e['displayCell']/cell,'displayHeight':piece.height*e['displayCell']/cell}
  if is_settled:entry.update({'defeatStartFrame':8,'defeatFrames':4});settled.append(entry)
  else:extra.append(entry)
lib['schemaVersion']=4;lib['sourceTool']='tools/build-early-watch-loading.py'
lib['previousManifest']={'path':old.relative_to(R).as_posix(),'sha256':sha(old)}
lib['sourceToolSha256']=sha(Path(__file__))
lib['entries']+=extra;lib['settledReferences']+=settled;lib['lazyBossIds'] += [e['bossId'] for e in new]
s=lib['summary'];s['encounterAtlases']+=3;s['lazyAtlases']+=3;s['mainReferences']+=3;s['settledReferences']+=3
s['baselineDecodedBytes']+=sum(e['frames']*e['cellSize']**2*4 for e in new)
s['mainReferenceDecodedBytes']+=sum(e['referenceDecodedBytes'] for e in extra)
s['settledReferenceDecodedBytes']+=sum(e['referenceDecodedBytes'] for e in settled)
s['referenceDecodedBytes']=s['mainReferenceDecodedBytes']+s['settledReferenceDecodedBytes']
s['startupDecodedBytes']=s['alwaysLoadedDecodedBytes']+s['referenceDecodedBytes']
s['maximumTwoFullAtlasBytes']=sum(sorted((e['sourceFullDecodedBytes'] for e in lib['entries']),reverse=True)[:2])
s['maximumCachedDecodedBytes']=s['startupDecodedBytes']+s['maximumTwoFullAtlasBytes']
s['cachedReductionPercent']=100*(1-s['maximumCachedDecodedBytes']/s['baselineDecodedBytes'])
s['referencePngBytes']+=sum(e['referencePngBytes'] for e in extra+settled)
lib['limits'].append('Version 4 adds exact complete Early Watch identity and four-frame settled crops; every version-3 reference and master byte remains unchanged.')
(O/'library.json').write_text(json.dumps(lib,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'mainReferences':s['mainReferences'],'settledReferences':s['settledReferences'],'lazyAtlases':s['lazyAtlases']}))
