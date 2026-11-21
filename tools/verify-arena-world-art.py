"""Reproduce technical normalization of all five paintings and verify floor-fit metadata."""
from pathlib import Path
from PIL import Image
import hashlib,json
root=Path(__file__).resolve().parents[1]
library=json.loads((root/'assets/production/arena-worlds/library.json').read_text(encoding='utf8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(root/library['packingTool'])==library['packingToolSha256']
assert sha(root/library['geometrySource'])==library['geometrySourceSha256']
decoded=0
for entry in library['entries']:
    assert sha(root/entry['source'])==entry['sourceSha256']
    assert sha(root/entry['request'])==entry['requestSha256']
    assert sha(root/entry['image'])==entry['sha256']
    expected=Image.open(root/entry['source']).convert('RGBA');expected.thumbnail((1024,1024),Image.Resampling.LANCZOS)
    actual=Image.open(root/entry['image']);assert actual.mode=='RGBA' and actual.tobytes()==expected.tobytes()
    assert actual.size==(entry['width'],entry['height'])
    left,top,right,bottom=entry['clearRect'];assert 0<left<right<actual.width and 0<top<bottom<actual.height
    decoded+=actual.width*actual.height*4
assert len(library['entries'])==5 and decoded<16*1024*1024
print(json.dumps(dict(passed=True,maps=5,decodedRgbaBytes=decoded,exactNormalizedNativePixels=True,scope='Five full paintings; clear rectangles inspected separately. No browser/human acceptance.')))
