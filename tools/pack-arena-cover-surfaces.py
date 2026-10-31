"""Extract six cells from the preserved generated atlas; no painting or source edits."""
from pathlib import Path
from PIL import Image
import hashlib
import json

root = Path(__file__).resolve().parents[1]
native = root / 'assets/production/generated/arena-cover-2026-10-29/cover-surfaces-v1.png'
request = native.with_suffix('.request.json')
atlas = Image.open(native).convert('RGBA')
target = root / 'assets/production/arena-cover-surfaces'
target.mkdir(exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
ids = ['gatehouse', 'triage-yard', 'ossuary-works', 'sunken-chapel', 'bell-foundry', 'crown-crypt']
entries = []
for index, arena in enumerate(ids):
    column, row = index % 2, index // 2
    cell = (round(column * atlas.width / 2), round(row * atlas.height / 3),
            round((column + 1) * atlas.width / 2), round((row + 1) * atlas.height / 3))
    image = atlas.crop(cell)
    bounds = image.getchannel('A').getbbox()
    assert bounds
    frame = image.crop(bounds)
    path = target / (arena + '-v1.png')
    assert not path.exists(), 'Preserve previously issued surface'
    frame.save(path)
    entries.append(dict(id=arena, texture='arena-cover-' + arena, image=path.relative_to(root).as_posix(),
                        sha256=sha(path), sourceCell=list(cell), alphaCrop=list(bounds),
                        width=frame.width, height=frame.height, cap=round(frame.height * .34),
                        decodedRgbaBytes=frame.width * frame.height * 4))
manifest = target / 'library.json'
assert not manifest.exists()
manifest.write_text(json.dumps(dict(schemaVersion=1, source=native.relative_to(root).as_posix(),
    sourceSha256=sha(native), request=request.relative_to(root).as_posix(), requestSha256=sha(request),
    sourceTool='image_gen.imagegen', packingTool='tools/pack-arena-cover-surfaces.py',
    packingToolSha256=sha(Path(__file__)), entries=entries,
    scope='Six painted cover surfaces. Technical cell extraction only; original native and prompt preserved. No browser/human acceptance.'), indent=2) + '\n', encoding='utf8')
print(json.dumps(dict(passed=True, surfaces=len(entries), decodedRgbaBytes=sum(e['decodedRgbaBytes'] for e in entries))))
