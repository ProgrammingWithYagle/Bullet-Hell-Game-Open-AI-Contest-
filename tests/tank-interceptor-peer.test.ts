import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameServer} from '../src/server/index.ts';
import {runInterceptionPeers} from './helpers/tank-interceptor-transport.ts';
for(const choice of ['forward','crossing','standfast'] as const)test('real non-host Tank earns3-to9SP and performs private Interceptor '+choice+' with shared active geometry',{timeout:300_000},async()=>{
 const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address==='object');
 try{const result=await runInterceptionPeers('http://127.0.0.1:'+address.port,choice);assert(result.passed);assert.deepEqual(result.actualEarnedSequence,[3,9]);assert.equal(result.spent,choice==='forward'?3:5);assert(result.tankIsNonHost&&result.ownerPrivatePreparationAndPublicScreen&&result.ownerPrivateSounds&&result.sharedPhysicalScreen&&result.pausedCommandsDiscarded);assert(result.sharedDodge && result.sharedDodge.ack >= result.sharedDodge.sequence);console.log(JSON.stringify(result));}finally{await server.gracefullyShutdown(false);}
});
