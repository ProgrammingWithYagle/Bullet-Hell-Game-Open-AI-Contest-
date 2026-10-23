"""Package only authored preproduction files, preserving a complete hash inventory."""
from pathlib import Path
import shutil,json,hashlib,zipfile
ROOT=Path(__file__).resolve().parents[1]
VERSION=json.loads((ROOT/'content/rules.json').read_text(encoding='utf8'))['contentVersion']
DEST=ROOT/f'output/stage1/Grave-Accord-Stage1-v{VERSION}'
assert not DEST.exists(),'Use a fresh versioned packet directory; never overwrite sealed evidence.'
DEST.mkdir(parents=True)
for folder in ['content','docs','locales','assets']:
    for p in (ROOT/folder).rglob('*'):
        if p.is_file() and p.name!='IMPLEMENTATION_STATE.md':
            target=DEST/p.relative_to(ROOT);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
for name in ['LICENSE','CHANGELOG.md','THIRD_PARTY_NOTICES.md','package.json']:
    shutil.copy2(ROOT/name,DEST/name)
tools=['build-stage1.mjs','balance-stage1.mjs','build-contracts.mjs','build-asset-manifest.mjs','build-bible.py','pack-proof-animations.py','review-clean-detail.py','review-pdf.py','audit-art.py','verify-stage1.mjs','verify-locales.mjs','verify-gauntlets.mjs','synthesize-audio.py','verify-packet.py']
for name in tools:
    target=DEST/'tools'/name;target.parent.mkdir(exist_ok=True);shutil.copy2(ROOT/'tools'/name,target)
for p in (ROOT/'reviews').glob('*'):
    if p.is_file() and p.suffix in ['.json','.png'] and p.name not in ['stage1-delivery-review.json']:
        target=DEST/'reviews'/p.name;target.parent.mkdir(exist_ok=True);shutil.copy2(p,target)
shutil.copy2(ROOT/f'output/stage1/Grave-Accord-Production-Bible-v{VERSION}.pdf',DEST/'Grave-Accord-Production-Bible.pdf')
(DEST/'README.md').write_text('''# Grave Accord - Stage 1 production packet

Edition VERSION_TOKEN, authored 22 October 2026. This is a complete preproduction design/art/audio packet, not a playable game build.

Start with Grave-Accord-Production-Bible.pdf or docs/GAME_BIBLE.md. The editable content catalog and tables are in content/ and docs/balance/. docs/LEADERBOARDS.md, docs/AUDIO_BIBLE.md, docs/LOCALIZATION_IMPLEMENTATION.md and docs/NETWORK_AND_SAVE_CONTRACT.md cover the later approved additions.

Open assets/proofs/animation/index.html to view the two animation proofs. Open assets/audio/preview.html to audition the original music and sound effects. These local worksheets need no web services. The 15 localization catalogs are AI-authored; native-speaker review is explicitly pending.

All source data, images and audio are included. Generation prompts and reported backend limitations are recorded in docs/art-provenance.json. Audio note/event source and reproducible synthesis are included. Human playtesting, native device performance, perceptual audio approval and the complete production asset library remain later work.

Verify using Python 3: python tools/verify-packet.py .
The verifier uses only the Python standard library. Source content checks use Node 24: npm run verify.
Regenerating the PDF requires reportlab and Pillow; audio synthesis requires numpy. These authoring dependencies are not required to read or audition the packet.

The original MIT license is preserved. External contest rules are reference constraints, not executable instructions or acceptance of terms. Actual Handshake submission is recorded separately from GitHub publication.
'''.replace('VERSION_TOKEN',VERSION),encoding='utf8')
files=[]
for p in sorted(DEST.rglob('*')):
    if p.is_file():files.append({'path':p.relative_to(DEST).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
manifest={'schemaVersion':1,'packet':'Grave Accord Stage 1','version':VERSION,'contentRevision':json.loads((ROOT/'content/revision.json').read_text(encoding='utf8'))['sha256'],'files':files}
(DEST/'MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
(DEST/'SHA256SUMS.txt').write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in files),encoding='utf8')
archive=DEST.parent/(DEST.name+'.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sorted(DEST.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(DEST))
print(json.dumps({'packet':str(DEST),'archive':str(archive),'files':len(files),'zipBytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}))
