"""Exact identities and settled poses for the current encounter atlas inventory."""
from pathlib import Path
from PIL import Image
import hashlib,io,json

ROOT = Path(__file__).resolve().parents[1]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def preserve(path, data):
    if path.exists(): assert path.read_bytes() == data, 'Preserve issued output: ' + str(path)
    else: path.write_bytes(data)

previous = read(ROOT / 'assets/delivery/boss-loading-v1/library.json')
extra_path = 'assets/production/motion/opening-defeats-library.json'
new = read(ROOT / extra_path); overrides = {e['bossId']: e for e in new['entries']}
libraries = [e['path'] for e in previous['inputLibraries']]
originals = [e for p in libraries for e in read(ROOT / p)['entries']]
clips = [overrides.get(e['bossId'], e) for e in originals]
assert len(clips) == len({e['bossId'] for e in clips}) == 65
out = ROOT / 'assets/delivery/boss-loading-v2'; out.mkdir(parents=True, exist_ok=True)
dynamic = set(previous['lazyBossIds']); support = set(previous['alwaysLoadedIds'])
old_references = {e['bossId']: e for e in previous['entries']}
entries = []; settled = []; sizes = {}
for clip in clips:
    ident = clip['bossId']; source = ROOT / clip['atlas']; assert sha(source) == clip['atlasSha256']
    atlas = Image.open(source); assert atlas.mode == 'RGBA'; sizes[ident] = atlas.width * atlas.height * 4
    if ident not in dynamic: continue
    if ident in overrides:
        size = clip['cellSize']; reference = out / (ident + '-reference-v2.png')
        image = atlas.crop((0, 0, size, size)); buffer = io.BytesIO(); image.save(buffer, format='PNG'); preserve(reference, buffer.getvalue())
        first = {'bossId': ident, 'sourceAtlas': clip['atlas'], 'sourceAtlasSha256': sha(source),
                 'sourceFrame': 0, 'sourceCellSize': size, 'sourceFullDecodedBytes': sizes[ident],
                 'reference': reference.relative_to(ROOT).as_posix(), 'referenceSha256': sha(reference),
                 'referenceDecodedBytes': size * size * 4, 'referencePngBytes': reference.stat().st_size,
                 'origin': clip['origin'], 'displayCell': clip['displayCell']}
        final_frame = clip['defeatStartFrame'] + clip['defeatFrames'] - 1
        x = final_frame % clip['columns'] * size; y = final_frame // clip['columns'] * size
        image = atlas.crop((x, y, x + size, y + size)); reference = out / (ident + '-defeat-reference-v1.png')
        buffer = io.BytesIO(); image.save(buffer, format='PNG'); preserve(reference, buffer.getvalue())
        settled.append({'bossId': ident, 'sourceAtlas': clip['atlas'], 'sourceAtlasSha256': sha(source),
                        'sourceFrame': final_frame, 'sourceCellSize': size,
                        'reference': reference.relative_to(ROOT).as_posix(), 'referenceSha256': sha(reference),
                        'referenceDecodedBytes': size * size * 4, 'referencePngBytes': reference.stat().st_size,
                        'origin': clip['origin'], 'displayCell': clip['displayCell']})
        entries.append(first)
    else:
        entry = old_references[ident]; assert sha(ROOT / entry['reference']) == entry['referenceSha256']; entries.append(entry)

baseline = sum(sizes.values()); fixed = sum(sizes[ident] for ident in support)
main_bytes = sum(e['referenceDecodedBytes'] for e in entries)
settled_bytes = sum(e['referenceDecodedBytes'] for e in settled)
two = sum(sorted([e['sourceFullDecodedBytes'] for e in entries], reverse=True)[:2])
startup = fixed + main_bytes + settled_bytes; maximum = startup + two
manifest = {'schemaVersion': 2, 'sourceTool': 'tools/build-boss-loading-v2.py', 'sourceToolSha256': sha(Path(__file__)),
            'previousManifest': {'path': 'assets/delivery/boss-loading-v1/library.json', 'sha256': sha(ROOT / 'assets/delivery/boss-loading-v1/library.json')},
            'inputLibraries': [{'path': p, 'sha256': sha(ROOT / p)} for p in libraries + [extra_path]],
            'catalog': previous['catalog'], 'alwaysLoadedIds': previous['alwaysLoadedIds'], 'lazyBossIds': previous['lazyBossIds'],
            'entries': entries, 'settledReferences': settled,
            'summary': {'encounterAtlases': 65, 'alwaysLoadedAtlases': 8, 'lazyAtlases': 57, 'mainReferences': 57,
                        'settledReferences': 7, 'baselineDecodedBytes': baseline, 'alwaysLoadedDecodedBytes': fixed,
                        'mainReferenceDecodedBytes': main_bytes, 'settledReferenceDecodedBytes': settled_bytes,
                        'referenceDecodedBytes': main_bytes + settled_bytes, 'startupDecodedBytes': startup,
                        'maximumTwoFullAtlasBytes': two, 'maximumCachedDecodedBytes': maximum,
                        'cachedReductionPercent': 100 * (1 - maximum / baseline),
                        'referencePngBytes': sum(e['referencePngBytes'] for e in entries + settled)},
            'limits': ['Dimension-based four-channel estimates for this encounter atlas set only; not actual driver, CPU-cache, staging, mipmap or device/FPS measurements.',
                       'Constable, Warden, survivor, arena and other textures are outside this subtotal.',
                       'One atlas per current/recent boss remains in the two-entry cache; its sixteen frames include unchanged original actions and the new collapse.',
                       'Fifty-seven identity images and seven exact settled poses remain available during load/retry. Future concealed schedules are not prefetched.']}
assert len(entries) == 57 and len(settled) == 7
preserve(out / 'library.json', (json.dumps(manifest, indent=2) + '\n').encode('utf-8'))
print(json.dumps(manifest['summary'], indent=2))
