import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8').replace(/^\uFEFF/, ''));
const assets = new Map();
for (const asset of [...read('onemillie-studio/data/catalog.json').assets, ...read('onemillie-studio/data/extra-rooms.json')]) assets.set(asset.id, asset);
const overrides = read('onemillie-studio/data/local-models.json');
for (const [id, patch] of Object.entries(overrides)) if (assets.has(id)) assets.set(id, { ...assets.get(id), ...patch });
const chosen = read('onemillie-unreal/Import/chosen-assets.json');
const chosenFiles = chosen.map(asset => {
  const model = path.isAbsolute(asset.model) ? asset.model : path.resolve(root, 'onemillie-unreal/Import', asset.model);
  return { code: asset.code, title: asset.title, quantity: asset.count, available: fs.existsSync(model), bytes: fs.existsSync(model) ? fs.statSync(model).size : null };
});
const walk = directory => fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]) : [];
const maps = walk(path.join(root, 'onemillie-unreal')).filter(file => file.toLowerCase().endsWith('.umap'));
const report = {
  checkedAt: new Date().toISOString(),
  scope: 'File audit, not a rendered visual quality assessment or new test run.',
  catalog: {
    rooms: [...assets.values()].filter(asset => asset.kind === 'room').length,
    objects: [...assets.values()].filter(asset => asset.kind === 'object').length,
    lightingEnvironments: [...assets.values()].filter(asset => asset.kind === 'hdri').length,
    total: assets.size,
    installedCatalogModels: [...assets.values()].filter(asset => asset.model && fs.existsSync(path.join(root, 'onemillie-studio/models', asset.model))).length
  },
  selectedAssets: chosenFiles,
  selectedModelCount: chosenFiles.length,
  selectedInstanceCount: chosenFiles.reduce((sum, asset) => sum + asset.quantity, 0),
  allSelectedModelFilesPresent: chosenFiles.every(asset => asset.available),
  localOverrideEntries: Object.keys(overrides).length,
  unreal: {
    projectFilePresent: fs.existsSync(path.join(root, 'onemillie-unreal/Onemillie.uproject')),
    savedMaps: maps.map(file => path.relative(path.join(root, 'onemillie-unreal'), file).replaceAll('\\', '/')),
    sceneBuilt: maps.length === 0 ? false : 'Not established by this file audit; inspect saved levels.',
    renderedVisualMatchVerified: false
  },
  website: { trueReconstructedRoom: false, mobileVerified: false },
  shippedGithubModels: walk(path.join(root, fs.existsSync(path.join(root, 'github-source')) ? 'github-source/onemillie-studio/models' : 'onemillie-studio/models')).filter(file => file.endsWith('.glb')).length
};
const destination = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, fs.existsSync(path.join(root, 'github-source')) ? 'github-source/docs/progress-evidence.json' : 'docs/progress-evidence.json');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
