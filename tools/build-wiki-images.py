#!/usr/bin/env python3
"""Technical documentation thumbnails/contact sheets from existing game pixels and runtime geometry."""
from pathlib import Path
import argparse,datetime,hashlib,json,subprocess,textwrap
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'docs/wiki/images'
BG='#19372f';FG='#eee1c2';MUTED='#bacbb8';LINE='#536d59'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def font(size):
    for path in [Path('C:/Windows/Fonts/segoeui.ttf'),Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]:
        if path.exists():return ImageFont.truetype(str(path),size)
    return ImageFont.load_default(size=size)
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def main():
    args=argparse.ArgumentParser();args.add_argument('--node',default='node');arg=args.parse_args()
    OUT.mkdir(parents=True,exist_ok=True);catalog=read('content/catalog.json');sources={};files=[]
    def source(path):
        p=ROOT/path;sources[path]={'path':path,'sha256':sha(p)};return Image.open(p).convert('RGBA')
    def save(im,name,caption):
        p=OUT/name;im.convert('RGB').save(p,quality=90,optimize=True,subsampling=0)
        files.append({'path':'images/'+name,'sha256':sha(p),'bytes':p.stat().st_size,'width':im.width,'height':im.height,'caption':caption})
    def fit(im,w,h):
        im=im.copy();im.thumbnail((w,h),Image.Resampling.LANCZOS);return im
    cover=fit(source('assets/proofs/cover-v1.png'),1200,700);save(cover,'cover.jpg','Original Grave Accord cover illustration.')
    lineup=fit(source('assets/proofs/survivors-v3.png'),1400,600);save(lineup,'survivors.jpg','Seven original survivor identities; production reference, not a gameplay screenshot.')
    entries={}
    for p in sorted((ROOT/'assets/production/motion').glob('*library.json')):
        for e in json.loads(p.read_text(encoding='utf-8')).get('entries',[]):
            if e.get('bossId') in {b['id'] for b in catalog['bosses']}:entries[e['bossId']]=e
    entries['constable']={'atlas':'assets/proofs/animation/boss-attack-atlas.png','cellSize':512}
    entries['lantern-warden']={'atlas':'assets/production/motion/lantern-warden-idle-v1-atlas.png','cellSize':512}
    groups=[('short','Quarantine Run'),('standard','Midnight Circuit'),('long','Black Bell Pilgrimage'),('raid','Grand Raid'),('endless','Endless Vigil and The Uncounted')]
    used=[]
    for route,title in groups:
        bosses=[b for b in catalog['bosses'] if b['route']==route or (route=='endless' and b['secret'])]
        assert bosses
        im=Image.new('RGB',(1000,92+300*((len(bosses)+3)//4)),BG);d=ImageDraw.Draw(im)
        d.text((22,15),title,font=font(28),fill=FG)
        d.text((22,57),'Representative runtime sprite poses · original artwork · full action/facing work continues',font=font(15),fill=MUTED)
        for i,b in enumerate(bosses):
            e=entries[b['id']];atlas=source(e['atlas']);size=e['cellSize'];cell=atlas.crop((0,0,size,size));bbox=cell.getchannel('A').getbbox();assert bbox
            sprite=fit(cell.crop(bbox),220,205);x=(i%4)*250;y=92+(i//4)*300
            im.paste(sprite,(x+(250-sprite.width)//2,y+210-sprite.height),sprite)
            d.line((x+12,y+225,x+238,y+225),fill=LINE,width=1)
            for n,line in enumerate(textwrap.wrap(b['name'],23)):
                d.text((x+12,y+236+n*22),line,font=font(18),fill=FG)
            used.append({'id':b['id'],'atlas':e['atlas'],'frame':0,'cellSize':size,'gallery':'images/bosses-'+route+'.jpg'})
        save(im,'bosses-'+route+'.jpg',title+' boss identity gallery from current runtime atlases.')
    assert len(used)==60 and len({b['id'] for b in used})==60
    # Source geometry, not an invented map illustration or rendered capture.
    code="import {runtimeArenas} from './src/shared/arena-layouts.ts';process.stdout.write(JSON.stringify(runtimeArenas))"
    arenas=json.loads(subprocess.check_output([arg.node,'--import','tsx','--input-type=module','-e',code],cwd=ROOT,text=True,encoding='utf-8'))
    im=Image.new('RGB',(1260,820),BG);d=ImageDraw.Draw(im);d.text((20,14),'Six different playable map layouts',font=font(28),fill=FG)
    for i,a in enumerate(arenas):
        x=20+(i%3)*415;y=66+(i//3)*355;s=.245
        d.text((x,y),a['name'],font=font(21),fill=FG);d.text((x,y+31),f"{a['width']} × {a['height']}",font=font(16),fill=MUTED);y+=63
        d.rectangle((x,y,x+1600*s,y+1000*s),fill='#0f241f')
        b=a['bounds'];d.rectangle((x+b['x']*s,y+b['y']*s,x+(b['x']+b['width'])*s,y+(b['y']+b['height'])*s),fill=a['floor'],outline=FG,width=1)
        for o in a.get('cover',a['obstacles']):d.rectangle((x+o['x']*s,y+o['y']*s,x+(o['x']+o['width'])*s,y+(o['y']+o['height'])*s),fill='#8e8060',outline='#d6c6a0',width=1)
        for key,color in [('bossSpawn','#ee8270'),('playerSpawn','#9de3ce')]:
            p=a[key];cx=x+p['x']*s;cy=y+p['y']*s;d.ellipse((cx-5,cy-5,cx+5,cy+5),fill=color)
    d.text((20,785),'Same scale · Coral: boss spawn · Mint: survivor spawn · Diagram of actual collision geometry',font=font(17),fill=MUTED)
    save(im,'maps.jpg','Actual traversable footprints, cover and spawn geometry, drawn to one scale.')
    p=ROOT/'src/shared/arena-layouts.ts';sources['src/shared/arena-layouts.ts']={'path':'src/shared/arena-layouts.ts','sha256':sha(p)}
    # A readable representative selection from the implemented shops.
    choices=[('weapon',w['id'],w['name']) for w in catalog['weapons']]
    choices += [('supply',s['id'],s['name']) for s in catalog['supplies']]
    im=Image.new('RGB',(1120,80+150*((len(choices)+6)//7)),BG);d=ImageDraw.Draw(im);d.text((20,15),'Class weapons and carried supplies',font=font(28),fill=FG)
    for i,(kind,id,name) in enumerate(choices):
        p=f'assets/production/items/icons/{kind}/{id}.png';art=source(p);bbox=art.getchannel('A').getbbox();art=fit(art.crop(bbox),132,90);x=(i%7)*160;y=78+(i//7)*150
        im.paste(art,(x+(160-art.width)//2,y+90-art.height),art)
        for n,line in enumerate(textwrap.wrap(name,19)):d.text((x+8,y+100+n*18),line,font=font(13),fill=FG)
    save(im,'equipment.jpg','All twenty-eight class weapon icons and eight carried supplies, taken from the implemented shop art.')
    # Representative Tank action frames at one shared world scale, not gameplay captures.
    action_library_path='assets/production/motion/survivor-actions/library.json'
    action_library=read(action_library_path)
    sources[action_library_path]={'path':action_library_path,'sha256':sha(ROOT/action_library_path)}
    action_selections=[]
    for identity in sorted({entry['classId'] for entry in action_library['entries']}):
        im=Image.new('RGB',(1120,1030),BG);d=ImageDraw.Draw(im)
        d.text((20,15),identity.title()+': four directions and five new actions',font=font(28),fill=FG)
        d.text((20,55),'Representative drawn poses at one scale · Full clips: 88 new poses · Engine transition review pending',font=font(16),fill=MUTED)
        for row,(action,frame_index) in enumerate([('idle',0),('attack',1),('hurt',0),('dash',3),('downed',5)]):
            for col,direction in enumerate(['south','east','north','west']):
                entry=next(e for e in action_library['entries']if e['id']==f'{identity}-{action}-{direction}')
                atlas=source(entry['atlas']);size=entry['cellSize'];columns=entry['columns']
                x=col*280;y=92+row*180
                d.text((x+12,y),action.title()+' · '+direction.title(),font=font(18),fill=FG)
                tile=atlas.crop((frame_index%columns*size,frame_index//columns*size,(frame_index%columns+1)*size,(frame_index//columns+1)*size))
                span=round(entry['displayCell']*2.2);sprite=tile.resize((span,span),Image.Resampling.LANCZOS)
                im.paste(sprite,(round(x+140-span*.5),round(y+158-span*entry['origin'][1])),sprite)
                action_selections.append({'id':entry['id'],'atlas':entry['atlas'],'frame':frame_index,'cellSize':size,'gallery':'images/'+identity+'-actions.jpg'})
        d.text((20,1000),'Native pixels retained; shared scale and foot origin. Existing runs remain separate. No game capture claimed.',font=font(16),fill=MUTED)
        save(im,identity+'-actions.jpg',identity.title()+' action reference: idle, primary attack, hurt, dash and downed in four independently drawn facings. Representative frames, not a game capture.')
    # Full Constable clips at one shared world scale; no gameplay capture is implied.
    constable_path='assets/production/motion/constable-library.json'
    constable=read(constable_path);sources[constable_path]={'path':constable_path,'sha256':sha(ROOT/constable_path)}
    im=Image.new('RGB',(1120,1952),BG);d=ImageDraw.Draw(im)
    d.text((20,15),'Hollow Constable: five action states',font=font(28),fill=FG)
    d.text((20,55),'27 complete poses at one world scale - sprite reference, not a game capture',font=font(16),fill=MUTED)
    constable_selections=[];row_start=0
    for action in ['idle','attack','hurt','stagger','defeat']:
        entry=constable['clips'][action];atlas=source(entry['atlas']);size=entry['cellSize'];columns=entry['columns']
        for n in range(entry['frames']):
            x=(n%4)*280;y=96+(row_start+n//4)*260
            d.text((x+12,y),action.title()+' '+str(n+1)+'/'+str(entry['frames']),font=font(18),fill=FG)
            tile=atlas.crop((n%columns*size,n//columns*size,(n%columns+1)*size,(n//columns+1)*size))
            span=round(entry['displayCell']*.8);sprite=tile.resize((span,span),Image.Resampling.LANCZOS)
            im.paste(sprite,(round(x+140-span*entry['origin'][0]),round(y+240-span*entry['origin'][1])),sprite)
            constable_selections.append({'id':entry['id'],'atlas':entry['atlas'],'frame':n,'cellSize':size,'worldScale':.8,'gallery':'images/constable-motion.jpg'})
        row_start+=(entry['frames']+3)//4
    assert row_start==7 and len(constable_selections)==27
    d.text((20,1920),'Original attack retained. Complete collapse stays naturally low and wide. Rendered transition review remains open.',font=font(15),fill=MUTED)
    save(im,'constable-motion.jpg','All twenty-seven Constable idle, attack, hurt, stagger and defeat poses at one world scale. Sprite reference, not a gameplay capture.')
    ground_reference=read('reviews/arena-ground-2026-10-25/ground-layout-reference.json')
    assert sha(ROOT/ground_reference['image'])==ground_reference['imageSha256']
    assert sha(ROOT/ground_reference['sourceLibrary'])==ground_reference['sourceLibrarySha256']
    assert sha(ROOT/ground_reference['geometrySnapshot'])==ground_reference['geometrySnapshotSha256']
    save(source(ground_reference['image']).convert('RGB'),'arena-ground.jpg','Six arena ground paintings with actual footprint, cover and spawn geometry at one scale. Static artwork reference, not a game capture.')
    for path in ['reviews/arena-ground-2026-10-25/ground-layout-reference.json',ground_reference['sourceLibrary'],ground_reference['geometrySnapshot'],'tools/build-arena-ground-reference.py']:
        sources[path]={'path':path,'sha256':sha(ROOT/path)}
    figure_receipt=read('reviews/performance/endurance-50-moths-20261024-2-figure-v2.json')
    assert sha(ROOT/figure_receipt['figure'])==figure_receipt['figureSha256']
    assert sha(ROOT/figure_receipt['source'])==figure_receipt['sourceSha256']
    save(source(figure_receipt['figure']).convert('RGB'),'endurance-50-clients.jpg','Actual one-hour frozen-source local combat timings and observed process heaps; fifty scripted clients, zero rendered clients.')
    for p in ['reviews/performance/endurance-50-moths-20261024-2-figure-v2.json',figure_receipt['source'],'tools/build-endurance-figure.py']:
        sources[p]={'path':p,'sha256':sha(ROOT/p)}
    manifest={'schemaVersion':1,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceTool':'tools/build-wiki-images.py','sourceToolSha256':sha(Path(__file__)),'method':'Technical representative-frame crop, proportional resize and documentation contact-sheet composition; source artwork unchanged. Map is directly derived from runtime geometry. Survivor action frames retain one shared world scale. Endurance chart is a standard Matplotlib plot of immutable raw measurements.','bosses':used,'survivorActions':action_selections,'constableMotion':constable_selections,'sources':list(sources.values()),'files':files,'limits':['Contact sheets and geometry diagrams are documentation, not new rendered gameplay or full animation acceptance.','Text labels are English, matching the Wiki editorial language.']}
    (ROOT/'docs/wiki-images.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'images':len(files),'bosses':60,'bytes':sum(f['bytes'] for f in files)},indent=2))
if __name__=='__main__':main()
