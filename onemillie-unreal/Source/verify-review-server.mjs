import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const checks=[];
for(const [method,url,status] of [['GET','/health',200],['HEAD','/',200],['HEAD','/reference-records.glb',200],
  ['HEAD','/Reference/original-workshop.png',200],['HEAD','/reference-surfaces.png',200],
  ['HEAD','/surfaces-workbench.png',200],['HEAD','/reference-atmosphere.png',200],['HEAD','/atmosphere-verification.json',200],
  ['HEAD','/reference-storage.png',200],['HEAD','/storage-workbench.png',200],['HEAD','/storage-verification.json',200],
  ['HEAD','/storage-record-clearance.json',200],['HEAD','/reference-storage.blend',200],
  ['HEAD','/reference-structure.png',200],['HEAD','/structure-workbench.png',200],['HEAD','/structure-study.json',200],
  ['HEAD','/structure-verification.json',200],['HEAD','/structure-storage-verification.json',200],
  ['HEAD','/structure-record-clearance.json',200],['HEAD','/reference-structure.blend',200],
  ['HEAD','/reference-details.png',200],['HEAD','/details-workbench.png',200],['HEAD','/details-study.json',200],
  ['HEAD','/details-verification.json',200],['HEAD','/details-retained-verification.json',200],
  ['HEAD','/details-record-clearance.json',200],['HEAD','/reference-details.blend',200],
  ['HEAD','/github-source/docs/werkplan.txt',404],['POST','/',405]]){
  const response=await fetch('http://127.0.0.1:4282'+url,{method,signal:AbortSignal.timeout(5000)});
  if(response.status!==status)throw Error(`${method} ${url}: ${response.status}, wanted ${status}`);
  if(url==='/health'&&(await response.json()).service!=='onemillie-local-review')throw Error('Wrong local service');
  checks.push({method,url,status:response.status});
}
const report={checkedAt:new Date().toISOString(),passed:true,scope:'Loopback-only read-only review server',checks};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
fs.writeFileSync(path.join(root,'Review/server-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
