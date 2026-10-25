"""Technical whole-pose packing for an art-only checkpoint; no runtime admission."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, importlib.util, json
import numpy as np

ROOT = Path(__file__).resolve().parent
REPO = Path(r'C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)')
EXTRACTOR = REPO / 'reviews/constable-motion-2026-10-25/whole-pose-components.py'
spec = importlib.util.spec_from_file_location('whole_pose_components', EXTRACTOR)
whole = importlib.util.module_from_spec(spec)
spec.loader.exec_module(whole)
OUT = ROOT / 'checkpoint'
OUT.mkdir(exist_ok=True)
CELL, HEIGHT, ANCHOR = 768, 248, (384, 640)
chosen = [('idle', 2), ('hop', 2), ('defeat', 1)]
sha = lambda b: hashlib.sha256(b).hexdigest()
records = []
atlas = Image.new('RGBA', (CELL * 4, CELL * 3))
contact = Image.new('RGB', (1720, 1140), '#14252a')
draw = ImageDraw.Draw(contact)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 21)
small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 17)
draw.text((28, 18), 'BRASS TOAD / art-only motion checkpoint', font=font, fill='#e8ddbd')
draw.text((28, 51), '12 complete poses; provisional shared ground anchor. Not a playable encounter or engine capture.', font=small, fill='#bdcaca')
for row, (clip, version) in enumerate(chosen):
    name = f'brass-toad-{clip}-v{version}.png'
    native = Image.open(ROOT / 'motion-natives' / name).convert('RGBA')
    rgba = np.array(native)
    prior_file = OUT/'packing.json'
    prior = json.loads(prior_file.read_text(encoding='utf-8')) if prior_file.exists() else None
    cached = next((c for c in prior['clips'] if c['clip']==clip),None) if prior else None
    if cached and cached['nativeSha256']==sha((ROOT/'motion-natives'/name).read_bytes()):
        owner = np.load(OUT/f'brass-toad-{clip}-owners.npz')['owner']
        assert np.array_equal(owner>0,rgba[:,:,3]>0)
        pieces,rects = [],[]
        for n in range(1,5):
            ys,xs=np.where(owner==n); rect=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
            x0,y0,x1,y1=rect; piece=rgba[y0:y1,x0:x1].copy();piece[owner[y0:y1,x0:x1]!=n]=0
            pieces.append(Image.fromarray(piece));rects.append(rect)
    else:
        owner, pieces, rects, major = whole.extract(native, 2, 2)
    # Exact all-alpha-bearing RGBA reconstruction, including faint disconnected edge pixels.
    reconstructed = np.zeros_like(rgba)
    for n, (piece, rect) in enumerate(zip(pieces, rects), 1):
        x0,y0,x1,y1 = rect
        target = reconstructed[y0:y1,x0:x1]
        mask = owner[y0:y1,x0:x1] == n
        target[mask] = np.array(piece)[mask]
    live = rgba[:,:,3] > 0
    assert np.array_equal(reconstructed[:,:,3], rgba[:,:,3])
    assert np.array_equal(reconstructed[live], rgba[live])
    first = pieces[0].getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
    assert first
    scale = HEIGHT / (first[3] - first[1])
    frames = []
    draw.text((28, 96 + row * 340), f'{clip.upper()} / four poses', font=small, fill='#dbcaa0')
    for col, (piece, rect) in enumerate(zip(pieces, rects)):
        w,h = round(piece.width * scale), round(piece.height * scale)
        assert w <= CELL - 32 and h <= CELL - 32, (clip, col, w, h)
        resized = piece.resize((w,h), Image.Resampling.LANCZOS)
        visible=resized.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
        assert visible
        # Keep all faint pixels, but anchor the readable body instead of stray alpha-1 flecks.
        x,y = ANCHOR[0] - (visible[0]+visible[2])//2, ANCHOR[1] - visible[3]
        assert min(x,y,CELL-(x+w),CELL-(y+h)) >= 16, (clip,col,x,y,w,h)
        frame = Image.new('RGBA', (CELL,CELL))
        frame.paste(resized, (x,y))
        frame_name = f'brass-toad-{clip}-{col+1:02d}.png'
        frame.save(OUT/frame_name)
        atlas.paste(frame, (col*CELL,row*CELL))
        # An illustrative 124px upright body, a single scale for every pose in this clip.
        thumb = frame.resize((384,384),Image.Resampling.LANCZOS)
        contact.paste(thumb, (30+col*420,82+row*340),thumb)
        draw.line((30+col*420,402+row*340,414+col*420,402+row*340),fill='#425156')
        frames.append({'index':col,'sourceRect':rect,'sourceAlphaPixels':int((owner==col+1).sum()),
                       'file':frame_name,'bytes':(OUT/frame_name).stat().st_size,
                       'sha256':sha((OUT/frame_name).read_bytes()),'resizedSize':[w,h],'paste':[x,y],
                       'visibleAlpha16Bounds':list(visible)})
    np.savez_compressed(OUT/f'brass-toad-{clip}-owners.npz',owner=owner)
    records.append({'clip':clip,'version':version,'native':name,'nativeSha256':sha((ROOT/'motion-natives'/name).read_bytes()),
                    'partition':'Complete connected-figure ownership with all nonzero-alpha pixels retained; no limb articulation or alpha cleanup.',
                    'uprightCalibrationAlpha16':list(first),'uniformScale':scale,'frames':frames,
                    'reconstruction':{'alphaExact':True,'allNonzeroAlphaRgbaExact':True,'nativeAlphaPixels':int(live.sum())}})
atlas.save(OUT/'brass-toad-candidate-atlas.png')
contact.save(OUT/'brass-toad-motion-checkpoint.jpg',quality=92,subsampling=0)
report={'stage':'early-watch-motion-2026-10-25','status':'Technically normalized art-only candidates; no runtime asset-index change',
        'identity':'brass-toad','completeCandidatePoses':12,'generatedSheets':4,'selectedSheets':3,
        'cellSize':CELL,'uprightBodyHeight':HEIGHT,'anchor':list(ANCHOR),'anchorMethod':'Bottom-center of readable alpha >=16 bounds, retaining every faint alpha-bearing pixel in the surrounding cell.',
        'atlasColumns':4,'atlasRows':3,
        'extractorSha256':sha(EXTRACTOR.read_bytes()),'clips':records,
        'rejected':[{'native':'brass-toad-hop-v1.png','reason':'Insufficient outer/slot padding and overlapping horizontal extents. Actual clipping was not established.'}],
        'limits':['No encounter, individual music, root-motion/lift integration or rendered acceptance is supplied by this checkpoint.',
                  'First upright pose calibrates each native clip to the same body height; shorter action and defeat poses are not individually resized.',
                  'Complete native bytes preserve hidden RGB below alpha zero. Reconstruction checks all alpha and all RGBA where alpha is nonzero.',
                  'World-size contact is a static provisional scale reference; engine pacing and transitions remain pending.']}
(OUT/'packing.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'passed':True,'poses':12,'cellSize':CELL,'atlasSize':atlas.size,'clips':[{'clip':r['clip'],'scale':r['uniformScale']} for r in records]}))
