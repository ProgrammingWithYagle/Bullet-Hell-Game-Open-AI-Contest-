from pathlib import Path
import hashlib, json, shutil

TASK=Path(__file__).resolve().parent
REPO=Path(r'C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)')
BASE='assets/production/generated/early-watch-motion-2026-10-25'
DEST=REPO/BASE
REVIEW=REPO/'reviews/early-watch-motion-2026-10-25'
assert not DEST.exists() and not REVIEW.exists(), 'Never overwrite an issued checkpoint'
DEST.mkdir(parents=True);REVIEW.mkdir(parents=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=[]
def copy(source,target):
    target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
    assert sha(source)==sha(target)
    files.append({'path':target.relative_to(REPO).as_posix(),'bytes':target.stat().st_size,'sha256':sha(target)})
for folder,target in [('motion-natives','natives'),('references','references'),('requests','requests'),('checkpoint','normalized')]:
    for p in sorted((TASK/folder).glob('*')):
        if p.is_file():copy(p,DEST/target/p.name)
for name in ['motion-input-contracts.json','motion-returns.json','native-gutter-checks.json','design.json']:
    copy(TASK/name,DEST/(Path(name).stem+'.issued.json'))
for name in ['prepare-motion.py','record-motion-return.py','check-native-gutters.py','pack-checkpoint.py']:
    copy(TASK/name,REVIEW/name)
copy(REPO/'reviews/constable-motion-2026-10-25/whole-pose-components.py',REVIEW/'whole-pose-components.py')
for folder in sorted(TASK.glob('checkpoint-attempt-*')):
    for p in sorted(folder.rglob('*')):
        if p.is_file():copy(p,REVIEW/'packing-history'/folder.name/p.relative_to(folder))
contracts=json.loads((TASK/'motion-input-contracts.json').read_text(encoding='utf-8'))
bindings={}
for c in contracts['identities']:
    for field in ['native','seed','horizontal','grid']:
        old=c[field]
        if field=='native': rel=Path(old).relative_to(REPO).as_posix()
        else:rel=f'{BASE}/references/{Path(old).name}'
        assert sha(REPO/rel)==c[field+'Sha256']
        bindings[old]=rel
returns=json.loads((TASK/'motion-returns.json').read_text(encoding='utf-8'))['returns']
statuses=[]
for r in returns:
    native=f'{BASE}/natives/{Path(r["native"]).name}'
    assert sha(REPO/native)==r['sha256']
    request=f'{BASE}/requests/{r["clip"]}-v{r["version"]}.request.json'
    assert (REPO/request).exists()
    bindings[r['native']]=native;bindings[r['issuedNative']]=native
    statuses.append({'clip':r['clip'],'version':r['version'],'native':native,'nativeSha256':r['sha256'],
                     'request':request,'requestSha256':sha(REPO/request),'issuedNative':r['issuedNative'],
                     'selection':'rejected-padding' if r['version']==1 and r['clip']=='brass-toad-hop' else 'technically-normalized-candidate',
                     'renderedAccepted':False})
executed={s['request'] for s in statuses}
requests=[]
for p in sorted((DEST/'requests').glob('*.request.json')):
    rel=p.relative_to(REPO).as_posix();args=json.loads(p.read_text(encoding='utf-8'))
    assert args['transparent_background'] is True
    assert all(ref in bindings for ref in args['referenced_image_paths'])
    requests.append({'path':rel,'sha256':sha(p),'executed':rel in executed,
                     'status':'executed' if rel in executed else ('superseded-before-execution' if p.name=='brass-toad-idle-v1.request.json' else 'prepared-not-executed')})
doc={'checkpoint':'2026-10-25-early-watch-motion','baseGameplayCommit':'f1766fe9c41184df44c15902533aff0e2fd7ef2c',
     'playableBossesAdded':0,'playableBosses':60,'ordinaryBossesRemaining':91,
     'generatedSheets':4,'selectedCandidateSheets':3,'completeCandidatePoses':12,
     'concepts':['ashen-usher','brass-toad','ragpicker-kite'],'motionCandidateIdentities':['brass-toad'],
     'runtimeAdmitted':False,'renderedAccepted':False,'humanAccepted':False,
     'returns':statuses,'requests':requests,'portableBindings':bindings,'files':files,
     'contactSheet':'docs/wiki/images/brass-toad-motion-checkpoint.jpg',
     'packing':BASE+'/normalized/packing.json',
     'inspection':['Assistant inspected all three selected complete natives and the final teal-background static contact.',
                   'Single physical scale per clip, calibrated by the initial upright body. Shared readable bottom-center anchor retains all faint surrounding pixels.',
                   'Initial 512-cell packing and subsequent tight anchor guards stopped before admission; their partial outputs remain in packing-history.',
                   'The hop needs authoritative travel/lift timing and contact with the arena before engine acceptance. No new encounter or music exists yet.'],
     'limits':['Not part of the runtime animation index or 1466 selected runtime poses.',
               'Three original concepts plus this art checkpoint do not change playable roster or coverage.',
               'Six Usher/Kite sheets are prepared but unexecuted. Do not describe their requests as returned images.',
               'Issued absolute paths are retained exactly; portableBindings supplies repository-relative equivalents without rewriting history.']}
(REPO/'docs/early-watch-motion-checkpoint-2026-10-25.json').write_text(json.dumps(doc,indent=2)+'\n',encoding='utf-8',newline='\n')
copy(TASK/'checkpoint/brass-toad-motion-checkpoint.jpg',REPO/'docs/wiki/images/brass-toad-motion-checkpoint.jpg')
attrs=REPO/'.gitattributes'
with attrs.open('a',encoding='utf-8',newline='\n') as f:
    f.write('\n# Preserve exact preproduction requests and issued preparation records.\n')
    f.write(BASE+'/requests/*.request.json -text -whitespace\n'+BASE+'/*.issued.json -text -whitespace\n')
    f.write('reviews/early-watch-motion-2026-10-25/*.log -text -whitespace\n')
print(json.dumps({'copied':len(files),'requests':len(requests),'executed':len(executed),'candidatePoses':12,'runtimeAdded':0}))
