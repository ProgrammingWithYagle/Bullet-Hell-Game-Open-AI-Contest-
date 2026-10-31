"""Pack a complete four-pose strip with one upright-calibrated scale; preserve issued clips."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
review=ROOT/'reviews/constable-pressure-2026-10-25'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
write=lambda p,v:p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
provenance=json.loads((ROOT/'docs/constable-pressure-2026-10-25.json').read_text(encoding='utf-8'))
item=provenance['requests'][0]
source=ROOT/item['file']; assert sha(source)==item['sha256']
old=json.loads((ROOT/provenance['retainedContract']['path']).read_text(encoding='utf-8'))
assert sha(ROOT/provenance['retainedContract']['path'])==provenance['retainedContract']['sha256']
native=Image.open(source); assert native.mode=='RGBA'
alpha=np.array(native.getchannel('A')); counts=(alpha>0).sum(axis=0)
cuts=[0]
for n in range(1,4):
    expected=round(native.width*n/4); span=round(native.width/4*.3)
    candidates=[x for x in range(expected-span,expected+span) if counts[x]==0]
    assert candidates,'Regenerate the whole strip: a figure touches its neighbor'
    cuts.append(min(candidates,key=lambda x:abs(x-expected)))
cuts.append(native.width)
parts=[native.crop((cuts[n],0,cuts[n+1],native.height)) for n in range(4)]
visible=[p.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox() for p in parts]
scale=288/(visible[0][3]-visible[0][1]); size=448; pivot=[224,352]
atlas=Image.new('RGBA',(size*4,size)); records=[]
proof=Image.new('RGB',(1280,350),'#142e29'); draw=ImageDraw.Draw(proof)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
for n,(part,v) in enumerate(zip(parts,visible)):
    bounds=part.getchannel('A').getbbox(); a=np.array(part.getchannel('A'))
    low=a[v[3]-round((v[3]-v[1])*.1):v[3],v[0]:v[2]].copy(); low[low<16]=0
    weights=low.sum(axis=0).astype(float)
    anchor=[round(float(np.dot(np.arange(v[0],v[2])+.5,weights)/weights.sum())),v[3]]
    crop=part.crop(bounds); dims=[round(crop.width*scale),round(crop.height*scale)]
    offset=[pivot[0]-round((anchor[0]-bounds[0])*scale),pivot[1]-round((anchor[1]-bounds[1])*scale)]
    assert min(offset)>=16 and offset[0]+dims[0]<=size-16 and offset[1]+dims[1]<=size-16
    frame=Image.new('RGBA',(size,size)); frame.alpha_composite(crop.resize(dims,Image.Resampling.LANCZOS),offset)
    atlas.alpha_composite(frame,(n*size,0))
    record={'frame':n,'sourceRect':[cuts[n],0,cuts[n+1],native.height], 'sourceAlphaBounds':bounds,
        'sourceAlpha16Bounds':v,'sourceGroundAnchor':anchor,'uniformScale':scale,'offset':offset,
        'resizedCrop':dims,'targetGroundAnchor':pivot}
    records.append(record)
    display=old['clips']['idle']['displayCell']*size/384; sprite=frame.resize((round(display),round(display)),Image.Resampling.LANCZOS)
    x=round(n*320+160-display*pivot[0]/size); y=round(320-display*pivot[1]/size)
    proof.paste(sprite,(x,y),sprite); draw.line((n*320+140,320,n*320+180,320),fill='#729689')
    draw.text((n*320+12,12),f'Constable shuffle {n+1}/4',font=font,fill='#e7ddc3')
    draw.text((n*320+12,34),'World size / rendered review pending',font=font,fill='#9db5aa')
path=ROOT/'assets/production/motion/constable-shuffle-v1-atlas.png'; assert not path.exists(); atlas.save(path)
contact=review/'shuffle-contact-sheet.png'; proof.save(contact)
entry={**old['clips']['idle'],'id':'constable-shuffle','name':'Hollow Constable Shuffle','action':'shuffle',
    'source':item['file'],'sourceSha256':sha(source),'atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':sha(path),
    'cellSize':size,'origin':[pivot[0]/size,pivot[1]/size],'displayCell':display,
    'columns':4,'frames':4,'fps':6,'frameDurationsMs':[1000/6]*4,
    'status':'Complete native and world-size contact inspected; rendered and human motion review pending'}
contract={'schemaVersion':1,'bossId':'constable','retainedContract':provenance['retainedContract'],
    'clips':{'shuffle':entry},'entries':[entry],'sourceTool':'tools/pack-constable-shuffle.py',
    'sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False}
write(ROOT/'assets/production/motion/constable-shuffle-library.json',contract)
write(review/'shuffle-packing.json',{'sourceSize':native.size,'frames':records,'oneScaleAcrossClip':scale,
    'calibrationFrame':0,'calibrationHeight':288,'sourceRgbaPartitionExact':True,'creativePixelEditsPerformed':False,
    'alphaErasurePerformed':False,'facingsMirrored':False,'contactSheet':contact.relative_to(ROOT).as_posix(),
    'contactSheetSha256':sha(contact),'extraDecodedRgbaBytes':size*size*4*4,'renderedAccepted':False})
print(json.dumps({'passed':True,'newCompletePoses':4,'retainedPoses':27,'extraDecodedMiB':size*size*16/1048576}))
