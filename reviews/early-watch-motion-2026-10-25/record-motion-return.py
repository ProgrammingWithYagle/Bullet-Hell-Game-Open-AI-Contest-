from pathlib import Path
from PIL import Image
import hashlib,json,shutil,sys
boss,clip,version,native_name=sys.argv[1:]
w=Path(__file__).resolve().parent
src=Path(r'C:\Users\yigal\.codex\generated_images\01a16b04-4ec7-7180-bb3a-81ca62b6fff6')/native_name
dest=w/'motion-natives'/(boss+'-'+clip+'-v'+version+'.png');assert src.is_file() and not dest.exists()
shutil.copyfile(src,dest);im=Image.open(dest);assert im.mode=='RGBA'
request=w/'requests'/(boss+'-'+clip+'-v'+version+'.request.json');assert request.is_file()
p=w/'motion-returns.json';record=json.loads(p.read_text(encoding='utf-8'))
record['returns'].append({'clip':boss+'-'+clip,'version':int(version),'native':str(dest),
 'issuedNative':str(src),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'size':im.size,
 'request':str(request),'requestSha256':hashlib.sha256(request.read_bytes()).hexdigest(),
 'status':'Complete native candidate; assistant whole-pose, partition/scale and world-size review pending.',
 'renderedAccepted':False})
p.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'recorded':dest.name,'size':im.size,'sha256':record['returns'][-1]['sha256']}))
