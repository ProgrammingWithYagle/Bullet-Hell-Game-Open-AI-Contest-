// The same atlas/anchor choices used by CombatScene, including lazy-load references.
import {encounterArt} from '../src/client/encounter-presentation.ts';
import {constableArt} from '../src/client/constable-presentation.ts';
import {wardenArt} from '../src/client/warden-presentation.ts';
import references from '../assets/delivery/boss-loading-v5/library.json' with {type:'json'};
import {data} from '../src/shared/game.ts';
const ids=new Set(data.bosses.map(b=>b.id));
const atlases=encounterArt.filter(a=>ids.has(a.bossId)&&!['constable','lantern-warden'].includes(a.bossId)).map(a=>({...a,offsetY:0,lift:['ashen-usher','brass-toad','ragpicker-kite'].includes(a.bossId)?46:0}));
for(const [id,art,offsetY] of [['constable',constableArt,constableArt.groundOffsetY],['lantern-warden',wardenArt,0]] as const)
  for(const clip of Object.values(art.clips))atlases.push({...clip,bossId:id,offsetY,lift:0} as typeof atlases[number]);
const stills=[...references.entries,...references.settledReferences].filter(a=>ids.has(a.bossId)).map(a=>({bossId:a.bossId,path:a.reference,origin:a.origin,displayWidth:a.displayWidth,displayHeight:a.displayHeight,offsetY:0,lift:['ashen-usher','brass-toad','ragpicker-kite'].includes(a.bossId)?46:0}));
console.log(JSON.stringify({ids:[...ids].sort(),atlases,stills}));
