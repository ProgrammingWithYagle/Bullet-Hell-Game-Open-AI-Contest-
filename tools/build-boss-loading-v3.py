"""Tight complete identity crops with exact original world geometry and one current atlas per boss."""
from pathlib import Path
from PIL import Image
import hashlib,io,json
ROOT=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
previous_path='assets/delivery/boss-loading-v2/library.json';previous=read(ROOT/previous_path)
extra_path='assets/production/motion/courier-library.json'
libraries=[e['path']for e in previous['inputLibraries']]+[extra_path];clips={}
for p in libraries:
    for clip in read(ROOT/p)['entries']:clips[clip['bossId']]=clip
assert len(clips)==65
out=ROOT/'assets/delivery/boss-loading-v3';out.mkdir(exist_ok=True)
def preserve(path,data):
    if path.exists():assert path.read_bytes()==data,'Preserve issued output: '+str(path)
    else:path.write_bytes(data)
sizes={}
for ident,clip in clips.items():
    path=ROOT/clip['atlas'];assert sha(path)==clip['atlasSha256'];image=Image.open(path);assert image.mode=='RGBA';sizes[ident]=image.width*image.height*4
def trim(old,settled):
    clip=clips[old['bossId']];atlas=Image.open(ROOT/clip['atlas']);cell=clip['cellSize'];n=old['sourceFrame'];columns=clip['columns'];full=atlas.crop((n%columns*cell,n//columns*cell,(n%columns+1)*cell,(n//columns+1)*cell))
    assert full.tobytes()==Image.open(ROOT/old['reference']).tobytes(),'Previously issued reference pixels changed'
    assert old['sourceCellSize']==cell and old['origin']==clip['origin'] and old['displayCell']==clip['displayCell']
    # Include every nonzero RGBA channel, including hidden RGB, so an inverse paste reconstructs the full original cell.
    bounds=full.getbbox(alpha_only=False);assert bounds
    pad=16;rect=[max(0,bounds[0]-pad),max(0,bounds[1]-pad),min(cell,bounds[2]+pad),min(cell,bounds[3]+pad)]
    crop=full.crop(rect);width,height=crop.size;restored=Image.new('RGBA',(cell,cell));restored.paste(crop,rect[:2]);assert restored.tobytes()==full.tobytes()
    suffix='defeat-reference-v2'if settled else'reference-v3';target=out/(old['bossId']+'-'+suffix+'.png');buffer=io.BytesIO();crop.save(buffer,format='PNG');preserve(target,buffer.getvalue())
    entry={'bossId':old['bossId'],'sourceAtlas':clip['atlas'],'sourceAtlasSha256':clip['atlasSha256'],'sourceFrame':n,'sourceCellSize':cell,'sourceRect':rect,'sourceOrigin':clip['origin'],'sourceDisplayCell':clip['displayCell'],'sourceFullDecodedBytes':sizes[old['bossId']],
           'previousReference':{'path':old['reference'],'sha256':old['referenceSha256']},'reference':target.relative_to(ROOT).as_posix(),'referenceSha256':sha(target),'referenceWidth':width,'referenceHeight':height,'referenceDecodedBytes':width*height*4,'referencePngBytes':target.stat().st_size,
           'origin':[(clip['origin'][0]*cell-rect[0])/width,(clip['origin'][1]*cell-rect[1])/height],'displayWidth':clip['displayCell']*width/cell,'displayHeight':clip['displayCell']*height/cell}
    if settled:entry.update({'defeatStartFrame':clip['defeatStartFrame'],'defeatFrames':clip['defeatFrames']})
    return entry
entries=[trim(e,False)for e in previous['entries']];settled=[trim(e,True)for e in previous['settledReferences']]
baseline=sum(sizes.values());fixed=sum(sizes[i]for i in previous['alwaysLoadedIds']);main=sum(e['referenceDecodedBytes']for e in entries);final=sum(e['referenceDecodedBytes']for e in settled);two=sum(sorted([sizes[i]for i in previous['lazyBossIds']],reverse=True)[:2]);startup=fixed+main+final;maximum=startup+two
summary={'encounterAtlases':65,'alwaysLoadedAtlases':8,'lazyAtlases':57,'mainReferences':57,'settledReferences':7,'baselineDecodedBytes':baseline,'alwaysLoadedDecodedBytes':fixed,'mainReferenceDecodedBytes':main,'settledReferenceDecodedBytes':final,'referenceDecodedBytes':main+final,'startupDecodedBytes':startup,'maximumTwoFullAtlasBytes':two,'maximumCachedDecodedBytes':maximum,'cachedReductionPercent':100*(1-maximum/baseline),'referencePngBytes':sum(e['referencePngBytes']for e in entries+settled),'previousReferenceDecodedBytes':previous['summary']['referenceDecodedBytes'],'referenceReductionPercent':100*(1-(main+final)/previous['summary']['referenceDecodedBytes'])}
manifest={'schemaVersion':3,'sourceTool':'tools/build-boss-loading-v3.py','sourceToolSha256':sha(Path(__file__)),'previousManifest':{'path':previous_path,'sha256':sha(ROOT/previous_path)},'inputLibraries':[{'path':p,'sha256':sha(ROOT/p)}for p in libraries],'catalog':previous['catalog'],'alwaysLoadedIds':previous['alwaysLoadedIds'],'lazyBossIds':previous['lazyBossIds'],'entries':entries,'settledReferences':settled,'summary':summary,
          'limits':['Exact dimension-derived RGBA subtotals for the encounter set, excluding Constable, Warden, survivor, arena and other textures, browser/CPU/staging/mipmap/driver allocations and device FPS.',
                    'Complete RGBA reference crops include a sixteen-pixel gutter. Inverse pasting reconstructs every original source-cell channel exactly.',
                    'Cropped texture origins and display width/height preserve the original world transform. They must be applied on initial fallback and before full texture eviction.',
                    'Only authoritative current/recent full atlases load, with two retained and one in flight. Future concealed schedules are not prefetched.']}
assert len(entries)==57 and len(settled)==7 and maximum<100*1048576 and maximum<baseline*.3
preserve(out/'library.json',(json.dumps(manifest,indent=2)+'\n').encode('utf-8'))
print(json.dumps(summary,indent=2))
