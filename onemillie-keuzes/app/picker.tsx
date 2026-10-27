"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Search,Plus,Minus,Check,X,ArrowUpRight,SlidersHorizontal,Bookmark,Loader2,Box,ArrowLeft,RotateCcw} from 'lucide-react';
import defaults from '../data/default-selection.json';
type Asset={id:string;code:string;title:string;name:string;kind:string;category:string;subcategory?:string;description:string;notes?:string;author:string;source:string;license:{slug:string;url:string};image:string;scan?:boolean;download:{status:string;note?:string}};
type Item={id:string;quantity:number};
type SelectionResponse={items:Item[];notes:string;revision:number;updatedAt:string|null;canEdit:boolean;error?:string};
const draftKey='onemillie-shared-selection-v1';
export default function CatalogPicker({catalog}:{catalog:{assets:Asset[]}}){
 const assets=catalog.assets;
 const initial=Object.fromEntries(defaults.items.map(i=>[i.id,i.quantity]));
 const [choices,setChoices]=useState<Record<string,number>>(initial),[notes,setNotes]=useState(''),[tab,setTab]=useState('all'),[category,setCategory]=useState(''),[query,setQuery]=useState(''),[scans,setScans]=useState(false),[viewer,setViewer]=useState<Asset|null>(null),[selectionOpen,setSelectionOpen]=useState(false);
 const [revision,setRevision]=useState(0),[loaded,setLoaded]=useState(false),[canEdit,setCanEdit]=useState(false),[busy,setBusy]=useState(false),[baseline,setBaseline]=useState(''),[savedAt,setSavedAt]=useState<string|null>(null),[message,setMessage]=useState('Keuzes laden…'),[error,setError]=useState(false),[conflict,setConflict]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const items=useMemo(()=>assets.filter(a=>choices[a.id]).map(a=>({id:a.id,quantity:choices[a.id]})),[assets,choices]);
 const serialized=JSON.stringify({items,notes:notes.trim()}),dirty=loaded&&serialized!==baseline;
 const total=items.reduce((sum,item)=>sum+item.quantity,0),selectedRooms=assets.filter(a=>a.kind==='room'&&choices[a.id]).length;
 const categoryFor=(a:Asset)=>tab==='rooms'?a.subcategory||'Overig':a.category;
 const availableCategories=[...new Set(assets.filter(a=>tab!=='rooms'||a.kind==='room').filter(a=>tab!=='objects'||a.kind!=='room').map(categoryFor))].sort();
 const shown=assets.filter(a=>(tab!=='rooms'||a.kind==='room')&&(tab!=='objects'||a.kind!=='room')&&(tab!=='selected'||choices[a.id])&&(!category||categoryFor(a)===category)&&(!scans||a.scan)&&(!query||[a.title,a.name,a.code,a.category,a.subcategory,a.description].join(' ').toLocaleLowerCase('nl').includes(query.toLocaleLowerCase('nl'))));
 async function loadSelection(restoreDraft=true){
  setBusy(true);setError(false);
  try{const response=await fetch('/api/selection',{cache:'no-store'});const data=await response.json() as SelectionResponse;if(!response.ok)throw Error(data.error);
   const remote=Object.fromEntries((data.items as Item[]).filter(i=>assets.some(a=>a.id===i.id)).map(i=>[i.id,i.quantity]));
   const normalized=assets.filter(a=>remote[a.id]).map(a=>({id:a.id,quantity:remote[a.id]}));
   setBaseline(JSON.stringify({items:normalized,notes:data.notes||''}));setRevision(data.revision);setCanEdit(data.canEdit);setSavedAt(data.updatedAt);setConflict(false);
   let local:any=null;try{if(restoreDraft)local=JSON.parse(localStorage.getItem(draftKey)||'null');}catch{}
   if(local?.dirty&&Array.isArray(local.items)){
    const valid=local.items.filter((i:any)=>assets.some(a=>a.id===i.id)&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=99);
    setChoices(Object.fromEntries(valid.map((i:Item)=>[i.id,i.quantity])));setNotes(typeof local.notes==='string'?local.notes.slice(0,2000):'');
    if(local.revision!==data.revision){setConflict(true);setMessage('Er staat een nieuwere selectie online. Haal die eerst op.');setError(true);}else setMessage('Je niet-opgeslagen wijzigingen zijn hersteld.');
   }else{setChoices(remote);setNotes(data.notes||'');setMessage(data.updatedAt?'Je online selectie is geladen.':'Je eerdere keuzes staan klaar. Sla ze op wanneer je klaar bent.');}
   setLoaded(true);
  }catch(e:any){setMessage(e.message||'De selectie kon niet worden geladen.');setError(true);}
  finally{setBusy(false);}
 }
 useEffect(()=>{void loadSelection();},[]);
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(draftKey,JSON.stringify({items,notes,revision,dirty}));}catch{}},[serialized,revision,loaded,dirty]);
 useEffect(()=>{if(viewer)dialog.current?.showModal();else dialog.current?.close();},[viewer]);
 function quantity(id:string,value:number){if(!loaded||busy)return;setChoices(old=>{const next={...old};const q=Math.max(0,Math.min(99,Math.floor(value)||0));if(q)next[id]=q;else delete next[id];return next;});setMessage('Wijzigingen staan klaar om op te slaan.');setError(false);}
 function changeTab(value:string){setTab(value);setCategory('');setScans(false);setQuery('');}
 async function save(){
  if(!canEdit||!loaded||busy||conflict)return;setBusy(true);setError(false);
  try{const response=await fetch('/api/selection',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,notes,revision})});const data=await response.json() as SelectionResponse;if(!response.ok){if(response.status===409)setConflict(true);throw Error(data.error);}
   setRevision(data.revision);setNotes(data.notes);setBaseline(JSON.stringify({items,notes:data.notes}));setSavedAt(data.updatedAt);setMessage('Online opgeslagen. Je selectie kan nu door ChatGPT worden uitgelezen.');
  }catch(e:any){setMessage(e.message||'Opslaan is niet gelukt. Je wijzigingen blijven op dit apparaat bewaard.');setError(true);}finally{setBusy(false);}
 }
 const saveButton=<button className="save-button" onClick={save} disabled={!loaded||busy||!canEdit||conflict||(!dirty&&!!savedAt)}>{busy?<Loader2 size={16} className="spin"/>:<Check size={17}/>} {busy?'Even wachten…':dirty||!savedAt?'Keuzes opslaan':'Opgeslagen'}</button>;
 return <main>
  <header className="header"><a className="wordmark" href="/">onemillie<span>/ inrichting</span></a><button className="selection-link" onClick={()=>setSelectionOpen(!selectionOpen)}><Bookmark size={16}/> Mijn keuzes <span>{total}</span></button></header>
  <section className="heading"><div><p className="eyebrow">RUIMTES & ONDERDELEN</p><h1>Inrichting kiezen<span>.</span></h1><p>Bekijk de modellen, kies je favorieten en stel de aantallen in.</p></div><div className="catalog-count"><strong>{assets.length}</strong><span>gevonden assets<br/>gratis · van bestaande makers</span></div></section>
  <div className="workspace">
   <section className="catalog">
    <nav className="tabs" aria-label="Catalogus"><button aria-pressed={tab==='all'} onClick={()=>changeTab('all')}>Alles <small>{assets.length}</small></button><button aria-pressed={tab==='rooms'} onClick={()=>changeTab('rooms')}>Ruimtes <small>{assets.filter(a=>a.kind==='room').length}</small></button><button aria-pressed={tab==='objects'} onClick={()=>changeTab('objects')}>Onderdelen <small>{assets.filter(a=>a.kind!=='room').length}</small></button><button aria-pressed={tab==='selected'} onClick={()=>changeTab('selected')}>Gekozen <small>{items.length}</small></button></nav>
    <div className="filters"><label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Zoek een asset" placeholder="Zoek op naam, materiaal of code"/>{query&&<button onClick={()=>setQuery('')} aria-label="Zoekopdracht wissen"><X size={14}/></button>}</label><label className="category"><SlidersHorizontal size={15}/><select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Categorie"><option value="">Alle categorieën</option>{availableCategories.map(c=><option key={c}>{c}</option>)}</select></label></div>
    <div className="results"><span>{shown.length} {shown.length===1?'model':'modellen'}</span><label><input type="checkbox" checked={scans} onChange={e=>setScans(e.target.checked)}/> Alleen 3D-scans</label></div>
    <div className="grid">{shown.map((a,i)=><article className={'asset '+(choices[a.id]?'selected':'')} key={a.id}>
     <button className="preview" onClick={()=>setViewer(a)} aria-label={'Bekijk '+a.code+': '+a.title+' in 3D'}><img src={'/'+a.image} alt={a.title} loading={i<6?'eager':'lazy'}/><span className="code">{a.code}</span>{choices[a.id]>0&&<span className="selected-count"><Check size={12}/> {choices[a.id]}×</span>}<span className="view-model">{a.kind==='hdri'?'Bekijk bron':'Bekijk in 3D'} <ArrowUpRight size={13}/></span></button>
     <div className="asset-info"><span className="asset-type">{a.category}{a.scan?' / 3D-scan':''}</span><h2>{a.title}</h2><p>{a.description}</p><details><summary>Maker & details</summary><p>{a.notes}</p><a href={a.source} target="_blank" rel="noopener noreferrer">{a.author} <ArrowUpRight size={12}/></a><a href={a.license.url} target="_blank" rel="noopener noreferrer">{a.license.slug==='cc0'?'CC0':'CC BY 4.0'}</a>{a.download.status==='login-required'&&<p>Download vraagt om inloggen bij de maker.</p>}</details>
      <div className="card-action">{!choices[a.id]?<button className="add" disabled={!loaded||busy} onClick={()=>quantity(a.id,1)} aria-label={'Kies '+a.code+': '+a.title}><Plus size={15}/> Toevoegen</button>:<><span>Aantal</span><div className="stepper"><button aria-label={'Minder '+a.code} disabled={busy} onClick={()=>quantity(a.id,choices[a.id]-1)}><Minus size={14}/></button><input type="number" inputMode="numeric" min={0} max={99} value={choices[a.id]} disabled={busy} aria-label={'Aantal '+a.code+': '+a.title} onChange={e=>quantity(a.id,Number(e.target.value))}/><button aria-label={'Meer '+a.code} disabled={busy||choices[a.id]>=99} onClick={()=>quantity(a.id,choices[a.id]+1)}><Plus size={14}/></button></div></>}</div>
     </div>
    </article>)}</div>
    {!shown.length&&<div className="empty"><Box size={30}/><h2>Geen modellen bij deze filters.</h2><button onClick={()=>changeTab('all')}>Toon alle assets</button></div>}
   </section>
   <aside className={'selection-panel '+(selectionOpen?'is-open':'')} aria-label="Mijn selectie">
    <div className="selection-heading"><div><p className="eyebrow">JOUW INRICHTING</p><h2>Mijn keuzes <span>{total}</span></h2></div><button className="close-selection" onClick={()=>setSelectionOpen(false)} aria-label="Keuzes sluiten"><X size={20}/></button></div>
    <p className="selection-summary">{selectedRooms?selectedRooms+' ruimte'+(selectedRooms>1?'s':'')+' gekozen':'Nog geen nieuwe ruimte gekozen'} · {items.length} verschillende assets</p>
    <div className="selection-items">{items.map(item=>{const a=assets.find(a=>a.id===item.id)!;return <div className="selection-item" key={a.id}><button className="mini-preview" onClick={()=>setViewer(a)} aria-label={'Bekijk gekozen '+a.title}><img src={'/'+a.image} alt=""/></button><div><small>{a.code}</small><strong>{a.title}</strong><div className="mini-stepper"><button onClick={()=>quantity(a.id,item.quantity-1)} disabled={busy||!loaded} aria-label={'Verminder gekozen '+a.code}>−</button><span>{item.quantity} ×</span><button onClick={()=>quantity(a.id,item.quantity+1)} disabled={busy||!loaded||item.quantity>=99} aria-label={'Vermeerder gekozen '+a.code}>+</button><button className="remove" onClick={()=>quantity(a.id,0)} disabled={busy||!loaded} aria-label={'Verwijder '+a.code}>Verwijderen</button></div></div></div>;})}{!items.length&&<p className="no-choices">Voeg een model toe om je inrichting samen te stellen.</p>}</div>
    <label className="notes-label">Opmerking voor de inrichting<textarea value={notes} maxLength={2000} onChange={e=>setNotes(e.target.value)} disabled={!loaded||busy} placeholder="Bijvoorbeeld: speakers naast de draaitafel" rows={3}/></label>
    <div className="save-area">{canEdit?saveButton:<a className="save-button" href="/signin-with-chatgpt?return_to=/" target="_top">Inloggen met ChatGPT</a>}<p className={'save-status '+(error?'error':'')} role="status">{message}</p>{savedAt&&<small>Laatst opgeslagen: {new Date(savedAt).toLocaleString('nl-NL',{dateStyle:'short',timeStyle:'short'})}</small>}<button className="reload" onClick={()=>loadSelection(false)} disabled={busy}><RotateCcw size={12}/> Online selectie ophalen</button></div>
   </aside>
  </div>
  <footer className="page-footer">Voorbeelden van de makers · Licht en materialen kunnen bij import afwijken. <a href="/api/selection" target="_blank">Opgeslagen selectie bekijken ↗</a></footer>
  <div className="mobile-save"><button onClick={()=>setSelectionOpen(true)}><Bookmark size={17}/> {total} gekozen</button>{saveButton}</div>
  <dialog ref={dialog} className="model-dialog" onCancel={()=>setViewer(null)} onClose={()=>setViewer(null)}>
   {viewer&&<><div className="viewer-heading"><div><p className="eyebrow">{viewer.code} / {viewer.category}</p><h2>{viewer.title}</h2><span>{viewer.author}</span></div><button onClick={()=>setViewer(null)} aria-label="3D-weergave sluiten"><X size={22}/></button></div><div className="viewer-stage">{viewer.kind==='hdri'?<img src={'/'+viewer.image} alt={viewer.title}/>:<iframe title={'3D-model '+viewer.title} src={'https://sketchfab.com/models/'+viewer.id+'/embed?autostart=1'} allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen/>}</div><div className="viewer-footer"><a href={viewer.source} target="_blank" rel="noopener noreferrer">Open bij de maker <ArrowUpRight size={14}/></a><button className="add" disabled={!loaded||busy} onClick={()=>quantity(viewer.id,(choices[viewer.id]||0)+1)}><Plus size={15}/> {choices[viewer.id]?'Nog één toevoegen':'Toevoegen'}</button></div></>}
  </dialog>
 </main>;
}
