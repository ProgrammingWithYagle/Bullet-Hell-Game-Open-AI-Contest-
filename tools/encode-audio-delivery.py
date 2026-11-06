#!/usr/bin/env python3
"""Original PCM masters stay immutable; encode and independently decode browser delivery copies.

Requires numpy and a local FFmpeg with libmp3lame. No encoder binary ships with the game.
python tools/encode-audio-delivery.py --ffmpeg C:/path/to/ffmpeg.exe
python tools/encode-audio-delivery.py --ffmpeg C:/path/to/ffmpeg.exe --verify-only
"""
from pathlib import Path
import argparse,hashlib,json,subprocess,wave,datetime
import numpy as np

ROOT=Path(__file__).resolve().parent.parent
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--ffmpeg',required=True);parser.add_argument('--verify-only',action='store_true');args=parser.parse_args()
    ff=Path(args.ffmpeg).resolve();assert ff.is_file()
    version=subprocess.check_output([str(ff),'-version'],text=True,encoding='utf-8').splitlines()[0]
    boss=json.loads((ROOT/'assets/production/audio/boss-themes/library.json').read_text(encoding='utf-8'))
    proof=json.loads((ROOT/'assets/audio/manifest.json').read_text(encoding='utf-8'))
    city=next(f for f in proof['files'] if f['path'].endswith('/city-wake.wav'))
    sources=[{'id':t['id'],'bossId':t['bossId'],'path':t['path'],'sha256':t['sha256']} for t in boss['tracks']]
    sources.append({'id':'city-wake','bossId':None,'path':city['path'],'sha256':city['sha256']})
    assert len(sources)==len(boss['tracks'])+1 and len({t['id'] for t in sources})==len(sources)
    folder=ROOT/'assets/production/audio/delivery';folder.mkdir(parents=True,exist_ok=True)
    entries=[];audits=[]
    for source in sources:
        master=ROOT/source['path'];assert sha(master)==source['sha256'],source['id']+' source hash'
        target=folder/(source['id']+'.mp3')
        if not args.verify_only and not target.exists():
            subprocess.run([str(ff),'-hide_banner','-loglevel','error','-nostdin','-n','-i',str(master),'-map_metadata','-1','-codec:a','libmp3lame','-b:a','192k','-ar','44100','-ac','2','-write_xing','1','-id3v2_version','3',str(target)],check=True)
        assert target.is_file(),source['id']+' missing delivery'
        with wave.open(str(master),'rb') as wav:
            assert wav.getnchannels()==2 and wav.getsampwidth()==2 and wav.getframerate()==44100
            frames=wav.getnframes();original=np.frombuffer(wav.readframes(frames),dtype='<i2').astype(np.float32).reshape(-1,2)/32768
        raw=subprocess.run([str(ff),'-hide_banner','-loglevel','error','-nostdin','-i',str(target),'-f','f32le','-codec:a','pcm_f32le','-ar','44100','-ac','2','pipe:1'],check=True,capture_output=True).stdout
        decoded=np.frombuffer(raw,dtype='<f4').reshape(-1,2)
        assert decoded.shape==original.shape,(source['id'],decoded.shape,original.shape)
        power=float(np.mean(original.astype(np.float64)**2));error=float(np.mean((decoded-original).astype(np.float64)**2))
        snr=float(10*np.log10(max(power,1e-20)/max(error,1e-20)))
        peak=float(np.max(np.abs(decoded)));dc=float(np.max(np.abs(np.mean(decoded.astype(np.float64),axis=0))))
        delta=np.abs(np.diff(decoded,axis=0));interior=float(np.quantile(delta,.999));seam=float(np.max(np.abs(decoded[-1]-decoded[0])))
        rms_change=float(10*np.log10(float(np.mean(decoded.astype(np.float64)**2))/power))
        passed=snr>=28 and peak<.99 and dc<.0002 and abs(rms_change)<.35 and seam<=1.5*interior+2/32768
        audit={'id':source['id'],'passed':bool(passed),'decodedFrames':len(decoded),'masterFrames':frames,'sampleRate':44100,'peak':peak,'clippedSamples':int(np.count_nonzero(np.abs(decoded)>=1)),'snrDb':round(snr,3),'rmsChangeDb':round(rms_change,5),'dcOffset':dc,'seamStep':seam,'interiorStepP999':interior,'masterUnchanged':sha(master)==source['sha256']}
        print(json.dumps({'id':source['id'],'passed':bool(passed),'snrDb':audit['snrDb'],'ratio':round(target.stat().st_size/master.stat().st_size,4)}),flush=True)
        assert passed,audit
        entry={'id':source['id'],'bossId':source['bossId'],'masterPath':source['path'],'deliveryPath':target.relative_to(ROOT).as_posix(),'masterSha256':source['sha256'],'deliverySha256':sha(target),'sampleRate':44100,'frames':frames,'durationSeconds':frames/44100,'masterBytes':master.stat().st_size,'deliveryBytes':target.stat().st_size,'codec':'MPEG Layer III','bitrateKbps':192}
        entries.append(entry);audits.append(audit)
    manifest={'schemaVersion':1,'source':'tools/encode-audio-delivery.py','sourceSha256':sha(Path(__file__)),'encoder':{'version':version,'binarySha256':sha(ff),'codec':'libmp3lame','bitrateKbps':192,'writeXing':True,'id3v2Version':3},'masterPolicy':'Original PCM compositions, scores and hashes remain unchanged. Delivery copies contain the same compositions.','tracks':entries}
    manifest_path=folder/'library.json'
    if args.verify_only:
        previous=json.loads(manifest_path.read_text(encoding='utf-8'));assert previous['tracks']==entries,'Delivered manifest differs from verified files'
    else:manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
    report={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'tracks':len(entries),'masterBytes':sum(e['masterBytes'] for e in entries),'deliveryBytes':sum(e['deliveryBytes'] for e in entries),'sourceSha256':manifest['sourceSha256'],'encoder':manifest['encoder'],'humanListeningReviewed':False,'browserDecodeReviewed':False,'checks':audits,'limits':['FFmpeg decode verifies exact sample count, SNR, signal levels, no clipping and circular sample-step bounds. It does not establish browser/device decode behavior or perceptual listening approval.','Runtime validates decoded duration and retains the original PCM fallback whenever compressed decoding fails or has unexpected padding.','Original PCM masters remain bundled for fallback; this reduces preferred music transfers, not the total high-quality offline package size.']}
    (ROOT/'reviews/small-wakes-2026-10-26/audio-delivery.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'passed':True,'tracks':len(entries),'masterBytes':report['masterBytes'],'deliveryBytes':report['deliveryBytes'],'reductionPercent':round(100*(1-report['deliveryBytes']/report['masterBytes']),2)}))
if __name__=='__main__':main()
