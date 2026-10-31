import os, pathlib, json, datetime, time, sys, re

root = pathlib.Path.cwd().resolve()
started = time.time()
totals = {}
errors = []
stack = [root]
files = 0
while stack:
    directory = stack.pop()
    try:
        with os.scandir(directory) as children:
            for item in children:
                try:
                    if item.is_symlink():
                        continue
                    if item.is_dir(follow_symlinks=False):
                        stack.append(pathlib.Path(item.path))
                    elif item.is_file(follow_symlinks=False):
                        relative = pathlib.Path(item.path).relative_to(root)
                        size = item.stat(follow_symlinks=False).st_size
                        files += 1
                        depth = 2 if relative.parts[0] in {'output', 'release', 'reviews', 'assets', 'handoff', '.git'} else 1
                        key = pathlib.PurePosixPath(*relative.parts[:depth]).as_posix()
                        row = totals.setdefault(key, {'bytes': 0, 'files': 0})
                        row['bytes'] += size
                        row['files'] += 1
                except OSError as error:
                    errors.append({'path': item.path, 'error': str(error)})
    except OSError as error:
        errors.append({'path': str(directory), 'error': str(error)})
rows = [{'path': path, **values} for path, values in sorted(totals.items(), key=lambda x: -x[1]['bytes'])]
report = {'auditedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'root': str(root), 'logicalBytes': sum(v['bytes'] for v in totals.values()), 'files': files, 'elapsedSeconds': round(time.time() - started, 2), 'directories': rows, 'errors': errors, 'limits': ['Logical file sizes; sparse/cloud residency, hard links and filesystem allocation may differ. Symlinks skipped. No files deleted by this inventory.']}
name = sys.argv[1] if len(sys.argv) > 1 else 'storage-audit-before.json'
assert re.fullmatch(r'[a-z0-9-]+\.json', name)
target = root / 'reviews/browser-release-fixes-2026-10-30' / name
with target.open('x', encoding='utf-8', newline='\n') as output:
    json.dump(report, output, indent=2)
    output.write('\n')
print(json.dumps({'logicalGiB': round(report['logicalBytes'] / 1024**3, 2), 'files': files, 'elapsedSeconds': report['elapsedSeconds'], 'largest': rows[:32], 'errors': len(errors)}))
