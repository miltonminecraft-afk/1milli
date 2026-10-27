// Prepare attributed, existing models for placement; keep source assets intact.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds, prune} from '@gltf-transform/functions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const directory = 'public/assets/models/';

const cabinet = await io.read(`${directory}record-cabinet.glb`);
const cabinetScene = cabinet.getRoot().listScenes()[0];
const wrapper = cabinet.createNode('Horizontal Kallax');
for (const root of [...cabinetScene.listChildren()]) wrapper.addChild(root);
wrapper.setRotation([0,0,Math.SQRT1_2,Math.SQRT1_2]);
wrapper.setTranslation([.7165,.385,0]);
cabinetScene.addChild(wrapper);
for (const material of cabinet.getRoot().listMaterials()) {
  material.setBaseColorFactor([.035,.037,.032,1]).setRoughnessFactor(.72).setMetallicFactor(0);
}
await io.write(`${directory}record-cabinet-ready.glb`, cabinet);
wrapper.setRotation([0,0,0,1]).setTranslation([0,.0185,0]);
await io.write(`${directory}record-cabinet-tall.glb`, cabinet);

const record = await io.read(`${directory}vinyl-record.glb`);
record.getRoot().listNodes()[0].setRotation([-Math.SQRT1_2,0,0,Math.SQRT1_2]).setTranslation([0,0,0]);
const bodyMaterial = record.createMaterial('Vinyl').setBaseColorFactor([.012,.013,.012,1]).setRoughnessFactor(.27).setMetallicFactor(.16);
const labelMaterial = record.createMaterial('Release label').setBaseColorFactor([1,1,1,1]).setRoughnessFactor(.85).setMetallicFactor(0);
const buffer = record.getRoot().listBuffers()[0];
for (const mesh of record.getRoot().listMeshes()) {
  for (const primitive of [...mesh.listPrimitives()]) {
    const positions = primitive.getAttribute('POSITION').getArray();
    const normals = primitive.getAttribute('NORMAL').getArray();
    const oldIndices = primitive.getIndices().getArray();
    const vinyl = [], label = [];
    for (let i=0;i<oldIndices.length;i+=3) {
      const tri = Array.from(oldIndices.slice(i,i+3));
      const isLabel = tri.every(v => Math.hypot(positions[v*3],positions[v*3+1]) < .0491 && Math.abs(normals[v*3+2]) > .8);
      (isLabel ? label : vinyl).push(...tri);
    }
    const labels = primitive.clone();
    const uv = new Float32Array(positions.length/3*2);
    for(let v=0;v<positions.length/3;v++) { uv[v*2]=positions[v*3]/.098+.5; uv[v*2+1]=.5-positions[v*3+1]/.098; }
    primitive.setIndices(record.createAccessor().setType('SCALAR').setArray(new Uint16Array(vinyl)).setBuffer(buffer)).setMaterial(bodyMaterial);
    labels.setIndices(record.createAccessor().setType('SCALAR').setArray(new Uint16Array(label)).setBuffer(buffer));
    labels.setAttribute('TEXCOORD_0',record.createAccessor().setType('VEC2').setArray(uv).setBuffer(buffer)).setMaterial(labelMaterial);
    mesh.addPrimitive(labels);
    if(!label.length || !vinyl.length) throw new Error('Expected separate vinyl and label geometry.');
  }
}
// The release artwork is assigned at runtime, so keep its UVs even without a baked texture.
await record.transform(prune({keepAttributes:true}));
await io.write(`${directory}vinyl-record-ready.glb`,record);

const turntable = await io.read(`${directory}dj-turntable.glb`);
const goldFinish = turntable.getRoot().listMaterials().find(material=>material.getName()==='chrome.CHINCHE');
if (!goldFinish) throw new Error('Expected Pioneer finish material.');
goldFinish.setBaseColorFactor([.028,.032,.035,1]).setRoughnessFactor(.3);
await io.write(`${directory}dj-turntable-ready.glb`,turntable);
console.log(JSON.stringify({tallCabinet:getBounds(cabinetScene),record:getBounds(record.getRoot().listScenes()[0])},null,2));
