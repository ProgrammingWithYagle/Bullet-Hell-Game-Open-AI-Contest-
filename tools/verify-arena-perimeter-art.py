"""Read-only provenance and exact pixel-crop verification for painted surroundings."""
from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[1]
library=json.loads((root/'assets/production/arena-perimeters/library.json').read_text(encoding='utf8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(root/library['packingTool'])==library['packingToolSha256']
assert sha(root/library['geometrySource'])==library['geometrySourceSha256']
count=0;decoded=0
for entry in library['entries']:
    assert sha(root/entry['source'])==entry['sourceSha256']
    assert sha(root/entry['request'])==entry['requestSha256']
    native=Image.open(root/entry['source']).convert('RGBA');b=entry['playableBounds']
    for frame in entry['frames']:
        image=Image.open(root/frame['image']);assert image.mode=='RGBA'
        assert sha(root/frame['image'])==frame['sha256']
        assert image.size==(frame['width'],frame['height'])
        assert image.tobytes()==native.crop(frame['sourceRect']).tobytes()
        r=frame['worldBounds'];assert not (r['x']<b['x']+b['width'] and r['x']+r['width']>b['x'] and r['y']<b['y']+b['height'] and r['y']+r['height']>b['y'])
        count+=1;decoded+=image.width*image.height*4
assert count==20 and decoded<12*1024*1024
print(json.dumps(dict(passed=True,maps=5,frames=count,decodedRgbaBytes=decoded,exactNativePixels=True,playableOverlapPixels=0,scope='Source asset and geometry verification only; no browser/human acceptance.')))
