import {createServer} from 'node:http';
import {readFile,stat,realpath} from 'node:fs/promises';
import {resolve,dirname,relative,isAbsolute,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createLaunchService} from '../worker/api.mjs';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};
const inside=(root,path)=>{const rel=relative(root,path);return !rel.startsWith('..')&&!isAbsolute(rel);};

export async function createAppServer({frontendRoot=resolve(projectRoot,'frontend'),launchService}={}){
  const root=await realpath(frontendRoot);
  await stat(resolve(root,'index.html'));
  const service=launchService??createLaunchService({snapshot:JSON.parse(await readFile(resolve(projectRoot,'data/launches-snapshot.json'),'utf8'))});
  const server=createServer(async(req,res)=>{
    const method=req.method??'GET';
    const send=(status,body,headers={})=>{res.writeHead(status,{'x-content-type-options':'nosniff',...headers});res.end(method==='HEAD'?undefined:body);};
    try{
      if(!['GET','HEAD'].includes(method)){req.resume();return send(405,'Method not allowed',{'allow':'GET, HEAD','content-type':'text/plain; charset=utf-8'});}
      const url=new URL(req.url??'/','http://localhost');
      if(url.pathname==='/healthz')return send(200,JSON.stringify({status:'ok'}),{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
      if(url.pathname==='/api/launches'){
        const response=await service.fetch(new Request(url,{method,headers:req.headers}),{}, {waitUntil:promise=>promise.catch(()=>{})});
        return send(response.status,method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()),Object.fromEntries(response.headers));
      }
      let pathname;
      try{pathname=decodeURIComponent(url.pathname);}catch{return send(400,'Bad request');}
      if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(part=>part.startsWith('.')))return send(403,'Forbidden');
      if(pathname==='/')pathname='/index.html';
      const candidate=resolve(root,'.'+pathname);
      if(!inside(root,candidate))return send(403,'Forbidden');
      let file,info;
      try{file=await realpath(candidate);if(!inside(root,file))return send(403,'Forbidden');info=await stat(file);}catch(error){if(['ENOENT','ENOTDIR','EACCES'].includes(error.code))return send(404,'Not found');throw error;}
      if(!info.isFile())return send(404,'Not found');
      const etag=`"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`;
      const headers={'content-type':types[extname(file).toLowerCase()]??'application/octet-stream','etag':etag,'cache-control':/\.(?:html|js|mjs|css|json)$/.test(file)?'no-cache':'public, max-age=3600','referrer-policy':'strict-origin-when-cross-origin'};
      if((req.headers['if-none-match']??'').split(',').map(value=>value.trim()).includes(etag))return send(304,undefined,headers);
      if(method==='HEAD')return send(200,undefined,{...headers,'content-length':String(info.size)});
      return send(200,await readFile(file),{...headers,'content-length':String(info.size)});
    }catch(error){console.error('Request failed:',error.message);if(!res.headersSent)send(500,'Internal server error',{'content-type':'text/plain; charset=utf-8'});else res.end();}
  });
  server.requestTimeout=20000;
  server.headersTimeout=15000;
  return server;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const port=Number(process.env.PORT||10000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be a valid TCP port');
  const server=await createAppServer();
  server.listen(port,'0.0.0.0',()=>console.log(`VELOCITY listening on 0.0.0.0:${port}`));
  const shutdown=()=>{console.log('Shutting down');server.close(()=>process.exit(0));server.closeIdleConnections();setTimeout(()=>{server.closeAllConnections();process.exit(1);},25000).unref();};
  process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
}
