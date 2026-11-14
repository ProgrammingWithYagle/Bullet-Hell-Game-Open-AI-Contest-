import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameServer} from '../src/server/index.ts';
import {runBulwarkPeers} from './helpers/tank-bulwark-transport.ts';
for(const handling of ['none','pivot','port'] as const)test('real non-host Tank earns3→9SP and keeps '+handling+' handling private with public physical panels',{timeout:300_000},async()=>{
 const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address==='object');
 try{const result=await runBulwarkPeers('http://127.0.0.1:'+address.port,handling);assert(result.passed);assert.deepEqual(result.actualEarnedSequence,[3,9]);
  assert.equal(result.spent,handling==='none'?3:5);assert(result.tankIsNonHost&&result.ownerPrivateHandlingAndPublicPanels&&result.sharedPhysicalPanels&&result.pausedCommandsDiscarded);
  if(handling==='pivot')assert(Math.abs(result.turned)>.5);if(handling==='port')assert.equal(result.paidPortRounds,1);console.log(JSON.stringify(result));
 }finally{await server.gracefullyShutdown(false);}
});
