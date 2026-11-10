import test from 'node:test';import assert from 'node:assert/strict';
import {createGameServer} from '../src/server/index.ts';import {keyedId,openId} from '../src/shared/heavy-traverse.ts';
import {earnedPostPeerFlow} from './helpers/heavy-post-peer-flow.ts';
for(const [mode,handling] of [['loose',undefined],['spade',keyedId],['floating',openId]] as const)
 test('real nonhost Heavy earns Raid12→20 and stakes '+mode+' / '+(handling??'original Clutch')+' with actual owner streams and host cleanup',{timeout:300000},async()=>{
  const{server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address==='object');
  try{const r=await earnedPostPeerFlow('http://127.0.0.1:'+address.port,mode,handling,'raid');assert(r.passed&&r.heavyOwnerIsNotRoomHost&&r.ownerOnlyFriendlyFlightsAndRemovals&&r.actualLatePeerWithoutOwnership&&r.nonHostPauseAndEndRejected&&r.actualHostExit&&r.sourceBoundMenuDOMAtActual12And20&&r.actualThirdSeparatePost);assert.deepEqual(r.actualEarnedSequence,[12,20]);assert.equal(r.actualPostPurchaseAt,20);assert.equal(r.actualBossClears,1);assert.equal(r.realPeers,3);assert(r.actualPostedWalking.forwardProgress>5);assert.equal(r.originalUntil-r.originalBorn,31);assert.equal(r.actualCrounds+r.actualForfeitedSlots,4);assert(r.hostExitCShotIds.length>0);}
  finally{await server.gracefullyShutdown(false);}
 });
