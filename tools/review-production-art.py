"""Inventory native art and make labeled static size proofs, never paint source art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reviews/art-production-2026-10-23'
MANIFEST = ROOT / 'docs/art-production-2026-10-23.json'
manifest = json.loads(MANIFEST.read_text(encoding='utf8'))
selected = [r for r in manifest['requests'] if r.get('decision') == 'accepted-reference']
assert len(selected) == 8, 'Expected five survivor and three boss references'
OUT.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 14)
small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 12)
records = []
cells_by_id = {}
for request in manifest['requests']:
    path = ROOT / request['file']
    assert path.is_file(), 'Missing generated native: ' + request['file']
    assert request.get('prompt') and request.get('original'), 'Missing exact provenance'
    original = Path(request['original'])
    if original.is_file():
        assert hashlib.sha256(original.read_bytes()).digest() == hashlib.sha256(path.read_bytes()).digest(), 'Native copy differs'
    im = Image.open(path)
    assert im.mode == 'RGBA', 'Expected native alpha, not background removal'
    assert im.getchannel('A').getextrema() == (0, 255), 'Expected genuine alpha range'
    columns, rows = (2, 2) if '/survivors/' in request['file'] else (3, 1)
    cells, audit = [], []
    for y in range(rows):
        for x in range(columns):
            bounds = (x * im.width // columns, y * im.height // rows,
                      (x + 1) * im.width // columns, (y + 1) * im.height // rows)
            cell = im.crop(bounds)
            mask = cell.getchannel('A').point(lambda value: 255 if value >= 16 else 0)
            box = mask.getbbox()
            assert box, 'Empty art cell'
            clearance = min(box[0], box[1], cell.width - box[2], cell.height - box[3])
            if request.get('decision') == 'accepted-reference':
                assert clearance > 0, 'Selected art touches a cell edge: ' + request['id']
            # This crop/resample is a review derivative only; originals and alpha
            # stay unchanged. One common scale is used for all views of an ID.
            cells.append(cell.crop(box))
            audit.append({'cell': [x, y], 'bounds': bounds, 'alpha16Bounds': box,
                          'alpha16EdgeClearancePixels': clearance})
    cells_by_id[request['id']] = cells
    records.append({'id': request['id'], 'file': request['file'],
                    'decision': request['decision'], 'bytes': path.stat().st_size,
                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                    'width': im.width, 'height': im.height, 'mode': im.mode, 'cells': audit})

proofs = []
for family, target, columns, row_height, column_width in [
        ('survivors', 56, 4, 175, 225), ('bosses', 150, 3, 370, 470)]:
    entries = [r for r in selected if '/' + family + '/' in r['file']]
    for hazards in (False, True):
        width, height = 155 + columns * column_width, 72 + row_height * len(entries)
        canvas = Image.new('RGBA', (width, height), '#142a27')
        draw = ImageDraw.Draw(canvas)
        title = f'STATIC ART REVIEW: {family}, common scale per identity, 1x {target}px / 2x'
        draw.text((18, 10), title, font=font, fill='#f4e7c8')
        draw.text((18, 32), 'Not runtime animation, simulation, browser, phone or human evidence.', font=small, fill='#c7cfba')
        for row, entry in enumerate(entries):
            cells = cells_by_id[entry['id']]
            factor = target / max(cell.height for cell in cells)
            top = 60 + row * row_height
            name = entry['id'].split('-four-view')[0].split('-pose-study')[0]
            draw.text((12, top + 18), name, font=font, fill='#f4e7c8')
            draw.text((12, top + 40), 'static reference', font=small, fill='#c7cfba')
            labels = ['south', 'east', 'north', 'west'] if family == 'survivors' else ['neutral', 'east profile', 'anticipation']
            for i, cell in enumerate(cells):
                left = 155 + i * column_width
                draw.text((left, top), labels[i] + '  |  1x / 2x', font=small, fill='#c7cfba')
                baseline = top + row_height - 14
                for multiple, center in [(1, left + column_width * .23), (2, left + column_width * .67)]:
                    sprite = cell.resize((max(1, round(cell.width * factor * multiple)),
                                          max(1, round(cell.height * factor * multiple))), Image.Resampling.LANCZOS)
                    canvas.alpha_composite(sprite, (round(center - sprite.width / 2), baseline - sprite.height))
        if hazards:
            # Deliberately illustrative, not sampled game entities or hitboxes.
            draw = ImageDraw.Draw(canvas)
            for y in range(88, height - 15, 59):
                for x in range(170 + (y % 3) * 13, width - 12, 73):
                    draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill='#e9b35b', outline='#6b2928')
            draw.text((18, height - 17), 'Illustrative hazard overlay only; source art is unchanged.', font=small, fill='#f4e7c8')
        path = OUT / (family + ('-hazard-proof.png' if hazards else '-quiet-proof.png'))
        canvas.convert('RGB').save(path)
        proofs.append({'path': path.relative_to(ROOT).as_posix(), 'width': width, 'height': height,
                       'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'syntheticHazardOverlay': hazards})

report_path = OUT / 'inventory.json'
report = {'schemaVersion': 1, 'structuralChecksPassed': True, 'nativeRequests': len(records),
          'selectedReferences': len(selected), 'selectedSurvivorViews': 20, 'selectedBossPoses': 9,
          'manifestSha256': hashlib.sha256(MANIFEST.read_bytes()).hexdigest(),
          'nativeSources': records, 'staticProofs': proofs,
          'assistantStaticReview': 'pending', 'humanReviewPerformed': False,
          'runtimeIntegrated': False, 'animationReviewPerformed': False,
          'limits': ['Fixed-grid boundaries are provisional, not animation-ready atlases.',
                    'One scale per identity; tallest source view including props maps to 56/150 pixels.',
                    'Static alpha compositing and illustrative hazards, not the Phaser renderer or game simulation.',
                    'No physical-device, native-speaker or human aesthetic approval.']}
if '--record-static-reviewed' in sys.argv:
    assert report_path.is_file(), 'Prepare and inspect the exact proof images first'
    old = json.loads(report_path.read_text(encoding='utf8'))
    assert old['manifestSha256'] == report['manifestSha256'], 'Manifest changed since inspection'
    assert old['staticProofs'] == report['staticProofs'], 'Proof changed since inspection'
    report['assistantStaticReview'] = 'Native sheets and quiet/hazard proofs at 1x and 2x inspected; accepted as static references only.'
report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
print(json.dumps({'structuralChecksPassed': True, 'nativeRequests': len(records),
                  'selectedReferences': len(selected), 'assistantStaticReview': report['assistantStaticReview']}))
