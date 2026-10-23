"""Create a deterministic scale/background review plate; never repaint source art."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'reviews/clean-detail-scale-review.png'
plate=Image.new('RGB',(1280,1080),'#f4f0e4');draw=ImageDraw.Draw(plate)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
draw.text((32,18),'GRAVE ACCORD / CLEAN DETAIL / REFERENCE SCALE REVIEW',fill='#23423c',font=font)
draw.text((32,54),'Uniform sheet resampling and alpha composition only. Live combat and new animation review remain pending.',fill='#465c53',font=small)
specs=[('Survivors / 56 world px','assets/proofs/survivors-v3.png',56,104,'#f4f0e4'),('Survivors / 2x','assets/proofs/survivors-v3.png',112,222,'#233c39'),('Bosses / 150 world px','assets/proofs/bosses-clean-detail-v2.png',150,398,'#f4f0e4'),('Bosses / 2x','assets/proofs/bosses-clean-detail-v2.png',300,612,'#233c39')]
files={}
for label,file,height,y,bg in specs:
    source=Image.open(ROOT/file).convert('RGBA');scaled=source.resize((round(source.width*height/source.height),height),Image.Resampling.LANCZOS)
    draw.text((32,y),label,fill='#23423c',font=font)
    draw.rounded_rectangle((32,y+34,1248,y+height+54),radius=6,fill=bg)
    plate.paste(scaled,(52,y+44),scaled)
    files[file]={'sha256':hashlib.sha256((ROOT/file).read_bytes()).hexdigest(),'width':source.width,'height':source.height,'alpha':source.getchannel('A').getextrema()[0]==0}
draw.text((32,1020),'Six boss samples: Hollow Constable, Tollkeeper, Glass Surgeon, Clockmender, City Eater, Hourglass Widow.',fill='#465c53',font=small)
plate.save(out)
print(json.dumps({'plate':str(out),'files':files},indent=2))
