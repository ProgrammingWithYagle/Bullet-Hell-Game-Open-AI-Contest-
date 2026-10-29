"""Read native atlas alpha to bind complete visible footprints; never edit artwork."""
from pathlib import Path
from PIL import Image
import hashlib,json,sys
root=Path(__file__).resolve().parents[1]
library_path=root/'assets/production/motion/small-wakes-library.json'
library=json.loads(library_path.read_text(encoding='utf8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
entries=[]
for item in library['entries']:
    atlas=root/item['atlas'];image=Image.open(atlas).convert('RGBA');size=item['cellSize'];boxes=[]
    for frame in range(item['frames']):
        x=(frame%item['columns'])*size;y=(frame//item['columns'])*size
        boxes.append(list(image.crop((x,y,x+size,y+size)).getchannel('A').getbbox()))
    union=[min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)]
    scale=item['displayCell']/size;ox,oy=[v*size for v in item['origin']]
    entries.append(dict(bossId=item['bossId'],atlas=item['atlas'],atlasSha256=sha(atlas),frames=boxes,union=union,
      extents=dict(left=(ox-union[0])*scale,top=(oy-union[1])*scale,right=(union[2]-ox)*scale,bottom=(union[3]-oy)*scale)))
result=dict(schemaVersion=1,padding=4,alphaThreshold=0,library=library_path.relative_to(root).as_posix(),librarySha256=sha(library_path),
  derivationTool='tools/derive-small-wakes-body-bounds.py',derivationToolSha256=sha(Path(__file__)),entries=entries)
target=root/'src/shared/small-wakes-body-bounds.json'
if '--check' in sys.argv:
    assert json.loads(target.read_text(encoding='utf8'))==result,'Visible footprint metadata differs from native alpha'
else:
    with target.open('x',encoding='utf8',newline='\n') as out:out.write(json.dumps(result,indent=2)+'\n')
print(json.dumps(dict(passed=True,identities=len(entries),frames=sum(len(e['frames']) for e in entries),scope='Source alpha and anchor geometry only; no browser capture.')))
