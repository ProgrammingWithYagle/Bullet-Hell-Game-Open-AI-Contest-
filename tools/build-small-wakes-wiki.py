"""Publishable static references, not rendered playtests; prior gallery bytes stay unchanged."""
from pathlib import Path
from PIL import Image
import hashlib,json,shutil
R=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((R/'docs/wiki-images.json').read_text(encoding='utf8'));assert len(m['files'])==30
for f in m['files']:assert sha(R/'docs/wiki'/f['path'])==f['sha256']
inputs=[('assets/delivery/boss-loading-v5/'+id+'-reference-v3.png','small-wakes-'+id+'.png',id+' original live identity crop; static art reference, not engine capture.') for id in ['candle-snail','cobble-crab','mourning-kettle']]
inputs += [('assets/production/generated/small-wakes-2026-10-26/normalized/small-wakes-motion.jpg','small-wakes-motion.jpg','Thirty-six whole-pose Small Wakes motion frames; composite, not engine capture.')]
added=[]
for source,name,caption in inputs:
 dest=R/'docs/wiki/images'/name;assert not dest.exists();shutil.copyfile(R/source,dest);im=Image.open(dest)
 entry={'path':'images/'+name,'bytes':dest.stat().st_size,'sha256':sha(dest),'width':im.width,'height':im.height,'caption':caption};m['files'].append(entry);added.append({'source':source,'sourceSha256':sha(R/source),**entry})
m['smallWakes']={'sourceTool':'tools/build-small-wakes-wiki.py','sourceToolSha256':sha(Path(__file__)),'entries':added,'selectedPoses':36,'renderedAccepted':False,'humanAccepted':False}
(R/'docs/wiki-images.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
root='https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/'
section='''
## Small Wakes: three new ordinary encounters

Candle Snail **1--**, Cobble Crab **1-** and Mourning Kettle **1** bring the roster to **66 (65 ordinary, one secret)**. Eighty-five further ordinary identities remain. Each has two half-health phases, divided health, an independent entry cue, persistent fifteen-locale response text, complete selected motion and an individual original score. All earlier boss health/damage/deadlines and fixed grades remain unchanged.

| Boss | Phase change and counterplay | Extra Brutal mechanic |
| --- | --- | --- |
| Candle Snail | Waxwake becomes two separated Twin Wick rails with a quiet center. Leave the marked wax before it burns; masonry stops it. The body glides faster after half health. | Delayed cross-cut, follow-up fan and real second projectile waves. |
| Cobble Crab | Grate Clamp becomes alternating double Cross Streets closures. Exit the marked jaws or break their linked finite anchor. The body scuttles sideways. | Independent second anchor/closure and additional doubled volley. |
| Mourning Kettle | Pressure Pour becomes two staggered Last Service lanes with a cold center. Sidestep steam, then crossing beads, or break a linked valve. The body waddles. | Delayed rear pour and real doubled bead waves. |

Finite anchors/valves are individual boss weak points, separate from the global phase-circle shield event. That event remains Baby/Easy Standard only, absent on Normal+ and all Brutal. Already emitted projectiles and their warned repeat waves remain hazards when an object breaks. Hellish forces every new encounter Brutal and retains warned lava.

'''
for id,name in [('candle-snail','Candle Snail'),('cobble-crab','Cobble Crab'),('mourning-kettle','Mourning Kettle')]:section+=f'![{name}: original static identity reference]({root}small-wakes-{id}.png)\n\n'
section+='[Implementation, original art/audio and verification limits](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/SMALL_WAKES_RUNTIME.md). Rendered, human balance, native-language, listening and physical-device acceptance remain open.\n'
p=R/'docs/wiki/Bosses.md';p.write_text(p.read_text(encoding='utf8')+'\n'+section,encoding='utf8',newline='\n')
p=R/'docs/wiki/Art-Gallery.md';p.write_text(p.read_text(encoding='utf8')+'\n## Small Wakes runtime motion\n\n![Thirty-six selected Small Wakes idle, attack and defeat poses; static composite]('+root+'small-wakes-motion.jpg)\n\nTen unchanged natives/requests preserve nine selected sheets and one superseded Kettle idle. One scale per identity and complete alpha-bearing RGBA ownership retain all readable connected figures and faint edges. The lower kettle attack bridge has an explicit ownership boundary; independent reconstruction checks every selected source pixel, anchor, atlas and fallback crop. Total selected runtime motion is 1,542 poses. This image is a static composite; rendered motion and human/device acceptance remain open.\n',encoding='utf8',newline='\n')
p=R/'docs/wiki/Home.md';p.write_text(p.read_text(encoding='utf8')+'\n[Small Wakes](Bosses#small-wakes-three-new-ordinary-encounters) adds Candle Snail, Cobble Crab and Mourning Kettle with 36 selected poses, three individual scores and fifteen-locale phase help. The source roster is 66; 85 further ordinary identities remain. Protocol 20 carries known issued protocol 19 local saves/profiles forward; online remains strict. Total selected runtime motion is 1,542.\n',encoding='utf8',newline='\n')
audio='\n## Small Wakes original scores\n\nSlow Wick is a G-minor 9/8 plucked-droplet phrase at 88 BPM; Stones Remember is D-minor 5/4 struck keys with a low reed response at 104 BPM; Tea for the Absent is F-sharp-minor 6/8 descending reed/soft metal at 92 BPM. All 63 previous boss masters and score events stay unchanged. The current 66 boss themes plus City Wake have 67 MP3 deliveries: 70,569,830 bytes against 517,909,764 PCM bytes. Independent frame/SNR/headroom/DC/seam decode checks pass. The original masters remain bundled fallback. Listening, rendered/device playback and final mix acceptance stay open. [Exact delivery audit](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/small-wakes-2026-10-26/audio-delivery.json).\n'
for name in ['docs/wiki/Audio.md','docs/AUDIO_BIBLE.md']:
 p=R/name;p.write_text(p.read_text(encoding='utf8')+audio,encoding='utf8',newline='\n')
print(json.dumps({'images':len(m['files']),'newImages':len(added),'pages':len(list((R/'docs/wiki').glob('*.md'))),'previousImagesUnchanged':30}))
