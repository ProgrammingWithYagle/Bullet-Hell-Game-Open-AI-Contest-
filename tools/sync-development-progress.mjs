import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export function developmentProgress() {
 const catalog=read('content/catalog.json'),profiles=read('src/shared/boss-threats.json');
 const ordinary=profiles.entries.filter(p=>p.level<=10).length;
 const coverage=[];
 for(let level=1;level<=10;level++)for(let subtier=-2;subtier<=2;subtier++){
  const members=profiles.entries.filter(p=>p.level===level&&p.subtier===subtier);
  coverage.push({level,subtier,implemented:members.length,remaining:Math.max(0,3-members.length)});
 }
 const work=read('docs/development-work-ledger.json');
 const remaining=coverage.reduce((n,c)=>n+c.remaining,0);
 const result={updated:work.updated,buildId:read('src/shared/update-history.json').buildId,
  playableBosses:catalog.bosses.length,ordinaryBosses:ordinary,secretBosses:profiles.entries.length-ordinary,
  ordinaryTarget:150,ordinaryBossesRemaining:remaining,currentSecretTarget:1,minimumTotalTarget:151,
  generatedConcepts:work.newBossConcepts.length,classes:catalog.classes.length,maps:catalog.arenas.length,
  items:work.items,coverage,latestHumanFeedback:work.latestHumanFeedback,
  remainingReleaseWork:work.remainingReleaseWork,
  semanticInputsSha256:createHash('sha256').update(JSON.stringify({profiles,catalogBossIds:catalog.bosses.map(b=>b.id),work})).digest('hex')};
 assert.equal(result.playableBosses,profiles.entries.length);assert.equal(result.classes,7);
 for(const item of result.items){assert.equal(item.remaining,item.target-item.implemented);assert(item.humanAccepted<=item.implemented);}
 for(const id of work.items.find(i=>i.id==='boss-quality').completedIds)assert(catalog.bosses.some(b=>b.id===id));
 return result;
}
const p=developmentProgress();
const table=['| Area | Implemented | Work remaining | Review status |','| --- | --- | --- | --- |',
 `| New ordinary bosses | ${p.ordinaryBosses} / ${p.ordinaryTarget} | ${p.ordinaryBossesRemaining} new identities | ${p.generatedConcepts} unintegrated art-only concepts; three Early Watch identities are now implemented |`,
 ...p.items.map(i=>`| ${i.label} | ${i.implemented} / ${i.target} | ${i.remaining} | ${i.status} |`)].join('\n');
const body=`# Development progress\n\nUpdated ${p.updated} for **${p.buildId}**. These counts track specific requested passes; they do not imply that earlier playable content is absent. The game is still in development.\n\n${p.playableBosses} playable identities: ${p.ordinaryBosses} ordinary and ${p.secretBosses} secret. Three ordinary bosses in every one of fifty subtiers requires ${p.ordinaryTarget} ordinary identities, plus secrets; ${p.ordinaryBossesRemaining} additional ordinary bosses remain.\n\n${table}\n\n## Latest human feedback\n\n${p.latestHumanFeedback.map(s=>'- '+s).join('\n')}\n\n## Remaining release work\n\n${p.remainingReleaseWork.map(s=>'- '+s).join('\n')}\n\n## Count definitions\n\nBoss quality counts a completed implementation of the requested phase/mobility/Brutal pass, followed by separate human review. The other ${p.items.find(i=>i.id==='boss-quality').remaining} existing encounters await assessment or redesign; they are already playable. Class revamps count the newly requested ability-changing upgrade pass, separate from the seven existing class kits and 378 skills. Map layout counts the five requested secondary-map topology revisions; their implementation is complete, while detailed new-layout human acceptance remains pending.\n\nAshen Usher, Brass Toad and Ragpicker's Kite now have shared-authority encounters, complete selected motion, original themes and fifteen-locale help. Their original art-only issue records remain unchanged. The structured ledger, derived counts, in-game journal summary and this page update together. Progress does not equal final balance, rendered, device, language or release acceptance.\n`;
const files={'docs/DEVELOPMENT_PROGRESS.md':body,'docs/wiki/Development-Progress.md':body,
 'src/shared/development-progress.json':JSON.stringify(p,null,2)+'\n'};
for(const [file,text]of Object.entries(files)) {
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n'),text,'Stale progress surface '+file);
 else fs.writeFileSync(file,text);
}
console.log(JSON.stringify({passed:true,bosses:p.playableBosses,ordinaryRemaining:p.ordinaryBossesRemaining,qualityRemaining:p.items.find(i=>i.id==='boss-quality').remaining,classRevampsRemaining:p.items.find(i=>i.id==='class-abilities').remaining,mapImplementationRemaining:0}));
