"""Pack accepted static references without repainting, mirroring or changing alpha.

This is atlas preparation, not animation manufacture. Each identity shares one
scale; feet are measured once per static view. Motion sheets use fixed source
anchors in pack-production-motion.py instead of bounding-box recentering.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/art-production-2026-10-23.json'
OUT = ROOT / 'assets/production/normalized'
REVIEW = ROOT / 'reviews/art-normalization-2026-10-23'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def feet_anchor(cell, bounds):
    """Alpha-weighted boot center, ignoring hand/weapon silhouette width.

    The lower ten percent is an explicit starting measurement, not a rig or
    anatomy certification. The receipt and review crosshair expose this choice.
    """
    mask = cell.getchannel('A')
    top = bounds[3] - max(2, round((bounds[3] - bounds[1]) * .10))
    weight = 0
    horizontal = 0
    for y in range(top, bounds[3]):
        for x in range(bounds[0], bounds[2]):
            alpha = mask.getpixel((x, y))
            if alpha >= 16:
                weight += alpha
                horizontal += (x + .5) * alpha
    assert weight, 'No ground-contact pixels'
    return [round(horizontal / weight), bounds[3]]


def normalize():
    OUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    requests = json.loads(SOURCE.read_text(encoding='utf8'))['requests']
    selected = [entry for entry in requests if entry.get('decision') == 'accepted-reference']
    assert len(selected) == 8, 'Reconcile selected native references before repacking'
    entries = []
    receipts = []
    for entry in selected:
        source = ROOT / entry['file']
        source_hash = sha(source)
        native = Image.open(source)
        assert native.mode == 'RGBA'
        family = 'survivors' if '/survivors/' in entry['file'] else 'bosses'
        identity = source.parent.name
        columns, rows = (2, 2) if family == 'survivors' else (3, 1)
        labels = ['south', 'east', 'north', 'west'] if family == 'survivors' else ['neutral', 'east profile', 'anticipation']
        cell_size = 256 if family == 'survivors' else 512
        pivot = [.5, .86 if family == 'survivors' else .84]
        target = [round(cell_size * coordinate) for coordinate in pivot]
        margin = round(cell_size * .06)
        cells = []
        scales = []
        for index, label in enumerate(labels):
            col, row = index % columns, index // columns
            rect = [col * native.width // columns, row * native.height // rows,
                    (col + 1) * native.width // columns, (row + 1) * native.height // rows]
            cell = native.crop(rect)
            actual = cell.getchannel('A').getbbox()
            measured = cell.getchannel('A').point(lambda value: 255 if value >= 16 else 0).getbbox()
            assert actual and measured
            assert min(measured[0], measured[1], cell.width - measured[2], cell.height - measured[3]) > 0
            anchor = feet_anchor(cell, measured)
            for extent, space in [(anchor[0] - actual[0], target[0] - margin),
                                  (actual[2] - anchor[0], cell_size - target[0] - margin),
                                  (anchor[1] - actual[1], target[1] - margin),
                                  (actual[3] - anchor[1], cell_size - target[1] - margin)]:
                if extent > 0:
                    scales.append(space / extent)
            cells.append((label, cell, rect, actual, measured, anchor))
        # Reserve one pixel for filter support. Never fit each view independently.
        scale = min(scales) * .99
        atlas = Image.new('RGBA', (len(cells) * cell_size, cell_size))
        measurements = []
        tallest = 0
        for index, (label, cell, rect, actual, measured, anchor) in enumerate(cells):
            crop = cell.crop(actual)
            resized = crop.resize((max(1, round(crop.width * scale)),
                                   max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
            offset = [target[0] - round((anchor[0] - actual[0]) * scale),
                      target[1] - round((anchor[1] - actual[1]) * scale)]
            assert min(offset) >= 0
            assert offset[0] + resized.width <= cell_size and offset[1] + resized.height <= cell_size
            frame = Image.new('RGBA', (cell_size, cell_size))
            frame.alpha_composite(resized, offset)
            bounds = frame.getchannel('A').point(lambda value: 255 if value >= 16 else 0).getbbox()
            assert bounds
            clearance = min(bounds[0], bounds[1], cell_size - bounds[2], cell_size - bounds[3])
            assert clearance >= margin - 2, (identity, label, clearance)
            tallest = max(tallest, bounds[3] - bounds[1])
            atlas.alpha_composite(frame, (index * cell_size, 0))
            measurements.append({'label': label, 'sourceRect': rect, 'sourceAlphaBounds': actual,
                                 'sourceAlpha16Bounds': measured, 'sourceFootAnchor': anchor,
                                 'targetFootAnchor': target, 'offset': offset,
                                 'targetAlpha16Bounds': bounds, 'clearancePixels': clearance})
        dest = OUT / family / identity / 'reference-atlas-v1.png'
        dest.parent.mkdir(parents=True, exist_ok=True)
        atlas.save(dest)
        assert sha(source) == source_hash, 'Native source changed during packing'
        display_height = 56 if family == 'survivors' else 150
        asset = {'id': identity, 'name': identity.replace('-', ' ').title(), 'family': family,
                 'kind': 'static-reference', 'atlas': dest.relative_to(ROOT).as_posix(),
                 'source': entry['file'], 'sourceSha256': source_hash, 'atlasSha256': sha(dest),
                 'cellSize': cell_size, 'columns': len(cells), 'frames': len(cells),
                 'labels': labels, 'origin': [coordinate / cell_size for coordinate in target],
                 'displayHeight': display_height, 'displayCell': cell_size * display_height / tallest,
                 'fps': 0, 'status': 'Normalized reference; motion and gameplay pending'}
        if family == 'survivors':
            # UI portraits keep the native south-view pixels; do not enlarge a
            # 256px atlas frame or include neighboring directional views.
            _, south, source_rect, _, source_bounds, _ = cells[0]
            portrait_bounds = [max(0, source_bounds[0] - 12), max(0, source_bounds[1] - 12),
                               min(south.width, source_bounds[2] + 12), min(south.height, source_bounds[3] + 12)]
            portrait = dest.parent / 'portrait-south-v1.png'
            south.crop(portrait_bounds).save(portrait)
            asset['portrait'] = portrait.relative_to(ROOT).as_posix()
            asset['portraitSha256'] = sha(portrait)
            asset['portraitSourceRect'] = [source_rect[0] + portrait_bounds[0], source_rect[1] + portrait_bounds[1],
                                           source_rect[0] + portrait_bounds[2], source_rect[1] + portrait_bounds[3]]
            asset['portraitCropPolicy'] = 'Native south-view alpha16 bounds plus 12px clearance, clipped to its source cell. Geometric crop only; all retained RGBA values are unchanged.'
        entries.append(asset)
        receipts.append({**asset, 'sourceSize': list(native.size), 'uniformScale': scale,
                         'anchorMethod': 'Alpha-weighted horizontal center in bottom 10 percent at alpha >=16; bottom contact. Inspect crosshairs before motion production.',
                         'measurements': measurements})
    library = {'schemaVersion': 1, 'entries': list(entries),
               'limits': ['Static poses are not animation frames.', 'This library is not loaded by the playable game.',
                          'Atlas preparation preserves source proportions and alpha; no paint, mirrors or invented views.']}
    # An optional reviewed motion pack extends this library without replacing refs.
    motion = ROOT / 'assets/production/motion/library.json'
    if motion.is_file():
        library['entries'].extend(json.loads(motion.read_text(encoding='utf8'))['entries'])
    (OUT / 'library.json').write_text(json.dumps(library, indent=2) + '\n', encoding='utf8', newline='\n')
    report = {'schemaVersion': 1, 'structuralChecksPassed': True,
              'sourceManifest': SOURCE.relative_to(ROOT).as_posix(), 'sourceManifestSha256': sha(SOURCE),
              'operation': 'Equal-grid extraction, measured static foot anchors, one uniform Lanczos scale per identity and transparent padding; original native alpha and art preserved.',
              'selectedIdentities': len(receipts), 'survivorViews': 20, 'bossPoses': 9,
              'entries': receipts, 'assistantAnchorReview': 'pending', 'humanReviewPerformed': False}
    # A deterministic native-cell contact sheet exposes all target anchors.
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15)
    proof = Image.new('RGB', (1600, 102 + sum(218 if entry['family'] == 'survivors' else 380 for entry in entries)), '#172b29')
    draw = ImageDraw.Draw(proof)
    draw.text((20, 14), 'NORMALIZED STATIC REFERENCES | 56px survivors / 150px bosses, plus 2x', font=font, fill='#eadfc5')
    draw.text((20, 39), 'Crosshair = measured feet anchor. Same scale per identity. This is an art preparation proof, not gameplay.', font=font, fill='#b9c9bd')
    top = 85
    for asset in entries:
        atlas = Image.open(ROOT / asset['atlas'])
        row_height = 218 if asset['family'] == 'survivors' else 380
        draw.text((14, top), asset['name'], font=font, fill='#eadfc5')
        for index, label in enumerate(asset['labels']):
            left = 190 + index * (242 if asset['family'] == 'survivors' else 460)
            draw.text((left, top), label, font=font, fill='#b9c9bd')
            cell = atlas.crop((index * asset['cellSize'], 0, (index + 1) * asset['cellSize'], asset['cellSize']))
            centers = [(1, left + 43), (2, left + 151)] if asset['family'] == 'survivors' else [(1, left + 95), (2, left + 300)]
            for multiple, center in centers:
                size = round(asset['displayCell'] * multiple)
                sprite = cell.resize((size, size), Image.Resampling.LANCZOS)
                anchor = (center, top + row_height - 18)
                x = round(anchor[0] - size * asset['origin'][0])
                y = round(anchor[1] - size * asset['origin'][1])
                proof.paste(sprite, (x, y), sprite)
                draw.line((anchor[0] - 5, anchor[1], anchor[0] + 5, anchor[1]), fill='#c18e5e')
                draw.line((anchor[0], anchor[1] - 5, anchor[0], anchor[1] + 5), fill='#c18e5e')
        top += row_height
    proof_path = REVIEW / 'normalized-contact-sheet.png'
    proof.save(proof_path)
    report['contactSheet'] = {'path': proof_path.relative_to(ROOT).as_posix(), 'sha256': sha(proof_path)}
    report_path = REVIEW / 'normalization.json'
    if report_path.is_file():
        previous = json.loads(report_path.read_text(encoding='utf8'))
        if previous.get('entries') == receipts and previous.get('contactSheet') == report['contactSheet']:
            report['assistantAnchorReview'] = previous.get('assistantAnchorReview', 'pending')
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf8', newline='\n')
    print(json.dumps({'identities': len(receipts), 'staticPoses': 29, 'structuralChecksPassed': True,
                      'review': str(proof_path)}))


if __name__ == '__main__':
    normalize()
