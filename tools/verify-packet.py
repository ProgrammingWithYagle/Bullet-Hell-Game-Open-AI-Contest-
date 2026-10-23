"""Standalone standard-library verifier shipped with the preproduction packet."""
from pathlib import Path,PurePosixPath
import json,hashlib,sys
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
manifest=json.loads((root/'MANIFEST.json').read_text(encoding='utf8'))
errors=[]
expected={x['path'] for x in manifest['files']}
for entry in manifest['files']:
    relative=PurePosixPath(entry['path'])
    if relative.is_absolute() or '..' in relative.parts:errors.append('Unsafe path '+entry['path']);continue
    f=root.joinpath(*relative.parts)
    if not f.is_file():errors.append('Missing '+entry['path']);continue
    if f.stat().st_size!=entry['bytes']:errors.append('Size '+entry['path'])
    if hashlib.sha256(f.read_bytes()).hexdigest()!=entry['sha256']:errors.append('Hash '+entry['path'])
actual={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
extra=actual-expected-{'MANIFEST.json','SHA256SUMS.txt'}
errors.extend('Unmanifested '+p for p in sorted(extra))
result={'passed':not errors,'files':len(expected),'bytes':sum(x['bytes'] for x in manifest['files']),'errors':errors}
print(json.dumps(result,indent=2));sys.exit(0 if not errors else 1)
