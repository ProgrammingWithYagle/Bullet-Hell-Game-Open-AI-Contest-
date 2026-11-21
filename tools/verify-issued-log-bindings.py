"""Verify byte-preserving aliases for issued log hashes affected by Git text normalization."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1];sha=lambda b:hashlib.sha256(b).hexdigest()
receipt=json.loads((ROOT/'reviews/issued-log-bindings-2026-10-25.json').read_text());by_path={e['logicalPath']:e for e in receipt['files']}
for entry in receipt['files']:
 issued=(ROOT/entry['issuedExactCopy']).read_bytes();logical=(ROOT/entry['logicalPath']).read_bytes()
 assert sha(issued)==entry['issuedSha256']
 assert sha(logical)in[entry[k]for k in ['issuedSha256','committedSha256','canonicalLfSha256','canonicalCrlfSha256']]
 assert sha(issued.replace(b'\r\n',b'\n'))==sha(logical.replace(b'\r\n',b'\n'))==entry['canonicalLfSha256']
for claim in receipt['issuedReportClaims']:
 value=json.loads((ROOT/claim['report']).read_text())
 for key in claim['key']:value=value[key]
 assert value==by_path[claim['logicalPath']]['issuedSha256'],claim
print(json.dumps({'passed':True,'exactIssuedLogCopies':len(receipt['files']),'issuedReportHashClaims':len(receipt['issuedReportClaims']),'priorReportsUnmodified':True}))
