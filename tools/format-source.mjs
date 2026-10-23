import {format} from 'prettier';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):/\.(ts|css)$/.test(e.name)?[dir+'/'+e.name]:[]);
for(const path of [...walk('src'),...walk('tests'),'vite.config.ts','tools/measure-first-loop.ts','index.html']){
  writeFileSync(path,await format(readFileSync(path,'utf8'),{filepath:path,singleQuote:true,printWidth:100}));
}
