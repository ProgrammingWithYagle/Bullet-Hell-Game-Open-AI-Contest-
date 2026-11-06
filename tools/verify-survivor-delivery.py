"""Independent per-pixel delivery reconstruction, density and exact source-contract checks."""
from pathlib import Path
from PIL import Image
import hashlib,json,math,sys
r=Path(sys.argv[1]).resolve()if len(sys.argv)>1 else Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
path=r/'assets/delivery/survivor-motion-v1/library.json';m=json.loads(path.read_text());assert m['policy']['minimumPixelsPerDisplayedPixel']==2 and sha(r/m['sourceTool'])==m['sourceToolSha256'];original={}
for item in m['inputLibraries']:
 assert sha(r/item['path'])==item['sha256']
 for e in json.loads((r/item['path']).read_text())['entries']:assert e['id']not in original;original[e['id']]=e
assert len(original)==len(m['entries'])==168 and set(original)=={e['id']for e in m['entries']}
before=after=png_before=png_after=0;results=[]
for e in m['entries']:
 o=original[e['id']];assert e['source']==o['atlas']and sha(r/e['source'])==e['sourceSha256']==o['atlasSha256'];assert sha(r/e['atlas'])==e['atlasSha256']
 for field in ['frames','fps','columns','origin','displayCell']:assert e[field]==o[field]
 size=o['cellSize'];target=e['cellSize'];assert e['sourceCellSize']==size
 assert target==min(size,max(128,math.ceil(2*o['displayCell']/32)*32))and 0<target<=size
 assert target/o['displayCell']>=min(2,size/o['displayCell'])
 source=Image.open(r/e['source']);delivery=Image.open(r/e['atlas']);assert source.mode==delivery.mode=='RGBA'
 rows=math.ceil(o['frames']/o['columns']);assert source.width==o['columns']*size and source.height>=rows*size and source.height%size==0 and delivery.size==(o['columns']*target,rows*target)
 assert e['sourceStoredFrames']==source.width//size*(source.height//size)and e['excludedSourceFrames']==e['sourceStoredFrames']-e['frames']
 for n in range(o['columns']*rows):
  x=n%o['columns'];y=n//o['columns'];src=source.crop((x*size,y*size,(x+1)*size,(y+1)*size));dst=delivery.crop((x*target,y*target,(x+1)*target,(y+1)*target))
  expected=Image.new('RGBA',(target,target))if n>=o['frames']else src if size==target else src.resize((target,target),Image.Resampling.LANCZOS)
  assert expected.tobytes()==dst.tobytes(),'Delivery RGBA differs from complete unflipped cell resampling: '+e['id']
  if n<o['frames']:assert dst.getchannel('A').getbbox()
 assert source.width*source.height*4==e['sourceDecodedBytes']and delivery.width*delivery.height*4==e['deliveryDecodedBytes']
 assert (r/e['source']).stat().st_size==e['sourcePngBytes']and(r/e['atlas']).stat().st_size==e['deliveryPngBytes']
 if size==target and source.size==delivery.size:assert(r/e['source']).read_bytes()==(r/e['atlas']).read_bytes()
 before+=e['sourceDecodedBytes'];after+=e['deliveryDecodedBytes'];png_before+=e['sourcePngBytes'];png_after+=e['deliveryPngBytes'];results.append({'id':e['id'],'frames':e['frames'],'cellSize':target,'pixelDensity':e['pixelDensity'],'exactUnflippedCellReconstruction':True,'worldDisplayAndOriginPreserved':True})
s=m['summary'];assert s['sourceDecodedBytes']==before and s['deliveryDecodedBytes']==after and s['sourcePngBytes']==png_before and s['deliveryPngBytes']==png_after and s['selectedPoses']==820 and after<before*.6
report={'passed':True,'manifest':path.relative_to(r).as_posix(),'manifestSha256':sha(path),'verifier':'tools/verify-survivor-delivery.py','verifierSha256':sha(Path(__file__)),'summary':s,'allProductionAtlasesAndContractsUnchanged':True,'completeCellRgbaReconstruction':True,'minimumDisplayPixelDensity':min(e['pixelDensity']for e in m['entries']),'results':results,'limits':m['limits']}
(r/'reviews/survivor-texture-delivery-2026-10-25/reconstruction.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'passed':True,**s},indent=2))
