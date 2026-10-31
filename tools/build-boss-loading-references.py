"""Extract exact first-frame identities for bounded runtime boss atlas loading."""
from pathlib import Path
from PIL import Image
import hashlib,io,json,sys
r=Path(sys.argv[1]).resolve()if len(sys.argv)>1 else Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
libraries=[f'assets/production/motion/{n}-library.json'for n in ['encounter','civic','service','district','raid','endless']]
catalog=json.loads((r/'content/catalog.json').read_text());boss_ids={e['id']for e in catalog['bosses']};clips=[e for p in libraries for e in json.loads((r/p).read_text())['entries']]
assert len(clips)==65 and len({e['bossId']for e in clips})==65
# Regent also represents a historical civic figure in other directors, so its full atlas stays available.
dynamic=[e for e in clips if e['bossId']in boss_ids and e['bossId']!='regent'];support=[e for e in clips if e not in dynamic];assert len(dynamic)==57 and len(support)==8
out=r/'assets/delivery/boss-loading-v1';out.mkdir(parents=True,exist_ok=True);entries=[];all_sizes={}
def preserve(path,data):
 if path.exists():assert path.read_bytes()==data,'Preserve issued output and create a new version: '+str(path)
 else:path.write_bytes(data)
for e in clips:
 p=r/e['atlas'];assert sha(p)==e['atlasSha256'];im=Image.open(p);assert im.mode=='RGBA';all_sizes[e['bossId']]=im.width*im.height*4
 if e not in dynamic:continue
 size=e['cellSize'];reference=im.crop((0,0,size,size));assert reference.getchannel('A').getbbox()
 target=out/(e['bossId']+'-reference-v1.png');buffer=io.BytesIO();reference.save(buffer,format='PNG');preserve(target,buffer.getvalue())
 entries.append({'bossId':e['bossId'],'sourceAtlas':e['atlas'],'sourceAtlasSha256':sha(p),'sourceFrame':0,'sourceCellSize':size,'sourceFullDecodedBytes':all_sizes[e['bossId']],'reference':target.relative_to(r).as_posix(),'referenceSha256':sha(target),'referenceDecodedBytes':size*size*4,'referencePngBytes':target.stat().st_size,'origin':e['origin'],'displayCell':e['displayCell']})
baseline=sum(all_sizes.values());fixed=sum(all_sizes[e['bossId']]for e in support);refs=sum(e['referenceDecodedBytes']for e in entries);two=sum(sorted([e['sourceFullDecodedBytes']for e in entries],reverse=True)[:2])
m={'schemaVersion':1,'sourceTool':'tools/build-boss-loading-references.py','sourceToolSha256':sha(Path(__file__)),'inputLibraries':[{'path':p,'sha256':sha(r/p)}for p in libraries],'catalog':{'path':'content/catalog.json','sha256':sha(r/'content/catalog.json')},'alwaysLoadedIds':[e['bossId']for e in support],'lazyBossIds':[e['bossId']for e in dynamic],'entries':entries,'summary':{'encounterAtlases':len(clips),'alwaysLoadedAtlases':len(support),'lazyAtlases':len(dynamic),'baselineDecodedBytes':baseline,'alwaysLoadedDecodedBytes':fixed,'referenceDecodedBytes':refs,'startupDecodedBytes':fixed+refs,'maximumTwoFullAtlasBytes':two,'maximumCachedDecodedBytes':fixed+refs+two,'cachedReductionPercent':100*(1-(fixed+refs+two)/baseline),'referencePngBytes':sum(e['referencePngBytes']for e in entries)},'limits':['Exact PNG dimensions imply decoded RGBA storage; GPU/driver/CPU cache allocations and device FPS are not measured.','Constable, Warden, survivor, environment and other textures are outside this encounter-set subtotal.','Only the current replicated boss is requested; future concealed schedules are not prefetched.','Reference images are exact complete first-frame crops, not new character art or rendered acceptance.']}
preserve(out/'library.json',(json.dumps(m,indent=2)+'\n').encode());print(json.dumps(m['summary'],indent=2))
