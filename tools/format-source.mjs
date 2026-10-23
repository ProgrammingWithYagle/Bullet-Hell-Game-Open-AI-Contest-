import {format} from 'prettier';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):/\.(ts|css)$/.test(e.name)?[dir+'/'+e.name]:[]);
for(const path of [...walk('src'),...walk('tests'),...walk('tools'),'vite.config.ts','index.html']){
  const before=readFileSync(path,'utf8');
  const after=await format(before,{filepath:path,singleQuote:true,printWidth:100});
  if(before!==after)writeFileSync(path,after);
}
