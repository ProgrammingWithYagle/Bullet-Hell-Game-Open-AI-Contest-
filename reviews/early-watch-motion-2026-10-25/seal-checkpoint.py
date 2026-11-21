from pathlib import Path
import hashlib,json,re,shutil,subprocess

task=Path(__file__).resolve().parent
repo=Path(r'C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)')
review=repo/'reviews/early-watch-motion-2026-10-25'
base='f1766fe9c41184df44c15902533aff0e2fd7ef2c'
git=lambda *args:subprocess.check_output(['git','-C',str(repo),'-c','core.bare=false',*args])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
write=lambda p,j:p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
assert git('rev-parse','HEAD').decode().strip()==base
assert git('branch','--show-current').decode().strip()=='feat/first-playable-loop'
assert not git('diff',base,'--','assets','content','src/shared/protocol.ts','src/shared/boss-threats.json').strip()
changed=git('diff','--name-only',base,'--','src').decode().splitlines()
assert sorted(changed)==['src/shared/development-progress.json','src/shared/update-history.json'],changed
runtime=read(repo/'reviews/runtime-verification.json');assert runtime['passed']
log=(task/'full-current.log').read_text(encoding='utf-8-sig');assert re.search(r'tests 382\b',log) and re.search(r'pass 382\b',log) and re.search(r'fail 0\b',log)
old_images=json.loads(git('show',base+':docs/wiki-images.json'));images=read(repo/'docs/wiki-images.json')
assert len(old_images['files'])==26 and len(images['files'])==27
for f in old_images['files']:assert sha(repo/'docs/wiki'/f['path'])==f['sha256']
for f in images['files']:assert sha(repo/'docs/wiki'/f['path'])==f['sha256']
audit=read(task/'documentation-audit.json');assert not audit['brokenLinks'] and audit['archiveBytesAndHashesMatch']
preview=read(task/'frozen-preview-restart.json');assert preview['source']==base
p=repo/'docs/CHECKPOINT_2026_10_25.md';s=p.read_text(encoding='utf-8')
s=s.replace('Hidden preview PID **34336**, root',f'Current preview PID **{preview["pid"]}** (restarted after the former 34336 process ended), root')
p.write_text(s,encoding='utf-8',newline='\n')
with (repo/'.gitattributes').open('a',encoding='utf-8',newline='\n') as f:f.write('\nSTART_NEXT_CHAT.txt text eol=lf\n')
for name in ['full-current.log','documentation-audit.json','restart-frozen-preview.ps1','seal-checkpoint.py','audit-documentation.py','install-checkpoint.py','finish-checkpoint-docs.py']:
    shutil.copy2(task/name,review/name)
shutil.copy2(repo/'reviews/runtime-verification.json',review/'runtime.json')
shutil.copy2(repo/'reviews/stage1-validation.json',review/'authored-content.json')
for source,name in [(task/'frozen-preview-restart.json','manual-preview-process.json'),(task.parent/'frozen-brutal-signals-verification.json','manual-preview-bytes.json'),(task.parent/'frozen-brutal-signals-http.json','manual-preview-http.json')]:
    shutil.copy2(source,review/name)
report={'passed':True,'baseGameplayCommit':base,'buildId':'2026.10.25-brutal-signals','protocol':14,'automatedTests':382,
        'sourceSnapshotSha256':runtime['sourceSnapshotSha256'],'runtimeSourceSha256':runtime['runtimeSourceSha256'],
        'contentRevision':runtime['contentRevision'],'newPlayableBosses':0,'playableBosses':60,'ordinaryBossesRemaining':91,
        'existingBossQualityRemaining':59,'classAbilityRevampsRemaining':7,'optionalTreeRemaining':1,'secondaryMapImplementationRemaining':0,
        'newCandidatePoses':12,'runtimeMotionTotalUnchanged':1466,'oldTrackedArtMusicContentAndGameplayCodeUnchanged':True,
        'oldWikiImagesUnchanged':26,'currentWikiImages':27,'canonicalWikiPages':18,'documentationAudit':audit,
        'artVerification':read(review/'verification.json'),'manualPreview':{'url':preview['url'],'pid':preview['pid'],'source':base,'httpChecks':17},
        'renderedAccepted':False,'limits':['This is a requested handoff checkpoint; the full game remains unfinished.',
        'Only journal/progress JSON changes under src; the new art remains outside the runtime asset index.',
        'The latest frozen preview is preserved gameplay source f1766fe, not a new Toad encounter or updated art journal.',
        'Human/device/native-language/listening, final balance, deployed recovery/rankings, WAN and coordinated release gates remain open.']}
write(review/'assessment.json',report)
print(json.dumps({k:report[k]for k in ['passed','automatedTests','sourceSnapshotSha256','runtimeSourceSha256','currentWikiImages','newCandidatePoses']}))
