import fs from'node:fs';import{runtimeExtraMessages}from'../locales/source/runtime-extras.mjs';const c=JSON.parse(fs.readFileSync('content/catalog.json'));
for(const l of c.locales){const p='locales/'+l.id+'.json',v=JSON.parse(fs.readFileSync(p));Object.assign(v.messages,runtimeExtraMessages(l.id));fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');}
console.log('Updated eighteen runtime-extra labels in all fifteen locales.');
