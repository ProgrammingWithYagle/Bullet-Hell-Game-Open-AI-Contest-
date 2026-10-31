"""Technical normalization only: native crops, one class scale and shared feet anchor."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
import hashlib

ROOT = Path(__file__).resolve().parent.parent
CELL = 256
PIVOT = (128, 232)
SOURCES = {
    'soldier': {'north': 'soldier-north-walk-v2.png', 'south': 'soldier-south-walk-v1.png'},
    'medic': {'north': 'medic-north-walk-v4.png', 'south': 'medic-south-walk-v4.png'},
}
records = []
preview = Image.new('RGB', (1024, 4 * 300), '#e7ddc1')
row = 0
for class_id, directions in SOURCES.items():
    strips = []
    for direction, name in directions.items():
        path = ROOT / 'assets/proofs/directions' / name
        native = Image.open(path).convert('RGBA')
        cells = []
        for n in range(4):
            rect = (round(n * native.width / 4), 0, round((n + 1) * native.width / 4), native.height)
            cell = native.crop(rect)
            box = cell.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
            if not box:
                raise ValueError(f'Empty cell: {path}:{n}')
            cells.append((cell.crop(box), box))
        strips.append((direction, path, native, cells))
    scale = min(208 / max(cell.height for *_, cells in strips for cell, box in cells),
                224 / max(cell.width for *_, cells in strips for cell, box in cells))
    for direction, path, native, cells in strips:
        atlas = Image.new('RGBA', (4 * CELL, CELL))
        out_dir = ROOT / 'assets/sprites' / class_id
        out_dir.mkdir(parents=True, exist_ok=True)
        bounds = []
        for n, (cell, box) in enumerate(cells):
            size = (round(cell.width * scale), round(cell.height * scale))
            resized = cell.resize(size, Image.Resampling.LANCZOS)
            frame = Image.new('RGBA', (CELL, CELL))
            frame.alpha_composite(resized, ((CELL - size[0]) // 2, PIVOT[1] - size[1]))
            atlas.alpha_composite(frame, (n * CELL, 0))
            # Two compositing grounds expose alpha edges without changing the asset.
            ground = Image.new('RGB', (CELL, CELL), '#e7ddc1' if n % 2 == 0 else '#172b29')
            ground.paste(frame, (0, 0), frame)
            preview.paste(ground, (n * CELL, row * 300 + 30))
            bounds.append(list(box))
        target = out_dir / f'{direction}-walk.png'
        atlas.save(target)
        ImageDraw.Draw(preview).text((12, row * 300 + 8), f'{class_id} {direction}', fill='#172b29')
        records.append({'classId': class_id, 'direction': direction,
                        'source': path.relative_to(ROOT).as_posix(),
                        'sourceSize': list(native.size), 'sourceBounds': bounds,
                        'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                        'atlas': target.relative_to(ROOT).as_posix(),
                        'atlasSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                        'sharedClassScale': scale, 'cellSize': [256, 256],
                        'pivot': [0.5, 232 / 256], 'frames': 4, 'fps': 8})
        row += 1
preview_path = ROOT / 'assets/proofs/directions/walk-preview.png'
preview.save(preview_path)
(ROOT / 'assets/proofs/directions/walk-normalization.json').write_text(json.dumps({
    'operation': 'Equal-slot extraction; alpha threshold 8 for bounds only; uniform scale per class; Lanczos resize, bottom-center alpha compositing. No painting, recoloring or alpha deletion.',
    'entries': records,
}, indent=2) + '\n', encoding='utf8')
print(json.dumps({'atlases': len(records), 'preview': str(preview_path)}))
