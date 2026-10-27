import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../Import/reference-details');
const ids=process.argv.slice(2);
if(!ids.length||ids.some(id=>!/^\w+$/.test(id)))throw Error('Supply Poly Haven model IDs');
fs.mkdirSync(root,{recursive:true});
for(const id of ids){
 const metadata={};
 for(const endpoint of ['info','files']){
  const r=await fetch(`https://api.polyhaven.com/${endpoint}/${id}`);
  if(!r.ok)throw Error(`${endpoint}: ${r.status}`);
  metadata[endpoint]=await r.json();
  fs.writeFileSync(path.join(root,`${id}-${endpoint}.json`),JSON.stringify(metadata[endpoint],null,2)+'\n');
 }
 const descriptor=metadata.files.gltf?.['2k']?.gltf;
 if(!descriptor)throw Error('No 2K glTF');
 const folder=path.join(root,id);fs.mkdirSync(folder,{recursive:true});
 const records=[];
 for(const [relative,d] of [[path.basename(new URL(descriptor.url).pathname),descriptor],...Object.entries(descriptor.include)]){
  const dest=path.resolve(folder,relative),url=new URL(d.url);
  if(!dest.startsWith(folder+path.sep)||url.hostname!=='dl.polyhaven.org')throw Error('Unexpected destination/source');
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  if(!fs.existsSync(dest)){
   const r=await fetch(url,{signal:AbortSignal.timeout(120000)});
   if(!r.ok)throw Error(`Download ${r.status}`);
   fs.writeFileSync(dest,new Uint8Array(await r.arrayBuffer()));
  }
  const bytes=fs.readFileSync(dest),md5=crypto.createHash('md5').update(bytes).digest('hex');
  if(md5!==d.md5)throw Error(`Checksum mismatch: ${relative}`);
  records.push({file:relative,bytes:bytes.length,md5,url:url.href});
 }
 const thumbnail=new URL(metadata.info.thumbnail_url);
 if(thumbnail.hostname==='cdn.polyhaven.com'){
  thumbnail.searchParams.set('width','768');thumbnail.searchParams.set('height','768');thumbnail.searchParams.set('format','png');
  const r=await fetch(thumbnail);if(r.ok)fs.writeFileSync(path.join(root,id+'-preview.png'),new Uint8Array(await r.arrayBuffer()));
 }
 const report={id,name:metadata.info.name,authors:metadata.info.authors,source:'https://polyhaven.com/a/'+id,license:'CC0-1.0',licenseUrl:'https://polyhaven.com/license',status:'Local comparison candidate; not user approved',files:records};
 fs.writeFileSync(path.join(root,id+'-source.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({id,files:records.length,bytes:records.reduce((s,r)=>s+r.bytes,0)}));
}
