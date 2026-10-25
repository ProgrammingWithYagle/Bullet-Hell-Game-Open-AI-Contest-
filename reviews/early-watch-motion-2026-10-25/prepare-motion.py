from pathlib import Path
from PIL import Image
import hashlib,json,subprocess
w=Path(__file__).resolve().parent
r=Path(r'C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)')
refs=w/'references';requests=w/'requests';refs.mkdir(exist_ok=True);requests.mkdir(exist_ok=True)
builder=Path(r'C:\Users\yigal\.codex\plugins\cache\openai-curated-remote\game-studio\0.1.2\scripts\build_sprite_edit_canvas.py')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
base=('Use case: identity-preserve. Asset type: complete animation poses for this exact original Grave Accord boss. Image 1 is the inspected complete identity reference; Image 2 is a transparent prepared extension canvas carrying a scaled complete seed, not a desired mostly blank output. Generate the ENTIRE requested FOUR-pose sheet in ONE edit. Preserve the exact identity, anatomy, camera, reference facing, construction, colors and restrained dry-ink/matte-gouache finish. Each pose is one separate COMPLETE figure with generous genuinely transparent gutters. Keep one physical body scale throughout, including naturally compressed or fallen poses. Do not enlarge a short pose or crop a long pose. Frame 1 is the original resting reference stance for scale calibration. No floor, cast shadow, scenery, aura, fog, water, particles, motion streaks, labels, letters, numbers, grid lines, frame borders or glossy 3D. True transparent RGBA. Every extremity and accessory stays inside its slot. ')
specs={
 'ashen-usher':{
 'walk':('horizontal','Slow ominous walking loop: 1 original resting stance; 2 short leading step; 3 weight passes over the planted shoe; 4 opposite foot leads and eases toward the initial stance. Preserve ashen face, grey hair, plain brick-red jacket, dark trousers and two complete shoes. Same original supporting hand holds the wooden three-compartment ticket rack; the original pointing hand stays on its original side. Two arms and two hands only. Subtle coat movement, stable ticket groups, no attack.'),
 'call':('horizontal','Ticket-call action: 1 original resting stance; 2 original free pointing hand rises slightly, rack tilts toward viewer; 3 same free hand extends toward an aisle decisively, other hand securely supports rack; 4 settles toward the original stance. Feet stay planted. One wooden three-compartment rack, two hands, no tossed tickets or new props.'),
 'defeat':('grid','Quiet complete collapse: 1 original upright stance with rack; 2 knees buckle, pointing arm lowers; 3 body slumps onto one hip and rack tips naturally; 4 whole usher lies still on his side, intact rack and ticket groups beside original supporting hand. Keep original physical body scale; naturally short wide final pose. Both complete legs and shoes, coat and head always visible. No gore, dust, disappearance or magical dissolving.')},
 'brass-toad':{
 'idle':('horizontal','Subtle living-idle loop: 1 original resting stance; 2 throat expands a little, front shoulders take weight; 3 gentle exhale and small body settling; 4 returns toward initial stance. Preserve broad bronze toad head, blunt spout-mouth, dark amphibian eyes, correct original four-limb anatomy, all feet and one short back pipe. Muted patina and grounded feet. No extra legs, human features or added ornament.'),
 'hop':('horizontal','Hop action: 1 original quiet resting stance; 2 folded hind legs compress and body lowers to anticipate the jump; 3 whole toad is airborne in one compact forward hop, front feet lifted and hind legs extend backwards from the correct original joints; 4 lands in a front-foot brace, hind legs drawing back underneath. Exact original blunt mouth, bronze body, patina and single back pipe. Four limbs only, correctly attached; every toe visible or naturally occluded, no duplicated limbs. No landing splash, shadows, water or drawn motion. Leave room for the extended hind legs.'),
 'defeat':('grid','Heavy intact collapse: 1 original resting stance for calibration; 2 front legs sag and back pipe leans with the body; 3 belly settles low, mouth relaxes, hind legs spread naturally; 4 whole toad lies still as a heavy inactive fountain statue, original parts intact. Preserve original physical body scale, pipe, colors, and correct four-limb anatomy. Naturally shorter/wider settled silhouette. No shattering, disappearing parts, debris, glowing cracks, water or gore.')},
 'ragpicker-kite':{
 'float':('horizontal','Quiet hovering loop: 1 original resting bird-kite; 2 both cloth wings bow slightly upward around original wooden spars; 3 wings ease down while two ribbon tethers trail subtly; 4 settles toward original silhouette. Preserve central cloth diamond, folded beak, two stitched eye patches, two complete wings, TWO ribbon tethers, TWO wooden clothespins in their original attachments. No human limbs, added feathers, ropes or extra strips.'),
 'gust':('horizontal','Wing-gust action: 1 original hovering stance; 2 wings fold slightly inward in anticipation; 3 wings spread in a broad forceful beat, cloth tension follows original spars; 4 settles toward the original stance. Preserve patched oatmeal/indigo fabric, original beak, two stitched eyes, two ribbons and two clamp-like clothespins. Modest body scale so all wing tips and ribbons fit. No drawn wind, aura, dust, particles, extra cloth strips or broken parts.'),
 'defeat':('grid','Quiet folded collapse: 1 original hovering stance; 2 wings sag and two tethers hang limp; 3 central cloth folds down with both original spars still attached; 4 complete kite rests in a flattened folded heap, both cloth wings, beak, two pins and two tethers intact. Preserve original scale and natural shortening/widening; do not enlarge fallen poses. No disappearing cloth, extra ribbons, fragments, dust or floor.')}
}
contracts=[]
for boss,clips in specs.items():
 native=r/'assets/production/generated/early-watch-concepts-2026-10-25'/(boss+'-concept-v1.png')
 im=Image.open(native).convert('RGBA');bounds=im.getchannel('A').getbbox();pose=im.crop(bounds)
 factor=288/max(pose.size);dims=[round(pose.width*factor),round(pose.height*factor)]
 seed=Image.new('RGBA',(384,384));seed.alpha_composite(pose.resize(dims,Image.Resampling.LANCZOS),(192-dims[0]//2,336-dims[1]))
 seed_path=refs/(boss+'-complete-seed.png');assert not seed_path.exists();seed.save(seed_path)
 horizontal=refs/(boss+'-horizontal-edit-canvas.png')
 subprocess.run(['python','-X','utf8',str(builder),'--seed',str(seed_path),'--out',str(horizontal),'--frames','4','--slot-size','384','--canvas-size','1536'],check=True)
 grid=Image.new('RGBA',(1536,1536));grid.alpha_composite(seed,(192,192));grid_path=refs/(boss+'-grid-edit-canvas.png');grid.save(grid_path)
 for clip,(layout,detail) in clips.items():
  canvas=grid_path if layout=='grid' else horizontal
  arrangement=('FOUR separate complete poses in ONE HORIZONTAL ROW of FOUR equal ROOMY slots. ' if layout=='horizontal' else 'FOUR separate complete poses in a ROOMY TWO-COLUMN TWO-ROW grid, read left-to-right then top-to-bottom. The first upright pose must be modest enough to leave ample width in every slot for a long fallen body. ')
  request={'transparent_background':True,'referenced_image_paths':[str(native),str(canvas)],'prompt':base+arrangement+detail}
  target=requests/(boss+'-'+clip+'-v1.request.json');assert not target.exists();target.write_text(json.dumps(request,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
 contracts.append({'bossId':boss,'native':str(native),'nativeSha256':sha(native),'seed':str(seed_path),'seedSha256':sha(seed_path),'seedWholeAlphaBounds':bounds,'seedUniformScale':factor,'horizontal':str(horizontal),'horizontalSha256':sha(horizontal),'grid':str(grid_path),'gridSha256':sha(grid_path)})
(w/'motion-input-contracts.json').write_text(json.dumps({'builder':str(builder),'builderSha256':sha(builder),'identities':contracts,'preparedRequests':9,'generatedMotionSheets':0},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'preparedRequests':9,'completeSeeds':3,'referenceCanvases':6,'generatedMotionSheets':0}))
