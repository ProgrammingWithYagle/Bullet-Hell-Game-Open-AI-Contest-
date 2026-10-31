import hashlib, json, pathlib

root = pathlib.Path(__file__).resolve().parent
manifest = json.loads((root / 'SHA256SUMS.json').read_text(encoding='utf-8'))
expected = set()
for item in manifest['files']:
    relative = pathlib.PurePosixPath(item['path'])
    assert not relative.is_absolute() and '..' not in relative.parts, item['path']
    file = root.joinpath(*relative.parts)
    assert file.is_file() and not file.is_symlink(), item['path']
    data = file.read_bytes()
    assert len(data) == item['bytes'], item['path']
    assert hashlib.sha256(data).hexdigest() == item['sha256'], item['path']
    expected.add(item['path'])
actual = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
assert actual == expected | {'SHA256SUMS.json'}, sorted(actual ^ expected)
print(json.dumps({'passed': True, 'files': len(actual), 'allHashesMatch': True}))
