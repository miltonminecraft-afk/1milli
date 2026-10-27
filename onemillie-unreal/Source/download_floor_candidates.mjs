import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../Materials/floor-candidates');
fs.mkdirSync(directory,{recursive:true});
const ids=process.argv.slice(2),mapsOnly=ids[0]==='--maps';if(mapsOnly)ids.shift();
if(!ids.length||ids.some(id=>!['scuffed_cement','hangar_concrete_floor','smooth_concrete_floor'].includes(id)))throw Error('Specify a documented floor candidate');
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(`${r.status}: ${url}`);return r;};
for(const id of ids){
 const [info,files]=await Promise.all([get(`https://api.polyhaven.com/info/${id}`).then(r=>r.json()),get(`https://api.polyhaven.com/files/${id}`).then(r=>r.json())]);
 fs.writeFileSync(path.join(directory,id+'-info.json'),JSON.stringify(info,null,2)+'\n');
 fs.writeFileSync(path.join(directory,id+'-files.json'),JSON.stringify(files,null,2)+'\n');
 const maps={};
 for(const [channel,key,format] of mapsOnly?[['diff','Diffuse','jpg'],['normal','nor_gl','png'],['rough','Rough','jpg']]:[['diff','Diffuse','jpg']]){
  const d=files[key][mapsOnly?'2k':'1k'][format],url=new URL(d.url);
  if(!['dl.polyhaven.org','dl.polyhaven.com'].includes(url.hostname))throw Error('Unexpected source host');
  const file=path.basename(url.pathname),dest=path.join(directory,file);
  if(!fs.existsSync(dest))fs.writeFileSync(dest,new Uint8Array(await (await get(url)).arrayBuffer()));
  const content=fs.readFileSync(dest),md5=crypto.createHash('md5').update(content).digest('hex');
  if(d.md5!==md5)throw Error('Source checksum mismatch');
  maps[channel]={file,url:url.href,md5,bytes:content.length};
 }
 const source={downloadedAt:new Date().toISOString(),id,name:info.name,source:`https://polyhaven.com/a/${id}`,authors:info.authors,license:'CC0-1.0',licenseUrl:'https://polyhaven.com/license',physicalDimensions:info.dimensions,maps,status:'Unapproved material candidate'};
 fs.writeFileSync(path.join(directory,id+(mapsOnly?'-maps':'-preview')+'.json'),JSON.stringify(source,null,2)+'\n');
 console.log(JSON.stringify({id,maps:Object.values(maps).map(m=>m.file)}));
}
