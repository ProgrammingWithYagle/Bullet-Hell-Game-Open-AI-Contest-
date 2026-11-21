"""Build only the Warden patrol documentation image; preserve all older gallery bytes."""
from pathlib import Path
from PIL import Image
import hashlib,json
R=Path(__file__).resolve().parents[1]
image=R/'docs/wiki/images/warden-patrol.jpg';proof=R/'reviews/warden-patrol-2026-10-25/patrol-contact.png'
Image.open(proof).convert('RGB').save(image,quality=92,optimize=True)
m=json.loads((R/'docs/wiki-images.json').read_text(encoding='utf8'));im=Image.open(image)
entry={'path':'images/warden-patrol.jpg','bytes':image.stat().st_size,'sha256':hashlib.sha256(image.read_bytes()).hexdigest(),'width':im.width,'height':im.height,'caption':'Four original Warden patrol poses at one physical scale; sprite reference, not gameplay capture.'}
m['files']=[e for e in m['files'] if e['path']!=entry['path']]+[entry]
m['wardenPatrol']['sourceTool']='tools/build-warden-patrol-wiki.py';m['wardenPatrol']['sourceToolSha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
(R/'docs/wiki-images.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps({'passed':True,'path':entry['path'],'sha256':entry['sha256'],'pages':18,'images':len(m['files'])}))
