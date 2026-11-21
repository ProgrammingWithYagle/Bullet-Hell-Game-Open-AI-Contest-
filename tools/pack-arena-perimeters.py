"""Extract four exact painted strips per map, excluding every playable pixel."""
from pathlib import Path
from PIL import Image
import hashlib,json
root=Path(__file__).resolve().parents[1]
rows=json.loads((root/'output/room-lobby-2026-10-29/arena-pack-bounds.json').read_text(encoding='utf8'))
target=root/'assets/production/arena-perimeters';target.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
entries=[]
for row in rows:
    if row['id']=='gatehouse':continue
    arena=row['id'];bounds=row['bounds'];pad=86
    native=root/('assets/production/generated/arena-cover-2026-10-29/'+arena+'-surroundings-v1.png')
    request=native.with_suffix('.request.json');image=Image.open(native).convert('RGBA')
    px=round(image.width*pad/(bounds['width']+2*pad));py=round(image.height*pad/(bounds['height']+2*pad))
    x,y,w,h=(bounds[k] for k in ('x','y','width','height'))
    frames=[]
    for side,rect,world in [
      ('north',[0,0,image.width,py],dict(x=x-pad,y=y-pad,width=w+pad*2,height=pad)),
      ('south',[0,image.height-py,image.width,image.height],dict(x=x-pad,y=y+h,width=w+pad*2,height=pad)),
      ('west',[0,py,px,image.height-py],dict(x=x-pad,y=y,width=pad,height=h)),
      ('east',[image.width-px,py,image.width,image.height-py],dict(x=x+w,y=y,width=pad,height=h))]:
        frame=image.crop(rect);path=target/(arena+'-'+side+'-v1.png');assert not path.exists();frame.save(path)
        frames.append(dict(side=side,texture='arena-perimeter-'+arena+'-'+side,sourceRect=rect,worldBounds=world,
          image=path.relative_to(root).as_posix(),sha256=sha(path),width=frame.width,height=frame.height,decodedRgbaBytes=frame.width*frame.height*4))
    entries.append(dict(id=arena,source=native.relative_to(root).as_posix(),sourceSha256=sha(native),
      request=request.relative_to(root).as_posix(),requestSha256=sha(request),playableBounds=bounds,padding=pad,frames=frames))
manifest=target/'library.json';assert not manifest.exists()
manifest.write_text(json.dumps(dict(schemaVersion=1,entries=entries,packingTool='tools/pack-arena-perimeters.py',
  packingToolSha256=sha(Path(__file__)),geometrySource='src/shared/arena-layouts.ts',geometrySourceSha256=sha(root/'src/shared/arena-layouts.ts'),
  scope='Exact source pixel crops outside the playable rectangle; no source edits, changed collision or browser acceptance.'),indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(passed=True,maps=len(entries),frames=sum(len(e['frames']) for e in entries),decodedRgbaBytes=sum(f['decodedRgbaBytes'] for e in entries for f in e['frames']))))
