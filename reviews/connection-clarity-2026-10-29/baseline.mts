import {createServer} from 'node:http';
import fs from 'node:fs';
import {Session} from '../../src/client/session.ts';
import {PROTOCOL,CONTENT_REVISION} from '../../src/shared/protocol.ts';
let received!:()=>void;
const started=new Promise<void>(resolve=>{received=resolve;});
let release!:()=>void, disconnected=false;
const server=createServer((request,response)=>{
  if(request.url!=='/api/health'){response.writeHead(404).end();return;}
  response.on('close',()=>{disconnected=true;});
  release=()=>{response.setHeader('Content-Type','application/json');response.end(JSON.stringify({protocolVersion:PROTOCOL,contentRevision:CONTENT_REVISION,audience:'public'}));};
  received();
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();if(!address||typeof address==='string')throw Error('Address unavailable');
const session=new Session('http://127.0.0.1:'+address.port);
let settled=false,error='';
const searching=session.rooms().catch(reason=>{error=String(reason);}).finally(()=>{settled=true;});
try{
  await started;
  const closeStarted=performance.now();await session.close();
  const closeMs=performance.now()-closeStarted;
  await new Promise(resolve=>setTimeout(resolve,150));
  const report={checkedAt:new Date().toISOString(),sourceCommit:'0ae6eb1c4568014c10b243119f67a1f62990bce3',fixture:'Actual Session.rooms and delayed loopback HTTP health response; no browser.',closeReturnedMs:closeMs,searchSettledAfter150ms:settled,httpRequestDisconnectedAfter150ms:disconnected,cancellationWorks:settled&&disconnected,notes:['On the issued source close returns while the request remains pending. Release it explicitly after recording the witness.']};
  fs.writeFileSync('reviews/connection-clarity-2026-10-29/baseline-delayed-search.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report));
}finally{
  release?.();await searching;await session.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
}
