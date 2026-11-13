import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {writeTextAtomic} from '../../tools/write-text-atomic.mjs';
const read=file=>JSON.parse(fs.readFileSync(file));
const history=read('src/shared/update-history.json');
if(history.entries.some(entry=>entry.id==='host-controls'))throw Error('Preserve an issued update');
history.buildId='2026.10.29-host-controls';history.snapshot.protocol=43;
history.entries.unshift({id:'host-controls',date:'2026-10-29',title:'Host passwords and explicit match controls',groups:[
 {title:'See the password when you need it',items:[
  'Password entry has an eye button to show or hide the exact text being typed. The host can also reveal the room password beside the code in the waiting room and during play. Reveal buttons have translated accessible names and never submit a form.',
  'A successful room join keeps the entered invitation password only in that Session’s private memory until leaving. Only the current host’s UI receives the value. A newly promoted host may reveal the password they already entered; ordinary participants do not see it in room details. Plaintext stays out of shared state, listings, metadata, saves, application browser storage and logs. Server verification remains independently salted scrypt.'
 ]},
 {title:'Pause the match deliberately',items:[
  'Online settings, chat and guides keep the match running. Only the current host has explicit Pause match and Continue match buttons. The authority rejects guest pause commands. An actual pause freezes simulation ticks, combat time, warnings, effects and intermission countdowns, and clears queued inputs. Chat and connections still work; journal leases can renew without advancing the game.',
  'If a paused host leaves or disconnects, play resumes automatically and host controls pass to a connected teammate. A returning former host does not take control back automatically. Solo keeps its existing menu pause behavior.'
 ]},
 {title:'Choose whether to leave or end for everyone',items:[
  'Leaving a room keeps remaining teammates playing. The host may instead choose End game for everyone and confirm it. All connected players receive an explicit host-ended results screen, the pause is cleared and new joins are closed. No boss clear or campaign victory is invented; only already-earned results can qualify.',
  'Protocol43 requires matching clients and server. Known issued protocol42 local Practice saves retain map/build/economy identity through the complete restore validator; authoritative server checkpoints stay version-strict. Prior frozen previews, packages and raw reports remain preserved. Software/transport checks are separate from human/rendered, device, listening, native-language and WAN acceptance.'
 ]}
]});
writeTextAtomic('src/shared/update-history.json',JSON.stringify(history,null,2)+'\n');
const ledger=read('docs/development-work-ledger.json');
ledger.latestHumanFeedback.unshift('5239: moving between Join Room, a room and the main menu feels pretty clear. Requested host-visible room password/code, eye buttons for password entry, explicit host-only Pause/Continue, no pause from menus/chat, continued play when the host leaves, and a separate choice to end for everyone. This is limited positive connection/menu feedback, not whole-game acceptance. Host controls implement the follow-up with protocol43 and private Session-memory credentials; current source and human comparison remain separately recorded.');
ledger.remainingReleaseWork[0]='Continue polishing existing content for first-time players. Host/password controls now provide private revealable invites, explicit authoritative Pause/Continue, clean host departure/transfer and confirmed end-for-everyone without manufactured clears. Current source/CI/frozen-preview/Wiki evidence is recorded under reviews/host-controls-2026-10-29; read its exact closure before making acceptance claims. Human/rendered/final balance and coordinated release acceptance remain open. The earlier849-check connection source and all earlier packages/previews remain preserved.';
writeTextAtomic('docs/development-work-ledger.json',JSON.stringify(ledger,null,2)+'\n');
for(const script of ['tools/sync-changelog.mjs','tools/sync-development-progress.mjs']){const result=spawnSync(process.execPath,[script],{stdio:'inherit'});if(result.status!==0)throw Error(script);}
for(const file of ['README.md','docs/wiki/Home.md','docs/wiki/Hosting-and-Recovery.md','docs/IMPLEMENTATION_STATE.md','docs/PUBLIC_POLISH.md']){
 let text=fs.readFileSync(file,'utf8').replaceAll('2026.10.29-connection-clarity','2026.10.29-host-controls').replaceAll('protocol 42','protocol 43').replaceAll('protocol-42 local online rooms','protocol-43 local online rooms');
 if(file==='README.md')text=text.replace('The current source passes all **849 local software checks**.','The prior connection source passes all849local software checks. Current host controls add explicit Pause/Continue, private host password reveal and a confirmed end-for-everyone action; exact verification is recorded in [the host-control review](reviews/host-controls-2026-10-29).');
 writeTextAtomic(file,text);
}
const guide='\n## Host controls and passwords\n\nThe host can reveal the room password beside the code, both in the waiting room and from **Room code** during play. Eye buttons show or hide passwords while entering them. The current Session retains its entered password privately until leaving; ordinary guests do not receive it in room details.\n\nOpening settings, chat or a guide does not pause an online match. Only the current host can press **Pause match** or **Continue match**. The pause freezes the simulation and countdowns while chat remains available. If a paused host leaves or disconnects, play resumes and a connected teammate becomes host. Returning does not automatically reclaim host controls.\n\n**Leave room** keeps remaining teammates playing. **End game for everyone** is a separate host action in Settings and requires confirmation. Everyone sees that the host ended the match; only already-completed encounters count. Protocol43 needs a matching backend, with a bounded local Practice migration from42. [Exact source and review evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/host-controls-2026-10-29).\n';
for(const file of ['docs/wiki/Home.md','docs/wiki/Getting-Started.md','docs/wiki/Hosting-and-Recovery.md'])writeTextAtomic(file,fs.readFileSync(file,'utf8')+guide);
console.log(JSON.stringify({updated:true,buildId:history.buildId,protocol:43}));
