from pathlib import Path
from PIL import Image
import json,numpy as np
w=Path(__file__).resolve().parent;results=[]
for p in sorted((w/'motion-natives').glob('brass-toad-*.png')):
 im=Image.open(p);alpha=np.array(im.getchannel('A'));item={'file':p.name,'size':im.size,'alpha16Bounds':im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()}
 if im.width/im.height<2:
  rows=np.count_nonzero(alpha,axis=1);near=[y for y in range(round(im.height*.35),round(im.height*.65)) if rows[y]==0]
  item['rowGutterCandidates']=len(near)
  ycut=min(near,key=lambda y:abs(y-im.height/2)) if near else im.height//2
  item['columnGuttersPerRow']=[]
  for y0,y1 in [(0,ycut),(ycut,im.height)]:
   cols=np.count_nonzero(alpha[y0:y1],axis=0);candidates=[x for x in range(round(im.width*.35),round(im.width*.65)) if cols[x]==0]
   item['columnGuttersPerRow'].append(len(candidates))
 results.append(item)
(w/'native-gutter-checks.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(results))
