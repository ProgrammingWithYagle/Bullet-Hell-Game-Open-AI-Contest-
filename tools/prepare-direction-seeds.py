"""Technical extraction only: preserve native reference art, normalize cells and build edit canvases."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
generated = Path(r'C:\Users\yigal\.codex\generated_images\01a165e7-035a-77b1-8805-de184d10c6fb')
pipeline = Path(r'C:\Users\yigal\.codex\plugins\cache\openai-curated-remote\game-studio\0.1.2\scripts')
sources = {
    'soldier': 'exec-6d037e8e-11ee-4fae-bb85-3a30965082d5.png',
    'medic': 'exec-0d3c8d69-0987-4674-b71f-f4a88f89ab65.png',
}
out = root / 'assets/proofs/directions'
out.mkdir(parents=True, exist_ok=True)
records = []
for class_id, native_name in sources.items():
    native = generated / native_name
    preserved = out / f'{class_id}-reference-v1.png'
    preserved.write_bytes(native.read_bytes())
    sheet = Image.open(native).convert('RGBA')
    width, height = sheet.size
    assert width % 2 == 0 and height % 2 == 0
    cells = []
    for index, direction in enumerate(['south', 'east', 'north', 'west']):
        x, y = index % 2 * width // 2, index // 2 * height // 2
        cell = sheet.crop((x, y, x + width // 2, y + height // 2))
        box = cell.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        assert box is not None, (class_id, direction)
        cells.append((direction, cell.crop(box), box))
    # A single scale per character protects proportions across all four views.
    scale = min(216 / max(cell.height for _, cell, _ in cells), 234 / max(cell.width for _, cell, _ in cells))
    for direction, cell, box in cells:
        normalized = Image.new('RGBA', (256, 256))
        scaled = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.Resampling.LANCZOS)
        normalized.alpha_composite(scaled, ((256 - scaled.width) // 2, 232 - scaled.height))
        seed = out / f'{class_id}-{direction}-seed.png'
        normalized.save(seed)
        canvas = root / 'tmp/directions' / f'{class_id}-{direction}-edit.png'
        subprocess.run([sys.executable, str(pipeline / 'build_sprite_edit_canvas.py'), '--seed', str(seed), '--out', str(canvas), '--frames', '4', '--slot-size', '256', '--canvas-size', '1024'], check=True)
        records.append({'classId': class_id, 'direction': direction, 'native': preserved.relative_to(root).as_posix(), 'nativeSha256': hashlib.sha256(native.read_bytes()).hexdigest(), 'nativeSize': list(sheet.size), 'sourceCellContentBounds': box, 'sharedScale': scale, 'frameSize': [256, 256], 'pivot': [0.5, 232 / 256], 'seed': seed.relative_to(root).as_posix(), 'seedSha256': hashlib.sha256(seed.read_bytes()).hexdigest(), 'referenceCanvas': canvas.relative_to(root).as_posix()})
(out / 'normalization.json').write_text(json.dumps({'operation': 'Cell extraction, uniform per-character Lanczos scaling and bottom-center alignment; no creative pixel edits.', 'entries': records}, indent=2) + '\n', encoding='utf8')
print(json.dumps({'seeds': len(records), 'output': str(out)}))
