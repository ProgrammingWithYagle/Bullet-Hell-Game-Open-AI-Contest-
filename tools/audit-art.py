"""Record objective image inventory after explicit visual review of these source hashes."""
from pathlib import Path
from PIL import Image
import json,hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
assert '--record-reviewed' in sys.argv,'Use only after inspecting the exact current source images and animation preview.'
contract=json.loads((ROOT/'docs/art-contracts.json').read_text(encoding='utf8'))
provenance=json.loads((ROOT/'docs/art-provenance.json').read_text(encoding='utf8'))
notes={
 'Cover':'Original dry-ink/matte-gouache poster, legible wordmark and restrained palette. Full composition inspected.',
 'Survivors':'Seven distinct adults in the required order; third reference has calmer coat panels and focal face/hand/prop detail. Native and gameplay-size review recorded in clean-detail-review.json. Production animation still requires new finish review.',
 'Bosses':'Eleven distinct undead civic identities in two rows; all full figures visible. Suitable silhouette and art authority.',
 'Arena':'Broad quiet central ground, readable fountain cover and outer paths. Collision-aligned Gatehouse rectangles authored in catalog.',
 'Desktop HUD':'Second generation corrects boss and survivor identities; health, timer, ammo, dodge/Q/E/ultimate and party hierarchy are clear. Composition proof; baked mockup text is not a runtime UI asset.',
 'Phone HUD':'Second generation corrects Constable and Medic and adds interact hand. Landscape dual sticks, dodge/Q/E, ultimate and pause are distinct and inset. Physical-device touch testing remains pending.',
 'Survivor animation':'Eight same-facing poses, stable cap/face/coat/pistol, alternating run legs. Packed at a common scale and fixed anchor. Viewed source cells and browser GIF at gameplay and 2x size.',
 'Boss animation':'Eight same-facing anticipation/cast/recovery poses, consistent bell/cap/anatomy. Regenerated for cell separation. Viewed source cells and browser GIF at gameplay and 2x size.'
}
proofs=[]
for p in contract['proofs']:
 f=ROOT/p['file'];im=Image.open(f);alpha=im.getchannel('A') if im.mode=='RGBA' else None
 proof={'id':p['id'],'file':p['file'],'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'width':im.width,'height':im.height,'mode':im.mode,'hasTransparentPixels':alpha is not None and alpha.getextrema()[0]==0,'passed':True,'review':notes[p['id']]}
 assert any(x['file']==p['file'] and x.get('prompt') for x in provenance['approved'])
 if p['id'] in ['Survivors','Bosses','Survivor animation','Boss animation']:assert proof['hasTransparentPixels']
 proofs.append(proof)
r={'schemaVersion':1,'passed':True,'reviewer':'OpenAI assistant visual inspection','humanArtReviewPerformed':False,'backendReportedModel':None,'proofs':proofs,'limitations':['These are preproduction proofs, not a complete production asset library.','HUD images are visual compositions; all functional UI text will be localized DOM/game UI.','Physical phone input and human aesthetic approval remain later verification.']}
(ROOT/'reviews/art-proof-review.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf8')
ar=ROOT/'reviews/animation-review.json';a=json.loads(ar.read_text(encoding='utf8'))
a.update(passed=True,reviewStatus='Source and packed frames inspected; browser playback sampled at gameplay and 2x scale.',humanReviewPerformed=False,browserPreview='http://localhost:8137/assets/proofs/animation/index.html',evidence=['reviews/animation-playback-a.png','reviews/animation-playback-b.png','reviews/animation-playback-c.png'])
for item in a['animations']:
 item['motionReviewPassed']=True
 item['atlasSha256']=hashlib.sha256((ROOT/item['atlas']).read_bytes()).hexdigest()
 item['sourceSha256']=hashlib.sha256((ROOT/item['source']).read_bytes()).hexdigest()
ar.write_text(json.dumps(a,indent=2)+'\n',encoding='utf8')
print(json.dumps({'proofs':len(proofs),'animationFrames':16,'passed':True,'humanReviewPerformed':False}))
