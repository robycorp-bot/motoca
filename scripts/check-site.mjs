import {readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bikes} from '../frontend/catalog.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
for(const file of ['frontend/app.js','frontend/scene.js','frontend/launches.js','frontend/catalog.js','worker/api.mjs','scripts/server.mjs'])execFileSync(process.execPath,['--check',resolve(root,file)],{stdio:'inherit'});
const html=await readFile(resolve(root,'frontend/index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  const path=match[1];if(/^(?:https?:|data:|\/api\/)/.test(path))continue;
  await access(resolve(root,'frontend',path));
}
for(const bike of bikes){await access(resolve(root,'frontend',bike.image));if(!bike.officialUrl.startsWith('https://'))throw new Error('Official model source must use HTTPS');}
const snapshot=JSON.parse(await readFile(resolve(root,'data/launches-snapshot.json'),'utf8'));
if(!Array.isArray(snapshot.items)||!snapshot.items.length)throw new Error('Verified launch snapshot is required');
console.log(`Site checked: ${bikes.length} models, frontend modules and launch data ready.`);
