"""Independent saved-source and per-frame RGBA verification, without engine claims."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads((ROOT/p).read_text(encoding='utf8'))
doc=load('docs/quarantine-art-2026-10-23.json');report=load('reviews/quarantine-expansion-2026-10-23/packing.json');library=load('assets/production/motion/civic-library.json');hashes=[]
for job in doc['requests']:assert sha(ROOT/job['file'])==job['sha256']
for entry in report['entries']:
 source=Image.open(ROOT/entry['source']);actual=Image.open(ROOT/entry['atlas']);assert sha(ROOT/entry['atlas'])==entry['atlasSha256']
 if 'frames' not in entry:
  expected=Image.new('RGBA',actual.size);expected.alpha_composite(source.crop(entry['sourceAlphaBounds']).resize(tuple(entry['size']),Image.Resampling.LANCZOS),tuple(entry['offset']));assert expected.tobytes()==actual.tobytes();continue
 clip=next(c for c in library['entries'] if c['id']==entry['id']);size=clip['cellSize'];rebuilt=Image.new('RGBA',source.size);expected=Image.new('RGBA',actual.size);scales=set()
 for rect in entry['rectangles']:rebuilt.paste(source.crop(rect),rect[:2])
 assert rebuilt.tobytes()==source.tobytes()
 for i,frame in enumerate(entry['frames']):
  pixels=source.crop(frame['sourceRect']).crop(frame['sourceAlphaBounds']);target=Image.new('RGBA',(size,size));target.alpha_composite(pixels.resize(tuple(frame['size']),Image.Resampling.LANCZOS),tuple(frame['offset']));expected.paste(target,(i%4*size,i//4*size));hashes.append(hashlib.sha256(target.tobytes()).hexdigest());scales.add(frame['uniformScale'])
  visible=target.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox();assert min(visible[0],visible[1],size-visible[2],size-visible[3])>=10
 assert len(scales)==1;assert expected.tobytes()==actual.tobytes()
assert len(set(hashes))==32
proof=Image.new('RGB',(960,1100),'#18352f');draw=ImageDraw.Draw(proof);font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',16)
for row,clip in enumerate(library['entries']):
 atlas=Image.open(ROOT/clip['atlas']);size=clip['cellSize']
 for col,index in enumerate([0,2,4,7]):
  frame=atlas.crop((index%4*size,index//4*size,(index%4+1)*size,(index//4+1)*size));frame.thumbnail((240,240));proof.paste(frame,(col*240,row*275),frame)
 draw.text((10,row*275+245),clip['bossId']+' / neutral · tell · release · recover',font=font,fill='#ded6ba')
folder=ROOT/'reviews/quarantine-expansion-2026-10-23';proof.save(folder/'motion-size-proof.png')
result={'schemaVersion':1,'passed':True,'nativeRequests':len(doc['requests']),'nativeSha256Matches':True,'sourceRGBAReconstruction':True,'motionPixelMatches':32,'distinctFrameHashes':len(set(hashes)),'propPixelMatches':1,'commonScalePerAction':True,'creativePixelEditsPerformed':False,'renderedAccepted':False,'limits':['Saved-byte, padding and pixel checks plus assistant native inspection. Engine transitions, complete directional/action sets, physical devices and human acceptance remain open.']}
(folder/'independent-art-audit.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8');print(json.dumps(result))
