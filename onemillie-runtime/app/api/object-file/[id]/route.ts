import {env} from 'cloudflare:workers';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id)||!env.DB||!env.BUCKET)return new Response('Not found',{status:404});
  const row=await env.DB.prepare('SELECT storage_key FROM scene_objects WHERE id=?').bind(id).first<any>();
  if(!row)return new Response('Not found',{status:404});
  const file=await env.BUCKET.get(row.storage_key);if(!file)return new Response('Not found',{status:404});
  return new Response(file.body,{headers:{'Content-Type':'model/gltf-binary','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
}
