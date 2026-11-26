import {spawnSync}from'node:child_process';
const audience=process.argv[2];if(!['testing','public'].includes(audience))throw Error('Choose testing or public explicitly.');
const out=audience==='public'?'dist-public':'dist';
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir',out],{stdio:'inherit',env:{...process.env,VITE_GAME_AUDIENCE:audience}});
process.exit(result.status??1);
