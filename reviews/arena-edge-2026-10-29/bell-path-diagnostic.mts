import fs from 'node:fs';
import {createPracticeGame} from '../../src/shared/practice-start.ts';
import {data} from '../../src/shared/game.ts';
import {bellRoad} from '../../src/shared/bell-carillon.ts';
import {distance} from '../../src/shared/geometry.ts';
import type {SignatureContext} from '../../src/shared/boss-director.ts';
const cases=[];
for(const map of data.arenas)for(const difficulty of data.difficulties){const g=createPracticeGame({openingBossId:'bellringer',openingArenaId:map.id,difficulty:difficulty.id,mode:'endless'},'Probe','soldier');g.start();const c=(g as unknown as {signatureContext():SignatureContext}).signatureContext();for(let phase=0;phase<4;phase++){c.phase=phase;const path=bellRoad(c,c.targets[0],phase),before=distance(c.boss,c.targets[0]),after=distance(path.at(-1)!,c.targets[0]);if(after>=before)cases.push({map:map.id,difficulty:difficulty.id,phase,start:{x:c.boss.x,y:c.boss.y},target:{x:c.targets[0].x,y:c.targets[0].y},path,before,after});}}
fs.writeFileSync('reviews/arena-edge-2026-10-29/bell-path-before.json',JSON.stringify({cases},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(cases.slice(0,8)));
