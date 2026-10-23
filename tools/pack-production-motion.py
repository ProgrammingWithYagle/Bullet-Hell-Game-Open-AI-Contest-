"""Pack drawn motion frames using documented source gutters and planted feet.

The generator's sheet spacing is imperfect. Rectangles below split only empty
gutters; one common scale and measured translations create a fixed-cell atlas.
No alpha removal, interpolation, recoloring, flipping or creative redraw.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json
from runpy import run_path

ROOT = Path(__file__).resolve().parents[1]
feet_anchor = run_path(str(ROOT / 'tools/normalize-production-art.py'))['feet_anchor']

SOURCE = ROOT / 'assets/production/bosses/lantern-warden/attack-sheet-v2.png'
OUT = ROOT / 'assets/production/motion'
REVIEW = ROOT / 'reviews/art-normalization-2026-10-23'
CELL = 512
PIVOT = (256, 430)
RECTS = [[0,0,450,443], [450,0,895,443], [895,0,1315,443], [1315,0,1774,443],
         [0,443,480,887], [480,443,900,887], [900,443,1320,887], [1320,443,1774,887]]
LABELS = ['neutral', 'lift', 'shoulder', 'anticipation', 'release', 'return', 'lower', 'settle']
DURATIONS = [160, 260, 320, 460, 120, 160, 200, 180]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pack():
    OUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    native = Image.open(SOURCE)
    assert native.mode == 'RGBA' and native.size == (1774, 887)
    source_hash = sha(SOURCE)
    cells = []
    reconstructed = Image.new('RGBA', native.size)
    for index, rect in enumerate(RECTS):
        cell = native.crop(rect)
        reconstructed.paste(cell, (rect[0], rect[1]))
        bounds = cell.getchannel('A').getbbox()
        visible = cell.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
        assert bounds and visible
        assert min(visible[0], visible[1], cell.width - visible[2], cell.height - visible[3]) > 0, 'A source rectangle cuts visible art'
        # The requested action has planted feet. Explicit per-frame measured
        # translations correct source layout drift, not body scale or timing.
        anchor = feet_anchor(cell, visible)
        cells.append((cell, bounds, visible, anchor))
    assert reconstructed.tobytes() == native.tobytes(), 'Source rectangles must tile the complete native without loss'
    scales = []
    for cell, bounds, visible, anchor in cells:
        for extent, space in [(anchor[0]-bounds[0], PIVOT[0]-32),
                              (bounds[2]-anchor[0], CELL-PIVOT[0]-32),
                              (anchor[1]-bounds[1], PIVOT[1]-32),
                              (bounds[3]-anchor[1], CELL-PIVOT[1]-32)]:
            if extent > 0:
                scales.append(space / extent)
    scale = min(scales) * .99
    atlas = Image.new('RGBA', (CELL * 4, CELL * 2))
    packed, measurements = [], []
    tallest = 0
    for index, (cell, bounds, visible, anchor) in enumerate(cells):
        crop = cell.crop(bounds)
        size = (round(crop.width * scale), round(crop.height * scale))
        resized = crop.resize(size, Image.Resampling.LANCZOS)
        offset = (PIVOT[0] - round((anchor[0] - bounds[0]) * scale),
                  PIVOT[1] - round((anchor[1] - bounds[1]) * scale))
        assert min(offset) >= 0 and offset[0]+size[0] <= CELL and offset[1]+size[1] <= CELL
        frame = Image.new('RGBA', (CELL, CELL))
        frame.alpha_composite(resized, offset)
        target = frame.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
        assert target and min(target[0], target[1], CELL-target[2], CELL-target[3]) >= 30
        tallest = max(tallest, target[3] - target[1])
        atlas.alpha_composite(frame, (index % 4 * CELL, index // 4 * CELL))
        packed.append(frame)
        measurements.append({'frame': index, 'label': LABELS[index], 'sourceRect': RECTS[index],
                             'sourceAlphaBounds': bounds, 'sourceAlpha16Bounds': visible,
                             'sourcePlantedFeetAnchor': anchor, 'targetAnchor': PIVOT,
                             'uniformScale': scale, 'offset': offset, 'targetAlpha16Bounds': target})
    path = OUT / 'lantern-warden-attack-v2-atlas.png'
    atlas.save(path)
    display_cell = CELL * 150 / tallest
    entry = {'id': 'lantern-warden-attack', 'name': 'Lantern Warden · Attack', 'family': 'bosses',
             'kind': 'animation', 'atlas': path.relative_to(ROOT).as_posix(),
             'source': SOURCE.relative_to(ROOT).as_posix(), 'sourceSha256': source_hash, 'atlasSha256': sha(path),
             'cellSize': CELL, 'columns': 4, 'frames': 8, 'labels': LABELS,
             'origin': [.5, PIVOT[1]/CELL], 'displayHeight': 150, 'displayCell': display_cell,
             'fps': 10, 'frameDurationsMs': DURATIONS,
             'status': 'Assistant motion study; gameplay integration pending',
             'notes': 'Eight drawn frames. Preview holds the first four poses for 1.2 seconds before release. Planted-foot translations and one common scale correct source-sheet spacing. This is an art timing study; the authored rotating cone, safe wedge and boss encounter are still pending.'}
    (OUT / 'library.json').write_text(json.dumps({'schemaVersion': 1, 'entries': [entry]}, indent=2)+'\n', encoding='utf8', newline='\n')
    assert sum(DURATIONS[:4]) == 1200
    assert sha(SOURCE) == source_hash
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15)
    proof = Image.new('RGB', (2240, 1000), '#e7ddc3')
    draw = ImageDraw.Draw(proof)
    draw.text((18, 14), 'LANTERN WARDEN | 8 drawn attack frames | common scale | 1x 150px and 2x', font=font, fill='#233b2e')
    draw.text((18, 41), 'Source gutters differ from requested equal grid. All extraction rectangles and planted-foot translations are recorded.', font=font, fill='#536249')
    previews = []
    for index, frame in enumerate(packed):
        x, y = index % 4 * 560, 82 + index // 4 * 450
        draw.text((x + 14, y), f'{index+1:02}  {LABELS[index]}  / {DURATIONS[index]} ms', font=font, fill='#233b2e')
        for multiple, center in [(1, x + 100), (2, x + 350)]:
            size = round(display_cell * multiple)
            sprite = frame.resize((size, size), Image.Resampling.LANCZOS)
            base = y + 410
            proof.paste(sprite, (round(center-size*.5), round(base-size*PIVOT[1]/CELL)), sprite)
            draw.line((center-5,base,center+5,base), fill='#935a3b')
        preview = Image.new('RGB', (640, 450), '#1b342d')
        for multiple, center in [(1, 160), (2, 450)]:
            size = round(display_cell * multiple)
            sprite = frame.resize((size, size), Image.Resampling.LANCZOS)
            preview.paste(sprite, (round(center-size*.5), round(388-size*PIVOT[1]/CELL)), sprite)
        ImageDraw.Draw(preview).text((16, 14), f'Warden attack / frame {index+1} / art study, not encounter', font=font, fill='#e7ddc3')
        previews.append(preview)
    proof_path = REVIEW / 'warden-attack-contact-sheet.png'
    proof.save(proof_path)
    gif_path = OUT / 'lantern-warden-attack-v2-preview.gif'
    previews[0].save(gif_path, save_all=True, append_images=previews[1:], duration=DURATIONS, loop=0, disposal=2)
    report = {'schemaVersion': 1, 'structuralChecksPassed': True, 'source': entry['source'],
              'sourceSha256': source_hash, 'nativeRGBA': True, 'sourceSize': list(native.size),
              'sourceRectanglesReconstructNativeExactly': True,
              'frames': measurements, 'uniformScale': scale, 'atlas': entry['atlas'],
              'atlasSha256': sha(path), 'contactSheet': proof_path.relative_to(ROOT).as_posix(),
              'contactSheetSha256': sha(proof_path), 'preview': gif_path.relative_to(ROOT).as_posix(),
              'previewSha256': sha(gif_path), 'durationsMs': DURATIONS, 'anticipationMs': sum(DURATIONS[:4]),
              'operation': 'Conservative source rectangles through empty gutters; alpha-preserving crop, one uniform scale, measured planted-foot translations, padding and fixed 512px-cell packing. No generated in-betweens, alpha erasure, mirrored frames or painting.',
              'assistantMotionReview': 'pending', 'humanReviewPerformed': False, 'runtimeIntegrated': False,
              'limits': ['One south-east attack study, not a complete 23-frame boss library.',
                         'Atlas origin is a technical packing property, not evidence of stable anatomy or motion.',
                         'Rotating cone, safe wedge, minions, gameplay and physical-device review are not implemented by this art.']}
    report_path = REVIEW / 'warden-attack-packing.json'
    if report_path.is_file():
        previous = json.loads(report_path.read_text(encoding='utf8'))
        if previous.get('atlasSha256') == report['atlasSha256'] and previous.get('contactSheetSha256') == report['contactSheetSha256']:
            report['assistantMotionReview'] = previous.get('assistantMotionReview', 'pending')
    report_path.write_text(json.dumps(report, indent=2)+'\n', encoding='utf8', newline='\n')
    print(json.dumps({'frames': 8, 'structuralChecksPassed': True, 'anticipationMs': 1200,
                      'contactSheet': str(proof_path), 'motionReview': report['assistantMotionReview']}))


if __name__ == '__main__':
    pack()
