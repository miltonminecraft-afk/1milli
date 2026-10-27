import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const research=path.resolve(root,'../onemillie/research');
const paths=JSON.parse(gunzipSync(await fs.readFile(path.join(research,'objaverse-paths.json.gz'))));
const specs=[
 ['b7866279b7224c48a31b85fe7cedae59','Gescande fabriekshal in Berlijn','Industrieel',true],
 ['41ffced19ad44ba58b3ab8bd99f69ab7','Verlaten koelopslag','Industrieel',false],
 ['ff29e81ff1564d73bad71d0042f96a28','Garage met voertuigen','Werkplaats',false],
 ['c8d0782400e44efca89cd7192d1b59e9','Werkstudio in de tuin','Studio',false],
 ['71d191aabc5e4b979ceee3c19526fd54','Gescande oude winkelhal','Winkel',true],
 ['34090cc0cef74099a4d48c1e7541ffcb','Gescand leeg vervallen pand','Industrieel',true],
 ['a0c0ac7dbbea4e1cbf3d7beaa164a239','Kleine muziekstudio','Studio',false],
 ['3304add0c13f416597dd393a76867f96','Opnamestudio met piano','Studio',false],
 ['fdd57e783d744886bc37cdfb76cf9475','Kleine kunststudio','Studio',false],
 ['7a561f3f9ff94dc49a8d2ba0d2873eb6','Bakstenen winkelruimte','Winkel',false],
 ['1e40d433ed6f48fb880a0d2172aff7ca','Verlaten magazijn met PBR-materialen','Industrieel',false],
 ['a22de7c45a974834b840c65561934681','Gescande garage met inventaris','Garage',true],
 ['412be887e3c0451d9e5b65daac2e278c','Uitgebrande kruidenierswinkel','Winkel',true],
 ['e402f04b81c748299c692cb5f12f5249','Winkel met schappen','Winkel',false],
 ['c5cfa3d5c7e74db78691147798b8b872','Historisch winkelinterieur in Nevada','Winkel',true],
 ['3f295d678fdd40e09b8249b53c88f8f0','Grote fabriekshal','Industrieel',false],
 ['ec50a4b8dc874689a6da225be0932b1c','Lege studio','Studio',false],
 ['12d2dfd3d2cb4c8e80f3f223c649be32','Gescande magazijnruïne in Finland','Industrieel',true],
];
await fs.mkdir(path.join(root,'research'),{recursive:true});
const accepted=[],rejected=[],evidence=[];
for(let offset=0;offset<specs.length;offset+=4){
 const results=await Promise.allSettled(specs.slice(offset,offset+4).map(async([id,title,subcategory,scan])=>{
  const res=await fetch('https://api.sketchfab.com/v3/models/'+id,{signal:AbortSignal.timeout(25000)});if(!res.ok)throw Error('metadata '+res.status);
  const m=await res.json();if(!m.isDownloadable||!['by','cc0'].includes(m.license?.slug)||!paths[id])throw Error('No verified free download');
  const url='https://huggingface.co/datasets/allenai/objaverse/resolve/main/'+paths[id];
  const head=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(30000)});if(!head.ok)throw Error('download '+head.status);const bytes=Number(head.headers.get('content-length'))||null;if(bytes>400*1024*1024)throw Error('Over 400 MB');
  const thumbs=[...m.thumbnails.images].sort((a,b)=>a.width-b.width),thumb=thumbs.find(t=>t.width>=640)||thumbs.at(-1);
  const image=await fetch(thumb.url,{signal:AbortSignal.timeout(25000)});if(!image.ok)throw Error('thumbnail '+image.status);await fs.writeFile(path.join(root,'images',id+'.jpg'),Buffer.from(await image.arrayBuffer()));
  evidence.push({...m,objaversePath:paths[id],downloadBytes:bytes,checkedAt:new Date().toISOString()});
  return {id,code:'R'+(31+specs.findIndex(s=>s[0]===id)),title,name:m.name,kind:'room',category:'Ruimtes',subcategory,scan,description:m.description||m.name,notes:scan?'Gescande omgeving; bestaande spullen kunnen onderdeel van de scan zijn.':'Bestaande 3D-omgeving van de vermelde maker.',author:m.user.displayName,source:m.viewerUrl,license:{slug:m.license.slug,url:m.license.url},image:'images/'+id+'.jpg',download:{status:'no-login',url,note:'Gratis download zonder inloggen.',bytes},model:null,modelScale:null,addedAt:'2026-10-26'};
 }));
 results.forEach((r,i)=>{if(r.status==='fulfilled'){accepted.push(r.value);console.log('OK',r.value.code,r.value.title);}else{rejected.push({id:specs[offset+i][0],error:String(r.reason)});console.log('SKIP',specs[offset+i][1],String(r.reason));}});
}
accepted.sort((a,b)=>Number(a.code.slice(1))-Number(b.code.slice(1)));
await fs.writeFile(path.join(root,'research/extra-rooms-evidence.json'),JSON.stringify({evidence,rejected},null,2));
// Separate additions cannot be overwritten by downloads in an older running app.
await fs.writeFile(path.join(root,'data/extra-rooms.json'),JSON.stringify(accepted,null,2));
console.log('ADDED',accepted.length);
