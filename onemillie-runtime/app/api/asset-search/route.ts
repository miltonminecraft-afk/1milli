import {NextRequest} from 'next/server';

export const dynamic='force-dynamic';
const cache=new Map<string,{expires:number;data:any}>();
async function publicJson(path:string){
  const cached=cache.get(path);if(cached&&cached.expires>Date.now())return cached.data;
  const response=await fetch(`https://api.sketchfab.com/v3/${path}`,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(response.status===429?'De modellenbibliotheek is even druk. Probeer het later opnieuw.':'De modellenbibliotheek is tijdelijk niet bereikbaar.');
  const data=await response.json();if(cache.size>100)cache.clear();cache.set(path,{expires:Date.now()+15*60*1000,data});return data;
}
function modelSource(model:any){
  if(!model.isDownloadable||!['by','cc0'].includes(model.license?.slug))return null;
  const image=[...(model.thumbnails?.images||[])].filter((image:any)=>image.width<=1280).sort((a:any,b:any)=>b.width-a.width)[0]||model.thumbnails?.images?.[0];
  return {uid:model.uid,name:model.name,url:model.viewerUrl,author:model.user.displayName,license:model.license,downloadable:true,thumbnailSource:image?.url,triangles:model.faceCount};
}
export async function GET(request:NextRequest){
  const query=(request.nextUrl.searchParams.get('q')||'').trim();
  if(query.length<2||query.length>240)return Response.json({error:'Gebruik een zoekterm of een Sketchfab-modellink.'},{status:400});
  try{
    let modelId:string|null=null;
    if(/^https?:\/\//i.test(query)){
      const url=new URL(query);
      if(!['sketchfab.com','www.sketchfab.com'].includes(url.hostname)||url.username||url.password)return Response.json({error:'Plak een modellink van Sketchfab.'},{status:400});
      modelId=url.pathname.match(/^\/(?:3d-models|models)\/(?:[^/]*-)?([a-f0-9]{32})\/?$/i)?.[1]||null;
      if(!modelId)return Response.json({error:'Deze link verwijst niet naar een Sketchfab-model.'},{status:400});
    }
    if(modelId){const source=modelSource(await publicJson(`models/${modelId}`));return Response.json({models:source?[source]:[],message:source?'':'Dit model is niet gratis downloadbaar met CC BY of CC0.'});}
    const result=await publicJson(`search?type=models&downloadable=true&count=12&q=${encodeURIComponent(query)}`);
    const models:any[]=[];let failed=0;
    // Bounded batches avoid overwhelming the free source service.
    for(let i=0;i<(result.results||[]).length;i+=4){
      const batch=await Promise.allSettled(result.results.slice(i,i+4).map((model:any)=>publicJson(`models/${model.uid}`).then(modelSource)));
      for(const item of batch){if(item.status==='fulfilled'&&item.value)models.push(item.value);else if(item.status==='rejected')failed++;}
    }
    return Response.json({models,message:failed?'Niet alle resultaten konden worden gecontroleerd.':models.length?'':'Geen gratis CC BY- of CC0-modellen gevonden. Probeer een andere zoekterm.'});
  }catch(error:any){return Response.json({error:error.message||'Zoeken is niet gelukt.'},{status:502});}
}
