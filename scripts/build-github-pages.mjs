// Publish only the explicit website folder and existing public catalogues.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const output=path.join(root,'_site');
fs.mkdirSync(output,{recursive:true});fs.cpSync(path.join(root,'site'),output,{recursive:true});
for(const folder of ['room-options','asset-options'])fs.cpSync(path.join(root,'onemillie-runtime/public',folder),path.join(output,folder),{recursive:true});
fs.mkdirSync(path.join(output,'vendor'),{recursive:true});for(const f of ['playcanvas.mjs','playcanvas-LICENSE.txt'])fs.copyFileSync(path.join(root,'onemillie-runtime/vendor',f),path.join(output,'vendor',f));
const roomPath=path.join(output,'room-options/index.html');let room=fs.readFileSync(roomPath,'utf8').replace('href="/"','href="../"');fs.writeFileSync(roomPath,room);
const assetsPath=path.join(output,'asset-options/index.html');let html=fs.readFileSync(assetsPath,'utf8');
html=html.replace('Zoek in de gratis Sketchfab-modellen of plak een Sketchfab-modellink. Alleen downloadbare modellen met CC BY of CC0 verschijnen hier.','Zoek binnen deze selectie. Meer opties vind je bij <a href="https://sketchfab.com/search?type=models&amp;features=downloadable" target="_blank" rel="noopener noreferrer">Sketchfab ↗</a>.');
html=html.replace('Voorstel op dit apparaat. Je kunt aantallen later verder aanpassen bij het plaatsen.','Keuzes blijven in deze browser. Kopieer de lijst naar de chat om je keuzes door te geven.');
html=html.replace('<footer>','<footer><a href="../">Terug naar de werkplaats</a> · ');fs.writeFileSync(assetsPath,html);
const pickerPath=path.join(output,'asset-options/asset-picker.js');let picker=fs.readFileSync(pickerPath,'utf8');
const remote="const response=await fetch(`/api/asset-search?q=${encodeURIComponent(query)}`);const data=await response.json();if(run!==searchRun)return;if(!response.ok)throw new Error(data.error||'Zoeken is niet gelukt.');";
if(!picker.includes(remote))throw Error('Catalogue search has changed; check static adaptation');
picker=picker.replace(remote,"const terms=query.toLocaleLowerCase('nl').split(/\\s+/).filter(Boolean);const data={models:sources.filter(source=>terms.every(term=>[source.name,source.author,source.url].join(' ').toLocaleLowerCase('nl').includes(term))),message:'Uit de beschikbare selectie.'};if(run!==searchRun)return;");
picker=picker.replace('Modellen en gratis licenties controleren…','Zoeken in de beschikbare selectie…');
// Seed the user's existing choices on the new origin, once, without changing saved choices.
const initialize="if(!hasSaved&&!choices.size){for(const [code,quantity] of [['D2',1],['K3',1],['K1',1],['W1',1],['W2',1],['B1',1],['B3',1],['S3',2],['C2',1],['C3',1],['L2',1],['L3',1]]){const asset=[...assets.values()].find(a=>a.code===code);if(asset)choices.set(asset.id,quantity);}}";
if(!/persist\(\);update\(\);\s*$/.test(picker))throw Error('Catalogue initialization has changed');
picker=picker.replace(/persist\(\);update\(\);\s*$/,initialize+'persist();update();\n');
fs.writeFileSync(pickerPath,picker);fs.writeFileSync(path.join(output,'.nojekyll'),'');
const files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Symlink not allowed');if(entry.isDirectory())walk(full);else files.push(full);}}walk(output);
let bytes=0;for(const file of files){const size=fs.statSync(file).size;bytes+=size;if(size>=100*1024*1024)throw Error('File too large: '+path.relative(output,file));if(/\.(blend|log|env)$/i.test(file))throw Error('Unexpected local file in website');}
for(const file of files.filter(f=>f.endsWith('.html'))){const content=fs.readFileSync(file,'utf8');for(const match of content.matchAll(/(?:src|href)="([^"]+)"/g)){const url=match[1];if(/^(https?:|data:|#|mailto:)/.test(url))continue;if(url.startsWith('/'))throw Error('Absolute path breaks GitHub Pages: '+url);const target=path.resolve(path.dirname(file),url.split(/[?#]/)[0]);if(!target.startsWith(output+path.sep)&&target!==output)throw Error('Link escapes site');if(!fs.existsSync(target))throw Error('Missing linked file: '+target);}}
console.log(JSON.stringify({output:'_site',files:files.length,bytes,staticLinksChecked:true,serverRequired:false}));
