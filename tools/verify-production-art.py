"""Audit current production derivatives against immutable native pixels and hashes."""
from pathlib import Path
from PIL import Image
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def project_file(value):
    path = (ROOT / value).resolve()
    assert path.is_relative_to(ROOT) and path.is_file(), 'Unsafe or missing project file: ' + value
    return path


def read(value):
    return json.loads(project_file(value).read_text(encoding='utf8'))


def verify():
    library = read('assets/production/normalized/library.json')
    references = [entry for entry in library['entries'] if entry['kind'] == 'static-reference']
    motions = [entry for entry in library['entries'] if entry['kind'] == 'animation']
    assert len(references) == 8
    assert {entry['id'] for entry in motions} == {'lantern-warden-attack', 'lantern-warden-idle', 'lantern-warden-channel'}
    assert sum(entry['frames'] for entry in references) == 29
    native_manifest = read('docs/art-production-2026-10-23.json')
    historical_inventory = read('reviews/art-production-2026-10-23/inventory.json')
    for entry in historical_inventory['nativeSources']:
        assert sha(project_file(entry['file'])) == entry['sha256'], 'Previously issued native changed'
    normalization = read('reviews/art-normalization-2026-10-23/normalization.json')
    assert normalization['sourceManifestSha256'] == sha(project_file('docs/art-production-2026-10-23.json'))
    selected = {entry['file'] for entry in native_manifest['requests'] if entry.get('decision') == 'accepted-reference'}
    assert {entry['source'] for entry in references} == selected
    portrait_count = 0
    for entry in library['entries']:
        source, atlas = project_file(entry['source']), project_file(entry['atlas'])
        assert sha(source) == entry['sourceSha256']
        assert sha(atlas) == entry['atlasSha256']
        image = Image.open(atlas)
        assert image.mode == 'RGBA' and image.getchannel('A').getextrema() == (0, 255)
        rows = (entry['frames'] + entry['columns'] - 1) // entry['columns']
        size = entry['cellSize']
        assert image.size == (entry['columns'] * size, rows * size)
        for index in range(entry['frames']):
            cell = image.crop((index % entry['columns'] * size, index // entry['columns'] * size,
                               (index % entry['columns'] + 1) * size, (index // entry['columns'] + 1) * size))
            bounds = cell.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
            assert bounds and min(bounds[0], bounds[1], size - bounds[2], size - bounds[3]) >= size * .05
        if entry['kind'] == 'static-reference':
            assert entry['fps'] == 0, 'Do not play distinct reference poses as animation'
            assert entry['frames'] == (4 if entry['family'] == 'survivors' else 3)
        if 'portrait' in entry:
            portrait = project_file(entry['portrait'])
            assert sha(portrait) == entry['portraitSha256']
            expected = Image.open(source).crop(entry['portraitSourceRect'])
            actual = Image.open(portrait)
            assert actual.mode == expected.mode and actual.size == expected.size
            assert actual.tobytes() == expected.tobytes(), 'Portrait must preserve source RGBA pixels exactly'
            portrait_count += 1
    assert portrait_count == 5
    packing = read('reviews/art-normalization-2026-10-23/warden-attack-packing.json')
    motion = next(entry for entry in motions if entry['id'] == 'lantern-warden-attack')
    assert packing['atlasSha256'] == motion['atlasSha256']
    assert sum(motion['frameDurationsMs'][:4]) == 1200
    assert len(motion['frameDurationsMs']) == motion['frames'] == 8
    original = Image.open(project_file(motion['source']))
    reconstruction = Image.new('RGBA', original.size)
    coverage = Image.new('L', original.size)
    for frame in packing['frames']:
        rect = frame['sourceRect']
        assert coverage.crop(rect).getextrema() == (0, 0), 'Overlapping extraction rectangles'
        coverage.paste(255, rect)
        reconstruction.paste(original.crop(rect), rect[:2])
        assert frame['uniformScale'] == packing['uniformScale'], 'Per-frame scaling causes size drift'
        assert frame['targetAnchor'] == [256, 430]
    assert coverage.getextrema() == (255, 255)
    assert original.tobytes() == reconstruction.tobytes(), 'Extraction must conserve every native RGBA pixel'
    assert packing['runtimeIntegrated'] is False and packing['humanReviewPerformed'] is False
    for key in ['contactSheet', 'preview']:
        assert sha(project_file(packing[key])) == packing[key + 'Sha256']
    for request in read('docs/production-motion-2026-10-23.json')['requests']:
        copy = project_file(request['file'])
        original_path = Path(request['original'])
        assert sha(copy) == request['sha256']
        if original_path.is_file():
            assert sha(copy) == sha(original_path), 'Generated original and preserved project native differ'
    report = {'schemaVersion': 1, 'passed': True, 'referenceIdentities': 8, 'referencePoses': 29,
              'motionStudies': len(motions), 'motionFrames': sum(entry['frames'] for entry in motions), 'nativePixelExactPortraits': portrait_count,
              'previousBatchNativesUnchanged': len(historical_inventory['nativeSources']),
              'motionSourceRectanglesConserveAllRGBAPixels': True, 'anticipationMs': 1200,
              'librarySha256': sha(project_file('assets/production/normalized/library.json')),
              'limits': ['Structural/hash/pixel preservation audit only; assistant visual review is separate.',
                         'No new playable boss or class, physical-device, human or Phaser in-engine animation approval.']}
    (ROOT / 'reviews/art-normalization-2026-10-23/verification.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf8', newline='\n')
    print(json.dumps(report))


if __name__ == '__main__':
    verify()
