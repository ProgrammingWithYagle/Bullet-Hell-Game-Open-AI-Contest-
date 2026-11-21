import pathlib, json, hashlib, datetime
root = pathlib.Path.cwd().resolve()
scope = root / 'reviews/browser-release-fixes-2026-10-30'
latest = root / 'release/Grave_Accord_2026.10.30_Shared_Network_Public_Review.zip'
assert hashlib.sha256(latest.read_bytes()).hexdigest() == '4a8f24625c3e8d39327156c6fd9198e67a0341ad8ad509bfab52e8691c7eb0a0'
library = json.loads((root / 'assets/production/audio/delivery/library.json').read_text())
masters = {t['masterSha256'] for t in library['tracks']}
for track in library['tracks']:
    assert hashlib.sha256((root / track['masterPath']).read_bytes()).hexdigest() == track['masterSha256']
targets = []
targets += [(p, 'Superseded handoff; one compact NEXT_CHAT.md retains current rules, decisions and deferred work.') for p in (root / 'handoff').iterdir() if p.name != 'NEXT_CHAT.md']
targets += [(p, 'Old copied checkpoint documents; feature history stays in CHANGELOG and originals remain in Git commit d7044b7.') for p in (root / 'docs/history').iterdir() if p.name != 'CHANGELOG-2026-10-24.md']
targets += [(p, 'Obsolete native archive or sidecar; latest native ZIP verified by SHA256 and CRC and retained.') for p in (root / 'release').iterdir() if p.name.startswith('Grave_Accord_2026.') and not p.name.startswith('Grave_Accord_2026.10.30_Shared_Network_Public_Review')]
for name in ['handoff-browser-repair-extraction-01', '引継ぎ-browser-repair-windows-copy-01', 'contest-publication-2026-10-30/handoff-fresh-extraction', 'sites-contest-initial-stage-2026-10-30', 'sites-contest-public-version-1-build-2026-10-30', 'sites-contest-browser-repair-candidate-d5f935a-build-2026-10-30', 'grave-accord-contest-public-2026-10-30.tar.gz', 'grave-accord-contest-public-audio-delivery-03.tar.gz', 'grave-accord-browser-repair-public-01.tar.gz']:
    path = root / 'output' / name
    if path.exists(): targets.append((path, 'Obsolete generated publication or handoff copy; current source, Site repository and version2 archive retained.'))
for name in ['sites-contest-wav-masters-2026-10-30', 'browser-fixes-site-original-masters-d5f935a', 'browser-fixes-site-original-masters-8c75bb8']:
    path = root / 'output' / name
    if path.exists():
        for file in path.rglob('*'):
            if file.is_file(): assert hashlib.sha256(file.read_bytes()).hexdigest() in masters, file
        targets.append((path, 'Duplicate emitted music masters; every byte matches a verified canonical master in assets/, already present in GitHub source.'))
targets.append((root / 'release/Grave-Accord-2026.10.30-shared-network-public-win32-x64', 'Duplicate expanded native app; latest full native ZIP verified by SHA256 and CRC and retained.'))
items = []
for target, reason in targets:
    if not target.exists(): continue
    relative = target.relative_to(root).as_posix()
    assert relative.startswith(('handoff/', 'docs/history/', 'release/', 'output/')) and relative != 'handoff/NEXT_CHAT.md'
    members = [p for p in target.rglob('*') if p.is_file()] if target.is_dir() else [target]
    items.append({'path': relative, 'absolutePath': str(target), 'directory': target.is_dir(), 'bytes': sum(p.stat().st_size for p in members), 'files': len(members), 'reason': reason})
plan = {'preparedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'root': str(root), 'authorizedBy': 'User explicitly requested removal of old handoffs and redundant resources, keeping one useful next-chat handoff and feature-only history.', 'backupCommit': 'd7044b7490c226ba25aa9083007271a7b5336eba', 'latestNativeZip': str(latest.relative_to(root)), 'latestNativeZipSha256': '4a8f24625c3e8d39327156c6fd9198e67a0341ad8ad509bfab52e8691c7eb0a0', 'canonicalMusicMastersVerified': 67, 'bytes': sum(x['bytes'] for x in items), 'items': items}
with (scope / 'lean-archive-cleanup-plan.json').open('x', encoding='utf-8', newline='\n') as output:
    json.dump(plan, output, indent=2); output.write('\n')
print(json.dumps({'items': len(items), 'GiB': round(plan['bytes'] / 1024**3, 2), 'keptHandoff': 'handoff/NEXT_CHAT.md', 'keptNativeZip': plan['latestNativeZip']}))
