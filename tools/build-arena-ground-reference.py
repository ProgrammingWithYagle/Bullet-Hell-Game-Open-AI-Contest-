"""Static artwork/geometry documentation; not a browser-rendered game capture."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import hashlib,json
ROOT=Path(__file__).resolve().parents[1];review=ROOT/'reviews/arena-ground-2026-10-25';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
library=json.loads((ROOT/'assets/production/arenas/library.json').read_text());arenas=json.loads((review/'runtime-arenas.json').read_text(encoding='utf-8-sig'))
def font(size):
 for path in ['C:/Windows/Fonts/segoeui.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
  if Path(path).exists():return ImageFont.truetype(path,size)
 return ImageFont.load_default(size=size)
im=Image.new('RGB',(1560,900),'#19372f');draw=ImageDraw.Draw(im);draw.text((20,12),'Six arena grounds: shared city, different materials',font=font(30),fill='#eee1c2');draw.text((20,54),'Original Gatehouse + five new paintings, with actual cover and spawn geometry at one scale',font=font(18),fill='#bacbb8')
sources=[]
for n,entry in enumerate(library['entries']):
 arena=next(a for a in arenas if a['id']==entry['id']);x=20+n%3*515;y=100+n//3*370;s=.29
 draw.text((x,y),arena['name'],font=font(23),fill='#eee1c2');draw.text((x,y+31),f"{arena['width']} × {arena['height']} world pixels",font=font(17),fill='#bacbb8');y+=65
 draw.rectangle((x,y,x+round(1600*s),y+round(1000*s)),fill='#101e1b')
 source=ROOT/entry['image'];assert sha(source)==entry['imageSha256'];tile=Image.open(source).convert('RGB');bounds=arena['bounds'];target=[round(bounds['width']*s),round(bounds['height']*s)]
 im.paste(tile.resize(target,Image.Resampling.LANCZOS),(x+round(bounds['x']*s),y+round(bounds['y']*s)))
 for cover in arena['cover']:
  draw.rectangle((x+round(cover['x']*s),y+round(cover['y']*s),x+round((cover['x']+cover['width'])*s),y+round((cover['y']+cover['height'])*s)),outline='#eee1c2',width=2)
 for key,color in [('bossSpawn','#ee8270'),('playerSpawn','#9de3ce')]:
  p=arena[key];cx=x+round(p['x']*s);cy=y+round(p['y']*s);draw.ellipse((cx-4,cy-4,cx+4,cy+4),fill=color,outline='#0f241f')
 sources.append({'arenaId':entry['id'],'image':entry['image'],'imageSha256':entry['imageSha256'],'worldBounds':bounds,'scale':s})
draw.text((20,860),'Cream outlines: solid cover · Coral: boss spawn · Mint: survivor spawn · Static material/geometry reference, not a game capture',font=font(17),fill='#bacbb8')
path=review/'ground-layout-reference.png';im.save(path)
receipt={'sourceTool':'tools/build-arena-ground-reference.py','sourceToolSha256':sha(Path(__file__)),'sourceLibrary':'assets/production/arenas/library.json','sourceLibrarySha256':sha(ROOT/'assets/production/arenas/library.json'),'geometrySnapshot':'reviews/arena-ground-2026-10-25/runtime-arenas.json','geometrySnapshotSha256':sha(review/'runtime-arenas.json'),'sources':sources,'image':path.relative_to(ROOT).as_posix(),'imageSha256':sha(path),'renderedAccepted':False,'limits':['Static documentation contact sheet from production artwork and actual geometry.','Image shows the opaque source paintings; gameplay uses its configured alpha/tint and independently placed props.','This does not establish in-engine readability, frame rate or human acceptance.']}
(review/'ground-layout-reference.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'image':receipt['image'],'sha256':receipt['imageSha256'],'maps':6,'renderedAccepted':False}))
