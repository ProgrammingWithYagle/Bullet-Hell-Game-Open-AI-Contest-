"""Verify versioned packet extraction/copy and record evidence outside the sealed archive."""
from pathlib import Path
import os,json,hashlib,zipfile,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
version=json.loads((ROOT/'content/rules.json').read_text(encoding='utf8'))['contentVersion']
base=ROOT/'output/stage1';source=base/f'Grave-Accord-Stage1-v{version}'
archive=base/(source.name+'.zip');extracted=base/f'fresh-extraction-v{version}';copied=base/f'normal-copy-v{version}'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if '--extract' in sys.argv:
    assert not extracted.exists(),'Fresh extraction target already exists; do not overwrite verification evidence.'
    with zipfile.ZipFile(archive) as z:
        names=z.namelist();assert len(names)==len(set(names))
        for member in z.infolist():
            target=(extracted/member.filename).resolve()
            assert os.path.commonpath([str(extracted.resolve()),str(target)])==str(extracted.resolve())
            assert ':' not in member.filename and not member.filename.startswith(('/','\\'))
            assert (member.external_attr>>16)&0o170000!=0o120000,'Symlinks are not packet members'
        z.extractall(extracted)
    print(json.dumps({'extracted':str(extracted),'members':len(names)}));sys.exit(0)
assert '--record' in sys.argv
surfaces=[]
for folder in [source,extracted,copied]:
    result=subprocess.run([sys.executable,str(ROOT/'tools/verify-packet.py'),str(folder)],capture_output=True,text=True,encoding='utf8')
    assert result.returncode==0,result.stdout+result.stderr
    surfaces.append({'path':folder.relative_to(ROOT).as_posix(),**json.loads(result.stdout)})
pdf=ROOT/f'output/stage1/Grave-Accord-Production-Bible-v{version}.pdf'
pdf_review=json.loads((ROOT/f'reviews/pdf-render-v{version}.json').read_text(encoding='utf8'))
assert pdf_review['visualReviewPassed'] and pdf_review['pdfSha256']==sha(pdf)
assert sha(source/'Grave-Accord-Production-Bible.pdf')==sha(pdf)
manifest=json.loads((source/'MANIFEST.json').read_text(encoding='utf8'))
with zipfile.ZipFile(archive) as z:
    for item in manifest['files']:
        data=z.read(item['path']);assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256']
    members=len(z.infolist());assert members==len(manifest['files'])+2
history=json.loads((ROOT/'reviews/history/stage1-delivery-v0.1.0.json').read_text(encoding='utf8'))
assert sha(ROOT/history['archive']['path'])==history['archive']['sha256'],'Historical packet changed'
report={'schemaVersion':1,'passed':True,'stage':'Stage 1 expanded preproduction delivery','version':version,'contentRevision':manifest['contentRevision'],
 'pdf':{'path':pdf.relative_to(ROOT).as_posix(),'sha256':sha(pdf),'pages':pdf_review['pages'],'rendered':True,'renderer':'Poppler pdftoppm at 85 DPI; all-page contact sheets and representative full-size inspection','visualReviewPassed':True,'allPagesInspected':pdf_review['pages'],'bookmarks':pdf_review['bookmarks'],'humanReviewPerformed':False},
 'archive':{'path':archive.relative_to(ROOT).as_posix(),'sha256':sha(archive),'bytes':archive.stat().st_size,'members':members,'freshExtractionPassed':True,'normalCopyPassed':True,'everyMemberByteSizeAndSha256Matches':True,'standaloneVerifierPassedOnAllThreeSurfaces':True,'surfaces':surfaces},
 'historicalEditionUnchanged':True,'limits':['Authored preproduction design and proofs; no playable game build.','AI-authored translations; native-speaker and runtime layout review pending.','Audio signal and assistant art/motion review are distinct from human listening and playtesting.','The complete sixty-boss asset library follows the first-playable performance gate.']}
(ROOT/'reviews/stage1-delivery-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report,indent=2))
