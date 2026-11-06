"""Independently verify immutable raw measurements and the exact frozen committed source."""
from pathlib import Path
import hashlib,io,json,math,shutil,subprocess,sys,tarfile
r=Path(sys.argv[1]).resolve()if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
raw_path=r/'reviews/performance/endurance-50-moths-20261024-2.json';raw=json.loads(raw_path.read_text(encoding='utf-8'));m=raw['measurement'];freeze=raw['freeze']
assert sha(raw_path)=='e0569da31afbfbbda7834c9b8b1a89efc95ddfeffed79fea6e7bca192d92856d'
assert raw['passed']and all(raw['criteria'].values())and raw['bundlesUnchanged']and raw['renderedClients']==0 and raw['scriptedClients']==50
assert freeze['commit']=='723a66796e4a6d2c6d3c28611b5b7a5366de2f08'
frozen=r/'reviews/performance/endurance-20261024-2';assert json.loads((frozen/'freeze.json').read_text())==freeze
for item in freeze['bundles']:assert sha(frozen/item['name'])==item['sha256']
for item in freeze['tools']+[freeze['lockfile']]:assert sha(r/item['path'])==item['sha256'],item['path']
archive=subprocess.check_output(['git','-C',str(r),'-c','core.bare=false','archive',freeze['commit'],'src','reviews/runtime-verification.json','pnpm-lock.yaml'])
with tarfile.open(fileobj=io.BytesIO(archive))as tar:
 h=hashlib.sha256()
 for item in sorted(freeze['source'],key=lambda x:x['path']):
  data=tar.extractfile(item['path']).read();assert hashlib.sha256(data).hexdigest()==item['sha256'],item['path'];h.update((item['path']+'\0').encode());h.update(data)
 assert h.hexdigest()==freeze['runtimeSourceSha256']
 committed=json.loads(tar.extractfile('reviews/runtime-verification.json').read());assert committed['passed']and committed['runtimeSourceSha256']==freeze['runtimeSourceSha256']and committed['sourceSnapshotSha256']==freeze['verificationSourceSnapshot']
 assert hashlib.sha256(tar.extractfile('pnpm-lock.yaml').read()).hexdigest()==freeze['lockfile']['sha256']
samples=m['tickSamplesMs'];assert len(samples)==m['samples']==108001 and all(isinstance(x,(float,int))and math.isfinite(x)and x>=0 for x in samples)
ordered=sorted(samples);q=lambda values,f:sorted(values)[min(len(values)-1,math.floor(len(values)*f))]
assert q(samples,.5)==m['tickP50Ms']and q(samples,.99)==m['tickP99Ms']and ordered[-1]==m['tickMaxMs']
assert sum(t>1000/30 for t in samples)==m['overBudgetTicks']==236
assert m['durationSeconds']>=3600 and m['tickP99Ms']<25 and m['lowestClients']==m['lowestActivePlayers']==50 and m['peakHostiles']==4000
assert m['acceptedInputs']==4286000 and m['rejectedInputs']==0 and m['encodedOutboundBytes']==15534440747
assert sum(raw['classRoster'].values())==50 and len(raw['classRoster'])==7
assert len(m['memory'])==241 and len(raw['clientProgress'])==240
for a,b in zip(m['memory'],raw['clientProgress']):assert all(b[k]==v for k,v in a.items())and a['clients']==50 and a['shots']>=4000
assert m['memory'][-1]['elapsedSeconds']==m['durationSeconds']and m['memory'][-1]['clients']==50 and m['memory'][-1]['shots']>=4000
assert m['memory'][-1]['encodedOutboundBytes']==m['encodedOutboundBytes']
assert all(a['elapsedSeconds']<b['elapsedSeconds']for a,b in zip(m['memory'],m['memory'][1:]))
def memory_summary(records,field):
 values=[a[field]/1048576 for a in records]
 bins=[]
 for start in range(0,60,10):
  block=[a[field]/1048576 for a in records if start<=a['elapsedSeconds']/60<start+10]
  bins.append({'minuteStart':start,'samples':len(block),'minimumMiB':min(block),'medianMiB':q(block,.5),'maximumMiB':max(block)})
 return {'minimumMiB':min(values),'medianMiB':q(values,.5),'maximumMiB':max(values),'tenMinuteBins':bins}
parents=[{'elapsedSeconds':a['elapsedSeconds'],**a['clientMemory']}for a in raw['clientProgress']]
figure=r/'reviews/performance/endurance-50-moths-20261024-2-figure-v2.json';f=json.loads(figure.read_text());assert sha(r/f['figure'])==f['figureSha256']and f['sourceSha256']==sha(raw_path)and f['toolSha256']==sha(r/f['tool'])
report={'passed':True,'raw':raw_path.relative_to(r).as_posix(),'rawSha256':sha(raw_path),'frozenCommit':freeze['commit'],'runtimeSourceSha256':freeze['runtimeSourceSha256'],'frozenSourcesVerifiedAgainstGit':len(freeze['source']),'frozenBundleHashesVerified':freeze['bundles'],'independentVerifier':'tools/verify-endurance.py','independentVerifierSha256':sha(Path(__file__)),'durationSeconds':m['durationSeconds'],'ticks':len(samples),'tickMedianMs':q(samples,.5),'tickP99Ms':q(samples,.99),'tickWorstMs':ordered[-1],'ticksOver33_333Ms':m['overBudgetTicks'],'acceptedInputs':m['acceptedInputs'],'rejectedInputs':m['rejectedInputs'],'observedAcceptedInputsPerClientSecond':m['acceptedInputs']/m['durationSeconds']/50,'encodedOutboundBytes':m['encodedOutboundBytes'],'encodedOutboundBytesPerSecond':m['encodedOutboundBytes']/m['durationSeconds'],'serverHeap':memory_summary(m['memory'],'heapUsed'),'sdkParentHeap':memory_summary(parents,'heapUsed'),'serverRss':memory_summary(m['memory'],'rss'),'sdkParentRss':memory_summary(parents,'rss'),'figureReceiptSha256':sha(figure),'renderedClients':0,'limits':raw['limits']+['Other normal art packing and build work occurred on the same host during the frozen probe.','Source art changes after the frozen commit are not attributed these measurements.']}
out=r/'reviews/performance/endurance-50-moths-20261024-2-verification.json';out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({k:report[k]for k in ['passed','durationSeconds','ticks','tickP99Ms','tickWorstMs','frozenSourcesVerifiedAgainstGit','renderedClients']}))
