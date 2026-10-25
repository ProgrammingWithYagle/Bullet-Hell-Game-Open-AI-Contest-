"""Independent whole-native and atlas reconstruction, including unchanged original action pixels."""
from pathlib import Path
from PIL import Image
import hashlib,json
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / 'reviews/opening-defeats-2026-10-25'
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path): return json.loads(path.read_text(encoding='utf-8'))

library = read(ROOT / 'assets/production/motion/opening-defeats-library.json')
batch = read(ROOT / 'docs/opening-defeats-2026-10-25.json')
packing = read(REVIEW / 'packing.json')
selection = read(REVIEW / 'selection.json')
originals = read(REVIEW / 'input-contracts.json')['entries']
assert len(batch['requests']) == 8 and len(library['entries']) == len(packing['entries']) == 7
assert sha(ROOT / library['sourceTool']) == library['sourceToolSha256']
for request in batch['requests']:
    assert sha(ROOT / request['file']) == request['sha256']
    assert sha(ROOT / request['request']) == request['requestSha256']
    args = read(ROOT / request['request'])
    assert args['transparent_background'] is True
    assert args['referenced_image_paths'] == [b['argument'] for b in request['inputBindings']]
    for binding in request['inputBindings']:
        assert sha(ROOT / binding['projectPath']) == binding['sha256']

results = []
for entry in library['entries']:
    ident = entry['bossId']
    receipt = next(e for e in packing['entries'] if e['bossId'] == ident)
    old = next(e for e in originals if e['bossId'] == ident)
    request = next(e for e in batch['requests'] if e['bossId'] == ident and e['version'] == selection[ident])
    assert entry['defeatSource'] == request['file']
    assert sha(ROOT / entry['defeatSource']) == entry['defeatSourceSha256'] == receipt['nativeSha256']
    assert sha(ROOT / entry['atlas']) == entry['atlasSha256'] == receipt['atlasSha256']
    assert sha(ROOT / old['atlas']) == old['atlasSha256'] == entry['baseAtlasSha256']
    native = Image.open(ROOT / entry['defeatSource'])
    actual = Image.open(ROOT / entry['atlas'])
    base = Image.open(ROOT / old['atlas'])
    assert native.mode == actual.mode == base.mode == 'RGBA'
    size = entry['cellSize']; padding = entry['basePadding']; base_size = entry['baseCellSize']
    assert size == base_size + padding * 2 and base_size == 384 and size <= 512
    assert actual.size == (size * 4, size * 4) and entry['frames'] == 16
    predicted = Image.new('RGBA', actual.size)
    for n in range(8):
        piece = base.crop((n % old['columns'] * base_size, n // old['columns'] * base_size,
                           (n % old['columns'] + 1) * base_size, (n // old['columns'] + 1) * base_size))
        target = Image.new('RGBA', (size, size)); target.paste(piece, (padding, padding))
        predicted.paste(target, (n % 4 * size, n // 4 * size))
        packed = actual.crop((n % 4 * size, n // 4 * size, (n % 4 + 1) * size, (n // 4 + 1) * size))
        assert packed.tobytes() == target.tobytes(), (ident, n, 'Original live RGBA changed')
    for axis in range(2):
        assert abs(entry['origin'][axis] * size - (old['origin'][axis] * base_size + padding)) < 1e-10
        for pixel in [0, base_size / 2, base_size - 1]:
            before = (pixel - old['origin'][axis] * base_size) * old['displayCell'] / base_size
            after = (pixel + padding - entry['origin'][axis] * size) * entry['displayCell'] / size
            assert abs(before - after) < 1e-10, 'Padding changed the original world transform'
    owners = None
    if receipt.get('sourceOwnershipMask'):
        mask = receipt['sourceOwnershipMask']; assert sha(ROOT / mask['path']) == mask['sha256']
        owners = np.array(Image.open(ROOT / mask['path'])); alpha = np.array(native.getchannel('A'))
        assert np.array_equal(owners > 0, alpha > 0)
        assert set(np.unique(owners)) == set(range(9))
        visible = alpha > 0
        for dy, dx in [(0, 1), (1, 0), (1, 1), (1, -1)]:
            ya = slice(0, native.height - dy); yb = slice(dy, native.height)
            xa = slice(max(0, -dx), native.width - max(0, dx)); xb = slice(max(0, dx), native.width - max(0, -dx))
            adjacent = visible[ya, xa] & visible[yb, xb]
            assert np.all(owners[ya, xa][adjacent] == owners[yb, xb][adjacent]), 'A connected source figure was split'
        restored_array = np.array(native); restored_array[owners > 0] = 0
    else:
        coverage = np.zeros((native.height, native.width), np.uint8)
        restored = Image.new('RGBA', native.size)
    for n, record in enumerate(receipt['frames']):
        assert record['runtimeFrame'] == n + 8 and record['uniformScale'] == receipt['uniformScale'] > 0
        x0, y0, x1, y1 = record['sourceRect']
        assert 0 <= x0 < x1 <= native.width and 0 <= y0 < y1 <= native.height
        piece = native.crop((x0, y0, x1, y1))
        if owners is not None:
            data = np.array(piece); owned = owners[y0:y1, x0:x1] == n + 1; data[~owned] = 0
            piece = Image.fromarray(data); restored_array[y0:y1, x0:x1][owned] = data[owned]
        else:
            coverage[y0:y1, x0:x1] += 1; restored.paste(piece, (x0, y0))
            alpha = np.array(native.getchannel('A'))
            if x0 > 0: assert not np.any(alpha[y0:y1, x0] > 0)
            if y0 > 0: assert not np.any(alpha[y0, x0:x1] > 0)
        bounds = piece.getchannel('A').getbbox()
        visible_bounds = piece.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
        assert list(bounds) == record['sourceAlphaBounds']
        assert list(visible_bounds) == record['sourceAlpha16Bounds']
        if n == 0:
            expected_scale = old['standingCalibrationHeight'] / (visible_bounds[3] - visible_bounds[1])
            assert record['uniformScale'] == expected_scale
        crop = piece.crop(bounds); scale = record['uniformScale']
        resized = [round(crop.width * scale), round(crop.height * scale)]
        assert resized == record['resizedCrop']
        anchor = [round(old['origin'][0] * base_size) + padding, round(old['origin'][1] * base_size) + padding]
        assert anchor == record['targetGroundAnchor']
        ground = record['sourceGroundAnchor']
        offset = [anchor[0] - round((ground[0] - bounds[0]) * scale), anchor[1] - round((ground[1] - bounds[1]) * scale)]
        assert offset == record['offset']
        target = Image.new('RGBA', (size, size)); target.alpha_composite(crop.resize(resized, Image.Resampling.LANCZOS), offset)
        predicted.paste(target, ((n + 8) % 4 * size, (n + 8) // 4 * size))
        packed_bounds = target.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
        assert list(packed_bounds) == record['targetAlpha16Bounds']
        assert min(packed_bounds[0], packed_bounds[1], size - packed_bounds[2], size - packed_bounds[3]) >= 16
    if owners is None:
        assert np.all(coverage == 1) and restored.tobytes() == native.tobytes()
    else:
        assert np.array_equal(restored_array, np.array(native))
    assert predicted.tobytes() == actual.tobytes(), (ident, 'Independent atlas reconstruction differs')
    for key in ['preview', 'contactSheet']: assert sha(ROOT / receipt[key]) == receipt[key + 'Sha256']
    results.append({'bossId': ident, 'newCompletePoses': 8, 'originalLivePoses': 8,
                    'wholeNativePartitionExact': True, 'packedRgbaReconstructed': True,
                    'originalLiveRgbaAndWorldTransformUnchanged': True})

report = {'passed': True, 'verifier': 'tools/verify-opening-defeats.py', 'verifierSha256': sha(Path(__file__)),
          'librarySha256': sha(ROOT / 'assets/production/motion/opening-defeats-library.json'),
          'nativeReturns': 8, 'selectedSheets': 7, 'retainedRejectedLayouts': 1,
          'newCompleteDefeatPoses': 56, 'preservedOriginalActionPoses': 56, 'results': results,
          'renderedAccepted': False,
          'limits': ['Independent complete-native and packed-RGBA reconstruction only.',
                     'Original live pixels/world transforms are preserved; new pose anatomy and transitions remain candidates for rendered/device/human review.',
                     'Ambulance v1 is retained and rejected because two whole groups connect; selected v2 uses two columns and four rows.']}
(REVIEW / 'reconstruction.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({k: report[k] for k in ['passed', 'nativeReturns', 'selectedSheets', 'newCompleteDefeatPoses', 'preservedOriginalActionPoses']}))
