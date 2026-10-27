import {env} from 'cloudflare:workers';
import {NextRequest} from 'next/server';
import {OBJECT_ZONES} from '../../../lib/concept-layout.mjs';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function authorized(r:NextRequest){
  if(r.headers.get('origin')!==new URL(r.url).origin)return false;
  const id=r.headers.get('oai-authenticated-user-id');if(!id||!env.DB)return false;
  const row=await env.DB.prepare("SELECT owner_id FROM collection_settings WHERE id='main'").first<any>();
  return row?.owner_id===id;
}
export async function GET(){
  if(!env.DB)return reply({objects:[]});
  const result=await env.DB.prepare('SELECT id,name,transform_json FROM scene_objects ORDER BY created_at').all<any>();
  return reply({objects:result.results.map(r=>({id:r.id,name:r.name,url:`/api/object-file/${r.id}`,transform:JSON.parse(r.transform_json)}))});
}
export async function POST(request:NextRequest){
  if(!await authorized(request))return reply({error:'Alleen de eigenaar kan objecten toevoegen.'},403);
  if(!env.BUCKET||!env.DB)return reply({error:'De objectopslag is nog niet beschikbaar.'},503);
  if(Number(request.headers.get('content-length')||0)>21*1024*1024)return reply({error:'Gebruik een GLB-bestand van maximaal 20 MB.'},413);
  // Binary upload avoids the framework's 1 MB multipart server-action limit.
  if(!request.body)return reply({error:'Kies een GLB-bestand.'},400);
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>20*1024*1024){await reader.cancel();return reply({error:'Gebruik een GLB-bestand van maximaal 20 MB.'},413);}chunks.push(value);}
  if(total<20)return reply({error:'Gebruik een geldig GLB-bestand.'},400);
  const bytes=new ArrayBuffer(total),combined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.length;}
  const view=new DataView(bytes);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength)return reply({error:'Dit bestand is geen geldig GLB 2.0-model.'},400);
  try{
    const length=view.getUint32(12,true);if(length>bytes.byteLength-20)throw new Error();
    const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
    if([...(gltf.buffers||[]),...(gltf.images||[])].some((a:any)=>a.uri&&!a.uri.startsWith('data:')))return reply({error:'Exporteer het model met alle materialen en afbeeldingen ingebed.'},400);
  }catch{return reply({error:'Het model kan niet worden gelezen.'},400);}
  let filename;try{filename=decodeURIComponent(request.headers.get('x-file-name')||'3D-object');}catch{return reply({error:'Ongeldige bestandsnaam.'},400);}
  const id=crypto.randomUUID(),key=`objects/${id}.glb`,name=filename.replace(/\.glb$/i,'').slice(0,100);
  const [x,y,z]=OBJECT_ZONES.workbench.point;
  const transform={x,y,z,rx:0,ry:0,rz:0,scale:1};
  await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'model/gltf-binary'}});
  await env.DB.prepare('INSERT INTO scene_objects(id,name,storage_key,transform_json,created_at) VALUES(?,?,?,?,?)').bind(id,name,key,JSON.stringify(transform),new Date().toISOString()).run();
  return reply({object:{id,name,url:`/api/object-file/${id}`,transform}},201);
}
export async function PUT(request:NextRequest){
  if(!await authorized(request))return reply({error:'Alleen de eigenaar kan objecten plaatsen.'},403);
  let body:any;try{body=await request.json();}catch{return reply({error:'Ongeldige gegevens.'},400);}
  const t=body.transform;if(!t||!['x','y','z','rx','ry','rz','scale'].every(k=>Number.isFinite(t[k])))return reply({error:'Ongeldige plaatsing.'},400);
  if(['x','y','z'].some(k=>Math.abs(t[k])>30)||t.scale<.001||t.scale>20||['rx','ry','rz'].some(k=>Math.abs(t[k])>360))return reply({error:'De plaatsing valt buiten de werkplaats.'},400);
  const safe={x:t.x,y:t.y,z:t.z,rx:t.rx,ry:t.ry,rz:t.rz,scale:t.scale};
  const result=await env.DB!.prepare('UPDATE scene_objects SET transform_json=? WHERE id=?').bind(JSON.stringify(safe),body.id).run();
  if(!result.meta.changes)return reply({error:'Object niet gevonden.'},404);
  return reply({saved:true});
}
export async function DELETE(request:NextRequest){
  if(!await authorized(request))return reply({error:'Alleen de eigenaar kan objecten verwijderen.'},403);
  let body:any;try{body=await request.json();}catch{return reply({error:'Ongeldige gegevens.'},400);}
  if(typeof body.id!=='string')return reply({error:'Ongeldig object.'},400);
  // Retain the uploaded source file; removing an instance does not destroy the GLB.
  const result=await env.DB!.prepare('DELETE FROM scene_objects WHERE id=?').bind(body.id).run();
  if(!result.meta.changes)return reply({error:'Object niet gevonden.'},404);
  return reply({removed:true});
}
