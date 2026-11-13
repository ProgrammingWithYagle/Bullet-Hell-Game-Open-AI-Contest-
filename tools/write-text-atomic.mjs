import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
/** Replace generated text beside its target; preserve the candidate if replacement fails. */
export function writeTextAtomic(path,text){
  const temporary=path+'.'+randomUUID()+'.next';
  fs.writeFileSync(temporary,text,{flag:'wx'});
  for(let attempt=0;;attempt++){
    try{fs.renameSync(temporary,path);return;}
    catch(error){if(attempt===4)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,150);}
  }
}
