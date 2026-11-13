import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {writeTextAtomic} from '../../tools/write-text-atomic.mjs';
const history = JSON.parse(fs.readFileSync('src/shared/update-history.json'));
if (history.entries.some(entry => entry.id === 'connection-clarity')) throw Error('Preserve the issued update');
history.buildId = '2026.10.29-connection-clarity';
history.entries.unshift({id:'connection-clarity',date:'2026-10-29',title:'Clear connection progress and a working Cancel action',groups:[
 {title:'Leave loading without getting stuck',items:[
  'Loading offers Cancel, and Esc returns home. Keyboard focus stays with the loading dialog. Cancelling stops asset/audio waiting, worker startup, server-health retries, room searches, queued admission and pending SDK join HTTP/socket work. An old connection or asset callback cannot replace or update a newer screen.',
  'The server-waking notice uses plain progress text instead of directing players to a covered Pause menu. Search and code lookup show their current step. Version mismatch, request throttling, wrong server addresses, expired codes and full/closed rooms retain useful guidance. New notices are source-backed in all fifteen languages.'
 ]},
 {title:'Keep room and records requests with their screen',items:[
  'Leaving Join Room closes its temporary searches and code lookups. Retry preserves name/class choices. A correct empty room list is distinct from a failed search; no error claims the server has zero rooms.',
  'Leaving the online records tab, changing filters or leaving setup cancels pending board/roster requests. Loading another board page keeps earlier rows usable. Repeated opens cannot issue simultaneous duplicate roster pages. Scoring, server record storage and gameplay rules are unchanged.'
 ]},
 {title:'Compatibility and review limits',items:[
  'The client remains protocol42; this pass does not change gameplay, save format, server rules or chat receipts. Existing frozen builds keep their exact source and remain available separately.',
  'Actual delayed HTTP, stalled WebSocket, admission cleanup, closed-room and reconnect fixtures plus compiled native menu/controller checks verify software behavior. They are separate from rendered/human, listening, native-language, device, WAN and final balance acceptance.'
 ]}
]});
writeTextAtomic('src/shared/update-history.json',JSON.stringify(history,null,2)+'\n');
const ledger=JSON.parse(fs.readFileSync('docs/development-work-ledger.json'));
ledger.latestHumanFeedback.unshift('Connection clarity follow-up: source inspection and an actual delayed-HTTP baseline reproduced searches outliving close. Cancel/Esc, session-bound HTTP/retry/worker/SDK socket lifetimes, guarded late callbacks, actionable search/join errors and record-request cleanup are implemented.43focused checks include actual local HTTP/SDK/WebSocket and compiled menu controllers; full source/CI/fresh previews/Wiki evidence belongs in reviews/connection-clarity-2026-10-29. This is software progress, not new human/rendered acceptance.');
ledger.remainingReleaseWork[0]='Continue polishing current content for first-time players. Connection clarity adds real loading cancellation, useful discovery/join errors, safe late completion and menu-bound records requests; complete its full local/source-CI/fresh-preview/Wiki closure under reviews/connection-clarity-2026-10-29. Prior source publication approval remains in force. The fe82c7e Windows review and5237/5236previews retain their exact issued source. Human/rendered/final balance and coordinated release acceptance remain open.';
writeTextAtomic('docs/development-work-ledger.json',JSON.stringify(ledger,null,2)+'\n');
for(const script of ['tools/sync-changelog.mjs','tools/sync-development-progress.mjs']){const result=spawnSync(process.execPath,[script],{stdio:'inherit'});if(result.status!==0)throw Error(script);}
for(const file of ['README.md','docs/wiki/Home.md','docs/wiki/Hosting-and-Recovery.md']){
 let text=fs.readFileSync(file,'utf8').replaceAll('2026.10.29-chat-confirmation','2026.10.29-connection-clarity');
 if(file==='README.md')text=text.replace('The current chat-confirmation follow-up passes all 827 local software checks.','The current source adds a working Cancel/Esc action during loading, clear room-search/join errors and screen-owned records requests. The prior chat-confirmation follow-up passes all827local software checks.');
 writeTextAtomic(file,text);
}
const guidance='\n## Connection progress and cancellation\n\nLoading offers **Cancel**; **Esc** also returns home. Tab keeps keyboard focus on the loading action. Room search and code lookup show what is happening, with specific version, busy-server, wrong-address, expired-code and full/closed-room errors. Back cancels pending searches. Returning to another screen cannot let an old connection overwrite it. Leaving online records or changing filters cancels its requests, while paging keeps earlier rows usable. Protocol42 and gameplay/record rules remain. [Current source evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/connection-clarity-2026-10-29) separates software and transport checks from rendered/human review.\n';
for(const file of ['docs/wiki/Getting-Started.md','docs/wiki/Hosting-and-Recovery.md'])writeTextAtomic(file,fs.readFileSync(file,'utf8')+guidance);
console.log(JSON.stringify({updated:true,buildId:history.buildId,protocol:history.snapshot.protocol}));
