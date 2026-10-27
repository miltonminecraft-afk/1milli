const rooms = [
  { id:'0eb40f2cb2bf4dfdbaae36095825788a', title:'Betonnen hal', name:'Brutalist Interior', author:'vslite', kind:'Beton', description:'Brede, lege ruimte met ruw beton en lichtstroken. Veel plek om zelf in te richten.' },
  { id:'1d5285f2e0fd4211a27c8042496d5959', title:'Oude fabriekshal', name:'Abandoned Warehouse – Interior Scene', author:'Aurélien Martel', kind:'Industrieel', description:'Hoge ramen, bakstenen muren en hanglampen. Beschadigd interieur met puin op de vloer.' },
  { id:'6c6d15c2d3ec423b854c3623b9122c0d', title:'Gescande bedrijfsruimte', name:'Building scan No. 1 – Interior', author:'3Dystopia', kind:'3D-scan', description:'Scan van een oud tankstation. Verweerde tegels, grote ramen en een oneffen vloer.' },
  { id:'870bc832bfd64abea5a4e91a44b641a4', title:'Houten garage', name:'Garage Render Redone FREE', author:'Ethica', kind:'Compact', description:'Kleinere garage met houten wanden en gereedschapskasten. Eenvoudiger afgewerkt.' },
  { id:'54bc929a26094b6cb36f977903fbcd97', title:'Lichte loft', name:'VR apartment loft interior | baked', author:'ChristyHsu', kind:'Modern', description:'Lichte ruimte met een gebogen trap. De bestaande verlichting zit in de textures.' },
  { id:'775ab5d65ef64690a521e8138584a37f', title:'Metalen ruimte', name:'Sci-Fi Room or Industrial Space', author:'jimbogies', kind:'Futuristisch', description:'Staalroosters en blauwe lichtbuizen. Lege vloer; een duidelijk futuristische uitstraling.' }
];
const grid = document.getElementById('rooms');
const dialog = document.getElementById('viewer');
const stage = document.getElementById('viewer-stage');
const sourceUrl = room => `https://sketchfab.com/3d-models/${room.id}`;
const escapeText=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(list){grid.replaceChildren();list.forEach((room, index) => {
  const raw=room;
  room={...room,...Object.fromEntries(['title','name','author','description','notes','kind'].map(k=>[k,escapeText(room[k])]))};
  const code=room.code||`E${index+1}`;
  const card = document.createElement('article');
  card.className = 'room';
  card.innerHTML = `<button class="preview" type="button" aria-label="Bekijk ${code}. ${room.title} in 3D"><img src="./images/${room.id}.jpg" alt="Origineel voorbeeld van ${room.name}" width="1920" height="1080" loading="${index<6?'eager':'lazy'}"><span class="number">${code}</span><span class="view-label">Bekijk in 3D ↗</span></button><div class="info"><div class="title-row"><h2>${room.title}</h2><span class="kind">${room.kind}</span></div><p class="description">${room.description}</p>${room.notes?`<details class="notes"><summary>Aandachtspunten</summary><p>${room.notes}</p></details>`:''}<div class="credits"><a href="${sourceUrl(room)}" target="_blank" rel="noopener noreferrer">${room.author} ↗</a><a href="${room.license?.slug==='cc0'?'https://creativecommons.org/publicdomain/zero/1.0/':'https://creativecommons.org/licenses/by/4.0/'}" target="_blank" rel="noopener noreferrer">Gratis · ${room.license?.slug==='cc0'?'CC0':'CC BY 4.0'}</a></div><button class="choose" type="button">Kies ${code} als voorkeur</button></div>`;
  card.querySelector('button').addEventListener('click', () => {
    document.getElementById('viewer-title').textContent = `${code} / ${raw.title}`;
    document.getElementById('viewer-note').textContent = `${raw.name} — ${raw.author}`;
    document.getElementById('original').href = sourceUrl(room);
    const frame = document.createElement('iframe');
    frame.title = `3D-model: ${raw.name}`;
    frame.src = `https://sketchfab.com/models/${room.id}/embed?autostart=1`;
    frame.allow = 'autoplay; fullscreen; xr-spatial-tracking';
    frame.allowFullscreen = true;
    stage.replaceChildren(frame);
    dialog.showModal();
  });
  card.querySelector('.choose').addEventListener('click',()=>{
    const choice={id:room.id,code,title:raw.title,source:sourceUrl(room)};
    try{localStorage.setItem('onemillie-room-preference-v1',JSON.stringify(choice));}catch{}
    document.getElementById('selection').textContent=`Jouw voorkeur: ${code} — ${raw.title}. Geef ${code} door in de chat; de ruimte is nog niet vervangen.`;
    document.querySelectorAll('.choose').forEach(b=>b.setAttribute('aria-pressed','false'));card.querySelector('.choose').setAttribute('aria-pressed','true');
  });
  try{const choice=JSON.parse(localStorage.getItem('onemillie-room-preference-v1'));card.querySelector('.choose').setAttribute('aria-pressed',String(choice?.id===room.id));}catch{}
  grid.append(card);
});}
fetch('./new-sources.json').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{
  const fallback=['Garage','Industrieel','Industrieel','Industrieel','Studio','Studio','Winkel','Werkplaats'];
  const fresh=data.filter(r=>/^[a-f0-9]{32}$/.test(r.id)).map((r,i)=>({...r,category:r.category||fallback[i]||'Overig',code:`R${i+1}`}));let mode='added';
  document.getElementById('total').textContent=`${fresh.length} nieuwe 3D-ruimtes`;
  document.querySelector('[data-filter="added"]').textContent=`${fresh.length-8} toegevoegd`;
  document.querySelector('[data-filter="new"]').textContent=`Alle ${fresh.length} opties`;
  const category=document.getElementById('category'),search=document.getElementById('room-search');
  [...new Set(fresh.map(r=>r.category))].sort().forEach(c=>{const option=document.createElement('option');option.value=c;option.textContent=c;category.append(option);});
  function filter(){const query=search.value.trim().toLocaleLowerCase('nl');const base=mode==='previous'?rooms.map((r,i)=>({...r,code:`E${i+1}`})):mode==='scan'?fresh.filter(r=>r.kind==='3D-scan'):mode==='added'?fresh.slice(8):fresh;
    const filtered=base.filter(r=>(!category.value||r.category===category.value)&&(!query||`${r.title} ${r.name} ${r.description} ${r.kind} ${r.code}`.toLocaleLowerCase('nl').includes(query)));render(filtered);document.getElementById('result-count').textContent=`${filtered.length} van ${base.length} ruimtes`;if(!filtered.length){const empty=document.createElement('p');empty.textContent='Geen ruimtes bij deze filters. Kies een andere soort of zoekterm.';grid.append(empty);}}
  category.addEventListener('change',filter);search.addEventListener('input',filter);filter();
  document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));mode=b.dataset.filter;category.value='';search.value='';filter();}));
}).catch(()=>{document.getElementById('selection').textContent='De nieuwe ruimtes konden niet worden geladen. Vernieuw de pagina.';});
try{const choice=JSON.parse(localStorage.getItem('onemillie-room-preference-v1'));if(choice)document.getElementById('selection').textContent=`Jouw voorkeur: ${choice.code} — ${choice.title}. Geef de code door in de chat; de ruimte is nog niet vervangen.`;}catch{}
document.getElementById('close-viewer').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => stage.replaceChildren());
dialog.addEventListener('click', event => { if(event.target === dialog) { const box=dialog.getBoundingClientRect(); if(event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom) dialog.close(); } });
