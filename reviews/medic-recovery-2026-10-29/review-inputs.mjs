import fs from 'node:fs';
import {createHash} from 'node:crypto';
const walk=dir=>fs.readdirSync(dir).sort().flatMap(name=>{const file=dir+'/'+name;return fs.statSync(file).isDirectory()?walk(file):[file];});
export function additionalSourceBinding(){
  const files=[...['assets/production/arena-cover-surfaces','assets/production/arena-worlds','assets/production/arena-perimeters',
    'assets/production/generated/arena-cover-2026-10-29'].flatMap(walk),...fs.readdirSync('locales').filter(f=>f.endsWith('.json')).map(f=>'locales/'+f),
    'content/catalog.json','content/revision.json','tools/verify-stage1.mjs','tools/verify.mjs','tools/update-runtime-extras.mjs',
    'tools/write-text-atomic.mjs','tools/sync-changelog.mjs','tools/sync-development-progress.mjs','reviews/medic-recovery-2026-10-29/review-inputs.mjs',
    'locales/source/medic-recovery.mjs','locales/source/shield-limits.mjs','locales/source/runtime-extras.mjs','output/room-lobby-2026-10-29/arena-pack-bounds.json',
    ...fs.readdirSync('tools').filter(f=>/^(pack|verify)-arena-(cover-surfaces(?:-v2)?|lava|perimeters?|worlds?|surface-art|world-art)\.py$/.test(f)).map(f=>'tools/'+f)].sort();
  const hash=createHash('sha256'),members=[];
  for(const file of files){const bytes=fs.readFileSync(file);hash.update(file+'\0').update(bytes);members.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
  return {sha256:hash.digest('hex'),files:members.length,bytes:members.reduce((n,m)=>n+m.bytes,0),members};
}
