"""Normalize whole paintings; record the inspected clear-floor rectangle for nine-slice fitting."""
from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[1]
rows=json.loads((root/'output/room-lobby-2026-10-29/arena-pack-bounds.json').read_text(encoding='utf8'))
clear={'triage-yard':[.16,.30,.80,.78],'ossuary-works':[.15,.19,.84,.78],
 'sunken-chapel':[.18,.23,.82,.78],'bell-foundry':[.17,.25,.83,.78],'crown-crypt':[.17,.20,.83,.78]}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
target=root/'assets/production/arena-worlds';target.mkdir(exist_ok=True);entries=[]
for row in rows:
    arena=row['id']
    if arena=='gatehouse':continue
    native=root/('assets/production/generated/arena-cover-2026-10-29/'+arena+'-surroundings-v1.png')
    request=native.with_suffix('.request.json');image=Image.open(native).convert('RGBA')
    image.thumbnail((1024,1024),Image.Resampling.LANCZOS)
    rect=[round(clear[arena][i]*(image.width if i%2==0 else image.height)) for i in range(4)]
    path=target/(arena+'-v1.png');assert not path.exists();image.save(path)
    entries.append(dict(id=arena,texture='arena-world-'+arena,source=native.relative_to(root).as_posix(),sourceSha256=sha(native),
      request=request.relative_to(root).as_posix(),requestSha256=sha(request),image=path.relative_to(root).as_posix(),sha256=sha(path),
      width=image.width,height=image.height,clearRect=rect,playableBounds=row['bounds'],decodedRgbaBytes=image.width*image.height*4))
manifest=target/'library.json';assert not manifest.exists()
manifest.write_text(json.dumps(dict(schemaVersion=1,entries=entries,packingTool='tools/pack-arena-worlds.py',packingToolSha256=sha(Path(__file__)),
 geometrySource='src/shared/arena-layouts.ts',geometrySourceSha256=sha(root/'src/shared/arena-layouts.ts'),
 scope='Whole painted surroundings with inspected empty centers. Technical size normalization only; no source overwrite or browser acceptance.'),indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(passed=True,maps=len(entries),decodedRgbaBytes=sum(e['decodedRgbaBytes'] for e in entries))))
