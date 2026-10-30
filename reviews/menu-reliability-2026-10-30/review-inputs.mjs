import fs from 'node:fs';
import {createHash} from 'node:crypto';
const walk=dir=>fs.readdirSync(dir).sort().flatMap(name=>{const file=dir+'/'+name;return fs.statSync(file).isDirectory()?walk(file):[file];});
export function additionalSourceBinding(){
  const files=[...['assets/production/arena-cover-surfaces','assets/production/arena-worlds','assets/production/arena-perimeters',
    'assets/production/generated/arena-cover-2026-10-29'].flatMap(walk),...fs.readdirSync('locales').filter(f=>f.endsWith('.json')).map(f=>'locales/'+f),
    'content/catalog.json','content/revision.json','tools/verify-stage1.mjs','tools/verify.mjs','tools/update-runtime-extras.mjs',
    'tools/write-text-atomic.mjs','tools/sync-changelog.mjs','tools/sync-development-progress.mjs','reviews/menu-reliability-2026-10-30/review-inputs.mjs',
    'tools/build-desktop.mjs','tools/desktop-source.mjs','tools/brand-executable.mjs','tools/verify-desktop-package.py','tools/boss-body-art-inputs.mts','tools/derive-boss-body-bounds.py',
    'assets/production/desktop/icon.ico','assets/production/desktop/icon.png',
    ...walk('docs/licenses'),'THIRD_PARTY_NOTICES.md','LICENSE',
    'tools/derive-small-wakes-body-bounds.py','assets/production/motion/small-wakes-library.json',
    ...fs.readdirSync('assets/production/motion').filter(f=>/^(candle-snail|cobble-crab|mourning-kettle).*atlas.*\.png$/.test(f)).map(f=>'assets/production/motion/'+f),
    ...walk('assets/delivery/selection-portraits-v1'),'assets/proofs/cover-v1.png','assets/proofs/survivors-v3.png','locales/source/home-gallery.mjs','locales/source/host-controls.mjs','locales/source/connection-clarity.mjs','locales/source/interface-clarity.mjs','locales/source/chat-confirmation.mjs','docs/development-work-ledger.json',
    'locales/source/medic-recovery.mjs','locales/source/shield-limits.mjs','locales/source/runtime-extras.mjs','output/room-lobby-2026-10-29/arena-pack-bounds.json',
    ...fs.readdirSync('tools').filter(f=>/^(pack|verify)-arena-(cover-surfaces(?:-v2)?|lava|perimeters?|worlds?|surface-art|world-art)\.py$/.test(f)).map(f=>'tools/'+f)].sort();
  const hash=createHash('sha256'),members=[];
  for(const file of files){const bytes=fs.readFileSync(file);hash.update(file+'\0').update(bytes);members.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
  return {sha256:hash.digest('hex'),files:members.length,bytes:members.reduce((n,m)=>n+m.bytes,0),members};
}
