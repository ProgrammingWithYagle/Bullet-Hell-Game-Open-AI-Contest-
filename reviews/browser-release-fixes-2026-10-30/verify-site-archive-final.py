import hashlib, json, pathlib, tarfile, datetime

root = pathlib.Path.cwd()
archive = root / 'output/grave-accord-browser-repair-public-02.tar.gz'
publication = root / 'output/sites-contest-2026-10-30'
sha = lambda data: hashlib.sha256(data).hexdigest()
expected = {'dist/.openai/hosting.json': publication / '.openai/hosting.json'}
expected.update({'dist/' + f.relative_to(publication / 'build').as_posix(): f for f in (publication / 'build').rglob('*') if f.is_file()})
checked = []
with tarfile.open(archive, 'r|gz') as package:
    for member in package:
        if member.isdir():
            continue
        assert member.isfile(), member.name
        name = member.name.removeprefix('./')
        assert name in expected and '..' not in pathlib.PurePosixPath(name).parts, name
        data = package.extractfile(member).read()
        original = expected.pop(name).read_bytes()
        if name == 'dist/.openai/hosting.json':
            normalized = json.loads(original)
            assert normalized['static']['directory'] == 'build'
            normalized['static']['directory'] = 'dist'
            assert json.loads(data) == normalized, name
        else:
            assert data == original, name
        checked.append({'path': name, 'bytes': len(data), 'sha256': sha(data)})
assert not expected, list(expected)
assert len(checked) == 1671, len(checked)
identity = json.loads((publication / 'build/contest-build.json').read_text())
assert identity['audience'] == 'public' and identity['gameSourceCommit'] == '8c75bb8e08a7e49778fe1652d1452bdd584cc752'
assert archive.stat().st_size < 536870912
report = {'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'passed': True, 'archive': str(archive.relative_to(root)), 'bytes': archive.stat().st_size, 'sha256': sha(archive.read_bytes()), 'gameSourceCommit': identity['gameSourceCommit'], 'files': len(checked), 'allStaticFileBytesMatch': True, 'normalizedHostingManifestOnly': True, 'publicOnly': True, 'members': checked}
target = root / 'reviews/browser-release-fixes-2026-10-30/site-archive-verification-final.json'
with target.open('x', encoding='utf-8', newline='\n') as output:
    json.dump(report, output, indent=2)
    output.write('\n')
print(json.dumps({k: v for k, v in report.items() if k != 'members'}))
