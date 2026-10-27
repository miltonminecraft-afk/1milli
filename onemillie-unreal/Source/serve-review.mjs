// Local, read-only review server. Deliberately does not expose the workspace.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const review=path.join(root,'Review');
const files=new Map([
  ['/','player.html'],['/player.html','player.html'],['/player.mjs','player.mjs'],
  ...['reference-records.glb','record-build.json','record-verification.json',
    'vergelijking.html','reference-records.png','records-shelf.png','records-extraction.png',
    'records-platter.png','layout-workbench-view.png','layout-depth.png','layout-placement.json',
    'workbench-placement.json','layout-round-trip.json','reference-layout.png','reference-records.blend',
    'reference-surfaces.png','surfaces-workbench.png','surface-study.json','reference-surfaces.blend',
    'reference-atmosphere.png','atmosphere-workbench.png','atmosphere-study.json','atmosphere-verification.json','reference-atmosphere.blend',
    'reference-storage.png','storage-workbench.png','storage-study.json','storage-verification.json','storage-record-clearance.json','reference-storage.blend'].map(name=>['/'+name,name])
].map(([url,file])=>[url,path.join(review,file)]));
files.set('/Reference/original-workshop.png',path.join(root,'Reference/original-workshop.png'));
files.set('/vendor/playcanvas.mjs',path.join(root,'../onemillie-runtime/vendor/playcanvas.mjs'));
files.set('/lighting.hdr',path.join(root,'../onemillie-runtime/public/assets/warehouse-lighting.hdr'));
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.hdr':'application/octet-stream'};
http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({service:'onemillie-local-review',port:4282,pid:process.pid}));}
  const file=files.get(url.pathname);
  if(!file||!fs.existsSync(file)){res.writeHead(404);return res.end('Niet gevonden');}
  const stat=fs.statSync(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream',
    'Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
  if(req.method==='HEAD')return res.end();
  const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
}).listen(4282,'127.0.0.1',()=>console.log('Onemillie review: http://127.0.0.1:4282/'));
