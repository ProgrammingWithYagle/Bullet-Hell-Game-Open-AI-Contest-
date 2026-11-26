"""Independently reconstruct complete reference cells and sample their exact world transform."""
from pathlib import Path
from PIL import Image
import hashlib,json
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();read=lambda p:json.loads(p.read_text(encoding='utf-8'))
path=ROOT/'assets/delivery/boss-loading-v3/library.json';m=read(path);previous=read(ROOT/m['previousManifest']['path'])
assert sha(ROOT/m['sourceTool'])==m['sourceToolSha256'] and sha(ROOT/m['previousManifest']['path'])==m['previousManifest']['sha256']
clips={}
for library in m['inputLibraries']:
    assert sha(ROOT/library['path'])==library['sha256']
    for clip in read(ROOT/library['path'])['entries']:clips[clip['bossId']]=clip
assert len(clips)==65 and len(m['entries'])==57 and len(m['settledReferences'])==7
sizes={}
for ident,clip in clips.items():
    assert sha(ROOT/clip['atlas'])==clip['atlasSha256'];atlas=Image.open(ROOT/clip['atlas']);assert atlas.mode=='RGBA';sizes[ident]=atlas.width*atlas.height*4
results=[]
for entry in m['entries']+m['settledReferences']:
    clip=clips[entry['bossId']];assert entry['sourceAtlas']==clip['atlas'] and entry['sourceAtlasSha256']==clip['atlasSha256'];assert entry['sourceCellSize']==clip['cellSize'] and entry['sourceOrigin']==clip['origin'] and entry['sourceDisplayCell']==clip['displayCell']
    atlas=Image.open(ROOT/entry['sourceAtlas']);cell=clip['cellSize'];columns=clip['columns'];n=entry['sourceFrame'];full=atlas.crop((n%columns*cell,n//columns*cell,(n%columns+1)*cell,(n//columns+1)*cell));data=np.array(full);rows,cols=np.nonzero(np.any(data!=0,axis=2));bounds=[int(cols.min()),int(rows.min()),int(cols.max()+1),int(rows.max()+1)];rect=[max(0,bounds[0]-16),max(0,bounds[1]-16),min(cell,bounds[2]+16),min(cell,bounds[3]+16)];assert rect==entry['sourceRect']
    crop=Image.open(ROOT/entry['reference']);assert crop.mode=='RGBA' and crop.size==(entry['referenceWidth'],entry['referenceHeight'])==(rect[2]-rect[0],rect[3]-rect[1]);assert sha(ROOT/entry['reference'])==entry['referenceSha256'];assert crop.tobytes()==full.crop(rect).tobytes()
    restored=Image.new('RGBA',(cell,cell));restored.paste(crop,rect[:2]);assert restored.tobytes()==full.tobytes();assert sha(ROOT/entry['previousReference']['path'])==entry['previousReference']['sha256'];assert Image.open(ROOT/entry['previousReference']['path']).tobytes()==full.tobytes()
    assert entry['referenceDecodedBytes']==crop.width*crop.height*4 and entry['sourceFullDecodedBytes']==sizes[entry['bossId']]
    for axis,length in [(0,crop.width),(1,crop.height)]:
        origin=(clip['origin'][axis]*cell-rect[axis])/length;display=clip['displayCell']*length/cell;assert origin==entry['origin'][axis];assert display==entry['displayWidth'if axis==0 else'displayHeight']
        for pixel in [0,length/2,length-1]:
            before=(pixel+rect[axis]-clip['origin'][axis]*cell)*clip['displayCell']/cell;after=(pixel-entry['origin'][axis]*length)*display/length;assert abs(before-after)<1e-10
    if entry in m['settledReferences']:
        assert n==clip['defeatStartFrame']+clip['defeatFrames']-1 and entry['defeatStartFrame']==clip['defeatStartFrame'] and entry['defeatFrames']==clip['defeatFrames']
    else:assert n==0
    results.append({'bossId':entry['bossId'],'sourceFrame':n,'oldCompleteRgbaCellReconstructed':True,'worldTransformUnchanged':True,'sourceCellSize':cell,'referenceSize':list(crop.size)})
s=m['summary'];fixed=sum(sizes[i]for i in m['alwaysLoadedIds']);main=sum(e['referenceDecodedBytes']for e in m['entries']);settled=sum(e['referenceDecodedBytes']for e in m['settledReferences']);two=sum(sorted([sizes[i]for i in m['lazyBossIds']],reverse=True)[:2]);baseline=sum(sizes.values())
for key,value in {'baselineDecodedBytes':baseline,'alwaysLoadedDecodedBytes':fixed,'mainReferenceDecodedBytes':main,'settledReferenceDecodedBytes':settled,'referenceDecodedBytes':main+settled,'startupDecodedBytes':fixed+main+settled,'maximumTwoFullAtlasBytes':two,'maximumCachedDecodedBytes':fixed+main+settled+two}.items():assert s[key]==value
assert s['previousReferenceDecodedBytes']==previous['summary']['referenceDecodedBytes'];assert abs(s['referenceReductionPercent']-100*(1-(main+settled)/s['previousReferenceDecodedBytes']))<1e-10;assert abs(s['cachedReductionPercent']-100*(1-s['maximumCachedDecodedBytes']/baseline))<1e-10
assert s['maximumCachedDecodedBytes']<100*1048576 and s['maximumCachedDecodedBytes']<baseline*.3
report={'passed':True,'verifier':'tools/verify-boss-loading-v3.py','verifierSha256':sha(Path(__file__)),'manifestSha256':sha(path),'identityReferences':57,'settledReferences':7,'results':results,'summary':s,'renderedAccepted':False,'limits':m['limits']}
(ROOT/'reviews/courier-actions-2026-10-25/loading-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'passed':True,'completeRgbaCrops':64,'startupMiB':s['startupDecodedBytes']/1048576,'maximumCachedMiB':s['maximumCachedDecodedBytes']/1048576,'referenceReductionPercent':s['referenceReductionPercent']}))
