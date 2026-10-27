function validateScene(value){
 if(!value||value.version!==1||!Array.isArray(value.items)||value.items.length>500)throw Error('Dit is geen geldig onemillie-project.');
 const ids=new Set();
 const vector=(v,scale=false)=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=100000&&(!scale||n>0));
 for(const item of value.items){if(!item||typeof item.id!=='string'||item.id.length>100||ids.has(item.id)||typeof item.name!=='string'||item.name.length>160||!(item.assetId===null||typeof item.assetId==='string')||!(item.parentId===null||typeof item.parentId==='string')||!vector(item.position)||!vector(item.rotation)||!vector(item.scale,true))throw Error('Ongeldige objectgegevens.');ids.add(item.id);}
 const byId=new Map(value.items.map(i=>[i.id,i]));
 for(const item of value.items)if(item.modelScale!==undefined&&(!Number.isFinite(item.modelScale)||item.modelScale<=0||item.modelScale>1000000))throw Error('Ongeldige modelschaal.');
 for(const item of value.items){let parent=item.parentId,seen=new Set([item.id]);while(parent){const p=byId.get(parent);if(!p||p.assetId!==null||seen.has(parent))throw Error('Ongeldige groep.');seen.add(parent);parent=p.parentId;}}
 return {version:1,name:String(value.name||'Mijn inrichting').slice(0,120),items:value.items.map(({id,name,assetId,parentId,position,rotation,scale,modelScale})=>({id,name,assetId,parentId,position:[...position],rotation:[...rotation],scale:[...scale],...(modelScale!==undefined?{modelScale}:{})}))};
}
module.exports={validateScene};
