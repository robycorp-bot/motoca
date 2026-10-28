import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {createAppServer} from '../scripts/server.mjs';

async function fixture(t){
  const app=await createAppServer({launchService:{fetch:async()=>new Response(JSON.stringify({status:'live',items:[{title:'Test launch'}]}),{headers:{'content-type':'application/json'}})}});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{app.close(resolve);app.closeAllConnections();}));
  const port=app.address().port;
  const get=(path,method='GET',headers={})=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path,method,headers},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});
  return get;
}
test('Node runtime serves the site, local assets, HEAD and conditional cache',async t=>{
  const get=await fixture(t),page=await get('/');assert.equal(page.status,200);assert.match(page.body,/VELOCITY/);assert.match(page.headers['content-type'],/text\/html/);
  const asset=await get('/assets/three.module.js','HEAD');assert.equal(asset.status,200);assert.equal(asset.body,'');assert.ok(Number(asset.headers['content-length'])>0);
  const cached=await get('/','GET',{'if-none-match':page.headers.etag});assert.equal(cached.status,304);
});
test('health is independent of manufacturer feeds and API uses the same service',async t=>{
  const get=await fixture(t);assert.deepEqual(JSON.parse((await get('/healthz')).body),{status:'ok'});assert.equal(JSON.parse((await get('/api/launches')).body).status,'live');
});
test('runtime does not expose repository files, traversal paths or write methods',async t=>{
  const get=await fixture(t);
  for(const path of ['/.git/config','/%2e%2e/%2e%2e/.git/config','/..%5cpackage.json','/.env'])assert.ok([403,404].includes((await get(path)).status),path);
  assert.equal((await get('/package.json')).status,404);assert.equal((await get('/','POST')).status,405);assert.equal((await get('/missing')).status,404);
});
