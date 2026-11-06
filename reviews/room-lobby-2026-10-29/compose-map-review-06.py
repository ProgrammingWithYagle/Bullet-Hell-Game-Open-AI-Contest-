"""Static art layout; same source/target grid as the live nine-slice world and covers."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
root=Path.cwd();review=root/'reviews/room-lobby-2026-10-29/maps-06'
rows=json.loads((review/'layouts.json').read_text(encoding='utf8'))['rows']
out=root/'output/room-lobby-2026-10-29/map-compositions-06';out.mkdir(exist_ok=True)
sheet=Image.new('RGB',(2400,1656),'#0e221d');font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19);proofs=[]
def resize(image,w,h):return image.resize((max(1,round(w)),max(1,round(h))),Image.Resampling.LANCZOS)
for index,row in enumerate(rows):
    frame=Image.new('RGBA',(1600,1000),'#101e1b');b=row['bounds'];p=row['world']
    ground=resize(Image.open(root/row['groundImage']).convert('RGBA'),b['width'],b['height']);ground.putalpha(204)
    frame.alpha_composite(ground,(round(b['x']),round(b['y'])))
    if p:
        raw=Image.open(root/p['entry']['image']).convert('RGBA')
        for tile in row['worldTiles']:
            s=tile['source'];piece=raw.crop((s['x'],s['y'],s['x']+s['width'],s['y']+s['height']))
            if tile['flipX']:piece=piece.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if tile['flipY']:piece=piece.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            x,y=round(tile['x']),round(tile['y']);w,h=round(tile['x']+tile['width'])-x,round(tile['y']+tile['height'])-y
            piece=resize(piece,w,h);piece.putalpha(204);frame.alpha_composite(piece,(x,y))
    for cover in row['cover']:
        r,p,s=cover['rect'],cover['placement'],cover['surface'];raw=Image.open(root/s['image']).convert('RGBA')
        minor,major=round(min(r['width'],r['height'])),round(max(r['width'],r['height']));edge=round(p['cap']*p['scale'])
        body=Image.new('RGBA',(major,minor))
        for sx,sw,tx,tw in [(0,s['cap'],0,edge),(s['cap'],s['width']-2*s['cap'],edge,major-2*edge),(s['width']-s['cap'],s['cap'],major-edge,edge)]:
            body.alpha_composite(resize(raw.crop((sx,0,sx+sw,s['height'])),tw,minor),(tx,0))
        if r['height']>r['width']:body=body.transpose(Image.Transpose.ROTATE_270)
        frame.alpha_composite(body,(round(r['x']),round(r['y'])))
    lava=Image.open(root/row['lavaImage']).convert('RGBA')
    for pit in row['lavaPits']:
        frame.alpha_composite(resize(lava,pit['radius']*2,pit['radius']*2),(round(pit['x']-pit['radius']),round(pit['y']-pit['radius'])))
        ImageDraw.Draw(frame).ellipse((pit['x']-pit['radius'],pit['y']-pit['radius'],pit['x']+pit['radius'],pit['y']+pit['radius']),outline='#ffc36a',width=3)
    path=out/(row['id']+'-'+row['difficulty']+'.png');assert not path.exists();frame.convert('RGB').save(path)
    col,rr=index%6,index//6;sheet.paste(resize(frame.convert('RGB'),400,250),(col*400,rr*276+26))
    ImageDraw.Draw(sheet).text((col*400+8,rr*276+3),row['id']+' / '+row['difficulty'],font=font,fill='#e4d7b4')
    proofs.append(dict(id=row['id'],difficulty=row['difficulty'],path=path.relative_to(root).as_posix(),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
target=review/'contact-sheet.png';assert not target.exists();sheet.save(target)
(review/'composition-proof.json').write_text(json.dumps(dict(combinations=36,scope='Source geometry and native art composition, not a browser capture or human acceptance.',contactSheetSha256=hashlib.sha256(target.read_bytes()).hexdigest(),files=proofs),indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(passed=True,combinations=len(rows),contactSheet=str(target))))
