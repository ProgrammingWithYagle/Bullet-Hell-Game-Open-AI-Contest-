import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {writeTextAtomic as write} from '../../tools/write-text-atomic.mjs';
const history=JSON.parse(fs.readFileSync('src/shared/update-history.json'));
if(history.entries.some(e=>e.id==='arena-edge-polish'))throw Error('Preserve issued update');
history.buildId='2026.10.29-arena-edge-polish';
history.entries.unshift({id:'arena-edge-polish',date:'2026-10-29',title:'Keep bosses on the floor and controls in the corner',groups:[
 {title:'Complete boss artwork stays inside the map',items:['Arena limits now include the complete artwork, ground anchor, defeat poses and loading reference for all66bosses. Their spawn, routes and scripted placements use the same floor limits across all six maps and six difficulties. Ordinary player and projectile walls keep their actual map geometry.','Independent native-alpha checks cover152art sources and758frames. The software baseline exposed726starting combinations with artwork extending beyond the floor; regression checks cover all2376boss/map/difficulty starts and edges, plus actual movement and defeat positions. This does not establish rendered or human acceptance.']},
 {title:'Stable game controls',items:['Pause/Continue, Settings and the boss guide stay together at the top corner when the boss header disappears during the defeat scene. Both public and testing share the fix.','Limited positive5241feedback accepts the basic host controls and password eyes; multiplayer human testing remains open. Optional ally bots are saved as an idea for after the contest and are not implemented. Earlier source, Wiki, frozen previews and native packages remain preserved.']}
]});write('src/shared/update-history.json',JSON.stringify(history,null,2)+'\n');
const ledger=JSON.parse(fs.readFileSync('docs/development-work-ledger.json'));
ledger.latestHumanFeedback.unshift('5241: password eyes and host Pause/Continue feel not bad; multiple human players are still needed for acceptance. Reported a boss clipped above the top border, probably Ossuary Works on Normal/Hard, and Pause moving toward the top center during defeat. Requested checking every map/difficulty combination. Optional ally bots belong after the contest; the idea is saved only.');
ledger.remainingReleaseWork[0]='Continue polishing existing content for first-time players. The current arena-edge follow-up extends measured full-body floor limits to all66bosses across all36map/difficulty combinations and anchors game controls together. Read reviews/arena-edge-2026-10-29 for exact local/source/CI/preview/Wiki evidence. Human/rendered/final balance and coordinated release acceptance remain open. Bring the Windows review forward only after this follow-up is verified; the b108b5f intermediate native folder is unsealed and preserves its passing original offline diagnostic.';
write('docs/development-work-ledger.json',JSON.stringify(ledger,null,2)+'\n');
for(const script of ['tools/sync-changelog.mjs','tools/sync-development-progress.mjs']){const run=spawnSync(process.execPath,[script],{stdio:'inherit'});if(run.status!==0)throw Error(script);}
for(const file of ['README.md','docs/wiki/Home.md','docs/wiki/Hosting-and-Recovery.md','docs/IMPLEMENTATION_STATE.md','docs/PUBLIC_POLISH.md']){
 let text=fs.readFileSync(file,'utf8').replaceAll('2026.10.29-host-controls','2026.10.29-arena-edge-polish');
 if(file==='README.md')text=text.replace('Current host controls pass **859 local checks**','The verified host-control pass has **859 local checks**');
 write(file,text);
}
const guide='\n## Boss edges and stable controls\n\nBosses now use their complete measured artwork and ground anchors to stay within the floor on all six maps and six difficulties, including Ossuary Works. This includes loading references and the existing defeat poses. Game controls stay together at the corner when the boss header is hidden. [Exact current verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/arena-edge-2026-10-29) distinguishes software checks from rendered/human acceptance. Ally bots remain a post-contest idea.\n';
for(const file of ['docs/wiki/Home.md','docs/wiki/Getting-Started.md','docs/wiki/Hosting-and-Recovery.md'])write(file,fs.readFileSync(file,'utf8')+guide);
console.log(JSON.stringify({updated:true,buildId:history.buildId,protocol:43}));
