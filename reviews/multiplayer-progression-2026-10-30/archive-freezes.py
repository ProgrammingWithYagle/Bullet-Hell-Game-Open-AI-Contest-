from pathlib import Path
import json,hashlib,zipfile
root=Path.cwd();scope=root/'reviews/multiplayer-progression-2026-10-30'
archive=scope/'frozen-inputs-01.zip';receipt=scope/'frozen-inputs-01.json'
assert not archive.exists() and not receipt.exists(),'Preserve issued snapshots'
sha=lambda b:hashlib.sha256(b).hexdigest()
members=[]
with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for label in ['01','02','03','04','05','06']:
  folder=root/('output/multiplayer-progression-2026-10-30/frozen-r'+label)
  freeze=json.loads((folder/'freeze.json').read_text(encoding='utf-8'))
  expected={b['name']:b for b in freeze['bundles']}
  for name in ['server.mjs','probe.mjs','freeze.json']:
   source=folder/name;assert source.is_file() and not source.is_symlink()
   data=source.read_bytes()
   if name in expected:assert len(data)==expected[name]['bytes'] and sha(data)==expected[name]['sha256']
   target='frozen-r'+label+'/'+name;z.writestr(target,data)
   members.append({'path':target,'bytes':len(data),'sha256':sha(data)})
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(set(z.namelist()))==18
 for member in members:
  data=z.read(member['path']);assert len(data)==member['bytes'] and sha(data)==member['sha256']
receipt.write_text(json.dumps({'passed':True,'archive':str(archive.relative_to(root)).replace('\\','/'),'bytes':archive.stat().st_size,'sha256':sha(archive.read_bytes()),'members':members,'crcPassed':True,'scope':'Exact frozen QA bundles and identities, including failed and unexecuted snapshots. External pinned project node_modules required; no portable game release.'},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':True,'bytes':archive.stat().st_size,'members':len(members)}))
