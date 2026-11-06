import pathlib, hashlib, json, zipfile, datetime, subprocess, sys

workspace = pathlib.Path.cwd().resolve()
root = workspace / 'handoff/browser-repair-2026-10-30'
manifest = root / 'SHA256SUMS.json'
assert not manifest.exists()
sha = lambda data: hashlib.sha256(data).hexdigest()
members = [{'path': p.relative_to(root).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p.read_bytes())} for p in sorted(root.rglob('*')) if p.is_file()]
manifest.write_text(json.dumps({'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'files': members}, indent=2) + '\n', encoding='utf-8', newline='\n')
subprocess.run([sys.executable, str(root / 'VERIFY.py')], check=True)
archive = workspace / 'handoff/Grave_Accord_Browser_Repair_2026-10-30.zip'
assert not archive.exists()
with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED, compresslevel=9) as package:
    for file in sorted(root.rglob('*')):
        if file.is_file():
            package.write(file, file.relative_to(root).as_posix())
extraction = workspace / 'output/handoff-browser-repair-extraction-01'
assert extraction.is_relative_to(workspace / 'output') and not extraction.exists()
with zipfile.ZipFile(archive) as package:
    assert package.testzip() is None
    for item in package.infolist():
        name = pathlib.PurePosixPath(item.filename)
        assert not name.is_absolute() and '..' not in name.parts
    package.extractall(extraction)
subprocess.run([sys.executable, str(extraction / 'VERIFY.py')], check=True)
for file in root.rglob('*'):
    if file.is_file():
        assert file.read_bytes() == extraction.joinpath(file.relative_to(root)).read_bytes()
original = workspace / 'handoff/Grave_Accord_Contest_Checkpoint_2026-10-30.zip'
assert sha(original.read_bytes()) == '529135bc9aa6a94e6a5516580d23f4d8da2df7b792b65288aa1805e111e64b6d'
report = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'passed': True, 'archive': str(archive.relative_to(workspace)), 'bytes': archive.stat().st_size, 'sha256': sha(archive.read_bytes()), 'files': len(members) + 1, 'sourceAndFreshExtractionMatch': True, 'crcPassed': True, 'originalContestZipUnchanged': True, 'independentWindowsCopyPending': True}
target = workspace / 'reviews/browser-release-fixes-2026-10-30/handoff-verification-01.json'
with target.open('x', encoding='utf-8', newline='\n') as output:
    json.dump(report, output, indent=2)
    output.write('\n')
print(json.dumps(report))
