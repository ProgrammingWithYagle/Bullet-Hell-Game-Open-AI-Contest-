import hashlib, json, pathlib, tarfile, datetime, sys, re
root = pathlib.Path.cwd().resolve()
commit, archive_name, report_name = sys.argv[1:]
assert re.fullmatch(r'[a-f0-9]{40}', commit)
assert re.fullmatch(r'reviews/[a-z0-9-]+/[a-z0-9-]+\.json', report_name)
archive = (root / archive_name).resolve()
assert archive.is_relative_to(root / 'output')
publication = root / 'output/sites-contest-2026-10-30'
sha = lambda data: hashlib.sha256(data).hexdigest()
expected = {'dist/.openai/hosting.json': publication / '.openai/hosting.json'}
expected.update({'dist/' + f.relative_to(publication / 'build').as_posix(): f for f in (publication / 'build').rglob('*') if f.is_file()})
count, total = 0, 0
with tarfile.open(archive, 'r|gz') as package:
    for member in package:
        name = member.name.removeprefix('./')
        assert '..' not in pathlib.PurePosixPath(name).parts and not pathlib.PurePosixPath(name).is_absolute()
        if member.isdir(): continue
        assert member.isfile() and name in expected, name
        data, original = package.extractfile(member).read(), expected.pop(name).read_bytes()
        if name == 'dist/.openai/hosting.json':
            normalized = json.loads(original)
            assert normalized['static']['directory'] == 'build'
            normalized['static']['directory'] = 'dist'
            assert json.loads(data) == normalized
        else: assert data == original, name
        count += 1; total += len(data)
assert not expected, list(expected)
identity = json.loads((publication / 'build/contest-build.json').read_text())
assert identity['audience'] == 'public' and identity['gameSourceCommit'] == commit
assert archive.stat().st_size < 536870912
report = {'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'passed': True, 'archive': str(archive.relative_to(root)), 'bytes': archive.stat().st_size, 'sha256': sha(archive.read_bytes()), 'gameSourceCommit': commit, 'files': count, 'staticBytes': total, 'allStaticFileBytesMatch': True, 'normalizedHostingManifestOnly': True, 'publicOnly': True, 'scope': 'Every file compared; compact receipt without copied resources or a duplicate asset inventory.'}
with (root / report_name).open('w', encoding='utf-8', newline='\n') as output:
    json.dump(report, output, indent=2); output.write('\n')
print(json.dumps(report))
