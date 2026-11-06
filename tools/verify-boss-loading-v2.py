"""Independently verify identity/final-pose crops and current encounter RGBA arithmetic."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT = Path(__file__).resolve().parents[1]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads(p.read_text(encoding='utf-8'))
manifest_path = ROOT / 'assets/delivery/boss-loading-v2/library.json'
m = read(manifest_path)
assert sha(ROOT / m['sourceTool']) == m['sourceToolSha256']
assert sha(ROOT / m['previousManifest']['path']) == m['previousManifest']['sha256']
clips = {}
for source in m['inputLibraries']:
    assert sha(ROOT / source['path']) == source['sha256']
    for clip in read(ROOT / source['path'])['entries']: clips[clip['bossId']] = clip
assert len(clips) == 65 and len(m['entries']) == 57 and len(m['settledReferences']) == 7
assert set(m['alwaysLoadedIds']) == {'rat','infirmary-minion','choir-voice','regent','crow','bell-keeper','throne-attendant','moth'}
sizes = {}
for ident, clip in clips.items():
    assert sha(ROOT / clip['atlas']) == clip['atlasSha256']
    atlas = Image.open(ROOT / clip['atlas']); assert atlas.mode == 'RGBA'
    sizes[ident] = atlas.width * atlas.height * 4
results = []
for entry in m['entries'] + m['settledReferences']:
    clip = clips[entry['bossId']]
    assert entry['sourceAtlas'] == clip['atlas'] and entry['sourceAtlasSha256'] == clip['atlasSha256']
    assert entry['origin'] == clip['origin'] and entry['displayCell'] == clip['displayCell']
    atlas = Image.open(ROOT / entry['sourceAtlas']); reference = Image.open(ROOT / entry['reference'])
    size = entry['sourceCellSize']; n = entry['sourceFrame']; columns = clip['columns']
    assert size == clip['cellSize'] and reference.size == (size, size) and reference.mode == 'RGBA'
    crop = atlas.crop((n % columns * size, n // columns * size, (n % columns + 1) * size, (n // columns + 1) * size))
    assert crop.tobytes() == reference.tobytes()
    assert sha(ROOT / entry['reference']) == entry['referenceSha256']
    assert entry['referenceDecodedBytes'] == size * size * 4
    if entry in m['settledReferences']: assert n == 15
    else: assert n == 0 and entry['sourceFullDecodedBytes'] == sizes[entry['bossId']]
    results.append({'bossId': entry['bossId'], 'frame': n, 'exactCompleteRgbaCrop': True})
s = m['summary']; fixed = sum(sizes[i] for i in m['alwaysLoadedIds'])
main = sum(e['referenceDecodedBytes'] for e in m['entries'])
settled = sum(e['referenceDecodedBytes'] for e in m['settledReferences'])
two = sum(sorted([sizes[i] for i in m['lazyBossIds']], reverse=True)[:2])
assert s['baselineDecodedBytes'] == sum(sizes.values())
assert s['alwaysLoadedDecodedBytes'] == fixed and s['mainReferenceDecodedBytes'] == main and s['settledReferenceDecodedBytes'] == settled
assert s['referenceDecodedBytes'] == main + settled and s['startupDecodedBytes'] == fixed + main + settled
assert s['maximumTwoFullAtlasBytes'] == two and s['maximumCachedDecodedBytes'] == fixed + main + settled + two
assert abs(s['cachedReductionPercent'] - 100 * (1 - s['maximumCachedDecodedBytes'] / s['baselineDecodedBytes'])) < 1e-10
report = {'passed': True, 'verifier': 'tools/verify-boss-loading-v2.py', 'verifierSha256': sha(Path(__file__)),
          'manifestSha256': sha(manifest_path), 'identityReferences': 57, 'settledReferences': 7,
          'results': results, 'summary': s, 'renderedAccepted': False, 'limits': m['limits']}
target = ROOT / 'reviews/opening-defeats-2026-10-25/loading-verification.json'
target.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'passed': True, 'mainReferences': 57, 'settledReferences': 7, 'startupMiB': s['startupDecodedBytes'] / 1048576, 'maximumCachedMiB': s['maximumCachedDecodedBytes'] / 1048576}))
