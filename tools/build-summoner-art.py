"""Normalize complete drawn figures only: crop, one sheet scale and anchor translation.

The retained natives have uneven gutters. No equal-quarter slicing, painted poses,
mirroring, skeletons or generated interpolation is used. Rendered acceptance is open.
"""
from pathlib import Path
from PIL import Image
import hashlib, io, json

ROOT = Path(__file__).resolve().parents[1]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read = lambda p: json.loads((ROOT / p).read_text(encoding='utf-8'))
crops = read('tools/summoner-art-crops.json')
facings = ['south', 'east', 'north', 'west']
pending = {}


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8', newline='\n')


def stage(path, image):
    stream = io.BytesIO()
    image.save(stream, format='PNG')
    data = stream.getvalue()
    if path.exists():
        assert path.read_bytes() == data, str(path)
    pending[path] = data
    return hashlib.sha256(data).hexdigest()


def bounds(image):
    return image.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()


def native(name):
    spec = crops[name]
    path = ROOT / spec['source']
    assert sha(path) == spec['sha256']
    im = Image.open(path)
    assert im.mode == 'RGBA' and list(im.size) == spec['size']
    return im, spec


def frame(image, rect, scale, floating=False):
    crop = image.crop(rect)
    v = bounds(crop)
    assert v
    if floating:
        anchor = [(v[0]+v[2])/2, (v[1]+v[3])/2]
    else:
        band = max(8, round((v[3]-v[1])*.06))
        feet = bounds(crop.crop((0, v[3]-band, crop.width, v[3])))
        assert feet
        anchor = [(feet[0]+feet[2])/2, v[3]]
    size = [round(crop.width*scale), round(crop.height*scale)]
    offset = [128-round(anchor[0]*scale), (128 if floating else 220)-round(anchor[1]*scale)]
    assert min(offset) >= 5 and offset[0]+size[0] <= 251 and offset[1]+size[1] <= 251, (rect, size, offset)
    result = Image.new('RGBA', (256, 256))
    result.alpha_composite(crop.resize(size, Image.Resampling.LANCZOS), offset)
    return result, {'sourceRect': rect, 'anchor': anchor, 'offset': offset, 'resizedCrop': size}


def extension(path, entries, key, ident):
    lib = read(path)
    lib['entries'] = [e for e in lib['entries'] if e[key] != ident] + entries
    write(ROOT/path, lib)


source, spec = native('joss-selection-v1')
v = bounds(source)
alpha = source.getchannel('A').getbbox()
scale = 576/(v[3]-v[1])
ground = [550, v[3]]
crop = source.crop(alpha)
size = [round(crop.width*scale), round(crop.height*scale)]
offset = [240-round((ground[0]-alpha[0])*scale), 608-round((ground[1]-alpha[1])*scale)]
assert min(offset) >= 8 and offset[0]+size[0] <= 472 and offset[1]+size[1] <= 632
portrait = Image.new('RGBA', (480,640))
portrait.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset)
path = ROOT/'assets/delivery/selection-portraits-v1/summoner-selection-v1.png'
portrait_entry = {'classId':'summoner','source':spec['source'],'sourceSha256':spec['sha256'],'sourceSize':spec['size'],'sourceAlphaBounds':list(alpha),'sourceAlpha16Bounds':list(v),'uniformScale':scale,'resizedCrop':size,'offset':offset,'bodyGroundAnchor':ground,'image':path.relative_to(ROOT).as_posix(),'imageSha256':stage(path,portrait),'imageSize':[480,640],'targetAlpha16Bounds':list(bounds(portrait)),'newPose':True,'sourceTool':'tools/build-summoner-art.py'}

references = []
seeds = {}
for ident, name in [('summoner','joss-four-view-v1'),('hound','hound-reference-v1'),('wing','wing-reference-v2'),('ward','ward-reference-v1')]:
    source,spec = native(name)
    rects = spec['rectangles']
    assert len(rects)==4
    floating = ident=='wing'
    extent = max((r[3]-r[1]) if ident=='summoner' else max(r[2]-r[0],r[3]-r[1]) for r in rects)
    scale = 150/extent
    atlas = Image.new('RGBA',(1024,256))
    details = []
    for row,(facing,rect) in enumerate(zip(facings,rects)):
        image,n = frame(source,rect,scale,floating)
        atlas.alpha_composite(image,(row*256,0))
        path = ROOT/f'assets/production/normalized/{"survivors" if ident=="summoner" else "retinue"}/{ident}/{facing}-seed-v1.png'
        stage(path,image)
        seeds[(ident,facing)] = (path,image)
        details.append(n)
    path = ROOT/f'assets/production/normalized/{"survivors" if ident=="summoner" else "retinue"}/{ident}/reference-atlas-v1.png'
    entry = {'id':ident,'name':ident,'family':'survivors' if ident=='summoner' else 'retinue','kind':'static-reference','atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':stage(path,atlas),'source':spec['source'],'sourceSha256':spec['sha256'],'cellSize':256,'columns':4,'frames':4,'labels':facings,'origin':[.5,.5 if floating else .859375],'displayCell':(56 if ident=='summoner' else {'hound':42,'wing':34,'ward':48}[ident])*256/150,'fps':0,'uniformScale':scale,'normalization':details,'status':'Drawn candidate; rendered and human review pending','sourceTool':'tools/build-summoner-art.py'}
    if ident=='summoner':
        path=path.parent/'portrait-south-v1.png';entry['portrait']=path.relative_to(ROOT).as_posix();entry['portraitSha256']=stage(path,source.crop(rects[0]));entry['displayHeight']=56
    references.append(entry)

runs, actions, pets = [], [], []
for ident in ['summoner','hound','wing','ward']:
    for action in ['idle','run','attack','hurt','dash','downed']:
        if ident!='summoner' and action=='dash':continue
        name = 'joss-'+action+'-v1' if ident=='summoner' else ident+('-reactions-v1' if action in ['hurt','downed'] else '-'+action+'-v1')
        if action=='idle':
            source=spec=None;scale=1;count=1
        else:
            source,spec=native(name);rects=spec['rectangles']
            count=4 if ident=='summoner' or action=='run' else 2
            expected=16 if action in ['hurt','downed'] or ident=='summoner' or action=='run' else 8
            assert len(rects)==expected,(ident,action,len(rects))
            if ident=='summoner':
                body={'run':295,'attack':305,'hurt':256,'dash':313,'downed':350}[action];scale=150/body
            else:scale=(190 if ident=='wing' and action=='attack' else 150)/max(max(r[2]-r[0],r[3]-r[1]) for r in rects)
        fps = {'idle':1,'run':8,'attack':12,'hurt':12,'dash':16,'downed':8}[action] if ident=='summoner' else {'idle':1,'run':8,'attack':10,'hurt':10,'downed':6}[action]
        for row,facing in enumerate(facings):
            atlas=Image.new('RGBA',(256*count,256));details=[]
            if action=='idle':
                source_path,image=seeds[(ident,facing)];atlas.alpha_composite(image,(0,0));source_spec={'source':source_path.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(pending[source_path]).hexdigest()}
            else:
                source_spec=spec
                for col in range(count):
                    index=row*count+col
                    if ident!='summoner' and action in ['hurt','downed']:index=row*4+col+(2 if action=='downed' else 0)
                    image,n=frame(source,rects[index],scale,ident=='wing');atlas.alpha_composite(image,(col*256,0));details.append(n)
            clip_id=(ident if ident=='summoner' else 'retinue-'+ident)+'-'+action+'-'+facing
            folder='summoner' if ident=='summoner' else 'retinue'
            path=ROOT/f'assets/production/motion/{folder}/{clip_id}-v1-atlas.png'
            entry={'id':clip_id,('classId' if ident=='summoner' else 'entityKind'):ident,'action':action,'direction':facing,'source':source_spec['source'],'sourceSha256':source_spec['sha256'],'atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':stage(path,atlas),'cellSize':256,'columns':count,'frames':count,'fps':fps,'origin':[.5,.5 if ident=='wing' else .859375],'displayCell':(56 if ident=='summoner' else {'hound':42,'wing':34,'ward':48}[ident])*256/150,'uniformScale':scale,'normalization':details,'renderedAccepted':False}
            (runs if ident=='summoner' and action=='run' else actions if ident=='summoner' else pets).append(entry)

icons=[]
for name,ids in [('summoner-items-v1',[('weapon','summoner-'+str(i)) for i in range(4)]+[('skill',branch+suffix) for branch in ['beaconwork','bonds','waykeeping'] for suffix in ['-foundation','-path-1','-path-2']]),('summoner-gear-v1',[('upgrade','summoner-'+i) for i in ['clear-beacon','quick-loop','deep-spool','ready-ties']]+[('supply','summoner-thread-spool')])]:
    source,spec=native(name);assert len(ids)==len(spec['rectangles'])
    for (kind,ident),rect in zip(ids,spec['rectangles']):
        crop=source.crop(rect);scale=224/max(crop.size);size=[round(crop.width*scale),round(crop.height*scale)];offset=[(256-size[0])//2,(256-size[1])//2];image=Image.new('RGBA',(256,256));image.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset);path=ROOT/f'assets/production/items/icons/{kind}/{ident}.png'
        icons.append({'id':kind+'-'+ident,'itemId':ident,'itemKind':kind,'name':ident,'family':'items','kind':'item','atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':stage(path,image),'source':spec['source'],'sourceSha256':spec['sha256'],'sourceRect':rect,'uniformScale':scale,'size':size,'offset':offset,'cellSize':256,'columns':1,'frames':1,'labels':[ident],'origin':[.5,.5],'displayHeight':64,'displayCell':64,'fps':0,'status':'Drawn candidate; rendered and human review pending'})
        if ident=='summoner-thread-spool':stage(ROOT/'assets/production/ui/resources/summoner-focus-v1.png',image)

# All geometry validates before admitting any new image bytes.
for path,data in pending.items():path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
extension('assets/production/normalized/library.json',[references[0]],'id','summoner')
write(ROOT/'assets/production/normalized/retinue/library.json',{'schemaVersion':1,'entries':references[1:],'renderedAccepted':False})
extension('assets/delivery/selection-portraits-v1/library.json',[portrait_entry],'classId','summoner')
lib=read('assets/production/items/library.json');ids={e['id'] for e in icons};lib['entries']=[e for e in lib['entries'] if e['id'] not in ids]+icons;write(ROOT/'assets/production/items/library.json',lib)
for name,entries in [('summoner-library',runs),('summoner-actions/library',actions),('retinue/library',pets)]:
    write(ROOT/('assets/production/motion/'+name+'.json'),{'schemaVersion':1,'entries':entries,'sourceTool':'tools/build-summoner-art.py','sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False})

def delivered(entries,folder):
    result=[]
    for e in entries:
        source=ROOT/e['atlas'];path=ROOT/f'assets/delivery/{folder}/{e["id"]}-v1-atlas.png';path.parent.mkdir(parents=True,exist_ok=True)
        if path.exists():assert path.read_bytes()==source.read_bytes()
        else:path.write_bytes(source.read_bytes())
        result.append({'id':e['id'],'source':e['atlas'],'sourceSha256':sha(source),'sourceCellSize':256,'sourceColumns':e['columns'],'sourceFrames':e['frames'],'sourcePngBytes':source.stat().st_size,'sourceDecodedBytes':e['frames']*256*256*4,'atlas':path.relative_to(ROOT).as_posix(),'atlasSha256':sha(path),'cellSize':256,'columns':e['columns'],'frames':e['frames'],'fps':e['fps'],'origin':e['origin'],'displayCell':e['displayCell'],'uniformScale':1,'deliveryPngBytes':path.stat().st_size,'deliveryDecodedBytes':e['frames']*256*256*4,'pixelDensity':256/e['displayCell'],'excludedSourceFrames':0,'operation':'Exact PNG copy of normalized drawn Summoner candidate'})
    return result

new=delivered(runs+actions,'survivor-motion-v1');lib=read('assets/delivery/survivor-motion-v1/library.json');ids={e['id'] for e in new};lib['entries']=[e for e in lib['entries'] if e['id'] not in ids]+new
inputs=['assets/production/motion/summoner-library.json','assets/production/motion/summoner-actions/library.json'];lib['inputLibraries']=[e for e in lib['inputLibraries'] if e['path'] not in inputs]+[{'path':p,'sha256':sha(ROOT/p)} for p in inputs]
before=sum(e['sourceDecodedBytes'] for e in lib['entries']);after=sum(e['deliveryDecodedBytes'] for e in lib['entries']);lib['summary']={'atlases':len(lib['entries']),'selectedPoses':sum(e['frames'] for e in lib['entries']),'sourceDecodedBytes':before,'deliveryDecodedBytes':after,'decodedBytesSaved':before-after,'decodedReductionPercent':100*(1-after/before),'sourcePngBytes':sum(e['sourcePngBytes'] for e in lib['entries']),'deliveryPngBytes':sum(e['deliveryPngBytes'] for e in lib['entries'])};write(ROOT/'assets/delivery/survivor-motion-v1/library.json',lib)
new=delivered(pets,'retinue-motion-v1');write(ROOT/'assets/delivery/retinue-motion-v1/library.json',{'schemaVersion':1,'entries':new,'inputLibraries':[{'path':'assets/production/motion/retinue/library.json','sha256':sha(ROOT/'assets/production/motion/retinue/library.json')}],'sourceTool':'tools/build-summoner-art.py','sourceToolSha256':sha(Path(__file__)),'renderedAccepted':False})
print(json.dumps({'survivorClips':len(runs+actions),'survivorPoses':sum(e['frames'] for e in runs+actions),'companionClips':len(pets),'companionPoses':sum(e['frames'] for e in pets),'itemIcons':len(icons),'renderedAccepted':False}))
