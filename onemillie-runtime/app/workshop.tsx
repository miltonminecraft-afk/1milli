"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronLeft, ChevronRight, Disc3, GripVertical, Headphones, Loader2, Music2, Pause, Play, Plus, RotateCcw, Search, Settings2, X } from "lucide-react";
import { moveRecord, normalizeOrder, recordLocations } from "../lib/collection.mjs";
import Room3D from "./room3d";
import ObjectEditor from "./object-editor";

type Release = { id: string; title: string; artist: string; coverUrl: string; date: string; type: string; spotifyUrl: string; embedUrl: string; spotifyUri?: string };
type Catalog = { releases: Release[]; [key: string]: any };
type Panel = "records" | "projects" | null;
type CollectionResponse = { order: string[]; revision: number; canEdit: boolean; error?: string };

export default function Workshop({ catalog }: { catalog: Catalog }) {
  const releases = catalog.releases;
  const defaultOrder = releases.map(r => r.id);
  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [draft, setDraft] = useState<string[]>(defaultOrder);
  const [revision, setRevision] = useState(0);
  const [canEdit, setCanEdit] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState(defaultOrder[0] || "");
  const [onDeck, setOnDeck] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [motion, setMotion] = useState(true);
  const [recordPhase, setRecordPhase] = useState<string | null>(null);
  const [view, setView] = useState("overview");
  const [travelling, setTravelling] = useState(false);
  const [objects, setObjects] = useState<any[]>([]);
  const [roomReady, setRoomReady] = useState(false);
  const [walking, setWalking] = useState(false);
  const [environmentPreview,setEnvironmentPreview] = useState(false);
  const roomRecords = useMemo(() => recordLocations(order, onDeck).map((item:any) => ({...releases.find(r=>r.id===item.id),...item})), [order,onDeck,releases]);
  const travelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const targets = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const focusBefore = useRef<HTMLElement | null>(null);
  const sorted = order.map(id => releases.find(r => r.id === id)!).filter(Boolean);
  const shown = sorted.filter(r => `${r.title} ${r.artist}`.toLowerCase().includes(search.toLowerCase()));
  const selected = releases.find(r => r.id === active) || releases[0];
  const playing = releases.find(r => r.id === onDeck);
  const activeIndex = shown.findIndex(r => r.id === active);

  useEffect(() => {
    if(new URLSearchParams(window.location.search).get('preview')==='omgeving'){setEnvironmentPreview(true);setWalking(true);}
    setMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    fetch("/api/collection", { cache: "no-store" }).then(async res => {
      if (!res.ok) throw new Error();
      const data = await res.json() as CollectionResponse;
      const next = normalizeOrder(data.order, defaultOrder);
      setOrder(next); setDraft(next); setRevision(data.revision); setCanEdit(data.canEdit);
      setActive(next[0]);
    }).catch(() => setStatus("De standaardcollectie is geladen. Beheer is tijdelijk niet bereikbaar."));
  }, []);

  useEffect(() => { fetch('/api/objects').then(r=>r.ok?r.json():null).then((data:any)=>{if(data?.objects)setObjects(data.objects);}).catch(()=>{}); }, []);

  useEffect(() => {
    const el = dialog.current;
    if (panel && el && !el.open) { focusBefore.current = document.activeElement as HTMLElement; el.showModal(); }
    if (!panel && el?.open) { el.close(); focusBefore.current?.focus(); }
    if (!panel) { setEditing(false); setSearch(""); }
  }, [panel]);

  useEffect(() => {
    const el = strip.current?.querySelector(`[data-record="${active}"]`);
    if (el) el.scrollIntoView({ behavior: motion ? "smooth" : "instant", block: "nearest", inline: "center" });
  }, [active, panel, search, motion]);

  useEffect(() => {
    if (shown.length && !shown.some(r => r.id === active)) setActive(shown[0].id);
  }, [search]);

  function closePanel() { if(recordPhase)return; if (travelTimer.current) clearTimeout(travelTimer.current); setTravelling(false); setPanel(null); setView("overview"); }
  function openPanel(next: Panel) {
    if(recordPhase)return;
    if (travelTimer.current) clearTimeout(travelTimer.current);
    setStatus(""); setPanel(null); setPlayerOpen(false); setWalking(false);
    setView(next === "records" ? "records" : next === "projects" ? "projects" : "overview");
    if (!roomReady || !motion) { setPanel(next); return; }
    setTravelling(true);
    travelTimer.current = setTimeout(() => { setTravelling(false); setPanel(next); }, 1250);
  }
  function goTo(next:string) { if(recordPhase)return; if(travelTimer.current)clearTimeout(travelTimer.current); setPanel(null);setTravelling(false);setWalking(false);setView(next);setPlayerOpen(false); }
  function positionHotspots(points:Record<string,{x:number;y:number}>) {
    const layer=targets.current;if(!layer)return;
    for(const [name,point] of Object.entries(points)){
      const button=layer.querySelector<HTMLButtonElement>(`[data-target="${name}"]`);if(!button)continue;
      const half=button.offsetWidth/2+8;
      button.style.left=`${Math.max(half,Math.min(layer.clientWidth-half,point.x))}px`;
      button.style.top=`${point.y}px`;
    }
  }
  function browse(delta: number) {
    if (!shown.length) return;
    const next = (Math.max(activeIndex, 0) + delta + shown.length) % shown.length;
    setActive(shown[next].id);
  }
  function putOnDeck(r: Release) {
    if(recordPhase)return;
    if(onDeck===r.id){setPanel(null);setView('turntable');setPlayerOpen(true);return;}
    setRecordPhase('Hoes pakken');setWalking(false);setOnDeck(r.id); setPanel(null); setView("turntable"); setPlayerOpen(false);
    setStatus(`${r.title} wordt op de draaitafel gelegd.`);
  }
  function returnRecord() {
    if(recordPhase)return;
    setRecordPhase('LP van de draaitafel halen');setWalking(false);setOnDeck(null); setPlayerOpen(false); setView('records');
    setStatus('De plaat wordt teruggezet.');
  }
  function recordTransition(phase:string|null){setRecordPhase(phase);if(phase===null){setPlayerOpen(!!onDeck);setStatus(onDeck?'De LP ligt op de draaitafel. Start de muziek in de speler.':'De plaat staat terug op haar plek in de kast.');}}
  function rearrange(id: string, index: number) { setDraft(old => moveRecord(old, id, index)); setStatus(""); }
  async function saveOrder() {
    setSaving(true); setStatus("");
    try {
      const res = await fetch("/api/collection", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: draft, revision }) });
      const data = await res.json() as CollectionResponse;
      if (!res.ok) throw new Error(data.error || "Opslaan is niet gelukt.");
      setOrder(data.order); setRevision(data.revision); setEditing(false); setActive(data.order[0]);
      setStatus("Opgeslagen. Iedere bezoeker begint met jouw volgorde.");
    } catch (error: any) { setStatus(error.message || "Opslaan is niet gelukt. Probeer opnieuw."); }
    finally { setSaving(false); }
  }
  const cover = (r: Release, className = "", priority = false) => <img className={className} src={r.coverUrl} alt={`Hoes van ${r.title}`} loading={priority ? "eager" : "lazy"} draggable={false} />;

  return <main className={`workshop ${view==="workbenches"?"is-workbench":""} ${environmentPreview?'environment-preview':''} ${panel ? "is-exploring" : ""} ${view !== "overview" ? "is-away" : ""} ${travelling ? "is-travelling" : ""} ${motion ? "has-motion" : ""}`}>
    <div className={`room ${roomReady?'has-3d':''}`}><div className="scene" ref={scene} aria-hidden="true">
      <img className="room-image" src="/assets/workshop-empty-shelves.png" alt="" fetchPriority="high" />
      <div className="warm-light" />
    </div><Room3D view={view} motion={motion} records={roomRecords} models={objects} navigation={walking&&!panel&&!recordPhase} onReady={setRoomReady} onError={setStatus} onTransition={recordTransition} onHotspots={positionHotspots} onRecord={id=>{goTo('records');setActive(id);}} /><div className="room-shade" /></div>
    {roomReady&&view==='overview'&&!panel&&!recordPhase&&<nav ref={targets} className="room-targets object-hotspots" aria-label="Objecten in de werkplaats">
      <button className="hotspot object-hotspot" data-target="records" onClick={()=>goTo('records')}><span className="target-dot"/><span>Platenkast</span></button>
      <button className="hotspot object-hotspot" data-target="turntable" onClick={()=>goTo('turntable')}><span className="target-dot"/><span>Draaitafel</span></button>
      <button className="hotspot object-hotspot" data-target="workbenches" onClick={()=>goTo('workbenches')}><span className="target-dot"/><span>Werkbank</span></button>
    </nav>}
    {roomReady&&view!=='overview'&&!panel&&!recordPhase&&<button className="object-view-back" onClick={()=>goTo('overview')}><ArrowLeft size={14}/> Terug naar de werkplaats</button>}
    {view==='records'&&!panel&&!recordPhase&&selected&&<aside className="record-dock" aria-label="Geselecteerde plaat"><div className="dock-heading"><div><span className="eyebrow">{Math.max(activeIndex+1,1)} / {shown.length}</span><h2>{selected.title}</h2><p>{selected.artist}</p></div>{cover(selected)}</div><div className="dock-browse"><button className="icon-button" aria-label="Vorige plaat" onClick={()=>browse(-1)}><ChevronLeft size={20}/></button><button className="text-button" onClick={()=>openPanel('records')}>Hele collectie</button><button className="icon-button" aria-label="Volgende plaat" onClick={()=>browse(1)}><ChevronRight size={20}/></button></div><button className="primary-button" onClick={()=>putOnDeck(selected)}><Play size={14}/> {onDeck===selected.id?'Open speler':'Leg op de draaitafel'}</button></aside>}


    <header className="site-header">
      <button className="wordmark" onClick={closePanel} aria-label="onemillie, terug naar de werkplaats">onemillie</button>
      <nav aria-label="Hoofdnavigatie"><button onClick={() => goTo("records")}>Muziek</button><button onClick={() => goTo("workbenches")}>Werkbank</button></nav>
    </header>

    <div className="scene-footer"><span className="location-note"><span /> De werkplaats van onemillie</span><button className="motion-toggle" onClick={() => setMotion(!motion)} aria-pressed={motion} title="Camerabeweging aan of uit">{motion ? <Pause size={13} /> : <Play size={13} />} <span>Beweging {motion ? "aan" : "uit"}</span></button></div>

    <footer className="player-bar" aria-label="Draaitafel">
      <button className="now-cover" onClick={() => playing ? setPlayerOpen(!playerOpen) : openPanel("records")} aria-label={playing ? `Open speler voor ${playing.title}` : "Kies een plaat"}>{playing ? cover(playing) : <Disc3 size={36} strokeWidth={1} />}</button>
      <button className="now-info" onClick={() => playing ? setPlayerOpen(!playerOpen) : openPanel("records")}><span className="eyebrow">{playing ? "Op de draaitafel" : "De draaitafel staat klaar"}</span><strong>{playing?.title || "Welke plaat zet jij op?"}</strong><span className="now-artist">{playing?.artist || "Een selectie van 1milli.prod"}</span></button>
      <div className="player-line"><span /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><span /></div>
      <button className="listen-button" onClick={() => playing ? setPlayerOpen(!playerOpen) : openPanel("records")}>{playing ? <Headphones size={17} /> : <Music2 size={17} />}<span>{playing ? "Open speler" : "Kies een plaat"}</span><ArrowUp size={14} /></button>
      <div className="platform-links"><a href="https://open.spotify.com/artist/6T18x57eJMgD4j9q7GIULd" target="_blank" rel="noopener noreferrer" aria-label="1milli.prod op Spotify (nieuw tabblad)"><SpotifyIcon /><span>Spotify</span></a><span className="divider" /><a href={catalog.soundcloud?.url || "https://on.soundcloud.com/9azu30FIHogaoJxPvx"} target="_blank" rel="noopener noreferrer" aria-label="SoundCloud (nieuw tabblad)"><SoundcloudIcon /><span>SoundCloud</span></a></div>
    </footer>

    {playing && <aside className={`spotify-popover ${playerOpen ? "is-open" : ""}`} aria-label="Spotify muziekspeler" inert={!playerOpen}>
      <div className="popover-heading"><span><span className="live-dot" /> Op de draaitafel</span><button className="icon-button" onClick={() => setPlayerOpen(false)} aria-label="Speler inklappen"><X size={19} /></button></div>
      <iframe key={playing.id} title={`Spotify — ${playing.title}`} src={playing.embedUrl} width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
      <div className="player-help">Start of pauzeer in de speler. <a href={playing.spotifyUrl} target="_blank" rel="noopener noreferrer">Open in Spotify ↗</a></div>
      <button className="text-button return-record" onClick={returnRecord}><RotateCcw size={13}/> Zet terug in de kast</button>
    </aside>}

    {travelling && <div className="travel-caption" role="status">{view === "records" ? "Naar de platenkast" : "Projecten"}<span /></div>}
    {recordPhase && <div className="travel-caption record-phase" role="status">{recordPhase}<span /></div>}
    {view !== "overview" && !panel && !travelling && !recordPhase && <button className="return-overview" onClick={closePanel}><ArrowLeft size={15} /> Terug de werkplaats in</button>}
    <dialog ref={dialog} aria-label={panel === "records" ? "De platenkast" : "Projecten"} className={`explorer panel-${panel || "closed"}`} onCancel={e => { e.preventDefault(); closePanel(); }} onClick={e => { if (e.target === dialog.current) closePanel(); }}>
      <div className="explorer-inner">
        <div className="explorer-top"><button className="back-button" onClick={closePanel}><ArrowLeft size={16} /> Terug naar de werkplaats</button><button className="icon-button" onClick={closePanel} aria-label="Sluiten"><X size={22} /></button></div>
        {panel === "records" && <>
          <div className="section-heading"><div><p className="eyebrow">01 / Muziek van 1milli.prod</p><h2>De platenkast<span>.</span></h2></div><div className="collection-count"><Disc3 size={22} /><span>{releases.length.toString().padStart(2, "0")} <small>releases</small></span></div></div>
          <div className="collection-toolbar"><div className="tabs"><button className={!editing ? "active" : ""} onClick={() => setEditing(false)}>Bladeren</button>{canEdit && <button className={editing ? "active" : ""} onClick={() => { setDraft([...order]); setEditing(true); setStatus(""); }}><Settings2 size={14} /> Startvolgorde</button>}</div>{!editing && <label className="search"><Search size={15} /><input aria-label="Zoek een release" value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek een plaat" /><span>{shown.length}</span></label>}</div>
          {editing ? <section className="order-editor" aria-label="Startvolgorde beheren"><div className="editor-note"><div><h3>Startvolgorde</h3><p>Sleep de platen of gebruik de pijlen. Bezoekers beginnen altijd met deze indeling.</p></div><button className="text-button" onClick={() => setDraft([...defaultOrder])}><RotateCcw size={14} /> Standaard</button></div><ol className="order-list">{draft.map((id, i) => { const r = releases.find(r => r.id === id)!; return <li key={id} draggable onDragStart={e => { setDragged(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); }} onDragEnd={() => setDragged(null)} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={e => { e.preventDefault(); if (dragged) rearrange(dragged, i); setDragged(null); }} className={dragged === id ? "dragging" : ""}><span className="order-number">{String(i + 1).padStart(2, "0")}</span><GripVertical size={18} className="drag-handle" />{cover(r)}<div className="order-title"><strong>{r.title}</strong><span>{r.artist}</span></div><div className="order-controls"><button className="icon-button" disabled={i === 0 || saving} aria-label={`${r.title} naar boven`} onClick={() => rearrange(id, i - 1)}><ArrowUp size={17} /></button><button className="icon-button" disabled={i === draft.length - 1 || saving} aria-label={`${r.title} naar beneden`} onClick={() => rearrange(id, i + 1)}><ArrowDown size={17} /></button></div></li>; })}</ol><div className="editor-bottom"><span>Vaste startvolgorde voor alle bezoekers</span><button className="primary-button" onClick={saveOrder} disabled={saving || JSON.stringify(draft) === JSON.stringify(order)}>{saving ? <Loader2 className="spin" size={17} /> : <Check size={17} />} {saving ? "Opslaan…" : "Volgorde opslaan"}</button></div></section> : <>
          {shown.length ? <><div className="record-carousel" onKeyDown={e => { if (e.key === "ArrowRight") { e.preventDefault(); browse(1); } if (e.key === "ArrowLeft") { e.preventDefault(); browse(-1); } }}>
            <button className="carousel-arrow previous" onClick={() => browse(-1)} aria-label="Vorige plaat"><ChevronLeft size={24} /></button>
            <div className="record-strip" ref={strip}>{shown.map((r, i) => <button key={r.id} data-record={r.id} className={`record-sleeve ${active === r.id ? "selected" : ""} ${onDeck === r.id ? "on-deck" : ""}`} onClick={() => setActive(r.id)} aria-label={`${r.title}, ${r.artist}`} aria-pressed={active === r.id}><div className="sleeve-image">{cover(r, "", i < 4)}{onDeck === r.id && <span className="on-deck-label"><Disc3 size={13} /> Op de draaitafel</span>}</div><span className="sleeve-meta"><span>{String(order.indexOf(r.id) + 1).padStart(2, "0")}</span><strong>{r.title}</strong></span></button>)}</div>
            <button className="carousel-arrow next" onClick={() => browse(1)} aria-label="Volgende plaat"><ChevronRight size={24} /></button><div className="shelf-edge" /></div>
            {selected && <div className="selected-record"><div><p className="eyebrow">{selected.type || "Release"} {selected.date ? ` / ${selected.date.slice(0, 4)}` : ""}</p><h3>{selected.title}</h3><p>{selected.artist}</p></div><div className="record-actions"><a href={selected.spotifyUrl} target="_blank" rel="noopener noreferrer" className="text-button"><SpotifyIcon /> Bekijk release ↗</a><button className="primary-button" onClick={() => putOnDeck(selected)}><Play size={15} fill="currentColor" /> Leg op de draaitafel</button></div></div>}
            <div className="browser-hint"><span><ArrowLeft size={12} /><ArrowRight size={12} /> Blader met pijltjes of veeg door de kast</span><span>{Math.max(activeIndex + 1, 1).toString().padStart(2, "0")} <i>/ {shown.length.toString().padStart(2, "0")}</i></span></div></> : <div className="empty-state"><Search size={30} /><h3>Die plaat staat hier niet.</h3><p>Probeer een andere titel of artiest.</p><button className="text-button" onClick={() => setSearch("")}>Toon alle platen <ArrowRight size={14} /></button></div>}
          </>}
        </>}
        {panel === "projects" && <>
          <div className="section-heading"><div><p className="eyebrow">02 / Projecten</p><h2>Nintendo-lampen</h2></div></div>
          <div className="project-feature"><div className="project-image lamp-image" role="img" aria-label="Nintendo-lamp in het werkplaatsconcept"><span>Werkplaatsconcept</span></div><div className="project-copy"><span className="coming-label"><span /> Projectfoto’s volgen</span></div></div>
        </>}
        {status && <p className="status-message" role="status">{status}</p>}
      </div>
    </dialog>
    {canEdit && !panel && !travelling && !recordPhase && <ObjectEditor objects={objects} onChange={setObjects} onExplore={()=>goTo('workbenches')} />}
    {!canEdit && <a className="owner-signin" href="/signin-with-chatgpt?return_to=/" target="_top">Beheer</a>}
    {!roomReady && <div className="room-loading" role="status"><Loader2 size={18} className="spin" /> 3D-ruimte laden…</div>}
    {roomReady && <div className="scene-credits"><a href="/assets/credits.html" target="_blank" rel="noopener noreferrer">Modellen & licenties</a></div>}
    <div className="sr-only" aria-live="polite">{status}</div>
  </main>;
}

function SpotifyIcon() { return <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="11" /><path d="M6 8.7c4-1.2 8-1 12 1M6.8 12c3.5-.9 7-.6 10.5.9M7.5 15.1c2.7-.6 5.5-.4 8.3.8" stroke="#191b17" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>; }
function SoundcloudIcon() { return <svg width="25" height="21" viewBox="0 0 28 22" fill="currentColor" aria-hidden="true"><path d="M12 17V7a6 6 0 0 1 11 2 4 4 0 1 1 1 8H12Z" /><path d="M2 12v4m3-7v8m3-10v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
