"""Technical RGBA-preserving crop, common-scale atlas packing, no painting."""
from pathlib import Path
from PIL import Image
from runpy import run_path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
REVIEW=ROOT/'reviews/midnight-2026-10-24'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf8')
def main():
 doc=json.loads((ROOT/'docs/midnight-art-2026-10-24.json').read_text(encoding='utf8'))
 parts=run_path(str(ROOT/'tools/pack-encounter-art.py'))['rectangles']
 feet=run_path(str(ROOT/'tools/normalize-production-art.py'))['feet_anchor']
 entries=[];receipts=[]
 for originalJob in doc['requests']:
  if not originalJob.get('selected'):continue
  job=dict(originalJob,id=originalJob.get('runtimeId',originalJob['id']))
  native=Image.open(ROOT/job['file']);assert native.mode=='RGBA' and native.getchannel('A').getextrema()==(0,255)
  assert sha(ROOT/job['file'])==job['sha256']
  if job['kind']=='props':
   for n,rect in enumerate(parts(native,4,2)):
    cell=native.crop(rect);bounds=cell.getchannel('A').getbbox();crop=cell.crop(bounds);scale=224/max(crop.size);size=tuple(round(v*scale) for v in crop.size);offset=((256-size[0])//2,(256-size[1])//2);target=Image.new('RGBA',(256,256));target.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),offset);dest=ROOT/('assets/production/midnight-props/'+str(n)+'.png');dest.parent.mkdir(parents=True,exist_ok=True);target.save(dest)
    receipts.append({'id':job['id']+'-'+str(n),'source':job['file'],'sourceSha256':job['sha256'],'sourceRect':rect,'sourceAlphaBounds':bounds,'atlas':dest.relative_to(ROOT).as_posix(),'atlasSha256':sha(dest),'uniformScale':scale,'size':size,'offset':offset})
   continue
  rects=parts(native,4,2);reconstructed=Image.new('RGBA',native.size);cells=[]
  for rect in rects:
   cell=native.crop(rect);reconstructed.paste(cell,rect[:2]);bounds=cell.getchannel('A').getbbox();visible=cell.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox();assert visible
   # One ground anchor per drawn pose, measured on the same alpha threshold.
   cells.append((cell,bounds,visible,feet(cell,visible)))
  assert reconstructed.tobytes()==native.tobytes()
  scale=185/(cells[0][2][3]-cells[0][2][1]);size=384;pivot=[192,320]
  while True:
   offsets=[[pivot[0]-round((a[0]-b[0])*scale),pivot[1]-round((a[1]-b[1])*scale)] for c,b,v,a in cells]
   if all(min(o)>=12 and o[0]+round((b[2]-b[0])*scale)<=size-12 and o[1]+round((b[3]-b[1])*scale)<=size-12 for (c,b,v,a),o in zip(cells,offsets)):break
   scale*=.96
  atlas=Image.new('RGBA',(size*4,size*2));frames=[];measurements=[]
  for i,((cell,b,v,a),offset) in enumerate(zip(cells,offsets)):
   crop=cell.crop(b);targetSize=tuple(max(1,round(v*scale)) for v in crop.size);frame=Image.new('RGBA',(size,size))
   frame.alpha_composite(crop.resize(targetSize,Image.Resampling.LANCZOS),offset);atlas.paste(frame,(i%4*size,i//4*size));frames.append(frame)
   measurements.append({'sourceRect':rects[i],'sourceAlphaBounds':b,'visibleAlpha128Bounds':v,'sourceGroundAnchor':a,'targetGroundAnchor':pivot,'uniformScale':scale,'size':targetSize,'offset':offset})
  boss=job['id'].removesuffix('-action');dest=ROOT/('assets/production/motion/'+boss+'-action-v1-atlas.png');atlas.save(dest)
  world=(56 if job['kind']=='minion' else 150)*size/((cells[0][2][3]-cells[0][2][1])*scale)
  entries.append({'id':job['id'],'bossId':boss,'role':job['kind'],'name':boss.replace('-',' ').title()+' · signature','family':'bosses','kind':'animation','atlas':dest.relative_to(ROOT).as_posix(),'atlasSha256':sha(dest),'source':job['file'],'sourceSha256':job['sha256'],'cellSize':size,'columns':4,'frames':8,'labels':['Idle','Prepare','Lift','Anticipation','Release','Channel','Recovery','Defeat'] if job['kind']!='minion' else ['Left contact','Left down','Left pass','Left lift','Right contact','Right down','Right pass','Right lift'],'origin':[.5,320/384],'displayHeight':56 if job['kind']=='minion' else 150,'displayCell':world,'fps':10,'frameDurationsMs':[100]*8,'status':'Assistant native review candidate; rendered transition and full directional/action acceptance remain open','notes':'Eight actual drawn poses. One action scale. Full RGBA native and exact request retained. No creative pixel edits.'})
  receipts.append({'id':job['id'],'source':job['file'],'sourceSha256':job['sha256'],'sourceSize':native.size,'rectangles':rects,'rgbaReconstruction':True,'atlas':dest.relative_to(ROOT).as_posix(),'atlasSha256':sha(dest),'frames':measurements})
  previews=[]
  for frame in frames:
   preview=Image.new('RGB',(420,320),'#18352f');display=round(world);sprite=frame.resize((display,display),Image.Resampling.LANCZOS);preview.paste(sprite,(round(210-display*.5),round(270-display*320/384)),sprite);previews.append(preview)
  previews[0].save(ROOT/('assets/production/motion/'+boss+'-action-v1-preview.gif'),save_all=True,append_images=previews[1:],duration=100,loop=0,disposal=2)
 write(ROOT/'assets/production/motion/service-library.json',{'schemaVersion':1,'entries':entries})
 write(REVIEW/'packing.json',{'schemaVersion':1,'entries':receipts,'creativePixelEditsPerformed':False,'rgbaReconstruction':True,'renderedAccepted':False})
 print('Packed fourteen boss actions, an individual Choir voice, an ordinary minion and eight signature props; 128 drawn poses.')
if __name__=='__main__':main()
