import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {runInterceptionWorker} from './helpers/tank-interceptor-transport.ts';
for(const choice of ['forward','crossing','standfast'] as const)test('whole optimized public worker earns3-to9SP and performs Interceptor '+choice,{timeout:300_000},async()=>{
 const output=await build({entryPoints:['src/client/offline.worker.ts'],bundle:true,minify:true,write:false,platform:'browser',format:'esm',define:{__GA_TESTING_BUILD__:'false','import.meta.env.DEV':'false'},logLevel:'silent'});
 const result=await runInterceptionWorker(output.outputFiles[0].text,choice);assert(result.passed);assert.deepEqual(result.actualEarnedSequence,[3,9]);assert.equal(result.actualClears,1);assert.equal(result.spent,choice==='forward'?3:5);assert(result.earlyScreenAtEarned3&&result.pausedCommandsDiscarded);assert.equal(result.later.mode,choice);console.log(JSON.stringify(result));
});
