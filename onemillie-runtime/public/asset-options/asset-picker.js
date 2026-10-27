const sources = await fetch('./sources.json').then(response=>response.json());
const groups = [
  {id:'draaitafel',title:'Draaitafel',query:'turntable vinyl',items:[
    ['D1','41f8370f7899443488a9263de55601c0','Technics SL-1210MK2','Klassieke DJ-draaitafel met losse toonarm.'],
    ['D2','147cd49228e24746a6a2b3c45440d989','Pioneer PLX-1000','Gedetailleerde Limited Edition.'],
    ['D3','3577a2a1a0c24218bd5d768beccf218e','Yamaha TT-300','Hifi-draaitafel met stofkap.']
  ]},
  {id:'kast',title:'Kast',query:'industrial shelf',items:[
    ['K1','477dd3a75ae64426a979ef3c57f10239','Kallax 77 × 147','Open vakkenkast. Kan rechtop of liggend worden geplaatst.'],
    ['K2','290cbf357b3045e591ce58e64e66b41c','Laag meubel — 210 cm','Breed meubel voor de draaitafel. Ruimte voor LP’s wordt bij import gecontroleerd.'],
    ['K3','d7cc67be8b474cc5bfe0a60c8afab13b','Hout en metaal','Open industriële kast. Ruimte voor LP’s wordt bij import gecontroleerd.']
  ]},
  {id:'werkbank',title:'Werkbank',query:'workbench',items:[
    ['W1','9fbc30ba31a546fe9370e6de2dcc0707','Oude werkbank','Houten blad, gereedschapsbord en een rode gereedschapswagen.'],
    ['W2','c260327b93114d56933bdd9e3b0454b7','Garagewerkbank','Gebruikte werkbank met gereedschap.'],
    ['W3','1903eab9fd4a4933bc46b1c98f12d138','Houten werkbank','Houtbewerkingsbank op werkelijke schaal.']
  ]},
  {id:'brommer',title:'Brommer / motor',query:'moped',items:[
    ['B1','dddd830af69a486fbf5e79c8e6515b4f','Café racer','Het motormodel uit het tijdelijke voorbeeld.'],
    ['B2','bb7549d851784b238b917ade58dad1c5','Piaggio Bravo','Klassieke brommer uit de Piaggio Ciao-serie.'],
    ['B3','b6c212a12d85425bb166f43cd3d70248','Puch — 1978','Klassieke zwarte brommer. Model van Scanamatics.']
  ]},
  {id:'speakers',title:'Speakers',query:'studio monitor',items:[
    ['S1','eec7203e4f964fa5976df3afee33f946','Yamaha HS5','Studiomonitor. Kies aantal 2 voor een paar.'],
    ['S2','7ad5a7d350884a258a7326dfee5fbf8a','JBL LSR308','Studiomonitor. Kies aantal 2 voor een paar.'],
    ['S3','5c03f6b1082a4decb33ae7511209271a','KRK Classic 5','Studiomonitor. Bekijk in 3D welke onderdelen het model bevat.']
  ]},
  {id:'kratten',title:'Kratten',query:'crate',items:[
    ['C1','fb01473792a541b09cc0acc07ac3dbc1','Melkkrat','Open kunststof krat. Aantal en plaatsing zijn apart te kiezen.'],
    ['C2','489a6f095dc44bb1b279ed58e5bb3571','Houten melkkratten','Set van houten kratten. Het aantal geldt voor de hele set.'],
    ['C3','5f7103bfb5974eab85bb1a4ab8a8595e','Kunststof krat','Open opbergkrat. Of er LP’s in passen wordt bij import gecontroleerd.']
  ]},
  {id:'verlichting',title:'Verlichting',query:'industrial lamp',items:[
    ['L1','ff0abe17dc64498191bb41c905d00ab0','Werklamp','Industriële werklamp met PBR-materialen.'],
    ['L2','b63c31b9c6a04284b665af8a0a93d456','Industriële wandlamp','Klassiek model met verschillende materiaalvarianten.'],
    ['L3','ad87a1e1da604bfea9b1276aa33f7952','Industriële lamp','Bestaand lampmodel van Helsingr.']
  ]},
  {id:'overig',title:'Overige objecten',query:'workshop tools',items:[]}
];
const storageKey='onemillie-asset-proposal-v2';
const assets=new Map(),choices=new Map();
for(const group of groups)for(const [code,id,title,note] of group.items){const source=sources.find(item=>item.uid===id);if(!source?.downloadable||!['by','cc0'].includes(source.license?.slug))throw new Error('Unverified candidate '+code);assets.set(id,{id,code,title,note,category:group.id,source,localImage:true});}
let hasSaved=false;
try{
  const stored=JSON.parse(localStorage.getItem(storageKey)||'null');
  if(stored?.version===2&&Array.isArray(stored.items)){hasSaved=true;for(const item of stored.items){
    if(!/^[a-f0-9]{32}$/i.test(item.id)||!groups.some(group=>group.id===item.category)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99)continue;
    if(!assets.has(item.id)&&item.source?.downloadable&&['by','cc0'].includes(item.source.license?.slug))assets.set(item.id,item);
    if(assets.has(item.id))choices.set(item.id,item.quantity);
  }}
  if(!hasSaved){const previous=JSON.parse(localStorage.getItem('onemillie-asset-proposal-v1')||'{}');for(const [category,code] of Object.entries(previous)){const asset=[...assets.values()].find(asset=>asset.category===category&&asset.code===code);if(asset)choices.set(asset.id,1);}}
}catch{}
let nextCode=Math.max(21,...[...assets.values()].map(asset=>Number(asset.code?.match(/^M(\d+)$/)?.[1]||0)))+1;
const dialog=document.getElementById('viewer'),stage=document.getElementById('viewer-stage');
function safeUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'#';}catch{return '#';}}
function showModel(asset){
  document.getElementById('viewer-title').textContent=`${asset.code} / ${asset.title}`;
  document.getElementById('viewer-note').textContent=`${asset.source.name} — ${asset.source.author}`;
  document.getElementById('original').href=safeUrl(asset.source.url);
  const frame=document.createElement('iframe');frame.title=`3D-model: ${asset.source.name}`;frame.src=`https://sketchfab.com/models/${asset.id}/embed?autostart=1`;frame.allow='autoplay; fullscreen; xr-spatial-tracking';frame.allowFullscreen=true;stage.replaceChildren(frame);dialog.showModal();
}
function persist(){
  try{localStorage.setItem(storageKey,JSON.stringify({version:2,items:[...choices].map(([id,quantity])=>({...assets.get(id),quantity}))}));}
  catch{document.getElementById('search-status').textContent='Je browser kon de keuzes niet bewaren. Kopieer de keuzelijst voordat je de pagina sluit.';}
}
function setQuantity(id,value){const quantity=Math.min(99,Math.max(0,Math.floor(Number(value)||0)));if(quantity)choices.set(id,quantity);else choices.delete(id);persist();update();}
function makeCard(asset){
  const {id,code,title,note,source}=asset;
  const card=document.createElement('article');card.className='asset';card.dataset.id=id;
  const preview=document.createElement('button');preview.type='button';preview.className='preview';preview.setAttribute('aria-label',`Bekijk ${code}: ${title} in 3D`);
  const image=document.createElement('img');image.src=asset.localImage?`./images/${id}.jpg`:safeUrl(source.thumbnailSource);image.alt=source.name;image.loading=asset.category==='draaitafel'?'eager':'lazy';preview.append(image);
  const badge=document.createElement('span');badge.className='code';badge.textContent=code;preview.append(badge);
  const caption=document.createElement('span');caption.className='view-label';caption.textContent='Bekijk in 3D ↗';preview.append(caption);
  preview.addEventListener('click',()=>showModel(asset));card.append(preview);
  const info=document.createElement('div');info.className='info';
  const heading=document.createElement('h3');heading.textContent=title;info.append(heading);
  const description=document.createElement('p');description.className='note';description.textContent=note||`Model van ${source.author}.`;info.append(description);
  const credit=document.createElement('div');credit.className='credit';
  const author=document.createElement('a');author.href=safeUrl(source.url);author.target='_blank';author.rel='noopener noreferrer';author.textContent=source.author+' ↗';credit.append(author);
  const license=document.createElement('a');license.href=safeUrl(source.license.url);license.target='_blank';license.rel='noopener noreferrer';license.textContent=source.license.slug==='cc0'?'Gratis · CC0':'Gratis · CC BY 4.0';credit.append(license);info.append(credit);
  const choose=document.createElement('button');choose.className='choose';choose.setAttribute('aria-label',`Kies ${code}: ${title}`);choose.addEventListener('click',()=>setQuantity(id,choices.has(id)?0:1));info.append(choose);
  const quantity=document.createElement('div');quantity.className='quantity';
  const label=document.createElement('span');label.textContent='Aantal';quantity.append(label);
  const minus=document.createElement('button');minus.textContent='−';minus.setAttribute('aria-label',`Minder ${code}: ${title}`);minus.addEventListener('click',()=>setQuantity(id,(choices.get(id)||0)-1));quantity.append(minus);
  const input=document.createElement('input');input.type='number';input.min='1';input.max='99';input.step='1';input.setAttribute('aria-label',`Aantal ${code}: ${title}`);input.addEventListener('change',()=>setQuantity(id,input.value));quantity.append(input);
  const plus=document.createElement('button');plus.textContent='+';plus.setAttribute('aria-label',`Meer ${code}: ${title}`);plus.addEventListener('click',()=>setQuantity(id,(choices.get(id)||0)+1));quantity.append(plus);info.append(quantity);card.append(info);
  return card;
}
const host=document.getElementById('options');
for(const group of groups){
  const categoryOption=document.createElement('option');categoryOption.value=group.id;categoryOption.textContent=group.title;document.getElementById('search-category').append(categoryOption);
  const section=document.createElement('section');section.className='category';section.id=group.id;
  const heading=document.createElement('div');heading.className='section-title';const title=document.createElement('h2');title.textContent=group.title;heading.append(title);
  const more=document.createElement('button');more.className='more-models';more.textContent='Meer modellen zoeken ↗';more.setAttribute('aria-label',`Meer modellen zoeken: ${group.title}`);more.addEventListener('click',()=>{document.getElementById('search-category').value=group.id;document.getElementById('search-query').value=group.query;document.getElementById('search').scrollIntoView();document.getElementById('search-form').requestSubmit();});heading.append(more);section.append(heading);
  const grid=document.createElement('div');grid.className='grid';for(const asset of assets.values())if(asset.category===group.id)grid.append(makeCard(asset));section.append(grid);host.append(section);
}
function proposal(){return groups.flatMap(group=>[...choices].flatMap(([id,quantity])=>{const asset=assets.get(id);return asset.category===group.id?[`${group.title}: ${quantity} × ${asset.code} — ${asset.title}`]:[];})).join('\n');}
function update(){
  for(const card of document.querySelectorAll('.asset')){const quantity=choices.get(card.dataset.id)||0;const button=card.querySelector('.choose');button.setAttribute('aria-pressed',String(quantity>0));button.textContent=quantity?'Gekozen ✓ · verwijderen':'Toevoegen aan keuzes';card.classList.toggle('selected',quantity>0);card.querySelector('.quantity').hidden=!quantity;card.querySelector('.quantity input').value=quantity;card.querySelector('.quantity button:last-child').disabled=quantity>=99;}
  document.getElementById('selection-text').textContent=proposal()||'Nog geen onderdelen gekozen.';document.getElementById('copy').disabled=!choices.size;document.getElementById('copy').textContent='Kopieer keuzes';document.getElementById('choice-count').textContent=`Jouw keuzes (${[...choices.values()].reduce((sum,n)=>sum+n,0)})`;
}
let searchRun=0;
document.getElementById('search-form').addEventListener('submit',async event=>{
  event.preventDefault();const run=++searchRun;const query=document.getElementById('search-query').value.trim();const category=document.getElementById('search-category').value;
  const status=document.getElementById('search-status'),results=document.getElementById('search-results'),submit=document.getElementById('search-submit');results.replaceChildren();submit.disabled=true;status.textContent='Modellen en gratis licenties controleren…';
  try{const response=await fetch(`/api/asset-search?q=${encodeURIComponent(query)}`);const data=await response.json();if(run!==searchRun)return;if(!response.ok)throw new Error(data.error||'Zoeken is niet gelukt.');
    for(const source of data.models||[]){if(!/^[a-f0-9]{32}$/i.test(source.uid)||!source.downloadable||!['by','cc0'].includes(source.license?.slug))continue;let asset=assets.get(source.uid);if(!asset){asset={id:source.uid,code:`M${nextCode++}`,title:source.name,category,source};assets.set(asset.id,asset);}results.append(makeCard(asset));}
    status.textContent=`${results.children.length} gratis modellen gevonden. ${data.message||''}`.trim();update();
  }catch(error){if(run===searchRun)status.textContent=error.message||'Zoeken is niet gelukt.';}finally{if(run===searchRun)submit.disabled=false;}
});
document.getElementById('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('Mijn keuzes voor de inrichting:\n'+proposal());document.getElementById('copy').textContent='Gekopieerd';}catch{document.getElementById('copy').textContent='Selecteer de keuzetekst';}});
document.getElementById('show-room').addEventListener('click',()=>showModel({id:'6c6d15c2d3ec423b854c3623b9122c0d',code:'Ruimte',title:'Gescande bedrijfsruimte',source:{name:'Building scan No. 1 – Interior',author:'3Dystopia',url:'https://www.fab.com/listings/2cae900a-fa1f-4da7-9106-cc06d43472ee'}}));
document.getElementById('close-viewer').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>stage.replaceChildren());
persist();update();
