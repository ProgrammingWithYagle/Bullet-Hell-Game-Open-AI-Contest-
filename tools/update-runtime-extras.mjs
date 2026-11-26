import fs from 'node:fs';
import {runtimeExtraMessages} from '../locales/source/runtime-extras.mjs';
import {writeTextAtomic} from './write-text-atomic.mjs';
const catalog=JSON.parse(fs.readFileSync('content/catalog.json'));
for(const locale of catalog.locales){
  const path='locales/'+locale.id+'.json',value=JSON.parse(fs.readFileSync(path));
  Object.assign(value.messages,runtimeExtraMessages(locale.id));
  writeTextAtomic(path,JSON.stringify(value,null,2)+'\n');
}
console.log('Updated source-backed runtime labels in all fifteen locales.');
