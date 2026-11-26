import fs from 'node:fs';
import { createRequire } from 'node:module';
import { icon } from '../../src/client/ui/icons.ts';
import { modePreviewMarkup } from '../../src/client/ui/mode-preview.ts';
import { data } from '../../src/shared/game.ts';
const runtime = createRequire('C:/Users/yigal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const sharp = runtime('sharp');
const root = 'reviews/clear-choices-2026-10-28';
const symbols = [
 ['tutorial','Tutorial'],['join','Join room'],['profile','Profile'],['records','Records'],['network','Local network'],['resume','Resume'],
 ['difficulty-baby','Baby'],['difficulty-easy','Easy'],['difficulty-normal','Normal'],['difficulty-hard','Hard'],['difficulty-insane','Insane'],['difficulty-hellish','Hellish'],
];
const cells = symbols.map(([key,label],i)=>{
 const x=40+(i%6)*150,y=40+Math.floor(i/6)*185;
 const svg=icon(key).replace('<svg ','<svg x="'+(x+33)+'" y="'+y+'" width="64" height="64" ');
 return `<g color="#e9dab1">${svg}<text x="${x+65}" y="${y+105}" text-anchor="middle" font-size="16" fill="#d8e1ce">${label}</text></g>`;
}).join('');
const sheet=`<svg xmlns="http://www.w3.org/2000/svg" width="980" height="400" viewBox="0 0 980 400"><rect width="980" height="400" fill="#18352b"/>${cells}</svg>`;
fs.writeFileSync(root+'/symbols.svg',sheet);
await sharp(Buffer.from(sheet)).png().toFile(root+'/symbols.png');
const css=fs.readFileSync('src/client/ui/expedition.css','utf8');
const rules=[...css.matchAll(/\.mode-(?:track|stop|stop-center|finale|direction)[^{]*\{[^}]*\}/g)].map(m=>m[0]).join('\n');
const routes=data.modes.map((mode,i)=>{
 const html=modePreviewMarkup(mode,{progression:'Fights in this run',fights:'Boss fights',estimatedTime:'Estimated time',minutes:'min',noFinalFight:'No final fight',endlessTime:'As long as you survive',number:String});
 const svg=html.match(/<svg[\s\S]*?<\/svg>/)![0].replace('<svg ','<svg x="30" y="'+(45+i*210)+'" width="400" height="180" ');
 return `<text x="460" y="${130+i*210}" font-size="22" fill="#eee0ba">${mode.name}</text><text x="460" y="${164+i*210}" font-size="18" fill="#c1ccba">${mode.encounters===null?'No final fight':mode.encounters+' boss fights'} · ${mode.targetMinutes?mode.targetMinutes.join('–')+' min':'As long as you survive'}</text>${svg}`;
}).join('');
const overview=`<svg xmlns="http://www.w3.org/2000/svg" width="980" height="1120" viewBox="0 0 980 1120"><style>${rules}</style><rect width="980" height="1120" fill="#18352b"/>${routes}</svg>`;
fs.writeFileSync(root+'/modes.svg',overview);
await sharp(Buffer.from(overview)).png().toFile(root+'/modes.png');
console.log(JSON.stringify({symbols:12,modes:5,output:root,scope:'Actual code-native SVG geometry only, not a browser or CSS-layout capture.'}));
