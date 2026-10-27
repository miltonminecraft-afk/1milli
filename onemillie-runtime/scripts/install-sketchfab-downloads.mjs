import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds, prune} from '@gltf-transform/functions';

const root = '../onemillie-studio';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const catalog = JSON.parse(await fs.readFile(`${root}/data/catalog.json`, 'utf8'));
const files = [
  ['W2','W2-garage-desk',1,'Originele werkbank met bijbehorend gereedschap.'],
  ['C2','C2-wooden-milk-crates',.05,'Hele set houten kratten; geschatte startschaal, zelf aanpasbaar.'],
  ['C3','C3-plastic-crate',1,'Originele schaal: circa 69 × 38 × 45 cm buitenmaat.'],
  ['L2','L2-industrial-wall-lamps',1,'Eén roestige wandlamp uit de oorspronkelijke set. Alle varianten blijven in de bron-GLB.'],
];
const overrides = JSON.parse(await fs.readFile(`${root}/data/local-models.json`,'utf8').catch(()=>'{}'));
const evidence = [];
for (const [code, file, modelScale, notes] of files) {
  const asset = catalog.assets.find(a=>a.code===code);
  if (!asset) throw Error(`Missing asset ${code}`);
  const source = `${root}/source/sketchfab/${file}.glb`;
  const doc = await io.read(source);
  if (code==='L2') {
    for (const node of doc.getRoot().listNodes()) if(node.getMesh() && node.getName()!=='Object_6') node.setMesh(null);
    await doc.transform(prune());
  }
  const model = `${asset.id}.glb`;
  // No geometry simplification or texture resizing: retain downloaded quality.
  await io.write(`${root}/models/${model}`, doc);
  overrides[asset.id] = {model,modelScale,notes};
  evidence.push({code,author:asset.author,source:asset.source,license:asset.license,model,modelScale,bounds:getBounds(doc.getRoot().listScenes()[0]),bytes:(await fs.stat(`${root}/models/${model}`)).size,changes:code==='L2'?'One rusty variant extracted; unused resources pruned.':'Repacked as GLB; no mesh or texture reduction.'});
}
await fs.writeFile(`${root}/data/local-models.json`,JSON.stringify(overrides,null,2)+'\n');
await fs.writeFile(`${root}/research/downloaded-assets-evidence.json`,JSON.stringify(evidence,null,2)+'\n');
await fs.writeFile(`${root}/research/downloaded-assets-attribution.txt`,evidence.map(a=>`${a.code} — ${a.author}\n${a.source}\nCC Attribution 4.0: ${a.license.url}\n${a.changes}\n`).join('\n'));
console.log(JSON.stringify(evidence,null,2));
