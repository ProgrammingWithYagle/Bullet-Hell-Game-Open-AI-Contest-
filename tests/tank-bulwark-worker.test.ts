import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {runBulwarkWorker} from './helpers/tank-bulwark-transport.ts';
for(const handling of ['none','pivot','port'] as const)test('whole optimized public Short worker earns Tank3→9SP and operates '+handling,{timeout:300_000},async()=>{
 const output=await build({entryPoints:['src/client/offline.worker.ts'],bundle:true,minify:true,write:false,platform:'browser',format:'esm',define:{__GA_TESTING_BUILD__:'false','import.meta.env.DEV':'false'},logLevel:'silent'});
 const result=await runBulwarkWorker(output.outputFiles[0].text,handling);assert(result.passed);assert.deepEqual(result.actualEarnedSequence,[3,9]);
 assert.equal(result.actualClears,1);assert.equal(result.spent,handling==='none'?3:5);assert(result.earlyCarryAtEarned3&&result.earlyMoved>30&&result.laterMoved>30&&result.pausedCommandsDiscarded);
 if(handling==='pivot')assert(Math.abs(result.turned)>.5);if(handling==='port')assert.equal(result.paidPortRounds,1);
 console.log(JSON.stringify(result));
});
