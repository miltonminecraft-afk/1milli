import {env} from 'cloudflare:workers';
import {NextRequest} from 'next/server';
import catalog from '../../../data/catalog.json';
import defaults from '../../../data/default-selection.json';
import {validateSelection,enrichSelection} from '../../../lib/selection.mjs';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
  if(!env.DB)return reply({error:'De opslag is tijdelijk niet bereikbaar.'},503);
  const row=await env.DB.prepare('SELECT * FROM asset_selections WHERE id=?').bind('main').first<any>();
  const userId=request.headers.get('oai-authenticated-user-id');
  if(row&&row.owner_id!==userId)return reply({error:'Log in met het account waarmee je de selectie hebt opgeslagen.'},403);
  return reply({items:row?JSON.parse(row.selection_json):defaults.items,notes:row?.notes||'',revision:row?.revision||0,updatedAt:row?.updated_at||null,canEdit:!!userId});
}
export async function PUT(request:NextRequest){
  if(!env.DB)return reply({error:'Opslaan is tijdelijk niet beschikbaar.'},503);
  const userId=request.headers.get('oai-authenticated-user-id');
  if(!userId)return reply({error:'Log eerst in met ChatGPT.'},401);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Ongeldige aanvraag.'},403);
  if(Number(request.headers.get('content-length')||0)>24000)return reply({error:'Deze selectie is te groot.'},413);
  let body;try{const text=await request.text();if(text.length>24000)return reply({error:'Deze selectie is te groot.'},413);body=JSON.parse(text);}catch{return reply({error:'De selectie kon niet worden gelezen.'},400);}
  const selection=validateSelection(body,catalog.assets);if(!selection)return reply({error:'Controleer je keuzes en aantallen (1–99).'},400);
  const row=await env.DB.prepare('SELECT owner_id,revision FROM asset_selections WHERE id=?').bind('main').first<any>();
  if(row&&row.owner_id!==userId)return reply({error:'Deze selectie hoort bij een ander account.'},403);
  if((row?.revision||0)!==selection.revision)return reply({error:'Je selectie is op een ander apparaat gewijzigd. Haal de online selectie op voordat je verdergaat.'},409);
  const now=new Date().toISOString(),items=enrichSelection(selection.items,catalog.assets),json=JSON.stringify(items);
  const result=row?await env.DB.prepare('UPDATE asset_selections SET selection_json=?,notes=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=?').bind(json,selection.notes,now,'main',userId,selection.revision).run():await env.DB.prepare('INSERT OR IGNORE INTO asset_selections (id,owner_id,selection_json,notes,revision,updated_at) VALUES (?,?,?,?,1,?)').bind('main',userId,json,selection.notes,now).run();
  if(!result.meta.changes)return reply({error:'Je selectie is intussen gewijzigd. Haal de online selectie opnieuw op.'},409);
  return reply({items,notes:selection.notes,revision:selection.revision+1,updatedAt:now,canEdit:true});
}
