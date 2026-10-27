// Build the original visitor experience and the existing choice catalogues.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=path.join(root,'onemillie-runtime');
const output=process.env.ONEMILLIE_SITE_OUTPUT||'H:/CodexData/Builds/onemillie/website';
if(!path.resolve(output).toLowerCase().startsWith('h:'+path.sep+'codexdata'+path.sep+'builds'+path.sep))throw Error('Build output must stay on H:/CodexData/Builds');
const env={...process.env,TEMP:'H:/CodexData/Temp',TMP:'H:/CodexData/Temp',ONEMILLIE_SITE_OUTPUT:output};
execFileSync(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'build','--config',path.join(app,'static-site/vite.config.mjs')],{cwd:app,env,stdio:'inherit',windowsHide:true});
for(const f of fs.readdirSync(path.join(output,'assets')).filter(f=>f.endsWith('.css'))){const p=path.join(output,'assets',f);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replaceAll('/assets/workshop.png','/1milli/assets/workshop.png'));}
const copy=(source,dest)=>{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(source,dest,{recursive:true});};
for(const file of ['workshop-soldering-v3.png','workbench-soldering-v2.png','workshop-depth.json','workshop.png','credits.html','models/vinyl-record-ready.glb','models/record-crate.glb'])copy(path.join(app,'public/assets',file),path.join(output,'assets',file));
copy(path.join(app,'public/assets/covers'),path.join(output,'assets/covers'));
copy(path.join(app,'public/favicon.svg'),path.join(output,'favicon.svg'));
copy(path.join(app,'vendor/playcanvas-LICENSE.txt'),path.join(output,'assets/playcanvas-LICENSE.txt'));
const credits=path.join(output,'assets/credits.html');fs.writeFileSync(credits,fs.readFileSync(credits,'utf8').replace('href="/"','href="../"'));
for(const folder of ['room-options','asset-options'])copy(path.join(app,'public',folder),path.join(output,folder));
const roomPath=path.join(output,'room-options/index.html');fs.writeFileSync(roomPath,fs.readFileSync(roomPath,'utf8').replace('href="/"','href="../"'));
const assetsPath=path.join(output,'asset-options/index.html');let html=fs.readFileSync(assetsPath,'utf8');
html=html.replace('Zoek in de gratis Sketchfab-modellen of plak een Sketchfab-modellink. Alleen downloadbare modellen met CC BY of CC0 verschijnen hier.','Zoek binnen deze selectie. Meer opties vind je bij <a href="https://sketchfab.com/search?type=models&amp;features=downloadable" target="_blank" rel="noopener noreferrer">Sketchfab ↗</a>.');
html=html.replace('Voorstel op dit apparaat. Je kunt aantallen later verder aanpassen bij het plaatsen.','Keuzes blijven in deze browser. Kopieer de lijst naar de chat om je keuzes door te geven.').replace('<footer>','<footer><a href="../">Terug naar de werkplaats</a> · ');fs.writeFileSync(assetsPath,html);
const pickerPath=path.join(output,'asset-options/asset-picker.js');let picker=fs.readFileSync(pickerPath,'utf8');
const remote="const response=await fetch(\`/api/asset-search?q=\${encodeURIComponent(query)}\`);const data=await response.json();if(run!==searchRun)return;if(!response.ok)throw new Error(data.error||'Zoeken is niet gelukt.');".replaceAll('\\`','`');
if(!picker.includes(remote))throw Error('Catalogue search changed');
picker=picker.replace(remote,"const terms=query.toLocaleLowerCase('nl').split(/\\s+/).filter(Boolean);const data={models:sources.filter(source=>terms.every(term=>[source.name,source.author,source.url].join(' ').toLocaleLowerCase('nl').includes(term))),message:'Uit de beschikbare selectie.'};if(run!==searchRun)return;").replace('Modellen en gratis licenties controleren…','Zoeken in de beschikbare selectie…');
const initialize="if(!hasSaved&&!choices.size){for(const [code,quantity] of [['D2',1],['K3',1],['K1',1],['W1',1],['W2',1],['B1',1],['B3',1],['S3',2],['C2',1],['C3',1],['L2',1],['L3',1]]){const asset=[...assets.values()].find(a=>a.code===code);if(asset)choices.set(asset.id,quantity);}}";
picker=picker.replace(/persist\(\);update\(\);\s*$/,initialize+'persist();update();\n');fs.writeFileSync(pickerPath,picker);fs.writeFileSync(path.join(output,'.nojekyll'),'');
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Symlink in publication');e.isDirectory()?walk(p):files.push(p);}}walk(output);
let bytes=0;for(const file of files){const n=fs.statSync(file).size;bytes+=n;if(n>=100*1024*1024||/\.(blend|env|log)$/i.test(file))throw Error('Unexpected publication file '+file);}
for(const file of files.filter(f=>f.endsWith('.html'))){for(const match of fs.readFileSync(file,'utf8').matchAll(/(?:src|href)="([^"]+)"/g)){const url=match[1];if(/^(https?:|data:|#|mailto:)/.test(url))continue;const relative=url.split(/[?#]/)[0];if(relative.startsWith('/')&&!relative.startsWith('/1milli/'))throw Error('Invalid absolute link '+url);const target=relative.startsWith('/1milli/')?path.join(output,relative.slice(8)):path.resolve(path.dirname(file),relative);if(!fs.existsSync(target))throw Error('Missing file '+target);}}
console.log(JSON.stringify({output,files:files.length,bytes,originalWebsite:true,staticLinksChecked:true}));
