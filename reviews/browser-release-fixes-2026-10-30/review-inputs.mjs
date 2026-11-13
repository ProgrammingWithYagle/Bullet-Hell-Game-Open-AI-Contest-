import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {additionalSourceBinding as priorBinding} from '../shared-network-2026-10-30/review-inputs.mjs';
export function additionalSourceBinding(){
 const files=[...new Set([...priorBinding().members.map(m=>m.path),'reviews/browser-release-fixes-2026-10-30/run-gate.mjs','reviews/browser-release-fixes-2026-10-30/review-inputs.mjs'])].sort();
 const hash=createHash('sha256');const members=files.map(path=>{const bytes=fs.readFileSync(path);hash.update(path+'\0').update(bytes);return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
 return {sha256:hash.digest('hex'),files:members.length,bytes:members.reduce((n,m)=>n+m.bytes,0),members};
}
