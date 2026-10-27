"use client";
import {useRef,useState} from 'react';
import {Upload,X,Save,Trash2} from 'lucide-react';
import {OBJECT_ZONES} from '../lib/concept-layout.mjs';
export default function ObjectEditor({objects,onChange,onExplore}:{objects:any[];onChange:(o:any[])=>void;onExplore:()=>void}){
  const input=useRef<HTMLInputElement>(null),[selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const current=objects.find(o=>o.id===selected);
  async function upload(file?:File){if(!file)return;if(file.size>20*1024*1024){setMessage('Kies een GLB-bestand van maximaal 20 MB.');return;}setBusy(true);setMessage('Model toevoegen…');try{
    const res=await fetch('/api/objects',{method:'POST',headers:{'Content-Type':'model/gltf-binary','x-file-name':encodeURIComponent(file.name)},body:file});const data:any=await res.json().catch(()=>({error:res.status===413?'Dit model is te groot.':'Toevoegen is niet gelukt.'}));if(!res.ok)throw Error(data.error);onChange([...objects,data.object]);setSelected(data.object.id);setMessage('Toegevoegd op de werkbank.');onExplore();
  }catch(e:any){setMessage(e.message||'Toevoegen is niet gelukt.');}finally{setBusy(false);if(input.current)input.current.value='';}}
  function adjust(values:Record<string,number>){onChange(objects.map(o=>o.id===selected?{...o,transform:{...o.transform,...values}}:o));setMessage('Plaatsing gewijzigd.');}
  async function save(){setBusy(true);try{const res=await fetch('/api/objects',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(current)});const data:any=await res.json();if(!res.ok)throw Error(data.error);setMessage('Plaatsing opgeslagen.');}catch(e:any){setMessage(e.message);}finally{setBusy(false);}}
  async function remove(){setBusy(true);try{const res=await fetch('/api/objects',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:current.id})});if(!res.ok)throw Error('Verwijderen is niet gelukt.');onChange(objects.filter(o=>o.id!==current.id));setSelected(null);setMessage('Object verwijderd.');}catch(e:any){setMessage(e.message);}finally{setBusy(false);}}
  return <section className={`object-tools ${current?'editing-object':''}`} aria-label="3D-objecten beheren"><input ref={input} type="file" accept=".glb,model/gltf-binary" hidden onChange={e=>upload(e.target.files?.[0])}/>
    {current?<><div className="object-editor-heading"><strong>{current.name}</strong><button className="icon-button" aria-label="Objectbeheer sluiten" onClick={()=>setSelected(null)}><X size={17}/></button></div>
      <div className="object-zones">{Object.entries(OBJECT_ZONES).map(([key,zone])=><button key={key} onClick={()=>adjust({x:zone.point[0],y:zone.point[1],z:zone.point[2]})}>{zone.name}</button>)}</div>
      {[{key:'x',label:'Links / rechts',min:-5,max:5,step:.02},{key:'y',label:'Hoogte',min:-3,max:3,step:.02},{key:'z',label:'Diepte',min:-10,max:-1,step:.02},{key:'scale',label:'Grootte',min:.02,max:6,step:.02},{key:'ry',label:'Draaien',min:-180,max:180,step:1}].map(c=><label className="object-slider" key={c.key}><span>{c.label}</span><input aria-label={c.label} type="range" min={c.min} max={c.max} step={c.step} value={current.transform[c.key]} onChange={e=>adjust({[c.key]:Number(e.target.value)})}/><input aria-label={`${c.label} waarde`} className="object-value" type="number" min={c.min} max={c.max} step={c.step} value={Number(current.transform[c.key].toFixed(2))} onChange={e=>{if(e.target.value!==''&&Number.isFinite(e.target.valueAsNumber))adjust({[c.key]:Math.max(c.min,Math.min(c.max,e.target.valueAsNumber))});}}/></label>)}
      <div className="object-actions"><button className="text-button" disabled={busy} onClick={remove}><Trash2 size={13}/> Verwijderen</button><button className="primary-button" disabled={busy} onClick={save}><Save size={14}/> Opslaan</button></div>
    </>:<><button className="object-add" disabled={busy} onClick={()=>input.current?.click()}><Upload size={13}/> 3D-object toevoegen</button>{objects.length>0&&<select aria-label="3D-object bewerken" value="" onChange={e=>{setSelected(e.target.value);onExplore();}}><option value="">Object plaatsen…</option>{objects.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>}</>}
    {message&&<p role="status">{message}</p>}{!current&&<small>GLB · maximaal 20 MB</small>}
  </section>;
}
