"""Deterministic source-cell slicing/resampling/padding, never creative redrawing."""
from pathlib import Path
from PIL import Image, ImageDraw
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/proofs/animation';OUT.mkdir(parents=True,exist_ok=True)
specs=[('soldier-run',256,56,.86,10),('boss-attack',512,150,.84,10)]
records=[]
for name,size,display,pivot_y,fps in specs:
    source=Image.open(ROOT/f'assets/proofs/{name}-v1.png').convert('RGBA');original_size=source.size;w,h=source.size
    if w%4 or h%2:
        padded=Image.new('RGBA',(((w+3)//4)*4,((h+1)//2)*2),(0,0,0,0));padded.alpha_composite(source);source=padded;w,h=source.size
    sw,sh=w//4,h//2
    # One common resample scale across all eight frames preserves character proportions.
    # Anchors are fixed source-cell coordinates, not per-frame bounding-box scale fits.
    source_anchor=(round(sw*.55),round(sh*.97)) if name=='soldier-run' else (round(sw*.5),round(sh*.97))
    scale=min(size*.8/sw,size*.8/sh)
    target_anchor=(round(size*.5),round(size*pivot_y))
    frames=[];measurements=[]
    for i in range(8):
        cell=source.crop(((i%4)*sw,(i//4)*sh,(i%4+1)*sw,(i//4+1)*sh))
        alpha=cell.getchannel('A');box=alpha.point(lambda v:255 if v>32 else 0).getbbox();assert box
        resized=cell.resize((round(sw*scale),round(sh*scale)),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(size,size),(0,0,0,0));offset=(target_anchor[0]-round(source_anchor[0]*scale),target_anchor[1]-round(source_anchor[1]*scale))
        canvas.alpha_composite(resized,offset)
        assert canvas.getchannel('A').getextrema()[0]==0
        frames.append(canvas)
        canvas.save(OUT/f'{name}-{i}.png')
        measurements.append({'frame':i,'sourceAlphaBounds':box,'sourceAnchor':source_anchor,'targetAnchor':target_anchor,'resampleScale':scale,'targetAlphaBounds':canvas.getchannel('A').getbbox()})
    atlas=Image.new('RGBA',(size*4,size*2),(0,0,0,0))
    for i,frame in enumerate(frames):atlas.alpha_composite(frame,((i%4)*size,(i//4)*size))
    atlas.save(OUT/f'{name}-atlas.png')
    animation=[]
    for frame in frames:
        # A review-only matte backdrop, at actual intended gameplay character height and 2x.
        preview=Image.new('RGB',(600,500),'#253b36')
        rendered=frame.resize((round(size*display/(size*.8)),round(size*display/(size*.8))),Image.Resampling.LANCZOS)
        x=130-rendered.width//2;y=430-round(rendered.height*pivot_y)
        preview.paste(rendered,(x,y),rendered)
        doubled=rendered.resize((rendered.width*2,rendered.height*2),Image.Resampling.NEAREST)
        preview.paste(doubled,(390-doubled.width//2,430-round(doubled.height*pivot_y)),doubled)
        draw=ImageDraw.Draw(preview);draw.text((28,18),name+' / gameplay size and 2x / '+str(fps)+' FPS',fill='#e9e2cd')
        animation.append(preview)
    animation[0].save(OUT/f'{name}-preview.gif',save_all=True,append_images=animation[1:],duration=round(1000/fps),loop=0,disposal=2)
    records.append({'id':name,'source':f'assets/proofs/{name}-v1.png','atlas':f'assets/proofs/animation/{name}-atlas.png','originalSourceSize':original_size,'paddedSourceSize':[w,h],'cellSize':size,'frameCount':8,'fps':fps,'alpha':True,'pivot':[.5,pivot_y],'maximumPivotError':0,'pivotMeasurement':'All target anchors are identical by deterministic fixed-anchor packing; animated boot height is not mistaken for a changing atlas origin.','processing':'Equal-grid crop, one shared scale, translation and transparent padding only; no generated pixels or creative redraw.','frames':measurements,'motionReviewPassed':False})
    metadata={'frameWidth':size,'frameHeight':size,'columns':4,'rows':2,'frameCount':8,'fps':fps,'origin':[.5,pivot_y],'frames':[{'x':i%4*size,'y':i//4*size,'width':size,'height':size} for i in range(8)]}
    (OUT/f'{name}-atlas.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf8')
(ROOT/'reviews/animation-review.json').write_text(json.dumps({'schemaVersion':1,'passed':False,'reviewStatus':'Packed and measured; visual motion review pending.','animations':records},indent=2)+'\n',encoding='utf8')
html='''<!doctype html><meta charset="utf-8"><title>Grave Accord animation proofs</title><style>body{background:#172c28;color:#e9e2cd;font:17px system-ui;margin:32px}section{display:inline-block;vertical-align:top}img{max-width:95vw}button{font:inherit;margin:8px}code{color:#b5cdb4}canvas{background:#253b36}</style><h1>Grave Accord — animation proof review</h1><p>Original generated frames, fixed-anchor atlas packing; 10 FPS. Review gameplay size, 2x and the full source sheets. This is an art review, not gameplay.</p>'''
for name,*_ in specs:html+=f'<section><h2>{name}</h2><img src="{name}-preview.gif" alt="Animated {name} proof"><p><a href="../{name}-v1.png">Source sheet</a> · <a href="{name}-atlas.png">Packed atlas</a></p></section>'
(OUT/'index.html').write_text(html,encoding='utf8')
print(json.dumps({'animations':len(records),'frames':16,'motionReviewPending':True}))
