"""Independent file/pixel audit for the two built-in generated difficulty floors."""
from pathlib import Path
import hashlib,json
from PIL import Image

root=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source=root/'assets/proofs/arena-v1.png'
assert sha(source)=='b5edf920d23f7672895f18313e933e3b247b8a2271780d91d6bf66721184cc26'
requests=json.loads((root/'assets/production/generated/difficulty-floor-2026-10-25/requests.json').read_text(encoding='utf-8'))
assert len(requests['requests'])==2
entries=[]
for request in requests['requests']:
    relative=Path(request['projectPath']);assert not relative.is_absolute() and '..' not in relative.parts
    native=root/relative;assert sha(native)==request['sha256']
    image=Image.open(native);assert image.size==(1586,992)
    assert image.convert('RGBA').getchannel('A').getextrema()==(255,255)
    rgba=image.convert('RGBA').tobytes()
    entries.append({'path':relative.as_posix(),'sha256':sha(native),'size':list(image.size),'rgbaSha256':hashlib.sha256(rgba).hexdigest(),'opaque':True,'decodedRgbaBytes':len(rgba)})
gallery=root/'docs/wiki/images/difficulty-cover.jpg';manifest=json.loads((root/'docs/wiki-images.json').read_text(encoding='utf-8'))
entry=next(e for e in manifest['files'] if e['path']=='images/difficulty-cover.jpg')
assert sha(gallery)==entry['sha256']
report={'passed':True,'method':'Native hash, decoded RGBA/opacity/dimensions, unchanged original and technical-gallery manifest verification. No rendered gameplay acceptance.',
        'verifier':'tools/verify-difficulty-floor.py','verifierSha256':sha(Path(__file__)),'source':'assets/proofs/arena-v1.png','originalSha256':sha(source),'entries':entries,
        'gallerySha256':sha(gallery),'renderedAccepted':False,'humanAccepted':False}
destination=root/'reviews/difficulty-pressure-2026-10-25/ground-art.json';destination.parent.mkdir(parents=True,exist_ok=True)
destination.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'passed':True,'natives':len(entries),'rgbaBytes':sum(e['decodedRgbaBytes'] for e in entries),'originalUnchanged':True}))
