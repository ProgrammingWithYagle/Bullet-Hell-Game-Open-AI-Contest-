"""Normalize visible body height for class-selection artwork only; existing gameplay art is immutable."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import hashlib,io,json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/delivery/selection-portraits-v1';REVIEW=ROOT/'reviews/selection-portraits-2026-10-25';OUT.mkdir(exist_ok=True);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();entries=[]
def preserve(path,image):
 buf=io.BytesIO();image.save(buf,format='PNG');data=buf.getvalue()
 if path.exists():assert path.read_bytes()==data
 else:path.write_bytes(data)
for ident in ['soldier','medic','heavy','tank','mage','engineer','assassin']:
 source=ROOT/(f'assets/production/generated/selection-portraits-2026-10-25/{ident}-three-quarter-v1.png'if ident in ['soldier','medic']else f'assets/production/normalized/survivors/{ident}/portrait-south-v1.png');native=Image.open(source);assert native.mode=='RGBA';visible=native.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();bounds=native.getchannel('A').getbbox();assert visible and bounds;scale=576/(visible[3]-visible[1]);crop=native.crop(bounds);size=[round(crop.width*scale),round(crop.height*scale)];ground=[(visible[0]+visible[2])/2,visible[3]];offset=[240-round((ground[0]-bounds[0])*scale),608-round((ground[1]-bounds[1])*scale)];assert min(offset)>=8 and offset[0]+size[0]<=472 and offset[1]+size[1]<=632,(ident,'Regenerate or enlarge canvas rather than clipping',size,offset)
 target=Image.new('RGBA',(480,640));target.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset);path=OUT/(ident+'-selection-v1.png');preserve(path,target);packed=target.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();assert abs((packed[3]-packed[1])-576)<=2
 entries.append({'classId':ident,'source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'sourceSize':list(native.size),'sourceAlphaBounds':list(bounds),'sourceAlpha16Bounds':list(visible),'uniformScale':scale,'resizedCrop':size,'offset':offset,'targetAlpha16Bounds':list(packed),'image':path.relative_to(ROOT).as_posix(),'imageSha256':sha(path),'imageSize':[480,640],'newPose':ident in ['soldier','medic']})
manifest={'schemaVersion':1,'sourceTool':'tools/build-selection-portraits.py','sourceToolSha256':sha(Path(__file__)),'entries':entries,'visibleBodyHeightTarget':576,'selectionOnly':True,'renderedAccepted':False,'limits':['Two new built-in three-quarter portraits; other five complete portraits preserve their original identity and pose.','Only whole-figure crop, one uniform scale, and translation. No alpha erasure, rigging or mirroring.','Class selection only; gameplay sprites, shots, stats and kit behavior are unchanged.','Exact visible body-height normalization is separate from rendered menu/human acceptance.']};(OUT/'library.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
proof=Image.new('RGB',(7*270,500),'#19372f');draw=ImageDraw.Draw(proof);font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',18)
for index,entry in enumerate(entries):
 piece=Image.open(ROOT/entry['image']).resize((270,360),Image.Resampling.LANCZOS);proof.paste(piece,(index*270,65),piece);draw.text((index*270+18,15),entry['classId'].title(),font=font,fill='#eee1c2')
draw.text((18,470),'Seven selection portraits at one visible-body scale; static reference, not a menu capture.',font=font,fill='#bacbb8');preserve(REVIEW/'selection-lineup.png',proof)
print(json.dumps({'classes':7,'newPoses':2,'bodyHeightTarget':576,'decodedRgbaBytes':480*640*4*7}))
