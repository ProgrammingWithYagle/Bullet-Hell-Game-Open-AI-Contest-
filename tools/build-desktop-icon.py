#!/usr/bin/env python3
"""Rasterize the existing in-game bell symbol for native Windows icon sizes."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent.parent;folder=root/'assets/production/desktop';folder.mkdir(parents=True,exist_ok=True)
svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#19372f"/><rect x="1" y="1" width="30" height="30" rx="5" fill="none" stroke="#8f9d78" stroke-width=".5"/><g transform="translate(3 3) scale(.8125)" fill="none" stroke="#eee1c2" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M6 23h20l-4-5v-7a6 6 0 0 0-12 0v7z M13 27h6 M16 3V1"/></g></svg>'
(folder/'icon.svg').write_text(svg+'\n',encoding='utf-8')
im=Image.new('RGBA',(1024,1024),(0,0,0,0));d=ImageDraw.Draw(im);s=32
d.rounded_rectangle((0,0,1023,1023),radius=6*s,fill='#19372f');d.rounded_rectangle((s,s,31*s,31*s),radius=5*s,outline='#8f9d78',width=16)
def xy(x,y):return (round((3+x*.8125)*s),round((3+y*.8125)*s))
width=round(1.65*.8125*s);color='#eee1c2'
points=[xy(6,23),xy(26,23),xy(22,18),xy(22,11)];d.line(points,fill=color,width=width,joint='curve');d.arc((*xy(10,5),*xy(22,17)),180,360,fill=color,width=width);d.line([xy(10,11),xy(10,18),xy(6,23)],fill=color,width=width,joint='curve')
for a,b in [((13,27),(19,27)),((16,3),(16,1))]:d.line([xy(*a),xy(*b)],fill=color,width=width)
png=folder/'icon.png';ico=folder/'icon.ico';im.resize((512,512),Image.Resampling.LANCZOS).save(png);im.resize((256,256),Image.Resampling.LANCZOS).save(ico,sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
report={'source':'Existing bell path in src/client/ui/icons.ts','operation':'Same vector symbol with quiet app-tile background and native-size rasterization. No generated character art.','files':[{'path':p.relative_to(root).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in [folder/'icon.svg',png,ico]]}
(folder/'icon.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
