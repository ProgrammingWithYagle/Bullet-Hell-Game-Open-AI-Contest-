"""Representative complete poses from actual atlases, composited at one world scale."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import hashlib,json
ROOT=Path(__file__).resolve().parents[1];review=ROOT/'reviews/opening-defeats-2026-10-25';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
library=json.loads((ROOT/'assets/production/motion/opening-defeats-library.json').read_text(encoding='utf-8'));catalog=json.loads((ROOT/'content/catalog.json').read_text(encoding='utf-8'));names={b['id']:b['name']for b in catalog['bosses']}
def font(size):
 for path in ['C:/Windows/Fonts/segoeui.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
  if Path(path).exists():return ImageFont.truetype(path,size)
 return ImageFont.load_default(size=size)
image=Image.new('RGB',(1280,2230),'#19372f');draw=ImageDraw.Draw(image);draw.text((20,12),'Opening contracts: seven new defeat sequences',font=font(29),fill='#eee1c2');draw.text((20,54),'Four key poses per eight-frame clip, at one shared world scale - sprite reference, not a game capture',font=font(17),fill='#bacbb8');used=[]
for row,clip in enumerate(library['entries']):
 y=100+row*300;draw.text((14,y+4),names[clip['bossId']],font=font(23),fill='#eee1c2');atlas=Image.open(ROOT/clip['atlas']);assert sha(ROOT/clip['atlas'])==clip['atlasSha256'];size=clip['cellSize']
 for col,(frame,label)in enumerate([(8,'1 / Standing'),(11,'4 / Lowered'),(13,'6 / Falling'),(15,'8 / Settled')]):
  x=col*320;draw.text((x+14,y+38),label,font=font(16),fill='#bacbb8');tile=atlas.crop((frame%clip['columns']*size,frame//clip['columns']*size,(frame%clip['columns']+1)*size,(frame//clip['columns']+1)*size));span=round(clip['displayCell']);sprite=tile.resize((span,span),Image.Resampling.LANCZOS)
  image.paste(sprite,(round(x+160-span*clip['origin'][0]),round(y+275-span*clip['origin'][1])),sprite)
  used.append({'bossId':clip['bossId'],'atlas':clip['atlas'],'atlasSha256':clip['atlasSha256'],'frame':frame,'worldScale':1})
draw.text((20,2201),'56 new complete poses. Original live action pixels retained. Final rendered/device/human transition review remains open.',font=font(16),fill='#bacbb8')
path=review/'opening-defeats-reference.png';image.save(path)
receipt={'sourceTool':'tools/build-opening-defeat-reference.py','sourceToolSha256':sha(Path(__file__)),'sourceLibrary':'assets/production/motion/opening-defeats-library.json','sourceLibrarySha256':sha(ROOT/'assets/production/motion/opening-defeats-library.json'),'image':path.relative_to(ROOT).as_posix(),'imageSha256':sha(path),'poses':used,'renderedAccepted':False,'limits':['Representative native atlas poses at one world scale; not a game capture.','All eight poses per boss are preserved in production atlases and individual review contact sheets.']}
(review/'opening-defeats-reference.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'image':receipt['image'],'sha256':receipt['imageSha256'],'representativePoses':len(used)}))
