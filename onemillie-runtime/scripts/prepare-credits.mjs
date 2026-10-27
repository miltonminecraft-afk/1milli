import fs from 'node:fs';
const sources=JSON.parse(fs.readFileSync('public/asset-options/sources.json'));
const choices=JSON.parse(fs.readFileSync('../onemillie/research/selected-assets.json')).choices;
const scene=JSON.parse(fs.readFileSync('public/assets/room.json'));
const codes=new Set(scene.props.map(p=>p.choice).filter(Boolean));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const entries=choices.filter(c=>codes.has(c.code)).map(c=>{
  const source=sources.find(s=>s.uid===c.uid);if(!source)throw new Error(`Missing attribution: ${c.code}`);
  return `<h2>${escape(source.name)}</h2><p><a href="${escape(source.url)}">Origineel model</a> — <a href="${escape(source.authorUrl)}">${escape(source.author)}</a>.</p><p><a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Schaal, oriëntatie, opstelling en belichting aangepast. ${c.quantity>1?`${c.quantity} exemplaren.`:''}</p>`;
});
fs.writeFileSync('public/assets/credits.html',`<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>3D-modellen en licenties · onemillie</title><style>body{max-width:800px;margin:60px auto;padding:0 24px;background:#171b16;color:#e5e8e0;font:16px/1.65 Arial,sans-serif}h1{font-size:30px;font-weight:500}h2{font-size:20px;margin:30px 0 5px}p{margin:5px 0}a{color:#d0dfbc}small{color:#aeb8a5}</style><h1>3D-modellen en licenties</h1>
<h2>Gescande bedrijfsruimte</h2><p><a href="https://www.fab.com/listings/2cae900a-fa1f-4da7-9106-cc06d43472ee">Building scan No. 1 - Interior</a> — 3Dystopia. <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Schaal, belichting en JPEG-compressie van de oorspronkelijke 8K-textures aangepast.</p>
${entries.join('\n')}
<h2>Vinyl</h2><p><a href="https://sketchfab.com/3d-models/12-vinyl-record-dd27284e8c1a4622b3a0433c7cc8ee72">12&quot; Vinyl Record</a> — AleixoAlonso. <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Horizontaal uitgelijnd, materiaal en label aangepast aan de gekozen release.</p>
<h2>Reflecties en omgevingslicht</h2><p><a href="https://polyhaven.com/a/empty_warehouse_01">Empty Warehouse 01</a> — Sergej Majboroda / Poly Haven. <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>.</p>
<h2>Muziek</h2><p>Releases en hoesafbeeldingen: <a href="https://open.spotify.com/artist/6T18x57eJMgD4j9q7GIULd">1milli.prod</a>, via Spotify. De hoezen worden dynamisch opgebouwd voor de collectie. Hoesafbeeldingen vallen niet onder de licenties van de 3D-modellen.</p>
<p><small>Renderer: PlayCanvas, MIT-licentie. Geen van de genoemde makers heeft deze website onderschreven.</small></p><p><a href="/">Terug naar de werkplaats</a></p></html>`);
