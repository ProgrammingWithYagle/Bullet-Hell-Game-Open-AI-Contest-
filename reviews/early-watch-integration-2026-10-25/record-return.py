from pathlib import Path
from PIL import Image
import hashlib,json,shutil,sys

repo=Path(r'C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)')
batch=repo/'assets/production/generated/early-watch-integration-2026-10-25'
clip,native=sys.argv[1:]
src=Path(native); dest=batch/'natives'/f'{clip}-v2.png'
assert src.is_file() and not dest.exists()
shutil.copyfile(src,dest)
im=Image.open(dest); assert im.mode=='RGBA'
request=batch/'requests'/f'{clip}-v2.request.json'; assert request.is_file()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
index=batch/'returns.json'
record=json.loads(index.read_text(encoding='utf-8')) if index.exists() else {'returns':[]}
record['returns'].append({'clip':clip,'version':2,'native':str(dest.relative_to(repo)).replace('\\','/'),
 'issuedNative':str(src),'nativeSha256':sha(dest),'request':str(request.relative_to(repo)).replace('\\','/'),
 'requestSha256':sha(request),'size':list(im.size),'status':'native-candidate','renderedAccepted':False,'humanAccepted':False})
index.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(record['returns'][-1]))
