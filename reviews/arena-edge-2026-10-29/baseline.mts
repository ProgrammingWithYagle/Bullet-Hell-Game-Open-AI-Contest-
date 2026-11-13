import fs from 'node:fs';
import {createPracticeGame} from '../../src/shared/practice-start.ts';
import {data} from '../../src/shared/game.ts';
import footprints from '../../src/shared/boss-body-bounds.json' with {type:'json'};
const overflows=[];let cases=0;
for(const boss of data.bosses)for(const map of data.arenas)for(const difficulty of data.difficulties){
 const game=createPracticeGame({openingBossId:boss.id,openingArenaId:map.id,arenaSelection:'fixed',difficulty:difficulty.id,mode:'endless'},'Probe','soldier');game.start();
 const f=footprints.entries.find(e=>e.bossId===boss.id)!.extents,b=game.arena.bounds,p=game.boss;cases++;
 const outside={left:Math.max(0,b.x-(p.x-f.left)),top:Math.max(0,b.y-(p.y-f.top)),right:Math.max(0,p.x+f.right-b.x-b.width),bottom:Math.max(0,p.y+f.bottom-b.y-b.height)};
 if(Object.values(outside).some(n=>n>0))overflows.push({boss:boss.id,map:map.id,difficulty:difficulty.id,position:{x:p.x,y:p.y},outside});
}
const result={createdAt:new Date().toISOString(),sourceCommit:'b108b5f4c77168413255d5f60b8d1fdb79856aac',passed:overflows.length===0,cases,overflows,limits:['Actual Practice starts against independently measured native alpha/anchors; not a screenshot or rendered observation. Baseline only, before applying generic body bounds.']};
fs.writeFileSync('reviews/arena-edge-2026-10-29/baseline-spawns.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({cases,overflows:overflows.length,ossuaryExamples:overflows.filter(c=>c.map==='ossuary-works'&&['normal','hard'].includes(c.difficulty)).slice(0,6)}));
