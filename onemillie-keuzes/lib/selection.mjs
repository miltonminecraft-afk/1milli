export function validateSelection(input,assets){
  if(!input||!Array.isArray(input.items)||input.items.length>assets.length||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.notes!=='string'||input.notes.length>2000)return null;
  const known=new Map(assets.map(a=>[a.id,a])),seen=new Set(),items=[];
  for(const item of input.items){
    if(!item||!known.has(item.id)||seen.has(item.id)||!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>99)return null;
    seen.add(item.id);items.push({id:item.id,quantity:item.quantity});
  }
  return {items,notes:input.notes.trim(),revision:input.revision};
}
export function enrichSelection(items,assets){
  const known=new Map(assets.map(a=>[a.id,a]));
  return items.flatMap(item=>{const a=known.get(item.id);return a?[{id:a.id,code:a.code,title:a.title,kind:a.kind,category:a.category,quantity:item.quantity,source:a.source}]:[];});
}
