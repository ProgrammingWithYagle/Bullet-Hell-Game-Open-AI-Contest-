import os, pathlib, json, subprocess, datetime

root = pathlib.Path.cwd().resolve()
scope = root / 'reviews/browser-release-fixes-2026-10-30'
audit = json.loads((scope / 'storage-audit-before.json').read_text())
tracked = subprocess.check_output(['git', '-c', 'core.bare=false', 'ls-files', '-z'], cwd=root).decode().split('\0')
keep = {'output/playtest-browser-fixes-testing-8c75bb8-r02', 'output/playtest-browser-fixes-public-8c75bb8-r02', 'release/Grave-Accord-2026.10.30-shared-network-public-win32-x64'}
items, skipped = [], []
for entry in audit['directories']:
    relative = entry['path']
    target = root / relative
    reason = None
    if relative in keep or not target.is_dir():
        continue
    if relative.startswith('output/candidate-') or relative.startswith('output/desktop-client-') or relative.startswith('output/playtest-'):
        if (target / 'index.html').is_file() and (target / 'assets').is_dir():
            reason = 'Obsolete generated static client, reproducible from committed source; current verified public/testing roots retained.'
    elif relative.startswith('output/windows-') or relative in {'output/smooth-rooms-2026-10-29', 'output/portable-paths-2026-10-28', 'output/portable-review-2026-10-28'}:
        reason = 'Duplicate obsolete portable-build extraction and verification workspace; canonical review receipts and latest portable release retained.'
    elif relative.startswith('release/Grave-Accord-') and relative.endswith('-win32-x64'):
        reason = 'Obsolete expanded portable build; latest portable build, all ZIP archives and all small sidecars retained.'
    if not reason:
        continue
    assert target.resolve().is_relative_to(root / relative.split('/')[0])
    if any(name == relative or name.startswith(relative + '/') for name in tracked if name):
        skipped.append({'path': relative, 'reason': 'Contains tracked source/evidence'})
        continue
    junctions = []
    stack = [target]
    while stack:
        directory = stack.pop()
        with os.scandir(directory) as children:
            for item in children:
                info = item.stat(follow_symlinks=False)
                if item.is_symlink() or getattr(info, 'st_reparse_tag', 0) in {0xA0000003, 0xA000000C}:
                    junctions.append(item.path)
                elif item.is_dir(follow_symlinks=False):
                    stack.append(pathlib.Path(item.path))
    if junctions:
        skipped.append({'path': relative, 'reason': 'Contains a link or junction', 'links': junctions[:5]})
        continue
    items.append({'path': relative, 'absolutePath': str(target), 'bytes': entry['bytes'], 'files': entry['files'], 'reason': reason})
plan = {'preparedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'root': str(root), 'authorizedBy': 'User requested deletion of folders deemed outdated/not needed on2026-10-31, superseding the older preserve-every-generated-root preference.', 'scope': 'Only untracked ignored generated client/native build copies under output/ and release/. No ZIP archives, source, artwork, Git history, handoffs or reviews selected.', 'bytes': sum(x['bytes'] for x in items), 'directories': len(items), 'items': sorted(items, key=lambda x: x['path']), 'skipped': skipped, 'keptCurrentRoots': sorted(keep)}
with (scope / 'storage-cleanup-plan.json').open('x', encoding='utf-8', newline='\n') as output:
    json.dump(plan, output, indent=2)
    output.write('\n')
print(json.dumps({'selectedGiB': round(plan['bytes'] / 1024**3, 2), 'directories': len(items), 'files': sum(x['files'] for x in items), 'skipped': skipped, 'keep': sorted(keep)}))
