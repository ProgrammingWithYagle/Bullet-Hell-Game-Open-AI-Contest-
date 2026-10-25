#!/usr/bin/env python3
"""Verify every portable package member, source build bytes and safe archive extraction."""
from pathlib import Path,PurePosixPath
import argparse,json,hashlib,os,zipfile
def sha(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def verify(folder,verification=None):
 folder=folder.resolve();m=json.loads((folder/'BUILD-MANIFEST.json').read_text(encoding='utf-8'))
 expected={}
 for f in m['files']:
  pure=PurePosixPath(f['path']);assert not pure.is_absolute() and all(p not in ['..','.',''] for p in pure.parts),f['path']
  raw=folder.joinpath(*pure.parts);assert not raw.is_symlink();p=raw.resolve();assert os.path.commonpath([str(folder),str(p)])==str(folder)
  assert f['path'] not in expected and p.is_file(),f['path'];assert p.stat().st_size==f['bytes'],f['path']+' bytes';assert sha(p)==f['sha256'],f['path']+' hash';expected[f['path']]=f
 actual={p.relative_to(folder).as_posix() for p in folder.rglob('*') if p.is_file()};assert actual==set(expected)|{'BUILD-MANIFEST.json'},'Unexpected or missing package members'
 assert (folder/'Grave Accord.exe').read_bytes()[:2]==b'MZ'
 for required in ['resources/app/main.cjs','resources/app/preload.cjs','resources/app/lan.cjs','resources/app/client/index.html','LICENSE','LICENSES.chromium.html','GAME-LICENSE.txt','RUNTIME-LICENSES.json','READ-ME.txt']:
  assert required in expected,required
 assert not m['sourceDirty'],'Final package must be built from a clean committed source checkout'
 client_files=0
 if verification:
  v=json.loads(Path(verification).read_text(encoding='utf-8'));assert v['passed'] and m['sourceSnapshot']==v['sourceSnapshotSha256']
  for f in v['artifacts']:
   path='resources/app/client/'+f['path'].removeprefix('dist/');assert expected[path]['sha256']==f['sha256'];assert expected[path]['bytes']==f['bytes'];client_files+=1
 licenses=json.loads((folder/'RUNTIME-LICENSES.json').read_text(encoding='utf-8'));assert licenses
 for dependency in licenses:
  assert dependency['files'],dependency['name']+' has no copied license text'
  assert all(f in expected for f in dependency['files'])
 return {'passed':True,'folder':str(folder),'buildId':m['buildId'],'sourceCommit':m['sourceCommit'],'sourceSnapshot':m['sourceSnapshot'],'files':len(expected),'bytes':sum(f['bytes']for f in expected.values()),'clientFilesMatched':client_files,'runtimeLicenses':len(licenses),'manifestSha256':sha(folder/'BUILD-MANIFEST.json')}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('folder');parser.add_argument('--verification');parser.add_argument('--report');parser.add_argument('--zip');parser.add_argument('--extract');args=parser.parse_args();folder=Path(args.folder)
 report=verify(folder,args.verification)
 if args.zip:
  archive=Path(args.zip).resolve();assert not archive.exists(),'Preserve existing archive';assert os.path.commonpath([str(folder.resolve()),str(archive)])!=str(folder.resolve()),'Archive must be outside source';archive.parent.mkdir(parents=True,exist_ok=True)
  with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True,strict_timestamps=False)as z:
   for p in sorted(folder.rglob('*')):
    if p.is_file():z.write(p,folder.name+'/'+p.relative_to(folder).as_posix())
  report['archive']={'path':str(archive.resolve()),'bytes':archive.stat().st_size,'sha256':sha(archive)}
 if args.extract:
  assert args.zip,'--extract requires an archive created in this invocation';target=Path(args.extract).resolve();assert not target.exists(),'Preserve existing extraction';target.mkdir(parents=True)
  with zipfile.ZipFile(Path(args.zip))as z:
   assert z.testzip()is None
   for info in z.infolist():
    path=(target/info.filename).resolve();assert os.path.commonpath([str(target),str(path)])==str(target),'Unsafe ZIP path'
   z.extractall(target)
  report['extracted']=verify(target/folder.name,args.verification)
 if args.report:
  path=Path(args.report);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(report,indent=2))
if __name__=='__main__':main()
