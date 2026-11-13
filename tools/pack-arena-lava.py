"""Technical crop and size normalization of a preserved transparent hazard sprite."""
from pathlib import Path
from PIL import Image
import hashlib
import json
root=Path(__file__).resolve().parents[1]
native=root/'assets/production/generated/arena-cover-2026-10-29/lava-pit-v1.png'
request=native.with_suffix('.request.json')
image=Image.open(native).convert('RGBA')
bounds=image.getchannel('A').getbbox()
assert bounds
image=image.crop(bounds)
image.thumbnail((512,512),Image.Resampling.LANCZOS)
frame=Image.new('RGBA',(512,512));frame.alpha_composite(image,((512-image.width)//2,(512-image.height)//2))
out=root/'assets/production/arena-cover-surfaces/lava-pit-v1.png'
assert not out.exists()
frame.save(out)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report=dict(schemaVersion=1,source=native.relative_to(root).as_posix(),sourceSha256=sha(native),
 request=request.relative_to(root).as_posix(),requestSha256=sha(request),image=out.relative_to(root).as_posix(),
 sha256=sha(out),size=[512,512],alphaCrop=list(bounds),decodedRgbaBytes=512*512*4,
 packingTool='tools/pack-arena-lava.py',packingToolSha256=sha(Path(__file__)),
 scope='Original art preserved; technical crop/size normalization. No rendered or human acceptance.')
meta=out.with_suffix('.json');assert not meta.exists()
meta.write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(passed=True,image=report['image'],sha256=report['sha256'])))
