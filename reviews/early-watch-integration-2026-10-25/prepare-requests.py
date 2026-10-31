from pathlib import Path
import json

repo=Path(r'C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)')
old=repo/'assets/production/generated/early-watch-motion-2026-10-25'
out=repo/'assets/production/generated/early-watch-integration-2026-10-25'
for sub in ['requests','natives','normalized']:(out/sub).mkdir(parents=True,exist_ok=True)
for boss,clips in [('ashen-usher',['walk','call','defeat']),('ragpicker-kite',['float','gust','defeat'])]:
    for clip in clips:
        original=old/'requests'/f'{boss}-{clip}-v1.request.json'
        req=json.loads(original.read_text(encoding='utf-8'))
        layout='grid' if clip=='defeat' else 'horizontal'
        req['referenced_image_paths'][1]=str(old/'references'/f'{boss}-{layout}-edit-canvas.png')
        req['prompt']+=' Output a complete sheet, with all FOUR figures at comparable physical scale. Keep each whole pose well separated from the others and from every canvas edge. Preserve the genuinely transparent background.'
        target=out/'requests'/f'{boss}-{clip}-v2.request.json'
        if not target.exists():target.write_text(json.dumps(req,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'prepared':6,'directory':str(out)}))
