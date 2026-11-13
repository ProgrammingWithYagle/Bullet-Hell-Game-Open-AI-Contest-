"""Measure complete native boss alpha and real runtime anchors. Never edit artwork."""
from pathlib import Path
from PIL import Image
import hashlib,json,subprocess,sys
root=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
inputs=json.loads(subprocess.check_output(['node','--import','tsx','tools/boss-body-art-inputs.mts'],cwd=root,text=True,encoding='utf8'))
entries={key:dict(bossId=key,extents=dict(left=0,top=0,right=0,bottom=0),sources=[]) for key in inputs['ids']}
def add(item,file,boxes,width,height,display_width,display_height):
    ox,oy=item['origin'];sx,sy=display_width/width,display_height/height
    ext=dict(left=max((ox*width-b[0])*sx for b in boxes),right=max((b[2]-ox*width)*sx for b in boxes),
      top=max((oy*height-b[1])*sy-item['offsetY']+item['lift'] for b in boxes),bottom=max((b[3]-oy*height)*sy+item['offsetY'] for b in boxes))
    target=entries[item['bossId']]
    for key,value in ext.items():target['extents'][key]=max(target['extents'][key],value)
    target['sources'].append(dict(path=file,sha256=sha(root/file),origin=item['origin'],width=width,height=height,displayWidth=display_width,displayHeight=display_height,offsetY=item['offsetY'],maximumLift=item['lift'],frames=boxes))
for item in inputs['atlases']:
    size=item['cellSize'];image=Image.open(root/item['atlas']).convert('RGBA');boxes=[]
    for frame in range(item['frames']):
        x=(frame%item['columns'])*size;y=(frame//item['columns'])*size
        box=image.crop((x,y,x+size,y+size)).getchannel('A').getbbox()
        assert box,(item['bossId'],frame)
        boxes.append(list(box))
    add(item,item['atlas'],boxes,size,size,item['displayCell'],item['displayCell'])
for item in inputs['stills']:
    image=Image.open(root/item['path']).convert('RGBA');box=image.getchannel('A').getbbox();assert box
    add(item,item['path'],[list(box)],image.width,image.height,item['displayWidth'],item['displayHeight'])
result=dict(schemaVersion=1,padding=4,alphaThreshold=0,derivationTool='tools/derive-boss-body-bounds.py',
 derivationToolSha256=sha(Path(__file__)),inputTool='tools/boss-body-art-inputs.mts',inputToolSha256=sha(root/'tools/boss-body-art-inputs.mts'),entries=list(entries.values()))
assert len(result['entries'])==66 and all(e['sources'] for e in result['entries'])
target=root/'src/shared/boss-body-bounds.json'
if '--check' in sys.argv:assert json.loads(target.read_text(encoding='utf8'))==result,'Runtime boss footprint differs from native artwork/anchors'
else:
    with target.open('x',encoding='utf8',newline='\n') as out:out.write(json.dumps(result,indent=2)+'\n')
print(json.dumps(dict(passed=True,bosses=len(entries),sources=sum(len(e['sources']) for e in entries.values()),frames=sum(len(s['frames']) for e in entries.values() for s in e['sources']),scope='Native alpha and anchor geometry; no rendered review.')))
