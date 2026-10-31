"""Read-only native-to-delivery pixel verification for the seven new arena sprites."""
from pathlib import Path
from PIL import Image
import hashlib,json
root=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
library=json.loads((root/'assets/production/arena-cover-surfaces/library-v2.json').read_text(encoding='utf8'))
lava=json.loads((root/'assets/production/arena-cover-surfaces/lava-pit-v1.json').read_text(encoding='utf8'))
for record in (library,lava):
    for path,digest in [('source','sourceSha256'),('request','requestSha256'),('packingTool','packingToolSha256')]:
        assert sha(root/record[path])==record[digest],record[path]
atlas=Image.open(root/library['source']).convert('RGBA');images=[]
for entry in library['entries']:
    assert sha(root/entry['image'])==entry['sha256']
    image=Image.open(root/entry['image']);assert image.mode=='RGBA'
    crop=atlas.crop(entry['sourceCell']).crop(entry['alphaCrop'])
    assert image.size==(entry['width'],entry['height']) and image.tobytes()==crop.tobytes()
    assert image.getchannel('A').getextrema()==(0,255)
    images.append(dict(id=entry['id'],sha256=entry['sha256'],size=list(image.size),alphaRange=[0,255]))
native=Image.open(root/lava['source']).convert('RGBA').crop(lava['alphaCrop'])
native.thumbnail((512,512),Image.Resampling.LANCZOS)
expected=Image.new('RGBA',(512,512));expected.alpha_composite(native,((512-native.width)//2,(512-native.height)//2))
image=Image.open(root/lava['image']);assert image.mode=='RGBA' and image.tobytes()==expected.tobytes()
assert sha(root/lava['image'])==lava['sha256'] and image.getchannel('A').getextrema()==(0,255)
images.append(dict(id='lava-pit',sha256=lava['sha256'],size=[512,512],alphaRange=[0,255]))
print(json.dumps(dict(passed=True,surfaces=len(images),decodedRgbaBytes=sum(w*h*4 for w,h in (i['size'] for i in images)),images=images,scope='Exact generated-native and delivery pixels; no browser or human acceptance.')))
