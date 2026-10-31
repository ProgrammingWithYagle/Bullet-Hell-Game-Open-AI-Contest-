from pathlib import Path
from PIL import Image
import hashlib,json,sys
r=Path(sys.argv[1]).resolve()if len(sys.argv)>1 else Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
path=r/'assets/delivery/boss-loading-v1/library.json';m=json.loads(path.read_text());assert sha(r/m['sourceTool'])==m['sourceToolSha256']and sha(r/m['catalog']['path'])==m['catalog']['sha256'];clips={}
for p in m['inputLibraries']:
 assert sha(r/p['path'])==p['sha256']
 for e in json.loads((r/p['path']).read_text())['entries']:assert e['bossId']not in clips;clips[e['bossId']]=e
assert set(m['lazyBossIds']).isdisjoint(m['alwaysLoadedIds'])and set(m['lazyBossIds'])|set(m['alwaysLoadedIds'])==set(clips)
sizes={};results=[]
for id,e in clips.items():
 p=r/e['atlas'];assert sha(p)==e['atlasSha256'];im=Image.open(p);sizes[id]=im.width*im.height*4
for e in m['entries']:
 o=clips[e['bossId']];assert e['bossId']in m['lazyBossIds']and e['sourceAtlas']==o['atlas']and e['sourceAtlasSha256']==o['atlasSha256'];assert sha(r/e['reference'])==e['referenceSha256']
 source=Image.open(r/e['sourceAtlas']);target=Image.open(r/e['reference']);size=o['cellSize'];assert source.mode==target.mode=='RGBA'and target.size==(size,size)
 assert source.crop((0,0,size,size)).tobytes()==target.tobytes();assert e['sourceFrame']==0 and e['origin']==o['origin']and e['displayCell']==o['displayCell']
 assert e['sourceFullDecodedBytes']==sizes[e['bossId']]and e['referenceDecodedBytes']==size*size*4
 results.append({'bossId':e['bossId'],'exactWholeFirstFrame':True,'originAndWorldSizeUnchanged':True,'originalAtlasSha256':sha(r/e['sourceAtlas'])})
s=m['summary'];assert len(m['entries'])==len(m['lazyBossIds'])==57 and len(m['alwaysLoadedIds'])==8 and len(clips)==65
assert s['baselineDecodedBytes']==sum(sizes.values())and s['alwaysLoadedDecodedBytes']==sum(sizes[id]for id in m['alwaysLoadedIds'])
assert s['referenceDecodedBytes']==sum(e['referenceDecodedBytes']for e in m['entries'])and s['maximumTwoFullAtlasBytes']==sum(sorted([sizes[id]for id in m['lazyBossIds']],reverse=True)[:2])
assert s['startupDecodedBytes']==s['alwaysLoadedDecodedBytes']+s['referenceDecodedBytes']and s['maximumCachedDecodedBytes']==s['startupDecodedBytes']+s['maximumTwoFullAtlasBytes']
assert s['maximumCachedDecodedBytes']<s['baselineDecodedBytes']*.3
review=r/'reviews/boss-texture-loading-2026-10-25';review.mkdir(parents=True,exist_ok=True)
report={'passed':True,'manifestSha256':sha(path),'verifier':'tools/verify-boss-loading-references.py','verifierSha256':sha(Path(__file__)),'summary':s,'results':results,'allOriginalAtlasesUnchanged':True,'limits':m['limits']}
(review/'reference-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'passed':True,**s},indent=2))
