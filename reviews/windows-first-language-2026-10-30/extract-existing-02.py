from pathlib import Path,PurePosixPath
import sys,json,hashlib,zipfile,importlib.util,os
root=Path.cwd();scope=root/'reviews/windows-first-language-2026-10-30'
archive=root/'release/Grave_Accord_2026.10.30_First_Language_Public_Review.zip'
package=root/'release/Grave-Accord-2026.10.30-first-language-public-win32-x64'
target=root/'output/windows-first-language-2026-10-30/fresh-deep-extraction-r02'
report=scope/'package-archive-extraction-02.json'
assert not target.exists() and not report.exists()
spec=importlib.util.spec_from_file_location('package_verifier',root/'tools/verify-desktop-package.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
verification=root/'reviews/first-language-2026-10-30/gate-03/runtime-verification.json'
result=module.verify(package,verification);manifest=json.loads((package/'BUILD-MANIFEST.json').read_text(encoding='utf-8'))
expected={package.name+'/'+item['path'] for item in manifest['files']}|{package.name+'/BUILD-MANIFEST.json'}
archive_hash=module.sha(archive)
with zipfile.ZipFile(archive) as z:
 names=[info.filename for info in z.infolist()]
 assert len(names)==len(set(names)) and set(names)==expected,'Archive member set differs from original package'
 for name in names:
  p=PurePosixPath(name);assert not p.is_absolute() and all(part not in ('..','.','') for part in p.parts),'Unsafe ZIP path'
 assert z.testzip() is None,'ZIP CRC failure'
 target.mkdir(parents=True)
 for info in z.infolist():
  destination=(target/info.filename).resolve();assert os.path.commonpath([str(target.resolve()),str(destination)])==str(target.resolve())
 z.extractall(target)
result['archive']={'path':str(archive.resolve()),'bytes':archive.stat().st_size,'sha256':archive_hash}
result['archiveIntegrity']={'uniqueMembers':len(names),'exactOriginalMemberSet':True,'crcPassed':True,'safePathsPassed':True,'existingArchivePreserved':True}
result['extracted']=module.verify(target/package.name,verification)
assert module.sha(archive)==archive_hash,'Archive changed during verification'
report.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,indent=2))
