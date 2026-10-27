// Keep chosen source geometry/materials; only establish metres, orientation and a floor origin.
import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds} from '@gltf-transform/functions';
import {Euler,Quaternion} from 'three';

const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const choices=[
  {file:'industrial-shelf',scale:1},
  {file:'kallax-selected',scale:.01,ry:90,rz:90},
  {file:'old-workbench',scale:1,ry:-90},
  {file:'puch-moped',scale:.0435},
  {file:'krk-classic5',scale:.125},
  {file:'industrial-lamp',scale:.003}
];
const report=[];
for(const choice of choices){
  const document=await io.read(`public/assets/models/${choice.file}.glb`);
  const scene=document.getRoot().listScenes()[0];
  const axis=document.createNode('Chosen asset orientation');
  for(const node of [...scene.listChildren()])axis.addChild(node);
  axis.setScale([choice.scale,choice.scale,choice.scale]);
  axis.setRotation(new Quaternion().setFromEuler(new Euler(0,(choice.ry||0)*Math.PI/180,0)).toArray());
  const placement=document.createNode('Floor origin');placement.addChild(axis);scene.addChild(placement);
  if(choice.rz)placement.setRotation(new Quaternion().setFromEuler(new Euler(0,0,choice.rz*Math.PI/180)).toArray());
  const bounds=getBounds(scene);
  placement.setTranslation([-(bounds.min[0]+bounds.max[0])/2,-bounds.min[1],-(bounds.min[2]+bounds.max[2])/2]);
  const output=`public/assets/models/${choice.file}-ready.glb`;
  await io.write(output,document);
  report.push({file:choice.file,output,bounds:getBounds(scene)});
}
await fs.writeFile('../onemillie/research/selected-asset-bounds.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
