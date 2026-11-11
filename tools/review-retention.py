"""Bounded local preview storage. Planning/archiving/restoration never delete builds.

Use apply-review-retention.ps1 for reviewed, identity-checked Windows cleanup.
Private databases, source, assets, release files and original receipts are excluded.
"""
import argparse, collections, datetime, hashlib, json, os, pathlib, re, shutil, stat, subprocess, tempfile, unittest, zipfile

SCHEMA=1
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(data):return hashlib.sha256(data).hexdigest()
def read(path):return json.loads(pathlib.Path(path).read_text(encoding='utf-8-sig'))
def write_new(path,value):
    path=pathlib.Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('x',encoding='utf-8',newline='\n') as out:json.dump(value,out,indent=2);out.write('\n')
def git(repo,*args):return subprocess.check_output(['git','-c','core.bare=false',*args],cwd=repo).decode('utf-8').strip()
def private(path):
    name=pathlib.PurePosixPath(str(path).replace('\\','/')).name.lower()
    return '.sqlite' in name or bool(re.search(r'\.db(?:-|$)',name))
def regular_files(root):
    root=pathlib.Path(root)
    assert root.is_dir() and not root.is_symlink(),'Expected a real directory: '+str(root)
    result=[]
    def visit(directory):
        with os.scandir(directory) as entries:
            for entry in entries:
                file=pathlib.Path(entry.path);info=entry.stat(follow_symlinks=False)
                if stat.S_ISDIR(info.st_mode):
                    assert not entry.is_symlink() and not (getattr(info,'st_file_attributes',0)&0x400),'Directory reparse point: '+str(file)
                    visit(file)
                else:
                    assert stat.S_ISREG(info.st_mode) and not entry.is_symlink(),'Nonregular file: '+str(file)
                    result.append((file.relative_to(root).as_posix(),file,info))
    visit(root)
    return sorted(result,key=lambda row:row[0])
def snapshot(root):
    files=regular_files(root);lines=[]
    for relative,file,info in files:
        assert not private(relative),'Private database inside a preview root: '+str(file)
        ticks=info.st_mtime_ns//100+621355968000000000
        lines.append(relative+'\0'+str(info.st_size)+'\0'+str(ticks)+'\n')
    return {'files':len(files),'bytes':sum(r[2].st_size for r in files),'treeStatSha256':digest(''.join(lines).encode('utf-8'))}
def checked_repo(value):
    repo=pathlib.Path(value).resolve()
    assert read(repo/'package.json')['name']=='grave-accord'
    assert (repo/'output').is_dir() and not (repo/'output').is_symlink()
    return repo
def scope_path(repo,scope):
    assert re.fullmatch(r'reviews/[a-z0-9-]+',scope)
    return repo/scope
def preview(repo,scope,audience,require_backend=True):
    file=scope_path(repo,scope)/('preview-'+audience+'.json');p=read(file)
    assert p['passed'] and p['audience']==audience
    root=pathlib.Path(p['root']).resolve();assert root.parent==repo/'output' and re.fullmatch(r'playtest-[a-z0-9-]+',root.name)
    manifest=pathlib.Path(p['manifestPath']);assert manifest.resolve().parent==repo/'output'
    assert digest(manifest.read_bytes())==p['manifestSha256']
    m=read(manifest);assert len(m['members'])==p['files']
    backend=pathlib.Path(p['backend']['path']).resolve();assert backend.parent==repo/'output' and re.fullmatch(r'frozen-[a-z0-9-]+\.mjs',backend.name)
    if require_backend:assert digest(backend.read_bytes())==p['backend']['sha256']
    return p,m,file,root,backend
def plan(args):
    repo=checked_repo(args.repo);destination=scope_path(repo,args.receipt_scope);destination.mkdir(exist_ok=True)
    current=[preview(repo,args.current_scope,a) for a in ['testing','public']]
    rollback=[preview(repo,args.rollback_scope,a,require_backend=False) for a in ['testing','public']]
    assert len({p[0]['sourceCommit'] for p in current})==1 and len({p[0]['sourceCommit'] for p in rollback})==1
    rollback_proof=read(scope_path(repo,args.rollback_scope)/'frozen-verification.json')
    assert rollback_proof['passed'] and rollback_proof['sourceCommit']==rollback[0][0]['sourceCommit'],'Rollback must be a fully reviewed source'
    state_path=repo/'output/review-retention.json';state=read(state_path) if state_path.exists() else {}
    archive_matches=state.get('rollbackScope')==args.rollback_scope and state.get('rollbackSourceCommit')==rollback[0][0]['sourceCommit'] and (repo/'output/review-rollback.zip').is_file()
    reuse=rollback_mode([p[3].is_dir() for p in rollback],archive_matches)
    keep={p[3] for p in current};assert len(keep)==2
    retained=[{'path':p[3].relative_to(repo).as_posix(),'sourceCommit':p[0]['sourceCommit'],'scope':args.current_scope,'audience':p[0]['audience'],'manifestPath':p[0]['manifestPath'],'manifestSha256':p[0]['manifestSha256'],**snapshot(p[3])} for p in current]
    directories=[]
    for directory in sorted((repo/'output').glob('playtest-*')):
        assert directory.parent==repo/'output' and re.fullmatch(r'playtest-[a-z0-9-]+',directory.name)
        if directory.resolve() in keep:continue
        row={'path':directory.relative_to(repo).as_posix(),**snapshot(directory)}
        identity=directory/'preview-build.json'
        if identity.exists():row.update({'identity':read(identity),'identitySha256':digest(identity.read_bytes())})
        else:row['identity']=None
        directories.append(row)
    if not reuse:assert all(p[3].relative_to(repo).as_posix() in {r['path'] for r in directories} for p in rollback)
    keep_backends={p[4] for p in current};backends=[]
    for file in sorted((repo/'output').glob('frozen-*.mjs')):
        assert file.is_file() and not file.is_symlink() and re.fullmatch(r'frozen-[a-z0-9-]+\.mjs',file.name)
        if file.resolve() not in keep_backends:backends.append({'path':file.relative_to(repo).as_posix(),'bytes':file.stat().st_size,'sha256':digest(file.read_bytes())})
    previous=repo/'output/review-rollback.zip'
    record={'schemaVersion':SCHEMA,'createdAt':now(),'repo':str(repo),'gitHead':git(repo,'rev-parse','HEAD'),'branch':git(repo,'branch','--show-current'),'currentScope':args.current_scope,'rollbackScope':args.rollback_scope,'currentSourceCommit':current[0][0]['sourceCommit'],'rollbackSourceCommit':rollback[0][0]['sourceCommit'],'keep':retained,'keepBackendPaths':[p.relative_to(repo).as_posix() for p in sorted(keep_backends)],'retireDirectories':directories,'retireBackends':backends,'retireDirectoryCount':len(directories),'retireFileBytes':sum(r['bytes'] for r in directories+backends),'candidateArchive':'output/review-rollback.next.zip','finalArchive':'output/review-rollback.zip','previousArchiveSha256':digest(previous.read_bytes()) if previous.exists() else None,'sourceAssetsReviewsReleaseAndPrivateDatabasesExcluded':True,'policy':'Keep one current expanded testing/public pair and one verified rollback archive; retire older expanded build copies and their exact preview services. Original receipts remain historical.','authorizedByUser':True,'cleanupNotYetPerformed':True}
    assert record['branch']=='feat/first-playable-loop'
    record['reuseExistingVerifiedRollback']=reuse
    record['existingRollbackArchiveSha256']=state.get('rollbackArchiveSha256') if reuse else None
    write_new(destination/'retention-plan.json',record)
    print(json.dumps({'planned':True,'retireDirectories':len(directories),'retireGiB':round(record['retireFileBytes']/2**30,3),'keep':[r['path'] for r in retained],'rollback':record['rollbackSourceCommit']}))
def safe_member(value):
    assert isinstance(value,str) and '\\' not in value and not value.startswith('/') and ':' not in value
    parts=value.split('/');assert parts and all(p not in ('','.','..') for p in parts)
    assert not private(value),'Private data cannot enter a build archive'
    return pathlib.PurePosixPath(value)
def rollback_mode(expanded,archive_matches):
    assert len(expanded)==2
    if all(expanded):return False
    assert not any(expanded) and archive_matches,'Rollback must be an intact expanded pair or the matching verified archive'
    return True
def encode_archive(target,rows,metadata):
    objects={};members=[]
    with zipfile.ZipFile(target,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=3,allowZip64=True) as archive:
        for member,file,expected in rows:
            safe_member(member);data=pathlib.Path(file).read_bytes();key=digest(data)
            assert key==expected['sha256'] and len(data)==expected['bytes'],str(file)
            if key not in objects:
                archive.writestr('objects/'+key,data);objects[key]=len(data)
            members.append({'path':member,'bytes':len(data),'sha256':key})
        index={'schemaVersion':SCHEMA,'createdAt':now(),**metadata,'members':members,'objects':objects,'noPrivateDatabases':True}
        archive.writestr('index.json',json.dumps(index,indent=2).encode('utf-8'))
    return index
def verify_archive(archive,expected_sha=None):
    archive=pathlib.Path(archive)
    if expected_sha:assert digest(archive.read_bytes())==expected_sha,'Archive digest differs'
    with zipfile.ZipFile(archive) as source:
        names=source.namelist();assert len(names)==len(set(names)) and names.count('index.json')==1
        index=json.loads(source.read('index.json'));assert index['schemaVersion']==SCHEMA and index['noPrivateDatabases']
        expected={'index.json'}
        for key,size in index['objects'].items():
            assert re.fullmatch('[0-9a-f]{64}',key)
            name='objects/'+key;expected.add(name);data=source.read(name)
            assert len(data)==size and digest(data)==key,'Corrupt object '+key
        assert set(names)==expected
        paths=set()
        for member in index['members']:
            safe_member(member['path']);assert member['path'] not in paths;paths.add(member['path'])
            assert member['sha256'] in index['objects'] and member['bytes']==index['objects'][member['sha256']]
        return index
def restore_archive(archive,destination,expected_sha):
    index=verify_archive(archive,expected_sha);destination=pathlib.Path(destination).resolve()
    targets=[]
    for member in index['members']:
        relative=safe_member(member['path']);assert relative.parts[0]=='output'
        file=destination/pathlib.Path(*relative.parts);assert file.resolve().is_relative_to(destination)
        if file.exists():
            assert file.is_file() and not file.is_symlink() and digest(file.read_bytes())==member['sha256'],'Refuse overwriting a different existing archive member: '+str(file)
        parent=file.parent
        while parent!=destination:
            assert not parent.is_symlink(),'Symlink in destination path';parent=parent.parent
        targets.append((member,file,file.exists()))
    with zipfile.ZipFile(archive) as source:
        for member,file,already_identical in targets:
            if already_identical:continue
            data=source.read('objects/'+member['sha256']);assert digest(data)==member['sha256']
            file.parent.mkdir(parents=True,exist_ok=True)
            with file.open('xb') as out:out.write(data)
    for member,file,_ in targets:assert digest(file.read_bytes())==member['sha256']
    return index
def archive(args):
    plan_file=pathlib.Path(args.plan).resolve();p=read(plan_file);repo=checked_repo(p['repo'])
    assert git(repo,'rev-parse','HEAD')==p['gitHead']
    target=repo/p['candidateArchive'];assert target.parent==repo/'output' and target.name=='review-rollback.next.zip'
    rows=[];roots=[]
    if p.get('reuseExistingVerifiedRollback'):
        previous=repo/p['finalArchive'];index=verify_archive(previous,p['existingRollbackArchiveSha256'])
        assert index['sourceCommit']==p['rollbackSourceCommit'] and index['scope']==p['rollbackScope']
        assert not target.exists();shutil.copyfile(previous,target)
        assert digest(target.read_bytes())==p['existingRollbackArchiveSha256']
    for audience in ([] if p.get('reuseExistingVerifiedRollback') else ['testing','public']):
        preview_data,manifest,preview_file,root,backend=preview(repo,p['rollbackScope'],audience)
        roots.append(root.relative_to(repo).as_posix())
        expected={m['path']:m for m in manifest['members']};actual=regular_files(root);assert {r[0] for r in actual}==set(expected)
        for relative,file,info in actual:rows.append((file.relative_to(repo).as_posix(),file,expected[relative]))
        for file in [backend,pathlib.Path(preview_data['manifestPath'])]:
            member=file.relative_to(repo).as_posix()
            if member not in {r[0] for r in rows}:rows.append((member,file,{'bytes':file.stat().st_size,'sha256':digest(file.read_bytes())}))
    if not p.get('reuseExistingVerifiedRollback'):index=encode_archive(target,rows,{'sourceCommit':p['rollbackSourceCommit'],'scope':p['rollbackScope'],'roots':roots,'externalProjectNodeModulesRequired':True,'purpose':'One last fully reviewed testing/public rollback pair; duplicate file content stored once.'})
    archive_sha=digest(target.read_bytes());verified=verify_archive(target,archive_sha);assert verified==index
    write_new(plan_file.parent/'rollback-archive.json',{'passed':True,'verifiedAt':now(),'candidateArchive':p['candidateArchive'],'finalArchive':p['finalArchive'],'sourceCommit':p['rollbackSourceCommit'],'archiveSha256':archive_sha,'archiveBytes':target.stat().st_size,'restoredFiles':len(index['members']),'uniqueObjects':len(index['objects']),'unpackedBytes':sum(m['bytes'] for m in index['members']),'allArchivedObjectsAndReferencesVerified':True,'privateDatabasesIncluded':False,'originalFoldersStillPresent':not p.get('reuseExistingVerifiedRollback',False),'reusedExistingVerifiedRollback':p.get('reuseExistingVerifiedRollback',False)})
    print(json.dumps({'archived':True,'files':len(index['members']),'uniqueObjects':len(index['objects']),'archiveGiB':round(target.stat().st_size/2**30,3)}))
def verify(args):
    proof=read(args.receipt);repo=checked_repo(args.repo)
    file=repo/proof['candidateArchive'];file=file if file.exists() else repo/proof['finalArchive']
    index=verify_archive(file,proof['archiveSha256'])
    if args.restore_check:
        destination=repo/'output/retention-restore-check';assert not destination.exists()
        restore_archive(file,destination,proof['archiveSha256'])
        write_new(pathlib.Path(args.receipt).parent/'rollback-restore-check.json',{'passed':True,'checkedAt':now(),'archiveSha256':proof['archiveSha256'],'destination':str(destination),'restoredFiles':len(index['members']),'allRestoredMemberBytesExact':True,'temporaryTreeMayBeRemovedAfterVerification':True,'noRuntimeOrOnlineProofClaimed':True})
    print(json.dumps({'verified':True,'files':len(index['members']),'restoreCheck':bool(args.restore_check)}))
class SafetyTests(unittest.TestCase):
    def test_cold_rollback_selection(self):
        self.assertTrue(rollback_mode([False,False],True))
        self.assertFalse(rollback_mode([True,True],False))
        for flags,matching in [([False,False],False),([True,False],True)]:
            with self.assertRaises(AssertionError):rollback_mode(flags,matching)
    def test_roundtrip_and_dedup(self):
        with tempfile.TemporaryDirectory() as folder:
            base=pathlib.Path(folder);a=base/'a';b=base/'b';a.write_bytes(b'alpha'*20);b.write_bytes(b'beta')
            rows=[('output/playtest-a/assets/a',a,{'bytes':a.stat().st_size,'sha256':digest(a.read_bytes())}),('output/playtest-b/assets/a',a,{'bytes':a.stat().st_size,'sha256':digest(a.read_bytes())}),('output/frozen-b.mjs',b,{'bytes':b.stat().st_size,'sha256':digest(b.read_bytes())})]
            archive=base/'rollback.zip';index=encode_archive(archive,rows,{'sourceCommit':'fixture'});self.assertEqual(len(index['objects']),2)
            sha=digest(archive.read_bytes());restore_archive(archive,base/'restored',sha);self.assertEqual((base/'restored/output/playtest-a/assets/a').read_bytes(),a.read_bytes())
            restored=base/'restored/output/playtest-a/assets/a';stamp=restored.stat().st_mtime_ns
            restore_archive(archive,base/'restored',sha);self.assertEqual(restored.stat().st_mtime_ns,stamp)
            restored.write_bytes(b'changed')
            with self.assertRaises(AssertionError):restore_archive(archive,base/'restored',sha)
    def test_unsafe_paths_and_private_data(self):
        for value in ['../outside','/absolute','C:/absolute','output/../escape','output/a.sqlite','output/a.sqlite-wal','output/a.db','output\\escape','output//bad']:
            with self.subTest(value=value),self.assertRaises(AssertionError):safe_member(value)
    def test_corrupt_archive_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            file=pathlib.Path(folder)/'broken.zip';file.write_bytes(b'broken')
            with self.assertRaises(AssertionError):verify_archive(file,'0'*64)
    def test_snapshot_detects_new_file(self):
        with tempfile.TemporaryDirectory() as folder:
            root=pathlib.Path(folder);(root/'a').write_bytes(b'original');first=snapshot(root);(root/'b').write_bytes(b'new')
            self.assertNotEqual(first['treeStatSha256'],snapshot(root)['treeStatSha256'])
def main():
    parser=argparse.ArgumentParser(description=__doc__);commands=parser.add_subparsers(dest='command',required=True)
    p=commands.add_parser('plan');p.add_argument('--repo',required=True);p.add_argument('--current-scope',required=True);p.add_argument('--rollback-scope',required=True);p.add_argument('--receipt-scope',required=True);p.set_defaults(run=plan)
    p=commands.add_parser('archive');p.add_argument('--plan',required=True);p.set_defaults(run=archive)
    p=commands.add_parser('verify');p.add_argument('--repo',required=True);p.add_argument('--receipt',required=True);p.add_argument('--restore-check',action='store_true');p.set_defaults(run=verify)
    p=commands.add_parser('restore');p.add_argument('--archive',required=True);p.add_argument('--sha256',required=True);p.add_argument('--into',required=True);p.set_defaults(run=lambda a:restore_archive(a.archive,a.into,a.sha256))
    p=commands.add_parser('self-test');p.set_defaults(run=lambda a:unittest.main(argv=['review-retention'],exit=False).result.wasSuccessful())
    args=parser.parse_args();result=args.run(args)
    if result is False:raise SystemExit(1)
if __name__=='__main__':main()
