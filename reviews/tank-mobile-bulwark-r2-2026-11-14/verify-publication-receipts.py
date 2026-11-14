import hashlib,json,pathlib,zipfile
repo=pathlib.Path(__file__).resolve().parents[2]
binding=json.loads(pathlib.Path(__file__).with_name('publication-byte-bindings.json').read_text(encoding='utf-8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
archive=repo/binding['archive'];assert sha(archive.read_bytes())==binding['archiveSha256']
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for row in binding['rows']:
        raw=z.read(row['member']);assert sha(raw)==row['originalSha256']
        view=raw.replace(b'\r\n',b'\n');assert sha(view)==row['publishedLFSha256']
        actual=(repo/row['path']).read_bytes();assert sha(actual) in [row['originalSha256'],row['publishedLFSha256']]
print(json.dumps({'passed':True,'originalsVerified':len(binding['rows']),'onlyCRLFTextViews':True,'originalHashBindingsPreserved':True}))
