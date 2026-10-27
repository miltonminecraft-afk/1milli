import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../Materials/wall-candidates');fs.mkdirSync(directory,{recursive:true});
const args=process.argv.slice(2),maps=args[0]==='--maps';if(maps)args.shift();const ids=args;
if(!ids.length||ids.some(id=>!['wood_textured_concrete','oriented_strand_board','rock_embedded_concrete','rough_concrete'].includes(id)))throw Error('Specify a documented wall candidate');
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(`${r.status}: ${url}`);return r;};
for(const id of ids){
 const [info,files]=await Promise.all([get(`https://api.polyhaven.com/info/${id}`).then(r=>r.json()),get(`https://api.polyhaven.com/files/${id}`).then(r=>r.json())]);
 for(const [name,data] of [['info',info],['files',files]])fs.writeFileSync(path.join(directory,`${id}-${name}.json`),JSON.stringify(data,null,2)+'\n');
 const downloaded={};
 for(const [channel,key,format] of maps?[['diff','Diffuse','jpg'],['normal','nor_gl','png'],['rough','Rough','jpg']]:[['diff','Diffuse','jpg']]){
  const item=files[key][maps?'4k':'1k'][format],url=new URL(item.url);if(!['dl.polyhaven.org','dl.polyhaven.com'].includes(url.hostname))throw Error('Unexpected host');
  const file=path.basename(url.pathname),dest=path.join(directory,file);if(!fs.existsSync(dest))fs.writeFileSync(dest,new Uint8Array(await (await get(url)).arrayBuffer()));
  const bytes=fs.readFileSync(dest),md5=crypto.createHash('md5').update(bytes).digest('hex');if(md5!==item.md5)throw Error('Checksum mismatch');downloaded[channel]={file,url:url.href,md5,bytes:bytes.length};
 }
 const source={downloadedAt:new Date().toISOString(),id,name:info.name,source:`https://polyhaven.com/a/${id}`,authors:info.authors,license:'CC0-1.0',licenseUrl:'https://polyhaven.com/license',maps:downloaded,status:'Unapproved wall candidate'};
 fs.writeFileSync(path.join(directory,id+(maps?'-maps':'-preview')+'.json'),JSON.stringify(source,null,2)+'\n');console.log(JSON.stringify({id,maps:Object.keys(downloaded)}));
}
